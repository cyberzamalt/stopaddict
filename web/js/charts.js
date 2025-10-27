// ============================================================
// charts.js — Graphiques consommations & coûts (PHASE 2)
// ============================================================
// Affiche un graphe simple avec 3 barres (cigs, weed, alcool)
// pour l'échelle sélectionnée. Évite les features non supportées
// par vieilles WebView (pas d'opérateur ?. ou ??).
// Dépendances: Chart.js chargé globalement + state.js
// ============================================================

import { getTotalsForRange, on } from "./state.js";

console.log("[charts.js] Module loaded");

let chartCons = null;
let chartCost = null;
let currentRange = "day";

function $(id){ return document.getElementById(id); }

// ------------------------------------------------------------
// Small helpers
// ------------------------------------------------------------
function ensureCtx(id){
  const cv = $(id);
  if (!cv) return null;
  // Sur certains Android, width/height inline améliorent le rendu
  if (!cv.getAttribute("width"))  cv.setAttribute("width","960");
  if (!cv.getAttribute("height")) cv.setAttribute("height","260");
  const ctx = cv.getContext ? cv.getContext("2d") : null;
  return ctx;
}

function destroyIfExists(ch){
  try{ if (ch && ch.destroy) ch.destroy(); }catch(e){}
}

// ------------------------------------------------------------
// Build data
// ------------------------------------------------------------
function buildConsumptionData(range){
  const t = getTotalsForRange(range) || {cigs:0, weed:0, alcohol:0};
  const labels = ["Cigarettes","Joints","Alcool"];
  const data = [t.cigs|0, t.weed|0, t.alcohol|0];
  return { labels: labels, data: data };
}

// ------------------------------------------------------------
// Draw charts
// ------------------------------------------------------------
function drawConsumption(range){
  try{
    const ctx = ensureCtx("chart-consommations");
    if (!ctx || !window.Chart){ console.warn("[charts] Chart.js non dispo"); return; }

    const d = buildConsumptionData(range);

    destroyIfExists(chartCons);
    chartCons = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: d.labels,
        datasets: [{
          label: "Consommations (" + range + ")",
          data: d.data,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { precision:0 } }
        },
        plugins: {
          legend: { display: true }
        }
      }
    });
  }catch(err){
    console.error("[charts] drawConsumption error:", err);
  }
}

function drawCosts(range){
  // Optionnel: si state.js ne fournit rien sur le coût,
  // on dessine simplement un graphe vide sans planter.
  try{
    const canvas = $("chart-cout-eco");
    if (!canvas || !window.Chart) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Chercher si state.js expose des coûts
    var totalCost = 0;
    var label = "Coût (" + range + ")";
    try {
      const t = getTotalsForRange(range);
      if (t && typeof t.cost === "number") totalCost = t.cost;
    } catch(e){ /* pas critique */ }

    destroyIfExists(chartCost);
    chartCost = new window.Chart(ctx, {
      type: "bar",
      data: {
        labels: [label],
        datasets: [{
          label: "€",
          data: [ totalCost ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }catch(err){
    console.warn("[charts] drawCosts error:", err);
  }
}

// ------------------------------------------------------------
// Listeners
// ------------------------------------------------------------
function setupListeners(){
  // Quand l'échelle change (via stats.js), on redessine
  on("sa:range-change", function(e){
    const r = e && e.detail ? e.detail.range : null;
    if (r) currentRange = r;
    drawConsumption(currentRange);
    drawCosts(currentRange);
  });

  // Quand les compteurs changent
  on("sa:counts-updated", function(){
    drawConsumption(currentRange);
    drawCosts(currentRange);
  });
}

// ------------------------------------------------------------
// Public
// ------------------------------------------------------------
export function initCharts(){
  console.log("[charts.initCharts] Starting...");
  try{
    currentRange = "day";
    setupListeners();
    // Premier rendu
    drawConsumption(currentRange);
    drawCosts(currentRange);
    console.log("[charts.initCharts] ✓ Ready");
  }catch(e){
    console.error("[charts.initCharts] error:", e);
  }
}
