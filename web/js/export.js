// web/js/export.js
// -----------------------------------------------------------------------------
// Import/Export (JSON & CSV) + export "vue actuelle" des stats.
// - Boutons attendus (déjà dans ton index) :
//     #btn-export-csv       -> export de tout l'historique en CSV
//     #btn-export-stats     -> export de la "vue actuelle" (CSV agrégé)
// - Ajoute un bouton d'import (menu Réglages -> "Importer")
// - Exporte aussi les limites, dates clés, et quelques réglages utiles.
// - Déclenche les events: "sa:history:changed" & "sa:data:changed" après import.
// -----------------------------------------------------------------------------

const LS_KEYS = {
  HISTORY: "app_history_v23",
  LIMITS:  "app_limits_v23",
  DATES:   "app_keydates_v23",
  SETTINGS:"app_settings_v23",
  PRICES:  "app_prices_v23",     // si économie active ailleurs
  WARN:    "app_warn_v23"
};

// ---------- utils stockage partagé ----------
function getHistory() {
  if (window?.SA?.state?.history) return window.SA.state.history;
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || "null");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}
function setHistory(arr) {
  if (window?.SA?.state) window.SA.state.history = Array.isArray(arr) ? arr : [];
  try { localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(arr)); } catch {}
  window.dispatchEvent(new Event("sa:history:changed"));
  window.dispatchEvent(new Event("sa:data:changed"));
}
function pick(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function put(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ---------- utils date ----------
function isoLocal(ts) {
  const d = new Date(ts);
  const pad = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function startOfLocalDay(ts) {
  const d = new Date(typeof ts==="number"?ts:Date.now());
  d.setHours(0,0,0,0);
  return d.getTime();
}

// ---------- EXPORT JSON ----------
function exportAsJSON() {
  const payload = {
    meta: {
      app: "StopAddict",
      ver: "2.4.0-clean",
      exported_at: new Date().toISOString()
    },
    data: {
      history: getHistory(),
      limits:  pick(LS_KEYS.LIMITS)   || {},
      keydates:pick(LS_KEYS.DATES)    || {},
      settings:pick(LS_KEYS.SETTINGS) || {},
      prices:  pick(LS_KEYS.PRICES)   || {}
    }
  };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `stopaddict_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSnack("Export JSON réalisé.");
}

// ---------- EXPORT CSV (historique brut) ----------
function exportHistoryAsCSV() {
  const hist = getHistory().slice().sort((a,b)=>a.ts-b.ts);
  const head = ["date_local","timestamp","type","qty"];
  const rows = [head.join(",")];
  for (const e of hist) {
    const line = [
      `"${isoLocal(e.ts||0)}"`,
      `${Number(e.ts||0)}`,
      `${e.type||""}`,
      `${Number(e.qty||1)}`
    ].join(",");
    rows.push(line);
  }
  const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `stopaddict_history_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSnack("Export CSV (historique) réalisé.");
}

// ---------- EXPORT "VUE ACTUELLE" (CSV agrégé) ----------
function exportCurrentViewCSV() {
  // On lit le range depuis les boutons #chartRange
  const activeBtn = document.querySelector("#chartRange .btn.pill.active");
  const range = activeBtn?.dataset?.range || "day"; // day|week|month

  // filtre l'historique selon range (relative à aujourd'hui)
  const now = Date.now();
  const day0 = startOfLocalDay(now);
  let t0 = day0, t1 = day0 + 86400000;

  if (range === "week") {
    const d = new Date(now);
    const day = (d.getDay() || 7) - 1; // Lundi=0
    const monday = new Date(d); monday.setDate(d.getDate()-day); monday.setHours(0,0,0,0);
    t0 = monday.getTime(); t1 = t0 + 7*86400000;
  } else if (range === "month") {
    const d = new Date(now);
    const first = new Date(d.getFullYear(), d.getMonth(), 1); first.setHours(0,0,0,0);
    const next  = new Date(d.getFullYear(), d.getMonth()+1, 1); next.setHours(0,0,0,0);
    t0 = first.getTime(); t1 = next.getTime();
  }

  const hist = getHistory().filter(e => {
    const t = Number(e?.ts||0);
    return t>=t0 && t<t1;
  });

  // agrégation selon range : day -> par heure ; week/month -> par jour
  const map = new Map(); // key -> {cigs, weed, alcohol}
  const add = (key, type, qty)=>{
    const cur = map.get(key) || { cigs:0, weed:0, alcohol:0 };
    cur[type] = (cur[type]||0) + qty;
    map.set(key, cur);
  };

  if (range === "day") {
    for (const e of hist) {
      const d = new Date(e.ts);
      const key = `${d.getHours()}:00`; // heure locale
      add(key, e.type, Number(e.qty||1));
    }
  } else {
    for (const e of hist) {
      const d = new Date(startOfLocalDay(e.ts));
      const key = d.toLocaleDateString();
      add(key, e.type, Number(e.qty||1));
    }
  }

  const head = ["bucket","cigs","weed","alcohol"];
  const rows = [head.join(",")];
  // tri logique
  const keys = Array.from(map.keys());
  if (range === "day") {
    keys.sort((a,b)=> Number(a.split(":")[0]) - Number(b.split(":")[0]));
  } else {
    // reconstitue dates
    keys.sort((a,b)=> new Date(a) - new Date(b));
  }
  for (const k of keys) {
    const v = map.get(k);
    rows.push([ `"${k}"`, v.cigs||0, v.weed||0, v.alcohol||0 ].join(","));
  }

  const blob = new Blob([rows.join("\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `stopaddict_view_${range}_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  showSnack("Export CSV (vue actuelle) réalisé.");
}

// ---------- IMPORT (.json ou .csv) ----------
function attachHiddenFileInput() {
  let input = document.getElementById("sa-hidden-import");
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.id = "sa-hidden-import";
    input.accept = ".json,.csv,text/csv,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
  }
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const name = (file.name||"").toLowerCase();
    try {
      if (name.endsWith(".json")) {
        await importJSON(file);
      } else if (name.endsWith(".csv")) {
        await importCSV(file);
      } else {
        showSnack("Format non reconnu. Utilise un .json ou .csv");
      }
    } catch (e) {
      console.error("Import error:", e);
      showSnack("Échec de l'import.");
    } finally {
      input.value = "";
    }
  };
  return input;
}

async function importJSON(file) {
  const text = await file.text();
  const obj = JSON.parse(text);
  // formats acceptés: {data:{history,...}} ou directement {history:[...]}
  const data = obj?.data || obj || {};
  const hist = Array.isArray(data.history) ? data.history : [];
  if (hist.length) setHistory(hist);

  // on restaure quelques stores optionnels
  if (data.limits)   put(LS_KEYS.LIMITS, data.limits);
  if (data.keydates) put(LS_KEYS.DATES,  data.keydates);
  if (data.settings) put(LS_KEYS.SETTINGS, data.settings);
  if (data.prices)   put(LS_KEYS.PRICES, data.prices);

  window.dispatchEvent(new Event("sa:settings:changed"));
  showSnack("Import JSON terminé.");
}

async function importCSV(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) { showSnack("CSV vide."); return; }
  // attend l'entête: date_local,timestamp,type,qty
  const body = lines.slice(1);
  const out = [];
  for (const L of body) {
    const cols = L.split(",");
    if (cols.length < 4) continue;
    const ts = Number(cols[1]);
    const type = (cols[2]||"").trim();
    const qty = Number(cols[3])||1;
    if (!ts || !type) continue;
    out.push({ ts, type, qty });
  }
  if (!out.length) { showSnack("Aucune entrée valide détectée."); return; }
  // fusion simple: on remplace l'historique actuel par celui importé (choix clair)
  setHistory(out.sort((a,b)=>a.ts-b.ts));
  showSnack("Import CSV terminé.");
}

// ---------- snackbar ----------
function showSnack(msg) {
  const bar = document.getElementById("snackbar");
  if (!bar) { alert(msg); return; }
  bar.firstChild && (bar.firstChild.textContent = msg + " — ");
  bar.classList.add("show");
  setTimeout(()=> bar.classList.remove("show"), 2500);
}

// ---------- wiring boutons existants ----------
function wireExportButtons() {
  document.getElementById("btn-export-csv")?.addEventListener("click", exportHistoryAsCSV);
  document.getElementById("btn-export-stats")?.addEventListener("click", exportCurrentViewCSV);
}

// ---------- entrée publique ----------
export function initImportExport() {
  wireExportButtons();
  attachHiddenFileInput();

  // Expose (menu Réglages s’en sert)
  window.SA = window.SA || {};
  window.SA.exporting = {
    exportJSON: exportAsJSON,
    exportCSV: exportHistoryAsCSV,
    exportView: exportCurrentViewCSV,
    triggerImport: () => document.getElementById("sa-hidden-import")?.click()
  };
}
