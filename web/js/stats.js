// ============================================================
// stats.js — Bannière KPIs + Cartes agrégées (PHASE 2 - v2.4.4)
// ============================================================
// Objectif :
// 1. Bloc vert : afficher TOUJOURS 3 lignes (Cigarettes/Joints/Alcool)
//    - Si module désactivé ou valeur = 0 → ligne grisée (Option A)
// 2. Cartes agrégées : Total jour/semaine/mois/année (réactives à l'onglet)
// 3. AUCUN calcul ici → tout vient de state.getAggregates()
// ============================================================

import { on, getAggregates, getCurrentRange, getSettings } from "./state.js";

console.log("[stats.js] Module loaded");

// ============================================================
// Labels pour les ranges
// ============================================================
function labelForRange(r) {
  if (r === "week") return "Semaine";
  if (r === "month") return "Mois";
  if (r === "year") return "Année";
  return "Jour";
}

// ============================================================
// Récupérer le range actif depuis l'UI (boutons)
// ============================================================
function currentRangeFromUI() {
  const active = document.querySelector('#chartRange .btn.pill.active');
  return active?.dataset?.range || getCurrentRange() || "day";
}

// ============================================================
// Mise à jour du bloc vert KPI (3 lignes toujours visibles)
// ============================================================
function updateKPIBlock(aggregates) {
  try {
    const settings = getSettings();
    const modules = settings.modules || { cigs: true, weed: true, alcohol: true };

    // Ligne Cigarettes
    const cigLine = document.getElementById("kpi-cigarettes");
    const cigValue = document.getElementById("kpi-cigarettes-value");
    if (cigLine && cigValue) {
      cigValue.textContent = String(aggregates.cigarettes || 0);
      // Griser si désactivé OU si valeur = 0
      if (!modules.cigs || aggregates.cigarettes === 0) {
        cigLine.classList.add("disabled");
      } else {
        cigLine.classList.remove("disabled");
      }
    }

    // Ligne Joints
    const jointLine = document.getElementById("kpi-joints");
    const jointValue = document.getElementById("kpi-joints-value");
    if (jointLine && jointValue) {
      jointValue.textContent = String(aggregates.joints || 0);
      if (!modules.weed || aggregates.joints === 0) {
        jointLine.classList.add("disabled");
      } else {
        jointLine.classList.remove("disabled");
      }
    }

    // Ligne Alcool
    const alcLine = document.getElementById("kpi-alcohol");
    const alcValue = document.getElementById("kpi-alcohol-value");
    if (alcLine && alcValue) {
      alcValue.textContent = String(aggregates.alcohol || 0);
      if (!modules.alcohol || aggregates.alcohol === 0) {
        alcLine.classList.add("disabled");
      } else {
        alcLine.classList.remove("disabled");
      }
    }

    console.log("[stats.updateKPIBlock]", aggregates);
  } catch (e) {
    console.error("[stats.updateKPIBlock] error:", e);
  }
}

// ============================================================
// Mise à jour des cartes agrégées (Total jour/semaine/mois/année)
// ============================================================
function updateSummaryCards(range, aggregates) {
  try {
    const total = (aggregates.cigarettes || 0) + (aggregates.joints || 0) + (aggregates.alcohol || 0);
    
    // Carte "Total [période]"
    const cardLabel = document.getElementById("summary-card-period-label");
    const cardValue = document.getElementById("summary-card-period-value");
    if (cardLabel && cardValue) {
      cardLabel.textContent = `Total ${labelForRange(range).toLowerCase()}`;
      cardValue.textContent = String(total);
    }

    console.log("[stats.updateSummaryCards]", { range, total });
  } catch (e) {
    console.error("[stats.updateSummaryCards] error:", e);
  }
}

// ============================================================
// Mise à jour du titre Stats (Bilan [période] — Total X)
// ============================================================
function updateStatsTitle(range, aggregates) {
  try {
    const titre = document.getElementById("stats-titre");
    if (!titre) return;

    const total = (aggregates.cigarettes || 0) + (aggregates.joints || 0) + (aggregates.alcohol || 0);
    titre.textContent = `Bilan ${labelForRange(range)} — Total ${total}`;

    console.log("[stats.updateStatsTitle]", { range, total });
  } catch (e) {
    console.error("[stats.updateStatsTitle] error:", e);
  }
}

// ============================================================
// Mise à jour complète (bloc vert + cartes + titre)
// ============================================================
function updateAllStats(range = "day") {
  try {
    const aggregates = getAggregates(range);
    
    updateKPIBlock(aggregates);
    updateSummaryCards(range, aggregates);
    updateStatsTitle(range, aggregates);

    console.log("[stats.updateAllStats]", { range, aggregates });
  } catch (e) {
    console.error("[stats.updateAllStats] error:", e);
  }
}

// ============================================================
// Initialisation des événements
// ============================================================
export function initStats() {
  console.log("[stats.init] start");

  // 1) Quand charts.js rend, il émet "charts:totals"
  on("charts:totals", (e) => {
    const range = e.detail?.range || currentRangeFromUI();
    const totals = e.detail?.totals;
    
    if (totals) {
      // charts.js envoie déjà les aggregates
      updateKPIBlock(totals);
      updateSummaryCards(range, totals);
      updateStatsTitle(range, totals);
    } else {
      // Sinon on récupère depuis state.js
      updateAllStats(range);
    }
  });

  // 2) Changement de range (onglet Jour/Semaine/Mois/Année)
  on("sa:range-changed", (e) => {
    const range = e.detail?.range || currentRangeFromUI();
    updateAllStats(range);
  });

  // 3) Si on change d'écran → rafraîchir
  on("sa:route-changed", (e) => {
    if (e.detail?.screen === "ecran-stats") {
      const range = currentRangeFromUI();
      updateAllStats(range);
    }
  });

  // 4) Si compteurs bougent alors qu'on est sur Stats
  on("sa:counts-updated", () => {
    const stats = document.getElementById("ecran-stats");
    if (stats?.classList.contains("show")) {
      const range = currentRangeFromUI();
      updateAllStats(range);
    }
  });

  // 5) Si settings changent (module activé/désactivé)
  on("sa:settings-updated", () => {
    const stats = document.getElementById("ecran-stats");
    if (stats?.classList.contains("show")) {
      const range = currentRangeFromUI();
      updateAllStats(range);
    }
  });

  // 6) Initial : affichage au chargement
  const firstRange = currentRangeFromUI();
  updateAllStats(firstRange);

  console.log("[stats.init] ready ✓ (Phase 2 - v2.4.4)");
}
