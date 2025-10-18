// web/js/charts.js
// -----------------------------------------------------------------------------
// Graphiques Jour / Semaine / Mois sur <canvas id="chartCanvas">,
// + maj du bandeau Stats (#stats-titre, #stats-*) et boutons d'échelle (#chartRange).
// + options cocher/décocher des séries (Cigarettes / Joints / Alcool / Coût).
// + OVERLAY limites (lignes horizontales) via window.SA.limits.perBucket(range).
// - Corrige l'échelle "Jour" : abscisses = heures locales 0..23 (pas d'UTC).
// - Utilise window.SA.economy (si présent) pour la série "Coût".
// -----------------------------------------------------------------------------

const LS_KEYS = {
  HISTORY: "app_history_v23",
  CHART_SERIES: "app_chart_series_v23", // persiste (cigs/weed/alcohol/cost) activés
};
const DEFAULT_SERIES = { cigs: true, weed: true, alcohol: true, cost: true };

function getHistory() {
  if (window?.SA?.state?.history) return window.SA.state.history;
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || "null");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function getSeriesPrefs() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEYS.CHART_SERIES) || "null");
    return { ...DEFAULT_SERIES, ...(v||{}) };
  } catch { return { ...DEFAULT_SERIES }; }
}
function setSeriesPrefs(p) {
  try { localStorage.setItem(LS_KEYS.CHART_SERIES, JSON.stringify(p)); } catch {}
}

// ----- Dates util -----
const DAY = 24*60*60*1000;

function startOfLocalDay(ts=Date.now()) {
  const d = new Date(ts);
  d.setHours(0,0,0,0);
  return d.getTime();
}
function mondayOfWeek(ts=Date.now()) {
  const d = new Date(ts);
  const day = (d.getDay() || 7) - 1; // Lundi=0
  d.setDate(d.getDate()-day);
  d.setHours(0,0,0,0);
  return d.getTime();
}
function monthBounds(ts=Date.now()) {
  const d = new Date(ts);
  const first = new Date(d.getFullYear(), d.getMonth(), 1); first.setHours(0,0,0,0);
  const next = new Date(d.getFullYear(), d.getMonth()+1, 1); next.setHours(0,0,0,0);
  return [first.getTime(), next.getTime()];
}

// ----- Agrégation -----
function aggregate(range) {
  const hist = getHistory();
  const now = Date.now();
  const out = { labels: [], cigs: [], weed: [], alcohol: [], cost: [] };

  if (range === "day") {
    const d0 = startOfLocalDay(now), d1 = d0 + DAY;
    const buckets = Array.from({length:24}, (_,h)=>({h, c:0, w:0, a:0, entries:[]}));
    for (const e of hist) {
      const t = +e.ts || 0;
      if (t < d0 || t >= d1) continue;
      const h = new Date(t).getHours(); // LOCAL hour
      const b = buckets[h];
      const qty = Number(e.qty||1);
      if (e.type==="cigs") b.c += qty;
      else if (e.type==="weed") b.w += qty;
      else if (e.type==="alcohol") b.a += qty;
      b.entries.push(e);
    }
    const eco = window?.SA?.economy;
    for (const b of buckets) {
      out.labels.push(String(b.h).padStart(2,"0")+"h");
      out.cigs.push(b.c);
      out.weed.push(b.w);
      out.alcohol.push(b.a);
      out.cost.push(eco ? eco.costFor(b.entries) : 0);
    }
    return out;
  }

  if (range === "week") {
    const t0 = mondayOfWeek(now), t1 = t0 + 7*DAY;
    const buckets = Array.from({length:7}, (_,i)=>({i, c:0, w:0, a:0, entries:[], ts:t0+i*DAY}));
    for (const e of hist) {
      const t = +e.ts || 0;
      if (t < t0 || t >= t1) continue;
      const idx = Math.floor((t - t0)/DAY);
      const b = buckets[idx];
      const qty = Number(e.qty||1);
      if (e.type==="cigs") b.c += qty;
      else if (e.type==="weed") b.w += qty;
      else if (e.type==="alcohol") b.a += qty;
      b.entries.push(e);
    }
    const wd = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    const eco = window?.SA?.economy;
    for (let i=0;i<buckets.length;i++) {
      const b = buckets[i];
      out.labels.push(wd[i]);
      out.cigs.push(b.c);
      out.weed.push(b.w);
      out.alcohol.push(b.a);
      out.cost.push(eco ? eco.costFor(b.entries) : 0);
    }
    return out;
  }

  // month
  const [m0, mN] = monthBounds(now);
  const days = Math.round((mN - m0)/DAY);
  const buckets = Array.from({length:days}, (_,i)=>({i, c:0, w:0, a:0, entries:[], ts: m0 + i*DAY}));
  for (const e of hist) {
    const t = +e.ts || 0;
    if (t < m0 || t >= mN) continue;
    const idx = Math.floor((t - m0)/DAY);
    const b = buckets[idx];
    const qty = Number(e.qty||1);
    if (e.type==="cigs") b.c += qty;
    else if (e.type==="weed") b.w += qty;
    else if (e.type==="alcohol") b.a += qty;
    b.entries.push(e);
  }
  const eco = window?.SA?.economy;
  for (let i=0;i<buckets.length;i++) {
    const b = buckets[i];
    out.labels.push(String(i+1));
    out.cigs.push(b.c);
    out.weed.push(b.w);
    out.alcohol.push(b.a);
    out.cost.push(eco ? eco.costFor(b.entries) : 0);
  }
  return out;
}

// ----- Stats header (bandeau vert dans l'écran Stats) -----
function updateStatsHeader(range, agg) {
  const elTitle = document.getElementById("stats-titre");
  const elC = document.getElementById("stats-clopes");
  const elW = document.getElementById("stats-joints");
  const elA = document.getElementById("stats-alcool");
  const elALine = document.getElementById("stats-alcool-line");

  const sum = (arr)=>arr.reduce((a,b)=>a+(Number(b)||0),0);

  const totalC = sum(agg.cigs);
  const totalW = sum(agg.weed);
  const totalA = sum(agg.alcohol);

  if (elC) elC.textContent = String(totalC);
  if (elW) elW.textContent = String(totalW);
  if (elA) elA.textContent = String(totalA);
  if (elALine) elALine.style.display = (totalA>0) ? "" : "none";

  const now = new Date();
  let title = "—";
  if (range==="day") {
    const opts = { weekday:"long", day:"2-digit", month:"long" };
    title = "Aujourd’hui – " + now.toLocaleDateString(undefined,opts);
  } else if (range==="week") {
    const t0 = new Date(mondayOfWeek(now));
    const t1 = new Date(t0.getTime()+6*DAY);
    title = `Semaine du ${t0.toLocaleDateString()} au ${t1.toLocaleDateString()}`;
  } else {
    const opts = { month:"long", year:"numeric" };
    title = now.toLocaleDateString(undefined, opts);
  }
  if (elTitle) elTitle.textContent = title;
}

// ----- UI: toggles séries -----
function ensureSeriesToggles() {
  let host = document.getElementById("chart-actions");
  if (!host) host = document.getElementById("ecran-stats");
  if (!host) return;

  if (!document.getElementById("series-toggles")) {
    const wrap = document.createElement("div");
    wrap.id = "series-toggles";
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "repeat(4, minmax(0,1fr))";
    wrap.style.gap = "6px";
    wrap.style.margin = "8px 10px 0";
    wrap.innerHTML = `
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="tg-cigs"> Cigarettes
      </label>
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="tg-weed"> Joints
      </label>
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="tg-alcohol"> Alcool
      </label>
      <label style="display:flex;align-items:center;gap:6px">
        <input type="checkbox" id="tg-cost"> Coût
      </label>
    `;
    host.appendChild(wrap);
  }

  const prefs = getSeriesPrefs();
  const map = [
    ["tg-cigs", "cigs"],
    ["tg-weed", "weed"],
    ["tg-alcohol", "alcohol"],
    ["tg-cost", "cost"],
  ];
  for (const [id, key] of map) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.checked = !!prefs[key];
    el.onchange = () => {
      const p = getSeriesPrefs();
      p[key] = !!el.checked;
      setSeriesPrefs(p);
      render(); // redraw
    };
  }
}

// ----- Canvas chart (barres empilées + courbe coût + overlays limites) -----
function drawChart(range, agg, prefs) {
  const canvas = document.getElementById("chartCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // Clear
  ctx.clearRect(0,0,W,H);

  // Padding
  const padL = 42, padR = 28, padT = 10, padB = 42; // + marge droite pour légendes

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Data prep
  const n = agg.labels.length;
  const sum = (arr)=>arr.reduce((a,b)=>a+(Number(b)||0),0);
  const maxStack = [];
  for (let i=0;i<n;i++) {
    const c = prefs.cigs ? +agg.cigs[i]||0 : 0;
    const w = prefs.weed ? +agg.weed[i]||0 : 0;
    const a = prefs.alcohol ? +agg.alcohol[i]||0 : 0;
    maxStack.push(c+w+a);
  }
  const maxBars = Math.max(1, ...maxStack);

  // cost axis scale separated
  const maxCost = prefs.cost ? Math.max(1, ...agg.cost.map(v=>+v||0)) : 1;

  // Axes Y (bar)
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let g=0; g<=4; g++){
    const y = padT + innerH * (g/4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
  }

  // map value -> y pixel
  const yBar = (v)=> padT + innerH * (1 - (v / maxBars));
  const yCost = (v)=> padT + innerH * (1 - (v / maxCost));

  // Bars stacked
  const gap = 4;
  const bw = innerW / Math.max(1,n);
  const bx = (i)=> padL + i*bw + gap/2;
  const barW = Math.max(2, bw - gap);

  function rect(x,y,w,h, color){
    ctx.fillStyle = color;
    ctx.fillRect(x,y,w,h);
  }

  for (let i=0;i<n;i++) {
    let y0 = yBar(0);
    const c = prefs.cigs ? +agg.cigs[i]||0 : 0;
    const w = prefs.weed ? +agg.weed[i]||0 : 0;
    const a = prefs.alcohol ? +agg.alcohol[i]||0 : 0;

    const hC = innerH * (c / maxBars);
    const hW = innerH * (w / maxBars);
    const hA = innerH * (a / maxBars);

    const x = bx(i);
    // order: cigs (bleu), weed (vert), alcool (orange)
    if (c>0) { rect(x, y0 - hC, barW, hC, "#3b82f6"); y0 -= hC; }
    if (w>0) { rect(x, y0 - hW, barW, hW, "#22c55e"); y0 -= hW; }
    if (a>0) { rect(x, y0 - hA, barW, hA, "#f59e0b"); y0 -= hA; }
  }

  // Cost line
  if (prefs.cost) {
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i=0;i<n;i++) {
      const v = +agg.cost[i] || 0;
      const x = bx(i) + barW/2;
      const y = yCost(v);
      if (i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // small dots
    ctx.fillStyle = "#111827";
    for (let i=0;i<n;i++) {
      const v = +agg.cost[i] || 0;
      const x = bx(i) + barW/2;
      const y = yCost(v);
      ctx.beginPath();
      ctx.arc(x,y,2.5,0,Math.PI*2);
      ctx.fill();
    }
  }

  // ----- Overlays limites -----
  const LIM = window?.SA?.limits?.perBucket?.(range);
  if (LIM) {
    const overlays = [];
    if (prefs.cigs && LIM.cigs > 0) overlays.push({val:LIM.cigs, color:"#3b82f6", label:"Lim. cigs"});
    if (prefs.weed && LIM.weed > 0) overlays.push({val:LIM.weed, color:"#22c55e", label:"Lim. joints"});
    if (prefs.alcohol && LIM.alcohol > 0) overlays.push({val:LIM.alcohol, color:"#f59e0b", label:"Lim. alcool"});

    ctx.setLineDash([6,4]);
    ctx.lineWidth = 1.5;
    overlays.forEach((o, idx)=>{
      const y = yBar(o.val);
      if (y >= padT && y <= padT+innerH) {
        ctx.strokeStyle = o.color + "CC"; // un peu transparent
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(W - padR, y);
        ctx.stroke();

        // petite légende à droite
        ctx.fillStyle = o.color;
        ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const txt = `${o.label} ${Math.round(o.val*100)/100}`;
        ctx.fillText(txt, W - padR + 2, Math.min(padT+innerH-10, Math.max(padT+10, y - 10 + idx*14)));
      }
    });
    ctx.setLineDash([]);
  }

  // X labels
  ctx.fillStyle = "#6b7280";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i=0;i<n;i++) {
    const x = bx(i) + barW/2;
    const lbl = agg.labels[i];
    ctx.fillText(lbl, x, H - padB + 6);
  }

  // Y labels (bars)
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let g=0; g<=4; g++){
    const val = Math.round(maxBars * (g/4));
    const y = padT + innerH * (1 - (g/4));
    ctx.fillText(String(val), padL - 6, y);
  }
  // Y label cost (right)
  if (prefs.cost) {
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("€", W - padR + 2, padT + 10);
  }
}

// ----- Render -----
let currentRange = "day";

function render() {
  const prefs = getSeriesPrefs();
  const agg = aggregate(currentRange);
  updateStatsHeader(currentRange, agg);
  drawChart(currentRange, agg, prefs);
}

// ----- Wiring -----
function wireRangeButtons() {
  const host = document.getElementById("chartRange");
  if (!host) return;
  host.querySelectorAll(".btn.pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      host.querySelectorAll(".btn.pill").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = btn.dataset.range || "day";
      render();
    });
  });
}

export function initCharts() {
  wireRangeButtons();
  ensureSeriesToggles();
  render();

  // redraw when underlying data/settings change
  window.addEventListener("sa:history:changed", render);
  window.addEventListener("sa:data:changed", render);
  window.addEventListener("sa:settings:changed", render);
  window.addEventListener("sa:economy:changed", render);
  window.addEventListener("sa:limits:changed", render);
}
