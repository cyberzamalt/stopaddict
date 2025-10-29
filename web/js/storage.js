// web/js/storage.js
// Export / Import unifiés (JSON) + utilitaires CSV optionnels.
// N'émet JAMAIS de listeners DOM ici : on expose des fonctions pures.
// Événement émis après import : "sa:storage-imported" (payload { keys, replaced }).

import { /* facultatif selon state.js */ emit as _emit } from "./state.js";

// --- Event bus safe (si state.js n'exporte pas emit, on fallback noop) ---
function emit(evt, detail) {
  try { (_emit || window.dispatchEvent.bind(window, new CustomEvent(evt, { detail })))?.(evt, detail); }
  catch { /* noop */ }
}

// --- Helpers ---
function tryParseJSON(text) {
  try { return JSON.parse(text); } catch { return null; }
}
function safeStringify(obj) {
  try { return JSON.stringify(obj); } catch { return "{}"; }
}
function isObject(v) { return v && typeof v === "object" && !Array.isArray(v); }

// --- Collecte générique : prend toutes les clés localStorage utiles ---
export function collectAll({ prefixes = ["sa:", "i18n:", "app:"], includeOthers = [] } = {}) {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (prefixes.some(p => k.startsWith(p)) || includeOthers.includes(k)) {
        const raw = localStorage.getItem(k);
        const val = tryParseJSON(raw) ?? raw;
        out[k] = val;
      }
    }
  } catch { /* noop */ }
  return {
    __schema: "stopaddict-export",
    __version: "2.4.4",
    __exportedAt: new Date().toISOString(),
    data: out
  };
}

// --- Écriture générique : remplace (ou fusionne si objet) les clés présentes ---
export function restoreAll(payload, { mode = "replace" } = {}) {
  if (!payload || !isObject(payload) || !isObject(payload.data)) {
    throw new Error("Fichier d’import invalide (format inattendu).");
  }
  const keys = Object.keys(payload.data);
  let replaced = 0;

  keys.forEach(k => {
    const incoming = payload.data[k];
    if (mode === "merge") {
      const current = tryParseJSON(localStorage.getItem(k));
      const merged = (isObject(current) && isObject(incoming))
        ? { ...current, ...incoming }
        : incoming;
      localStorage.setItem(k, safeStringify(merged));
    } else {
      localStorage.setItem(k, safeStringify(incoming));
    }
    replaced++;
  });

  emit("sa:storage-imported", { keys, replaced });
  return { keys, replaced };
}

// --- Téléchargement JSON (utilisé par stats.js ou un bouton extérieur) ---
export function downloadJSON(filename, obj) {
  const blob = new Blob([safeStringify(obj)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename || "stopaddict-export.json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// --- Lecture d’un File (input type=file) et import ---
export async function importFromFile(file, { mode = "replace" } = {}) {
  const text = await file.text();
  const json = tryParseJSON(text);
  if (!json) throw new Error("Impossible de parser le JSON importé.");
  return restoreAll(json, { mode });
}

// --- Optionnel : génération CSV à partir d’un historique normalisé ---
// Attendu: rows = [{ date:"YYYY-MM-DD", hour?:"HH:mm", cigs:0, weed:0, alcohol:0, cost?:0, note?:"" }, ...]
export function buildCSV(rows) {
  const header = ["date","hour","cigs","weed","alcohol","cost","note"];
  const lines = [header.join(";")];
  (rows || []).forEach(r => {
    const line = [
      r.date ?? "",
      r.hour ?? "",
      String(r.cigs ?? 0),
      String(r.weed ?? 0),
      String(r.alcohol ?? 0),
      String(r.cost ?? 0),
      (r.note ?? "").replace(/[\r\n;]+/g, " ").trim()
    ].join(";");
    lines.push(line);
  });
  return lines.join("\n");
}

// --- Optionnel : téléchargement CSV ---
export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText || ""], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename || "stopaddict-export.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
