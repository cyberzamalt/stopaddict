/* web/js/state.js — État global, persistance & utilitaires */
export const LS_KEY = "stopaddict_state_v3";
export const LS_AGE = "stopaddict_age_ack";

/* Date → 'YYYY-MM-DD' */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* Format monétaire avec position avant/après */
export function fmtMoney(n = 0, currency = { symbol: "€", before: false }) {
  const val = Number(n || 0).toFixed(2).replace(".", ",");
  return currency.before ? `${currency.symbol}${val}` : `${val}${currency.symbol}`;
}

/* État par défaut (compat monolithe) */
export function DefaultState() {
  return {
    version: 3,
    language: "fr",
    profile: { name: "" },

    currency: { symbol: "€", before: false },

    modules: {
      cigs: true,
      joints: true,
      beer: true,
      hard: true,
      liqueur: true,
      alcohol: false, // mode "global alcool" exclusif
    },

    prices: {
      cigarette: 0,
      joint: 0,
      beer: 0,
      hard: 0,
      liqueur: 0,
    },

    // Variantes (utilisées dans app.js pour calculs fallback)
    variants: {
      classic: { use: false, packPrice: 0, cigsPerPack: 20 },
      rolled: { use: false, tobacco30gPrice: 0, cigsPer30g: 40 },
      cannabis: { use: false, gramPrice: 0, gramsPerJoint: 0.25 },
      alcohol: {
        beer: { enabled: false, unitPrice: 0 },
        hard: { enabled: false, dosePrice: 0 },
        liqueur: { enabled: false, dosePrice: 0 },
      },
    },

    today: {
      date: todayKey(),
      counters: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
      active:  { cigs: true, joints: true, beer: true, hard: true, liqueur: true, alcohol: false },
    },

    history: {}, // 'YYYY-MM-DD' -> {cigs,joints,beer,hard,liqueur,cost,saved}

    goals: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },

    dates: {
      stopGlobal: "",
      stopAlcohol: "",
      reduceCigs: "",
      quitCigsObj: "",
      noMoreCigs: "",
      reduceJoints: "",
      quitJointsObj: "",
      noMoreJoints: "",
      reduceAlcohol: "",
      quitAlcoholObj: "",
      noMoreAlcohol: "",
    },

    debug: { logs: [] },

    // Journal d'événements pour Stats (Jour=4 tranches)
    // item: { t: epoch_ms, kind: 'cigs'|'joints'|'beer'|'hard'|'liqueur'|'alcohol', delta: +1|-1, date: 'YYYY-MM-DD' }
    events: [],
  };
}

/* Deep-merge simple (obj only) */
function mergeDeep(base, patch) {
  if (typeof base !== "object" || base === null) return patch;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(patch || {})) {
    const v = patch[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = mergeDeep(base[k] ?? {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/* Normalisation & cohérences modules ↔ today.active (incl. exclusivité alcool) */
function normalizeState(S) {
  const D = DefaultState();

  // Champs manquants → compléter
  S.language = S.language ?? D.language;
  S.profile  = mergeDeep(D.profile, S.profile || {});
  S.currency = mergeDeep(D.currency, S.currency || {});
  S.modules  = mergeDeep(D.modules, S.modules || {});
  S.prices   = mergeDeep(D.prices, S.prices || {});
  S.variants = mergeDeep(D.variants, S.variants || {});
  S.today    = mergeDeep(D.today, S.today || {});
  S.today.date = S.today.date || todayKey();
  S.today.counters = mergeDeep(D.today.counters, S.today.counters || {});
  S.today.active   = mergeDeep(D.today.active,   S.today.active   || {});
  S.history  = typeof S.history === "object" && S.history ? S.history : {};
  S.goals    = mergeDeep(D.goals, S.goals || {});
  S.dates    = mergeDeep(D.dates, S.dates || {});
  S.debug    = mergeDeep(D.debug, S.debug || {});
  S.events   = Array.isArray(S.events) ? S.events : [];

  // Cohérence: today.active suit modules quand absent
  for (const k of Object.keys(D.modules)) {
    if (typeof S.today.active[k] !== "boolean") {
      S.today.active[k] = !!S.modules[k];
    }
  }

  // Exclusivité "alcohol" (global) ↔ (beer/hard/liqueur)
  if (S.modules.alcohol) {
    S.modules.beer = false;
    S.modules.hard = false;
    S.modules.liqueur = false;

    S.today.active.alcohol = true;
    S.today.active.beer = false;
    S.today.active.hard = false;
    S.today.active.liqueur = false;
  } else {
    // si pas global, activer actifs selon modules individuels
    for (const k of ["beer", "hard", "liqueur"]) {
      S.today.active[k] = !!S.modules[k];
    }
    S.today.active.alcohol = false;
  }

  // Taille raisonnable des logs & events
  if (Array.isArray(S.debug.logs) && S.debug.logs.length > 1000) {
    S.debug.logs = S.debug.logs.slice(-1000);
  }
  if (S.events.length > 5000) {
    S.events = S.events.slice(-5000);
  }

  return S;
}

/* Chargement localStorage + upgrade */
export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return normalizeState(DefaultState());
    const parsed = JSON.parse(raw);
    return normalizeState(mergeDeep(DefaultState(), parsed));
  } catch {
    return normalizeState(DefaultState());
  }
}

/* Sauvegarde */
export function saveState(S) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch {}
}

/* (Optionnel) utilitaire pour journaliser un événement */
export function pushEvent(S, kind, delta) {
  try {
    const t = Date.now();
    const date = todayKey(new Date(t));
    S.events.push({ t, kind, delta: Number(delta) || 0, date });
    if (S.events.length > 5000) S.events.shift();
  } catch {}
}
