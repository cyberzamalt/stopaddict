// web/js/economy.js
import { state } from "./state.js";
import { startOfDay } from "./utils.js";

const DAY_MS = 86400000;
const TYPES_ALCO = ["beer","strong","liquor"];

function unitCost(type, p) {
  if (type === "cig")   return (p.pricePerPack && p.cigsPerPack) ? (p.pricePerPack / p.cigsPerPack) : 0;
  if (type === "weed")  return p.joint || 0;
  if (type === "beer")  return p.beer  || 0;
  if (type === "strong")return p.strong|| 0;
  if (type === "liquor")return p.liquor|| 0;
  return 0;
}

function countInRange(types, a, b) {
  let s = 0;
  for (const e of state.entries) {
    if (!types.includes(e.type)) continue;
    const t = new Date(e.ts);
    if (t >= a && t <= b) s += (e.qty || 1);
  }
  return s;
}

function avgLastNDays(type, n=30) {
  const today0 = startOfDay(new Date());
  let total = 0;
  for (let i=0;i<n;i++){
    const a = new Date(+today0 - i*DAY_MS);
    const b = new Date(+a + DAY_MS - 1);
    total += countInRange([type], a, b);
  }
  return total / n;
}

function manualGoal(type) {
  const g = state.settings.goals || {};
  if (type === "cig")   return +g.cigs || 0;
  if (type === "weed")  return +g.weed || 0;
  if (type === "alco")  return +g.alcohol || 0;
  return 0;
}

function baselinePerDay(type) {
  const en = state.settings.enable || {};
  // Catégorie désactivée => baseline = 0
  if ((type==="cig" && !en.cigs) || (type==="weed" && !en.weed) || (type==="alco" && !en.alcohol)) return 0;

  const mode = (state.settings.baseline && state.settings.baseline.mode) || "auto";
  if (mode === "manual") {
    // groupé alcool = objectif global
    return manualGoal(type === "beer" || type==="strong" || type==="liquor" ? "alco" : type);
  }
  // auto = moyenne des 30 derniers jours
  if (type === "alco") {
    // additionne les 3 sous-types
    return avgLastNDays("beer") + avgLastNDays("strong") + avgLastNDays("liquor");
  }
  return avgLastNDays(type);
}

function todayRealCount() {
  const a = startOfDay(new Date());
  const b = new Date(+a + DAY_MS - 1);
  const en = state.settings.enable || {};
  let types = [];
  if (en.cigs)    types.push("cig");
  if (en.weed)    types.push("weed");
  if (en.alcohol) types.push(...TYPES_ALCO);
  if (!types.length) types = ["cig","weed",...TYPES_ALCO];
  return countInRange(types, a, b);
}

function todayBaselineSum() {
  const en = state.settings.enable || {};
  let sum = 0;
  if (en.cigs)    sum += baselinePerDay("cig");
  if (en.weed)    sum += baselinePerDay("weed");
  if (en.alcohol) sum += baselinePerDay("alco");
  return sum;
}

function costOfCountSplit(counts) {
  const p = state.settings.price;
  let euros = 0;
  for (const [type, qty] of Object.entries(counts)) {
    euros += unitCost(type, p) * qty;
  }
  return euros;
}

function splitTodayCounts() {
  const a = startOfDay(new Date());
  const b = new Date(+a + DAY_MS - 1);
  const types = ["cig","weed",...TYPES_ALCO];
  const map = { cig:0, weed:0, beer:0, strong:0, liquor:0 };
  for (const e of state.entries) {
    if (!types.includes(e.type)) continue;
    const t = new Date(e.ts);
    if (t >= a && t <= b) map[e.type] += (e.qty||1);
  }
  return map;
}

function splitBaselineToday() {
  // Répartition simple : cigarettes et weed = baseline directe
  // alcool = baseline globale distribuée à parts égales (approx simple)
  const en = state.settings.enable || {};
  const base = { cig:0, weed:0, beer:0, strong:0, liquor:0 };
  if (en.cigs)  base.cig   = baselinePerDay("cig");
  if (en.weed)  base.weed  = baselinePerDay("weed");
  if (en.alcohol) {
    const b = baselinePerDay("alco");
    base.beer = base.strong = base.liquor = b/3;
  }
  return base;
}

export function initEconomy() {
  const elAmount = document.getElementById("economies-amount");
  const elCostToday = document.getElementById("todayCost");

  function render() {
    // Réel du jour (coûts)
    const counts = splitTodayCounts();
    const cost = costOfCountSplit(counts);

    // Baseline du jour (objectif) — jamais d’économie négative
    const b = splitBaselineToday();
    const diff = {
      cig:   Math.max(0, (b.cig   || 0) - (counts.cig   || 0)),
      weed:  Math.max(0, (b.weed  || 0) - (counts.weed  || 0)),
      beer:  Math.max(0, (b.beer  || 0) - (counts.beer  || 0)),
      strong:Math.max(0, (b.strong|| 0) - (counts.strong|| 0)),
      liquor:Math.max(0, (b.liquor|| 0) - (counts.liquor|| 0)),
    };
    const euros = costOfCountSplit(diff);

    if (elCostToday)   elCostToday.textContent = cost.toFixed(2) + " €";
    if (elAmount)      elAmount.textContent = euros.toFixed(2) + " €";
  }

  render();
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:settingsSaved", render);
  document.addEventListener("sa:imported", render);
}
