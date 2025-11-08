/* web/js/app.js — Orchestrateur StopAddict (ES module, safe init) */
import {
  LS_KEY, LS_AGE,
  DefaultState, loadState, saveState,
  todayKey, fmtMoney
} from './state.js';

import { mountSettings } from './settings.js';
import { mountHabits }   from './habits.js';
import { mountCalendar } from './calendar.js';
import * as Tips         from './tips.js';

// Charge et auto-monte les ressources (évite le freeze + doublons via son garde interne)
import './resources.js';

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ---------- State ---------- */
let S = loadState();

/* ---------- Debug overlay ---------- */
const dbg = {
  push(msg, type = "info") {
    const line = `[${new Date().toLocaleTimeString()}] [${type}] ${msg}`;
    S.debug.logs = S.debug.logs || [];
    S.debug.logs.push(line);
    if (S.debug.logs.length > 500) S.debug.logs.shift();
    const box = $("#debug-console");
    if (box && !box.classList.contains("hide")) {
      const div = document.createElement("div");
      div.className = "debug-line";
      div.textContent = line;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
  },
  clear() { S.debug.logs = []; $("#debug-console")?.replaceChildren(); },
  copy()  { navigator.clipboard?.writeText((S.debug.logs||[]).join("\n")).catch(()=>{}); }
};

/* ---------- Age gate ---------- */
function initAgeGate() {
  const dlg   = $("#agegate");
  const btnOk = $("#btn-age-accept");
  const cb18  = $("#age-18plus");
  const cbHide= $("#age-hide");

  if (!dlg || !btnOk || !cb18) return;

  const close = () => { try { dlg.close(); } catch {} dlg.classList.add("hide"); };
  const open  = () => { try { dlg.showModal(); } catch {} dlg.classList.remove("hide"); };

  if (localStorage.getItem(LS_AGE) === "1") {
    close();
  } else {
    open();
    btnOk.disabled = true;
    cb18.addEventListener("change", () => { btnOk.disabled = !cb18.checked; });
    btnOk.addEventListener("click", () => {
      if (cb18.checked) {
        if (cbHide?.checked) localStorage.setItem(LS_AGE, "1");
        close();
      }
    });
  }
}

/* ---------- Navigation ---------- */
const PAGES = {
  home     : "#page-home",
  stats    : "#page-stats",
  calendar : "#page-calendar",
  habits   : "#page-habits",
  settings : "#page-settings"
};

function showTab(id) {
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");
  $$("#tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  if (id === "stats") renderChart();
}

/* ---------- Business logic (counters, costs) ---------- */
const KINDS = ["cigs","joints","beer","hard","liqueur"];

function unitPrice(kind) {
  const p = S.prices, v = S.variants;
  switch(kind){
    case "cigs":
      if(p.cigarette>0) return p.cigarette;
      if(v.classic?.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if(v.rolled?.use  && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    case "joints":
      if(p.joint>0) return p.joint;
      if(v.cannabis?.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice*v.cannabis.gramsPerJoint;
      return 0;
    case "beer":    return p.beer    > 0 ? p.beer    : (v.alcohol?.beer?.enabled    && v.alcohol.beer.unitPrice   > 0 ? v.alcohol.beer.unitPrice   : 0);
    case "hard":    return p.hard    > 0 ? p.hard    : (v.alcohol?.hard?.enabled    && v.alcohol.hard.dosePrice   > 0 ? v.alcohol.hard.dosePrice   : 0);
    case "liqueur": return p.liqueur > 0 ? p.liqueur : (v.alcohol?.liqueur?.enabled && v.alcohol.liqueur.dosePrice> 0 ? v.alcohol.liqueur.dosePrice : 0);
    default: return 0;
  }
}

function computeCost(counters=S.today.counters){
  let t=0; for (const k of KINDS){ if(!S.modules[k] || !S.today.active[k]) continue; t += Number(counters[k]||0)*unitPrice(k); }
  return t;
}
function computeSaved(counters=S.today.counters){
  let s=0; for (const k of KINDS){ const g=Number(S.goals[k]||0), a=Number(counters[k]||0); if(g>0 && a<g) s += (g-a)*unitPrice(k); }
  return s;
}

/* ---------- UI Sync ---------- */
function setCtrState(kind, enabled){
  const card = document.getElementById(`ctr-${kind}`);
  if (!card) return;
  // Opacité visuelle du bloc
  card.style.opacity = enabled ? "1" : "0.55";
  // Désactive UNIQUEMENT les boutons +/- (laisse la case “Activer” cliquable)
  const dec = card.querySelector(`[data-action="dec"][data-kind="${kind}"]`);
  const inc = card.querySelector(`[data-action="inc"][data-kind="${kind}"]`);
  if (dec) dec.disabled = !enabled;
  if (inc) inc.disabled = !enabled;
  // S'assure que le toggle reste cliquable même si le reste est “gris”
  card.querySelector(".toggle")?.style && (card.querySelector(".toggle").style.pointerEvents = "auto");
}

function reflectCounters(){
  $("#val-cigs")?.replaceChildren(document.createTextNode(S.today.counters.cigs ?? 0));
  $("#val-joints")?.replaceChildren(document.createTextNode(S.today.counters.joints ?? 0));
  $("#val-beer")?.replaceChildren(document.createTextNode(S.today.counters.beer ?? 0));
  $("#val-hard")?.replaceChildren(document.createTextNode(S.today.counters.hard ?? 0));
  $("#val-liqueur")?.replaceChildren(document.createTextNode(S.today.counters.liqueur ?? 0));

  setCtrState("cigs"   , !!S.today.active.cigs    && !!S.modules.cigs);
  setCtrState("joints" , !!S.today.active.joints  && !!S.modules.joints);
  setCtrState("beer"   , !!S.today.active.beer    && !!S.modules.beer);
  setCtrState("hard"   , !!S.today.active.hard    && !!S.modules.hard);
  setCtrState("liqueur", !!S.today.active.liqueur && !!S.modules.liqueur);
}

function persistTodayIntoHistory(){
  const key = todayKey();
  if (S.today.date !== key){
    // sauvegarde du jour précédent
    S.history[S.today.date] = {
      ...S.today.counters,
      cost : computeCost(S.today.counters),
      saved: computeSaved(S.today.counters)
    };
    // reset du jour
    S.today.date = key;
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
  }
  S.history[key] = {
    ...S.today.counters,
    cost : computeCost(S.today.counters),
    saved: computeSaved(S.today.counters)
  };
}

function updateHeader(){
  $("#today-date") && ($("#today-date").textContent = new Date().toLocaleDateString("fr-FR"));
  $("#hdr-cigs")   && ($("#hdr-cigs").textContent   = S.today.counters.cigs ?? 0);
  $("#hdr-joints") && ($("#hdr-joints").textContent = S.today.counters.joints ?? 0);
  $("#hdr-alcohol")&& ($("#hdr-alcohol").textContent= (S.today.counters.beer+S.today.counters.hard+S.today.counters.liqueur)||0);

  const cost  = computeCost();
  const saved = computeSaved();
  $("#hdr-cost")  && ($("#hdr-cost").textContent  = fmtMoney(cost, S.currency));
  $("#hdr-saved") && ($("#hdr-saved").textContent = fmtMoney(saved, S.currency));

  const sum = KINDS.reduce((s,k)=> s + (S.today.counters[k]||0), 0);
  const badge = $("#hdr-status");
  if (badge){
    badge.textContent = sum===0 ? "✓" : "•";
    badge.style.background = sum===0 ? "#124232" : "#1f2b48";
  }
}

/* ---------- Counters wiring ---------- */
function initCounters(){
  // Boutons +/- (respectent modules & actifs)
  $$("[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const kind   = btn.dataset.kind;
      const action = btn.dataset.action;
      if (!KINDS.includes(kind)) return;
      if (!S.modules[kind] || !S.today.active[kind]) return;

      const cur = Number(S.today.counters[kind]||0);
      S.today.counters[kind] = (action === "inc") ? cur+1 : Math.max(0, cur-1);

      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      renderChart(_period);
      saveState(S);
      Tips?.updateTips?.(S);
      Cal?.update?.(S);
      dbg.push(`Counter ${kind} ${action}`, "event");
    });
  });

  // Toggles “Activer” (cliquables même si la carte est grisée)
  const map = {
    cigs    : "#chk-cigs-active",
    joints  : "#chk-joints-active",
    beer    : "#chk-beer-active",
    hard    : "#chk-hard-active",
    liqueur : "#chk-liqueur-active"
  };
  for (const k of KINDS){
    const el = $(map[k]); if (!el) continue;
    el.checked = !!S.today.active[k];
    el.addEventListener("change", ()=>{
      S.today.active[k] = el.checked;
      reflectCounters();
      saveState(S);
      Tips?.updateTips?.(S);
      Cal?.update?.(S);
    });
  }

  reflectCounters();
}

/* ---------- Stats (1 graphique comme dans index actuel) ---------- */
let chart;
let _period = "day";

function fmtDate(iso){ const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }

function dateRangeFor(period, refDate=new Date()){
  const d = new Date(refDate);
  const start = new Date(d), end = new Date(d);
  if (period === "week"){ const wd=(d.getDay()+6)%7; start.setDate(d.getDate()-wd); end.setDate(start.getDate()+6); }
  else if (period === "month"){ start.setDate(1); end.setMonth(d.getMonth()+1,0); }
  else if (period === "year"){ start.setMonth(0,1); end.setMonth(11,31); }
  return { start: todayKey(start), end: todayKey(end) };
}

function renderChart(period=_period){
  persistTodayIntoHistory();
  const canvas = $("#chart-main");
  if (!canvas || typeof Chart === "undefined") return;

  const labels  = ["Cigarettes","Joints","Bière","Alcool fort","Liqueur","Coût","Économies"];
  let counters  = { cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0 };
  const now     = new Date();
  const todayId = todayKey(now);

  if (period === "day"){
    const d = S.history[todayId] || {};
    counters = {
      cigs: d.cigs||0, joints: d.joints||0, beer: d.beer||0,
      hard: d.hard||0, liqueur: d.liqueur||0, cost: d.cost||0, saved: d.saved||0
    };
    $("#stats-date") && ($("#stats-date").textContent = new Date().toLocaleDateString("fr-FR"));
  } else {
    const range = dateRangeFor(period, now);
    for (const k of Object.keys(S.history)){
      if (k>=range.start && k<=range.end){
        const d = S.history[k]||{};
        counters.cigs    += d.cigs||0;
        counters.joints  += d.joints||0;
        counters.beer    += d.beer||0;
        counters.hard    += d.hard||0;
        counters.liqueur += d.liqueur||0;
        counters.cost    += d.cost||0;
        counters.saved   += d.saved||0;
      }
    }
    $("#stats-date") && ($("#stats-date").textContent = `${fmtDate(range.start)} → ${fmtDate(range.end)}`);
  }

  const data = [
    counters.cigs, counters.joints, counters.beer,
    counters.hard, counters.liqueur, Number(counters.cost||0), Number(counters.saved||0)
  ];

  if (chart) chart.destroy();
  chart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Valeurs", data }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataIndex>=5
              ? `${labels[ctx.dataIndex]}: ${fmtMoney(ctx.parsed.y, S.currency)}`
              : `${labels[ctx.dataIndex]}: ${ctx.parsed.y}`
          }
        }
      }
    }
  });
}

function initStats(){
  $("#btnPeriod-day")  ?.addEventListener("click", ()=>{ _period="day";   renderChart(); });
  $("#btnPeriod-week") ?.addEventListener("click", ()=>{ _period="week";  renderChart(); });
  $("#btnPeriod-month")?.addEventListener("click", ()=>{ _period="month"; renderChart(); });
  $("#btnPeriod-year") ?.addEventListener("click", ()=>{ _period="year";  renderChart(); });

  $("#btn-export-csv")?.addEventListener("click", ()=>{
    const rows=[["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    const keys=Object.keys(S.history).sort();
    for (const k of keys){
      const d = S.history[k]||{};
      rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(d.cost||0).toFixed(2),(d.saved||0).toFixed(2)]);
    }
    const csv  = rows.map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_stats.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    dbg.push("Export CSV ok","ok");
  });

  $("#btn-export-json")?.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    dbg.push("Export JSON ok","ok");
  });

  $("#file-import-json")?.addEventListener("change", async (ev)=>{
    const file = ev.target.files?.[0]; if(!file) return;
    try{
      const text = await file.text();
      const obj  = JSON.parse(text);
      S = { ...DefaultState(), ...obj };
      saveState(S);
      hydrateUIFromState();
      renderChart(_period);
      Cal?.update?.(S);
      dbg.push("Import JSON ok","ok");
    }catch(e){
      dbg.push("Import JSON erreur: "+(e?.message||e),"err");
      alert("Import JSON invalide.");
    }finally{
      ev.target.value = "";
    }
  });
}

/* ---------- Tips (si présent) ---------- */
function initTips(){
  if (typeof Tips?.mountTips === "function"){
    Tips.mountTips({ rootSel:"#tips-root", stateGetter:()=>S });
    Tips.updateTips?.(S);
  }
}

/* ---------- Hydratation générale ---------- */
function hydrateUIFromState(){
  $("#app-title") && ($("#app-title").textContent = "StopAddict");
  $("#today-date") && ($("#today-date").textContent = new Date().toLocaleDateString("fr-FR"));

  // Home toggles
  $("#chk-cigs-active")    && ($("#chk-cigs-active").checked    = !!S.today.active.cigs);
  $("#chk-joints-active")  && ($("#chk-joints-active").checked  = !!S.today.active.joints);
  $("#chk-beer-active")    && ($("#chk-beer-active").checked    = !!S.today.active.beer);
  $("#chk-hard-active")    && ($("#chk-hard-active").checked    = !!S.today.active.hard);
  $("#chk-liqueur-active") && ($("#chk-liqueur-active").checked = !!S.today.active.liqueur);

  reflectCounters();
  updateHeader();
  Tips?.updateTips?.(S);
}

/* ---------- Boot ---------- */
let Cal = null;

(async function initApp(){
  if (window.__StopAddict_Inited) return;  // garde anti double-init
  window.__StopAddict_Inited = true;

  if (!S.today?.date) S.today.date = todayKey();

  initAgeGate();

  // Onglets
  $$("#tabs .tab").forEach(btn => btn.addEventListener("click", ()=> showTab(btn.dataset.tab)));
  showTab("home");

  // Modules
  initCounters();
  initStats();
  initTips();

  // Calendar / Settings / Habits
  try { Cal = mountCalendar({ S, getState:()=>S, showTab }); } catch {}
  try { mountSettings({ S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, renderChart, reflectCounters, dbg }); } catch {}
  try { mountHabits   ({ S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, renderChart, reflectCounters, dbg }); } catch {}

  hydrateUIFromState();
  persistTodayIntoHistory();
  renderChart(_period);

  // Debug overlay (tap 5 fois la date)
  let taps=[];
  $("#today-date")?.addEventListener("click", ()=>{
    const now = Date.now();
    taps = taps.filter(t => now - t <= 900);
    taps.push(now);
    if (taps.length >= 5){
      $("#debug-console")?.classList.toggle("hide");
      taps = [];
      dbg.push("Toggle overlay","ok");
    }
  });

  dbg.push("App ready","ok");
})();
