/* web/js/stats.js — Stats V2 (2 graphiques + axes temps) */

import { DefaultState, loadState, saveState, todayKey, fmtMoney } from './state.js';

let chartQty = null;
let chartMoney = null;
let _period = "week"; // défaut: semaine
const KINDS = ["cigs","joints","beer","hard","liqueur"];
const LABELS = { cigs:"Cigarettes", joints:"Joints", beer:"Bière", hard:"Alcool fort", liqueur:"Liqueur" };

/* ---------- utils ---------- */
const $  = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);
function pad2(n){return String(n).padStart(2,"0");}
function ymd(d){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;}
function frDate(d){return d.toLocaleDateString("fr-FR");}
function lastDayOfMonth(y,m){return new Date(y,m+1,0).getDate();}
function monday(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x; }
function clone(d){ return new Date(d.getTime()); }

/* ---------- DOM upgrade (injecte 2 canvases si absents) ---------- */
function ensureStatsLayout(){
  const page = $("#page-stats");
  if(!page) return;

  // Zone des actions déjà présente (périodes, export/import)
  let actions = page.querySelector(".chart-actions");
  if(!actions){
    actions = document.createElement("div");
    actions.className = "chart-actions";
    actions.innerHTML = `
      <button id="btnPeriod-day" class="btn">Jour</button>
      <button id="btnPeriod-week" class="btn">Semaine</button>
      <button id="btnPeriod-month" class="btn">Mois</button>
      <button id="btnPeriod-year" class="btn">Année</button>
      <button id="btn-export-csv" class="btn small">Exporter CSV</button>
      <button id="btn-export-json" class="btn small">Exporter JSON</button>
      <label class="btn small">Importer JSON <input id="file-import-json" type="file" accept="application/json" hidden /></label>
    `;
    page.appendChild(actions);
  }

  // En-tête période/date
  let kpi = page.querySelector(".kpi-block");
  if(!kpi){
    kpi = document.createElement("div");
    kpi.className = "kpi-block";
    kpi.innerHTML = `<h3>Période</h3> <div id="stats-date">—</div>`;
    page.insertBefore(kpi, actions);
  } else if(!$("#stats-date")) {
    const dateDiv = document.createElement("div");
    dateDiv.id = "stats-date";
    kpi.appendChild(dateDiv);
  }

  // Bloc(s) graphiques : 2 canvases
  if(!$("#chart-qty") || !$("#chart-money")){
    // Supprime l'ancien bloc unique s'il existe
    page.querySelectorAll(".chart-block").forEach(el=>el.remove());
    const block1 = document.createElement("div");
    block1.className = "chart-block";
    block1.innerHTML = `<canvas id="chart-qty"></canvas>`;
    const block2 = document.createElement("div");
    block2.className = "chart-block";
    block2.innerHTML = `<canvas id="chart-money"></canvas>`;
    page.appendChild(block1);
    page.appendChild(block2);
  }
}

/* ---------- agrégation par période ---------- */
function buildSeries(period, ref = new Date()){
  const S = loadState(); // toujours relire l’état courant
  const hist = S.history || {};

  const qtySeries = { cigs:[], joints:[], beer:[], hard:[], liqueur:[] };
  const moneySeries = { cost:[], saved:[] };
  let labels = [];

  if (period === "day") {
    // Sans journal par tranche horaire, on affiche un total "Aujourd’hui"
    const k = todayKey(ref);
    const d = hist[k] || {};
    labels = ["Aujourd’hui"];
    KINDS.forEach(kd => qtySeries[kd].push(Number(d[kd]||0)));
    moneySeries.cost.push(Number(d.cost||0));
    moneySeries.saved.push(Number(d.saved||0));
    $("#stats-date") && ($("#stats-date").textContent = frDate(ref));
  }
  else if (period === "week") {
    const start = monday(ref);
    labels = ["Lun.","Mar.","Mer.","Jeu.","Ven.","Sam.","Dim."];
    for(let i=0;i<7;i++){
      const cur = clone(start); cur.setDate(start.getDate()+i);
      const key = ymd(cur);
      const d = hist[key] || {};
      KINDS.forEach(kd => qtySeries[kd].push(Number(d[kd]||0)));
      moneySeries.cost.push(Number(d.cost||0));
      moneySeries.saved.push(Number(d.saved||0));
    }
    const end = clone(start); end.setDate(start.getDate()+6);
    $("#stats-date") && ($("#stats-date").textContent = `${frDate(start)} → ${frDate(end)}`);
  }
  else if (period === "month") {
    const y = ref.getFullYear(), m = ref.getMonth();
    const last = lastDayOfMonth(y,m);
    labels = Array.from({length:last}, (_,i)=> String(i+1));
    for(let day=1; day<=last; day++){
      const key = `${y}-${pad2(m+1)}-${pad2(day)}`;
      const d = hist[key] || {};
      KINDS.forEach(kd => qtySeries[kd].push(Number(d[kd]||0)));
      moneySeries.cost.push(Number(d.cost||0));
      moneySeries.saved.push(Number(d.saved||0));
    }
    $("#stats-date") && ($("#stats-date").textContent = `${pad2(m+1)}/${y}`);
  }
  else if (period === "year") {
    const y = ref.getFullYear();
    labels = ["Janv.","Févr.","Mars","Avr.","Mai","Juin","Juil.","Août","Sept.","Oct.","Nov.","Déc."];
    for(let m=0; m<12; m++){
      let agg = { cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0 };
      const ld = lastDayOfMonth(y,m);
      for(let d=1; d<=ld; d++){
        const key = `${y}-${pad2(m+1)}-${pad2(d)}`;
        const h = hist[key] || {};
        KINDS.forEach(kd => agg[kd] += Number(h[kd]||0));
        agg.cost  += Number(h.cost||0);
        agg.saved += Number(h.saved||0);
      }
      KINDS.forEach(kd => qtySeries[kd].push(agg[kd]));
      moneySeries.cost.push(agg.cost);
      moneySeries.saved.push(agg.saved);
    }
    $("#stats-date") && ($("#stats-date").textContent = String(y));
  }

  return { labels, qtySeries, moneySeries, currency: S.currency };
}

/* ---------- rendu Chart.js ---------- */
function renderCharts(){
  if (typeof Chart === "undefined") return;

  const ref = new Date();
  const { labels, qtySeries, moneySeries, currency } = buildSeries(_period, ref);

  // Quantités (stacked bars, 5 datasets)
  const ctxQ = $("#chart-qty")?.getContext("2d");
  if (chartQty) chartQty.destroy();
  if (ctxQ){
    chartQty = new Chart(ctxQ, {
      type: "bar",
      data: {
        labels,
        datasets: KINDS.map(k=>({
          label: LABELS[k],
          data: qtySeries[k],
          // couleurs par défaut de Chart.js (on ne fixe pas de couleurs)
          borderWidth: 1,
          stack: "qty"
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, title: { display:true, text: "Quantités" } }
        }
      }
    });
  }

  // Argent (barres côte à côte: coût / économies)
  const ctxM = $("#chart-money")?.getContext("2d");
  if (chartMoney) chartMoney.destroy();
  if (ctxM){
    chartMoney = new Chart(ctxM, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Coût", data: moneySeries.cost, borderWidth:1 },
          { label: "Économies", data: moneySeries.saved, borderWidth:1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: (ctx)=>{
                const v = Number(ctx.parsed.y||0);
                try{ return `${ctx.dataset.label}: ${v.toLocaleString('fr-FR',{style:'currency',currency:currency?.code||'EUR'})}`; }
                catch{ return `${ctx.dataset.label}: ${fmtMoney(v,currency)}`; }
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, title: { display:true, text: "€" } }
        }
      }
    });
  }
}

/* ---------- exports / imports ---------- */
function bindExportImport(){
  $("#btn-export-csv")?.addEventListener("click", ()=>{
    const S = loadState();
    const rows=[["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    const keys=Object.keys(S.history||{}).sort();
    for(const k of keys){
      const d=S.history[k]||{};
      rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(Number(d.cost||0)).toFixed(2),(Number(d.saved||0)).toFixed(2)]);
    }
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="stopaddict_stats.csv"; document.body.appendChild(a); a.click(); a.remove();
  });

  $("#btn-export-json")?.addEventListener("click", ()=>{
    const S = loadState();
    const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="stopaddict_export.json"; document.body.appendChild(a); a.click(); a.remove();
  });

  $("#file-import-json")?.addEventListener("change", async (ev)=>{
    const file=ev.target.files?.[0]; if(!file) return;
    try{
      const text=await file.text();
      const obj=JSON.parse(text);
      const merged = { ...DefaultState(), ...obj };
      saveState(merged);
      renderCharts();
      alert("Import JSON : OK");
    }catch(e){
      alert("Import JSON invalide.");
    }finally{
      ev.target.value="";
    }
  });
}

/* ---------- périodes ---------- */
function bindPeriods(){
  $("#btnPeriod-day")?.addEventListener("click", ()=>{ _period="day"; renderCharts(); });
  $("#btnPeriod-week")?.addEventListener("click", ()=>{ _period="week"; renderCharts(); });
  $("#btnPeriod-month")?.addEventListener("click", ()=>{ _period="month"; renderCharts(); });
  $("#btnPeriod-year")?.addEventListener("click", ()=>{ _period="year"; renderCharts(); });
}

/* ---------- montage auto-idempotent ---------- */
(function mountOnce(){
  if (document.body.dataset.statsBound === "1") return;
  document.body.dataset.statsBound = "1";
  ensureStatsLayout();
  bindPeriods();
  bindExportImport();
  renderCharts();
})();
