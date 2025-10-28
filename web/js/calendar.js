// web/js/calendar.js
// Vue Calendrier (mensuelle) + modale jour
// - Affiche un mois avec pastilles (cigarettes/joints/alcool) si > 0
// - Ouvre une modale pour consulter/ajuster un jour
// - Défensif: fonctionne même si certaines APIs de state.js/storage/utils n'existent pas
// - Ne casse rien : n’écrit que via l’API state.js si dispo, sinon fallback localStorage "sa:history"

import { $, $$, formatYMD, startOfMonth, startOfDay, loadJSON, saveJSON, pad2 } from './utils.js';

// ---- Fallbacks sûrs (au cas où certaines fonctions n'existent pas) ----
function safeOn(evt, cb) {
  try { window.addEventListener(evt, cb); } catch {}
}
function emit(evt, detail) {
  try { window.dispatchEvent(new CustomEvent(evt, { detail })); } catch {}
}

// On tente de charger state.js s’il expose des helpers utiles (optionnel)
let stateAPI = null;
try {
  // @ts-ignore
  stateAPI = await import('./state.js');
} catch { /* no-op */ }

// Clés & structure minimale pour le fallback
const LS_KEY = 'sa:history'; // { "YYYY-MM-DD": { c:0, j:0, a:0, beer:0, strong:0, liqueur:0 } }
function readHistory() { return loadJSON(LS_KEY, {}); }
function writeHistory(db) { saveJSON(LS_KEY, db); }

// Lecture d’un jour (privilégie state.js si dispo)
function readDay(date) {
  const ymd = formatYMD(date);
  // 1) API state (si dispo)
  try {
    if (stateAPI && typeof stateAPI.getDay === 'function') {
      const d = stateAPI.getDay(date); // libre (doit renvoyer quelque chose)
      if (d) return normalizeDay(d);
    }
  } catch {}
  // 2) Fallback local
  const db = readHistory();
  return normalizeDay(db[ymd] || {});
}

// Écriture d’un jour (privilégie state.js si dispo)
function writeDay(date, patch) {
  const ymd = formatYMD(date);
  // 1) API state (si dispo)
  try {
    if (stateAPI && typeof stateAPI.setDay === 'function') {
      stateAPI.setDay(date, patch);
      emit('sa:counts-updated', { scope: 'calendar', ymd });
      return;
    }
    if (stateAPI && typeof stateAPI.mutate === 'function') {
      // liberté d’implémentation: mutate({type, date, delta}) si existait
      // ici on force un set total par sécurité
      stateAPI.mutate({ type: 'calendar:setDay', date, patch });
      emit('sa:counts-updated', { scope: 'calendar', ymd });
      return;
    }
  } catch {}
  // 2) Fallback local
  const db = readHistory();
  const cur = normalizeDay(db[ymd] || {});
  db[ymd] = { ...cur, ...patch };
  writeHistory(db);
  emit('sa:counts-updated', { scope: 'calendar', ymd });
}

// Normalise la forme d’un jour pour éviter les undefined
function normalizeDay(d) {
  return {
    c: toInt(d.c ?? d.cigs ?? d.clopes ?? 0),
    j: toInt(d.j ?? d.joints ?? 0),
    a: toInt(d.a ?? d.alcool ?? d.alcohol ?? 0),
    beer: toInt(d.beer ?? 0),
    strong: toInt(d.strong ?? 0),
    liqueur: toInt(d.liqueur ?? d.liquor ?? 0),
  };
}
function toInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

// -------------------------------------------------------------

let curMonth = startOfMonth(new Date());
let selectedDay = startOfDay(new Date());

function qs() {
  return {
    titre: $('#cal-titre'),
    grid: $('#cal-grid'),
    btnPrev: $('#cal-prev'),
    btnNext: $('#cal-next'),

    modal: $('#cal-jour'),
    mTitle: $('#cal-jour-titre'),

    vC: $('#cal-jour-cl'),
    vJ: $('#cal-jour-j'),
    vA: $('#cal-jour-a'),

    segC: $('#cal-jour-seg-cl'),
    segA: $('#cal-jour-seg-a'),

    bCPlus: $('#cal-cl-plus'),
    bCMoins: $('#cal-cl-moins'),
    bJPlus: $('#cal-j-plus'),
    bJMoins: $('#cal-j-moins'),
    bAPlus: $('#cal-a-plus'),
    bAMoins: $('#cal-a-moins'),

    bRAZ: $('#cal-jour-raz'),
    bClose: $('#cal-jour-fermer'),
  };
}

function labelMonth(d) {
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function sameYMD(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

// Construit/rafraîchit la grille du mois
function renderMonth() {
  const { titre, grid } = qs();
  if (!grid || !titre) return;
  titre.textContent = labelMonth(curMonth);

  // Vide la grille
  grid.innerHTML = '';

  const first = new Date(curMonth.getFullYear(), curMonth.getMonth(), 1);
  const last = endOfMonth(curMonth);
  // On aligne sur lundi (1) : range = 6 lignes x 7 colonnes
  const firstDow = (first.getDay() + 6) % 7; // 0=lundi … 6=dimanche
  const totalDays = last.getDate();
  const today = startOfDay(new Date());

  // On veut exactement 42 cellules pour une grille stable
  const cells = 42;
  for (let i = 0; i < cells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';

    const dayNum = i - firstDow + 1;
    const inMonth = dayNum >= 1 && dayNum <= totalDays;

    if (!inMonth) {
      cell.style.opacity = '0.4';
      cell.style.pointerEvents = 'none';
      cell.innerHTML = `<div class="cal-num">—</div>`;
      grid.appendChild(cell);
      continue;
    }

    const d = new Date(curMonth.getFullYear(), curMonth.getMonth(), dayNum);
    const ymd = formatYMD(d);
    cell.dataset.date = ymd;

    const data = readDay(d);
    const hasC = data.c > 0;
    const hasJ = data.j > 0;
    const hasA = (data.a > 0) || (data.beer + data.strong + data.liqueur > 0);

    if (hasC || hasJ || hasA) cell.classList.add('has-data');
    if (sameYMD(d, today)) cell.classList.add('today');

    cell.innerHTML = `
      <div class="cal-num">${dayNum}</div>
      <div>
        ${hasC ? '<span class="dot c" title="Cigarettes"></span>' : ''}
        ${hasJ ? '<span class="dot j" title="Joints"></span>' : ''}
        ${hasA ? '<span class="dot a" title="Alcool"></span>' : ''}
      </div>
    `;

    cell.addEventListener('click', () => openDay(d));
    grid.appendChild(cell);
  }
}

function openDay(d) {
  selectedDay = startOfDay(d);
  const { modal, mTitle } = qs();
  if (!modal || !mTitle) return;
  mTitle.textContent = `Bilan du ${formatFR(selectedDay)}`;
  syncModalValues();
  showModal(true);
}

function formatFR(d) {
  const jours = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}

function syncModalValues() {
  const { vC, vJ, vA, segC, segA } = qs();
  const data = readDay(selectedDay);
  if (vC) vC.textContent = String(data.c);
  if (vJ) vJ.textContent = String(data.j);
  if (vA) vA.textContent = String(data.a || (data.beer + data.strong + data.liqueur));

  // Segments (10 pas visuels)
  renderSegments(segC, data.c, (val) => setValue('c', val));
  renderSegments(segA, data.a, (val) => setValue('a', val));
}

function renderSegments(container, current, onSet) {
  if (!container) return;
  container.innerHTML = '';
  const max = 10;
  for (let i = 0; i <= max; i++) {
    const b = document.createElement('div');
    b.className = 'seg' + (i === current ? ' actif' : '');
    b.textContent = i;
    b.title = `Fixer à ${i}`;
    b.addEventListener('click', () => onSet(i));
    container.appendChild(b);
  }
}

function setValue(kind, val) {
  const patch = {};
  if (kind === 'c') patch.c = toInt(val);
  if (kind === 'j') patch.j = toInt(val);
  if (kind === 'a') patch.a = toInt(val);
  writeDay(selectedDay, patch);
  syncModalValues();
  renderMonth();
}

function addValue(kind, delta) {
  const cur = readDay(selectedDay);
  const patch = {};
  if (kind === 'c') patch.c = toInt(cur.c + delta);
  if (kind === 'j') patch.j = toInt(cur.j + delta);
  if (kind === 'a') patch.a = toInt((cur.a || 0) + delta);
  writeDay(selectedDay, patch);
  syncModalValues();
  renderMonth();
}

function showModal(yes) {
  const { modal } = qs();
  if (!modal) return;
  if (yes) modal.classList.add('show');
  else modal.classList.remove('show');
}

function bindUI() {
  const { btnPrev, btnNext, bCPlus, bCMoins, bJPlus, bJMoins, bAPlus, bAMoins, bRAZ, bClose } = qs();

  if (btnPrev) btnPrev.addEventListener('click', () => { curMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() - 1, 1); renderMonth(); });
  if (btnNext) btnNext.addEventListener('click', () => { curMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 1); renderMonth(); });

  if (bCPlus)  bCPlus.addEventListener('click',  () => addValue('c', +1));
  if (bCMoins) bCMoins.addEventListener('click', () => addValue('c', -1));

  if (bJPlus)  bJPlus.addEventListener('click',  () => addValue('j', +1));
  if (bJMoins) bJMoins.addEventListener('click', () => addValue('j', -1));

  if (bAPlus)  bAPlus.addEventListener('click',  () => addValue('a', +1));
  if (bAMoins) bAMoins.addEventListener('click', () => addValue('a', -1));

  if (bRAZ)    bRAZ.addEventListener('click', () => { writeDay(selectedDay, { c:0, j:0, a:0 }); syncModalValues(); renderMonth(); });
  if (bClose)  bClose.addEventListener('click', () => showModal(false));

  // Rerender si les données changent ailleurs dans l’app
  safeOn('sa:counts-updated', () => renderMonth());
}

export function initCalendar() {
  try {
    bindUI();
    renderMonth();
  } catch (e) {
    console.warn('[calendar.init] ', e);
  }
}
