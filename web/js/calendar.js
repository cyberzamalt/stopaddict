// web/js/calendar.js
// STOPADDICT — Calendrier (vue mensuelle simple)
// Objectif : afficher le mois courant avec, pour chaque jour, un résumé des consommations
// en respectant les modules actifs (OFF = exclu). Navigation mois précédent/suivant si les
// éléments existent dans la page : #cal-prev, #cal-next, #cal-title, #cal-grid.
//
// Dépendances : ./state.js

import {
  load,
  getSettings,
  calculateDayCost,
  ymd,
} from "./state.js";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ------------------------ Utils dates (local, lundi=1) ------------------------ */

function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d = new Date())   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function dayOfWeekMonday0(d) {
  // JS: 0=dimanche,1=lundi,... → on veut 0=lundi,6=dimanche
  return (d.getDay() + 6) % 7;
}

function monthLabel(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

/* ------------------------ Agrégation d’un jour (respect modules) ------------------------ */

function daySummary(isoDayKey, settings) {
  const st = load();
  const rec = st.history?.[isoDayKey] || { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };

  const vals = {
    cigs:   settings.enable_cigs                     ? (+rec.cigs   || 0) : 0,
    weed:   settings.enable_weed                     ? (+rec.weed   || 0) : 0,
    beer:   (settings.enable_alcohol && settings.enable_beer)   ? (+rec.beer   || 0) : 0,
    strong: (settings.enable_alcohol && settings.enable_strong) ? (+rec.strong || 0) : 0,
    liquor: (settings.enable_alcohol && settings.enable_liquor) ? (+rec.liquor || 0) : 0,
  };

  const totalCount = vals.cigs + vals.weed + vals.beer + vals.strong + vals.liquor;
  const cost       = calculateDayCost(rec, settings); // déjà filtré par modules actifs

  return { ...vals, totalCount, cost };
}

/* ------------------------ Rendu cellule ------------------------ */

function renderCell(container, dateObj, monthCtx) {
  const stgs = getSettings();
  const iso  = ymd(dateObj);
  const { totalCount, cost } = daySummary(iso, stgs);

  const inCurrent = dateObj.getMonth() === monthCtx.getMonth();
  const today     = sameDay(dateObj, new Date());

  const cell = document.createElement("div");
  cell.className = "cal-cell";
  cell.dataset.date = iso;

  // Classes d’état
  if (!inCurrent) cell.classList.add("cal-out");
  if (today)      cell.classList.add("cal-today");

  // Contenu minimal lisible (pas de dépendance CSS forte)
  const head = document.createElement("div");
  head.className = "cal-daynum";
  head.textContent = String(dateObj.getDate());

  const info = document.createElement("div");
  info.className = "cal-info";
  info.textContent = totalCount > 0
    ? `Σ ${totalCount} • €${cost.toFixed(2)}`
    : ""; // vide si rien (garde l’UI légère)

  cell.appendChild(head);
  cell.appendChild(info);

  container.appendChild(cell);
}

/* ------------------------ Construction grille (6 lignes x 7 colonnes) ------------------------ */

function buildMonthGrid(root, anchor) {
  const grid = $("#cal-grid", root);
  const title = $("#cal-title", root);
  if (!grid || !title) return; // calendrier optionnel : on n’essaie pas d’imposer l’UI

  // En-tête
  title.textContent = monthLabel(anchor);

  // Réinitialiser
  grid.innerHTML = "";

  // Jours de la semaine (si le template ne les prévoit pas)
  // Lundi…Dimanche (FR)
  const weekdays = ["L", "M", "M", "J", "V", "S", "D"];
  let hasHeader = grid.querySelector(".cal-head");
  if (!hasHeader) {
    const headRow = document.createElement("div");
    headRow.className = "cal-head";
    weekdays.forEach((w) => {
      const h = document.createElement("div");
      h.className = "cal-head-cell";
      h.textContent = w;
      headRow.appendChild(h);
    });
    grid.appendChild(headRow);
  }

  // Plage à afficher
  const first = startOfMonth(anchor);
  const last  = endOfMonth(anchor);

  // Position du 1er jour (0=lundi … 6=dimanche)
  const startOffset = dayOfWeekMonday0(first);

  // Nombre de cases à produire : 6 semaines * 7 jours = 42 (classique)
  const totalCells = 42;

  // Date de départ = lundi de la semaine du 1er (peut être du mois précédent)
  const startDate = new Date(first);
  startDate.setDate(first.getDate() - startOffset);

  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    renderCell(grid, d, anchor);
  }
}

/* ------------------------ Navigation & rafraîchissement ------------------------ */

let currentMonth = startOfMonth(new Date());

function gotoPrevMonth(root) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  buildMonthGrid(root, currentMonth);
}

function gotoNextMonth(root) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  buildMonthGrid(root, currentMonth);
}

function bindNav(root) {
  const prev = $("#cal-prev", root);
  const next = $("#cal-next", root);

  if (prev) prev.addEventListener("click", (e) => {
    e.preventDefault();
    gotoPrevMonth(root);
  });

  if (next) next.addEventListener("click", (e) => {
    e.preventDefault();
    gotoNextMonth(root);
  });
}

function refresh(root) {
  buildMonthGrid(root, currentMonth);
}

/* ------------------------ API publique ------------------------ */

export function initCalendar() {
  const root = document.getElementById("ecran-calendrier");
  if (!root) return; // écran optionnel

  // Construire UI initiale
  currentMonth = startOfMonth(new Date());
  bindNav(root);
  refresh(root);

  // Quand les comptes changent (Accueil +/−) ou réglages (modules/prix/baselines) → réafficher
  document.addEventListener("sa:counts-updated", () => refresh(root));
  document.addEventListener("sa:state-changed",  () => refresh(root));

  // Si on revient sur l’onglet Calendrier via la nav
  const nav = document.getElementById("nav-calendrier");
  if (nav) nav.addEventListener("click", () => setTimeout(() => refresh(root), 0));
}

export default { initCalendar };
