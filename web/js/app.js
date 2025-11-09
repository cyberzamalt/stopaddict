/* web/js/app.js — Orchestrateur StopAddict (ES module)
   Objectifs de ce fichier :
   - Onglets cliquables (Accueil/Stats/Calendrier/Habitudes/Réglages)
   - Compteurs + cases “Activer” RE-CLIQUABLES sur Accueil
   - Synchronisation Accueil ↔ Réglages (modules & actifs du jour)
   - En-tête (date, totaux, € coût/économies)
   - Appels aux modules: settings.js / calendar.js / tips.js / stats.js
*/

import {
  LS_AGE, DefaultState, loadState, saveState,
  todayKey, fmtMoney
} from './state.js';

let Settings = null;
try { const m = await import('./settings.js'); Settings = m; } catch {}

let Calendar = null;
try { const m = await import('./calendar.js'); Calendar = m; } catch {}

let Tips = null;
try { const m = await import('./tips.js'); Tips = m; } catch {}

let Stats = null;
try { const m = await import('./stats.js'); Stats = m; } catch {}

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

/* ---------- État ---------- */
let S = loadState();
if (!S || typeof S !== 'object') S = DefaultState();
if (!S.today?.date) S.today.date = todayKey();

/* ---------- Constantes ---------- */
const KINDS = ["cigs","joints","beer","hard","liqueur"];
const PAGES = {
  home:     "#page-home",
  stats:    "#page-stats",
  calendar: "#page-calendar",
  habits:   "#page-habits",
  settings: "#page-settings",
};

/* ---------- Debug light ---------- */
const dbg = {
  push(msg){ (S.debug.logs ||= []).push(`[${new Date().toLocaleTimeString()}] ${msg}`); if (S.debug.logs.length>500) S.debug.logs.shift(); },
};

/* ---------- Coût & économies ---------- */
function unitPrice(kind){
  const p=S.prices, v=S.variants;
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
    case "beer":    return p.beer    >0 ? p.beer    : (v.alcohol?.beer?.enabled    && v.alcohol.beer.unitPrice   >0 ? v.alcohol.beer.unitPrice   : 0);
    case "hard":    return p.hard    >0 ? p.hard    : (v.alcohol?.hard?.enabled    && v.alcohol.hard.dosePrice   >0 ? v.alcohol.hard.dosePrice   : 0);
    case "liqueur": return p.liqueur >0 ? p.liqueur : (v.alcohol?.liqueur?.enabled && v.alcohol.liqueur.dosePrice>0 ? v.alcohol.liqueur.dosePrice : 0);
    default: return 0;
  }
}
function computeCost(counters=S.today.counters){ let t=0; for(const k of KINDS){ if(!S.modules[k]||!S.today.active[k]) continue; t += Number(counters[k]||0)*unitPrice(k);} return t; }
function computeSaved(counters=S.today.counters){ let s=0; for(const k of KINDS){ const g=Number(S.goals[k]||0), a=Number(counters[k]||0); if(g>0 && a<g) s += (g-a)*unitPrice(k);} return s; }

/* ---------- Historisation du jour ---------- */
function persistTodayIntoHistory(){
  const key = todayKey();
  if (S.today.date !== key){
    // cloture jour précédent
    S.history[S.today.date] = {...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
    S.today.date = key;
    S.today.counters = {cigs:0,joints:0,beer:0,hard:0,liqueur:0};
  }
  // snapshot du jour
  S.history[key] = {...S.today.counters, cost:computeCost(S.today.counters), saved:computeSaved(S.today.counters)};
}

/* ---------- UI: entête ---------- */
function updateHeader(){
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent   = S.today.counters.cigs ?? 0;
  $("#hdr-joints").textContent = S.today.counters.joints ?? 0;
  $("#hdr-alcohol").textContent= (S.today.counters.beer+S.today.counters.hard+S.today.counters.liqueur) || 0;

  const cost  = computeCost();
  const saved = computeSaved();
  $("#hdr-cost").textContent   = fmtMoney(cost,  S.currency);
  $("#hdr-saved").textContent  = fmtMoney(saved, S.currency);

  const sum = KINDS.reduce((n,k)=> n + (S.today.counters[k]||0), 0);
  const badge = $("#hdr-status");
  if (badge){
    badge.textContent = sum===0 ? "✓" : "•";
    badge.style.background = sum===0 ? "#124232" : "#1f2b48";
  }
}

/* ---------- UI: compteurs Accueil ---------- */
function reflectCounters(){
  // valeurs
  $("#val-cigs").textContent    = S.today.counters.cigs ?? 0;
  $("#val-joints").textContent  = S.today.counters.joints ?? 0;
  $("#val-beer").textContent    = S.today.counters.beer ?? 0;
  $("#val-hard").textContent    = S.today.counters.hard ?? 0;
  $("#val-liqueur").textContent = S.today.counters.liqueur ?? 0;

  // cases “Activer” (toujours CLIQUABLES)
  $("#chk-cigs-active").checked     = !!S.today.active.cigs;
  $("#chk-joints-active").checked   = !!S.today.active.joints;
  $("#chk-beer-active").checked     = !!S.today.active.beer;
  $("#chk-hard-active").checked     = !!S.today.active.hard;
  $("#chk-liqueur-active").checked  = !!S.today.active.liqueur;

  // boutons +/− désactivés si module inactif ou non coché pour le jour
  const can = (k)=> !!S.modules[k] && !!S.today.active[k];
  const setCtr = (k, rootSel) => {
    const root = $(rootSel);
    if (!root) return;
    const dec = $("[data-action='dec']", root);
    const inc = $("[data-action='inc']", root);
    const usable = can(k);
    [dec,inc].forEach(b=>{ if(b){ b.disabled = !usable; b.style.opacity = usable? "1":"0.55"; }});
  };
  setCtr("cigs",    "#ctr-cigs");
  setCtr("joints",  "#ctr-joints");
  setCtr("beer",    "#ctr-beer");
  setCtr("hard",    "#ctr-hard");
  setCtr("liqueur", "#ctr-liqueur");
}

function initCounters(){
  // plus / moins
  $$("[data-action]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const kind   = btn.dataset.kind;
      const action = btn.dataset.action;
      if (!KINDS.includes(kind)) return;
      if (!S.modules[kind] || !S.today.active[kind]) return;

      const cur = Number(S.today.counters[kind]||0);
      S.today.counters[kind] = (action==="inc") ? cur+1 : Math.max(0, cur-1);

      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      Stats?.update?.(S);
      Calendar?.update?.(S);
      Tips?.updateTips?.(S);
      saveState(S);
      dbg.push(`Counter ${kind} ${action}`);
    }, {passive:true});
  });

  // cases “Activer” (jour)
  const map = {
    cigs:"#chk-cigs-active", joints:"#chk-joints-active",
    beer:"#chk-beer-active", hard:"#chk-hard-active", liqueur:"#chk-liqueur-active"
  };
  for (const k of KINDS){
    const el = $(map[k]);
    if (!el) continue;
    el.addEventListener("change", ()=>{
      S.today.active[k] = !!el.checked;

      // règle “alcool global” en cohérence visuelle : si modules alcool détaillés désactivés via Settings, on n’active pas ici
      if (!S.modules[k]) S.today.active[k] = false;

      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      Stats?.update?.(S);
      Calendar?.update?.(S);
      Tips?.updateTips?.(S);
      saveState(S);
      dbg.push(`Today active ${k}=${S.today.active[k]}`);
    });
  }
}

/* ---------- Onglets ---------- */
function showTab(id){
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");
  $$("#tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab===id));
  if (id==="stats") Stats?.update?.(S);
}
function initTabs(){
  $$("#tabs .tab").forEach(btn => btn.addEventListener("click", ()=> showTab(btn.dataset.tab)));
  showTab("home");
}

/* ---------- Age gate (+18) ---------- */
function initAgeGate(){
  const ack = localStorage.getItem(LS_AGE);
  const dlg = $("#agegate");
  const btn = $("#btn-age-accept");
  const cb18 = $("#age-18plus");
  const cbHide = $("#age-hide");
  if (!dlg || !btn || !cb18) return;

  const close = ()=>{ try{ dlg.close(); }catch{} dlg.classList.add("hide"); };
  const open  = ()=>{ try{ dlg.showModal(); }catch{} dlg.classList.remove("hide"); };

  if (ack==="1"){ close(); return; }

  // Lien “Ressources” est injecté par resources.js (pas ici) ⇒ évite doublons
  btn.disabled = true;
  open();
  cb18.addEventListener("change", ()=> btn.disabled = !cb18.checked);
  btn.addEventListener("click", ()=>{
    if (!cb18.checked) return;
    if (cbHide.checked) localStorage.setItem(LS_AGE, "1");
    close();
  });
}

/* ---------- Hydratation complète ---------- */
function hydrateAll(){
  updateHeader();
  reflectCounters();
  Stats?.update?.(S);
  Calendar?.update?.(S);
  Tips?.updateTips?.(S);
}

/* ---------- Boot ---------- */
(async function init(){
  // Tabs
  initTabs();

  // Age gate
  initAgeGate();

  // Accueil (compteurs)
  initCounters();

  // Stats
  try { Stats?.init?.({ getState:()=>S, fmtMoney, todayKey }); } catch {}

  // Calendrier
  try { Calendar?.mountCalendar?.({ S, getState:()=>S, showTab }); } catch {}

  // Conseils
  try { Tips?.mountTips?.({ rootSel:"#tips-root", stateGetter:()=>S }); } catch {}

  // Réglages (on fournit un hook pour resynchroniser Accueil ↔ Réglages)
  try {
    Settings?.mountSettings?.({
      S,
      DefaultState,
      saveState,
      onChange: ()=>{ persistTodayIntoHistory(); hydrateAll(); saveState(S); },
      afterFactoryReset: ()=>{ S = DefaultState(); persistTodayIntoHistory(); hydrateAll(); saveState(S); },
    });
  } catch {}

  // Première peinture
  persistTodayIntoHistory();
  hydrateAll();
  saveState(S);

  // Console debug masquée/affichée (5 taps sur la date)
  let taps=[]; $("#today-date")?.addEventListener("click", ()=>{
    const now=Date.now();
    taps=taps.filter(t=>now-t<=900); taps.push(now);
    if (taps.length>=5){
      $("#debug-console")?.classList.toggle("hide");
      taps=[];
    }
  });

  dbg.push("App ready");
})();
