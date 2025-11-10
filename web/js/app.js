/* web/js/app.js — Orchestrateur StopAddict (ES module) */
import { LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney } from './state.js';

let Settings = null, Tips = null, Calendar = null, Resources = null, Stats = null, Habits = null;
try { Settings  = await import('./settings.js'); } catch {}
try { Tips      = await import('./tips.js'); }     catch {}
try { Calendar  = await import('./calendar.js'); } catch {}
try { Resources = await import('./resources.js'); }catch {}
try { Stats     = await import('./stats.js'); }    catch {}
try { Habits    = await import('./habits.js'); }   catch {}

const $  = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

let S = loadState(); if(!S || !S.today) S = DefaultState();

/* ---------- Logger simple (console UI) ---------- */
const dbg = {
  push(msg, type="info"){
    const line = `[${new Date().toLocaleTimeString()}] [${type}] ${msg}`;
    S.debug = S.debug || {};
    S.debug.logs = S.debug.logs || [];
    S.debug.logs.push(line);
    if(S.debug.logs.length>1000) S.debug.logs.shift();

    const box = $("#debug-console");
    if (box && !box.classList.contains("hide")){
      const div = document.createElement("div");
      div.className = "debug-line";
      div.textContent = line;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
    saveState(S);
  },
  syncVisibilityFromCheckbox(){
    const cb = $("#cb-debug-overlay");
    const box = $("#debug-console");
    if(!box) return;
    const on = !!cb?.checked;
    box.classList.toggle("hide", !on);
  }
};

/* ---------- Age Gate (+18) ---------- */
function initAgeGate(){
  const dlg = $("#agegate");
  const btn = $("#btn-age-accept");
  const cb18   = $("#age-18plus");
  const cbHide = $("#age-hide");

  // Cases NON pré-cochées par défaut (sauf si déjà validé en LS)
  if(localStorage.getItem(LS_AGE)==="1"){
    try{ dlg?.close(); }catch{}
    dlg?.classList.add("hide");
  } else {
    if(cb18)  cb18.checked  = false;
    if(cbHide)cbHide.checked = false;
    try{ dlg?.showModal(); }catch{ dlg?.classList.remove("hide"); }
    if(btn) btn.disabled = true;

    cb18?.addEventListener("change", ()=>{ if(btn) btn.disabled = !cb18.checked; });
    btn?.addEventListener("click", ()=>{
      if(cb18?.checked){
        if(cbHide?.checked) localStorage.setItem(LS_AGE,"1");
        try{ dlg.close(); }catch{}
        dlg.classList.add("hide");
        dbg.push("AgeGate validated","ok");
      }
    });
  }
}

/* ---------- Tabs ---------- */
const PAGES = { home:"#page-home", stats:"#page-stats", calendar:"#page-calendar", habits:"#page-habits", settings:"#page-settings" };
function showTab(id){
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");
  $$("#tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab===id));
  dbg.push(`Tab -> ${id}`,"nav");
}

/* ---------- Counters & header ---------- */
const KINDS = ["cigs","joints","beer","hard","liqueur"];
function computeCost(c=S.today.counters){ let t=0; for(const k of KINDS){ if(!S.modules[k]||!S.today.active[k]) continue; const p=S.prices[k]||0; t += (Number(c[k]||0))*Number(p||0); } return t; }
function computeSaved(c=S.today.counters){ let s=0; for(const k of KINDS){ const g=Number(S.goals[k]||0), a=Number(c[k]||0); if(g>0 && a<g) s += (g-a)*Number(S.prices[k]||0);} return s; }

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

  // Cases "Activer" Accueil reflètent l'état courant
  $("#chk-cigs-active").checked    = !!S.today.active.cigs;
  $("#chk-joints-active").checked  = !!S.today.active.joints;
  $("#chk-beer-active").checked    = !!S.today.active.beer;
  $("#chk-hard-active").checked    = !!S.today.active.hard;
  $("#chk-liqueur-active").checked = !!S.today.active.liqueur;
}

function persistTodayIntoHistory(){
  const key = todayKey();
  if (S.today.date !== key){
    S.history[S.today.date] = {...S.today.counters, cost:computeCost(), saved:computeSaved()};
    S.today.date = key;
    S.today.counters = {cigs:0,joints:0,beer:0,hard:0,liqueur:0};
  }
  S.history[key] = {...S.today.counters, cost:computeCost(), saved:computeSaved()};
}

function updateHeader(){
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent   = S.today.counters.cigs ?? 0;
  $("#hdr-joints").textContent = S.today.counters.joints ?? 0;
  $("#hdr-alcohol").textContent= (S.today.counters.beer+S.today.counters.hard+S.today.counters.liqueur)||0;
  $("#hdr-cost").textContent   = fmtMoney(computeCost(), S.currency);
  $("#hdr-saved").textContent  = fmtMoney(computeSaved(), S.currency);
  const sum = KINDS.reduce((acc,k)=>acc+(S.today.counters[k]||0),0);
  const badge=$("#hdr-status");
  if(badge){ badge.textContent = sum===0 ? "✓" : "•"; badge.style.background = sum===0 ? "#124232" : "#1f2b48"; }
}

/* ---------- Journal d’événements pour Stats (Jour 4 tranches) ---------- */
function logEvent(kind, delta){
  S.events = S.events || [];
  S.events.push({ ts: Date.now(), kind, delta });
  if (S.events.length > 5000) S.events.shift();
}

/* ---------- Wiring des interactions ---------- */
function initCounters(){
  // Boutons +/-
  $$("[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const kind   = btn.dataset.kind;
      const action = btn.dataset.action;
      if(!KINDS.includes(kind)) return;
      if(!S.modules[kind] || !S.today.active[kind]) return;

      const cur = Number(S.today.counters[kind]||0);
      const delta = action==="inc" ? 1 : -1;
      S.today.counters[kind] = Math.max(0, cur + delta);

      logEvent(kind, delta);
      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      saveState(S);

      Tips?.updateTips?.(S);
      Calendar?.update?.(S);
      Stats?.refresh?.(S);

      dbg.push(`Counter ${kind} ${delta>0?"+":"-"}1`,"event");
    });
  });

  // Cases "Activer" (Accueil)
  const mapActive = {
    cigs:"#chk-cigs-active", joints:"#chk-joints-active",
    beer:"#chk-beer-active", hard:"#chk-hard-active", liqueur:"#chk-liqueur-active"
  };
  for(const k of KINDS){
    const el = $(mapActive[k]);
    if(!el) continue;
    el.addEventListener("change", ()=>{
      S.today.active[k] = !!el.checked;
      reflectCounters();
      saveState(S);
      Tips?.updateTips?.(S);
      Calendar?.update?.(S);
      Stats?.refresh?.(S);
      dbg.push(`Today.active ${k} = ${S.today.active[k]}`,"state");
    });
  }
}

/* ---------- Boot ---------- */
(function initApp(){
  // Tabs
  $$("#tabs .tab").forEach(b=> b.addEventListener("click", ()=> showTab(b.dataset.tab)));
  showTab("home");

  // AgeGate
  initAgeGate();

  // Modules optionnels
  Resources?.mountResources?.();
  Calendar = Calendar?.mountCalendar ? Calendar.mountCalendar({ S, getState:()=>S, showTab }) : Calendar;
  Settings?.mountSettings?.({ S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, reflectCounters, dbg });
  Habits?.mountHabits?.({ S, saveState, updateHeader, reflectCounters, dbg });
  Tips?.mountTips?.({ rootSel:"#tips-root", stateGetter:()=>S });

  // Stats
  Stats?.init?.({ S, todayKey, fmtMoney, dbg });

  // Logger UI -> case "Afficher la console"
  $("#cb-debug-overlay")?.addEventListener("change", ()=> dbg.syncVisibilityFromCheckbox());
  dbg.syncVisibilityFromCheckbox();

  // Header & counters
  if(!S.today?.date) S.today.date = todayKey();
  reflectCounters();
  updateHeader();
  initCounters();

  dbg.push("App ready","ok");
  // Expose pour debug
  window.S = S;
})();
