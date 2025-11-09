/* web/js/state.js — État global + persistance + utilitaires */

export const LS_KEY = "stopaddict_state_v3";
export const LS_AGE = "stopaddict_age_ack";

/* ---------- Utils ---------- */
export function todayKey(d = new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

export function fmtMoney(n, currency){
  const c = currency || { symbol:"€", position:"after" };
  const value = Number(n||0).toLocaleString("fr-FR",{ minimumFractionDigits:2, maximumFractionDigits:2 });
  return c.position==="before" ? `${c.symbol}${value}` : `${value}${c.symbol}`;
}

/* ---------- Modèle d’état ---------- */
export function DefaultState(){
  return {
    version: 3,
    profile: { name: "" },

    i18n: { lang: "fr" },            // mémorise la langue choisie

    currency: { symbol:"€", position:"after" },

    modules: {                        // modules disponibles
      cigs: true,
      joints: false,
      beer: false,
      hard: false,
      liqueur: false,
      alcohol: false                 // "Alcool global" (exclusif avec beer/hard/liqueur)
    },

    prices: {                         // prix unitaires directs
      cigarette: 0,
      joint: 0,
      beer: 0,
      hard: 0,
      liqueur: 0
    },

    variants: {                       // variantes pour calculs si prix unitaires non saisis
      classic: { use:false, packPrice:0, cigsPerPack:20 },
      rolled:  { use:false, tobacco30gPrice:0, cigsPer30g:40 },
      cannabis:{ use:false, gramPrice:0, gramsPerJoint:0.3 },
      alcohol: {
        beer:    { enabled:false, unitPrice:0 },
        hard:    { enabled:false, dosePrice:0 },
        liqueur: { enabled:false, dosePrice:0 }
      }
    },

    goals: {                          // objectifs quotidiens
      cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0
    },

    dates: {                          // jalons (habitudes)
      stopGlobal:"", stopAlcohol:"",
      stopCigs:"", reduceCigs:"", quitCigsObj:"", noMoreCigs:"",
      stopJoints:"", reduceJoints:"", quitJointsObj:"", noMoreJoints:"",
      reduceAlcohol:"", quitAlcoholObj:"", noMoreAlcohol:""
    },

    today: {                          // état du jour
      date: todayKey(),
      counters: { cigs:0, joints:0, beer:0, hard:0, liqueur:0 },
      active:   {                    // cases “Activer” (Accueil)
        cigs:true, joints:true, beer:true, hard:true, liqueur:true
      }
    },

    history: {                        // YYYY-MM-DD -> {cigs,joints,beer,hard,liqueur,cost,saved}
    },

    events: [],                       // journal horodaté pour Stats avancées
    debug: { logs: [] }
  };
}

/* ---------- Normalisation / migration ---------- */
function normalizeState(S){
  const D = DefaultState();

  // Fusion superficielle des premières couches
  S = Object.assign({}, D, S||{});
  S.profile   = Object.assign({}, D.profile,   S.profile||{});
  S.i18n      = Object.assign({}, D.i18n,      S.i18n||{});
  S.currency  = Object.assign({}, D.currency,  S.currency||{});
  S.modules   = Object.assign({}, D.modules,   S.modules||{});
  S.prices    = Object.assign({}, D.prices,    S.prices||{});
  S.goals     = Object.assign({}, D.goals,     S.goals||{});
  S.dates     = Object.assign({}, D.dates,     S.dates||{});
  S.today     = Object.assign({}, D.today,     S.today||{});
  S.today.counters = Object.assign({}, D.today.counters, S.today.counters||{});
  S.today.active   = Object.assign({}, D.today.active,   S.today.active||{});
  S.history   = Object.assign({}, D.history,   S.history||{});
  S.debug     = Object.assign({}, D.debug,     S.debug||{});

  // Variants (niveaux imbriqués)
  S.variants = Object.assign({}, D.variants, S.variants||{});
  S.variants.classic  = Object.assign({}, D.variants.classic,  (S.variants||{}).classic||{});
  S.variants.rolled   = Object.assign({}, D.variants.rolled,   (S.variants||{}).rolled||{});
  S.variants.cannabis = Object.assign({}, D.variants.cannabis, (S.variants||{}).cannabis||{});
  const dvA = D.variants.alcohol, svA = (S.variants||{}).alcohol||{};
  S.variants.alcohol = {
    beer:    Object.assign({}, dvA.beer,    svA.beer||{}),
    hard:    Object.assign({}, dvA.hard,    svA.hard||{}),
    liqueur: Object.assign({}, dvA.liqueur, svA.liqueur||{})
  };

  // Evénements
  if (!Array.isArray(S.events)) S.events = [];

  // Cohérence “Alcool global” exclusif
  if (S.modules.alcohol){
    S.modules.beer = S.modules.hard = S.modules.liqueur = false;
    S.today.active.beer = S.today.active.hard = S.today.active.liqueur = false;
  }

  // Date du jour
  if (!S.today.date) S.today.date = todayKey();

  return S;
}

/* ---------- Persistance ---------- */
export function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DefaultState();
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  }catch{
    return DefaultState();
  }
}

export function saveState(S){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify(S));
  }catch{}
}

/* ---------- Journal des événements (pour Stats) ---------- */
/**
 * Enregistre un événement atomique (ex: clic +1/-1, (dé)activation, import).
 * @param {object} S état
 * @param {string} type "inc" | "dec" | "toggle" | "import" | "set" | "reset"
 * @param {object} payload { kind?, value?, active?, at? }
 */
export function recordEvent(S, type, payload={}){
  const at = payload.at || Date.now();
  if (!Array.isArray(S.events)) S.events = [];
  S.events.push({
    at,
    type,
    kind: payload.kind || null,
    value: typeof payload.value==="number" ? payload.value : null,
    active: typeof payload.active==="boolean" ? payload.active : null
  });
  // bornage (éviter explosion du stockage)
  if (S.events.length > 5000) S.events.splice(0, S.events.length - 5000);
}
