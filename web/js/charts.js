// ============================================================
// charts.js — Phase 2 (compat WebView: pas de ?. ni ||=)
// ============================================================

import { getAllDaily, getSettings, ymd, getCurrentRange, setCurrentRange, on as onState } from "./state.js";

let chartConsos = null;
let chartCostEco = null;

const $ = function (s, r) { return (r || document).querySelector(s); };

const els = {
  rangeRoot: $("#chartRange"),
  c1:        $("#chart-consommations"),
  c2:        $("#chart-cout-eco"),
};

// -------------------- Helpers temps --------------------
var DAYS_FR = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
var MONTHS_FR = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];

function isoMonday(d) {
  var dt = new Date(d);
  var day = (dt.getDay() + 6) % 7; // 0 = lundi
  dt.setHours(0,0,0,0);
  dt.setDate(dt.getDate() - day);
  return dt;
}

function weeksInMonthBuckets(dt) {
  // retourne 5 seaux [S1..S5] indexés 0..4
  var first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  var offset = (first.getDay() + 6) % 7; // 0=lundi
  var daysInMonth = new Date(dt.getFullYear(), dt.getMonth()+1, 0).getDate();
  var buckets = [0,0,0,0,0];
  for (var day=1; day<=daysInMonth; day++) {
    var idx = Math.floor((day - 1 + offset) / 7);
    if (typeof buckets[idx] === "undefined" || buckets[idx] === null) buckets[idx] = 0; // compat
  }
  return buckets;
}

// -------------------- Agrégation séries --------------------
function sumEnabled(dayObj, modules) {
  if (!dayObj) return 0;
  var cigs = modules.cigs ? (dayObj.cigs || 0) : 0;
  var weed = modules.weed ? (dayObj.weed || 0) : 0;
  var alc  = modules.alcohol ? (dayObj.alcohol || 0) : 0;
  return cigs + weed + alc;
}

function buildSeries(range) {
  var store = getAllDaily() || {};
  var s = getSettings() || {};
  var modules = s.modules || { cigs:true, weed:true, alcohol:true };
  var todayKey = ymd();

  if (range === "day") {
    var binsD = [0,0,0,0];
    var labelsD = ["Matin","Après-midi","Soir","Nuit"];
    var today = store[todayKey] || {};
    var hours = today.hours || {};
    for (var h=0; h<24; h++) {
      var slot = (h>=6 && h<=11) ? 0 : (h>=12 && h<=17) ? 1 : (h>=18 && h<=22) ? 2 : 3;
      var types = hours[h] || {};
      var v = sumEnabled({ cigs: types.cigs, weed: types.weed, alcohol: types.alcohol }, modules);
      binsD[slot] += v;
    }
    return { labels: labelsD, data: binsD };
  }

  if (range === "week") {
    var base = isoMonday(new Date());
    var labelsW = DAYS_FR.slice(0);
    var binsW = [0,0,0,0,0,0,0];
    for (var i=0;i<7;i++) {
      var d = new Date(base); d.setDate(base.getDate()+i);
      var k = ymd(d);
      binsW[i] = sumEnabled(store[k], modules);
    }
    return { labels: labelsW, data: binsW };
  }

  if (range === "month") {
    var now = new Date();
    var first = new Date(now.getFullYear(), now.getMonth(), 1);
    var next = new Date(now.getFullYear(), now.getMonth()+1, 1);
    var offset = (first.getDay()+6)%7;
    var labelsM = ["Sem 1","Sem 2","Sem 3","Sem 4","Sem 5"];
    var binsM = [0,0,0,0,0];
    for (var d2 = new Date(first); d2 < next; d2.setDate(d2.getDate()+1)) {
      var idx = Math.floor((d2.getDate()-1 + offset) / 7);
      var k2 = ymd(d2);
      binsM[idx] += sumEnabled(store[k2], modules);
    }
    return { labels: labelsM, data: binsM };
  }

  var nowY = new Date();
  var labelsY = MONTHS_FR.slice(0);
  var binsY = new Array(12);
  for (var j=0;j<12;j++) binsY[j]=0;
  var firstY = new Date(nowY.getFullYear(),0,1);
  var nextY  = new Date(nowY.getFullYear()+1,0,1);
  for (var d3 = new Date(firstY); d3 < nextY; d3.setDate(d3.getDate()+1)) {
    var k3 = ymd(d3);
    var m = d3.getMonth();
    binsY[m] += sumEnabled(store[k3], modules);
  }
  return { labels: labelsY, data: binsY };
}

// -------------------- Chart options (communes) --------------------
function makeOptions(maxY) {
  var suggestedMax = (maxY === 0) ? 1 : Math.ceil(maxY * 1.1);
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: {
        grid: { display:false },
        ticks: { autoSkip: false, maxRotation: 0 }
      },
      y: {
        beginAtZero: true,
        suggestedMax: suggestedMax,
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
  try { if (chartConsos) { chartConsos.destroy(); chartConsos = null; } } catch(e){}
  try { if (chartCostEco) { chartCostEco.destroy(); chartCostEco = null; } } catch(e){}
}

// -------------------- Render charts --------------------
function renderCharts(range) {
  if (!els.c1 || !els.c2 || typeof Chart === "undefined") return;

  var series = buildSeries(range);
  var maxY = 0; for (var i=0;i<series.data.length;i++) if (series.data[i]>maxY) maxY=series.data[i];
  var options = makeOptions(maxY);

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
    options: options
  });

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
    options: options
  });
}

// -------------------- Range UI --------------------
function markActive(range) {
  var buttons = (els.rangeRoot && els.rangeRoot.querySelectorAll(".btn.pill[data-range]")) || [];
  for (var i=0;i<buttons.length;i++) {
    var b = buttons[i];
    b.classList.toggle("active", b.getAttribute("data-range") === range);
  }
}

function bindRangeUI() {
  if (!els.rangeRoot) return;
  els.rangeRoot.addEventListener("click", function(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest(".btn.pill[data-range]") : null;
    if (!btn) return;
    var range = btn.getAttribute("data-range");
    markActive(range);
    setCurrentRange(range);
    renderCharts(range);
  });
}

// -------------------- Init --------------------
function bootCharts() {
  var range;
  try { range = getCurrentRange(); } catch(e) { range = "day"; }
  range = range || "day";
  markActive(range);
  renderCharts(range);

  onState("sa:counts-updated", function () {
    var r;
    try { r = getCurrentRange(); } catch(e) { r = "day"; }
    renderCharts(r || "day");
  });
  onState("sa:range-changed",  function (e) {
    var r = (e && e.detail && e.detail.range) || (function(){ try{return getCurrentRange();}catch(_){return "day";} })();
    renderCharts(r || "day");
  });

  bindRangeUI();
}

export { bootCharts, renderCharts };
