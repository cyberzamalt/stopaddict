// ============================================================
// stats.js — Phase 2 (KPIs + Carte total + Bannière)
// - Lit la même source que charts.js : getAggregates(getCurrentRange())
// - Réagit à: sa:counts-updated, sa:range-changed
// - Toujours 3 lignes (Cigarettes / Joints / Alcool)
// ============================================================

import { on as onState, getAggregates, getCurrentRange } from "./state.js";

const $, $$ = (s, r = document) => r.querySelector(s);

function toInt(v) {
  const n = Number.parseInt(v ?? 0, 10);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAgg(agg = {}) {
  const cigarettes = toInt(agg.cigarettes ?? agg.cigs ?? agg.clopes ?? 0);
  const joints     = toInt(agg.joints ?? 0);
  const alcohol    = toInt(agg.alcohol ?? agg.alcool ?? 0); // tolère "alcool"
  const total      = cigarettes + joints + alcohol;
  return { cigarettes, joints, alcohol, total };
}

function rangeLabel(range) {
  // libellés UI
  const map = { day: "jour", week: "semaine", month: "mois", year: "année" };
  const key = String(range || "").toLowerCase();
  return map[key] || "jour";
}

function capFirst(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// -- DOM targets (tous optionnels : pas de crash si absents)
const els = {
  kpiCigs:   $("#kpi-cigarettes-value"),
  kpiJoints: $("#kpi-joints-value"),
  kpiAlc:    $("#kpi-alcohol-value"),

  sumLabel:  $("#summary-card-period-label"),
  sumValue:  $("#summary-card-period-value"),

  bannTitle: $("#stats-titre"),
  bCigs:     $("#stats-clopes"),
  bJoints:   $("#stats-joints"),
  bAlc:      $("#stats-alcool"),
  bAlcLine:  $("#stats-alcool-line"),
};

function renderStats() {
  try {
    const range = typeof getCurrentRange === "function" ? getCurrentRange() : "day";
    const aggRaw = typeof getAggregates === "function" ? getAggregates(range) : {};
    const agg = normalizeAgg(aggRaw);

    // Bloc vert (KPI)
    if (els.kpiCigs)  els.kpiCigs.textContent = String(agg.cigarettes);
    if (els.kpiJoints)els.kpiJoints.textContent= String(agg.joints);
    if (els.kpiAlc)   els.kpiAlc.textContent   = String(agg.alcohol);

    // Carte totale (label + valeur)
    const rLbl = rangeLabel(range);
    if (els.sumLabel) els.sumLabel.textContent = `Total ${rLbl}`;
    if (els.sumValue) els.sumValue.textContent = String(agg.total);

    // Bannière “Bilan … — Total …”
    if (els.bannTitle) els.bannTitle.textContent = `${capFirst(rLbl)} — Total ${agg.total}`;
    if (els.bCigs)  els.bCigs.textContent  = String(agg.cigarettes);
    if (els.bJoints)els.bJoints.textContent= String(agg.joints);
    if (els.bAlc)   els.bAlc.textContent   = String(agg.alcohol);
    if (els.bAlcLine) els.bAlcLine.style.display = ""; // toujours visible en phase 2
  } catch (err) {
    // On ne bloque jamais l'app si un élément manque
    const dbg = document.getElementById("debug-console");
    if (dbg) {
      dbg.classList.add("show");
      dbg.textContent += `\n[stats.js] renderStats error: ${err?.message || err}`;
    }
    console.error("[stats.js] renderStats error", err);
  }
}

function initStats() {
  if (window.__sa_stats_inited) return;
  window.__sa_stats_inited = true;

  // Rendu initial
  renderStats();

  // Écoute les mises à jour de compteurs & changements de période
  if (typeof onState === "function") {
    onState("sa:counts-updated", renderStats);
    onState("sa:range-changed", renderStats);
  }
}

// Auto-init à l’import du module
try {
  initStats();
} catch (e) {
  console.error("[stats.js] init error", e);
}
export { initStats };
