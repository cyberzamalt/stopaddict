// web/js/state.js
// STOPADDICT — Source de vérité (état, réglages, données journalières, agrégats)
// - Persistance localStorage avec migration tolérante
// - Catégories gérées : cigs, weed, beer, strong, liquor
// - Sous-modules alcool : beer/strong/liquor activables indépendamment
// - Toutes les sommes/agrégats EXCLUENT les catégories désactivées
// - Évènements émis : 'sa:state-changed', 'sa:counts-updated'
// API exportée (principales) :
//   load(), save(), ymd(d)
//   getSettings(), setSettings(partial)
//   getViewRange(), setViewRange(range)
//   getDaily(date), ensureToday()
//   addCount(kind, delta, date?), setCount(kind, value, date?)
//   totalsHeader(range, date), getRangeTotals(range, date)
//   calculateDayCost(rec, settings?), getEconomy(rec, settings?)

"use strict";

const STORE_KEY = "stopaddict_state_v3";

// ---- État en mémoire --------------------------------------------------------
let state = {
  version: 3,
  ui: {
    viewRange: "day", // 'day' | 'week' | 'month' | 'year'
  },
  settings: {
    // Modules
    enable_cigs: true,
    enable_weed: true,
    enable_alcohol: true,
    enable_beer: true,
    enable_strong: true,
    enable_liquor: true,
    // Prix unitaire (affichage monnaie géré ailleurs)
    prices: { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 },
    // Objectifs quotidiens (baselines)
    baselines: { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 },
    // Dates clés (utilisation libre)
    dates: { quit_all: "", quit_cigs: "", quit_weed: "", quit_alcohol: "" },
    // Profil utilisateur
    profile: { name: "" },
    // Préférence langue (optionnelle, i18n.js gère le reste)
    lang: null,
  },
  // Données journalières: map 'YYYY-MM-DD' -> { cigs, weed, beer, strong, liquor, note? }
  days: {}
};

// ---- Utils ------------------------------------------------------------------
export function ymd(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function clampNonNeg(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  return v < 0 ? 0 : v;
}
function deepMerge(target, patch) {
  if (!patch || typeof patch !== "object") return target;
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const k of Object.keys(patch)) {
    const pv = patch[k];
    if (pv && typeof pv === "object" && !Array.isArray(pv)) {
      out[k] = deepMerge(target?.[k] || {}, pv);
    } else {
      out[k] = pv;
    }
  }
  return out;
}

// ---- Persistance / migration -------------------------------------------------
export function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = migrate(ensureShape(parsed));
      return;
    }
    // Legacy keys (v1/v2) — migration douce si présentes
    const legacy = localStorage.getItem("stopaddict_state_v2") || localStorage.getItem("stopaddict_state");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      state = migrate(ensureShape(parsed));
      save(); // ré-écrire au nouveau format
      return;
    }
  } catch (e) {
    console.warn("[state.load] parse error, using defaults", e);
  }
  // first-time defaults already in `state`
  ensureToday();
  save();
}

export function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("[state.save] localStorage error", e);
  }
}

function ensureShape(s) {
  const out = { ...state, ...s };
  out.version = Number.isFinite(+out.version) ? +out.version : 3;
  out.ui = { ...state.ui, ...(s?.ui || {}) };
  out.settings = deepMerge(state.settings, s?.settings || {});
  out.days = s?.days && typeof s.days === "object" ? s.days : {};
  // sanitize days
  for (const k of Object.keys(out.days)) {
    const d = out.days[k] || {};
    out.days[k] = {
      cigs: clampNonNeg(d.cigs),
      weed: clampNonNeg(d.weed),
      beer: clampNonNeg(d.beer),
      strong: clampNonNeg(d.strong),
      liquor: clampNonNeg(d.liquor),
      note: typeof d.note === "string" ? d.note : "",
    };
  }
  return out;
}

function migrate(s) {
  // Ajouter champs manquants selon versions antérieures
  s.settings.prices ??= { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
  s.settings.baselines ??= { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
  s.settings.dates ??= { quit_all: "", quit_cigs: "", quit_weed: "", quit_alcohol: "" };
  s.settings.profile ??= { name: "" };
  // Alcohol submodules
  if (s.settings.enable_alcohol && (s.settings.enable_beer == null && s.settings.enable_strong == null && s.settings.enable_liquor == null)) {
    s.settings.enable_beer = true;
    s.settings.enable_strong = true;
    s.settings.enable_liquor = true;
  }
  s.version = 3;
  return s;
}

// ---- Sélecteurs & mutateurs de réglages -------------------------------------
export function getSettings() {
  return state.settings;
}

export function setSettings(partial) {
  state.settings = deepMerge(state.settings, partial || {});
  save();
  try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "settings" } })); } catch {}
}

// ---- Vue Stats (day/week/month/year) ----------------------------------------
export function getViewRange() {
  return state.ui.viewRange || "day";
}
export function setViewRange(range) {
  if (!["day", "week", "month", "year"].includes(range)) return;
  state.ui.viewRange = range;
  save();
  try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "viewRange" } })); } catch {}
}

// ---- Données journalières ----------------------------------------------------
export function getDaily(date) {
  const key = ymd(date || new Date());
  if (!state.days[key]) {
    state.days[key] = { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0, note: "" };
    save();
  }
  return state.days[key];
}

export function ensureToday() {
  getDaily(new Date());
}

export function addCount(kind, delta = 1, date = new Date()) {
  if (!["cigs", "weed", "beer", "strong", "liquor"].includes(kind)) return;
  const rec = getDaily(date);
  rec[kind] = clampNonNeg((+rec[kind] || 0) + (+delta || 0));
  save();
  try { document.dispatchEvent(new CustomEvent("sa:counts-updated", { detail: { date: ymd(date), kind, value: rec[kind] } })); } catch {}
}

export function setCount(kind, value, date = new Date()) {
  if (!["cigs", "weed", "beer", "strong", "liquor"].includes(kind)) return;
  const rec = getDaily(date);
  rec[kind] = clampNonNeg(value);
  save();
  try { document.dispatchEvent(new CustomEvent("sa:counts-updated", { detail: { date: ymd(date), kind, value: rec[kind] } })); } catch {}
}

// ---- Catégories actives / filtrage ------------------------------------------
function enabledKinds(settings = state.settings) {
  const out = [];
  if (settings.enable_cigs) out.push("cigs");
  if (settings.enable_weed) out.push("weed");
  if (settings.enable_alcohol && settings.enable_beer) out.push("beer");
  if (settings.enable_alcohol && settings.enable_strong) out.push("strong");
  if (settings.enable_alcohol && settings.enable_liquor) out.push("liquor");
  return out;
}

// ---- Coûts & économies -------------------------------------------------------
export function calculateDayCost(rec, settings = state.settings) {
  const prices = settings.prices || {};
  let cost = 0;
  for (const k of enabledKinds(settings)) {
    const unit =
      k === "cigs" ? +prices.cig :
      k === "weed" ? +prices.weed :
      k === "beer" ? +prices.beer :
      k === "strong" ? +prices.strong :
      k === "liquor" ? +prices.liquor : 0;
    cost += (clampNonNeg(rec[k]) * (Number.isFinite(unit) ? unit : 0));
  }
  return +cost || 0;
}

export function getEconomy(rec, settings = state.settings) {
  // économie = max(0, (baseline - conso réelle)) * prix
  const base = settings.baselines || {};
  const prices = settings.prices || {};
  let eco = 0;
  for (const k of enabledKinds(settings)) {
    const b =
      k === "cigs" ? +base.cig :
      k === "weed" ? +base.weed :
      k === "beer" ? +base.beer :
      k === "strong" ? +base.strong :
      k === "liquor" ? +base.liquor : 0;

    const unit =
      k === "cigs" ? +prices.cig :
      k === "weed" ? +prices.weed :
      k === "beer" ? +prices.beer :
      k === "strong" ? +prices.strong :
      k === "liquor" ? +prices.liquor : 0;

    const diff = Math.max(0, (Number.isFinite(b) ? b : 0) - clampNonNeg(rec[k]));
    eco += diff * (Number.isFinite(unit) ? unit : 0);
  }
  return +eco || 0;
}

// ---- Périodes & agrégats -----------------------------------------------------
function startOfWeekFR(d) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Lundi=0 ... Dimanche=6
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function endOfWeekFR(d) {
  const start = startOfWeekFR(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
function startOfMonth(d) {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), 1);
}
function endOfMonth(d) {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfYear(d) {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), 0, 1);
}
function endOfYear(d) {
  const dt = new Date(d);
  return new Date(dt.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function dateRange(range, refDate = new Date()) {
  const d = refDate instanceof Date ? refDate : new Date(refDate);
  let start, end;
  if (range === "day") {
    start = new Date(d); start.setHours(0, 0, 0, 0);
    end = new Date(d);   end.setHours(23, 59, 59, 999);
  } else if (range === "week") {
    start = startOfWeekFR(d); end = endOfWeekFR(d);
  } else if (range === "month") {
    start = startOfMonth(d);  end = endOfMonth(d);
  } else {
    start = startOfYear(d);   end = endOfYear(d);
  }
  return { start, end };
}

export function totalsHeader(range, refDate = new Date()) {
  const { start, end } = dateRange(range, refDate);
  const fmt = (dt) => dt.toLocaleDateString?.() || ymd(dt);
  if (range === "day") return `Bilan Jour — ${fmt(refDate)}`;
  if (range === "week") return `Bilan Semaine — ${fmt(start)} → ${fmt(end)}`;
  if (range === "month") return `Bilan Mois — ${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}`;
  return `Bilan Année — ${refDate.getFullYear()}`;
}

export function getRangeTotals(range = "day", refDate = new Date()) {
  const kinds = enabledKinds();
  const { start, end } = dateRange(range, refDate);

  const labels = [];
  const series = { cigs: [], weed: [], beer: [], strong: [], liquor: [] };
  const sum = { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
  let totalCost = 0;
  let totalEco = 0;

  // Itération jour par jour dans la plage (sans créer de jours manquants)
  const cursor = new Date(start);
  while (cursor <= end) {
    const k = ymd(cursor);
    const rec = state.days[k];
    const dayObj = rec || { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };

    labels.push(k);

    for (const cat of ["cigs", "weed", "beer", "strong", "liquor"]) {
      const v = clampNonNeg(dayObj[cat]);
      series[cat].push(v);
      if (kinds.includes(cat)) sum[cat] += v;
    }

    // Coût/Éco (seulement catégories actives)
    if (kinds.length) {
      totalCost += calculateDayCost(dayObj, state.settings);
      totalEco  += getEconomy(dayObj, state.settings);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Filtrer les séries aux catégories actives (les autres restent pour compat charts mais on peut ignorer côté rendu)
  const filteredSeries = {};
  for (const cat of kinds) filteredSeries[cat] = series[cat];

  return {
    range,
    start,
    end,
    labels,             // ex: ['2025-10-25', ...]
    series: filteredSeries,
    sum,                // sommes (seulement actives)
    cost: +totalCost || 0,
    economy: +totalEco || 0,
  };
}

// ---- Export “brut” pour export.js (si besoin) --------------------------------
export function getState() { return state; }
export function replaceState(newState) {
  // Utilisé par import JSON — attend un objet complet avec .days / .settings
  if (!newState || typeof newState !== "object") return;
  state = migrate(ensureShape(newState));
  save();
  try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "import" } })); } catch {}
}

// ---- Export par défaut -------------------------------------------------------
export default state;
