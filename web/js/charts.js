// web/js/charts.js
import { state } from "./state.js";
import { startOfDay } from "./utils.js";

const DAY_MS = 86400000;

let range = "day"; // 'day' | 'week' | 'month'
let canvas, ctx;

function dprResize(cnv, wCSS) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(600, wCSS);
  const h = 280;
  cnv.style.width = "100%";
  cnv.width  = Math.floor(w * dpr);
  cnv.height = Math.floor(h * dpr);
  const c   = cnv.getContext("2d");
  c.setTransform(dpr,0,0,dpr,0,0);
  return c;
}

function getEnabledTypes() {
  const en = state.settings.enable || {};
  const t = [];
  if (en.cigs) t.push("cig");
  if (en.weed) t.push("weed");
  if (en.alcohol) t.push("beer","strong","liquor");
  return t.length ? t : ["cig","weed","beer","strong","liquor"];
}

function binsDay() {
  // 24 heures, labels toutes les 3h
  const a0 = startOfDay(new Date());
  const bins = Array.from({length:24}, ()=>0);
  const types = getEnabledTypes();
  for (const e of state.entries) {
    const t = new Date(e.ts);
    if (t >= a0 && t < new Date(+a0 + DAY_MS)) {
      if (!types.includes(e.type)) continue;
      bins[t.getHours()] += (e.qty||1);
    }
  }
  const labels = Array.from({length:24}, (_,h)=> h%3===0 ? String(h).padStart(2,"0")+"h" : "");
  return { labels, bins };
}

function binsWeek() {
  // Lundi -> Dimanche
  const a0 = startOfDay(new Date());
  const day = (a0.getDay()||7)-1; // 0..6 (lundi=0)
  const wA = new Date(+a0 - day*DAY_MS);
  const bins = Array.from({length:7}, ()=>0);
  const types = getEnabledTypes();
  for (const e of state.entries) {
    const t = new Date(e.ts);
    if (t < wA || t >= new Date(+wA + 7*DAY_MS)) continue;
    if (!types.includes(e.type)) continue;
    const idx = Math.floor((+t - +wA)/DAY_MS);
    bins[idx] += (e.qty||1);
  }
  const labels = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  return { labels, bins };
}

function binsMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last  = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const len = last.getDate();
  const bins = Array.from({length:len}, ()=>0);
  const types = getEnabledTypes();
  for (const e of state.entries) {
    const t = new Date(e.ts);
    if (t < first || t > last) continue;
    if (!types.includes(e.type)) continue;
    bins[t.getDate()-1] += (e.qty||1);
  }
  const labels = Array.from({length:len}, (_,i)=> (i+1)%2===1 ? String(i+1) : ""); // 1 sur 2
  return { labels, bins };
}

function totalDayLimit() {
  // somme des limites jour des catégories activées
  const en = state.settings.enable || {};
  const L = (state.settings.limits && state.settings.limits.day) || {};
  let s = 0;
  if (en.cigs) s += +L.cigs || 0;
  if (en.weed) s += +L.weed || 0;
  if (en.alcohol) s += +L.alcohol || 0; // total verres
  return s;
}

function draw() {
  if (!canvas) return;
  ctx = dprResize(canvas, canvas.clientWidth || canvas.parentElement.clientWidth || 900);

  // data
  const { labels, bins } =
    range === "day"   ? binsDay() :
    range === "week"  ? binsWeek() :
                        binsMonth();

  // dimensions
  const W = (canvas.width  / (window.devicePixelRatio||1));
  const H = (canvas.height / (window.devicePixelRatio||1));
  const P = { top:20, right:20, bottom:36, left:36 };

  // scale
  const maxVal = Math.max(4, ...bins);
  const yMax = Math.ceil(maxVal*1.2);
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  // clear
  ctx.clearRect(0,0,W,H);

  // axes
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  // X axis
  ctx.moveTo(P.left, H-P.bottom+.5);
  ctx.lineTo(W-P.right, H-P.bottom+.5);
  // Y ticks (0, 25%, 50%, 75%, 100%)
  for (let i=0;i<=4;i++){
    const y = P.top + innerH*(1 - i/4) + .5;
    ctx.moveTo(P.left, y);
    ctx.lineTo(W-P.right, y);
  }
  ctx.stroke();

  // bars
  const n = bins.length;
  const gap = 6;
  const barW = Math.max(6, (innerW - (n-1)*gap)/n);

  ctx.fillStyle = "#0ea5e9";
  bins.forEach((v,i)=>{
    const x = P.left + i*(barW+gap);
    const h = v<=0 ? 0 : Math.round((v / yMax) * innerH);
    const y = P.top + (innerH - h);
    ctx.fillRect(x, y, barW, h);
  });

  // limit line (Day only)
  if (range === "day") {
    const lim = totalDayLimit();
    if (lim > 0) {
      const y = P.top + innerH * (1 - (lim/yMax));
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.setLineDash([6,4]);
      ctx.beginPath();
      ctx.moveTo(P.left, y);
      ctx.lineTo(W-P.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // labels X
  ctx.fillStyle = "#475569";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
  ctx.textAlign = "center";
  const lblEvery = (range==="day") ? 1 : (range==="week" ? 1 : 2);
  labels.forEach((t,i)=>{
    if (!t) return;
    if (range==="day" && i%3!==0) return; // toutes les 3h
    if (range==="month" && i%2!==0) return;
    const x = P.left + i*(barW+gap) + barW/2;
    ctx.fillText(t, x, H - 12);
  });

  // labels Y (0, yMax)
  ctx.textAlign = "right";
  ctx.fillText("0", P.left-6, H-P.bottom);
  ctx.fillText(String(yMax), P.left-6, P.top+12);
}

function setActive(rangeBtn) {
  document.querySelectorAll("#chartRange .btn.pill").forEach(b=> b.classList.remove("active"));
  rangeBtn.classList.add("active");
}

export function initCharts() {
  canvas = document.getElementById("chartCanvas");
  if (!canvas) return;

  // boutons range
  const container = document.getElementById("chartRange");
  if (container) {
    container.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-range]");
      if (!btn) return;
      range = btn.dataset.range;
      setActive(btn);
      draw();
    });
  }

  // écouter les changements de données / réglages
  document.addEventListener("sa:changed", draw);
  document.addEventListener("sa:settingsSaved", draw);
  document.addEventListener("sa:imported", draw);

  // resize
  let raf;
  const onResize = ()=>{ cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  window.addEventListener("resize", onResize, { passive:true });

  // init
  // activer le bon bouton par défaut
  const first = document.querySelector('#chartRange [data-range="day"]');
  if (first) setActive(first);
  draw();
}
