// web/js/charts.js
// 2 graphiques : consommations (cigs/weed/alcool) et coûts/économies
// Grouped bars, labels alignés à la plage, MAJ via événement "sa:chart-update"

import { $, } from "./utils.js";

let chart1 = null;
let chart2 = null;

function makeBarConfig(labels, datasets, opts={}){
  return {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "top" },
        tooltip: { enabled: true },
        title: { display: false }
      },
      scales: {
        x: { stacked: false, grid: { display: true } },
        y: { beginAtZero: true, grid: { display: true } }
      },
      ...opts
    }
  };
}

function ensureCharts(){
  const c1 = $("#chart-consommations");
  const c2 = $("#chart-cout-eco");
  if (!c1 || !c2) return { ok:false };

  // Hauteurs confort (le canvas a déjà une hauteur dans le HTML)
  c1.parentElement.style.minHeight = "260px";
  c2.parentElement.style.minHeight = "220px";

  // Instancie si pas encore
  if (!chart1){
    chart1 = new Chart(c1.getContext("2d"), makeBarConfig([], []));
  }
  if (!chart2){
    chart2 = new Chart(c2.getContext("2d"), makeBarConfig([], []));
  }
  return { ok:true };
}

function palette(){
  // Sans fixer précisément (Chart.js choisira), mais on force une cohérence soft
  return {
    cigs: "rgba(59,130,246,0.7)",   // bleu
    weed: "rgba(34,197,94,0.7)",    // vert
    alco: "rgba(245,158,11,0.7)",   // orange
    cost: "rgba(17,24,39,0.8)",     // gris foncé
    eco:  "rgba(16,185,129,0.8)",   // vert éco
  };
}

function buildDatasets(series, range){
  const p = palette();
  const barThickness = (range==="day")? 12 : undefined;

  const ds1 = [
    { label:"Cigarettes", data: series.cigs||[], backgroundColor:p.cigs, borderColor:p.cigs, borderWidth:0, barThickness },
    { label:"Joints",     data: series.weed||[], backgroundColor:p.weed, borderColor:p.weed, borderWidth:0, barThickness },
    { label:"Alcool",     data: series.alcohol||[], backgroundColor:p.alco, borderColor:p.alco, borderWidth:0, barThickness },
  ];
  const ds2 = [
    { label:"Coût estimé (€)", data: series.cost||[], backgroundColor:p.cost, borderColor:p.cost, borderWidth:0, barThickness },
    { label:"Économies (€)",   data: series.eco||[],  backgroundColor:p.eco,  borderColor:p.eco,  borderWidth:0, barThickness },
  ];
  return { ds1, ds2 };
}

function updateCharts(range, labels, series){
  if (!ensureCharts().ok) return;

  const { ds1, ds2 } = buildDatasets(series, range);

  // Graph 1 : conso
  chart1.data.labels   = labels;
  chart1.data.datasets = ds1;
  chart1.update("none");

  // Graph 2 : coût / économies
  chart2.data.labels   = labels;
  chart2.data.datasets = ds2;
  chart2.update("none");
}

export function initCharts(){
  ensureCharts();

  // Écoute standard : stats.js publie cet event
  window.addEventListener("sa:chart-update", (e)=>{
    const d = e.detail || {};
    updateCharts(d.range, d.labels||[], d.series||{});
  });
}
