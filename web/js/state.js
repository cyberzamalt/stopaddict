import { DAY_MS, inRange, isToday, startOfDay, startOfWeek, startOfMonth } from "./utils.js";

const KEY = "sa:data";

const defaults = {
  settings: {
    enable: { cigs: true, weed: false, alcohol: false },
    price: {
      pricePerPack: 10, cigsPerPack: 20,
      joint: 5, beer: 2.5, strong: 3, liquor: 4
    },
    limits: { day: { cigs: 0, weed: 0, alcohol: 0 } }
  },
  entries: [] // {ts, type:'cig'|'weed'|'beer'|'strong'|'liquor', qty}
};

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? structuredClone(defaults); }
  catch { return structuredClone(defaults); }
}
export function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export const state = load();

// --- selectors & aggregations
export function addEntry(type, qty=1) {
  state.entries.push({ ts: new Date().toISOString(), type, qty });
  save(state);
}
export function removeOneToday(type) {
  for (let i = state.entries.length - 1; i >= 0; i--) {
    const e = state.entries[i];
    if (e.type === type && isToday(e.ts)) { state.entries.splice(i,1); break; }
  }
  save(state);
}

export function sumToday(types) {
  return state.entries.filter(e => isToday(e.ts) && types.includes(e.type))
    .reduce((s,e)=> s + (e.qty || 1), 0);
}
export function sumRange(types, start, end) {
  return state.entries.filter(e => inRange(e.ts, start, end) && types.includes(e.type))
    .reduce((s,e)=> s + (e.qty || 1), 0);
}

export function totalsHeader() {
  const a = startOfDay(), b = new Date(+a + DAY_MS - 1);
  const wA = startOfWeek(), wB = new Date(+wA + 7*DAY_MS - 1);
  const mA = startOfMonth(), mB = new Date(mA.getFullYear(), mA.getMonth()+1, 0, 23,59,59,999);
  const typesAll = ["cig","weed","beer","strong","liquor"];

  return {
    today:  sumRange(typesAll, a, b),
    week:   sumRange(typesAll, wA, wB),
    month:  sumRange(typesAll, mA, mB)
  };
}

export function costToday() {
  const p = state.settings.price;
  const cigs = sumToday(["cig"]);
  const weed = sumToday(["weed"]);
  const beer = sumToday(["beer"]);
  const strong = sumToday(["strong"]);
  const liquor = sumToday(["liquor"]);

  const cigCost = p.pricePerPack && p.cigsPerPack ? (cigs / p.cigsPerPack) * p.pricePerPack : 0;
  const weedCost = weed * p.joint;
  const alcoCost = beer * p.beer + strong * p.strong + liquor * p.liquor;
  return cigCost + weedCost + alcoCost;
}

export function economiesHint() {
  const L = state.settings.limits.day;
  const p = state.settings.price;
  let euros = 0;

  if (L.cigs) {
    const left = Math.max(0, L.cigs - sumToday(["cig"]));
    euros += p.pricePerPack && p.cigsPerPack ? (left / p.cigsPerPack) * p.pricePerPack : 0;
  }
  if (L.weed) {
    const left = Math.max(0, L.weed - sumToday(["weed"]));
    euros += left * p.joint;
  }
  if (L.alcohol) {
    const left = Math.max(0, L.alcohol - sumToday(["beer","strong","liquor"]));
    const avg = (p.beer + p.strong + p.liquor) / 3;
    euros += left * (avg || 0);
  }
  return euros;
}
