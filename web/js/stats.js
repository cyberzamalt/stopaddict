// ============================================================
// stats.js — KPIs & carte agrégée (compat WebView)
// Source: state.getAggregates(range)
// Réagit à: sa:counts-updated, sa:range-changed
// ============================================================

import { getAggregates, getCurrentRange, on as onState } from "./state.js";

var $ = function (s, r) { return (r || document).querySelector(s); };

var els = {
  rangeRoot:   $("#chartRange"),
  titre:       $("#stats-titre"),
  kpiCigs:     $("#kpi-cigarettes-value"),
  kpiJoints:   $("#kpi-joints-value"),
  kpiAlcohol:  $("#kpi-alcohol-value"),
  sumLabel:    $("#summary-card-period-label"),
  sumValue:    $("#summary-card-period-value"),
  lineCigs:    $("#stats-clopes"),
  lineJoints:  $("#stats-joints"),
  lineAlcohol: $("#stats-alcool"),
  todayTotal:  $("#todayTotal"),
  weekTotal:   $("#weekTotal"),
  monthTotal:  $("#monthTotal"),
  todayCost:   $("#todayCost"),
  economies:   $("#economies-amount")
};

var labels = {
  day:   { titre: "Bilan Jour",    sum: "Total jour"    },
  week:  { titre: "Bilan Semaine", sum: "Total semaine" },
  month: { titre: "Bilan Mois",    sum: "Total mois"    },
  year:  { titre: "Bilan Année",   sum: "Total année"   }
};

function getActiveRange() {
  var btn = els.rangeRoot ? els.rangeRoot.querySelector(".btn.pill.active") : null;
  var r = btn && btn.dataset ? btn.dataset.range : null;
  if (r) return r;
  try { return getCurrentRange(); } catch(e) { return "day"; }
}

function sumAgg(a) {
  a = a || {};
  return (a.cigarettes||0) + (a.joints||0) + (a.alcohol||0);
}

function renderForRange(range) {
  try {
    var agg = getAggregates(range);
    var total = sumAgg(agg);

    var lab = labels[range] || {};
    if (els.titre)    els.titre.textContent    = ((lab.titre || "Bilan") + " — Total " + total);
    if (els.sumLabel) els.sumLabel.textContent = (lab.sum || "Total");
    if (els.sumValue) els.sumValue.textContent = String(total);

    if (els.kpiCigs)    els.kpiCigs.textContent    = String(agg.cigarettes||0);
    if (els.kpiJoints)  els.kpiJoints.textContent  = String(agg.joints||0);
    if (els.kpiAlcohol) els.kpiAlcohol.textContent = String(agg.alcohol||0);

    if (els.lineCigs)    els.lineCigs.textContent    = String(agg.cigarettes||0);
    if (els.lineJoints)  els.lineJoints.textContent  = String(agg.joints||0);
    if (els.lineAlcohol) els.lineAlcohol.textContent = String(agg.alcohol||0);
  } catch (e) {
    var dbg = document.getElementById("debug-console");
    if (dbg) {
      dbg.classList.add("show");
      dbg.textContent += "\n[stats] renderForRange(" + range + ") error: " + (e && e.message ? e.message : e);
      dbg.style.display = "block";
    }
    console.error("[stats] renderForRange error", e);
  }
}

function updateHeaderKpis() {
  try {
    var d = getAggregates("day");
    var w = getAggregates("week");
    var m = getAggregates("month");

    if (els.todayTotal) els.todayTotal.textContent = String(sumAgg(d));
    if (els.weekTotal)  els.weekTotal.textContent  = String(sumAgg(w));
    if (els.monthTotal) els.monthTotal.textContent = String(sumAgg(m));

    if (els.todayCost) els.todayCost.textContent = "0 €";
    if (els.economies) els.economies.textContent = "0 €";
  } catch (e) {
    console.error("[stats] updateHeaderKpis error", e);
  }
}

function refresh() {
  var range = getActiveRange() || "day";
  renderForRange(range);
  updateHeaderKpis();
}

function attachListeners() {
  if (els.rangeRoot) {
    els.rangeRoot.addEventListener("click", function(ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest(".btn.pill[data-range]") : null;
      if (!btn) return;
      setTimeout(refresh, 0);
    });
  }

  onState("sa:counts-updated", function(){ refresh(); });
  onState("sa:range-changed",  function(){ refresh(); });
}

export function initStats() {
  attachListeners();
  refresh();
  console.log("[stats.init] ✓");
}
