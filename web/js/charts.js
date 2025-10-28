// web/js/charts.js
// Instancie 2 graphiques Chart.js et écoute l’événement "sa:chart-data" produit par stats.js.

let chartCons = null;
let chartCost = null;

function byId(id) { return document.getElementById(id); }

function ensureCtx(id) {
  const el = byId(id);
  if (!el) return null;
  const ctx = el.getContext("2d");
  return ctx || null;
}

function makeConsChart(ctx) {
  // Barres empilées par catégorie
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        { label: "Cigarettes", data: [], borderWidth: 1, backgroundColor: "rgba(59,130,246,0.5)" },
        { label: "Joints", data: [], borderWidth: 1, backgroundColor: "rgba(16,185,129,0.5)" },
        { label: "Alcool", data: [], borderWidth: 1, backgroundColor: "rgba(245,158,11,0.5)" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { stacked: true, ticks: { autoSkip: true, maxRotation: 0 } },
        y: { stacked: true, beginAtZero: true, title: { display: true, text: "Unités" } }
      }
    }
  });
}

function makeCostChart(ctx) {
  // Courbes coût / économies
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "Coût (€)", data: [], borderWidth: 2, tension: 0.25 },
        { label: "Économies (€)", data: [], borderWidth: 2, tension: 0.25 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" }, tooltip: { mode: "index", intersect: false } },
      scales: {
        x: { ticks: { autoSkip: true, maxRotation: 0 } },
        y: { beginAtZero: true, title: { display: true, text: "€" } }
      }
    }
  });
}

function resizeCanvasToContainer(id, minH = 220) {
  const canvas = byId(id);
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (parent) {
    const h = Math.max(minH, parent.clientWidth * 0.45);
    canvas.style.width = "100%";
    canvas.style.height = h + "px";
  }
}

function applyConsData(chart, labels, cigs, joints, alcohol) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = cigs;
  chart.data.datasets[1].data = joints;
  chart.data.datasets[2].data = alcohol;
  chart.update();
}

function applyCostData(chart, labels, cost, eco) {
  chart.data.labels = labels;
  chart.data.datasets[0].data = cost;
  chart.data.datasets[1].data = eco;
  chart.update();
}

export function initCharts() {
  // init charts (si canvases présents)
  const ctx1 = ensureCtx("chart-consommations");
  const ctx2 = ensureCtx("chart-cout-eco");

  if (ctx1) {
    resizeCanvasToContainer("chart-consommations", 260);
    chartCons = makeConsChart(ctx1);
  }
  if (ctx2) {
    resizeCanvasToContainer("chart-cout-eco", 220);
    chartCost = makeCostChart(ctx2);
  }

  // écoute des données poussées par stats.js
  document.addEventListener("sa:chart-data", (e) => {
    const d = e.detail || {};
    const { labels = [], cigs = [], joints = [], alcohol = [], cost = [], eco = [] } = d;
    if (chartCons) applyConsData(chartCons, labels, cigs, joints, alcohol);
    if (chartCost) applyCostData(chartCost, labels, cost, eco);
  });

  // simple responsive (orientations)
  window.addEventListener("resize", () => {
    resizeCanvasToContainer("chart-consommations", 260);
    resizeCanvasToContainer("chart-cout-eco", 220);
    chartCons && chartCons.resize();
    chartCost && chartCost.resize();
  });
}
