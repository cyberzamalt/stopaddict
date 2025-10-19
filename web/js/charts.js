// web/js/charts.js
// Chart minimaliste en Canvas 2D (zéro dépendance).
// - Écoute ui:chart-range (boutons Jour/Semaine/Mois)
// - Re-rend sur state:changed / state:daily / state:settings / state:economy
// - Émet charts:totals { range, totals: { units, cost } }
// - (Optionnel) Overlay de limites si limits.js envoie limits:thresholds { cigs, weed, alcohol, total? }

import { on, emit, getDaily, getSettings, getEconomy } from "./state.js";
import { startOfWeek, startOfMonth } from "./utils.js";

let currentRange = "day"; // "day" | "week" | "month"
let thresholds = null;    // { cigs?, weed?, alcohol?, total? } optionnel

// --- DOM ---
let canvas, ctx, DPR;
let rangeTabs;

// --- Style / mise en page ---
const PADDING = { l: 36, r: 10, t: 20, b: 32 };
const GRID_COLOR = "rgba(0,0,0,0.08)";
const AXIS_COLOR = "rgba(0,0,0,0.5)";
const LINE_COLOR = "#2563eb"; // ligne 'unités' (total)
const COST_COLOR = "#14b8a6"; // ligne 'coût'
const THRESH_COLOR = "rgba(239,68,68,0.8)"; // overlay limites (rouge)
const FONT = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

// --- Public ---
export function initCharts() {
  canvas = document.getElementById("chartCanvas");
  if (!canvas) {
    console.warn("[charts] #chartCanvas introuvable");
    return;
  }
  ctx = canvas.getContext("2d");
  DPR = window.devicePixelRatio || 1;
  setupHiDPICanvas(canvas, DPR);

  // Onglets (si présents) : la plupart du temps, settings.js émet ui:chart-range.
  rangeTabs = document.getElementById("chartRange");
  rangeTabs?.addEventListener("click", (ev) => {
    const b = ev.target?.closest("button[data-range]");
    if (!b) return;
    const range = b.dataset.range;
    if (!range) return;
    setActiveRangeTab(range);
    emit("ui:chart-range", { range });
  });

  // Écoute du bus
  on("ui:chart-range", ({ detail }) => {
    if (!detail?.range) return;
    currentRange = detail.range;
    render();
  });

  on("state:changed", render);
  on("state:daily", render);
  on("state:economy", render);
  on("state:settings", render);

  // Optionnel : overlay de limites
  on("limits:thresholds", ({ detail }) => {
    thresholds = detail || null;
    render();
  });

  // First paint
  setActiveRangeTab(currentRange);
  render();

  // Redimension
  window.addEventListener("resize", () => {
    setupHiDPICanvas(canvas, window.devicePixelRatio || 1);
    render();
  });
}

// --- Helpers data ---
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function sumAlcohol(a = {}) {
  // Autorise structure { beer, fort, liqueur } OU entier direct.
  if (typeof a === "number") return a;
  const { beer = 0, fort = 0, liqueur = 0 } = a;
  return (Number(beer) || 0) + (Number(fort) || 0) + (Number(liqueur) || 0);
}

function getPrices() {
  // Essaie economy puis settings (fallback)
  const eco = getEconomy?.() || {};
  const s = getSettings?.() || {};
  // Conventions tolérées : eco.priceCig, eco.priceJoint, eco.priceBeer, eco.priceFort, eco.priceLiqueur
  // ou s.prices = { cigs, weed, beer, fort, liqueur }
  const p = eco?.prices || s?.prices || {};
  return {
    cigs: Number(eco.priceCig ?? p.cigs ?? 0),
    weed: Number(eco.priceJoint ?? p.weed ?? 0),
    beer: Number(eco.priceBeer ?? p.beer ?? 0),
    fort: Number(eco.priceFort ?? p.fort ?? 0),
    liqueur: Number(eco.priceLiqueur ?? p.liqueur ?? 0),
  };
}

function costForDay(dailyObj) {
  const prices = getPrices();
  const cigs = Number(dailyObj?.cigs || dailyObj?.clopes || 0);
  const weed = Number(dailyObj?.weed || dailyObj?.joints || 0);
  const alc = dailyObj?.alcohol || dailyObj?.alcool || {};
  const beer = Number(alc.beer || 0);
  const fort = Number(alc.fort || 0);
  const liqueur = Number(alc.liqueur || 0);
  return (
    cigs * prices.cigs +
    weed * prices.weed +
    beer * prices.beer +
    fort * prices.fort +
    liqueur * prices.liqueur
  );
}

// --- Récupération des séries ---
// NOTE : on travaille à partir des "daily aggregates" stockés par jour.
// Pour le "Jour" (24h), si aucun journal horaire n'existe, on met le total du jour
// sur l'heure courante et 0 ailleurs (meilleur que de faux horaires).

function seriesDay() {
  const now = new Date();
  const key = ymd(now);
  const d = getDaily?.(key) || {};
  const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
  const byHour = new Array(24).fill(0);

  // Si un journal d'entrées existe dans le localStorage, on essaie de le lire (souplesse)
  // Clés tolerées : "sa_entries", "sa_log", "entries"
  const raw =
    localStorage.getItem("sa_entries") ||
    localStorage.getItem("sa_log") ||
    localStorage.getItem("entries");
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const e of arr) {
          // { ts, type, qty }
          const ts = new Date(e.ts || e.date || e.t || 0);
          if (ymd(ts) !== key) continue;
          const h = ts.getHours();
          const qty = Number(e.qty || 1) || 1;
          let v = 0;
          if (e.type === "cigs" || e.type === "clopes") v = qty;
          else if (e.type === "weed" || e.type === "joints") v = qty;
          else if (e.type === "alcohol" || e.type === "alcool") v = qty; // journal simplifié
          byHour[h] += v;
        }
      }
    } catch {
      // ignore
    }
  }

  // Si rien trouvé, on met le total du jour sur l'heure courante pour signifier l'activité
  const totalDay =
    Number(d?.cigs || d?.clopes || 0) +
    Number(d?.weed || d?.joints || 0) +
    sumAlcohol(d?.alcohol || d?.alcool || 0);

  if (byHour.every((x) => x === 0) && totalDay > 0) {
    byHour[new Date().getHours()] = totalDay;
  }

  const units = byHour;
  const cost = new Array(24).fill(0);
  // Coût proportionné : si journal existe on a déjà ventilé, sinon on met tout sur l'heure courante
  const dayCost = costForDay(d || {});
  if (units.reduce((a, b) => a + b, 0) > 0) {
    // répartir proportionnellement aux unités
    const sumU = units.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 24; i++) cost[i] = (dayCost * units[i]) / sumU;
  } else {
    cost[new Date().getHours()] = dayCost;
  }

  return { labels: hours, units, cost };
}

function seriesWeek() {
  const end = new Date(); // aujourd'hui inclus
  const start = startOfWeek(end, 1); // Lundi
  const days = [];
  const labels = [];
  const units = [];
  const cost = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = ymd(d);
    days.push(k);
    labels.push(k.slice(5)); // "MM-DD"
  }

  for (const k of days) {
    const obj = getDaily?.(k) || {};
    const u =
      Number(obj?.cigs || obj?.clopes || 0) +
      Number(obj?.weed || obj?.joints || 0) +
      sumAlcohol(obj?.alcohol || obj?.alcool || 0);
    units.push(u);
    cost.push(costForDay(obj));
  }

  return { labels, units, cost };
}

function seriesMonth() {
  const end = new Date();
  const start = startOfMonth(end);
  // On prend jusqu’à aujourd’hui
  const days = [];
  const labels = [];
  const units = [];
  const cost = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = ymd(d);
    days.push(k);
    labels.push(String(d.getDate()));
  }

  for (const k of days) {
    const obj = getDaily?.(k) || {};
    const u =
      Number(obj?.cigs || obj?.clopes || 0) +
      Number(obj?.weed || obj?.joints || 0) +
      sumAlcohol(obj?.alcohol || obj?.alcool || 0);
    units.push(u);
    cost.push(costForDay(obj));
  }

  return { labels, units, cost };
}

// --- Rendu ---
function render() {
  if (!ctx || !canvas) return;

  // Data
  let series;
  if (currentRange === "day") series = seriesDay();
  else if (currentRange === "week") series = seriesWeek();
  else series = seriesMonth();

  const { labels, units, cost } = series;
  const totals = {
    units: units.reduce((a, b) => a + b, 0),
    cost: Math.round(cost.reduce((a, b) => a + b, 0) * 100) / 100,
  };

  // Émettre pour la bannière de stats.js si elle écoute charts:totals
  emit("charts:totals", { range: currentRange, totals });

  // Clear
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Espace de tracé
  const W = canvas.width;
  const H = canvas.height;
  const plotL = Math.round(PADDING.l * DPR);
  const plotR = Math.round((W - PADDING.r * DPR));
  const plotT = Math.round(PADDING.t * DPR);
  const plotB = Math.round((H - PADDING.b * DPR));
  const plotW = plotR - plotL;
  const plotH = plotB - plotT;

  // Axes & grille
  ctx.save();
  ctx.font = `${12 * DPR}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
  ctx.fillStyle = AXIS_COLOR;
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1 * DPR;

  // Y scale (basée sur max(units, cost))
  const maxUnits = Math.max(1, Math.max(...units));
  const maxCost  = Math.max(1, Math.max(...cost));
  const yMax = Math.max(maxUnits, maxCost);
  const yTicks = 4;
  for (let i = 0; i <= yTicks; i++) {
    const y = plotB - (i / yTicks) * plotH;
    ctx.beginPath();
    ctx.moveTo(plotL, y);
    ctx.lineTo(plotR, y);
    ctx.stroke();
    const v = Math.round((i / yTicks) * yMax);
    ctx.fillStyle = AXIS_COLOR;
    ctx.fillText(String(v), (PADDING.l - 24) * DPR, y - 2 * DPR);
    ctx.fillStyle = GRID_COLOR;
  }

  // X labels (rarefaction pour lisibilité)
  const n = labels.length;
  const step = Math.ceil(n / 8);
  ctx.fillStyle = AXIS_COLOR;
  for (let i = 0; i < n; i += step) {
    const x = plotL + (i / Math.max(1, n - 1)) * plotW;
    const lbl = String(labels[i]);
    const tx = x - (ctx.measureText(lbl).width / 2);
    ctx.fillText(lbl, tx, plotB + 14 * DPR);
  }

  // Fonctions d’échelle
  const xAt = (i) => plotL + (i / Math.max(1, n - 1)) * plotW;
  const yAt = (v) => plotB - (v / yMax) * plotH;

  // Lignes Units (bleu) & Cost (turquoise)
  drawLine(units, xAt, yAt, LINE_COLOR, 2 * DPR);
  drawLine(cost,  xAt, yAt, COST_COLOR, 2 * DPR);

  // (Optionnel) Seuils
  if (thresholds && typeof thresholds === "object") {
    // Si un seuil 'total' existe, on l’affiche en priorité ; sinon, si 'cigs'/'weed'/'alcohol' existent,
    // on affiche la somme comme repère visuel.
    let thr = Number(thresholds.total || 0);
    if (!thr) {
      thr =
        Number(thresholds.cigs || 0) +
        Number(thresholds.weed || 0) +
        Number(thresholds.alcohol || 0);
    }
    if (thr > 0) {
      ctx.strokeStyle = THRESH_COLOR;
      ctx.lineWidth = 1.5 * DPR;
      ctx.setLineDash([4 * DPR, 4 * DPR]);
      const y = yAt(thr);
      ctx.beginPath();
      ctx.moveTo(plotL, y);
      ctx.lineTo(plotR, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = THRESH_COLOR;
      ctx.fillText(String(thr), (PADDING.l - 28) * DPR, y - 2 * DPR);
    }
  }

  ctx.restore();
}

// --- dessin d’une polyligne ---
function drawLine(arr, xAt, yAt, color, width) {
  if (!arr || arr.length === 0) return;
  const n = arr.length;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = xAt(i);
    const y = yAt(arr[i] || 0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

// --- HiDPI ---
function setupHiDPICanvas(c, dpr) {
  const cssW = c.getAttribute("width") ? Number(c.getAttribute("width")) : c.clientWidth || 960;
  const cssH = c.getAttribute("height") ? Number(c.getAttribute("height")) : c.clientHeight || 260;
  c.style.width = cssW + "px";
  c.style.height = cssH + "px";
  c.width = Math.round(cssW * dpr);
  c.height = Math.round(cssH * dpr);
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// --- UI ---
function setActiveRangeTab(range) {
  if (!rangeTabs) return;
  for (const b of rangeTabs.querySelectorAll("button[data-range]")) {
    b.classList.toggle("active", b.dataset.range === range);
  }
}
