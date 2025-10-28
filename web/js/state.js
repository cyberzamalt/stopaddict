/* web/js/state.js
   État central + pub/sub + historique + undo — v2
*/
import { $, $$, clamp, formatYMD, startOfDay, startOfWeek, startOfMonth, loadJSON, saveJSON } from "./utils.js";

const LS_HISTORY_KEY = "sa:history:v2";
const LS_MODULES_KEY = "sa:modules:v2";
const LS_UNDO_KEY    = "sa:undo:v2";

const listeners = new Map(); // evt -> Set(fn)

function emit(evt, payload) {
  const set = listeners.get(evt);
  if (set) for (const fn of set) { try { fn(payload); } catch(e){} }
}
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => off(evt, fn);
}
export function off(evt, fn) {
  const set = listeners.get(evt);
  if (set) set.delete(fn);
}

// ------------------------- ÉTAT & PERSISTANCE -------------------------
const modulesDefault = { cigs:true, weed:true, alcohol:true };
let modules = Object.assign({}, modulesDefault, loadJSON(LS_MODULES_KEY, modulesDefault));

let history = loadJSON(LS_HISTORY_KEY, {}); // { "YYYY-MM-DD": { cigs:0, weed:0, alcohol:{total:0, beer:0, strong:0, liquor:0} } }
if (!history || typeof history !== "object") history = {};

let undoStack = loadJSON(LS_UNDO_KEY, []); // [{date,key,delta,subKey?}]

function persist() {
  saveJSON(LS_HISTORY_KEY, history);
  saveJSON(LS_MODULES_KEY, modules);
  saveJSON(LS_UNDO_KEY, undoStack);
}

function ensureDayObj(dateStr) {
  if (!history[dateStr]) {
    history[dateStr] = {
      cigs: 0,
      weed: 0,
      alcohol: { total:0, beer:0, strong:0, liquor:0 }
    };
  } else if (!history[dateStr].alcohol || typeof history[dateStr].alcohol !== "object") {
    // migration ancienne structure
    const tot = Number(history[dateStr].alcohol || 0) || 0;
    history[dateStr].alcohol = { total: tot, beer:0, strong:0, liquor:0 };
  }
  return history[dateStr];
}

export function exportHistory() {
  return JSON.parse(JSON.stringify(history));
}
export function importHistory(obj, merge = true) {
  if (!obj || typeof obj !== "object") return false;
  history = merge ? Object.assign({}, history, obj) : obj;
  persist();
  emit("sa:history-imported", null);
  emit("sa:counts-updated", null);
  emit("sa:history-changed", null);
  return true;
}

// ------------------------- MODULES (activation) -------------------------
export function isModuleEnabled(key) {
  return !!modules[key];
}
export function setModuleEnabled(key, enabled) {
  if (!Object.prototype.hasOwnProperty.call(modules, key)) return;
  modules[key] = !!enabled;
  persist();
  emit("sa:modules-changed", { key, enabled: !!enabled });
  emit("sa:counts-updated", null); // pour recalculs éventuels côté UI/graphs
}

// ------------------------- ACTIONS + UNDO -------------------------
function pushUndo(rec) {
  undoStack.push(rec);
  if (undoStack.length > 100) undoStack.shift();
  persist();
}
export function canUndo() { return undoStack.length > 0; }
export function undoLast() {
  const rec = undoStack.pop();
  if (!rec) return false;
  const d = ensureDayObj(rec.date);
  if (rec.key === "alcohol") {
    const a = d.alcohol;
    a.total = clamp(a.total - rec.delta, 0, 1e9);
    if (rec.subKey && a[rec.subKey] != null) {
      a[rec.subKey] = clamp(a[rec.subKey] - rec.delta, 0, 1e9);
    }
  } else {
    d[rec.key] = clamp((Number(d[rec.key])||0) - rec.delta, 0, 1e9);
  }
  persist();
  emit("sa:counts-updated", null);
  emit("sa:history-changed", null);
  return true;
}

function adjust(key, delta = 1, subKey = null, date = new Date()) {
  const dateStr = formatYMD(date);
  const d = ensureDayObj(dateStr);

  if (key === "alcohol") {
    const a = d.alcohol;
    a.total = clamp(a.total + delta, 0, 1e9);
    if (subKey && a[subKey] != null) {
      a[subKey] = clamp(a[subKey] + delta, 0, 1e9);
    }
    pushUndo({ date: dateStr, key, delta, subKey: subKey || null });
  } else {
    const cur = Number(d[key] || 0);
    d[key] = clamp(cur + delta, 0, 1e9);
    pushUndo({ date: dateStr, key, delta });
  }

  persist();
  emit("sa:counts-updated", { date: dateStr, key, delta, subKey });
  emit("sa:history-changed", { date: dateStr });
}

export function inc(key, subKey = null, step = 1, date = new Date()) {
  adjust(key, Math.abs(step), subKey, date);
}
export function dec(key, subKey = null, step = 1, date = new Date()) {
  adjust(key, -Math.abs(step), subKey, date);
}

// ------------------------- LECTURE / AGRÉGATS -------------------------
export function getDay(date = new Date()) {
  return ensureDayObj(formatYMD(date));
}
export function getDayByKey(dateStr) {
  return ensureDayObj(dateStr);
}
export function todayTotals() {
  const d = getDay(new Date());
  return {
    cigs: Number(d.cigs || 0),
    weed: Number(d.weed || 0),
    alcohol: Number(d.alcohol?.total || 0),
    alcoholDetail: {
      beer: Number(d.alcohol?.beer || 0),
      strong: Number(d.alcohol?.strong || 0),
      liquor: Number(d.alcohol?.liquor || 0),
    }
  };
}
export function getHistory() {
  return history;
}

// Renvoie agrégats entre dates (inclusives)
export function totalsBetween(fromDate, toDate) {
  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);
  const res = { cigs:0, weed:0, alcohol:0, beer:0, strong:0, liquor:0 };
  const cur = new Date(from);
  while (cur <= to) {
    const k = formatYMD(cur);
    const d = history[k];
    if (d) {
      res.cigs   += Number(d.cigs || 0);
      res.weed   += Number(d.weed || 0);
      const a = d.alcohol || {};
      res.alcohol += Number(a.total || 0);
      res.beer    += Number(a.beer || 0);
      res.strong  += Number(a.strong || 0);
      res.liquor  += Number(a.liquor || 0);
    }
    cur.setDate(cur.getDate()+1);
  }
  return res;
}

export function rangeData(range /* "day"|"week"|"month"|"year" */, anchor = new Date()) {
  const labels = [];
  const cigs = [], weed = [], alcohol = [];
  const costs = []; // laissé pour usage éventuel par charts/stats (rempli ailleurs si besoin)
  const ecos  = [];

  const A = startOfDay(anchor);
  const tmp = new Date(A);

  const addPoint = (d) => {
    const k = formatYMD(d);
    labels.push(k);
    const obj = history[k] || {};
    cigs.push(Number(obj.cigs || 0));
    weed.push(Number(obj.weed || 0));
    const a = obj.alcohol || {};
    alcohol.push(Number(a.total || 0));
    costs.push(0);
    ecos.push(0);
  };

  if (range === "day") {
    addPoint(tmp);
  } else if (range === "week") {
    const start = startOfWeek(A, 1);
    for (let i=0;i<7;i++) {
      const d = new Date(start); d.setDate(start.getDate()+i);
      addPoint(d);
    }
  } else if (range === "month") {
    const m0 = startOfMonth(A);
    const m1 = new Date(m0.getFullYear(), m0.getMonth()+1, 0); // fin mois
    for (let d=new Date(m0); d<=m1; d.setDate(d.getDate()+1)) addPoint(d);
  } else if (range === "year") {
    // 12 points (mois) = somme par mois
    for (let m=0; m<12; m++) {
      const first = new Date(A.getFullYear(), m, 1);
      const last  = new Date(A.getFullYear(), m+1, 0);
      const agg = totalsBetween(first, last);
      labels.push(String(m+1).padStart(2,"0") + "/" + A.getFullYear());
      cigs.push(agg.cigs); weed.push(agg.weed); alcohol.push(agg.alcohol);
      costs.push(0); ecos.push(0);
    }
  } else {
    addPoint(tmp);
  }

  return { labels, cigs, weed, alcohol, costs, ecos };
}

// Expose modules pour lecture externe
export const state = {
  get modules(){ return Object.assign({}, modules); }
};

// Émission initiale pour synchro UIs tardives
setTimeout(() => {
  emit("sa:modules-changed", null);
  emit("sa:counts-updated", null);
}, 0);

export { emit }; // optionnel pour modules internes
