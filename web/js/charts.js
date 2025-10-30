// web/js/charts.js
// STOPADDICT — Graphiques (Chart.js)
// Rôle : afficher des graphiques cohérents avec la vue (Jour/Semaine/Mois/Année)
// en utilisant les agrégations fournies par state.getRangeTotals().
// Dépendances : ./state.js, Chart.js présent dans la page (window.Chart).

import {
  getViewRange,
  getRangeTotals,
} from "./state.js";

const $ = (sel, root = document) => root.querySelector(sel);

// Canvases attendus (si absents, on n’affiche rien sans casser l’app)
const CANVAS_IDS = {
  consos: ["#chart-consos", "#chart1"], // 1er canvas disponible
  cost:   ["#chart-cost",   "#chart2"], // 2ème canvas disponible
};

let charts = {
  consos: null,
  cost: null,
};

function findFirstCanvas(candidates) {
  for (const id of candidates) {
    const el = $(id);
    if (el && el.getContext) return el;
  }
  return null;
}

function sum(arr = []) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (+arr[i] || 0);
  return s;
}

// Palette simple (si le thème CSS existe, Chart.js s’y adaptera)
const COLORS = {
  cigs:   "rgba(220, 38, 38, 0.7)",  // rouge
  weed:   "rgba(16, 185, 129, 0.7)", // vert
  beer:   "rgba(245, 158, 11, 0.7)", // orange
  strong: "rgba(59, 130, 246, 0.7)", // bleu
  liquor: "rgba(168, 85, 247, 0.7)", // violet
  cost:   "rgba(234, 179, 8, 0.7)",  // jaune/or
};

function buildConsumptionDatasets(agg) {
  // agg.series = { cigs:[], weed:[], beer:[], strong:[], liquor:[], cost:[] }
  const defs = [
    ["cigs",   "Cigarettes"],
    ["weed",   "Joints"],
    ["beer",   "Bière"],
    ["strong", "Alcool fort"],
    ["liquor", "Liqueur"],
  ];

  return defs.map(([key, label]) => {
    const data = agg.series[key] || [];
    const hidden = sum(data) === 0; // si tout est à 0 (catégorie OFF ou sans données), on masque
    return {
      label,
      data,
      type: "bar",
      backgroundColor: COLORS[key],
      borderColor: COLORS[key],
      borderWidth: 1,
      hidden,
      stack: "consos", // empilé si on veut (utile surtout en semaine/mois/année)
    };
  });
}

function buildCostDataset(agg) {
  const data = agg.series.cost || [];
  return [{
    label: "Coût (€)",
    data,
    type: "line",
    backgroundColor: COLORS.cost,
    borderColor: COLORS.cost,
    borderWidth: 2,
    pointRadius: 2,
    tension: 0.3,
    yAxisID: "y",
  }];
}

function ensureChart(ctx, kind) {
  if (!ctx) return null;
  if (charts[kind]) return charts[kind];

  // Config par défaut ; on adaptera les données dans updateCharts()
  const baseConfig = {
    type: "bar",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: { stacked: kind === "consos" },     // utiles pour superposer les catégories
        y: { stacked: kind === "consos", beginAtZero: true },
      },
    },
  };

  try {
    charts[kind] = new Chart(ctx, baseConfig);
  } catch (e) {
    console.warn("[charts] Chart init failed:", e);
    charts[kind] = null;
  }
  return charts[kind];
}

function updateConsosChart(agg) {
  const canvas = findFirstCanvas(CANVAS_IDS.consos);
  if (!canvas || !window.Chart) return;

  const chart = ensureChart(canvas.getContext("2d"), "consos");
  if (!chart) return;

  const datasets = buildConsumptionDatasets(agg);
  chart.data.labels = agg.labels || [];
  chart.data.datasets = datasets;

  // Ajuster les ticks de X pour des labels lisibles (mois/jours)
  chart.options.scales.x.ticks = { autoSkip: true, maxRotation: 0, minRotation: 0 };
  chart.update();
}

function updateCostChart(agg) {
  const canvas = findFirstCanvas(CANVAS_IDS.cost);
  if (!canvas || !window.Chart) return;

  const chart = ensureChart(canvas.getContext("2d"), "cost");
  if (!chart) return;

  const datasets = buildCostDataset(agg);
  chart.data.labels = agg.labels || [];
  chart.data.datasets = datasets;

  // Échelle Y (euros)
  chart.options.scales = chart.options.scales || {};
  chart.options.scales.y = { beginAtZero: true, title: { display: true, text: "€" } };
  chart.options.scales.x = { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } };
  chart.update();
}

function updateChartsFromAgg(agg) {
  try {
    updateConsosChart(agg);
    updateCostChart(agg);
    // Notifier potentiels autres modules (export d’images, etc.)
    document.dispatchEvent(new CustomEvent("sa:charts-updated", { detail: { agg } }));
  } catch (e) {
    console.warn("[charts] updateChartsFromAgg failed:", e);
  }
}

function refresh() {
  const range = getViewRange() || "day";
  const agg = getRangeTotals(range, new Date());
  updateChartsFromAgg(agg);
}

// ------- API publique -------
export function initCharts() {
  // 1ère peinture
  refresh();

  // Quand les stats changent (après +/−, réglages, changement de période)
  document.addEventListener("sa:stats-updated", (e) => {
    const { agg } = e.detail || {};
    if (agg) updateChartsFromAgg(agg);
    else refresh();
  });

  // Sécurité : si la vue change directement
  document.addEventListener("sa:view-range-changed", refresh);

  // Optionnel : réafficher quand on revient sur l’onglet Stats via la nav
  const nav = document.getElementById("nav-stats");
  if (nav) {
    nav.addEventListener("click", () => setTimeout(refresh, 0));
  }
}

export default { initCharts };
