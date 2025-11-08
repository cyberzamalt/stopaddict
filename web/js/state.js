/* web/js/state.js — État & stockage StopAddict (ES module) */

export const LS_KEY = "stopaddict_state_v3";
export const LS_AGE = "stopaddict_age_ack";

/* ---------- utils dates & monnaie ---------- */
function pad2(n){ return String(n).padStart(2,"0"); }
export function todayKey(d = new Date()){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

export function fmtMoney(amount, currency){
  const n = Number(amount || 0);
  const cur = currency || { symbol:"€", position:"after", code:"EUR" };
  try {
    if (cur.code) return new Intl.NumberFormat("fr-FR", { style:"currency", currency: cur.code }).format(n);
  } catch {}
  const val = n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return cur.position === "before" ? `${cur.symbol}${val}` : `${val}${cur.symbol}`;
}

/* ---------- état par défaut ---------- */
export function DefaultState(){
  return {
    version: 3,
    profile: { name:"", language:"fr" },
    currency: { symbol:"€", position:"after", code:"EUR" },

    // Modules activables (alcool = agrégat global optionnel)
    modules: { cigs:true, joints:true, beer:true, hard:true, liqueur:true, alcohol:true },

    // Prix directs (prioritaires si > 0)
    prices: { cigarette:0, joint:0, beer:0, hard:0, liqueur:0 },

    // Variantes pour calcul automatique des prix
    variants: {
      classic: { use:false, packPrice:0, cigsPerPack:20 },
      rolled:  { use:false, tobacco30gPrice:0, cigsPer30g:40 },
      cannabis:{ use:false, gramPrice:0, gramsPerJoint:0.3 },
      alcohol: {
        beer:    { enabled:false, unitPrice:0 },   // prix d’une bière/unité
        hard:    { enabled:false, dosePrice:0 },   // prix d’une dose (2cl)
        liqueur: { enabled:false, dosePrice:0 }    // prix d’une dose (2cl)
      }
    },

    today: {
      date: todayKey(),
      counters: { cigs:0, joints:0, beer:0, hard:0, liqueur:0 },
      active:   { cigs:true, joints:true, beer:true, hard:true, liqueur:true }
    },

    goals: { cigs:0, joints:0, beer:0, hard:0, liqueur:0 },

    dates: {
      stopGlobal:"", stopAlcohol:"",
      stopCigs:"", stopJoints:"",
      reduceCigs:"", quitCigsObj:"", noMoreCigs:"",
      reduceJoints:"", quitJointsObj:"", noMoreJoints:"",
      reduceAlcohol:"", quitAlcoholObj:"", noMoreAlcohol:""
    },

    history: {},          // "YYYY-MM-DD": { cigs,joints,beer,hard,liqueur,cost,saved }
    debug: { logs: [] }   // console interne
  };
}

/* ---------- merge & migrations ---------- */
function deepMerge(base, add){
  if (Array.isArray(base)) return Array.isArray(add) ? add.slice() : base.slice();
  if (base && typeof base === "object"){
    const out = { ...base };
    for (const k of Object.keys(add || {})){
      out[k] = deepMerge(base[k], add[k]);
    }
    return out;
  }
  return (add === undefined ? base : add);
}

function normalize(S){
  const D = DefaultState();
  S = deepMerge(D, S || {});
  // Garde une date du jour valide
  if (!S.today || typeof S.today !== "object") S.today = D.today;
  if (!S.today.date) S.today.date = todayKey();
  if (!S.today.counters) S.today.counters = { ...D.today.counters };
  if (!S.today.active)   S.today.active   = { ...D.today.active };
  // Assure les clés indispensables
  S.history = S.history && typeof S.history === "object" ? S.history : {};
  S.goals   = { ...D.goals, ...(S.goals||{}) };
  S.modules = { ...D.modules, ...(S.modules||{}) };
  S.prices  = { ...D.prices,  ...(S.prices||{}) };
  S.variants= deepMerge(D.variants, S.variants||{});
  S.profile = { ...D.profile, ...(S.profile||{}) };
  S.currency= { ...D.currency, ...(S.currency||{}) };
  S.dates   = { ...D.dates,   ...(S.dates||{}) };
  S.debug   = { ...D.debug,   ...(S.debug||{}) };
  S.version = 3;
  return S;
}

/* ---------- stockage ---------- */
export function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DefaultState();
    const parsed = JSON.parse(raw);
    return normalize(parsed);
  }catch{
    return DefaultState();
  }
}

export function saveState(S){
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(normalize(S)));
  } catch {}
  return S;
}
