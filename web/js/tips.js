// web/js/tips.js
// STOPADDICT — Conseils adaptatifs (Accueil)
// Affiche 1 à 3 messages courts dans #tips-box selon : modules actifs, prix saisis,
// objectifs/baselines et consommation du jour. Tolérant si éléments manquent.
// Dépendances : ./state.js (aucune autre).

import {
  getSettings,
  getDaily,
  getRangeTotals,
  calculateDayCost,
} from "./state.js";

const $ = (sel, root = document) => root.querySelector(sel);

// -------- Helpers --------
function moneySym() {
  // Compatible avec un futur currency.js (expose window.SA_CURRENCY.symbol)
  try { return (window.SA_CURRENCY && window.SA_CURRENCY.symbol) || "€"; } catch { return "€"; }
}
function fmt(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  try { return v.toFixed(2); } catch { return String(v); }
}
function sum(arr = []) {
  let s = 0; for (let i = 0; i < arr.length; i++) s += (+arr[i] || 0); return s;
}

const LABEL = {
  cigs: "cigarettes",
  weed: "joints",
  beer: "bières",
  strong: "alcools forts",
  liquor: "liqueurs",
};

function enabledKinds(s) {
  const out = [];
  if (s.enable_cigs) out.push("cigs");
  if (s.enable_weed) out.push("weed");
  if (s.enable_alcohol && s.enable_beer)   out.push("beer");
  if (s.enable_alcohol && s.enable_strong) out.push("strong");
  if (s.enable_alcohol && s.enable_liquor) out.push("liquor");
  return out;
}

function todayCounts(rec) {
  return {
    cigs:   +rec.cigs   || 0,
    weed:   +rec.weed   || 0,
    beer:   +rec.beer   || 0,
    strong: +rec.strong || 0,
    liquor: +rec.liquor || 0,
  };
}

function pricesFor(s) {
  const p = s.prices || {};
  return {
    cigs:   +p.cig    || 0,
    weed:   +p.weed   || 0,
    beer:   +p.beer   || 0,
    strong: +p.strong || 0,
    liquor: +p.liquor || 0,
  };
}

function baselinesFor(s) {
  const b = s.baselines || {};
  return {
    cigs:   Math.max(0, +b.cig    || 0),
    weed:   Math.max(0, +b.weed   || 0),
    beer:   Math.max(0, +b.beer   || 0),
    strong: Math.max(0, +b.strong || 0),
    liquor: Math.max(0, +b.liquor || 0),
  };
}

// -------- Règles de conseils --------
function buildTips() {
  const s = getSettings();
  const kinds = enabledKinds(s);
  const tips = [];

  // 0) Rien n'est actif → inciter à activer un module
  if (kinds.length === 0) {
    tips.push("Active une ou plusieurs catégories dans Réglages pour commencer le suivi.");
    return tips;
  }

  const rec = getDaily(new Date());
  const cnt = todayCounts(rec);
  const base = baselinesFor(s);
  const prices = pricesFor(s);
  const sym = moneySym();

  // 1) Prix manquants pour catégories actives → inciter à les renseigner
  const missing = kinds.filter(k => prices[k] === 0);
  if (missing.length) {
    const list = missing.map(k => LABEL[k]).join(", ");
    tips.push(`Renseigne le prix de ${list} dans Réglages pour voir des coûts/économies réalistes.`);
  }

  // 2) Zéro conso aujourd’hui (sur toutes les catégories actives)
  const todayTotal = kinds.reduce((a,k) => a + (cnt[k] || 0), 0);
  if (todayTotal === 0) {
    tips.push("🎯 Zéro aujourd’hui — parfait ! Garde ce rythme.");
  }

  // 3) Par rapport aux objectifs du jour (baselines)
  //    - si sous l’objectif sur ≥1 catégorie → bravo ciblé
  //    - si au-dessus sur ≥1 catégorie → micro-objectif (-1)
  const below = kinds.filter(k => base[k] > 0 && cnt[k] < base[k]);
  const above = kinds.filter(k => base[k] > 0 && cnt[k] > base[k]);

  if (below.length) {
    const list = below.map(k => `${LABEL[k]} (${cnt[k]}/${base[k]})`).join(", ");
    tips.push(`Bien joué : en dessous de l’objectif pour ${list}.`);
  }

  if (above.length) {
    const k = above[0];
    tips.push(`Micro-objectif 💡: ${LABEL[k]} — vise ${Math.max(0, cnt[k] - 1)} (−1) au prochain passage.`);
  }

  // 4) Coût du jour “visible”
  const costToday = calculateDayCost(rec, s);
  if (costToday > 0) {
    tips.push(`Coût du jour : ${fmt(costToday)} ${sym}. Un pas de moins réduit la note dès aujourd’hui.`);
  }

  // 5) Momentum semaine (si disponible)
  try {
    const aggW = getRangeTotals("week", new Date());
    const sumCons = sum(aggW.series?.cigs) + sum(aggW.series?.weed) + sum(aggW.series?.beer) + sum(aggW.series?.strong) + sum(aggW.series?.liquor);
    if (sumCons > 0 && todayTotal === 0) tips.push("Semaine en bonne voie : garde un jour off de plus si possible.");
  } catch { /* optionnel */ }

  // Limiter à 3 messages, privilégier : prix manquants, objectifs, coût
  const priority = [];
  // prix
  const priceTip = tips.find(t => t.includes("Renseigne le prix"));
  if (priceTip) priority.push(priceTip);
  // objectifs
  const objBelow = tips.find(t => t.startsWith("Bien joué"));
  const objAbove = tips.find(t => t.startsWith("Micro-objectif"));
  if (objBelow) priority.push(objBelow);
  if (objAbove) priority.push(objAbove);
  // coût
  const costTip = tips.find(t => t.startsWith("Coût du jour"));
  if (costTip) priority.push(costTip);
  // autres
  if (priority.length < 3) {
    tips.forEach(t => { if (!priority.includes(t) && priority.length < 3) priority.push(t); });
  }
  return priority.slice(0, 3);
}

// -------- Rendu --------
function renderTips() {
  const box = $("#tips-box");
  if (!box) return;

  const lines = buildTips();
  if (!lines.length) {
    box.textContent = "Conseils à venir…";
    return;
  }

  const ul = document.createElement("ul");
  ul.style.margin = "0";
  ul.style.padding = "0 0 0 1.1rem";
  lines.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
  box.innerHTML = "";
  box.appendChild(ul);
}

// -------- API --------
export function initTips() {
  renderTips();

  document.addEventListener("sa:counts-updated", renderTips);
  document.addEventListener("sa:state-changed",  renderTips);

  // rafraîchir quand on revient sur Accueil
  const nav = document.getElementById("nav-accueil");
  if (nav) nav.addEventListener("click", () => setTimeout(renderTips, 0));
}

export default { initTips };
