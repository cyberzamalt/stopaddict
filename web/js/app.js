// web/js/app.js — Point d'entrée (ES module)
import { LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney } from './state.js';

// Imports optionnels (tolérants)
let Settings = null, Calendar = null, Tips = null, Resources = null, Stats = null, Habits = null;
try { Settings  = await import('./settings.js'); }  catch {}
try { Calendar  = await import('./calendar.js'); }  catch {}
try { Tips      = await import('./tips.js'); }      catch {}
try { Resources = await import('./resources.js'); } catch {}
try { Stats     = await import('./stats.js'); }     catch {}
try { Habits    = await import('./habits.js'); }    catch {}

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// ---- État ----
let S = loadState();
if (!S || typeof S !== 'object') S = DefaultState();

// ---- Logger visible à la demande ----
const Log = {
  push(type, msg) {
    const line = `[${new Date().toLocaleTimeString()}] [${type}] ${msg}`;
    S.debug.logs = S.debug.logs || [];
    S.debug.logs.push(line);
    if (S.debug.logs.length > 500) S.debug.logs.shift();

    const box = $('#debug-console');
    const flag = $('#cb-debug-overlay');
    if (box && flag && flag.checked) {
      box.classList.remove('hide');
      const div = document.createElement('div');
      div.className = 'debug-line';
      div.textContent = line;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
  },
  clear() {
    S.debug.logs = [];
    const box = $('#debug-console');
    if (box) box.innerHTML = '';
  },
  copy() {
    navigator.clipboard?.writeText((S.debug.logs || []).join('\n')).catch(()=>{});
  }
};

// ---- UI helpers ----
const PAGES = {
  home:     '#page-home',
  stats:    '#page-stats',
  calendar: '#page-calendar',
  habits:   '#page-habits',
  settings: '#page-settings',
};
function showTab(id) {
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add('hide'));
  $(PAGES[id])?.classList.remove('hide');
  $$('#tabs .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
  Log.push('tab', `show:${id}`);
  // rafraîchir stats si onglet ouvert
  if (id === 'stats' && Stats?.renderAll) Stats.renderAll(S);
}

// ---- Prix / coûts ----
const KINDS = ['cigs','joints','beer','hard','liqueur'];
function unitPrice(kind) {
  const p = S.prices, v = S.variants;
  switch (kind) {
    case 'cigs':
      if (p.cigarette>0) return p.cigarette;
      if (v.classic.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice / v.classic.cigsPerPack;
      if (v.rolled.use && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice / v.rolled.cigsPer30g;
      return 0;
    case 'joints':
      if (p.joint>0) return p.joint;
      if (v.cannabis.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice * v.cannabis.gramsPerJoint;
      return 0;
    case 'beer':    return p.beer>0    ? p.beer    : (v.alcohol.beer.enabled     && v.alcohol.beer.unitPrice>0     ? v.alcohol.beer.unitPrice     : 0);
    case 'hard':    return p.hard>0    ? p.hard    : (v.alcohol.hard.enabled     && v.alcohol.hard.dosePrice>0     ? v.alcohol.hard.dosePrice     : 0);
    case 'liqueur': return p.liqueur>0 ? p.liqueur : (v.alcohol.liqueur.enabled  && v.alcohol.liqueur.dosePrice>0  ? v.alcohol.liqueur.dosePrice  : 0);
    default: return 0;
  }
}
function computeCost(c=S.today.counters) {
  let t=0; for (const k of KINDS) if (S.modules[k] && S.today.active[k]) t += (Number(c[k]||0)*unitPrice(k));
  return t;
}
function computeSaved(c=S.today.counters) {
  let s=0; for (const k of KINDS) {
    const g = Number(S.goals[k]||0), a = Number(c[k]||0);
    if (g>0 && a<g) s += (g-a)*unitPrice(k);
  }
  return s;
}

// ---- Persistance jour/historique + événements (Stats) ----
function persistTodayIntoHistory() {
  const key = todayKey();
  if (S.today.date !== key) {
    // clôturer la veille
    if (S.today.date) {
      S.history[S.today.date] = { ...S.today.counters,
        cost: computeCost(S.today.counters),
        saved: computeSaved(S.today.counters),
      };
    }
    S.today.date = key;
    if (!S.today.counters) S.today.counters = { cigs:0,joints:0,beer:0,hard:0,liqueur:0 };
  }
  S.history[key] = { ...S.today.counters, cost: computeCost(), saved: computeSaved() };
}

function pushEvent(kind, delta) {
  S.events = S.events || [];
  S.events.push({ ts: Date.now(), kind, delta });
  if (S.events.length > 2000) S.events.shift();
}

// ---- Réflexion UI ----
function reflectCounters() {
  $('#val-cigs').textContent    = S.today.counters.cigs ?? 0;
  $('#val-joints').textContent  = S.today.counters.joints ?? 0;
  $('#val-beer').textContent    = S.today.counters.beer ?? 0;
  $('#val-hard').textContent    = S.today.counters.hard ?? 0;
  $('#val-liqueur').textContent = S.today.counters.liqueur ?? 0;

  const setDis = (id, off) => {
    const el = $(id); if (!el) return;
    el.style.opacity = off ? '0.55' : '1';
    el.style.pointerEvents = off ? 'none' : 'auto';
  };
  setDis('#ctr-cigs',   !S.today.active.cigs   || !S.modules.cigs);
  setDis('#ctr-joints', !S.today.active.joints || !S.modules.joints);
  setDis('#ctr-beer',   !S.today.active.beer   || !S.modules.beer   || (S.modules.alcohol===true));
  setDis('#ctr-hard',   !S.today.active.hard   || !S.modules.hard   || (S.modules.alcohol===true));
  setDis('#ctr-liqueur',!S.today.active.liqueur|| !S.modules.liqueur|| (S.modules.alcohol===true));
}
function reflectToggles() {
  $('#chk-cigs-active').checked     = !!S.today.active.cigs;
  $('#chk-joints-active').checked   = !!S.today.active.joints;
  $('#chk-beer-active').checked     = !!S.today.active.beer;
  $('#chk-hard-active').checked     = !!S.today.active.hard;
  $('#chk-liqueur-active').checked  = !!S.today.active.liqueur;
}
function updateHeader() {
  $('#today-date').textContent = new Date().toLocaleDateString('fr-FR');
  $('#hdr-cigs').textContent   = S.today.counters.cigs ?? 0;
  $('#hdr-joints').textContent = S.today.counters.joints ?? 0;
  const alc = (S.today.counters.beer||0)+(S.today.counters.hard||0)+(S.today.counters.liqueur||0);
  $('#hdr-alcohol').textContent = alc;
  $('#hdr-cost').textContent    = fmtMoney(computeCost(), S.currency);
  $('#hdr-saved').textContent   = fmtMoney(computeSaved(), S.currency);

  const sum = KINDS.reduce((acc,k)=>acc+(S.today.counters[k]||0),0);
  const badge = $('#hdr-status');
  if (badge) {
    badge.textContent = sum===0 ? '✓' : '•';
    badge.style.background = sum===0 ? '#124232' : '#1f2b48';
  }
}

// ---- Compteurs & cases "Activer" (Accueil) ----
function initCounters() {
  // + / −
  $$('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.kind;
      const action = btn.dataset.action;
      if (!KINDS.includes(kind)) return;
      if (!S.modules[kind] || !S.today.active[kind]) return;

      const cur = Number(S.today.counters[kind] || 0);
      const delta = (action === 'inc') ? 1 : -1;
      S.today.counters[kind] = Math.max(0, cur + delta);

      pushEvent(kind, delta);
      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      saveState(S);
      Tips?.updateTips?.(S);
      Calendar?.update?.(S);
      Stats?.renderAll?.(S); // rafraîchit si onglet Stats ouvert
      Log.push('counter', `${kind}:${action}`);
    });
  });

  // Cases "Activer" (jour)
  const map = {
    cigs:'#chk-cigs-active', joints:'#chk-joints-active',
    beer:'#chk-beer-active', hard:'#chk-hard-active', liqueur:'#chk-liqueur-active'
  };
  for (const k of KINDS) {
    const el = $(map[k]); if (!el) continue;
    el.addEventListener('change', () => {
      S.today.active[k] = !!el.checked;
      reflectCounters(); updateHeader(); saveState(S);
      Tips?.updateTips?.(S); Calendar?.update?.(S);
      Log.push('active', `${k}:${el.checked?'on':'off'}`);
    });
  }
}

// ---- Tabs ----
function initTabs() {
  $$('#tabs .tab').forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });
}

// ---- Age Gate ----
function initAgeGate() {
  const dlg = $('#agegate');
  const ack = localStorage.getItem(LS_AGE);
  const cb18  = $('#age-18plus');
  const cbHide= $('#age-hide');
  const btnOk = $('#btn-age-accept');

  if (!dlg || !cb18 || !btnOk) return;

  // cases non pré-cochées
  cb18.checked = false;
  cbHide.checked = false;
  btnOk.disabled = true;

  cb18.addEventListener('change', () => btnOk.disabled = !cb18.checked);
  btnOk.addEventListener('click', () => {
    if (cb18.checked && cbHide.checked) localStorage.setItem(LS_AGE, '1');
    dlg.close?.();
    dlg.classList.add('hide');
    Log.push('age', 'accepted');
  });

  if (ack === '1') {
    dlg.classList.add('hide');
  } else {
    try { dlg.showModal(); } catch { dlg.classList.remove('hide'); }
  }
}

// ---- Réglages / Tips / Calendar / Stats / Resources / Habits ----
function mountModules() {
  // Resources : injecte le lien dans l’AgeGate et gère un vrai modal
  Resources?.mountResources?.();

  // Settings : gère modules/prix/devise/i18n/exclusivité alcool
  Settings?.mountSettings?.({
    S,
    onRefresh: () => {
      // re-réfléchir Accueil & header
      reflectToggles();
      reflectCounters();
      updateHeader();
      saveState(S);
      Tips?.updateTips?.(S);
      Calendar?.update?.(S);
      Stats?.renderAll?.(S);
      Log.push('settings', 'refresh');
    }
  });

  // Habits : objectifs + dates
  Habits?.mountHabits?.({
    S,
    onChange: () => {
      persistTodayIntoHistory();
      updateHeader();
      saveState(S);
      Tips?.updateTips?.(S);
      Calendar?.update?.(S);
      Stats?.renderAll?.(S);
      Log.push('habits', 'changed');
    }
  });

  // Tips
  Tips?.mountTips?.({ rootSel:'#tips-root', stateGetter:()=>S });

  // Calendar
  Calendar?.mountCalendar?.({ S, getState:()=>S, showTab });

  // Stats (2 graphes + boutons période)
  Stats?.initStats?.({ S, getState:()=>S, fmtMoney, todayKey });
}

// ---- Boot ----
(function initApp() {
  if (!S.today?.date) S.today.date = todayKey();

  // UI init
  $('#app-title').textContent = 'StopAddict';
  $('#today-date').textContent = new Date().toLocaleDateString('fr-FR');

  initTabs();
  initAgeGate();
  initCounters();
  reflectToggles();
  reflectCounters();
  updateHeader();

  mountModules();

  persistTodayIntoHistory();
  saveState(S);

  // Debug actions
  $('#cb-debug-overlay')?.addEventListener('change', (e)=>{
    const box = $('#debug-console');
    if (!box) return;
    if (e.target.checked) { box.classList.remove('hide'); Log.push('debug','show'); }
    else { box.classList.add('hide'); Log.push('debug','hide'); }
  });
  $('#btn-copy-logs')?.addEventListener('click', ()=>Log.copy());
  $('#btn-clear-logs')?.addEventListener('click', ()=>Log.clear());

  // Par défaut, afficher Accueil
  showTab('home');
  Log.push('boot', 'app ready');
})();
