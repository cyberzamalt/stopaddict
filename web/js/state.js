import { DAY_MS, inRange, isToday, startOfDay, startOfWeek, startOfMonth } from "./utils.js";

const KEY = "sa:data";
const defaults = {
  settings: {
    enable: { cigs: true, weed: false, alcohol: false },
    price: { pricePerPack: 10, cigsPerPack: 20, joint: 5, beer: 2.5, strong: 3, liquor: 4 },
    limits: { day: { cigs: 0, weed: 0, alcohol: 0 } }
  },
  entries: [] // { ts, type: 'cig'|'weed'|'beer'|'strong'|'liquor', qty }
};

function clone(o){ return JSON.parse(JSON.stringify(o)); }

export function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? clone(defaults); }
  catch { return clone(defaults); }
}
export function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export const state = load();

/* --- mutations --- */
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

/* --- aggregations génériques --- */
function sumRange(types, start, end) {
  return state.entries.filter(e => inRange(e.ts, start, end) && types.includes(e.type))
    .reduce((s,e)=> s + (e.qty || 1), 0);
}
export function totalsHeader() {
  const a = startOfDay(), b = new Date(+a + DAY_MS - 1);
  const wA = startOfWeek(), wB = new Date(+wA + 7*DAY_MS - 1);
  const mA = startOfMonth(), mB = new Date(mA.getFullYear(), mA.getMonth()+1, 0, 23,59,59,999);
  const all = ["cig","weed","beer","strong","liquor"];
  return { today: sumRange(all,a,b), week: sumRange(all,wA,wB), month: sumRange(all,mA,mB) };
}

/* --- coûts & économies indicatives --- */
export function costToday() {
  const p = state.settings.price;
  const a = startOfDay(), b = new Date(+a + DAY_MS - 1);
  const cig = sumRange(["cig"], a, b);
  const weed = sumRange(["weed"], a, b);
  const beer = sumRange(["beer"], a, b);
  const strong = sumRange(["strong"], a, b);
  const liquor = sumRange(["liquor"], a, b);
  const cigCost = (p.pricePerPack && p.cigsPerPack) ? (cig / p.cigsPerPack) * p.pricePerPack : 0;
  const weedCost = weed * p.joint;
  const alcoCost = beer * p.beer + strong * p.strong + liquor * p.liquor;
  return cigCost + weedCost + alcoCost;
}
export function economiesHint() {
  const L = state.settings.limits.day, p = state.settings.price;
  const a = startOfDay(), b = new Date(+a + DAY_MS - 1);
  let euros = 0;
  const cig = sumRange(["cig"], a, b);
  const weed = sumRange(["weed"], a, b);
  const alco = sumRange(["beer","strong","liquor"], a, b);
  if (L.cigs)   euros += ((Math.max(0, L.cigs - cig)   / (p.cigsPerPack||1)) * (p.pricePerPack||0));
  if (L.weed)   euros +=  Math.max(0, L.weed - weed)   * (p.joint||0);
  if (L.alcohol){
    const left = Math.max(0, L.alcohol - alco);
    const avg = (p.beer + p.strong + p.liquor) / 3;
    euros += left * (avg || 0);
  }
  return euros;
}

/* --- limite quotidienne totale (ligne rouge) --- */
export function totalDailyLimit(st = state) {
  const L = st.settings.limits?.day || {};
  return (L.cigs||0) + (L.weed||0) + (L.alcohol||0);
}

/* --- séries pour le Chart --- */
// Jour: 24 tranches horaires
export function seriesDay(st = state, refDate = new Date()) {
  const dayStart = startOfDay(refDate);
  const buckets = Array(24).fill(0);
  const types = ["cig","weed","beer","strong","liquor"];
  for (const e of st.entries) {
    const d = new Date(e.ts);
    if (+startOfDay(d) !== +dayStart) continue;
    const h = d.getHours();
    const qty = e.qty || 1;
    if (types.includes(e.type)) buckets[h] += qty;
  }
  return buckets;
}

// Semaine: 7 jours (L..D), total par jour
export function seriesWeek(st = state, refDate = new Date()) {
  const startW = startOfWeek(refDate); // lundi
  const labels = ["L","M","M","J","V","S","D"];
  const values = Array(7).fill(0);
  const types = ["cig","weed","beer","strong","liquor"];
  for (let i=0; i<7; i++) {
    const a = new Date(+startW + i*DAY_MS);
    const b = new Date(+a + DAY_MS - 1);
    values[i] = sumRange(types, a, b);
  }
  return { labels, values };
}

// Mois: N jours, total par jour
export function seriesMonth(st = state, refDate = new Date()) {
  const mA = startOfMonth(refDate);
  const last = new Date(mA.getFullYear(), mA.getMonth()+1, 0);
  const n = last.getDate();
  const labels = Array.from({length:n},(_,i)=> String(i+1));
  const values = Array(n).fill(0);
  const types = ["cig","weed","beer","strong","liquor"];
  for (let i=0; i<n; i++) {
    const a = new Date(mA.getFullYear(), mA.getMonth(), i+1, 0,0,0,0);
    const b = new Date(+a + DAY_MS - 1);
    values[i] = sumRange(types, a, b);
  }
  return { labels, values };
}
