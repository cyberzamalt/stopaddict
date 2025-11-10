/* web/js/stats.js — 2 graphes + abscisses complètes, Jour via S.events */
let S, todayKey, fmtMoney, dbg;
let chartQty = null, chartMoney = null;
let _period = "day";

let saveStateFn = null;
try { const m = await import('./state.js'); saveStateFn = m?.saveState; } catch {}

const KINDS = ["cigs","joints","beer","hard","liqueur"];
const SLICE_LABELS_DAY = ["0–5h","6–11h","12–17h","18–23h"];
const WEEK_LABELS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const MONTH_LABELS = (n)=>Array.from({length:n},(_,i)=>String(i+1));
const YEAR_LABELS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

function isEnabled(kind){
  // Compte ce qui est activé et autorisé
  return !!(S?.modules?.[kind]) && !!(S?.today?.active?.[kind]);
}
function priceOf(kind){
  const p = Number(S?.prices?.[kind]||0);
  return isFinite(p)?p:0;
}
function dayKeyFromTs(ts){
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function bucketIndexFromHour(h){
  if (h<=5) return 0;
  if (h<=11) return 1;
  if (h<=17) return 2;
  return 3;
}
function startOfWeek(d){ // Lundi
  const dd = new Date(d);
  const wd = (dd.getDay()+6)%7;
  dd.setHours(0,0,0,0);
  dd.setDate(dd.getDate()-wd);
  return dd;
}
function endOfWeek(d){
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate()+6);
  return e;
}
function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function keyOfDate(d){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------- Buckets par période ---------- */
function buildBucketsForDay(){
  // Quantités par tranche, coûts/économies par tranche — alimentés par S.events
  const qty = [0,0,0,0];
  const cost = [0,0,0,0];
  const saved = [0,0,0,0];

  // Comptes par tranche ET par kind pour calculer économies vs objectifs
  const perKindPerSlice = Object.fromEntries(KINDS.map(k=>[k,[0,0,0,0]]));

  const key = todayKey(new Date());
  const evts = Array.isArray(S?.events)?S.events:[];

  for (const ev of evts){
    const { ts, kind, delta } = ev||{};
    if (!KINDS.includes(kind)) continue;
    if (!isEnabled(kind)) continue;
    if (dayKeyFromTs(ts)!==key) continue;

    const h = new Date(ts).getHours();
    const b = bucketIndexFromHour(h);
    const inc = Number(delta||0);
    if (!isFinite(inc) || inc===0) continue;

    // On cumule les + et autorise les - (décoche) en bornant à >=0 sur le graphe final
    perKindPerSlice[kind][b] += inc;
  }

  // Finalisation: clamp >=0, calcule coût + économies par tranche
  for (let b=0;b<4;b++){
    let totalUnits = 0;
    let totalCost = 0;
    let totalSaved = 0;
    for (const k of KINDS){
      if (!isEnabled(k)) continue;
      const units = Math.max(0, perKindPerSlice[k][b]);
      totalUnits += units;
      totalCost  += units * priceOf(k);

      // Économies ~ “objectif réparti /4” - consommation tranche
      const goal = Number(S?.goals?.[k]||0)/4;
      if (goal > 0 && units < goal){
        totalSaved += (goal - units) * priceOf(k);
      }
    }
    qty[b]  = totalUnits;
    cost[b] = +totalCost.toFixed(2);
    saved[b]= +totalSaved.toFixed(2);
  }
  return { labels: SLICE_LABELS_DAY, qty, cost, saved };
}

function buildBucketsForWeek(){
  const now = new Date();
  const start = startOfWeek(now);
  const end   = endOfWeek(now);
  const qty = Array(7).fill(0);
  const cost = Array(7).fill(0);
  const saved = Array(7).fill(0);

  for (let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const key = keyOfDate(d);
    const idx = (d.getDay()+6)%7; // Lundi=0
    const h = S?.history?.[key] || {};
    const units = KINDS.reduce((acc,k)=> acc + (isEnabled(k)?Number(h[k]||0):0), 0);
    qty[idx]   += units;
    cost[idx]  += Number(h.cost||0);
    saved[idx] += Number(h.saved||0);
  }
  return { labels: WEEK_LABELS, qty, cost: cost.map(v=>+v.toFixed(2)), saved: saved.map(v=>+v.toFixed(2)) };
}

function buildBucketsForMonth(){
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth();
  const n = daysInMonth(y,m);
  const labels = MONTH_LABELS(n);
  const qty = Array(n).fill(0);
  const cost = Array(n).fill(0);
  const saved = Array(n).fill(0);

  for (let day=1; day<=n; day++){
    const key = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const h = S?.history?.[key] || {};
    const idx = day-1;
    const units = KINDS.reduce((acc,k)=> acc + (isEnabled(k)?Number(h[k]||0):0), 0);
    qty[idx]   += units;
    cost[idx]  += Number(h.cost||0);
    saved[idx] += Number(h.saved||0);
  }
  return { labels, qty, cost: cost.map(v=>+v.toFixed(2)), saved: saved.map(v=>+v.toFixed(2)) };
}

function buildBucketsForYear(){
  const y = new Date().getFullYear();
  const labels = YEAR_LABELS.slice();
  const qty  = Array(12).fill(0);
  const cost = Array(12).fill(0);
  const saved= Array(12).fill(0);

  const keys = Object.keys(S?.history||{});
  for (const key of keys){
    if (!key.startsWith(String(y))) continue;
    const [,mm,dd] = key.split("-");
    const idx = Number(mm)-1;
    const h = S.history[key]||{};
    const units = KINDS.reduce((acc,k)=> acc + (isEnabled(k)?Number(h[k]||0):0), 0);
    qty[idx]   += units;
    cost[idx]  += Number(h.cost||0);
    saved[idx] += Number(h.saved||0);
  }
  return { labels, qty, cost: cost.map(v=>+v.toFixed(2)), saved: saved.map(v=>+v.toFixed(2)) };
}

/* ---------- Rendu des graphes ---------- */
function datasetMoney(label, data){
  return { label, data, yAxisID: 'y', type:'bar' };
}
function datasetQty(label, data){
  return { label, data, yAxisID: 'y', type:'bar' };
}

function render(){
  const ctxQ = document.getElementById('chart-qty')?.getContext('2d');
  const ctxM = document.getElementById('chart-money')?.getContext('2d');
  if (!ctxQ || !ctxM || typeof Chart==="undefined") return;

  let buckets;
  if (_period==="day")   buckets = buildBucketsForDay();
  else if(_period==="week")  buckets = buildBucketsForWeek();
  else if(_period==="month") buckets = buildBucketsForMonth();
  else                      buckets = buildBucketsForYear();

  // Quantités (total par bucket)
  if (chartQty) chartQty.destroy();
  chartQty = new Chart(ctxQ, {
    type: 'bar',
    data: { labels: buckets.labels, datasets: [ datasetQty('Quantités', buckets.qty) ] },
    options: {
      responsive:true, maintainAspectRatio:false,
      scales:{ y:{ beginAtZero:true } },
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c)=> ` ${c.parsed.y}` } } }
    }
  });

  // Coûts / Économies
  if (chartMoney) chartMoney.destroy();
  chartMoney = new Chart(ctxM, {
    type: 'bar',
    data: { labels: buckets.labels, datasets: [
      datasetMoney('Coûts', buckets.cost),
      datasetMoney('Économies', buckets.saved),
    ]},
    options: {
      responsive:true, maintainAspectRatio:false,
      scales:{ y:{ beginAtZero:true } },
      plugins:{ legend:{ position:'top' }, tooltip:{ callbacks:{
        label:(c)=> (c.datasetIndex===0? 'Coût: ' : 'Économies: ') + fmtMoney(Number(c.parsed.y||0), S.currency)
      }}}
    }
  });

  // Date affichée (en-tête Stats)
  const elDate = document.getElementById('stats-date');
  if (elDate){
    const now = new Date();
    const fmt = (d)=> d.toLocaleDateString('fr-FR');
    if (_period==="day"){
      elDate.textContent = fmt(now);
    } else if (_period==="week"){
      const s = startOfWeek(now), e = endOfWeek(now);
      elDate.textContent = `${fmt(s)} → ${fmt(e)}`;
    } else if (_period==="month"){
      elDate.textContent = now.toLocaleDateString('fr-FR',{month:'long', year:'numeric'});
    } else {
      elDate.textContent = String(now.getFullYear());
    }
  }
}

/* ---------- Export / Import ---------- */
function initExportImport(){
  document.getElementById('btn-export-csv')?.addEventListener('click', ()=>{
    const rows = [["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    const keys = Object.keys(S?.history||{}).sort();
    for (const k of keys){
      const d = S.history[k]||{};
      rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(+d.cost||0).toFixed(2),(+d.saved||0).toFixed(2)]);
    }
    const csv = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_stats.csv";
    document.body.appendChild(a); a.click(); a.remove();
    dbg?.push?.("Export CSV ok","ok");
  });

  document.getElementById('btn-export-json')?.addEventListener('click', ()=>{
    const data = { history: S?.history||{}, events: S?.events||[] };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_export.json";
    document.body.appendChild(a); a.click(); a.remove();
    dbg?.push?.("Export JSON ok","ok");
  });

  document.getElementById('file-import-json')?.addEventListener('change', async (ev)=>{
    const f = ev.target.files?.[0]; if(!f) return;
    try{
      const text = await f.text();
      const obj = JSON.parse(text);
      if (obj?.history) S.history = obj.history;
      if (obj?.events)  S.events  = obj.events;
      saveStateFn?.(S);
      render();
      dbg?.push?.("Import JSON ok","ok");
    }catch(e){
      dbg?.push?.("Import JSON erreur: "+(e?.message||e),"err");
      alert("Import JSON invalide.");
    }finally{
      ev.target.value = "";
    }
  });
}

/* ---------- API publique ---------- */
export function init(opts){
  S = opts.S; todayKey = opts.todayKey; fmtMoney = opts.fmtMoney; dbg = opts.dbg;

  // Boutons période
  document.getElementById('btnPeriod-day')?.addEventListener('click', ()=>{ _period="day"; render(); });
  document.getElementById('btnPeriod-week')?.addEventListener('click', ()=>{ _period="week"; render(); });
  document.getElementById('btnPeriod-month')?.addEventListener('click', ()=>{ _period="month"; render(); });
  document.getElementById('btnPeriod-year')?.addEventListener('click', ()=>{ _period="year"; render(); });

  initExportImport();
  render();
}
export function refresh(nextS){
  S = nextS || S;
  render();
}
