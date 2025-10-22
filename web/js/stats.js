// ============================================================
// stats.js — Bannière KPIs (PHASE 2, aligné Claude)
// ============================================================
// Pas de graphiques ici. On écoute charts.js & state.js et on
// met à jour le titre et les 3 valeurs (clopes/joints/alcool).
// ============================================================

import { on, getTotalsForRange } from "./state.js";

console.log("[stats.js] Module loaded");

function labelForRange(r) {
  if (r === "week") return "Semaine";
  if (r === "month") return "Mois";
  if (r === "year") return "Année"; // fallback logique côté state → "day"
  return "Jour";
}

function currentRangeFromUI() {
  const active = document.querySelector('#chartRange .btn.pill.active');
  return active?.dataset?.range || "day";
}

function updateBanner(range, totals) {
  try {
    const titre = document.getElementById("stats-titre");
    const elC = document.getElementById("stats-clopes");
    const elJ = document.getElementById("stats-joints");
    const elA = document.getElementById("stats-alcool");
    const alcoolLine = document.getElementById("stats-alcool-line");

    if (titre) titre.textContent = `Bilan ${labelForRange(range)} — Total ${totals.total ?? 0}`;

    if (elC) elC.textContent = String(totals.cigs ?? 0);
    if (elJ) elJ.textContent = String(totals.weed ?? 0);

    // Alcool visible si présent (sinon on laisse comme en HTML)
    const a = Number(totals.alcohol ?? 0);
    if (elA) elA.textContent = String(a);
    if (alcoolLine) alcoolLine.style.display = a > 0 ? "" : ""; // on n'impose plus le hide ici

    console.log("[stats.updateBanner]", { range, totals });
  } catch (e) {
    console.error("[stats.updateBanner] error:", e);
  }
}

export function initStats() {
  console.log("[stats.init] start");

  // 1) quand charts.js rend, il émet "charts:totals"
  on("charts:totals", (e) => {
    const range = e.detail?.range || currentRangeFromUI();
    const totals = e.detail?.totals || getTotalsForRange(range);
    updateBanner(range, totals);
  });

  // 2) si on change d’écran → rafraîchir la bannière
  on("sa:route-changed", (e) => {
    if (e.detail?.screen === "ecran-stats") {
      const range = currentRangeFromUI();
      const totals = getTotalsForRange(range);
      updateBanner(range, totals);
    }
  });

  // 3) sécurité : si des compteurs bougent alors qu’on est sur stats
  on("sa:counts-updated", () => {
    const stats = document.getElementById("ecran-stats");
    if (stats?.classList.contains("show")) {
      const range = currentRangeFromUI();
      const totals = getTotalsForRange(range);
      updateBanner(range, totals);
    }
  });

  // 4) initial minimal (si on ouvre directement la page sur Stats)
  const firstRange = currentRangeFromUI();
  const firstTotals = getTotalsForRange(firstRange);
  updateBanner(firstRange, firstTotals);

  console.log("[stats.init] ready ✓");
}
