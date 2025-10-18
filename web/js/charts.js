// web/js/charts.js
// -----------------------------------------------------------------------------
// Charts sans dépendance externe (canvas 2D) pour Jour / Semaine / Mois.
// Corrige les abscisses "Jour" (00:00→23:00) et intègre la série "Économies"
// avec préférence de visibilité persistante (via economy.js).
//
// L’historique et les réglages sont lus en "best effort":
//  - via window.SA.state si dispo (déconseillé de modifier ailleurs),
//  - sinon via localStorage (plusieurs clés testées).
//
// Les boutons d'export restent gérés par web/js/export.js (initImportExport).
// Ici, on gère uniquement l’affichage du graphe et les boutons d’échelle.
// -----------------------------------------------------------------------------

import { isEconomyVisible, setEconomyVisible, computeEconomies } from "./economy.js";

// ---- Accès "best effort" aux données ----
function pickFirstLocalStorageKey(keys) {
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v) return JSON.parse(v);
    } catch {}
  }
  return null;
}
function getSettings() {
  // essaie fenêtre -> localStorage
  if (window?.SA?.state?.settings) return window.SA.state.settings;
  return pickFirstLocalStorageKey([
    "app_settings_v23", "settings", "sa_settings_v2"
  ]) || {};
}
function getHistory() {
  if (window?.SA?.state?.history) return window.SA.state.history;
  return pickFirstLocalStorageKey([
    "app_history_v23", "history", "sa_history_v2"
  ]) || [];
}

// ---- Utils temps/labels ----
function startOfLocalDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d){
  const x=startOfLocalDay(d); // lundi comme début de semaine
  const day=(x.getDay()||7)-1; // 0..6 (lundi=0)
  x.setDate(x.getDate()-day);
  return x;
}
function startOfMonth(d){ const x=startOfLocalDay(d); x.setDate(1); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtDay(d){ return d.toLocaleDateString(undefined,{weekday:"short", day:"2-digit"}); }
function fmtDate(d){ return d.toLocaleDateString(); }
function hoursLabels24(){ const lab=[]; for(let h=0;h<24;h++) lab.push(String(h).padStart(2,"0")+":00"); return lab; }

// ---- Buckets jour (24h) ----
function buildDayBuckets(history, dayDate, settings) {
  const buckets = {
    labels: hoursLabels24(),
    cigs: new Array(24).fill(0),
    weed: new Array(24).fill(0),
    alcohol: new Array(24).fill(0),
    cost: new Array(24).fill(0),
    savings: new Array(24).fill(0),
  };
  const d0 = startOfLocalDay(dayDate).getTime();
  const d1 = d0 + 24*3600*1000;

  // Injecte calcul économies JOUR si possible
  const econDaily = computeEconomies(history, settings)
    .filter(e => e.ts>=d0 && e.ts<d1)
    .reduce((acc,e)=>acc+(e.saving||0),0);

  for (const e of history) {
    const t = e?.ts|0; if (!t) continue;
    if (t<d0 || t>=d1) continue;
    const h = new Date(t).getHours();
    const q = Number(e?.qty ?? 1);
    if (e.type === "cigs")    buckets.cigs[h]    += q;
    else if (e.type === "weed")    buckets.weed[h]    += q;
    else if (e.type === "alcohol") buckets.alcohol[h] += q;

    if (e.cost) buckets.cost[h] += Number(e.cost);
  }

  // Répartir l'économie du jour à plat (option simple/visuelle)
  if (econDaily>0) {
    const step = econDaily / 24;
    for (let i=0;i<24;i++) buckets.savings[i]+=step;
  }
  return buckets;
}

// ---- Buckets semaine (7 jours) ----
function buildWeekBuckets(history, refDate, settings) {
  const week0 = startOfWeek(refDate).getTime(); // lundi 00:00
  const labels=[], C=new Array(7).fill(0), W=new Array(7).fill(0), A=new Array(7).fill(0), K=new Array(7).fill(0), S=new Array(7).fill(0);

  // économies par jour
  const econ = computeEconomies(history, settings);
  const econByDay = new Map(econ.map(e=>[e.ts, e.saving]));

  for (let i=0;i<7;i++){
    const d0 = week0 + i*86400000;
    const d1 = d0 + 86400000;
    labels.push(fmtDay(new Date(d0)));
    for (const e of history) {
      const t = e?.ts|0; if (!t || t<d0 || t>=d1) continue;
      const q = Number(e?.qty ?? 1);
      if (e.type === "cigs")    C[i]+=q;
      else if (e.type === "weed")    W[i]+=q;
      else if (e.type === "alcohol") A[i]+=q;
      if (e.cost) K[i]+=Number(e.cost);
    }
    if (econByDay.has(d0)) S[i]+=Number(econByDay.get(d0) || 0);
  }
  return { labels, cigs:C, weed:W, alcohol:A, cost:K, savings:S };
}

// ---- Buckets mois (jusqu’à 31 jours) ----
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function buildMonthBuckets(history, refDate, settings) {
  const d = startOfMonth(refDate);
  const y = d.getFullYear(), m = d.getMonth();
  const dim = daysInMonth(y,m);
  const labels=[], C=new Array(dim).fill(0), W=new Array(dim).fill(0), A=new Array(dim).fill(0), K=new Array(dim).fill(0), S=new Array(dim).fill(0);

  const econ = computeEconomies(history, settings);
  const econByDay = new Map(econ.map(e=>[e.ts, e.saving]));

  for (let i=1;i<=dim;i++){
    const d0 = new Date(y,m,i); d0.setHours(0,0,0,0);
    const d1 = new Date(y,m,i+1); d1.setHours(0,0,0,0);
    const idx = i-1;
    labels.push(String(i).padStart(2,"0"));
    for (const e of history) {
      const t = e?.ts|0; if (!t || t<d0.getTime() || t>=d1.getTime()) continue;
      const q = Number(e?.qty ?? 1);
      if (e.type === "cigs")    C[idx]+=q;
      else if (e.type === "weed")    W[idx]+=q;
      else if (e.type === "alcohol") A[idx]+=q;
      if (e.cost) K[idx]+=Number(e.cost);
    }
    const k = d0.getTime();
    if (econByDay.has(k)) S[idx]+=Number(econByDay.get(k) || 0);
  }
  return { labels, cigs:C, weed:W, alcohol:A, cost:K, savings:S };
}

// ---- Canvas rendu simple (lignes/aires minimalistes) ----
function clearCanvas(ctx, w, h){
  ctx.save();
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle="#ffffff";
  ctx.fillRect(0,0,w,h);
  ctx.restore();
}
function drawAxes(ctx, w, h, padding, yMax){
  ctx.save();
  ctx.strokeStyle="#e5e7eb";
  ctx.lineWidth=1;
  // Axe X
  ctx.beginPath();
  ctx.moveTo(padding, h-padding);
  ctx.lineTo(w-padding, h-padding);
  ctx.stroke();
  // graduations Y (5)
  const steps=5;
  ctx.fillStyle="#6b7280";
  ctx.font="10px system-ui, sans-serif";
  for (let i=0;i<=steps;i++){
    const y = h - padding - (i/steps)*(h-2*padding);
    ctx.beginPath();
    ctx.moveTo(padding-4, y);
    ctx.lineTo(w-padding, y);
    ctx.stroke();
    const val = Math.round((i/steps)*yMax);
    ctx.fillText(String(val), 6, y-2);
  }
  ctx.restore();
}
function plotLine(ctx, w, h, padding, labels, data, color, yMax){
  const n = data.length||0;
  if (!n || yMax<=0) return;
  ctx.save();
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.beginPath();
  for (let i=0;i<n;i++){
    const x = padding + (i/(n-1))*(w-2*padding);
    const y = h - padding - (data[i]/yMax)*(h-2*padding);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.restore();
}
function fillArea(ctx, w, h, padding, labels, data, color, yMax, alpha=0.12){
  const n = data.length||0;
  if (!n || yMax<=0) return;
  ctx.save();
  ctx.fillStyle=color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i=0;i<n;i++){
    const x = padding + (i/(n-1))*(w-2*padding);
    const y = h - padding - (data[i]/yMax)*(h-2*padding);
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  // fermer vers l'axe X
  ctx.lineTo(padding + (w-2*padding), h-padding);
  ctx.lineTo(padding, h-padding);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawLabelsX(ctx, w, h, padding, labels){
  ctx.save();
  ctx.fillStyle="#6b7280";
  ctx.font="10px system-ui, sans-serif";
  const n = labels.length||0;
  if (!n) return;
  const step = Math.max(1, Math.floor(n/8));
  for (let i=0;i<n;i+=step){
    const x = padding + (i/(n-1))*(w-2*padding);
    ctx.fillText(labels[i], x-12, h-padding+12);
  }
  ctx.restore();
}

// Palette discrète (pas de styles imposés par CSS)
const COLORS = {
  cigs:    "#3b82f6",
  weed:    "#22c55e",
  alcohol: "#f59e0b",
  cost:    "#0ea5e9",
  savings: "#10b981"
};

// Légende cliquable générée dynamiquement
function makeLegend(container, visible, onToggle) {
  container.innerHTML = "";
  const entries = [
    ["cigs","Cigarettes"],
    ["weed","Joints"],
    ["alcohol","Alcool"],
    ["cost","Coût"],
    ["savings","Économies"]
  ];
  for (const [key,label] of entries) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = label;
    chip.style.cssText = `
      margin:6px 6px 0 0; padding:6px 10px; border-radius:999px; border:2px solid ${COLORS[key]};
      background:${visible[key] ? COLORS[key] : "#fff"}; color:${visible[key] ? "#fff" : COLORS[key]};
      font-weight:800; font-size:12px; cursor:pointer;
    `;
    chip.addEventListener("click", ()=>onToggle(key));
    container.appendChild(chip);
  }
}

// ---- Rendu principal ----
function render(canvas, state) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const padding = 36;

  // data visibles selon toggles
  const { labels, series, visible } = state;

  // Y max auto (prend le max des séries visibles)
  let yMax = 0;
  for (const k of Object.keys(series)) {
    if (!visible[k]) continue;
    for (const v of series[k]) yMax = Math.max(yMax, v||0);
  }
  if (yMax <= 0) yMax = 5;

  clearCanvas(ctx, w, h);
  drawAxes(ctx, w, h, padding, yMax);
  drawLabelsX(ctx, w, h, padding, labels);

  // Aires douces pour coût/économies, lignes pour cigs/weed/alcool
  if (visible.cost)    fillArea(ctx, w, h, padding, labels, series.cost,    COLORS.cost,    yMax, 0.10);
  if (visible.savings) fillArea(ctx, w, h, padding, labels, series.savings, COLORS.savings, yMax, 0.12);

  if (visible.cigs)    plotLine(ctx, w, h, padding, labels, series.cigs,    COLORS.cigs,    yMax);
  if (visible.weed)    plotLine(ctx, w, h, padding, labels, series.weed,    COLORS.weed,    yMax);
  if (visible.alcohol) plotLine(ctx, w, h, padding, labels, series.alcohol, COLORS.alcohol, yMax);
}

// ---- Construction des séries selon l’échelle ----
function buildSeries(range, history, settings, refDate){
  if (range === "day") {
    const b = buildDayBuckets(history, refDate, settings);
    return {
      labels: b.labels,
      series: { cigs:b.cigs, weed:b.weed, alcohol:b.alcohol, cost:b.cost, savings:b.savings }
    };
  }
  if (range === "week") {
    const b = buildWeekBuckets(history, refDate, settings);
    return { labels:b.labels, series:{ cigs:b.cigs, weed:b.weed, alcohol:b.alcohol, cost:b.cost, savings:b.savings } };
  }
  // default: month
  const b = buildMonthBuckets(history, refDate, settings);
  return { labels:b.labels, series:{ cigs:b.cigs, weed:b.weed, alcohol:b.alcohol, cost:b.cost, savings:b.savings } };
}

// ---- init principal ----
export function initCharts() {
  const canvas = document.getElementById("chartCanvas");
  const legendHost = (() => {
    let host = document.getElementById("chart-legend");
    if (!host) {
      // On crée une petite zone de légende sous le canvas si elle n'existe pas
      const block = canvas?.closest(".chart-block");
      host = document.createElement("div");
      host.id = "chart-legend";
      host.style.margin = "4px 10px 0 10px";
      if (block) block.appendChild(host); else canvas?.parentNode?.appendChild(host);
    }
    return host;
  })();

  if (!canvas) {
    console.warn("[Charts] canvas#chartCanvas introuvable");
    return;
  }

  // état local
  let range = "day"; // "day" | "week" | "month"
  let refDate = Date.now();

  // visibilité séries (persisté pour économies uniquement)
  let visible = {
    cigs: true,
    weed: true,
    alcohol: true,
    cost: true,
    savings: isEconomyVisible() // important : ne jamais s'activer tout seul
  };

  // gestion des boutons d’échelle
  const rangeBar = document.getElementById("chartRange");
  if (rangeBar) {
    rangeBar.addEventListener("click", (ev) => {
      const btn = ev.target?.closest("[data-range]");
      if (!btn) return;
      const r = btn.getAttribute("data-range");
      if (r && (r==="day"||r==="week"||r==="month")) {
        for (const b of rangeBar.querySelectorAll(".pill")) b.classList.remove("active");
        btn.classList.add("active");
        range = r;
        drawNow();
      }
    });
  }

  function drawNow() {
    const history  = getHistory();
    const settings = getSettings();
    const { labels, series } = buildSeries(range, history, settings, refDate);

    // construire la légende à chaque draw (stateless, simple)
    makeLegend(legendHost, visible, (key)=>{
      // Persiste seulement pour "Économies"
      if (key === "savings") {
        const nv = !visible.savings;
        setEconomyVisible(nv);
        visible.savings = nv;
      } else {
        visible[key] = !visible[key];
      }
      drawNow();
    });

    render(canvas, { labels, series, visible });

    // Met à jour les petits totaux sous le titre si présents (facultatif)
    try {
      const sum = (arr)=>arr.reduce((a,b)=>a+(Number(b)||0),0);
      const elT = document.getElementById("stats-titre");
      const elC = document.getElementById("stats-clopes");
      const elW = document.getElementById("stats-joints");
      const elA = document.getElementById("stats-alcool");
      if (elT) {
        if (range==="day")   elT.textContent = "Aujourd'hui – " + fmtDate(new Date(refDate));
        if (range==="week")  elT.textContent = "Semaine du " + fmtDate(startOfWeek(refDate));
        if (range==="month") elT.textContent = "Mois de " + new Date(refDate).toLocaleDateString(undefined,{month:"long", year:"numeric"});
      }
      if (elC) elC.textContent = String(sum(series.cigs));
      if (elW) elW.textContent = String(sum(series.weed));
      if (elA) {
        const totA = sum(series.alcohol);
        const line = document.getElementById("stats-alcool-line");
        if (line) line.style.display = "block";
        elA.textContent = String(totA);
      }
    } catch {}
  }

  // premier draw
  drawNow();

  // Redessiner quand d'autres modules annoncent une mise à jour des données
  // (ex. counters.js, import/export, settings…)
  window.addEventListener("sa:data:changed", drawNow);
  window.addEventListener("sa:settings:changed", drawNow);
  window.addEventListener("sa:history:changed", drawNow);

  // Expose un petit hook pour d'autres modules si besoin
  try {
    window.SA = window.SA || {};
    window.SA.charts = { redraw: drawNow, setRange:(r)=>{range=r; drawNow();} };
  } catch {}
}
