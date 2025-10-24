// ============================================================
// charts.js — Phase 2 (axes temporels + autoscale + alignement)
// - X = Jour(4 tranches) / Semaine(7j) / Mois(semaines) / Année(12 mois)
// - Y autoscale (>= max, +10%), ticks entiers
// - Deux charts avec options identiques (alignement)
// - Détruit avant recréer (pas de fuite)
// - Émet setCurrentRange(range) -> sa:range-changed (state.js)
// ============================================================

import { getAllDaily, getSettings, ymd, getCurrentRange, setCurrentRange, on as onState } from "./state.js";
import Stats from "./stats.js"; // garantit init des KPIs lors du chargement

let chartConsos = null;
let chartCostEco = null;

const $ = (s, r = document) => r.querySelector(s);

const els = {
  rangeRoot: $("#chartRange"),
  c1:        $("#chart-consommations"),
  c2:        $("#chart-cout-eco"),
};

// -------------------- Helpers temps --------------------
const DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];

function isoMonday(d) {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // 0 = lundi
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() - day);
  return dt;
}

function weeksInMonthBuckets(dt) {
  // retourne 5 seaux [S1..S5] indexés 0..4
  const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // 0=lundi
  const daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
  const buckets = [0,0,0,0,0];
  for (let day=1; day<=daysInMonth; day++) {
    const idx = Math.floor((day - 1 + offset) / 7);
    buckets[idx] ||= 0; // ensure defined
  }
  return buckets;
}

// -------------------- Agrégation séries --------------------
function sumEnabled(dayObj, modules) {
  // dayObj: { cigs, weed, alcohol }, modules: { cigs, weed, alcohol }
  if (!dayObj) return 0;
  const cigs = modules.cigs ? (dayObj.cigs || 0) : 0;
  const weed = modules.weed ? (dayObj.weed || 0) : 0;
  const alc  = modules.alcohol ? (dayObj.alcohol || 0) : 0;
  return cigs + weed + alc;
}

function buildSeries(range) {
  const store = getAllDaily() || {};
  const modules = (getSettings()?.modules) || { cigs:true, weed:true, alcohol:true };
  const todayKey = ymd();

  if (range === "day") {
    // 4 tranches: Matin(06-11), Après-midi(12-17), Soir(18-22), Nuit(23-05)
    const bins = [0,0,0,0];
    const labels = ["Matin","Après-midi","Soir","Nuit"];
    const today = store[todayKey] || {};
    const hours = today.hours || {};
    for (let h=0; h<24; h++) {
      const slot = (h>=6 && h<=11) ? 0 : (h>=12 && h<=17) ? 1 : (h>=18 && h<=22) ? 2 : 3;
      const types = hours[h] || {};
      const v = sumEnabled({ cigs: types.cigs, weed: types.weed, alcohol: types.alcohol }, modules);
      bins[slot] += v;
    }
    return { labels, data: bins };
  }

  if (range === "week") {
    const base = isoMonday(new Date());
    const labels = DAYS_FR.slice(0); // 7
    const bins = [0,0,0,0,0,0,0];
    for (let i=0;i<7;i++) {
      const d = new Date(base); d.setDate(base.getDate()+i);
      const k = ymd(d);
      bins[i] = sumEnabled(store[k], modules);
    }
    return { labels, data: bins };
  }

  if (range === "month") {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const next = new Date(now.getFullYear(), now.getMonth()+1, 1);
    const offset = (first.getDay()+6)%7; // 0=lundi
    const labels = ["Sem 1","Sem 2","Sem 3","Sem 4","Sem 5"];
    const bins = [0,0,0,0,0];
    for (let d = new Date(first); d < next; d.setDate(d.getDate()+1)) {
      const idx = Math.floor((d.getDate()-1 + offset) / 7);
      const k = ymd(d);
      bins[idx] += sumEnabled(store[k], modules);
    }
    return { labels, data: bins };
  }

  // year
  const now = new Date();
  const labels = MONTHS_FR.slice(0); // 12
  const bins = new Array(12).fill(0);
  // itère sur toutes les dates de l’année
  const firstY = new Date(now.getFullYear(),0,1);
  const nextY  = new Date(now.getFullYear()+1,0,1);
  for (let d = new Date(firstY); d < nextY; d.setDate(d.getDate()+1)) {
    const k = ymd(d);
    const m = d.getMonth();
    bins[m] += sumEnabled(store[k], modules);
  }
  return { labels, data: bins };
}

// -------------------- Chart options (communes) --------------------
function makeOptions(maxY) {
  const suggestedMax = (maxY === 0) ? 1 : Math.ceil(maxY * 1.1);
  return {
    responsive: true,
    maintainAspectRatio: false, // alignement via CSS hauteur fixe
    animation: false,
    scales: {
      x: {
        grid: { display:false },
        ticks: { autoSkip: false, maxRotation: 0 }
      },
      y: {
        beginAtZero: true,
        suggestedMax,
        ticks: { precision: 0, stepSize: 1 }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: { intersect:false, mode:"index" }
    }
  };
}

function destroyCharts() {
  if (chartConsos) { chartConsos.destroy(); chartConsos = null; }
  if (chartCostEco) { chartCostEco.destroy(); chartCostEco = null; }
}

// -------------------- Render charts --------------------
function renderCharts(range) {
  if (!els.c1 || !els.c2) return;

  const series = buildSeries(range);
  const maxY = Math.max(0, ...series.data);
  const options = makeOptions(maxY);

  destroyCharts();

  chartConsos = new Chart(els.c1.getContext("2d"), {
    type: "bar",
    data: {
      labels: series.labels,
      datasets: [{
        label: "Consommations",
        data: series.data,
        borderWidth: 1
      }]
    },
    options
  });

  // Coût/Éco — Phase 3 : placeholder aligné (mêmes options)
  chartCostEco = new Chart(els.c2.getContext("2d"), {
    type: "bar",
    data: {
      labels: series.labels,
      datasets: [{
        label: "Coût / Économies",
        data: new Array(series.data.length).fill(0),
        borderWidth: 1
      }]
    },
    options
  });
}

// -------------------- Range UI --------------------
function markActive(range) {
  const buttons = els.rangeRoot?.querySelectorAll(".btn.pill[data-range]") || [];
  buttons.forEach(b => b.classList.toggle("active", b.dataset.range === range));
}

function bindRangeUI() {
  if (!els.rangeRoot) return;
  els.rangeRoot.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn.pill[data-range]");
    if (!btn) return;
    const range = btn.dataset.range;
    markActive(range);
    setCurrentRange(range); // émet sa:range-changed
    renderCharts(range);
  });
}

// -------------------- Init --------------------
function bootCharts() {
  // marquer actif selon state (ou défaut jour)
  const range = getCurrentRange?.() || "day";
  markActive(range);
  renderCharts(range);

  // events: mises à jour + changement de période
  onState("sa:counts-updated", () => renderCharts(getCurrentRange?.() || "day"));
  onState("sa:range-changed",  (e) => renderCharts(e?.detail?.range || getCurrentRange?.() || "day"));

  // UI
  bindRangeUI();
}

// Auto-init si présent dans la page Stats
if (els.c1 && els.c2) {
  bootCharts();
}

export { bootCharts, renderCharts };
