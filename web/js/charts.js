// web/js/charts.js — v2.4.3
// Utilise les IDs réels des canvas (monolithe): #chartConsommations, #chartCoutEco
// Ne plante pas si Chart.js est absent ; émet au moins charts:totals pour la bannière.

import { totalsHeader } from "./state.js";

function $(sel){ return document.querySelector(sel); }

function currentTotalsFor(range="day"){
  // Synthétise des totaux depuis l’agrégat header, pour alimenter la bannière au minimum
  const header = totalsHeader(new Date()) || {};
  const map = { day:"day", week:"week", month:"month", year:"year" };
  const key = map[range] || "day";
  const block = header[key] || {};
  return {
    cigs: Number(block.cigs || 0),
    weed: Number(block.weed || 0),
    alcohol: Number(block.alcohol || 0)
  };
}

export function initCharts(){
  try {
    const canvasMain = $("#chartConsommations");
    const canvasEco  = $("#chartCoutEco");

    // Toujours informer la bannière au moins une fois (même sans charts)
    const initialTotals = currentTotalsFor("day");
    window.dispatchEvent(new CustomEvent("charts:totals", { detail: { range:"day", totals: initialTotals }}));

    // Si Chart.js n’est pas chargé, on s’arrête sans bloquer l’app
    if (typeof Chart === "undefined" || !canvasMain || !canvasMain.getContext) {
      console.warn("[charts] Chart.js or canvas not available — skip drawing");
      return;
    }

    // Exemple minimal : un graphique “barres” sur les 3 catégories (aujourd’hui)
    const ctx = canvasMain.getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Cigarettes", "Joints", "Alcool"],
        datasets: [{
          label: "Aujourd’hui",
          data: [initialTotals.cigs, initialTotals.weed, initialTotals.alcohol]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Si un 2e canvas (économie) existe et que tu l’alimentes ailleurs, on évite de crasher
    if (canvasEco && canvasEco.getContext) {
      const ctx2 = canvasEco.getContext("2d");
      new Chart(ctx2, {
        type: "line",
        data: {
          labels: ["Aujourd’hui"],
          datasets: [{
            label: "Coût/Économie",
            data: [0]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    console.log("[charts.init] Drawn");
  } catch (e) {
    console.error("[charts.init] error:", e);
  }
}
