/* web/js/app.js — Orchestrateur StopAddict (ES module) */

import {
  LS_AGE,
  DefaultState, loadState, saveState,
  todayKey, fmtMoney, recordEvent
} from "./state.js";

let mountSettings = null;
let Tips = null;
let CalendarMod = null;
let Stats = null;
let mountResources = null;

try { const m = await import("./settings.js"); if (typeof m?.mountSettings === "function") mountSettings = m.mountSettings; } catch {}
try { const m = await import("./tips.js");      if (typeof m?.mountTips === "function") Tips = m; } catch {}
try { const m = await import("./calendar.js");  if (typeof m?.mountCalendar === "function") CalendarMod = m; } catch {}
try { const m = await import("./stats.js");     if (typeof m?.initStats === "function") Stats = m; } catch {}
try { const m = await import("./resources.js"); if (typeof m?.mountResources === "function") mountResources = m.mountResources; } catch {}

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let S = loadState();

/* ---------------- Debug léger ---------------- */
const dbg = {
  push(msg, type="info"){
    const line = `[${new Date().toLocaleTimeString()}] [${type}] ${msg}`;
    S.debug.logs = S.debug.logs || [];
    S.debug.logs.push(line);
    if (S.debug.logs.length > 500) S.debug.logs.shift();
  }
};

/* ---------------- Age gate ------------------- */
function initAgeGate(){
  const ack = localStorage.getItem(LS_AGE);
  const dlg = $("#agegate");
  const btn = $("#btn-age-accept");
  const cb18 = $("#age-18plus");
  const cbHide = $("#age-hide");
  if (!dlg || !btn || !cb18) return;

  const close = ()=>{ try{ dlg.close(); }catch{} dlg.classList.add("hide"); };
  const open  = ()=>{ dlg.classList.remove("hide"); try{ dlg.showModal(); }catch{} };

  if (ack === "1"){ close(); }
  else{
    open();
    btn.disabled = true;
    cb18.addEventListener("change", ()=> btn.disabled = !cb18.checked);
    btn.addEventListener("click", ()=>{
      if (cb18.checked){
        if (cbHide.checked) localStorage.setItem(LS_AGE,"1");
        close();
      }
    });
  }
}

/* ---------------- Tabs ---------------------- */
const PAGES = { home:"#page-home", stats:"#page-stats", calendar:"#page-calendar", habits:"#page-habits", settings:"#page-settings" };
function showTab(id){
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");
  $$("#tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  if (id === "stats" && Stats?.renderAllCharts) Stats.renderAllCharts(S);
}

/* ---------------- Compteurs ----------------- */
const KINDS = ["cigs","joints","beer","hard","liqueur"];

function unitPrice(kind){
  const p = S.prices, v = S.variants;
  switch(kind){
    case "cigs":
      if (p.cigarette>0) return p.cigarette;
      if (v.classic.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if (v.rolled.use  && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    case "joints":
      if (p.joint>0) return p.joint;
      if (v.cannabis.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice * v.cannabis.gramsPerJoint;
      return 0;
    case "beer":    return p.beer>0    ? p.beer    : (v.alcohol.beer.enabled    && v.alcohol.beer.unitPrice>0   ? v.alcohol.beer.unitPrice   : 0);
    case "hard":    return p.hard>0    ? p.hard    : (v.alcohol.hard.enabled    && v.alcohol.hard.dosePrice>0   ? v.alcohol.hard.dosePrice   : 0);
    case "liqueur": return p.liqueur>0 ? p.liqueur : (v.alcohol.liqueur.enabled && v.alcohol.liqueur.dosePrice>0? v.alcohol.liqueur.dosePrice: 0);
    default: return 0;
  }
}
function computeCost(counters=S.today.counters){
  let t=0; for (const k of KINDS){ if(!S.modules[k] || !S.today.active[k]) continue; t += Number(counters[k]||0)*unitPrice(k); } return t;
}
function computeSaved(counters=S.today.counters){
  let s=0; for (const k of KINDS){ const g=Number(S.goals[k]||0), a=Number(counters[k]||0); if(g>0 && a<g) s += (g-a)*unitPrice(k);} return s;
}

function reflectCounters(){
  $("#val-cigs").textContent    = S.today.counters.cigs ?? 0;
  $("#val-joints").textContent  = S.today.counters.joints ?? 0;
  $("#val-beer").textContent    = S.today.counters.beer ?? 0;
  $("#val-hard").textContent    = S.today.counters.hard ?? 0;
  $("#val-liqueur").textContent = S.today.counters.liqueur ?? 0;

  // Griser uniquement la rangée des +/- quand inactif, laisser la case "Activer" cliquable
  const gray = (id, on)=>{ const row = $(`${id} .ctr-row`); if(!row) return; row.style.opacity = on ? ".45" : "1"; };
  gray("#ctr-cigs",    !S.today.active.cigs   || !S.modules.cigs);
  gray("#ctr-joints",  !S.today.active.joints || !S.modules.joints);
  gray("#ctr-beer",    !S.today.active.beer   || !S.modules.beer);
  gray("#ctr-hard",    !S.today.active.hard   || !S.modules.hard);
  gray("#ctr-liqueur", !S.today.active.liqueur|| !S.modules.liqueur);

  // Cases "Activer" sur Accueil
  const map={cigs:"#chk-cigs-active", joints:"#chk-joints-active", beer:"#chk-beer-active", hard:"#chk-hard-active", liqueur:"#chk-liqueur-active"};
  for (const k of KINDS){ const el=$(map[k]); if (el) el.checked = !!S.today.active[k]; }
}

function persistTodayIntoHistory(){
  const key = todayKey();
  if (S.today.date !== key){
    S.history[S.today.date] = {...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
    S.today.date = key;
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
  }
  S.history[key] = {...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
}

function updateHeader(){
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent   = S.today.counters.cigs ?? 0;
  $("#hdr-joints").textContent = S.today.counters.joints ?? 0;
  $("#hdr-alcohol").textContent = (S.today.counters.beer + S.today.counters.hard + S.today.counters.liqueur) || 0;
  $("#hdr-cost").textContent   = fmtMoney(computeCost(), S.currency);
  $("#hdr-saved").textContent  = fmtMoney(computeSaved(), S.currency);
  const sum = KINDS.reduce((acc,k)=> acc + (S.today.counters[k]||0), 0);
  const badge = $("#hdr-status");
  if (badge){ badge.textContent = sum===0 ? "✓" : "•"; badge.style.background = sum===0 ? "#124232" : "#1f2b48"; }
}

function initCounters(){
  // Boutons +/- (protégés par today.active & modules)
  $$("[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const kind = btn.dataset.kind;
      const action = btn.dataset.action;
      if (!KINDS.includes(kind)) return;
      if (!S.modules[kind] || !S.today.active[kind]) return;

      const cur = Number(S.today.counters[kind]||0);
      S.today.counters[kind] = action === "inc" ? cur + 1 : Math.max(0, cur - 1);

      recordEvent(S, action === "inc" ? "inc" : "dec", { kind, value: S.today.counters[kind] });

      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      saveState(S);

      Tips?.updateTips?.(S);
      Cal?.update?.(S);
      Stats?.renderAllCharts?.(S);
    });
  });

  // Cases "Activer" sur Accueil (sync avec S.today.active)
  const map={cigs:"#chk-cigs-active", joints:"#chk-joints-active", beer:"#chk-beer-active", hard:"#chk-hard-active", liqueur:"#chk-liqueur-active"};
  for (const k of KINDS){
    const el = $(map[k]);
    if (!el) continue;
    el.checked = !!S.today.active[k];
    el.addEventListener("change", ()=>{
      S.today.active[k] = !!el.checked;
      recordEvent(S, "toggle", { kind:k, active: S.today.active[k] });
      reflectCounters();
      updateHeader();
      saveState(S);
      Tips?.updateTips?.(S);
      Cal?.update?.(S);
      Stats?.renderAllCharts?.(S);
    });
  }
}

/* ---------------- Hydrate ------------------- */
function hydrateUI(){
  $("#app-title").textContent = "StopAddict";
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");
  reflectCounters();
  updateHeader();
  Tips?.updateTips?.(S);
}

/* ---------------- Boot ---------------------- */
let Cal = null;

(function initApp(){
  if (!S.today?.date) S.today.date = todayKey();

  // UI
  $$("#tabs .tab").forEach(btn => btn.addEventListener("click", ()=> showTab(btn.dataset.tab)));
  showTab("home");

  initAgeGate();
  initCounters();

  // Modules
  if (Tips?.mountTips)       Tips.mountTips({ rootSel:"#tips-root", stateGetter:()=>S });
  if (CalendarMod?.mountCalendar) Cal = CalendarMod.mountCalendar({ S, getState:()=>S, showTab });
  if (typeof mountSettings === "function"){
    mountSettings({
      S,
      DefaultState,
      saveState,
      onModulesChanged(mods){
        S.modules = { ...S.modules, ...mods };
        // Exclusivité "alcool global" déjà gérée côté settings.js ; on reflète juste
        reflectCounters(); updateHeader(); saveState(S);
        Tips?.updateTips?.(S); Cal?.update?.(S); Stats?.renderAllCharts?.(S);
      },
      onPricesChanged(p){
        S.prices = { ...S.prices, ...p };
        updateHeader(); saveState(S);
        Tips?.updateTips?.(S); Cal?.update?.(S); Stats?.renderAllCharts?.(S);
      },
      onProfileChanged(pr){
        S.profile = { ...S.profile, ...pr };
        saveState(S); Tips?.updateTips?.(S);
      },
      onLangChanged(lang){
        S.i18n = { ...S.i18n, lang };
        saveState(S);
      }
    });
  }
  if (typeof mountResources === "function") mountResources();

  // Stats (si présent)
  if (Stats?.initStats) Stats.initStats(S);

  // Premier rendu
  hydrateUI();
  persistTodayIntoHistory();
  Stats?.renderAllCharts?.(S);

  dbg.push("App ready", "ok");
})();
