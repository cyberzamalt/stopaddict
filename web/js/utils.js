// Utilitaires généraux (dates, format…)
export const DAY_MS = 86400000;

export const $ = (sel) => document.querySelector(sel);

export function startOfDay(d = new Date()) {
  const x = new Date(d); x.setHours(0,0,0,0); return x;
}
export function inRange(ts, a, b) { const t = +new Date(ts); return t >= +a && t <= +b; }
export function isToday(ts) { const a = startOfDay(); const b = new Date(+a + DAY_MS - 1); return inRange(ts, a, b); }

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d); const day = x.getDay() || 7; // Lundi=1..Dim=7
  x.setDate(x.getDate() - (day - 1)); return x;
}
export function startOfMonth(d = new Date()) { const x = startOfDay(d); x.setDate(1); return x; }

export function toast(node, msg, kind="info") {
  node.className = "feedback " + kind;
  node.textContent = msg;
  setTimeout(()=>{ node.className = "feedback"; node.textContent=""; }, 3000);
}
