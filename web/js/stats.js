// web/js/stats.js
// STOPADDICT — Stats (résumés numériques par période)
// Rôle : afficher des totaux (par catégorie + coût + économies) pour Jour/Semaine/Mois/Année.
// Dépendances : ./state.js (source de vérité). Charts gérés séparément par charts.js.

import {
  getViewRange,
  getRangeTotals,
  totalsHeader,
} from "./state.js";

const $ = (sel, root = document) => root.querySelector(sel);

function sum(a = []) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (+a[i] || 0);
  return s;
}

function writeText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function formatMoney(n) {
  const v = Number.isFinite(+n) ? +n : 0;
  try {
    return v.toFixed(2);
  } catch {
    return String(v);
  }
}

// Met à jour : titre, totaux par catégorie, coût total, économies
function renderStats() {
  const range = getViewRange() || "day";
  const now = new Date();

  // 1) Titre période (si l’élément existe ; sinon on ignore)
  const title = totalsHeader(range, now);
  writeText("stats-titre", title);

  // 2) Récupère agrégations
  const agg = getRangeTotals(range, now);
  // agg.series = { cigs:[], weed:[], beer:[], strong:[], liquor:[], cost:[] }
  // agg.totalCost, agg.totalEconomy déjà fournis

  const totalCigs   = sum(agg.series.cigs);
  const totalWeed   = sum(agg.series.weed);
  const totalBeer   = sum(agg.series.beer);
  const totalStrong = sum(agg.series.strong);
  const totalLiquor = sum(agg.series.liquor);

  // 3) Écritures dans le DOM (tous facultatifs)
  writeText("stat-cigs-total",   totalCigs);
  writeText("stat-weed-total",   totalWeed);
  writeText("stat-beer-total",   totalBeer);
  writeText("stat-strong-total", totalStrong);
  writeText("stat-liquor-total", totalLiquor);

  writeText("stat-cost-total", formatMoney(agg.totalCost));
  writeText("stat-eco-total",  formatMoney(agg.totalEconomy));

  // 4) Événement pour les autres modules (ex: charts.js)
  try {
    document.dispatchEvent(new CustomEvent("sa:stats-updated", { detail: { range, agg } }));
  } catch (e) {
    console.warn("[stats] sa:stats-updated event failed:", e);
  }
}

// ------- API publique -------
export function initStats() {
  // Première peinture
  renderStats();

  // Quand la vue (Jour/Semaine/Mois/Année) change via app.js
  document.addEventListener("sa:view-range-changed", renderStats);

  // Quand on modifie des comptes (Accueil +/−)
  document.addEventListener("sa:counts-updated", renderStats);

  // Quand des réglages changent (modules ON/OFF, prix, baselines)
  document.addEventListener("sa:state-changed", renderStats);

  // Optionnel : rafraîchir quand on revient sur l’onglet Stats via la nav
  const navStats = document.getElementById("nav-stats");
  if (navStats) {
    navStats.addEventListener("click", () => {
      // Petite latence pour laisser d’autres modules mettre à jour
      setTimeout(renderStats, 0);
    });
  }
}

export default { initStats };
