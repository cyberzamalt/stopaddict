import { $, DAY_MS } from "./utils.js";
import { state, seriesDay, seriesWeek, seriesMonth, totalDailyLimit } from "./state.js";

/* Petit moteur de chart en SVG (sans lib) */
function linePath(points, x0, y0, xScale, yScale) {
  if (!points.length) return "";
  return points.map((v, i) => {
    const x = x0 + i * xScale;
    const y = y0 - v * yScale;
    return (i ? "L" : "M") + x + " " + y;
  }).join(" ");
}
function horizLine(yValue, n, x0, y0, xScale, yScale) {
  const y = y0 - yValue * yScale;
  const x1 = x0, x2 = x0 + (n - 1) * xScale;
  return `M${x1} ${y}L${x2} ${y}`;
}

function computeScales(values, innerW, innerH) {
  const vmax = Math.max(4, Math.max(0, ...values));   // plancher 4
  const padded = vmax + Math.ceil(vmax * 0.15);       // +15% headroom
  return { vmax: padded, yScale: innerH / padded };
}

function renderChart(container, labels, values, limitValue) {
  const W = 720, H = 260, pad = 30;
  const innerW = W - pad * 2, innerH = H - pad * 2;
  const n = values.length || 1;
  const x0 = pad, y0 = H - pad;
  const xScale = n > 1 ? innerW / (n - 1) : 1;

  const { yScale, vmax } = computeScales(values, innerW, innerH);

  container.innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Évolution">
    <defs>
      <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-opacity="0.18"></stop>
        <stop offset="100%" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    <g>
      <!-- axes -->
      <line x1="${pad}" y1="${y0}" x2="${W-pad}" y2="${y0}" class="axis"/>
      <line x1="${pad}" y1="${pad}" x2="${pad}"   y2="${H-pad}" class="axis"/>
      <!-- ticks Y -->
      ${[0, 0.25, 0.5, 0.75, 1].map(t=>{
        const y = y0 - t * vmax * yScale;
        const val = Math.round(t * vmax);
        return `<g class="grid">
          <line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}"></line>
          <text x="${pad-6}" y="${y+4}" class="yTick">${val}</text>
        </g>`;
      }).join("")}
      <!-- ticks X (quelques labels) -->
      ${labels.map((lb,i)=>{
        if (n<=8 || i===0 || i===Math.floor(n/2) || i===n-1) {
          const x = x0 + i*xScale;
          return `<text x="${x}" y="${H-8}" class="xTick" text-anchor="middle">${lb}</text>`;
        }
        return "";
      }).join("")}
      <!-- zone + ligne -->
      ${values.length ? (()=>{
        const path = linePath(values, x0, y0, xScale, yScale);
        const area = path + ` L ${x0 + (n-1)*xScale} ${y0} L ${x0} ${y0} Z`;
        return `
          <path d="${area}" class="area"></path>
          <path d="${path}" class="series"></path>
        `;
      })() : ""}
      <!-- limite -->
      ${limitValue>0 ? `<path d="${horizLine(limitValue, n, x0, y0, xScale, yScale)}" class="limitLine"></path>` : ""}
    </g>
  </svg>`;
}

function buildDayLabels()   { return Array.from({length:24},(_,h)=> (h<10?"0":"")+h+"h"); }
function buildWeekLabels(d0){ const days = ["L","M","M","J","V","S","D"]; return days; }
function buildMonthLabels(n){ return Array.from({length:n},(_,i)=> String(i+1)); }

export function initChart() {
  const wrap = $("#cardChart");
  const svgWrap = $("#chartRoot");
  const btns = wrap.querySelectorAll("[data-range]");
  let range = "day"; // par défaut Jour

  function render() {
    let labels = [], values = [], limit = totalDailyLimit(state); // somme des limites
    const now = new Date();

    if (range==="day") {
      values = seriesDay(state, now);            // 24 valeurs
      labels = buildDayLabels();
    } else if (range==="week") {
      const { values: v, labels: l } = seriesWeek(state, now);
      values = v; labels = l;                    // 7 valeurs, labels L..D
    } else {
      const { values: v, labels: l } = seriesMonth(state, now);
      values = v; labels = l;                    // n jours
    }
    renderChart(svgWrap, labels, values, limit);
  }

  btns.forEach(b=>{
    b.addEventListener("click", ()=>{
      btns.forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      range = b.dataset.range;
      render();
    });
  });

  // premières valeurs
  wrap.querySelector('[data-range="day"]').classList.add("active");
  render();

  // réagir aux changements globaux (ajouts, import, réglages)
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:imported", render);
  document.addEventListener("sa:settingsSaved", render);
}
