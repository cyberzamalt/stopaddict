// web/js/storage.js
// Enveloppe de stockage + import/export unifié (JSON/CSV) pour StopAddict.
// Reste minimaliste, offline-friendly, et rétro-compatible avec l’existant.

import { loadJSON, saveJSON, formatYMD, parseYMD, todayYMD, safeParseJSON } from "./utils.js";

// ----- NAMESPACE & KEYS -----
const NS = "sa:";
export const KEYS = {
  HISTORY:   NS + "history",   // { [ymd]: { c,j,a, beer,strong,liqueur, ... } }
  SETTINGS:  NS + "settings",  // { prices, modules, advice, charts, locale, ... }
  LIMITS:    NS + "limits",    // { perDay: {...} }
  HABITS:    NS + "habits",    // { baseline: {...} }
  FLAGS:     NS + "flags",     // { warnAccepted, warnHidden, ... }
  DATES:     NS + "dates"      // { milestones: {...} }
};

// ----- API bas niveau (clé/valeur) -----
export function get(key, def = null) { return loadJSON(key, def); }
export function set(key, val) { return saveJSON(key, val); }
export function del(key) { try { localStorage.removeItem(key); return true; } catch { return false; } }
export function keys(prefix = NS) {
  return Object.keys(localStorage).filter(k => k.startsWith(prefix));
}
export function clearAll(prefix = NS) {
  keys(prefix).forEach(k => localStorage.removeItem(k));
}

// ----- HISTORY helpers -----
export function getHistory() {
  return get(KEYS.HISTORY, {}); // { ymd: { c, j, a, ... } }
}
export function setHistory(histObj) {
  return set(KEYS.HISTORY, histObj || {});
}
export function mergeHistory(patch) {
  const base = getHistory();
  for (const ymd of Object.keys(patch || {})) {
    base[ymd] = { ...(base[ymd] || {}), ...(patch[ymd] || {}) };
  }
  return setHistory(base);
}
export function getCountsFor(ymd = todayYMD()) {
  const h = getHistory();
  return { c:0, j:0, a:0, ...h[ymd] }; // cigs, joints, alcool (total ou sous-catégories)
}
export function setCountsFor(ymd, counts) {
  const h = getHistory();
  h[ymd] = { ...(h[ymd] || {}), ...(counts || {}) };
  return setHistory(h);
}

// ----- SETTINGS / LIMITS / HABITS / FLAGS / DATES -----
export const getSettings = () => get(KEYS.SETTINGS, {});
export const setSettings = (s) => set(KEYS.SETTINGS, s || {});

export const getLimits = () => get(KEYS.LIMITS, {});
export const setLimits = (l) => set(KEYS.LIMITS, l || {});

export const getHabits = () => get(KEYS.HABITS, {});
export const setHabits = (h) => set(KEYS.HABITS, h || {});

export const getFlags = () => get(KEYS.FLAGS, {});
export const setFlags = (f) => set(KEYS.FLAGS, f || {});

export const getDates = () => get(KEYS.DATES, {});
export const setDates = (d) => set(KEYS.DATES, d || {});

// ----- EXPORT / IMPORT (JSON) -----
export function exportAllObject() {
  // Instantané complet — sans dépendre des autres modules
  return {
    meta: {
      app: "StopAddict",
      version: "2.4.4",
      exportedAt: new Date().toISOString()
    },
    data: {
      history:  getHistory(),
      settings: getSettings(),
      limits:   getLimits(),
      habits:   getHabits(),
      flags:    getFlags(),
      dates:    getDates()
    }
  };
}
export function exportAllJSON(pretty = true) {
  const obj = exportAllObject();
  return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
}
export function importAllObject(payload, { merge = true } = {}) {
  const obj = (typeof payload === "string") ? safeParseJSON(payload, null) : payload;
  if (!obj || !obj.data) throw new Error("Import invalide");

  const { history, settings, limits, habits, flags, dates } = obj.data;

  if (merge) {
    if (history) mergeHistory(history);
    if (settings) setSettings({ ...getSettings(), ...settings });
    if (limits)   setLimits({   ...getLimits(),   ...limits   });
    if (habits)   setHabits({   ...getHabits(),   ...habits   });
    if (flags)    setFlags({    ...getFlags(),    ...flags    });
    if (dates)    setDates({    ...getDates(),    ...dates    });
  } else {
    if (history) setHistory(history);
    if (settings) setSettings(settings);
    if (limits)   setLimits(limits);
    if (habits)   setHabits(habits);
    if (flags)    setFlags(flags);
    if (dates)    setDates(dates);
  }
  return true;
}

// ----- CSV (HISTORY uniquement) -----
// Colonnes: date,c,j,a,beer,strong,liqueur
export function exportHistoryCSV() {
  const h = getHistory();
  const rows = [["date","c","j","a","beer","strong","liqueur"]];
  const dates = Object.keys(h).sort();
  for (const ymd of dates) {
    const v = h[ymd] || {};
    rows.push([
      ymd,
      Number(v.c || 0),
      Number(v.j || 0),
      Number(v.a || 0),
      Number(v.beer || 0),
      Number(v.strong || 0),
      Number(v.liqueur || 0),
    ].join(","));
  }
  return rows.map(r => Array.isArray(r) ? r : [r]).join("\n");
}
export function importHistoryCSV(csvText, { merge = true } = {}) {
  const lines = String(csvText || "").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return 0;

  // Header (souple sur l’ordre, mais attend les noms connus)
  const header = lines[0].split(",").map(s => s.trim().toLowerCase());
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const want = ["date","c","j","a","beer","strong","liqueur"];
  if (!want.every(k => k in idx)) {
    throw new Error("CSV invalide: colonnes attendues: " + want.join(", "));
    }

  const patch = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const ymd  = cols[idx.date]?.trim();
    const d    = parseYMD(ymd);
    if (!d) continue;

    patch[ymd] = {
      c:        Number(cols[idx.c] || 0),
      j:        Number(cols[idx.j] || 0),
      a:        Number(cols[idx.a] || 0),
      beer:     Number(cols[idx.beer] || 0),
      strong:   Number(cols[idx.strong] || 0),
      liqueur:  Number(cols[idx.liqueur] || 0),
    };
  }

  if (merge) mergeHistory(patch);
  else       setHistory(patch);

  return Object.keys(patch).length;
}
