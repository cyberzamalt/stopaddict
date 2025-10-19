// web/js/charts.js
//
// Objectif : rendre un graphe simple (canvas 2D, sans lib externe) + gérer les ranges Jour/Semaine/Mois.
// - Jour : 4 tranches fixes (Matin 6-12, Après-midi 12-18, Soir 18-24, Nuit 0-6).
//          Si pas de détail par tranche, on place le total de la journée dans la tranche courante (fallback).
// - Semaine : 7 barres (J-6 → J), totaux/jour.
// - Mois : 30 barres (J-29 → J), totaux/jour.
// - Exporte les vues CSV/JSON de la vue courante.
// - Emet `charts:totals` { range, totals } pour que stats.js mette à jour la bannière.
//
// Dépendances : state.js (on, emit, ymd, getDaily, getSettings, getTodayTotals, totalsHeader)

import { on, emit, ymd, getDaily, getSettings, getTodayTotals, totalsHeader } from "./state.js";

// ---------- Helpers DOM ----------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Binning Jour (4 tranches) ----------
function slotIndexFromHour(h) {
  // 0: Nuit [0-6), 1: Matin [6-12), 2: Aprèm [12-18), 3: Soir [18-24)
  if (h < 6)  return 0;
  if (h < 12) return 1;
  if (h < 18) return 2;
  return 3;
}
const DAY_SLOT_LABELS = ["Nuit", "Matin", "Après-midi", "Soir"];

// ---------- Récupération des totaux d’un jour ----------
function totalsForDate(d) {
  const key = ymd(d);
  const rec = getDaily(key) || {};
  // Les champs attendus côté state : cigs, weed, alcohol, cost
  const cigs    = Number(rec.cigs ?? 0);
  const weed    = Number(rec.weed ?? 0);
  const alcohol = Number(rec.alcohol ?? 0);
  const cost    = Number(rec.cost ?? 0);
  return { cigs, weed, alcohol, cost };
}

// ---------- Jeu de données selon range ----------
function buildDayData(today = new Date()) {
  // On essaye de lire un éventuel stockage par tranches 4 (optionnel)
  const key = ymd(today);
  const rec = getDaily(key) || {};

  // Structure attendue si existante : rec.daySlots?.{ cigs:[4], weed:[4], alcohol:[4] }
  const slots = rec.daySlots || null;

  const nowSlot = slotIndexFromHour(today.getHours());

  const bins = {
    labels: DAY_SLOT_LABELS.slice(),
    cigs:    [0,0,0,0],
    weed:    [0,0,0,0],
    alcohol: [0,0,0,0],
    cost:    [0,0,0,0],
  };

  if (slots &&
      Array.isArray(slots.cigs)    && slots.cigs.length === 4 &&
      Array.isArray(slots.weed)    && slots.weed.length === 4 &&
      Array.isArray(slots.alcohol) && slots.alcohol.length === 4) {
    bins.cigs    = slots.cigs.map(n => Number(n||0));
    bins.weed    = slots.weed.map(n => Number(n||0));
    bins.alcohol = slots.alcohol.map(n => Number(n||0));
    // coût approximé proportionnel : si rec.cost total existe, on le répartit au prorata cigs/weed/alcohol
    const totalUnits = bins.cigs.reduce((a,b)=>a+b,0) + bins.weed.reduce((a,b)=>a+b,0) + bins.alcohol.reduce((a,b)=>a+b,0);
    const totalCost  = Number(rec.cost ?? 0);
    if (totalUnits > 0 && totalCost > 0) {
      // répartition simple au pro-rata du volume d’unités par slot
      for (let i=0;i<4;i++){
        const u = bins.cigs[i] + bins.weed[i] + bins.alcohol[i];
        bins.cost[i] = totalCost * (u/totalUnits);
      }
    }
  } else {
    // Fallback : on place le total du jour dans la tranche courante
    const t = totalsForDate(today);
    bins.cigs[nowSlot]    = t.cigs;
    bins.weed[nowSlot]    = t.weed;
    bins.alcohol[nowSlot] = t.alcohol;
    bins.cost[nowSlot]    = t.cost;
  }

  // Totaux globaux de la vue (pour stats.js)
  const totals = {
    cigs:    bins.cigs.reduce((a,b)=>a+b,0),
    weed:    bins.weed.reduce((a,b)=>a+b,0),
    alcohol: bins.alcohol.reduce((a,b)=>a+b,0),
    cost:    bins.cost.reduce((a,b)=>a+b,0),
  };

  return { range:"day", labels: bins.labels, series: bins, totals };
}

function buildNDaysData(nDays = 7, today = new Date()) {
  // nDays = 7 (semaine), 30 (mois)
  const labels = [];
  const cigsArr = [];
  const weedArr = [];
  const alcoholArr = [];
  const costArr = [];

  for (let i = nDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = ymd(d);
    labels.push(k);
    const t = totalsForDate(d);
    cigsArr.push(t.cigs);
    weedArr.push(t.weed);
    alcoholArr.push(t.alcohol);
    costArr.push(t.cost);
  }

  const totals = {
    cigs:    cigsArr.reduce((a,b)=>a+b,0),
    weed:    weedArr.reduce((a,b)=>a+b,0),
    alcohol: alcoholArr.reduce((a,b)=>a+b,0),
    cost:    costArr.reduce((a,b)=>a+b,0),
  };

  return { range: (nDays===7?"week":"month"), labels, series: { cigs:cigsArr, weed:weedArr, alcohol:alcoholArr, cost:costArr }, totals };
}

// ---------- Rendu Canvas (barres simplifiées) ----------
function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
}

function drawAxes(ctx, w, h, padding) {
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Axe X
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  // Axe Y
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(padding, padding);
  ctx.stroke();
}

function maxInSeries(series) {
  const all = [];
  for (const k of ["cigs","weed","alcohol"]) {
    if (Array.isArray(series[k])) all.push(...series[k]);
  }
  const m = Math.max(0, ...all);
  return m || 1;
}

function drawBars(ctx, w, h, padding, labels, series) {
  // 3 séries superposées par catégorie (cigs/weed/alcohol)
  const n = labels.length;
  if (!n) return;
  const plotW = w - padding*2;
  const plotH = h - padding*2;
  const barW  = Math.max(4, Math.floor(plotW / (n*1.5)));

  const maxV = maxInSeries(series);
  const stepX = plotW / n;

  // Couleurs fixes (compatibles thème)
  const COLOR = {
    cigs:    "#3b82f6", // bleu
    weed:    "#22c55e", // vert
    alcohol: "#f59e0b", // orange
  };

  // Pour chaque label/barre
  labels.forEach((_, i) => {
    const x = padding + i*stepX + (stepX - barW)/2;

    // empilement
    let yBase = h - padding;
    const parts = [
      { key:"cigs",    val: Number(series.cigs?.[i] ?? 0),    color: COLOR.cigs },
      { key:"weed",    val: Number(series.weed?.[i] ?? 0),    color: COLOR.weed },
      { key:"alcohol", val: Number(series.alcohol?.[i] ?? 0), color: COLOR.alcohol },
    ];
    for (const p of parts) {
      const bh = (p.val / maxV) * (plotH * 0.92);
      const y  = yBase - bh;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, barW, bh);
      yBase = y;
    }
  });
}

function drawLabels(ctx, w, h, padding, labels) {
  ctx.fillStyle = "#6b7280";
  ctx.font = "10px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const n = labels.length;
  const plotW = w - padding*2;
  const stepX = plotW / n;
  const baseY = h - padding + 4;

  labels.forEach((lb, i) => {
    const x = padding + i*stepX + stepX/2;
    const txt = (lb.length > 8) ? lb.slice(5) : lb; // pour YYYY-MM-DD → MM-DD
    ctx.fillText(txt, x, baseY);
  });
}

// ---------- Export ----------
function exportCSV(current) {
  if (!current) return;
  const rows = [];
  if (current.range === "day") {
    rows.push(["Tranche","Cigarettes","Joints","Alcool","Coût (€)"]);
    current.labels.forEach((lb, i) => {
      rows.push([
        lb,
        current.series.cigs[i] ?? 0,
        current.series.weed[i] ?? 0,
        current.series.alcohol[i] ?? 0,
        (current.series.cost[i] ?? 0).toFixed(2)
      ]);
    });
  } else {
    rows.push(["Date","Cigarettes","Joints","Alcool","Coût (€)"]);
    current.labels.forEach((lb, i) => {
      rows.push([
        lb,
        current.series.cigs[i] ?? 0,
        current.series.weed[i] ?? 0,
        current.series.alcohol[i] ?? 0,
        (current.series.cost[i] ?? 0).toFixed(2)
      ]);
    });
  }
  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = `stopaddict_${current.range}_${Date.now()}.csv`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON(current) {
  if (!current) return;
  const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const name = `stopaddict_${current.range}_${Date.now()}.json`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- Init principal ----------
export function initCharts() {
  const canvas = $("#chartCanvas");
  if (!canvas || !canvas.getContext) {
    console.warn("[charts] canvas not found, skip");
    return;
  }
  const ctx = canvas.getContext("2d");
  const W = canvas.width  || 960;
  const H = canvas.height || 260;
  const PADDING = 28;

  let currentRange = "day"; // "day" | "week" | "month"
  let currentData  = null;

  function render(data) {
    currentData = data;
    // Nettoyage + axes
    clearCanvas(ctx, W, H);
    drawAxes(ctx, W, H, PADDING);

    // Barres
    drawBars(ctx, W, H, PADDING, data.labels, data.series);

    // Labels X
    drawLabels(ctx, W, H, PADDING, data.labels);

    // Emettre les totaux pour que stats.js mette à jour la bannière Stats
    emit("charts:totals", { range: data.range, totals: data.totals });
  }

  function recomputeAndRender() {
    const now = new Date();
    if (currentRange === "day")   render(buildDayData(now));
    if (currentRange === "week")  render(buildNDaysData(7,  now));
    if (currentRange === "month") render(buildNDaysData(30, now));
  }

  // Boutons de range
  $$("#chartRange .btn.pill").forEach(btn => {
    btn.addEventListener("click", () => {
      $$("#chartRange .btn.pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = btn.dataset.range || "day";
      recomputeAndRender();
    });
  });

  // Exports
  $("#btn-export-csv")?.addEventListener("click", () => exportCSV(currentData));
  $("#btn-export-stats")?.addEventListener("click", () => exportJSON(currentData));

  // Rafraîchir quand l’état change (ajouts, réglages, économie)
  on("state:changed",  recomputeAndRender);
  on("state:daily",    recomputeAndRender);
  on("state:economy",  recomputeAndRender);
  on("state:settings", recomputeAndRender);

  // Premier rendu
  recomputeAndRender();
}
