// web/js/utils.js
// Helpers génériques, zéro dépendance.
// ⚠️ Conserve l'API existante ; ajouts non-intrusifs pour dates/formatters/ranges.

//
// Sélecteurs DOM
//
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

//
// Nombres / bornes
//
export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
export function pad2(n) { return String(n).padStart(2, "0"); }

export function toFixedSafe(n, digits = 2) {
  const v = Number.isFinite(n) ? n : 0;
  return Number(v.toFixed(digits));
}
export function formatNumber(n, locale = "fr-FR") {
  return (Number.isFinite(n) ? n : 0).toLocaleString(locale);
}
export function sum(arr = []) { return arr.reduce((a, b) => a + (Number(b) || 0), 0); }
export function avg(arr = []) { return arr.length ? sum(arr) / arr.length : 0; }
export function uniq(arr = []) { return Array.from(new Set(arr)); }

//
// Dates de base
//
export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth();
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// 1 = lundi (FR)
export function startOfWeek(d = new Date(), weekStartsOn = 1) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0..6 (0=dim)
  const diff = (day - weekStartsOn + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
export function endOfWeek(d = new Date(), weekStartsOn = 1) {
  const s = startOfWeek(d, weekStartsOn);
  const x = new Date(s);
  x.setDate(s.getDate() + 6);
  return endOfDay(x);
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}
export function endOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setMonth(x.getMonth() + 1, 0); // jour 0 = dernier jour du mois précédent
  return endOfDay(x);
}

export function startOfYear(d = new Date()) {
  const x = startOfDay(d);
  x.setMonth(0, 1);
  return x;
}
export function endOfYear(d = new Date()) {
  const x = startOfDay(d);
  x.setMonth(11, 31);
  return endOfDay(x);
}

export function addDays(d = new Date(), n = 0) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function addMonths(d = new Date(), n = 0) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}
export function daysBetween(a, b) {
  const A = startOfDay(a).getTime();
  const B = startOfDay(b).getTime();
  const ONE = 24 * 60 * 60 * 1000;
  return Math.round((B - A) / ONE);
}
export function rangeDays(start, end) {
  const out = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    out.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

//
// Formats YMD
//
export function formatYMD(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function parseYMD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setHours(0, 0, 0, 0);
  return dt;
}
// Alias pratique
export const ymd = formatYMD;

//
// Formats lisibles FR (pour UI / légendes)
//
const JOURS_COURT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];
const MOIS_LONG = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

export function formatShortFR(d = new Date()) {
  return `${JOURS_COURT[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}
export function formatMonthFR(d = new Date()) {
  return `${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

//
// Monnaie / texte
//
export function toCurrency(n, cur = "€") {
  if (!isFinite(n)) return `0${cur}`;
  return `${(Math.round(n * 100) / 100).toLocaleString()}${cur}`;
}

//
// Stockage JSON simple (conservé pour compat)
// (Note: des fonctions plus évoluées existent dans web/js/storage.js)
//
export function loadJSON(key, def = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch { return def; }
}
export function saveJSON(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch { return false; }
}

//
// Throttle / Debounce
//
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
  let t = 0;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

//
// Utilitaires divers
//
export function groupBy(arr = [], keyFn = (x) => x) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}
