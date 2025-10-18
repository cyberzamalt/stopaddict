// web/js/utils.js
// Helpers génériques, zéro dépendance. Ajoute $, startOfWeek, startOfMonth demandés par stats.js.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// NEW: demandé par stats.js
export function startOfWeek(d = new Date(), weekStartsOn = 1 /* 1 = lundi */) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0..6 (0 = dimanche)
  const diff = (day - weekStartsOn + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

// NEW: demandé par stats.js
export function startOfMonth(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

export function formatYMD(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYMD(s) {
  // "YYYY-MM-DD" -> Date (à minuit)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function toCurrency(n, cur = "€") {
  if (!isFinite(n)) return `0${cur}`;
  return `${(Math.round(n * 100) / 100).toLocaleString()}${cur}`;
}

// Safe JSON localStorage
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

// Throttling simple
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
