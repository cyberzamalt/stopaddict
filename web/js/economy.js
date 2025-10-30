// web/js/economy.js
// STOPADDICT — Économie & Coûts (cartes récap)
// Rôle : calculer et afficher coûts & économies pour Aujourd’hui / Semaine / Mois / Année,
// en respectant strictement les modules actifs (OFF = exclu partout).
// Dépendances : ./state.js

import {
  getDaily,
  calculateDayCost,
  getEconomy,
  getRangeTotals,
} from "./state.js";

const $ = (sel, root = document) => root.querySelector(sel);

/* --------------------------- Helpers sortie UI --------------------------- */

function formatMoney(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  try { return v.toFixed(2); } catch { return String(v); }
}

// Essaie plusieurs sélecteurs possibles pour la même donnée (souple selon les maquettes)
function writeFirst(selectors, text) {
  for (const sel of selectors) {
    const el = $(sel);
    if (el) { el.textContent = String(text); return true; }
  }
  return false;
}

/* --------------------------- Calculs & rendu ----------------------------- */

function renderToday() {
  const todayRec = getDaily(new Date());
  const cost = calculateDayCost(todayRec);
  const eco  = getEconomy(todayRec);

  writeFirst(["#eco-today", "#eco-day"],  formatMoney(eco));
  writeFirst(["#cost-today", "#cost-day"], formatMoney(cost));
}

function renderWeekMonthYear() {
  // Semaine
  const aggW = getRangeTotals("week", new Date());
  writeFirst(["#eco-week"],  formatMoney(aggW.totalEconomy));
  writeFirst(["#cost-week"], formatMoney(aggW.totalCost));

  // Mois
  const aggM = getRangeTotals("month", new Date());
  writeFirst(["#eco-month"],  formatMoney(aggM.totalEconomy));
  writeFirst(["#cost-month"], formatMoney(aggM.totalCost));

  // Année
  const aggY = getRangeTotals("year", new Date());
  writeFirst(["#eco-year"],  formatMoney(aggY.totalEconomy));
  writeFirst(["#cost-year"], formatMoney(aggY.totalCost));
}

function renderAll() {
  renderToday();
  renderWeekMonthYear();
}

/* --------------------------- API publique -------------------------------- */

export function initEconomy() {
  // 1ère peinture (si les éléments n’existent pas, on ne casse rien)
  renderAll();

  // Quand on modifie des counts (+/−) → réactualiser
  document.addEventListener("sa:counts-updated", renderAll);

  // Quand les réglages changent (modules/prix/baselines) → réactualiser
  document.addEventListener("sa:state-changed", renderAll);

  // Optionnel : quand les Stats/Charts se mettent à jour (utile si d’autres modules recalculent d’abord)
  document.addEventListener("sa:stats-updated", renderAll);

  // Si on revient sur l’onglet Habitudes/Stats via la nav, on rafraîchit après paint
  const navStats = document.getElementById("nav-stats");
  if (navStats) navStats.addEventListener("click", () => setTimeout(renderAll, 0));
  const navHab = document.getElementById("nav-habitudes");
  if (navHab) navHab.addEventListener("click", () => setTimeout(renderAll, 0));
}

export default { initEconomy };
