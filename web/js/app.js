/* Orchestrateur StopAddict (ES module) */
import { LS_KEY, LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney } from './state.js';

let mountSettings=null, Tips=null, CalendarMod=null;
try{ const m=await import('./settings.js'); if(typeof m?.mountSettings==='function') mountSettings=m.mountSettings; }catch{}
try{ const m=await import('./tips.js'); if(typeof m?.mountTips==='function') Tips=m; }catch{}
try{ const m=await import('./calendar.js'); if(typeof m?.mountCalendar==='function') CalendarMod=m; }catch{}

const $  = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);

let S = loadState();

/* Debug court */
const dbg={ push(x){ S.debug=S.debug||{}; S.debug.logs=S.debug.logs||[]; S.debug.logs.push(`[${new Date().toLocaleTimeString()}] ${x}`); if(S.debug.logs.length>400) S.debug.logs.shift(); } };

/* Age gate + ressources */
function openResources(){
  const dlg=$("#resources-dlg"), list=$("#resources-list");
  if(!dlg||!list) return;
  list.innerHTML="";
  const data = (globalThis.RESOURCES && Array.isArray(globalThis.RESOURCES)) ? globalThis.RESOURCES : [
    {title:"Alcool Info Service", phone:"0 980 980 930", url:"https://www.alcool-info-service.fr"},
    {title:"Tabac Info Service", phone:"39 89", url:"https://www.tabac-info-service.fr"},
    {title:"Drogues Info Service", phone:"0 800 23 13 13", url:"https://www.drogues-info-service.fr"}
  ];
  data.forEach(r=>{
    const div=document.createElement('div'); div.className='tip-line';
    div.innerHTML=`<strong>${r.title}</strong><br/>📞 ${r.phone || '-'} ${r.url?` · 🔗 <a href="${r.url}" target="_blank" rel="noopener">site</a>`:''}`;
    list.appendChild(div);
  });
  try{ dlg.showModal(); }catch{ dlg.classList.remove('hide'); }
  $("#btn-res-close")?.addEventListener('click',()=>dlg.close?.());
}
function initAgeGate(){
  const ack=localStorage.getItem(LS_AGE);
  const dlg=$("#agegate"), ok=$("#btn-age-accept"), cb=$("#age-18plus"), hide=$("#age-hide");
  $("#btn-age-res")?.addEventListener('click',openResources);
  if(ack==="1"){ dlg?.close?.(); dlg?.classList.add('hide'); return; }
  try{ dlg?.showModal?.(); }catch{}
  ok.disabled=true;
  cb?.addEventListener('change',()=> ok.disabled=!cb.checked);
  ok?.addEventListener('click',()=>{ if(cb.checked){ if(hide?.checked) localStorage.setItem(LS_AGE,"1"); dlg?.close?.(); dlg?.classList.add('hide'); }});
}

/* Tabs */
const PAGES={home:"#page-home",stats:"#page-stats",calendar:"#page-calendar",habits:"#page-habits",settings:"#page-settings"};
function showTab(id){
  Object.values(PAGES).forEach(sel=>$(sel)?.classList.add('hide'));
  $(PAGES[id])?.classList.remove('hide');
  $$("#tabs .tab").forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  if(id==='stats'){ renderCharts(); }
}

/* Counters */
const K=["cigs","joints","beer","hard","liqueur"];
function unitPrice(kind){
  const p=S.prices, v=S.variants;
  switch(kind){
    case "cigs":
      if(p.cigarette>0) return p.cigarette;
      if(v.classic?.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if(v.rolled?.use && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    case "joints":
      if(p.joint>0) return p.joint;
      if(v.cannabis?.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice*v.cannabis.gramsPerJoint;
      return 0;
    case "beer":    return p.beer>0? p.beer : (v.alcohol?.beer?.enabled && v.alcohol.beer.unitPrice>0 ? v.alcohol.beer.unitPrice : 0);
    case "hard":    return p.hard>0? p.hard : (v.alcohol?.hard?.enabled && v.alcohol.hard.dosePrice>0 ? v.alcohol.hard.dosePrice : 0);
    case "liqueur": return p.liqueur>0? p.liqueur : (v.alcohol?.liqueur?.enabled && v.alcohol.liqueur.dosePrice>0 ? v.alcohol.liqueur.dosePrice : 0);
    default: return 0;
  }
}
function computeCost(c=S.today.counters){ let t=0; for(const k of K){ if(!S.modules[k]||!S.today.active[k]) continue; t += Number(c[k]||0)*unitPrice(k);} return t; }
function computeSaved(c=S.today.counters){ let s=0; for(const k of K){ const g=Number(S.goals[k]||0), a=Number(c[k]||0); if(g>0 && a<g) s+=(g-a)*unitPrice(k);} return s; }
function persistToday(){
  const key=todayKey();
  if(S.today.date!==key){
    S.history[S.today.date]={...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
    S.today.date=key; S.today.counters={cigs:0,joints:0,beer:0,hard:0,liqueur:0};
  }
  S.history[key]={...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
}
function reflectCounters(){
  $("#val-cigs").textContent=S.today.counters.cigs||0;
  $("#val-joints").textContent=S.today.counters.joints||0;
  $("#val-beer").textContent=S.today.counters.beer||0;
  $("#val-hard").textContent=S.today.counters.hard||0;
  $("#val-liqueur").textContent=S.today.counters.liqueur||0;
  const setDis=(id,on)=>{ const el=$(id); if(!el) return; el.style.opacity=on?".55":"1"; el.style.pointerEvents=on?"none":"auto"; };
  setDis("#ctr-cigs",!S.today.active.cigs||!S.modules.cigs);
  setDis("#ctr-joints",!S.today.active.joints||!S.modules.joints);
  setDis("#ctr-beer",!S.today.active.beer||!S.modules.beer);
  setDis("#ctr-hard",!S.today.active.hard||!S.modules.hard);
  setDis("#ctr-liqueur",!S.today.active.liqueur||!S.modules.liqueur);
}
function updateHeader(){
  $("#today-date").textContent=new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent=S.today.counters.cigs||0;
  $("#hdr-joints").textContent=S.today.counters.joints||0;
  $("#hdr-alcohol").textContent=(S.today.counters.beer+S.today.counters.hard+S.today.counters.liqueur)||0;
  $("#hdr-cost").textContent=fmtMoney(computeCost(),S.currency);
  $("#hdr-saved").textContent=fmtMoney(computeSaved(),S.currency);
  const sum=K.reduce((n,k)=>n+(S.today.counters[k]||0),0);
  const badge=$("#hdr-status"); badge.textContent=sum===0?"✓":"•"; badge.style.background=sum===0?"#124232":"#1f2b48";
}
function initCounters(){
  $$("[data-action]").forEach(b=>{
    b.addEventListener("click",()=>{
      const k=b.dataset.kind, a=b.dataset.action;
      if(!K.includes(k)) return;
      if(!S.modules[k]||!S.today.active[k]) return;
      const cur=Number(S.today.counters[k]||0);
      S.today.counters[k]=(a==="inc")?cur+1:Math.max(0,cur-1);
      persistToday(); reflectCounters(); updateHeader(); renderCharts(); saveState(S);
      Tips?.updateTips?.(S); Cal?.update?.(S);
    });
  });
  const map={cigs:"#chk-cigs-active", joints:"#chk-joints-active", beer:"#chk-beer-active", hard:"#chk-hard-active", liqueur:"#chk-liqueur-active"};
  for(const k of K){
    const el=$(map[k]); if(!el) continue;
    el.checked=!!S.today.active[k];
    el.addEventListener("change",()=>{ S.today.active[k]=el.checked; reflectCounters(); saveState(S); Tips?.updateTips?.(S); Cal?.update?.(S); });
  }
}

/* Stats : 2 graphiques (quantités + €) avec période */
let chartA=null, chartB=null, PERIOD="day";
function fmtDate(iso){ const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function rangeFor(period, ref=new Date()){
  const d=new Date(ref), s=new Date(d), e=new Date(d);
  if(period==="week"){ const wd=(d.getDay()+6)%7; s.setDate(d.getDate()-wd); e.setDate(s.getDate()+6); }
  else if(period==="month"){ s.setDate(1); e.setMonth(d.getMonth()+1,0); }
  else if(period==="year"){ s.setMonth(0,1); e.setMonth(11,31); }
  return { start: todayKey(s), end: todayKey(e) };
}
function agg(period){
  persistToday();
  const keys=Object.keys(S.history);
  let R={cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0};
  if(period==="day"){
    const k=todayKey(); const d=S.history[k]||{};
    return { ...R, ...{cigs:d.cigs||0,joints:d.joints||0,beer:d.beer||0,hard:d.hard||0,liqueur:d.liqueur||0,cost:d.cost||0,saved:d.saved||0}, label:new Date().toLocaleDateString("fr-FR") };
  }
  const {start,end}=rangeFor(period);
  keys.forEach(k=>{
    if(k>=start && k<=end){
      const d=S.history[k]||{};
      R.cigs+=d.cigs||0; R.joints+=d.joints||0; R.beer+=d.beer||0; R.hard+=d.hard||0; R.liqueur+=d.liqueur||0; R.cost+=d.cost||0; R.saved+=d.saved||0;
    }
  });
  return { ...R, label:`${fmtDate(start)} → ${fmtDate(end)}` };
}
function renderCharts(){
  const r=agg(PERIOD);
  $("#stats-date").textContent=r.label;
  const counts=[r.cigs,r.joints,r.beer,r.hard,r.liqueur];
  const euros=[Number(r.cost||0), Number(r.saved||0)];
  const L1=["Cigarettes","Joints","Bière","Alcool fort","Liqueur"];
  const L2=["Coût","Économies"];
  if(typeof Chart==="undefined") return;
  if(chartA) chartA.destroy();
  if(chartB) chartB.destroy();
  chartA=new Chart($("#chart-counts").getContext("2d"),{
    type:"bar", data:{labels:L1, datasets:[{label:"Quantités", data:counts}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
  });
  chartB=new Chart($("#chart-money").getContext("2d"),{
    type:"bar", data:{labels:L2, datasets:[{label:"Montants", data:euros}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}, tooltip:{callbacks:{label:(ctx)=> `${L2[ctx.dataIndex]}: ${fmtMoney(ctx.parsed.y,S.currency)}`}}},scales:{y:{beginAtZero:true}}}
  });
}
function initStats(){
  $("#btnPeriod-day")?.addEventListener("click",()=>{PERIOD="day";renderCharts();});
  $("#btnPeriod-week")?.addEventListener("click",()=>{PERIOD="week";renderCharts();});
  $("#btnPeriod-month")?.addEventListener("click",()=>{PERIOD="month";renderCharts();});
  $("#btnPeriod-year")?.addEventListener("click",()=>{PERIOD="year";renderCharts();});
  $("#btn-export-csv")?.addEventListener("click",()=>{
    const rows=[["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    Object.keys(S.history).sort().forEach(k=>{ const d=S.history[k]||{}; rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(d.cost||0).toFixed(2),(d.saved||0).toFixed(2)]); });
    const csv=rows.map(r=>r.join(",")).join("\n"); const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="stopaddict_stats.csv"; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#btn-export-json")?.addEventListener("click",()=>{
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:"application/json"})); a.download="stopaddict_export.json"; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#file-import-json")?.addEventListener("change",async ev=>{
    const f=ev.target.files?.[0]; if(!f) return;
    try{ const obj=JSON.parse(await f.text()); S={...DefaultState(),...obj}; saveState(S); hydrate(); renderCharts(); Cal?.update?.(S);}
    catch{ alert("Import JSON invalide."); }
    finally{ ev.target.value=""; }
  });
}

/* Tips */
function initTips(){
  if(!Tips?.mountTips) return;
  Tips.mountTips({ rootSel:"#tips-root", listSel:"#tips-list", stateGetter:()=>S });
  Tips.updateTips?.(S);
}

/* Habits (simplifié) */
function setVal(sel,val,isText=false){ const el=$(sel); if(!el) return; el.value=isText?(val??""):Number(val??0); }
function initHabits(){
  setVal("#goal-cigs",S.goals.cigs); setVal("#goal-joints",S.goals.joints); setVal("#goal-beer",S.goals.beer); setVal("#goal-hard",S.goals.hard); setVal("#goal-liqueur",S.goals.liqueur);
  $("#btn-habits-save")?.addEventListener("click",()=>{ S.goals.cigs=+$("#goal-cigs").value||0; S.goals.joints=+$("#goal-joints").value||0; S.goals.beer=+$("#goal-beer").value||0; S.goals.hard=+$("#goal-hard").value||0; S.goals.liqueur=+$("#goal-liqueur").value||0; persistToday(); updateHeader(); renderCharts(); saveState(S); Tips?.updateTips?.(S); Cal?.update?.(S); });
  $("#btn-habits-reset")?.addEventListener("click",()=>{ S.goals={...DefaultState().goals}; setVal("#goal-cigs",0); setVal("#goal-joints",0); setVal("#goal-beer",0); setVal("#goal-hard",0); setVal("#goal-liqueur",0); persistToday(); updateHeader(); renderCharts(); saveState(S); Tips?.updateTips?.(S); Cal?.update?.(S); });
  // Dates
  const D=S.dates||{}; const map=[["#date-stop-global","stopGlobal"],["#date-stop-alcohol","stopAlcohol"],["#date-reduce-cigs","reduceCigs"],["#date-quit-cigs-obj","quitCigsObj"],["#date-nomore-cigs","noMoreCigs"],["#date-reduce-joints","reduceJoints"],["#date-quit-joints-obj","quitJointsObj"],["#date-nomore-joints","noMoreJoints"],["#date-reduce-alcohol","reduceAlcohol"],["#date-quit-alcohol-obj","quitAlcoholObj"],["#date-nomore-alcohol","noMoreAlcohol"]];
  map.forEach(([sel,key])=>{ const el=$(sel); if(!el) return; el.value=D[key]||""; el.addEventListener("change",e=>{ S.dates[key]=e.target.value||""; saveState(S); }); });
}

/* Hydrate + Settings + Calendar */
function hydrate(){
  $("#app-title").textContent="StopAddict";
  $("#today-date").textContent=new Date().toLocaleDateString("fr-FR");
  reflectCounters(); updateHeader();
}

/* Boot */
let Cal=null;
(function init(){
  // UI
  initAgeGate();
  $("#btn-open-res")?.addEventListener('click',openResources);
  $("#btn-resources")?.addEventListener('click',openResources);

  $$("#tabs .tab").forEach(b=> b.addEventListener("click",()=>showTab(b.dataset.tab)));
  showTab("home");

  initCounters();
  initHabits();
  initStats();
  initTips();

  if(CalendarMod?.mountCalendar){ Cal=CalendarMod.mountCalendar({ S, getState:()=>S, showTab }); }
  if(mountSettings){ mountSettings({ S, DefaultState, saveState, persistToday, updateHeader, renderCharts, reflectCounters, dbg }); }

  hydrate(); persistToday(); renderCharts();

  dbg.push("App ready");
})();
