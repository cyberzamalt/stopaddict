/* Orchestrateur StopAddict (module) – câblage UI + Tips + Ressources */
import { LS_KEY, LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney } from './state.js';
let mountSettings=null; try{ const m=await import('./settings.js'); if(typeof m?.mountSettings==="function") mountSettings=m.mountSettings; }catch{}
let Tips=null;         try{ const m=await import('./tips.js');     if(typeof m?.mountTips==="function") Tips=m; }catch{}
let CalendarMod=null;  try{ const m=await import('./calendar.js'); if(typeof m?.mountCalendar==="function") CalendarMod=m; }catch{}
let RESOURCES=null;    try{ const m=await import('./resources.js'); if(m?.RESOURCES) RESOURCES=m.RESOURCES; }catch{}

const $ = s=>document.querySelector(s), $$ = s=>document.querySelectorAll(s);
let S = loadState();

/* Debug minimal */
const dbg={ push:(m,t="info")=>console?.log?.(`[${t}] ${m}`) };

/* Age gate */
function initAgeGate(){
  const dlg=$("#agegate"), btn=$("#btn-age-accept"), cb=$("#age-18plus"), hide=$("#age-hide");
  if(!dlg||!btn||!cb) return;
  const ack=localStorage.getItem(LS_AGE);
  const close=()=>{ dlg.close?.(); dlg.classList.add("hide"); };
  const open =()=>{ try{dlg.showModal?.()}catch{} dlg.classList.remove("hide"); };
  if(ack==="1") close(); else{ open(); btn.disabled=true; cb.addEventListener("change",()=>btn.disabled=!cb.checked);
    btn.addEventListener("click",()=>{ if(cb.checked){ if(hide?.checked) localStorage.setItem(LS_AGE,"1"); close(); }});
  }
}

/* Tabs */
const PAGES={home:"#page-home",stats:"#page-stats",calendar:"#page-calendar",habits:"#page-habits",settings:"#page-settings"};
function showTab(id){ Object.values(PAGES).forEach(s=>$(s)?.classList.add("hide")); $(PAGES[id])?.classList.remove("hide"); $$("#tabs .tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===id)); if(id==="stats") renderChart(); }

/* Counters */
const KINDS=["cigs","joints","beer","hard","liqueur"];
function unitPrice(kind){
  const p=S.prices, v=S.variants;
  switch(kind){
    case "cigs":    if(p.cigarette>0) return p.cigarette; if(v.classic.use&&v.classic.packPrice>0&&v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack; if(v.rolled.use&&v.rolled.tobacco30gPrice>0&&v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g; return 0;
    case "joints":  if(p.joint>0) return p.joint; if(v.cannabis.use&&v.cannabis.gramPrice>0&&v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice*v.cannabis.gramsPerJoint; return 0;
    case "beer":    return p.beer>0?p.beer:(v.alcohol.beer.enabled&&v.alcohol.beer.unitPrice>0?v.alcohol.beer.unitPrice:0);
    case "hard":    return p.hard>0?p.hard:(v.alcohol.hard.enabled&&v.alcohol.hard.dosePrice>0?v.alcohol.hard.dosePrice:0);
    case "liqueur": return p.liqueur>0?p.liqueur:(v.alcohol.liqueur.enabled&&v.alcohol.liqueur.dosePrice>0?v.alcohol.liqueur.dosePrice:0);
    default: return 0;
  }
}
function computeCost(c=S.today.counters){ let t=0; for(const k of KINDS){ if(!S.modules[k]||!S.today.active[k]) continue; t+=Number(c[k]||0)*unitPrice(k);} return t; }
function computeSaved(c=S.today.counters){ let s=0; for(const k of KINDS){ const g=Number(S.goals[k]||0), a=Number(c[k]||0); if(g>0 && a<g) s+=(g-a)*unitPrice(k);} return s; }
function reflectCounters(){
  $("#val-cigs").textContent=S.today.counters.cigs??0; $("#val-joints").textContent=S.today.counters.joints??0; $("#val-beer").textContent=S.today.counters.beer??0; $("#val-hard").textContent=S.today.counters.hard??0; $("#val-liqueur").textContent=S.today.counters.liqueur??0;
  const setDis=(id,on)=>{ const el=$(id); if(!el) return; el.style.opacity=on?"0.55":"1"; el.style.pointerEvents=on?"none":"auto"; };
  setDis("#ctr-cigs",!S.today.active.cigs||!S.modules.cigs);
  setDis("#ctr-joints",!S.today.active.joints||!S.modules.joints);
  setDis("#ctr-beer",!S.today.active.beer||!S.modules.beer);
  setDis("#ctr-hard",!S.today.active.hard||!S.modules.hard);
  setDis("#ctr-liqueur",!S.today.active.liqueur||!S.modules.liqueur);
}
function persistTodayIntoHistory(){
  const key=todayKey();
  if(S.today.date!==key){
    S.history[S.today.date]={...S.today.counters,cost:computeCost(),saved:computeSaved()};
    S.today.date=key; S.today.counters={cigs:0,joints:0,beer:0,hard:0,liqueur:0};
  }
  S.history[key]={...S.today.counters,cost:computeCost(),saved:computeSaved()};
}
function updateHeader(){
  $("#today-date").textContent=new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent=S.today.counters.cigs??0;
  $("#hdr-joints").textContent=S.today.counters.joints??0;
  $("#hdr-alcohol").textContent=(S.today.counters.beer+S.today.counters.hard+S.today.counters.liqueur)||0;
  $("#hdr-cost").textContent=fmtMoney(computeCost(),S.currency);
  $("#hdr-saved").textContent=fmtMoney(computeSaved(),S.currency);
  const sum=KINDS.reduce((s,k)=>s+(S.today.counters[k]||0),0); const badge=$("#hdr-status"); badge.textContent=sum===0?"✓":"•"; badge.style.background=sum===0?"#124232":"#1f2b48";
}
function initCounters(){
  $$("[data-action]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const k=btn.dataset.kind, a=btn.dataset.action;
      if(!S.modules[k]||!S.today.active[k]) return;
      const cur=Number(S.today.counters[k]||0); S.today.counters[k]=(a==="inc")?cur+1:Math.max(0,cur-1);
      persistTodayIntoHistory(); reflectCounters(); updateHeader(); renderChart(_period); saveState(S);
      Tips?.updateTips?.(S); Cal?.update(S);
    });
  });
  const map={cigs:"#chk-cigs-active",joints:"#chk-joints-active",beer:"#chk-beer-active",hard:"#chk-hard-active",liqueur:"#chk-liqueur-active"};
  for(const k of KINDS){ const el=$(map[k]); if(!el) continue; el.checked=!!S.today.active[k]; el.addEventListener("change",()=>{ S.today.active[k]=el.checked; reflectCounters(); saveState(S); Tips?.updateTips?.(S); Cal?.update(S); }); }
  reflectCounters();
}

/* Stats (bar simple) */
let chart; let _period="day";
function fmtDate(iso){ const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function dateRangeFor(period, ref=new Date()){ const d=new Date(ref), s=new Date(d), e=new Date(d); if(period==="week"){const wd=(d.getDay()+6)%7; s.setDate(d.getDate()-wd); e.setDate(s.getDate()+6);} else if(period==="month"){ s.setDate(1); e.setMonth(d.getMonth()+1,0);} else if(period==="year"){ s.setMonth(0,1); e.setMonth(11,31);} return {start:todayKey(s),end:todayKey(e)}; }
function renderChart(period=_period){
  persistTodayIntoHistory(); const ctx=$("#chart-main")?.getContext("2d"); if(!ctx||typeof Chart==="undefined") return;
  const labels=["Cigarettes","Joints","Bière","Alcool fort","Liqueur","Coût","Économies"];
  let c={cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0}, now=new Date(); const t=todayKey(now);
  if(period==="day"){ const d=S.history[t]||{}; c={cigs:d.cigs||0,joints:d.joints||0,beer:d.beer||0,hard:d.hard||0,liqueur:d.liqueur||0,cost:d.cost||0,saved:d.saved||0}; $("#stats-date").textContent=new Date().toLocaleDateString("fr-FR"); }
  else{ const r=dateRangeFor(period,now); for(const k of Object.keys(S.history)){ if(k>=r.start&&k<=r.end){ const d=S.history[k]||{}; c.cigs+=d.cigs||0; c.joints+=d.joints||0; c.beer+=d.beer||0; c.hard+=d.hard||0; c.liqueur+=d.liqueur||0; c.cost+=d.cost||0; c.saved+=d.saved||0; } } $("#stats-date").textContent=`${fmtDate(r.start)} → ${fmtDate(r.end)}`; }
  const data=[c.cigs,c.joints,c.beer,c.hard,c.liqueur,Number(c.cost||0),Number(c.saved||0)];
  if(chart) chart.destroy(); chart=new Chart(ctx,{type:"bar",data:{labels,datasets:[{label:"Valeurs",data}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}},plugins:{legend:{display:false},tooltip:{callbacks:{label:(x)=> x.dataIndex>=5?`${labels[x.dataIndex]}: ${fmtMoney(x.parsed.y,S.currency)}`:`${labels[x.dataIndex]}: ${x.parsed.y}`}}}}});
}
function initStats(){
  $("#btnPeriod-day")?.addEventListener("click",()=>{_period="day";renderChart();});
  $("#btnPeriod-week")?.addEventListener("click",()=>{_period="week";renderChart();});
  $("#btnPeriod-month")?.addEventListener("click",()=>{_period="month";renderChart();});
  $("#btnPeriod-year")?.addEventListener("click",()=>{_period="year";renderChart();});
  $("#btn-export-csv")?.addEventListener("click",()=>{
    const rows=[["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    const keys=Object.keys(S.history).sort(); for(const k of keys){ const d=S.history[k]||{}; rows.push([k,d.cigs||0,d.joints||0,d.beer||0,d.hard||0,d.liqueur||0,(d.cost||0).toFixed(2),(d.saved||0).toFixed(2)]);}
    const csv=rows.map(r=>r.join(",")).join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="stopaddict_stats.csv"; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#btn-export-json")?.addEventListener("click",()=>{
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:"application/json"})); a.download="stopaddict_export.json"; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#file-import-json")?.addEventListener("change",async(ev)=>{
    const f=ev.target.files?.[0]; if(!f) return;
    try{ const obj=JSON.parse(await f.text()); S={...DefaultState(),...obj}; saveState(S); hydrateUIFromState(); renderChart(_period); Cal?.update(S); }
    catch{ alert("Import JSON invalide."); }
    finally{ ev.target.value=""; }
  });
}

/* Tips */
function initTips(){ if(!Tips?.mountTips) return; Tips.mountTips({rootSel:"#tips-root",stateGetter:()=>S}); Tips.updateTips?.(S); }

/* Habits (light) */
function setVal(sel,val){ const el=$(sel); if(el) el.value=Number(val||0); }
function initHabits(){
  setVal("#goal-cigs",S.goals.cigs); setVal("#goal-joints",S.goals.joints); setVal("#goal-beer",S.goals.beer); setVal("#goal-hard",S.goals.hard); setVal("#goal-liqueur",S.goals.liqueur);
  $("#btn-habits-save")?.addEventListener("click",()=>{ S.goals.cigs=+$("#goal-cigs").value||0; S.goals.joints=+$("#goal-joints").value||0; S.goals.beer=+$("#goal-beer").value||0; S.goals.hard=+$("#goal-hard").value||0; S.goals.liqueur=+$("#goal-liqueur").value||0; persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S); Tips?.updateTips?.(S); Cal?.update(S); });
  $("#btn-habits-reset")?.addEventListener("click",()=>{ S.goals={...DefaultState().goals}; ["cigs","joints","beer","hard","liqueur"].forEach(k=>setVal(`#goal-${k}`,0)); persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S); Tips?.updateTips?.(S); Cal?.update(S); });
}

/* Ressources (ouvre une boîte simple à partir de resources.js) */
function openResources(){
  if(!RESOURCES?.length){ alert("Ressources indisponibles."); return; }
  const dlg=document.createElement("dialog"); dlg.className="agegate"; dlg.style.minWidth="320px";
  dlg.innerHTML = `
    <h3>Ressources & numéros utiles</h3>
    <div style="max-height:55vh;overflow:auto;padding:.25rem 0">
      ${RESOURCES.map(g=>`
        <div style="margin:.4rem 0 .2rem 0;font-weight:700">${g.cat}</div>
        <ul style="margin:.2rem 0 .6rem 1rem;padding:0">
          ${g.items.map(it=>`<li style="margin:.15rem 0">
            ${it.name} — ${it.phone?`<a href="tel:${it.phone.replace(/\\s/g,'')}">${it.phone}</a>`:""}
            ${it.url?` · <a target="_blank" rel="noopener" href="${it.url}">site</a>`:""}
          </li>`).join("")}
        </ul>
      `).join("")}
    </div>
    <div class="actions" style="justify-content:flex-end"><button class="btn">Fermer</button></div>`;
  document.body.appendChild(dlg);
  dlg.querySelector("button")?.addEventListener("click",()=>dlg.close());
  try{ dlg.showModal?.(); }catch{ dlg.classList.remove("agegate"); dlg.style.position="fixed"; dlg.style.left="50%"; dlg.style.top="20%"; dlg.style.transform="translateX(-50%)"; }
  dlg.addEventListener("close",()=>dlg.remove());
}

/* Hydrate */
function hydrateUIFromState(){
  $("#app-title").textContent="StopAddict";
  $("#today-date").textContent=new Date().toLocaleDateString("fr-FR");
  reflectCounters(); ["cigs","joints","beer","hard","liqueur"].forEach(k=>{ const el=$(`#chk-${k}-active`); if(el) el.checked=!!S.today.active[k]; });
  updateHeader(); Cal?.update(S);
}

/* Boot */
let Cal=null;
(async function init(){
  if(!S.today?.date) S.today.date=todayKey();
  initAgeGate();
  $$("#tabs .tab").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
  showTab("home");
  initCounters(); initHabits(); initStats(); initTips();
  if(CalendarMod?.mountCalendar){ Cal=CalendarMod.mountCalendar({S,getState:()=>S,showTab}); }
  if(mountSettings){ mountSettings({S,DefaultState,saveState,persistTodayIntoHistory,updateHeader,renderChart,reflectCounters,dbg}); }
  $("#btn-resources")?.addEventListener("click",openResources);
  hydrateUIFromState(); persistTodayIntoHistory(); renderChart();
})();
