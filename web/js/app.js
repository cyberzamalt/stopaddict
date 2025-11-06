/* web/js/app.js — Orchestrateur StopAddict (ES module) */
import {
  LS_KEY, LS_AGE,
  DefaultState, loadState, saveState,
  todayKey, fmtMoney
} from './state.js';

let mountSettings = null;
try { const m = await import('./settings.js'); if (typeof m?.mountSettings==="function") mountSettings = m.mountSettings; } catch {}

let Tips = null;
try { const m = await import('./tips.js'); if (typeof m?.mountTips==="function") Tips = m; } catch {}

let CalendarMod = null;
try { const m = await import('./calendar.js'); if (typeof m?.mountCalendar==="function") CalendarMod = m; } catch {}

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let S = loadState();

/* Debug */
const dbg = {
  push(msg, type = "info") {
    const line = `[${new Date().toLocaleTimeString()}] [${type}] ${msg}`;
    S.debug.logs = S.debug.logs || []; S.debug.logs.push(line);
    if (S.debug.logs.length > 500) S.debug.logs.shift();
    const box = $("#debug-console");
    if (box && !box.classList.contains("hide")) {
      const div = document.createElement("div"); div.className = "debug-line"; div.textContent = line;
      box.appendChild(div); box.scrollTop = box.scrollHeight;
    }
  },
  clear(){ S.debug.logs = []; $("#debug-console")?.replaceChildren(); },
  copy(){ navigator.clipboard?.writeText((S.debug.logs||[]).join("\n")).catch(()=>{}); }
};

/* Age gate */
function initAgeGate() {
  const ack = localStorage.getItem(LS_AGE);
  const dlg = $("#agegate"); const btn = $("#btn-age-accept");
  const cb18 = $("#age-18plus"); const cbHide = $("#age-hide");
  if (!dlg||!btn||!cb18) return;
  const close=()=>{ dlg.close?.(); dlg.classList.add("hide"); };
  const open =()=>{ try{ dlg.showModal?.(); }catch{} dlg.classList.remove("hide"); };
  if (ack==="1") close(); else {
    open(); btn.disabled = true;
    cb18.addEventListener("change", ()=> btn.disabled = !cb18.checked);
    btn.addEventListener("click", ()=>{ if (cb18.checked){ if (cbHide.checked) localStorage.setItem(LS_AGE,"1"); close(); }});
  }
}

/* Tabs */
const PAGES = { home:"#page-home", stats:"#page-stats", calendar:"#page-calendar", habits:"#page-habits", settings:"#page-settings" };
function showTab(id) {
  Object.values(PAGES).forEach(s => $(s)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");
  $$(".tab").forEach(b=> b.classList.toggle("active", b.dataset.tab===id));
  if (id==="stats") renderChart();
}

/* Counters */
const KINDS = ["cigs","joints","beer","hard","liqueur"];
function unitPrice(kind) {
  const p=S.prices, v=S.variants;
  switch(kind){
    case "cigs":
      if(p.cigarette>0) return p.cigarette;
      if(v.classic.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if(v.rolled.use && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    case "joints":
      if(p.joint>0) return p.joint;
      if(v.cannabis.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice * v.cannabis.gramsPerJoint;
      return 0;
    case "beer":    return p.beer>0 ? p.beer : (v.alcohol.beer.enabled && v.alcohol.beer.unitPrice>0 ? v.alcohol.beer.unitPrice : 0);
    case "hard":    return p.hard>0 ? p.hard : (v.alcohol.hard.enabled && v.alcohol.hard.dosePrice>0 ? v.alcohol.hard.dosePrice : 0);
    case "liqueur": return p.liqueur>0 ? p.liqueur : (v.alcohol.liqueur.enabled && v.alcohol.liqueur.dosePrice>0 ? v.alcohol.liqueur.dosePrice : 0);
    default: return 0;
  }
}
function computeCost(counters=S.today.counters){ let t=0; for(const k of KINDS){ if(!S.modules[k]||!S.today.active[k]) continue; t += Number(counters[k]||0)*unitPrice(k); } return t; }
function computeSaved(counters=S.today.counters){ let s=0; for(const k of KINDS){ const g=Number(S.goals[k]||0), a=Number(counters[k]||0); if(g>0 && a<g) s += (g-a)*unitPrice(k);} return s; }

function reflectCounters(){
  $("#val-cigs").textContent    = S.today.counters.cigs ?? 0;
  $("#val-joints").textContent  = S.today.counters.joints ?? 0;
  $("#val-beer").textContent    = S.today.counters.beer ?? 0;
  $("#val-hard").textContent    = S.today.counters.hard ?? 0;
  $("#val-liqueur").textContent = S.today.counters.liqueur ?? 0;

  const setDis=(id,on)=>{ const el=$(id); if(!el) return; el.style.opacity=on?"0.55":"1"; el.style.pointerEvents=on?"none":"auto"; };
  setDis("#ctr-cigs",!S.today.active.cigs||!S.modules.cigs);
  setDis("#ctr-joints",!S.today.active.joints||!S.modules.joints);
  setDis("#ctr-beer",!S.today.active.beer||!S.modules.beer);
  setDis("#ctr-hard",!S.today.active.hard||!S.modules.hard);
  setDis("#ctr-liqueur",!S.today.active.liqueur||!S.modules.liqueur);
}
function persistTodayIntoHistory(){
  const key=todayKey();
  if (S.today.date!==key){
    S.history[S.today.date]={...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
    S.today.date=key; S.today.counters={cigs:0,joints:0,beer:0,hard:0,liqueur:0};
  }
  S.history[key]={...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
}
function updateHeader(){
  $("#today-date").textContent=new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent=S.today.counters.cigs ?? 0;
  $("#hdr-joints").textContent=S.today.counters.joints ?? 0;
  $("#hdr-alcohol").textContent=(S.today.counters.beer+S.today.counters.hard+S.today.counters.liqueur)||0;
  const cost=computeCost(), saved=computeSaved();
  $("#hdr-cost").textContent=fmtMoney(cost,S.currency);
  $("#hdr-saved").textContent=fmtMoney(saved,S.currency);
  const sum=KINDS.reduce((s,k)=>s+(S.today.counters[k]||0),0);
  const badge=$("#hdr-status"); badge.textContent=sum===0?"✓":"•"; badge.style.background=sum===0?"#124232":"#1f2b48";
}
function initCounters(){
  $$("[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const kind=btn.dataset.kind, action=btn.dataset.action;
      if(!KINDS.includes(kind)) return;
      if(!S.modules[kind]||!S.today.active[kind]) return;
      const cur=Number(S.today.counters[kind]||0);
      S.today.counters[kind]= action==="inc"?cur+1:Math.max(0,cur-1);
      persistTodayIntoHistory(); reflectCounters(); updateHeader(); renderChart(_period); saveState(S); dbg.push(`Counter ${kind}`, "event");
      Tips?.updateTips?.(S);
      Cal?.update(S);
    });
  });
  const map={cigs:"#chk-cigs-active", joints:"#chk-joints-active", beer:"#chk-beer-active", hard:"#chk-hard-active", liqueur:"#chk-liqueur-active"};
  for(const k of KINDS){
    const el=$(map[k]); if(!el) continue;
    el.checked=!!S.today.active[k];
    el.addEventListener("change", ()=>{ S.today.active[k]=el.checked; reflectCounters(); saveState(S); Tips?.updateTips?.(S); Cal?.update(S); });
  }
  reflectCounters();
}

/* Stats */
let chart; let _period="day";
function fmtDate(iso){ const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function dateRangeFor(period, refDate=new Date()){
  const d=new Date(refDate); const start=new Date(d); const end=new Date(d);
  if(period==="week"){ const wd=(d.getDay()+6)%7; start.setDate(d.getDate()-wd); end.setDate(start.getDate()+6); }
  else if(period==="month"){ start.setDate(1); end.setMonth(d.getMonth()+1,0); }
  else if(period==="year"){ start.setMonth(0,1); end.setMonth(11,31); }
  return { start: todayKey(start), end: todayKey(end) };
}
function renderChart(period=_period){
  persistTodayIntoHistory(); const canvas=$("#chart-main"); if(!canvas||typeof Chart==="undefined") return;
  const labels=["Cigarettes","Joints","Bière","Alcool fort","Liqueur","Coût","Économies"];
  let counters={cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0};
  const now=new Date(); const todayStr=todayKey(now);
  if(period==="day"){ const d=S.history[todayStr]||{}; counters={cigs:d.cigs||0,joints:d.joints||0,beer:d.beer||0,hard:d.hard||0,liqueur:d.liqueur||0,cost:d.cost||0,saved:d.saved||0}; $("#stats-date").textContent=new Date().toLocaleDateString("fr-FR"); }
  else { const range=dateRangeFor(period,now); for(const k of Object.keys(S.history)){ if(k>=range.start && k<=range.end){ const d=S.history[k]||{}; counters.cigs+=d.cigs||0; counters.joints+=d.joints||0; counters.beer+=d.beer||0; counters.hard+=d.hard||0; counters.liqueur+=d.liqueur||0; counters.cost+=d.cost||0; counters.saved+=d.saved||0; } } $("#stats-date").textContent=`${fmtDate(range.start)} → ${fmtDate(range.end)}`; }
  const data=[counters.cigs,counters.joints,counters.beer,counters.hard,counters.liqueur,Number(counters.cost||0),Number(counters.saved||0)];
  if(chart) chart.destroy();
  chart=new Chart(canvas.getContext("2d"),{ type:"bar", data:{labels,datasets:[{label:"Valeurs",data}]},
    options:{ responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label:(ctx)=> ctx.dataIndex>=5?`${labels[ctx.dataIndex]}: ${fmtMoney(ctx.parsed.y,S.currency)}`:`${labels[ctx.dataIndex]}: ${ctx.parsed.y}`}}}}});
}
function initStats(){
  $("#btnPeriod-day")?.addEventListener("click", ()=>{ _period="day"; renderChart(); });
  $("#btnPeriod-week")?.addEventListener("click", ()=>{ _period="week"; renderChart(); });
  $("#btnPeriod-month")?.addEventListener("click", ()=>{ _period="month"; renderChart(); });
  $("#btnPeriod-year")?.addEventListener("click", ()=>{ _period="year"; renderChart(); });

  $("#btn-export-csv")?.addEventListener("click", ()=>{
    const rows=[["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    const keys=Object.keys(S.history).sort();
    for(const k of keys){ const d=S.history[k]||{}; rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(d.cost||0).toFixed(2),(d.saved||0).toFixed(2)]); }
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="stopaddict_stats.csv"; document.body.appendChild(a); a.click(); a.remove();
    dbg.push("Export CSV ok","ok");
  });
  $("#btn-export-json")?.addEventListener("click", ()=>{
    const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="stopaddict_export.json"; document.body.appendChild(a); a.click(); a.remove();
    dbg.push("Export JSON ok","ok");
  });
  $("#file-import-json")?.addEventListener("change", async (ev)=>{
    const file=ev.target.files?.[0]; if(!file) return;
    try{ const text=await file.text(); const obj=JSON.parse(text); S={...DefaultState(),...obj}; saveState(S); hydrateUIFromState(); renderChart(_period); Cal?.update(S); dbg.push("Import JSON ok","ok"); }
    catch(e){ dbg.push("Import JSON erreur: "+e?.message,"err"); alert("Import JSON invalide."); }
    finally{ ev.target.value=""; }
  });
}

/* Tips */
function initTips(){ if(!Tips?.mountTips) return; Tips.mountTips({ rootSel:"#tips-root", stateGetter:()=>S }); Tips.updateTips?.(S); }

/* Habits (inline minimal) */
function setVal(sel,val,isText=false){ const el=$(sel); if(el) el.value=isText?(val??""):Number(val??0); }
function initHabits(){
  setVal("#goal-cigs",S.goals.cigs); setVal("#goal-joints",S.goals.joints); setVal("#goal-beer",S.goals.beer); setVal("#goal-hard",S.goals.hard); setVal("#goal-liqueur",S.goals.liqueur);
  $("#btn-habits-save")?.addEventListener("click", ()=>{ S.goals.cigs=Number($("#goal-cigs").value||0); S.goals.joints=Number($("#goal-joints").value||0); S.goals.beer=Number($("#goal-beer").value||0); S.goals.hard=Number($("#goal-hard").value||0); S.goals.liqueur=Number($("#goal-liqueur").value||0); persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S); dbg.push("Objectifs quotidiens enregistrés","ok"); Cal?.update(S); });
  $("#btn-habits-reset")?.addEventListener("click", ()=>{ S.goals={...DefaultState().goals}; setVal("#goal-cigs",0); setVal("#goal-joints",0); setVal("#goal-beer",0); setVal("#goal-hard",0); setVal("#goal-liqueur",0); persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S); dbg.push("Objectifs réinitialisés","ok"); Cal?.update(S); });
  const D=S.dates; const map=[["#date-stop-global","stopGlobal"],["#date-stop-alcohol","stopAlcohol"],["#date-stop-cigs","stopCigs"],["#date-stop-joints","stopJoints"],["#date-reduce-cigs","reduceCigs"],["#date-quit-cigs-obj","quitCigsObj"],["#date-nomore-cigs","noMoreCigs"],["#date-reduce-joints","reduceJoints"],["#date-quit-joints-obj","quitJointsObj"],["#date-nomore-joints","noMoreJoints"],["#date-reduce-alcohol","reduceAlcohol"],["#date-quit-alcohol-obj","quitAlcoholObj"],["#date-nomore-alcohol","noMoreAlcohol"]];
  map.forEach(([sel,key])=>{ const el=$(sel); if(!el) return; el.value=D[key]||""; el.addEventListener("change",(e)=>{ S.dates[key]=e.target.value||""; saveState(S); }); });
}

/* i18n placeholder */
async function initI18nIfAvailable(){ /* hook si i18n.js présent */ }

/* Hydrate */
function hydrateUIFromState(){
  $("#app-title").textContent="StopAddict";
  $("#today-date").textContent=new Date().toLocaleDateString("fr-FR");
  reflectCounters();
  $("#chk-cigs-active").checked=!!S.today.active.cigs; $("#chk-joints-active").checked=!!S.today.active.joints; $("#chk-beer-active").checked=!!S.today.active.beer; $("#chk-hard-active").checked=!!S.today.active.hard; $("#chk-liqueur-active").checked=!!S.today.active.liqueur;
  updateHeader();
  Cal?.update(S);
}

/* Boot */
let Cal=null;
window.addEventListener("DOMContentLoaded", async ()=>{
  if(!S.today?.date) S.today.date=todayKey();
  await initI18nIfAvailable();
  initAgeGate();

  $$("#tabs .tab").forEach(btn=> btn.addEventListener("click", ()=> showTab(btn.dataset.tab)));
  showTab("home");

  initCounters();
  initHabits();
  initStats();
  initTips();

  if (CalendarMod?.mountCalendar){
    Cal = CalendarMod.mountCalendar({ S, getState:()=>S, showTab });
  }

  if (mountSettings){
    mountSettings({ S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, renderChart, reflectCounters, dbg });
  }

  hydrateUIFromState();
  persistTodayIntoHistory();
  renderChart(_period);

  // Debug overlay (5 taps)
  let taps=[]; $("#today-date")?.addEventListener("click", ()=>{ const now=Date.now(); taps=taps.filter(t=> now-t<=900); taps.push(now); if(taps.length>=5){ $("#debug-console")?.classList.toggle("hide"); taps=[]; dbg.push("Toggle overlay","ok"); } });

  dbg.push("App ready","ok");
});
