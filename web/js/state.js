/* web/js/state.js
   État applicatif : settings, historique, événements, undo.
   Fournit helpers coûts/économies + bus d’événements.
*/
import { formatYMD, loadJSON, saveJSON, startOfWeek, startOfMonth } from "./utils.js";

// -------------------- Event bus --------------------
const listeners = new Map(); // evt -> Set<fn>
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
}
export function off(evt, fn) {
  listeners.get(evt)?.delete(fn);
}
export function emit(evt, data) {
  (listeners.get(evt) || []).forEach(fn => {
    try { fn(data); } catch (e) { console.warn("[emit]", evt, e); }
  });
}

// -------------------- Keys / storage --------------------
const K_SETTINGS = "sa.settings.v1";
const K_HISTORY  = "sa.history.v1";
const K_UNDO     = "sa.undo.v1";

// -------------------- Defaults --------------------
const DEFAULT_SETTINGS = {
  currency: "€",
  lang: "fr",
  modules: { cigs: true, weed: true, alcohol: true },
  prices:  { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 },
  milestones: {
    cigs:    { reduce:"", stop:"", zero:"" },
    weed:    { reduce:"", stop:"", zero:"" },
    alcohol: { reduce:"", stop:"", zero:"" },
  }
};

// history schema:
// { [ymd]: { c: number, j: number, a: { beer:number, strong:number, liquor:number } } }
let settings = loadJSON(K_SETTINGS, DEFAULT_SETTINGS);
let history  = loadJSON(K_HISTORY, {});
let undoStack = loadJSON(K_UNDO, []);

// -------------------- Settings API --------------------
export function getSettings() {
  // éviter mutation externe
  return structuredClone(settings);
}
export function setSettings(next) {
  settings = { ...DEFAULT_SETTINGS, ...settings, ...next };
  saveJSON(K_SETTINGS, settings);
  emit("sa:settings-changed", structuredClone(settings));
}

// -------------------- History API --------------------
function ensureDay(ymd) {
  if (!history[ymd]) {
    history[ymd] = { c: 0, j: 0, a: { beer: 0, strong: 0, liquor: 0 } };
  } else {
    // normaliser structure alcool (migration éventuelle)
    history[ymd].a = history[ymd].a || { beer: 0, strong: 0, liquor: 0 };
    history[ymd].c = history[ymd].c || 0;
    history[ymd].j = history[ymd].j || 0;
  }
  return history[ymd];
}
export function getDay(ymd = formatYMD(new Date())) {
  return structuredClone(ensureDay(ymd));
}
export function setDay(ymd, data) {
  const prev = structuredClone(ensureDay(ymd));
  pushUndo({ type: "setDay", ymd, prev });
  history[ymd] = {
    c: Number(data.c || 0),
    j: Number(data.j || 0),
    a: {
      beer:   Number(data.a?.beer   || 0),
      strong: Number(data.a?.strong || 0),
      liquor: Number(data.a?.liquor || 0),
    }
  };
  persistHistory();
  emit("sa:counts-updated", { ymd, day: structuredClone(history[ymd]) });
}
export function incCount(kind, delta = 1, ymd = formatYMD(new Date())) {
  // kind: 'c' (cigs), 'j' (weed), 'beer'|'strong'|'liquor'
  const d = ensureDay(ymd);
  const prev = structuredClone(d);
  pushUndo({ type: "delta", ymd, prev });

  if (kind === "c") d.c = Math.max(0, d.c + delta);
  else if (kind === "j") d.j = Math.max(0, d.j + delta);
  else if (kind === "beer" || kind === "strong" || kind === "liquor") {
    d.a[kind] = Math.max(0, (d.a[kind] || 0) + delta);
  } else {
    console.warn("[incCount] type inconnu:", kind);
  }

  persistHistory();
  emit("sa:counts-updated", { ymd, day: structuredClone(d) });
}

// -------------------- Coûts & économies --------------------
export function costForDay(day) {
  const p = settings.prices || {};
  const cigsCost  = (day.c || 0) * (p.cigs   || 0);
  const weedCost  = (day.j || 0) * (p.weed   || 0);
  const beerCost  = (day.a?.beer   || 0) * (p.beer   || 0);
  const strongCost= (day.a?.strong || 0) * (p.strong || 0);
  const liquorCost= (day.a?.liquor || 0) * (p.liquor || 0);
  const total = cigsCost + weedCost + beerCost + strongCost + liquorCost;
  return { total, breakdown: { cigsCost, weedCost, beerCost, strongCost, liquorCost } };
}

// (placeholder) économies : ici on calcule vs 0 par défaut.
// Si tu ajoutes une baseline dans habits.js → émettre sa:habits-changed
// et on pourra utiliser ces baselines pour estimer l’économie.
export function economiesForDay(/*day*/) {
  return 0;
}

// -------------------- Agrégations (stats/charts) --------------------
export function getRangeTotals(range, refDate = new Date()) {
  // range: 'day' | 'week' | 'month' | 'year'
  const res = { c:0, j:0, aBeer:0, aStrong:0, aLiquor:0, cost:0, eco:0 };
  const curY = refDate.getFullYear();
  const curM = refDate.getMonth();

  const start =
    range === "day"  ? new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()) :
    range === "week" ? startOfWeek(refDate, 1) :
    range === "month"? startOfMonth(refDate) :
    /*year*/           new Date(curY, 0, 1);

  const end =
    range === "day"  ? new Date(start.getFullYear(), start.getMonth(), start.getDate()+1) :
    range === "week" ? new Date(start.getFullYear(), start.getMonth(), start.getDate()+7) :
    range === "month"? new Date(start.getFullYear(), start.getMonth()+1, 1) :
                       new Date(curY+1, 0, 1);

  const d = new Date(start);
  while (d < end) {
    const ymd = formatYMD(d);
    const day = history[ymd];
    if (day) {
      res.c += (day.c || 0);
      res.j += (day.j || 0);
      res.aBeer   += (day.a?.beer   || 0);
      res.aStrong += (day.a?.strong || 0);
      res.aLiquor += (day.a?.liquor || 0);
      res.cost    += costForDay(day).total;
      res.eco     += economiesForDay(day);
    }
    d.setDate(d.getDate()+1);
  }
  return res;
}

export function getHistory() {
  return structuredClone(history);
}
export function replaceHistory(nextHistory) {
  pushUndo({ type:"replaceHistory", prev: structuredClone(history) });
  history = nextHistory || {};
  persistHistory();
  emit("sa:counts-updated", { all: true });
}

// -------------------- Undo --------------------
function pushUndo(entry) {
  try {
    undoStack.push(entry);
    if (undoStack.length > 50) undoStack.shift();
    saveJSON(K_UNDO, undoStack);
  } catch {}
}
function persistHistory() {
  saveJSON(K_HISTORY, history);
}
export function canUndo() {
  return undoStack.length > 0;
}
export function undoLast() {
  const entry = undoStack.pop();
  if (!entry) return;
  try {
    if (entry.type === "setDay" || entry.type === "delta") {
      history[entry.ymd] = entry.prev;
      persistHistory();
      emit("sa:counts-updated", { ymd: entry.ymd, day: structuredClone(history[entry.ymd]) });
    } else if (entry.type === "replaceHistory") {
      history = entry.prev || {};
      persistHistory();
      emit("sa:counts-updated", { all: true });
    }
  } finally {
    saveJSON(K_UNDO, undoStack);
  }
}
