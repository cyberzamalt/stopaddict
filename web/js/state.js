/* web/js/state.js
   État central + persistance + helpers communs (ES module)

   Exemples d'utilisation (optionnels) :
     import { DefaultState, loadState, saveState, todayKey } from './state.js';
     let S = loadState();
     S.meta.ver = 'x.y.z';
     saveState(S);
*/

/* =========================
   Constantes stockage
   ========================= */
export const LS_KEY = "sa_state_v1";
export const LS_AGE = "sa_age_ack_v1";

/* =========================
   Helpers génériques
   ========================= */
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtMoney(val, cur) {
  const n = Number(val || 0);
  const s = cur?.symbol ?? "€";
  const before = !!cur?.before;
  const fixed = n.toFixed(2);
  return before ? `${s}${fixed}` : `${fixed} ${s}`;
}

export function download(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   Schéma d'état par défaut
   (aligné avec app.js)
   ========================= */
export function DefaultState() {
  return {
    meta: { ver: "2.3.1-like", created: Date.now() },
    profile: { name: "", language: "fr" },
    currency: { symbol: "€", before: true },

    modules: {
      cigs: true,
      joints: true,
      beer: true,
      hard: true,
      liqueur: true,
      alcoholGlobal: true, // agrégat informatif
    },

    // Prix unitaires simples (fallback)
    prices: {
      cigarette: 0,
      joint: 0,
      beer: 0,
      hard: 0,
      liqueur: 0,
    },

    // Variantes détaillées (stockées ; le calcul unitaire peut s’y appuyer)
    variants: {
      classic: { use: false, packPrice: 0, cigsPerPack: 20 },
      rolled: {
        use: false,
        tobacco30gPrice: 0, cigsPer30g: 0,
        smallLeavesPrice: 0, smallLeavesCount: 0,
        filtersPrice: 0,     filtersCount: 0,
        useFilter: false,
      },
      tubed: {
        use: false,
        cigsPer30g: 0,
        tubesPrice: 0, tubesCount: 0,
        useFilter: false,
      },
      cannabis: {
        use: false,
        gramPrice: 0, gramsPerJoint: 0,
        bigLeafPrice: 0, bigLeafCount: 0,
        useFilter: false,
      },
      alcohol: {
        beer:    { enabled: true, dosePrice: undefined, unitPrice: 0, unitLabel: "33 cl" },
        hard:    { enabled: true, dosePrice: 0, doseUnit: "4 cl" },
        liqueur: { enabled: true, dosePrice: 0, doseUnit: "6 cl" },
      },
    },

    // Objectifs & limites
    goals:  { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
    limits: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },

    // Dates clés (réduction / objectif / plus censé)
    dates: {
      stopGlobal: "", stopAlcohol: "", stopCigs: "", stopJoints: "",
      reduceCigs: "", quitCigsObj: "", noMoreCigs: "",
      reduceJoints: "", quitJointsObj: "", noMoreJoints: "",
      reduceAlcohol: "", quitAlcoholObj: "", noMoreAlcohol: "",
    },

    // Données agrégées par jour
    history: {
      // "YYYY-MM-DD": { cigs, joints, beer, hard, liqueur, cost, saved }
    },

    // Miroir du jour courant
    today: {
      date: todayKey(),
      counters: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
      active:   { cigs: true, joints: true, beer: true, hard: true, liqueur: true },
    },

    // Journal debug minimal
    debug: { logs: [] },
  };
}

/* =========================
   Migration douce (merge)
   ========================= */
export function migrateState(obj) {
  // Merge récursif simple pour garantir la présence des nouvelles clés.
  const D = DefaultState();

  return {
    ...D,
    ...obj,
    profile:  { ...D.profile,  ...(obj?.profile  || {}) },
    currency: { ...D.currency, ...(obj?.currency || {}) },
    modules:  { ...D.modules,  ...(obj?.modules  || {}) },
    prices:   { ...D.prices,   ...(obj?.prices   || {}) },
    variants: {
      ...D.variants,
      ...(obj?.variants || {}),
      classic:  { ...D.variants.classic,  ...(obj?.variants?.classic  || {}) },
      rolled:   { ...D.variants.rolled,   ...(obj?.variants?.rolled   || {}) },
      tubed:    { ...D.variants.tubed,    ...(obj?.variants?.tubed    || {}) },
      cannabis: { ...D.variants.cannabis, ...(obj?.variants?.cannabis || {}) },
      alcohol:  {
        ...D.variants.alcohol,
        ...(obj?.variants?.alcohol || {}),
        beer:    { ...D.variants.alcohol.beer,    ...(obj?.variants?.alcohol?.beer    || {}) },
        hard:    { ...D.variants.alcohol.hard,    ...(obj?.variants?.alcohol?.hard    || {}) },
        liqueur: { ...D.variants.alcohol.liqueur, ...(obj?.variants?.alcohol?.liqueur || {}) },
      },
    },
    goals:  { ...D.goals,  ...(obj?.goals  || {}) },
    limits: { ...D.limits, ...(obj?.limits || {}) },
    dates:  { ...D.dates,  ...(obj?.dates  || {}) },
    today:  {
      ...D.today,
      ...(obj?.today || {}),
      counters: { ...D.today.counters, ...(obj?.today?.counters || {}) },
      active:   { ...D.today.active,   ...(obj?.today?.active   || {}) },
    },
    debug: { ...D.debug, ...(obj?.debug || {}) },
    history: { ...(obj?.history || {}) },
  };
}

/* =========================
   Chargement / sauvegarde
   ========================= */
export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DefaultState();
    const obj = JSON.parse(raw);
    return migrateState(obj);
  } catch {
    return DefaultState();
  }
}

export function saveState(S) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch {}
}

/* =========================
   Outils pratiques
   ========================= */
export function snapshot(S) {
  return JSON.parse(JSON.stringify(S));
}

export function resetState({ keepHistory = true, keepToday = true, keepCurrency = true } = {}) {
  const D = DefaultState();
  let base = D;

  if (keepHistory || keepToday || keepCurrency) {
    const cur = loadState();
    base = { ...D };
    if (keepHistory) base.history = cur.history || {};
    if (keepToday)   base.today   = cur.today   || D.today;
    if (keepCurrency)base.currency= cur.currency|| D.currency;
  }
  saveState(base);
  return base;
}

/* =========================
   Export debug global (facultatif)
   ========================= */
try {
  if (typeof window !== "undefined") {
    window.SAState = {
      LS_KEY, LS_AGE,
      todayKey, fmtMoney, download,
      DefaultState, migrateState,
      loadState, saveState, resetState, snapshot
    };
  }
} catch {}
