/* web/js/stats.js — 2 graphes (Quantités · Coûts/Économies) avec abscisses complètes */

import { loadState, saveState, todayKey, fmtMoney } from "./state.js";

/* ---------- Config ---------- */
const KINDS = ["cigs","joints","beer","hard","liqueur"];
const LABELS_KINDS = {
  cigs: "Cigarettes", joints: "Joints", beer: "Bière", hard: "Alcool fort", liqueur: "Liqueur"
};

let chartQty = null;
let chartMoney = null;
let _period = "day";

/* ---------- Utils ---------- */
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function toISO(d){ return d.toISOString().slice(0,10); }
function mondayOf(date){
  const d = new Date(date);
  const wd = (d.getDay()+6)%7; // 0=Mon
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-wd);
  return d;
}
function monthNamesFR(){ return ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"]; }

function labelsAndBuckets(period, refDate=new Date()){
  const labels = [];
  let bucketCount = 0;
  let bucketIndexFromDate = ()=>0;
  let dateKeysInBucket = ()=>({}); // for week/month/year

  const y = refDate.getFullYear();
  const m = refDate.getMonth();
  const d = refDate.getDate();

  if (period === "day"){
    // 4 tranches horaires : Nuit(0–5), Matin(6–11), Après-midi(12–17), Soir(18–23)
    const L = ["Nuit 0–5","Matin 6–11","Après-midi 12–17","Soir 18–23"];
    labels.push(...L);
    bucketCount = 4;
    bucketIndexFromDate = (dateObj)=>{
      const h = dateObj.getHours();
      if (h<=5) return 0;
      if (h<=11) return 1;
      if (h<=17) return 2;
      return 3;
    };
  }
  else if (period === "week"){
    const start = mondayOf(refDate);
    for (let i=0;i<7;i++){
      const d2 = new Date(start); d2.setDate(start.getDate()+i);
      labels.push(["Lu","Ma","Me","Je","Ve","Sa","Di"][i]);
    }
    bucketCount = 7;
    dateKeysInBucket = ()=>{
      const map = {};
      const start2 = mondayOf(refDate);
      for (let i=0;i<7;i++){
        const d2 = new Date(start2); d2.setDate(start2.getDate()+i);
        (map[i] ||= []).push(toISO(d2));
      }
      return map;
    };
  }
  else if (period === "month"){
    const n = daysInMonth(y, m);
    for (let i=1;i<=n;i++) labels.push(String(i));
    bucketCount = n;
    dateKeysInBucket = ()=>{
      const map = {};
      for (let i=1;i<=bucketCount;i++){
        const key = `${y}-${String(m+1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;
        (map[i-1] ||= []).push(key);
      }
      return map;
    };
  }
  else { // year
    const L = monthNamesFR();
    labels.push(...L);
    bucketCount = 12;
    dateKeysInBucket = ()=>{
      const map = {};
      for (let i=0;i<12;i++){
        // collect all ISO dates of month i (1..31)
        const n = daysInMonth(y, i);
        for (let d2=1; d2<=n; d2++){
          const key = `${y}-${String(i+1).padStart(2,"0")}-${String(d2).padStart(2,"0")}`;
          (map[i] ||= []).push(key);
        }
      }
      return map;
    };
  }

  return { labels, bucketCount, bucketIndexFromDate, dateKeysInBucket };
}

function unitPrice(S, kind){
  const p=S.prices, v=S.variants || {};
  switch(kind){
    case "cigs":
      if(p.cigarette>0) return p.cigarette;
      if(v.classic?.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if(v.rolled?.use && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    case "joints":
      if(p.joint>0) return p.joint;
      if(v.cannabis?.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice * v.cannabis.gramsPerJoint;
      return 0;
    case "beer":    return p.beer>0 ? p.beer : (v.alcohol?.beer?.enabled && v.alcohol.beer.unitPrice>0 ? v.alcohol.beer.unitPrice : 0);
    case "hard":    return p.hard>0 ? p.hard : (v.alcohol?.hard?.enabled && v.alcohol.hard.dosePrice>0 ? v.alcohol.hard.dosePrice : 0);
    case "liqueur": return p.liqueur>0 ? p.liqueur : (v.alcohol?.liqueur?.enabled && v.alcohol.liqueur.dosePrice>0 ? v.alcohol.liqueur.dosePrice : 0);
    default: return 0;
  }
}

/* Agrégation à partir du journal d’événements (si présent) pour la vue Jour */
function aggregateFromEventsDay(S, bucketCount, bucketIndexFromDate){
  const buckets = Array.from({length:bucketCount}, ()=>({ cigs:0,joints:0,beer:0,hard:0,liqueur:0 }));
  const todayIso = todayKey(new Date());
  const evts = Array.isArray(S.events) ? S.events : [];
  for (const e of evts){
    // attendu: { ts:number, kind:"cigs"|..., delta:number }
    if (!e || !KINDS.includes(e.kind)) continue;
    const dt = new Date(typeof e.ts==="number" ? e.ts : Date.parse(e.ts||""));
    if (toISO(dt)!==todayIso) continue;
    const b = bucketIndexFromDate(dt);
    buckets[b][e.kind] = (buckets[b][e.kind]||0) + Number(e.delta||0);
  }

  // fallback si pas d’événements : mettre le total du jour dans la tranche "Soir"
  const empty = buckets.every(b=> KINDS.every(k=> (b[k]||0)===0 ));
  if (empty){
    const today = S.history?.[todayIso] || {};
    const idxSoir = 3;
    for (const k of KINDS) buckets[idxSoir][k] = Number(today[k]||0);
  }
  return buckets;
}

/* Agrégation par dates (Semaine/Mois/Année) via S.history */
function aggregateFromHistory(S, bucketMap){
  const result = {};
  for (const idx of Object.keys(bucketMap)){
    result[idx] = { cigs:0,joints:0,beer:0,hard:0,liqueur:0, cost:0, saved:0 };
    const keys = bucketMap[idx];
    for (const key of keys){
      const d = S.history?.[key] || {};
      for (const k of KINDS) result[idx][k] += Number(d[k]||0);
      result[idx].cost  += Number(d.cost||0);
      result[idx].saved += Number(d.saved||0);
    }
  }
  return result;
}

/* Coûts/Économies pour la vue Jour (répartition par tranche) */
function computeMoneyBucketsDay(S, qtyBuckets){
  const prices = KINDS.map(k => unitPrice(S,k));
  const goals = S.goals || {};
  // répartir l’objectif quotidien en 4 parts (approx)
  const goalParts = KINDS.map(k => (Number(goals[k]||0)/4));

  const cost = [];
  const saved = [];
  for (const b of qtyBuckets){
    // coût
    let c = 0;
    KINDS.forEach((k,i)=>{ c += Number(b[k]||0) * (prices[i]||0); });
    cost.push(c);

    // économies (approx par tranche)
    let s = 0;
    KINDS.forEach((k,i)=>{
      const diff = Math.max(0, goalParts[i] - Number(b[k]||0));
      s += diff * (prices[i]||0);
    });
    saved.push(s);
  }
  return { cost, saved };
}

/* ---------- Rendu ---------- */
function buildDatasetsQty(qtysPerBucket){
  // qtysPerBucket : [{cigs:.., joints:.., ...}, ...]
  const byKind = {};
  KINDS.forEach(k => byKind[k] = qtysPerBucket.map(b => Number(b[k]||0)));
  return KINDS.map(k => ({
    label: LABELS_KINDS[k],
    data: byKind[k],
    borderWidth: 1
  }));
}

function renderCharts(){
  const S = loadState();
  const ref = new Date();
  const { labels, bucketCount, bucketIndexFromDate, dateKeysInBucket } = labelsAndBuckets(_period, ref);

  /* Quantités & Argent par bucket */
  let qtyBuckets = [];
  let money = { cost:[], saved:[] };

  if (_period === "day"){
    qtyBuckets = aggregateFromEventsDay(S, bucketCount, bucketIndexFromDate);
    money = computeMoneyBucketsDay(S, qtyBuckets);
  } else {
    // Semaine/Mois/Année via history
    const map = dateKeysInBucket();
    const agg = aggregateFromHistory(S, map);
    // transformer en tableau ordonné 0..n-1
    qtyBuckets = Array.from({length:bucketCount}, (_,i)=>({
      cigs: agg[i]?.cigs||0,
      joints: agg[i]?.joints||0,
      beer: agg[i]?.beer||0,
      hard: agg[i]?.hard||0,
      liqueur: agg[i]?.liqueur||0
    }));
    money.cost  = Array.from({length:bucketCount}, (_,i)=> agg[i]?.cost || 0);
    money.saved = Array.from({length:bucketCount}, (_,i)=> agg[i]?.saved|| 0);
  }

  // Graph 1 — Quantités (multi-datasets)
  const cvQty = document.getElementById("chart-qty");
  if (chartQty) { chartQty.destroy(); chartQty = null; }
  if (cvQty && typeof Chart!=="undefined"){
    chartQty = new Chart(cvQty.getContext("2d"), {
      type: "bar",
      data: { labels, datasets: buildDatasetsQty(qtyBuckets) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { position: "top" } }
      }
    });
  }

  // Graph 2 — Coûts/Économies
  const cvMoney = document.getElementById("chart-money");
  if (chartMoney) { chartMoney.destroy(); chartMoney = null; }
  if (cvMoney && typeof Chart!=="undefined"){
    chartMoney = new Chart(cvMoney.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Coûts", data: money.cost, borderWidth: 1 },
          { label: "Économies", data: money.saved, borderWidth: 1 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
        plugins: {
          legend: { position: "top" },
          tooltip: {
            callbacks: {
              label: (ctx)=> `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y, loadState().currency)}`
            }
          }
        }
      }
    });
  }

  // Titre période
  const el = document.getElementById("stats-date");
  if (el){
    if (_period==="day"){
      el.textContent = new Date().toLocaleDateString("fr-FR");
    } else if (_period==="week"){
      const start = mondayOf(ref);
      const end = new Date(start); end.setDate(start.getDate()+6);
      el.textContent = `${start.toLocaleDateString("fr-FR")} → ${end.toLocaleDateString("fr-FR")}`;
    } else if (_period==="month"){
      const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const last  = new Date(ref.getFullYear(), ref.getMonth()+1, 0);
      el.textContent = `${first.toLocaleDateString("fr-FR")} → ${last.toLocaleDateString("fr-FR")}`;
    } else {
      el.textContent = String(ref.getFullYear());
    }
  }
}

/* ---------- Exports / Imports ---------- */
function bindExports(){
  const btnCsv = document.getElementById("btn-export-csv");
  if (btnCsv && !btnCsv.dataset.bound){
    btnCsv.dataset.bound = "1";
    btnCsv.addEventListener("click", ()=>{
      const S = loadState();
      const rows=[["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
      const keys=Object.keys(S.history||{}).sort();
      for(const k of keys){
        const d=S.history[k]||{};
        rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(+d.cost||0).toFixed(2),(+d.saved||0).toFixed(2)]);
      }
      const csv=rows.map(r=>r.join(",")).join("\n");
      const blob=new Blob([csv],{type:"text/csv"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="stopaddict_stats.csv";
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  const btnJson = document.getElementById("btn-export-json");
  if (btnJson && !btnJson.dataset.bound){
    btnJson.dataset.bound="1";
    btnJson.addEventListener("click", ()=>{
      const S = loadState();
      const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="stopaddict_export.json";
      document.body.appendChild(a); a.click(); a.remove();
    });
  }

  const fileImp = document.getElementById("file-import-json");
  if (fileImp && !fileImp.dataset.bound){
    fileImp.dataset.bound="1";
    fileImp.addEventListener("change", async (ev)=>{
      const f = ev.target.files?.[0];
      if(!f) return;
      try{
        const text = await f.text();
        const obj = JSON.parse(text);
        // merge minimal sécurisé
        const cur = loadState();
        const merged = { ...cur, ...obj };
        saveState(merged);
        renderCharts();
      }catch(e){
        alert("Import JSON invalide.");
      }finally{
        ev.target.value = "";
      }
    });
  }
}

function bindPeriodButtons(){
  const map = {
    day:   document.getElementById("btnPeriod-day"),
    week:  document.getElementById("btnPeriod-week"),
    month: document.getElementById("btnPeriod-month"),
    year:  document.getElementById("btnPeriod-year"),
  };
  Object.entries(map).forEach(([p,btn])=>{
    if (btn && !btn.dataset.bound){
      btn.dataset.bound="1";
      btn.addEventListener("click", ()=>{
        _period = p;
        // toggle visuel simple
        Object.values(map).forEach(b=> b?.classList?.remove("active"));
        btn.classList?.add("active");
        renderCharts();
      });
    }
  });
}

/* ---------- Mount ---------- */
export function mountStats(){
  bindExports();
  bindPeriodButtons();
  renderCharts();
}

/* Auto-mount si chargé isolément (optionnel) */
try { mountStats(); } catch {}
