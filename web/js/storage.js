// web/js/storage.js
// Wrapper localStorage + import/export unifiés (JSON/CSV) + helpers fichiers.

const NS = "sa:";

function k(key) { return key.startsWith(NS) ? key : NS + key; }

// ----------------------------
// Key/Value & JSON
// ----------------------------
export function get(key, def = null) {
  try {
    const v = localStorage.getItem(k(key));
    return v === null ? def : v;
  } catch { return def; }
}

export function set(key, val) {
  try {
    localStorage.setItem(k(key), String(val));
    return true;
  } catch { return false; }
}

export function remove(key) {
  try { localStorage.removeItem(k(key)); } catch {}
}

export function clearNamespace(prefix = "") {
  try {
    const p = k(prefix);
    const rm = [];
    for (let i = 0; i < localStorage.length; i++) {
      const kk = localStorage.key(i);
      if (kk && kk.startsWith(p)) rm.push(kk);
    }
    rm.forEach((kk) => localStorage.removeItem(kk));
    return rm.length;
  } catch { return 0; }
}

export function getJSON(key, def = null) {
  try {
    const v = localStorage.getItem(k(key));
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}

export function setJSON(key, obj) {
  try {
    localStorage.setItem(k(key), JSON.stringify(obj));
    return true;
  } catch { return false; }
}

export function keys(prefix = "") {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const kk = localStorage.key(i);
      if (kk && kk.startsWith(NS + prefix)) out.push(kk);
    }
  } catch {}
  return out;
}

// ----------------------------
// Download helpers
// ----------------------------
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function exportJSONFile(filename, data) {
  downloadText(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

export function exportCSVFile(filename, rows) {
  const { text } = toCSV(rows);
  downloadText(filename, text, "text/csv;charset=utf-8");
}

// ----------------------------
// CSV utils (auto-détection ; , \t)
// ----------------------------
function detectDelimiter(s) {
  const c = (ch) => (s.match(new RegExp(`\\${ch}`, "g")) || []).length;
  const cand = [{ d: ";" }, { d: "," }, { d: "\t" }];
  cand.forEach((o) => (o.c = c(o.d)));
  cand.sort((a, b) => b.c - a.c);
  return (cand[0]?.d) || ",";
}

function escapeCSV(v, delim) {
  if (v == null) return "";
  let s = String(v);
  const needsQuotes = s.includes('"') || s.includes("\n") || s.includes(delim);
  if (s.includes('"')) s = s.replace(/"/g, '""');
  return needsQuotes ? `"${s}"` : s;
}

export function toCSV(rows = []) {
  if (!rows || !rows.length) return { headers: [], text: "" };
  // union des clés
  const headers = Array.from(rows.reduce((acc, r) => {
    Object.keys(r || {}).forEach((k) => acc.add(k));
    return acc;
  }, new Set()));
  const delim = ";";
  const head = headers.map((h) => escapeCSV(h, delim)).join(delim);
  const body = rows.map((r) => headers.map((h) => escapeCSV(r[h], delim)).join(delim)).join("\n");
  return { headers, text: head + "\n" + body, delimiter: delim };
}

// Parser CSV basique avec gestion des quotes doublées
export function parseCSV(text) {
  const delim = detectDelimiter(text);
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0], delim);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i], delim);
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = cells[j] ?? "";
    out.push(row);
  }
  return out;
}

function splitCSVLine(line, delim) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === delim) { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// ----------------------------
// File picker / Import auto
// ----------------------------
export function pickFile(accept = ".json,.csv") {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files && input.files[0]);
    input.onerror = reject;
    input.click();
  });
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsText(file);
  });
}

// Résultat: { type: "json"|"csv", data: any }
export async function importAutoFromFile(accept = ".json,.csv") {
  const file = await pickFile(accept);
  if (!file) return null;
  const txt = await readFileAsText(file);
  // JSON ?
  try {
    const data = JSON.parse(txt);
    return { type: "json", data, filename: file.name };
  } catch { /* not json */ }
  // CSV
  const rows = parseCSV(txt);
  return { type: "csv", data: rows, filename: file.name };
}

// Expose pour debug manuel
if (!window.saStorage) {
  window.saStorage = {
    get, set, remove, clearNamespace, getJSON, setJSON, keys,
    downloadBlob, downloadText, exportJSONFile, exportCSVFile,
    toCSV, parseCSV, pickFile, readFileAsText, importAutoFromFile
  };
}
