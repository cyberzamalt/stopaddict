// web/js/stats.js
// Stats & agrégats + export/import + pilotage des graphiques
// - Robuste aux variations de structure des données
// - Envoie des événements "sa:chart-update" pour charts.js
// - Met à jour KPIs de l'écran Stats + bandeau header KPIs (si présent)

import { $, $$, startOfWeek, startOfMonth, formatYMD, parseYMD, clamp, loadJSON, saveJSON, toCurrency } from "./utils.js";
import * as Settings from "./settings.js"; // getSettings() toléré (si exporté)
import * as State from "./state.js";       // on(...) si dispo

// ---------- Lecture robuste des données ----------
const LS_HISTORY_KEYS  = ["sa:history","sa_history","SA_HISTORY","history"];
const LS_SETTINGS_KEYS = ["sa:settings","sa_settings","SA_SETTINGS","settings"];

function getJSONFromKeys(keys, def=null){
  for (const k of keys){
    try {
      const v = localStorage.getItem(k);
      if (v) return JSON.parse(v);
    } catch(e){}
  }
  return def;
}
function setJSONFirstKey(keys, obj){
  try { localStorage.setItem(keys[0], JSON.stringify(obj)); } catch(e){}
}

// Normalise une entrée jour en {c,j,a, perHour:[24]}
function normDayEntry(raw){
  if (!raw || typeof raw!=="object") return { c:0, j:0, a:0, perHour: new Array(24).fill(0).map(()=>({c:0,j:0,a:0})) };

  const c = raw.c ?? raw.cigs ?? raw.clopes ?? raw.cl ?? 0;
  const j = raw.j ?? raw.weed ?? raw.joints ?? raw.jt ?? 0;
  let a = raw.a ?? raw.alcool ?? raw.alcohol ?? 0;

  // Somme des sous-types alcool si présents
  const beer   = raw.beer ?? raw.biere ?? 0;
  const strong = raw.strong ?? raw.fort ?? 0;
  const liquor = raw.liquor ?? raw.liqueur ?? 0;
  if (beer||strong||liquor) a = (Number(a)||0) + beer + strong + liquor;

  // timeline horaire facultative
  const perHour = new Array(24).fill(0).map(()=>({c:0,j:0,a:0}));
  const h = raw.h || raw.hours || raw.timeline;
  if (h && typeof h==="object"){
    for (let k in h){
      const idx = Number(k);
      if (!Number.isNaN(idx) && idx>=0 && idx<24){
        const hr = h[k] || {};
        const hc = hr.c ?? hr.cigs ?? hr.cl ?? 0;
        const hj = hr.j ?? hr.weed ?? hr.jt ?? 0;
        let ha = hr.a ?? hr.alcool ?? hr.alcohol ?? 0;
        const hbeer = hr.beer ?? hr.biere ?? 0;
        const hstr  = hr.strong ?? hr.fort ?? 0;
        const hliq  = hr.liquor ?? hr.liqueur ?? 0;
        if (hbeer||hstr||hliq) ha = (Number(ha)||0) + hbeer + hstr + hliq;
        perHour[idx] = { c:Number(hc)||0, j:Number(hj)||0, a:Number(ha)||0 };
      }
    }
  }

  return { c:Number(c)||0, j:Number(j)||0, a:Number(a)||0, perHour };
}

function loadHistory(){
  const hist = getJSONFromKeys(LS_HISTORY_KEYS, {});
  // forme attendue: { "YYYY-MM-DD": {...jour...}, ... }
  return (hist && typeof hist==="object") ? hist : {};
}
function loadSettingsSoft(){
  // Essaie module Settings, sinon LS
  try {
    if (Settings && typeof Settings.getSettings==="function"){
      return Settings.getSettings();
    }
  } catch(e){}
  return getJSONFromKeys(LS_SETTINGS_KEYS, {}) || {};
}

function dayTotal(entry){ return (entry.c||0)+(entry.j||0)+(entry.a||0); }

function sumCosts(entry, prices){
  // prices = { cig, joint, beer, strong, liquor, alcohol } — tolérance
  const pc = Number(prices.cig ?? prices.cigs ?? prices.cigarette ?? 0) || 0;
  const pj = Number(prices.joint ?? prices.weed ?? 0) || 0;
  // alcool : si detail non fourni, utilise prix "alcohol"
  const pa = Number(prices.alcohol ?? prices.alcool ?? 0) || 0;

  // Si l'entrée avait des sous-types, on ne les connaît pas ici: on applique prix "alcohol" sur a
  return (entry.c||0)*pc + (entry.j||0)*pj + (entry.a||0)*pa;
}

// Économies: si baseline max connue, économies = (baselineMax - conso) * prix (plancher à 0)
function estimateSavings(entry, prices, baseline){
  if (!baseline) return 0;
  const bc = Number(baseline.cigMax ?? baseline["clopes.max"] ?? baseline["clopes_max"] ?? 0) || 0;
  const bj = Number(baseline.jointMax ?? baseline["joints.max"] ?? baseline["joints_max"] ?? 0) || 0;
  const ba = Number(baseline.alcMax ?? baseline["alcool.max"] ?? baseline["alcool_max"] ?? 0) || 0;
  const pc = Number(prices.cig ?? prices.cigs ?? prices.cigarette ?? 0) || 0;
  const pj = Number(prices.joint ?? prices.weed ?? 0) || 0;
  const pa = Number(prices.alcohol ?? prices.alcool ?? 0) || 0;

  const ec = Math.max(0, bc - (entry.c||0)) * pc;
  const ej = Math.max(0, bj - (entry.j||0)) * pj;
  const ea = Math.max(0, ba - (entry.a||0)) * pa;
  return ec+ej+ea;
}

// ---------- Agrégations par plage ----------
function labelsFor(range, baseDate=new Date()){
  if (range==="day")   return Array.from({length:24},(_,i)=>String(i).padStart(2,"0")+"h");
  if (range==="week")  return ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  if (range==="month") return ["Sem1","Sem2","Sem3","Sem4","Sem5","Sem6"];
  if (range==="year")  return ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return [];
}
function weekIndex(date){
  // 0..6 Lundi=0
  const w0 = startOfWeek(date,1);
  const d  = new Date(date);
  const diff = Math.round((startOfDay(d)-startOfDay(w0))/86400000);
  return clamp(diff,0,6);
}
function weekOfMonth(date){
  // 0..5
  const som = startOfMonth(date);
  const d   = new Date(date);
  const diff = Math.floor((startOfDay(d)-startOfDay(som))/86400000);
  return clamp(Math.floor((diff + som.getDay() + 6)%7 / 7) + Math.floor(diff/7), 0, 5);
}
function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }

function aggregate(history, settings, range, baseDate=new Date()){
  const labels = labelsFor(range, baseDate);
  let cigs = new Array(labels.length).fill(0);
  let weed = new Array(labels.length).fill(0);
  let alco = new Array(labels.length).fill(0);
  let cost = new Array(labels.length).fill(0);
  let eco  = new Array(labels.length).fill(0);

  const prices   = settings?.prices || settings?.prix || {};
  const baseline = settings?.baseline || settings?.habitudes || null;

  if (range==="day"){
    const ymd = formatYMD(baseDate);
    const entry = normDayEntry(history[ymd]);
    for (let h=0; h<24; h++){
      const hr = entry.perHour[h] || {c:0,j:0,a:0};
      cigs[h]=hr.c; weed[h]=hr.j; alco[h]=hr.a;
    }
    const tot = { c: cigs.reduce((a,b)=>a+b,0), j: weed.reduce((a,b)=>a+b,0), a: alco.reduce((a,b)=>a+b,0) };
    for (let i=0;i<labels.length;i++){
      const part = entry.perHour[i] || {c:0,j:0,a:0};
      cost[i] = sumCosts(part, prices);
      eco[i]  = estimateSavings(part, prices, baseline);
    }
    return {labels, cigs, weed, alco, cost, eco, total:tot};
  }

  if (range==="week"){
    const w0 = startOfWeek(baseDate,1);
    for (let d=0; d<7; d++){
      const dt = new Date(w0); dt.setDate(w0.getDate()+d);
      const ymd = formatYMD(dt);
      const e = normDayEntry(history[ymd]);
      cigs[d]+=e.c; weed[d]+=e.j; alco[d]+=e.a;
      cost[d]+=sumCosts(e, prices);
      eco[d] +=estimateSavings(e, prices, baseline);
    }
    return {labels, cigs, weed, alco, cost, eco};
  }

  if (range==="month"){
    const som = startOfMonth(baseDate);
    const next = new Date(som.getFullYear(), som.getMonth()+1, 1);
    for (let dt=new Date(som); dt<next; dt.setDate(dt.getDate()+1)){
      const idx = weekOfMonth(dt);
      const ymd = formatYMD(dt);
      const e = normDayEntry(history[ymd]);
      cigs[idx]+=e.c; weed[idx]+=e.j; alco[idx]+=e.a;
      cost[idx]+=sumCosts(e, prices);
      eco[idx] +=estimateSavings(e, prices, baseline);
    }
    return {labels, cigs, weed, alco, cost, eco};
  }

  if (range==="year"){
    const year = baseDate.getFullYear();
    for (let m=0;m<12;m++){
      const first = new Date(year, m, 1);
      const next  = new Date(year, m+1, 1);
      for (let dt=new Date(first); dt<next; dt.setDate(dt.getDate()+1)){
        const ymd = formatYMD(dt);
        const e = normDayEntry(history[ymd]);
        cigs[m]+=e.c; weed[m]+=e.j; alco[m]+=e.a;
        cost[m]+=sumCosts(e, prices);
        eco[m] +=estimateSavings(e, prices, baseline);
      }
    }
    return {labels, cigs, weed, alco, cost, eco};
  }

  return {labels, cigs, weed, alco, cost, eco};
}

// ---------- UI ----------
function setActiveRange(range){
  $$("#chartRange .btn.pill").forEach(b=>{
    b.classList.toggle("active", b.dataset.range===range);
  });
}
function currentRange(){
  const btn = $("#chartRange .btn.pill.active");
  return btn ? btn.dataset.range : "day";
}
function updateHeaderKPIs(history, settings){
  const today = normDayEntry(history[formatYMD(new Date())] || {});
  const prices = settings?.prices || settings?.prix || {};
  const todayCost = toCurrency(sumCosts(today, prices) || 0, "€");

  // Bandeau rapide header (si présent)
  const tToday = dayTotal(today);
  const elToday = $("#todayTotal"); if (elToday) elToday.textContent = tToday;

  // Totaux semaine/mois
  const aggW = aggregate(history, settings, "week", new Date());
  const aggM = aggregate(history, settings, "month", new Date());
  const wTot = aggW.cigs.reduce((a,b)=>a+b,0)+aggW.weed.reduce((a,b)=>a+b,0)+aggW.alco.reduce((a,b)=>a+b,0);
  const mTot = aggM.cigs.reduce((a,b)=>a+b,0)+aggM.weed.reduce((a,b)=>a+b,0)+aggM.alco.reduce((a,b)=>a+b,0);

  const elW = $("#weekTotal");  if (elW) elW.textContent  = wTot;
  const elM = $("#monthTotal"); if (elM) elM.textContent  = mTot;
  const elC = $("#todayCost");  if (elC) elC.textContent  = todayCost;

  // Économies estimées (approx) = somme eco du jour/semaine/mois ? On préfère jour ici:
  const ecoToday = (aggregate(history, settings, "day", new Date()).eco || []).reduce((a,b)=>a+b,0);
  const elE = $("#economies-amount"); if (elE) elE.textContent = toCurrency(ecoToday || 0, "€");
}

function updateStatsPanel(history, settings, range){
  const baseDate = new Date();
  const agg = aggregate(history, settings, range, baseDate);

  // KPI bloc (3 lignes)
  const kc = $("#kpi-cigarettes-value"); if (kc) kc.textContent = agg.cigs.reduce((a,b)=>a+b,0);
  const kj = $("#kpi-joints-value");     if (kj) kj.textContent = agg.weed.reduce((a,b)=>a+b,0);
  const ka = $("#kpi-alcohol-value");    if (ka) ka.textContent = agg.alco.reduce((a,b)=>a+b,0);

  const totalPer = agg.cigs.reduce((a,b)=>a+b,0)+agg.weed.reduce((a,b)=>a+b,0)+agg.alco.reduce((a,b)=>a+b,0);
  const lab = (range==="day"?"Total jour": range==="week"?"Total semaine": range==="month"?"Total mois":"Total année");
  const scL = $("#summary-card-period-label"); if (scL) scL.textContent = lab;
  const scV = $("#summary-card-period-value"); if (scV) scV.textContent = totalPer;

  // Bannière
  const bTitle = $("#stats-titre");
  if (bTitle){
    const tit = (range==="day"?"Bilan Jour": range==="week"?"Bilan Semaine": range==="month"?"Bilan Mois":"Bilan Année");
    bTitle.textContent = `${tit} — Total ${totalPer}`;
  }
  const sC = $("#stats-clopes"); if (sC) sC.textContent = agg.cigs.reduce((a,b)=>a+b,0);
  const sJ = $("#stats-joints"); if (sJ) sJ.textContent = agg.weed.reduce((a,b)=>a+b,0);
  const sA = $("#stats-alcool"); if (sA) sA.textContent = agg.alco.reduce((a,b)=>a+b,0);

  // Propagation vers charts.js
  const payload = { range, labels:agg.labels, series:{
    cigs: agg.cigs, weed: agg.weed, alcohol: agg.alco, cost: agg.cost, eco: agg.eco
  }};
  window.dispatchEvent(new CustomEvent("sa:chart-update", { detail: payload }));
}

function exportCSV(history){
  const rows = [["date","cigarettes","joints","alcool","cost_estimated"]];
  const settings = loadSettingsSoft();
  const prices = settings?.prices || settings?.prix || {};
  const keys = Object.keys(history).sort();
  for (const ymd of keys){
    const e = normDayEntry(history[ymd]);
    const cost = sumCosts(e, prices);
    rows.push([ymd, e.c, e.j, e.a, String(cost).replace(".",",")]);
  }
  const csv = rows.map(r=>r.join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stopaddict_history.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportJSON(history){
  const settings = loadSettingsSoft();
  const out = {
    version: "sa-export-1",
    exportedAt: new Date().toISOString(),
    settings, history
  };
  const blob = new Blob([JSON.stringify(out,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stopaddict_backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importAny(file, cb){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      if (/\.json$/i.test(file.name)){
        const obj = JSON.parse(reader.result);
        if (obj && obj.history && obj.settings){
          setJSONFirstKey(LS_HISTORY_KEYS, obj.history);
          setJSONFirstKey(LS_SETTINGS_KEYS, obj.settings);
        } else if (obj && (obj.sa_history || obj["sa:history"])){
          const h = obj.sa_history || obj["sa:history"];
          setJSONFirstKey(LS_HISTORY_KEYS, h);
        }
        window.dispatchEvent(new CustomEvent("sa:storage-imported"));
        cb && cb(true);
        return;
      }
      // CSV très simple (date;c;j;a;cost)
      if (/\.csv$/i.test(file.name)){
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        const hist = loadHistory();
        for (let i=1;i<lines.length;i++){
          const parts = lines[i].split(";");
          const ymd = parts[0]?.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)){
            const e = normDayEntry(hist[ymd]||{});
            e.c = Number(parts[1]||e.c||0);
            e.j = Number(parts[2]||e.j||0);
            e.a = Number(parts[3]||e.a||0);
            hist[ymd] = e;
          }
        }
        setJSONFirstKey(LS_HISTORY_KEYS, hist);
        window.dispatchEvent(new CustomEvent("sa:storage-imported"));
        cb && cb(true);
        return;
      }
    } catch(e){}
    cb && cb(false);
  };
  reader.readAsText(file);
}

// ---------- INIT ----------
export function initStats(){
  const root = $("#ecran-stats");
  if (!root) return;

  // Bind range pills
  $$("#chartRange .btn.pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      setActiveRange(btn.dataset.range);
      const history = loadHistory();
      const settings = loadSettingsSoft();
      updateStatsPanel(history, settings, btn.dataset.range);
      updateHeaderKPIs(history, settings);
    });
  });

  // Export / Import
  const btnExpCSV  = $("#btn-export-csv");
  const btnExpJSON = $("#btn-export-stats"); // "Exporter la vue actuelle" → on exporte JSON total (plus utile)
  const btnImport  = $("#btn-import");
  const fileImport = $("#input-import");

  if (btnExpCSV)  btnExpCSV.addEventListener("click", ()=> exportCSV(loadHistory()));
  if (btnExpJSON) btnExpJSON.addEventListener("click", ()=> exportJSON(loadHistory()));
  if (btnImport && fileImport){
    btnImport.addEventListener("click", ()=> fileImport.click());
    fileImport.addEventListener("change", (e)=>{
      const f = e.target.files && e.target.files[0];
      if (f) importAny(f, ok=>{
        // re-render
        const history = loadHistory();
        const settings = loadSettingsSoft();
        updateStatsPanel(history, settings, currentRange());
        updateHeaderKPIs(history, settings);
      });
      fileImport.value = "";
    });
  }

  // 1er rendu
  setActiveRange("day");
  const history = loadHistory();
  const settings = loadSettingsSoft();
  updateStatsPanel(history, settings, "day");
  updateHeaderKPIs(history, settings);

  // Écoutes des maj (depuis counters / calendar / import)
  try {
    if (State && typeof State.on==="function"){
      State.on("sa:counts-updated", ()=>{
        const h = loadHistory(), s = loadSettingsSoft();
        updateStatsPanel(h, s, currentRange());
        updateHeaderKPIs(h, s);
      });
    }
  } catch(e){}

  window.addEventListener("sa:storage-imported", ()=>{
    const h = loadHistory(), s = loadSettingsSoft();
    updateStatsPanel(h, s, currentRange());
    updateHeaderKPIs(h, s);
  });
}
