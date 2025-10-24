// ============================================================
// stats.js — Phase 2 (KPIs & cartes agrégées branchés)
// - Source unique: state.getAggregates(range)
// - Réagit à: sa:counts-updated, sa:range-changed
// - Toujours 3 lignes (Cigarettes / Joints / Alcool)
// ============================================================

import { getAggregates, getCurrentRange, on as onState } from "./state.js";

const $ = (s, r = document) => r.querySelector(s);

const els = {
  // Range et titre
  rangeRoot:   $("#chartRange"),
  titre:       $("#stats-titre"),

  // Bloc KPI vert (3 lignes)
  kpiCigs:     $("#kpi-cigarettes-value"),
  kpiJoints:   $("#kpi-joints-value"),
  kpiAlcohol:  $("#kpi-alcohol-value"),

  // Carte agrégée (Total période)
  sumLabel:    $("#summary-card-period-label"),
  sumValue:    $("#summary-card-period-value"),

  // Bannière “Bilan …”
  lineCigs:    $("#stats-clopes"),
  lineJoints:  $("#stats-joints"),
  lineAlcohol: $("#stats-alcool"),

  // Bandeau KPI (tuiles) en haut de l’écran Stats
  todayTotal:  $("#todayTotal"),
  weekTotal:   $("#weekTotal"),
  monthTotal:  $("#monthTotal"),
  todayCost:   $("#todayCost"),        // Phase 3
  economies:   $("#economies-amount"), // Phase 3
};

const labels = {
  day:   { titre: "Bilan Jour",    sum: "Total jour"    },
  week:  { titre: "Bilan Semaine", sum: "Total semaine" },
  month: { titre: "Bilan Mois",    sum: "Total mois"    },
  year:  { titre: "Bilan Année",   sum: "Total année"   },
};

function getActiveRange() {
  // lecture via bouton actif si présent, sinon via state
  const btn = els.rangeRoot?.querySelector(".btn.pill.active");
  return btn?.dataset?.range || getCurrentRange?.() || "day";
}

function sumAgg(a) {
  return (a.cigarettes|0) + (a.joints|0) + (a.alcohol|0);
}

function renderForRange(range) {
  try {
    const agg = getAggregates(range); // { cigarettes, joints, alcohol }
    const total = sumAgg(agg);

    // Titre & carte
    if (els.titre)    els.titre.textContent    = `${labels[range]?.titre ?? "Bilan"} — Total ${total}`;
    if (els.sumLabel) els.sumLabel.textContent = labels[range]?.sum ?? "Total";
    if (els.sumValue) els.sumValue.textContent = String(total);

    // Bloc KPI vert
    if (els.kpiCigs)    els.kpiCigs.textContent    = String(agg.cigarettes|0);
    if (els.kpiJoints)  els.kpiJoints.textContent  = String(agg.joints|0);
    if (els.kpiAlcohol) els.kpiAlcohol.textContent = String(agg.alcohol|0);

    // Bannière détails
    if (els.lineCigs)    els.lineCigs.textContent    = String(agg.cigarettes|0);
    if (els.lineJoints)  els.lineJoints.textContent  = String(agg.joints|0);
    if (els.lineAlcohol) els.lineAlcohol.textContent = String(agg.alcohol|0);
  } catch (e) {
    const dbg = document.getElementById("debug-console");
    if (dbg) { dbg.classList.add("show"); dbg.textContent += `\n[stats] renderForRange(${range}) error: ${e?.message || e}`; }
    console.error("[stats] renderForRange error", e);
  }
}

function renderHeaderTiles() {
  try {
    const d = getAggregates("day");
    const w = getAggregates("week");
    const m = getAggregates("month");

    if (els.todayTotal) els.todayTotal.textContent = String(sumAgg(d));
    if (els.weekTotal)  els.weekTotal.textContent  = String(sumAgg(w));
    if (els.monthTotal) els.monthTotal.textContent = String(sumAgg(m));

    // Phase 3
    if (els.todayCost) els.todayCost.textContent = "0 €";
    if (els.economies) els.economies.textContent = "0 €";
  } catch (e) {
    console.error("[stats] renderHeaderTiles error", e);
  }
}

function refresh() {
  const range = getActiveRange();
  renderForRange(range);
  renderHeaderTiles();
}

function attachListeners() {
  // Changement d’onglet (le .active est géré côté charts.js)
  if (els.rangeRoot) {
    els.rangeRoot.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".btn.pill[data-range]");
      if (!btn) return;
      requestAnimationFrame(refresh);
    });
  }

  // Événements du bus state.js
  onState("sa:counts-updated", refresh);
  onState("sa:range-changed", refresh);
}

function init() {
  attachListeners();
  refresh();
}

// Auto-init si le module est importé
init();

export default { init, refresh };
