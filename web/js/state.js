// web/js/state.js
// ============================================================
// State centralisé + persistance + helpers de calcul
// Compatible avec counters.js, charts.js, stats.js, economy.js
// Exporte :
// - getSettings / saveSettings
// - getDaily / saveDaily
// - getEconomy / saveEconomy
// - addEntry(type, qty[, subtype])
// - removeOneToday(type)
// - totalsHeader(date)
// - costToday(date)
// - economiesHint(date)
// - state (lecture), emit/on/off
// ============================================================

/* ---------- Constantes & clés de stockage ---------- */
const LS_KEYS = {
  settings: "sa_settings_v24",
  daily:    "sa_daily_v24",
  economy:  "sa_economy_v24",
  ui:       "sa_ui_v24", // segments actifs, switches, etc.
};

const TYPES = {
  cigs:    { sub: ["classic", "rolled", "tube"] },
  weed:    { sub: [] },
  alcohol: { sub: ["beer", "fort", "liqueur"] },
};

/* ---------- Mini bus d'événements ---------- */
const bus = new EventTarget();
export function emit(name, detail = {}) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}
export function on(name, fn) {
  bus.addEventListener(name, fn);
}
export function off(name, fn) {
  bus.removeEventListener(name, fn);
}

/* ---------- Utils dates ---------- */
function pad(n) { return n < 10 ? "0" + n : "" + n; }
export function ymd(d = new Date()) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
export function startOfWeek(d = new Date(), weekStartsOn = 1) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 7 - weekStartsOn) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
export function startOfMonth(d = new Date()) {
  const copy = new Date(d.getFullYear(), d.getMonth(), 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/* ---------- Persistance générique ---------- */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    const v = JSON.parse(raw);
    return v ?? structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("[state] save error", key, e);
  }
}

/* ---------- Structures par défaut ---------- */
const DEFAULT_SETTINGS = {
  modules: { cigs: true, weed: true, alcohol: true },
  // limites (par jour)
  limits: { cigs: 20, weed: 3, beer: 2, fort: 1, liqueur: 1 },
  // autres options UI
  showCosts: true,
};

const DEFAULT_ECONOMY = {
  enabled: true, // “Lien économies” coché
  prices: {
    cigs:    { classic: 0, rolled: 0, tube: 0 },
    weed:    { joint: 0 },
    alcohol: { beer: 0, fort: 0, liqueur: 0 },
  },
  // baseline / habitudes (pour estimer économies – facultatif)
  baselinePerDay: {
    cigs:    { classic: 0, rolled: 0, tube: 0 },
    weed:    { joint: 0 },
    alcohol: { beer: 0, fort: 0, liqueur: 0 },
  },
};

function blankDay() {
  return {
    cigs:    { classic: 0, rolled: 0, tube: 0, total: 0 },
    weed:    { total: 0 },
    alcohol: { beer: 0, fort: 0, liqueur: 0, total: 0 },
    cost: 0,
  };
}

/* ---------- State en mémoire ---------- */
const _settings = load(LS_KEYS.settings, DEFAULT_SETTINGS);
const _economy  = load(LS_KEYS.economy,  DEFAULT_ECONOMY);
const _daily    = load(LS_KEYS.daily,    {});            // indexé par "YYYY-MM-DD"
const _ui       = load(LS_KEYS.ui,       { seg: { cigs: "classic", alcohol: "beer" } });

export const state = {
  settings: _settings,
  economy:  _economy,
  daily:    _daily,
  ui:       _ui,
};

/* ---------- API Settings/Economy/Daily ---------- */
export function getSettings() { return state.settings; }
export function saveSettings(s) {
  state.settings = { ...state.settings, ...s };
  save(LS_KEYS.settings, state.settings);
  emit("state:settings", { settings: state.settings });
}

export function getEconomy() { return state.economy; }
export function saveEconomy(e) {
  state.economy = { ...state.economy, ...e };
  save(LS_KEYS.economy, state.economy);
  emit("state:economy", { economy: state.economy });
}

export function getDaily() { return state.daily; }
export function saveDaily(d) {
  // d attendu : { "YYYY-MM-DD": {...}, ... }
  state.daily = d;
  save(LS_KEYS.daily, state.daily);
  emit("state:daily", { daily: state.daily });
}

/* ---------- Helpers sous-types actifs (segments) ---------- */
function getActiveSubtypeFor(type) {
  // Si counters.js a enregistré un segment actif côté UI → on le respecte.
  // Sinon fallback sûr.
  if (type === "cigs") {
    return state.ui?.seg?.cigs || "classic";
  }
  if (type === "alcohol") {
    return state.ui?.seg?.alcohol || "beer";
  }
  return null; // weed : pas de sous-type
}

/* ---------- Core mutations ---------- */
/**
 * addEntry("cigs"|"weed"|"alcohol", qty=1, subtype?)
 * - si subtype omis → on prend le segment actif (si applicable)
 */
export function addEntry(type, qty = 1, subtype = null, date = new Date()) {
  if (!TYPES[type]) return;

  const key = ymd(date);
  const day = state.daily[key] ?? blankDay();

  // Détermine le sous-type si nécessaire
  let st = subtype;
  if (!st && (type === "cigs" || type === "alcohol")) {
    st = getActiveSubtypeFor(type);
  }

  // Applique les deltas
  if (type === "cigs") {
    const name = TYPES.cigs.sub.includes(st) ? st : "classic";
    day.cigs[name] = Math.max(0, (day.cigs[name] || 0) + qty);
    day.cigs.total = Math.max(0, (day.cigs.classic + day.cigs.rolled + day.cigs.tube));
  } else if (type === "weed") {
    day.weed.total = Math.max(0, (day.weed.total || 0) + qty);
  } else if (type === "alcohol") {
    const name = TYPES.alcohol.sub.includes(st) ? st : "beer";
    day.alcohol[name] = Math.max(0, (day.alcohol[name] || 0) + qty);
    day.alcohol.total = Math.max(0, (day.alcohol.beer + day.alcohol.fort + day.alcohol.liqueur));
  }

  // Recalcule (coût du jour)
  day.cost = computeCostForDay(day);

  // Persiste
  state.daily[key] = day;
  save(LS_KEYS.daily, state.daily);

  emit("state:changed", { dateKey: key, type, qty, subtype: st, day });
  return day;
}

/**
 * removeOneToday("cigs"|"weed"|"alcohol")
 * Décrémente intelligemment :
 *  - cigs/alcohol : priorise le sous-type actif s'il est > 0, sinon cherche un sous-type non nul
 *  - weed : décrémente total si > 0
 */
export function removeOneToday(type, date = new Date()) {
  if (!TYPES[type]) return;

  const key = ymd(date);
  const day = state.daily[key] ?? blankDay();

  if (type === "cigs") {
    let st = getActiveSubtypeFor("cigs");
    if (!day.cigs[st]) {
      // cherche un sous-type non nul
      st = TYPES.cigs.sub.find(s => (day.cigs[s] || 0) > 0) || st;
    }
    if ((day.cigs[st] || 0) > 0) {
      day.cigs[st] -= 1;
      day.cigs.total = Math.max(0, (day.cigs.classic + day.cigs.rolled + day.cigs.tube));
    }
  } else if (type === "weed") {
    if ((day.weed.total || 0) > 0) day.weed.total -= 1;
  } else if (type === "alcohol") {
    let st = getActiveSubtypeFor("alcohol");
    if (!day.alcohol[st]) {
      st = TYPES.alcohol.sub.find(s => (day.alcohol[s] || 0) > 0) || st;
    }
    if ((day.alcohol[st] || 0) > 0) {
      day.alcohol[st] -= 1;
      day.alcohol.total = Math.max(0, (day.alcohol.beer + day.alcohol.fort + day.alcohol.liqueur));
    }
  }

  day.cost = computeCostForDay(day);
  state.daily[key] = day;
  save(LS_KEYS.daily, state.daily);

  emit("state:changed", { dateKey: key, type, qty: -1, day });
  return day;
}

/* ---------- Calculs coûts & économies ---------- */
function computeCostForDay(dayObj) {
  if (!state.economy?.enabled) return 0;
  const p = state.economy.prices || DEFAULT_ECONOMY.prices;

  let cost = 0;
  // clopes
  cost += (dayObj.cigs.classic || 0) * (p.cigs.classic || 0);
  cost += (dayObj.cigs.rolled  || 0) * (p.cigs.rolled  || 0);
  cost += (dayObj.cigs.tube    || 0) * (p.cigs.tube    || 0);
  // weed
  cost += (dayObj.weed.total   || 0) * (p.weed.joint   || 0);
  // alcool
  cost += (dayObj.alcohol.beer     || 0) * (p.alcohol.beer    || 0);
  cost += (dayObj.alcohol.fort     || 0) * (p.alcohol.fort    || 0);
  cost += (dayObj.alcohol.liqueur  || 0) * (p.alcohol.liqueur || 0);

  return Math.max(0, Math.round(cost * 100) / 100);
}

/**
 * costToday(date) → € pour la journée
 */
export function costToday(date = new Date()) {
  const key = ymd(date);
  const day = state.daily[key] ?? blankDay();
  return computeCostForDay(day);
}

/**
 * economiesHint(date) → petit texte "Économies estimées : …"
 * Logique simple : si baseline > consommation réelle, affiche l’écart * prix
 * (Ce n’est qu’un hint — l’éco cumulée peut être faite ailleurs si besoin)
 */
export function economiesHint(date = new Date()) {
  if (!state.economy?.enabled) return "";

  const key = ymd(date);
  const day = state.daily[key] ?? blankDay();
  const base = state.economy.baselinePerDay || DEFAULT_ECONOMY.baselinePerDay;
  const price = state.economy.prices || DEFAULT_ECONOMY.prices;

  let saved = 0;

  // cigs
  const cDiffClassic = Math.max(0, (base.cigs.classic || 0) - (day.cigs.classic || 0));
  const cDiffRolled  = Math.max(0, (base.cigs.rolled  || 0) - (day.cigs.rolled  || 0));
  const cDiffTube    = Math.max(0, (base.cigs.tube    || 0) - (day.cigs.tube    || 0));
  saved += cDiffClassic * (price.cigs.classic || 0);
  saved += cDiffRolled  * (price.cigs.rolled  || 0);
  saved += cDiffTube    * (price.cigs.tube    || 0);

  // weed
  const wDiff = Math.max(0, (base.weed.joint || 0) - (day.weed.total || 0));
  saved += wDiff * (price.weed.joint || 0);

  // alcool
  const aDiffBeer    = Math.max(0, (base.alcohol.beer    || 0) - (day.alcohol.beer    || 0));
  const aDiffFort    = Math.max(0, (base.alcohol.fort    || 0) - (day.alcohol.fort    || 0));
  const aDiffLiqueur = Math.max(0, (base.alcohol.liqueur || 0) - (day.alcohol.liqueur || 0));
  saved += aDiffBeer    * (price.alcohol.beer    || 0);
  saved += aDiffFort    * (price.alcohol.fort    || 0);
  saved += aDiffLiqueur * (price.alcohol.liqueur || 0);

  if (saved <= 0) return "";
  return `Économies estimées : ${saved.toFixed(2)} €`;
}

/**
 * totalsHeader(date) → objet de synthèse pour stats rapides / bandeau
 * { cigs, weed, alcohol, cost }
 */
export function totalsHeader(date = new Date()) {
  const key = ymd(date);
  const d = state.daily[key] ?? blankDay();
  return {
    cigs: d.cigs.total || 0,
    weed: d.weed.total || 0,
    alcohol: d.alcohol.total || 0,
    cost: computeCostForDay(d),
  };
}

/* ---------- Sauvegarde UI (segments actifs) ---------- */
export function setActiveSegment(type, subtype) {
  if (!state.ui.seg) state.ui.seg = {};
  state.ui.seg[type] = subtype;
  save(LS_KEYS.ui, state.ui);
  emit("state:ui", { ui: state.ui });
}
export function getActiveSegments() {
  return state.ui.seg || { cigs: "classic", alcohol: "beer" };
}

/* ---------- Exports legacy pour compatibilité éventuelle ---------- */
// Certains anciens modules utilisaient save() directement :
export { save };
