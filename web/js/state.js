// web/js/state.js — State minimal compatible app.js (ES module)

export const LS_KEY = "stopaddict:state:v1";
export const LS_AGE = "stopaddict:age_ack";

/* ---------- Utils ---------- */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fmtMoney(v, cur = { symbol: "€", before: false }) {
  const n = Number(v || 0);
  return cur.before ? `${cur.symbol}${n.toFixed(2)}` : `${n.toFixed(2)}${cur.symbol}`;
}

/* ---------- Defaults ---------- */
export function DefaultState() {
  return {
    version: 1,
    profile: { name: "", language: "fr" },

    currency: { symbol: "€", before: false },

    modules: { // activables côté Réglages
      cigs: true, joints: true, beer: true, hard: true, liqueur: true,
      alcohol: false // “Alcool global” (exclusif avec beer/hard/liqueur)
    },

    today: {
      date: todayKey(),
      counters: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
      active:   { cigs: true, joints: true, beer: true, hard: true, liqueur: true }
    },

    goals:  { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },

    prices: { cigarette: 0, joint: 0, beer: 0, hard: 0, liqueur: 0 },

    // variantes pour calculs unitaires (optionnel)
    variants: {
      classic: { use: false, packPrice: 0, cigsPerPack: 20 },
      rolled:  { use: false, tobacco30gPrice: 0, cigsPer30g: 40 },
      cannabis:{ use: false, gramPrice: 0, gramsPerJoint: 0.25 },
      alcohol: {
        beer:    { enabled: false, unitPrice: 0 },
        hard:    { enabled: false, dosePrice: 0 },
        liqueur: { enabled: false, dosePrice: 0 },
      }
    },

    dates: {
      stopGlobal: "", stopAlcohol: "",
      reduceCigs: "", quitCigsObj: "", noMoreCigs: "",
      reduceJoints: "", quitJointsObj: "", noMoreJoints: "",
      reduceAlcohol: "", quitAlcoholObj: "", noMoreAlcohol: ""
    },

    history: {},     // { 'YYYY-MM-DD': {cigs,joints,beer,hard,liqueur,cost,saved} }
    events: [],      // [{ ts, kind, action, delta, day: 'YYYY-MM-DD' }] pour Stats (Jour 4 tranches)
    debug:  { logs: [] }
  };
}

/* ---------- Load / Save ---------- */
function deepMerge(base, add) {
  if (!add || typeof add !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(add)) {
    if (add[k] && typeof add[k] === "object" && !Array.isArray(add[k]) && base[k]) {
      out[k] = deepMerge(base[k], add[k]);
    } else {
      out[k] = add[k];
    }
  }
  return out;
}

function ensureCoherence(S) {
  // today.date
  if (!S.today?.date) S.today.date = todayKey();
  // today.active vs modules
  for (const k of ["cigs","joints","beer","hard","liqueur"]) {
    if (!(k in S.today.active)) S.today.active[k] = true;
    if (S.modules && S.modules[k] === false) S.today.active[k] = false;
  }
  // exclusivité “alcohol” vs (beer/hard/liqueur)
  if (S.modules?.alcohol) {
    S.modules.beer = false; S.today.active.beer = false;
    S.modules.hard = false; S.today.active.hard = false;
    S.modules.liqueur = false; S.today.active.liqueur = false;
  }
  return S;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const base = DefaultState();
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return ensureCoherence(deepMerge(base, parsed));
  } catch {
    return DefaultState();
  }
}

export function saveState(S) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(S));
  } catch { /* ignore quota/SS mode */ }
  return S;
}
