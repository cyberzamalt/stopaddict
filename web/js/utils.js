// web/js/utils.js
// Helpers génériques, zéro dépendance.
// ⚠️ Rétro-compat: conserve $, $$, clamp, pad2, isSameDay, startOfDay,
// startOfWeek, startOfMonth, formatYMD, parseYMD, toCurrency,
// loadJSON, saveJSON, throttle.

// ---------- Sélecteurs ----------
export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Nombres / bornes ----------
export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
export function round2(n) {
  return Math.round(n * 100) / 100;
}
export function pad2(n) {
  return String(n).padStart(2, "0");
}

// ---------- Dates ----------
export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}
// Lundi = 1 par défaut
export function startOfWeek(d = new Date(), weekStartsOn = 1) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0..6 (0 = dimanche)
  const diff = (day - weekStartsOn + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
export function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
export function formatYMD(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function parseYMD(s) {
  // "YYYY-MM-DD" -> Date à minuit
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setHours(0, 0, 0, 0);
  return dt;
}
export function todayYMD() {
  return formatYMD(new Date());
}
export function rangeDays(dStart, dEnd) {
  // Entrées: Date|YMD. Retour: tableau de YMD inclusifs.
  const a = (dStart instanceof Date) ? startOfDay(dStart) : parseYMD(dStart);
  const b = (dEnd   instanceof Date) ? startOfDay(dEnd)   : parseYMD(dEnd);
  if (!a || !b) return [];
  const out = [];
  const cur = new Date(a);
  while (cur <= b) {
    out.push(formatYMD(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// ---------- Monnaie / format ----------
export function toCurrency(n, cur = "€") {
  const v = Number.isFinite(n) ? round2(n) : 0;
  // Pas d’Intl ici pour rester ultra-léger et offline-friendly
  return `${v.toLocaleString()}${cur}`;
}
export function formatInt(n) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return v.toLocaleString();
}

// ---------- localStorage JSON safe (garde compat ascendante) ----------
export function loadJSON(key, def = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
export function saveJSON(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

// ---------- Throttle / Debounce ----------
export function throttle(fn, wait = 100) {
  let pending = false;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (!pending) {
      pending = true;
      setTimeout(() => {
        pending = false;
        fn(...lastArgs);
      }, wait);
    }
  };
}
export function debounce(fn, wait = 200) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------- Fichiers (utiles aux imports/exports) ----------
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(fr.error || new Error("readFileAsText failed"));
    fr.readAsText(file);
  });
}

// ---------- Divers ----------
export const noop = () => {};
export const wait = (ms) => new Promise(r => setTimeout(r, ms));
export function safeParseJSON(s, def = null) {
  try { return JSON.parse(s); } catch { return def; }
}
export function mergeDeep(target, patch) {
  // Petit merge profond sans dépendances
  if (patch && typeof patch === "object" && !Array.isArray(patch)) {
    const out = { ...(target || {}) };
    for (const k of Object.keys(patch)) {
      const v = patch[k];
      out[k] = (v && typeof v === "object" && !Array.isArray(v))
        ? mergeDeep(out[k], v)
        : v;
    }
    return out;
  }
  return patch;
}
