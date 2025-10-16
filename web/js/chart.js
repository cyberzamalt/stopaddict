// web/js/charts.js
import { state } from "./state.js";
import { startOfDay } from "./utils.js";

const DAY_MS = 86400000;

function bucketizeDay(entries) {
  const a = startOfDay(new Date());
  const b = new Date(+a + DAY_MS - 1);
  const buckets = Array(24).fill(0);

  for (const e of entries) {
    const t = new Date(e.ts);
    if (t >= a && t <= b) {
      buckets[t.getHours()] += (e.qty || 1);
    }
  }
  return { labels: Array.from({length:24}, (_,h)=>`${h}h`), data: buckets };
}

function bucketizeWeek(entries) {
  const a = startOfDay(new Date());
  const day = (a.getDay() || 7) - 1; // 0..6 (lundi=0)
  a.setDate(a.getDate() - day);
  const buckets = Array(7).fill(0);
  for (const e of entries) {
    const t = startOfDay(new Date(e.ts));
    const idx = Math.floor((t - a)/DAY_MS);
    if (idx >= 0 && idx < 7) buckets[idx] += (e.qty || 1);
  }
  const labels = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  return { labels, data: buckets };
}

function bucketizeMonth(entries) {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const buckets = Array(days).fill(0);
  for (const e of entries) {
    const t = new Date(e.ts);
    if (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear()) {
      const d = t.getDate()-1;
      buckets[d] += (e.qty||1);
    }
  }
  const labels = Array.from({length:days}, (_,i)=> String(i+1));
  return { labels, data: buckets };
}

function getEnabledTypes() {
  const en = state.settings.enable || {};
  const all = [];
  if (en.cigs) all.push("cig");
  if (en.weed) all.push("weed");
  if (en.alcohol) all.push("beer","strong","liquor");
  return all.length ? all : ["cig","weed","beer","strong","liquor"];
}

function prepareData(range) {
  const types = getEnabledTypes();
  const list = state.entries.filter(e => types.includes(e.type));
  if (range === "week")  return bucketizeWeek(list);
  if (range === "month") return bucketizeMonth(list);
  return bucketizeDay(list);
}

function drawChart(ctx, labels, data, opts={}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0,0,W,H);

  const pad = 32;
  const innerW = W - pad*2;
  const innerH = H - pad*2;

  const maxVal = Math.max(1, ...data, opts.limitLine || 0);
  const barW = innerW / data.length;

  // Axes
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, H-pad);
  ctx.lineTo(W-pad, H-pad);
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, H-pad);
  ctx.stroke();

  // Bars
  ctx.fillStyle = "#0ea5e9";
  data.forEach((v,i)=>{
    const h = (v/maxVal) * (innerH-10);
    const x = pad + i*barW + 2;
    const y = H - pad - h;
    ctx.fillRect(x, y, Math.max(2, barW-4), h);
  });

  // Limit line (jour)
  if (opts.limitLine) {
    const y = H - pad - (opts.limitLine/maxVal) * (innerH-10);
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W-pad, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Labels X (échantillonnés)
  ctx.fillStyle = "#475569";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const skip = Math.ceil(labels.length / 12);
  labels.forEach((lab,i)=>{
    if (i % skip !== 0) return;
    const x = pad + i*barW + barW/2;
    ctx.fillText(lab, x-10, H - pad + 14);
  });
}

function computeDayLimit() {
  const L = (state.settings.limits && state.settings.limits.day) || {};
  const en = state.settings.enable || {};
  let limit = 0;
  if (en.cigs)    limit += +L.cigs    || 0;
  if (en.weed)    limit += +L.weed    || 0;
  if (en.alcohol) limit += +L.alcohol || 0;
  return limit || 0;
}

export function initCharts() {
  const canvas = document.getElementById("chartCanvas");
  const ctx = canvas.getContext("2d");
  const buttons = Array.from(document.querySelectorAll("#chartRange .btn"));

  let range = "day";
  function render() {
    const {labels, data} = prepareData(range);
    const opts = { limitLine: range === "day" ? computeDayLimit() : 0 };
    drawChart(ctx, labels, data, opts);
  }

  buttons.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      buttons.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      range = btn.dataset.range;
      render();
    });
  });

  render();

  // Réagir aux changements de données
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:settingsSaved", render);
  document.addEventListener("sa:imported", render);

  // Redessiner si resize (optionnel)
  window.addEventListener("resize", ()=> render());
}
