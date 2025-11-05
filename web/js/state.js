/* web/js/state.js
   État centralisé, logique métier, calculs, bus événements
   Exports: getters/setters, calculs, bus, agrégations.
*/

// -------------------- Bus d'événements --------------------
const listeners = new Map();
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, []);
  listeners.get(evt).push(fn);
}
export function off(evt, fn) {
  const arr = listeners.get(evt) || [];
  listeners.set(evt, arr.filter(f => f !== fn));
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
  modules: { 
    cigs: false, 
    weed: false, 
    alcohol: false,
    // Sous-modules alcool
    beer: false,
    strong: false,
    liquor: false
  },
  prices: { 
    cigs: 0, 
    weed: 0, 
    beer: 0, 
    strong: 0, 
    liquor: 0 
  },
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

// -------------------- Utils --------------------
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function persistSettings() { 
  localStorage.setItem(K_SETTINGS, JSON.stringify(settings)); 
}
function persistHistory()  { 
  localStorage.setItem(K_HISTORY,  JSON.stringify(history)); 
}

// -------------------- Accès en lecture --------------------
export function getSettings() { return structuredClone(settings); }
export function getData()     { return structuredClone(history); }
export function getDaily(ymd) { return structuredClone(history[ymd] || {}); }

// -------------------- Mutation settings --------------------
export function setSettings(next) {
  settings = structuredClone(next);
  persistSettings();
  emit("sa:settings-changed", structuredClone(settings));
  console.log("[state] settings modifiés", settings);
}

// -------------------- Mutation données --------------------
export function formatYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function updateDay(ymd, type, amount, subType) {
  let d = history[ymd] || { c:0, j:0, a:{ beer:0, strong:0, liquor:0 } };
  if (type === "c") d.c = Math.max(0, (d.c || 0) + amount);
  if (type === "j") d.j = Math.max(0, (d.j || 0) + amount);
  if (type === "a") {
    d.a = d.a || { beer:0, strong:0, liquor:0 };
    d.a[subType] = Math.max(0, (d.a[subType] || 0) + amount);
  }
  history[ymd] = d;

  persistHistory();
  emit("sa:counts-updated", { ymd, day: structuredClone(d) });
}

// -------------------- Coûts & économies --------------------
export function calculateDayCost(day) {
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
// et on pourra utiliser ces baselines pour estimer l'économie.
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
      res.cost    += calculateDayCost(day).total;
      res.eco     += economiesForDay(day);
    }
    d.setDate(d.getDate()+1);
  }
  return res;
}

// -------------------- Helpers date --------------------
export function startOfWeek(d, firstDayOfWeek = 1) {
  const day = d.getDay();
  const diff = (day < firstDayOfWeek ? 7 : 0) + day - firstDayOfWeek;
  const res = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return res;
}

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// -------------------- Économies (new) --------------------
let economy = loadJSON("sa.economy.v1", {
  baseline: {},
  lastReset: null,
  cumulatedSavings: 0,
});

export function getEconomy() {
  return structuredClone(economy);
}

export function setEconomy(eco) {
  economy = structuredClone(eco);
  localStorage.setItem("sa.economy.v1", JSON.stringify(economy));
  emit("sa:economy-changed", structuredClone(economy));
}

// -------------------- Habitudes (new) --------------------
let habits = loadJSON("sa.habits.v1", {
  goals: {},
  triggers: [],
  replacements: [],
  progress: {}
});

export function getHabits() {
  return structuredClone(habits);
}

export function setHabits(h) {
  habits = structuredClone(h);
  localStorage.setItem("sa.habits.v1", JSON.stringify(habits));
  emit("sa:habits-changed", structuredClone(habits));
}
