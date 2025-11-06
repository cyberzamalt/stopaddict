 /* web/js/state.js — état centralisé compatible avec app.js (v2)
   Exports: LS_KEY, LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney
*/

export const LS_KEY = "sa_state_v2";
export const LS_AGE = "sa_age_ack";

/* ---------- utils ---------- */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function fmtMoney(n = 0, currency = {symbol:"€", before:false}) {
  const value = Number(n || 0);
  const s = value.toFixed(2).replace(".", ",");
  const sym = currency?.symbol ?? "€";
  const before = !!currency?.before;
  return before ? `${sym}${s}` : `${s}${sym}`;
}

/* ---------- default state ---------- */
export function DefaultState() {
  const t = todayKey();
  return {
    profile: { name: "", language: "fr" },
    currency: { symbol: "€", before: false },

    modules: { cigs: true, joints: true, beer: true, hard: true, liqueur: true, alcoholGlobal: false },

    prices: { cigarette: 0, joint: 0, beer: 0, hard: 0, liqueur: 0 },

    variants: {
      classic: { use: false, packPrice: 0, cigsPerPack: 20 },
      rolled:  { use: false, tobacco30gPrice: 0, cigsPer30g: 55, papersPrice: 0, papersPerBook: 100, filtersPrice: 0, filtersPerBag: 150, useFilter: true },
      cannabis:{ use: false, gramPrice: 0, gramsPerJoint: 0.8, bigPapersPrice: 0, bigPapersPerBook: 32, useFilter: false },
      alcohol: {
        beer:    { enabled: false, unitPrice: 0, unitLabel: "33 cl" },
        hard:    { enabled: false, dosePrice: 0, unitLabel: "4 cl" },
        liqueur: { enabled: false, dosePrice: 0, unitLabel: "6 cl" }
      }
    },

    today: {
      date: t,
      counters: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
      active:   { cigs: true, joints: true, beer: true, hard: true, liqueur: true }
    },

    history: {},

    goals: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },

    dates: {
      stopGlobal:"", stopAlcohol:"",
      stopCigs:"", stopJoints:"",
      reduceCigs:"", quitCigsObj:"", noMoreCigs:"",
      reduceJoints:"", quitJointsObj:"", noMoreJoints:"",
      reduceAlcohol:"", quitAlcoholObj:"", noMoreAlcohol:""
    },

    debug: { logs: [] }
  };
}

/* ---------- persistence ---------- */
export function loadState() {
  let base = DefaultState();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      base = { ...base, ...obj };

      // assure toutes les branches
      base.profile     = { ...DefaultState().profile,     ...(obj.profile||{}) };
      base.currency    = { ...DefaultState().currency,    ...(obj.currency||{}) };
      base.modules     = { ...DefaultState().modules,     ...(obj.modules||{}) };
      base.prices      = { ...DefaultState().prices,      ...(obj.prices||{}) };

      base.variants    = { ...DefaultState().variants,    ...(obj.variants||{}) };
      base.variants.classic  = { ...DefaultState().variants.classic,  ...((obj.variants||{}).classic||{}) };
      base.variants.rolled   = { ...DefaultState().variants.rolled,   ...((obj.variants||{}).rolled||{}) };
      base.variants.cannabis = { ...DefaultState().variants.cannabis, ...((obj.variants||{}).cannabis||{}) };
      base.variants.alcohol  = { ...DefaultState().variants.alcohol,  ...((obj.variants||{}).alcohol||{}) };
      base.variants.alcohol.beer    = { ...DefaultState().variants.alcohol.beer,    ...(((obj.variants||{}).alcohol||{}).beer||{}) };
      base.variants.alcohol.hard    = { ...DefaultState().variants.alcohol.hard,    ...(((obj.variants||{}).alcohol||{}).hard||{}) };
      base.variants.alcohol.liqueur = { ...DefaultState().variants.alcohol.liqueur, ...(((obj.variants||{}).alcohol||{}).liqueur||{}) };

      base.today       = { ...DefaultState().today,       ...(obj.today||{}) };
      base.today.counters = { ...DefaultState().today.counters, ...((obj.today||{}).counters||{}) };
      base.today.active   = { ...DefaultState().today.active,   ...((obj.today||{}).active||{}) };

      base.goals       = { ...DefaultState().goals,       ...(obj.goals||{}) };
      base.dates       = { ...DefaultState().dates,       ...(obj.dates||{}) };
      base.debug       = { ...DefaultState().debug,       ...(obj.debug||{}) };
      base.history     = obj.history || {};
    }
  } catch (e) {
    console.error("[state] load error", e);
  }
  if (!base.today?.date) base.today = { ...(base.today||{}), date: todayKey() };
  return base;
}

export function saveState(state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error("[state] save error", e);
    return false;
  }
}
