// web/js/state.js
export const KEY = "sa:data";

const defaults = {
  settings: {
    enable: { cigs: true, weed: false, alcohol: false },
    price: {
      pricePerPack: 10, cigsPerPack: 20,
      joint: 5, beer: 2.5, strong: 3, liquor: 4
    },
    limits: { day: { cigs: 0, weed: 0, alcohol: 0 } },
    // Nouveaux champs Pack 8
    goals: { cigs: 0, weed: 0, alcohol: 0 },   // objectifs/jour (0 = pas défini)
    baseline: { mode: "auto" }                 // "manual" ou "auto"
  },
  entries: [] // { ts: ISO, type: 'cig'|'weed'|'beer'|'strong'|'liquor', qty: 1 }
};

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return deepMerge(structuredClone(defaults), raw || {});
  } catch {
    return structuredClone(defaults);
  }
}
export function save(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export let state = load();

export function setState(patch) {
  state = deepMerge(state, patch);
  save(state);
}

// évènement utilitaire
export function emit(name) {
  document.dispatchEvent(new CustomEvent(name));
}

// --- petit merge profond (objets simples) ---
function isObj(x){ return x && typeof x === "object" && !Array.isArray(x); }
function deepMerge(a,b){
  if (!isObj(a) || !isObj(b)) return b ?? a;
  const out = {...a};
  for (const k of Object.keys(b)) {
    out[k] = (isObj(a[k]) && isObj(b[k])) ? deepMerge(a[k], b[k]) : b[k];
  }
  return out;
}
