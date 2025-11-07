/* State core (ES module) */

export const LS_KEY = "stopaddict_state_v2";
export const LS_AGE = "stopaddict_age_ack";

/* ---------- Utils ---------- */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function deepMerge(base, add) {
  if (Array.isArray(base)) return Array.isArray(add) ? add : base;
  if (base && typeof base === "object") {
    const out = { ...base };
    for (const k of Object.keys(add || {})) {
      out[k] = deepMerge(base[k], add[k]);
    }
    return out;
  }
  return add === undefined ? base : add;
}

/* ---------- Default state ---------- */
export function DefaultState() {
  const date = todayKey();
  return {
    version: 2,
    locale: "fr-FR",
    currency: { symbol: "€", position: "after", space: false },

    profile: { name: "" },

    modules: {
      cigs: true,
      joints: true,
      beer: true,
      hard: true,
      liqueur: true,
      alcohol: false // “global alcohol” exclusif des sous-modules
    },

    today: {
      date,
      counters: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
      active:   { cigs: true, joints: true, beer: true, hard: true, liqueur: true }
    },

    history: {
      // [YYYY-MM-DD]: { cigs, joints, beer, hard, liqueur, cost, saved }
    },

    goals: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },

    prices: { cigarette: 0, joint: 0, beer: 0, hard: 0, liqueur: 0 },

    variants: {
      classic: { use: false, packPrice: 0, cigsPerPack: 20 },
      rolled:  { use: false, tobacco30gPrice: 0, cigsPer30g: 40 },
      cannabis:{ use: false, gramPrice: 0, gramsPerJoint: 0.25 },
      alcohol: {
        beer:    { enabled: false, unitPrice: 0 },
        hard:    { enabled: false, dosePrice: 0 },
        liqueur: { enabled: false, dosePrice: 0 }
      }
    },

    dates: {
      stopGlobal: "",
      stopAlcohol: "",
      reduceCigs: "", quitCigsObj: "", noMoreCigs: "",
      reduceJoints: "", quitJointsObj: "", noMoreJoints: "",
      reduceAlcohol: "", quitAlcoholObj: "", noMoreAlcohol: ""
    },

    debug: { logs: [] }
  };
}

/* ---------- Persistence ---------- */
export function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DefaultState();

    const parsed = JSON.parse(raw);
    // migration minimale + complétion
    let S = deepMerge(DefaultState(), parsed);

    // s’assurer que la date “today” est initialisée
    if (!S.today?.date) S.today.date = todayKey();

    // garde-fou pour counters/active
    S.today.counters ||= { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 };
    S.today.active   ||= { cigs: true, joints: true, beer: true, hard: true, liqueur: true };

    return S;
  } catch {
    return DefaultState();
  }
}

export function saveState(S) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(S));
  } catch {
    /* ignore quota errors */
  }
}

/* ---------- Money format ---------- */
export function fmtMoney(n = 0, cur = { symbol: "€", position: "after", space: false }) {
  const locale = "fr-FR";
  const amount = Number(n || 0);
  const formatted = amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sp = cur.space ? " " : "";
  return cur.position === "before" ? `${cur.symbol}${sp}${formatted}` : `${formatted}${sp}${cur.symbol}`;
}
