// web/js/charts.js
// Graphiques canvas natifs — Jour (4 tranches), Semaine (L→D), Mois (jours)
// Dépend de: state.entries (array: {ts:number|date, type:string, qty:number})
//            state.settings.enable { cigs, weed, alcohol }
//            state.settings.limits.day { cigs, weed, alcohol }
// Émet/écoute: redraw sur "sa:changed" | "sa:settingsSaved" | "sa:imported"

import { state } from "./state.js";
import { startOfDay } from "./utils.js";

let range = "day"; // "day" | "week" | "month"
let canvas, ctx;

const DAY_MS = 86400000;

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
  const en = (state.settings && state.settings.enable) || {};
  const t = [];
  if (en.cigs !== false)   t.push("cig","cig_class","cig_roul","cig_tube");
  if (en.weed !== false)   t.push("weed","joint","joints");
  if (en.alcohol !== false)t.push("beer","strong","liquor","alc_biere","alc_fort","alc_liqueur","alcohol");
  // fallback si rien
  return t.length ? t : ["cig","weed","beer","strong","liquor"];
}

/* ==========================
   BINS (agrégation) 
   ========================== */

function binsDay4() {
  // 4 tranches de 6h: 00–06, 06–12, 12–18, 18–24
  const a0 = startOfDay(new Date());
  const a1 = new Date(+a0 + DAY_MS);
  const bins = [0,0,0,0];
  const types = getEnabledTypes();
  for (const e of state.entries || []) {
    const t = new Date(e.ts);
    if (t < a0 || t >= a1) continue;
    if (!types.includes(e.type)) continue;
    const h = t.getHours();
    const idx = (h < 6) ? 0 : (h < 12) ? 1 : (h < 18) ? 2 : 3;
    bins[idx] += (e.qty || 1);
  }
  const labels = ["00–06","06–12","12–18","18–24"];
  return { labels, bins };
}

function binsWeek() {
  // Lundi -> Dimanche (semaine locale)
  const today0 = startOfDay(new Date());
  const dow = (today0.getDay() || 7) - 1; // 0..6 (lundi=0)
  const wA = new Date(+today0 - dow*DAY_MS);
  const wB = new Date(+wA + 7*DAY_MS);
  const labels = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const bins = [0,0,0,0,0,0,0];
  const types = getEnabledTypes();
  for (const e of (state.entries || [])) {
    const t = new Date(e.ts);
    if (t < wA || t >= wB) continue;
    if (!types.includes(e.type)) continue;
    const idx = Math.floor((+t - +wA)/DAY_MS);
    bins[idx] += (e.qty || 1);
  }
  return { labels, bins };
}

function binsMonth() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last  = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const len   = last.getDate();
  const labels = Array.from({length:len}, (_,i)=> String(i+1));
  const bins = Array.from({length:len}, ()=>0);
  const types = getEnabledTypes();
  for (const e of (state.entries || [])) {
    const t = new Date(e.ts);
    if (t < first || t > last) continue;
    if (!types.includes(e.type)) continue;
    bins[t.getDate()-1] += (e.qty || 1);
  }
  return { labels, bins };
}

/* ==========================
   DRAW
   ========================== */

function totalDayLimit() {
  // somme des limites jour (si présentes)
  const L = (state.settings && state.settings.limits && state.settings.limits.day) || {};
  const en = (state.settings && state.settings.enable) || {};
  let s = 0;
  if (en.cigs   !== false) s += (+L.cigs   || 0);
  if (en.weed   !== false) s += (+L.weed   || 0);
  if (en.alcohol!== false) s += (+L.alcohol|| 0);
  return s;
}

function draw() {
  if (!canvas) return;
  ctx = dprResize(canvas, canvas.clientWidth || canvas.parentElement.clientWidth || 900);

  const data =
    range === "day"  ? binsDay4() :
    range === "week" ? binsWeek() :
                       binsMonth();

  const labels = data.labels || [];
  const bins   = data.bins   || [];

  const W = (canvas.width  / (window.devicePixelRatio||1));
  const H = (canvas.height / (window.devicePixelRatio||1));
  const P = { top:20, right:20, bottom:36, left:36 };

  const maxVal = Math.max(4, ...bins);
  const yMax   = Math.ceil(maxVal * 1.2);
  const innerW = W - P.left - P.right;
  const innerH = H - P.top - P.bottom;

  ctx.clearRect(0,0,W,H);

  // axes + grid
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(P.left, H-P.bottom+.5);
  ctx.lineTo(W-P.right, H-P.bottom+.5);
  for (let i=0;i<=4;i++){
    const y = P.top + innerH*(1 - i/4) + .5;
    ctx.moveTo(P.left, y);
    ctx.lineTo(W-P.right, y);
  }
  ctx.stroke();

  // bars
  const n    = bins.length;
  const gap  = 6;
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
  labels.forEach((t,i)=>{
    const x = P.left + i*(barW+gap) + barW/2;
    // Pour le mois, alléger: afficher 1 label sur 2 si > 20 jours
    if (range==="month" && labels.length>20 && i%2===1) return;
    ctx.fillText(t, x, H - 12);
  });

  // labels Y
  ctx.textAlign = "right";
  ctx.fillText("0", P.left-6, H-P.bottom);
  ctx.fillText(String(yMax), P.left-6, P.top+12);
}

/* ==========================
   INIT
   ========================== */

function setActive(btn) {
  document.querySelectorAll("#chartRange .btn.pill").forEach(b=> b.classList.remove("active"));
  btn.classList.add("active");
}

export function initCharts() {
  canvas = document.getElementById("chartCanvas");
  if (!canvas) return;

  // boutons range
  const container = document.getElementById("chartRange");
  if (container) {
    container.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-range], .btn.pill");
      if (!btn) return;
      const r = btn.dataset.range || btn.textContent.trim().toLowerCase();
      if (r.startsWith("jour"))  range = "day";
      else if (r.startsWith("sem")) range = "week";
      else                          range = "month";
      setActive(btn);
      draw();
    });
    // activer "Jour" par défaut si présent
    const first = container.querySelector('[data-range="day"]') || container.querySelector('.btn.pill');
    if (first) setActive(first);
  }

  // événements data/réglages
  document.addEventListener("sa:changed", draw);
  document.addEventListener("sa:settingsSaved", draw);
  document.addEventListener("sa:imported", draw);

  // resize (throttle via RAF)
  let raf;
  const onResize = ()=>{ cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  window.addEventListener("resize", onResize, { passive:true });

  // premier rendu
  draw();
}
