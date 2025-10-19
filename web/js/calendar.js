// web/js/calendar.js
// ------------------------------------------------------------
// Calendrier mensuel + Modale "jour"
// - Rend la grille du mois (dots par type s'il y a des données)
// - Ouvre une modale pour éditer un jour précis (+/−, RAZ)
// - Respecte les segments actifs (cigs: classic/rolled/tube, alcohol: beer/fort/liqueur)
// - Écoute le bus interne (on(...)) pour se rafraîchir après import/édition/etc.
// ------------------------------------------------------------
import {
  getDaily,
  saveDaily,
  addEntry,
  removeOne,           // (dateKey, type) → retire 1 unité d'un type pour ce jour
  ymd,
  getActiveSegments,
  setActiveSegment,
  on,                  // écoute du bus interne
  emit,
} from "./state.js";

let currentMonth = new Date();     // mois affiché
let selectedDate = null;           // jour courant dans la modale

// ----- Helpers de dates -----
function startOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0,0,0,0);
  return x;
}
function endOfMonth(d) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23,59,59,999);
  return x;
}
function daysInMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}
function fmtMonthTitle(d) {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
function fmtDayLong(d) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

// ----- Rendu de la grille -----
function renderGrid() {
  const grid = document.getElementById("cal-grid");
  const title = document.getElementById("cal-titre");
  if (!grid || !title) return;

  title.textContent = fmtMonthTitle(currentMonth);
  grid.innerHTML = "";

  const today = new Date();
  const totalDays = daysInMonth(currentMonth);
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const key = ymd(date);
    const dayData = getDaily(key) || {};

    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (isSameDay(date, today)) cell.classList.add("today");

    // badge jour
    const num = document.createElement("div");
    num.className = "cal-num";
    num.textContent = String(d);
    cell.appendChild(num);

    // dots selon types existants
    let has = false;
    const c = Number(dayData.cigs || 0);
    const j = Number(dayData.weed || 0);
    const a = Number(dayData.alcohol || 0);
    if (c > 0) { const dot = document.createElement("span"); dot.className = "dot c"; cell.appendChild(dot); has = true; }
    if (j > 0) { const dot = document.createElement("span"); dot.className = "dot j"; cell.appendChild(dot); has = true; }
    if (a > 0) { const dot = document.createElement("span"); dot.className = "dot a"; cell.appendChild(dot); has = true; }
    if (has) cell.classList.add("has-data");

    // ouverture modale
    cell.addEventListener("click", () => openDayModal(date));

    grid.appendChild(cell);
  }
}

// ----- Modale jour -----
function updateDayModalCounts() {
  if (!selectedDate) return;
  const key = ymd(selectedDate);
  const dayData = getDaily(key) || {};

  const elCl = document.getElementById("cal-jour-cl");
  const elJ  = document.getElementById("cal-jour-j");
  const elA  = document.getElementById("cal-jour-a");

  if (elCl) elCl.textContent = String(Number(dayData.cigs || 0));
  if (elJ)  elJ.textContent  = String(Number(dayData.weed || 0));
  if (elA)  elA.textContent  = String(Number(dayData.alcohol || 0));
}

function wireDayModalSegments() {
  const uiSeg = getActiveSegments();
  // Segments cigs
  const segC = document.getElementById("cal-jour-seg-cl");
  if (segC) {
    segC.querySelectorAll(".seg").forEach(btn => {
      const sub = btn.dataset.subtype || "classic";
      btn.classList.toggle("actif", sub === uiSeg.cigs);
      btn.addEventListener("click", () => {
        setActiveSegment("cigs", sub);
        segC.querySelectorAll(".seg").forEach(b => b.classList.toggle("actif", b === btn));
      });
    });
  }
  // Segments alcool
  const segA = document.getElementById("cal-jour-seg-a");
  if (segA) {
    segA.querySelectorAll(".seg").forEach(btn => {
      const sub = btn.dataset.subtype || "beer";
      btn.classList.toggle("actif", sub === uiSeg.alcohol);
      btn.addEventListener("click", () => {
        setActiveSegment("alcohol", sub);
        segA.querySelectorAll(".seg").forEach(b => b.classList.toggle("actif", b === btn));
      });
    });
  }
}

function wireDayModalButtons() {
  // +/− sur la date sélectionnée (pas aujourd’hui forcément)
  const map = [
    ["cal-cl-plus",  "cigs",    +1],
    ["cal-cl-moins", "cigs",    -1],
    ["cal-j-plus",   "weed",    +1],
    ["cal-j-moins",  "weed",    -1],
    ["cal-a-plus",   "alcohol", +1],
    ["cal-a-moins",  "alcohol", -1],
  ];
  map.forEach(([id, type, delta]) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.onclick = () => {
      if (!selectedDate) return;
      const key = ymd(selectedDate);
      if (delta > 0) {
        addEntry(type, +1, selectedDate);   // cible ce jour
      } else {
        removeOne(key, type);                // retire 1 pour ce jour
      }
      updateDayModalCounts();
      renderGrid();                          // met à jour la grille (dots)
      emit("ui:day-edited", { key, type, delta });
    };
  });

  const raz = document.getElementById("cal-jour-raz");
  if (raz) {
    raz.onclick = () => {
      if (!selectedDate) return;
      const key = ymd(selectedDate);
      saveDaily(key, {});              // RAZ
      updateDayModalCounts();
      renderGrid();
      emit("state:daily", { key });    // notifie le bus
    };
  }

  const close = document.getElementById("cal-jour-fermer");
  if (close) close.onclick = closeDayModal;
}

function openDayModal(date) {
  selectedDate = new Date(date.getTime());
  selectedDate.setHours(12,0,0,0); // évite soucis fuseau

  const modal = document.getElementById("cal-jour");
  const titre = document.getElementById("cal-jour-titre");
  if (!modal || !titre) return;

  titre.textContent = fmtDayLong(selectedDate);
  wireDayModalSegments();
  updateDayModalCounts();

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeDayModal() {
  const modal = document.getElementById("cal-jour");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  selectedDate = null;
}

// ----- Navigation mois -----
function wireMonthNav() {
  const prev = document.getElementById("cal-prev");
  const next = document.getElementById("cal-next");
  if (prev) prev.onclick = () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1); renderGrid(); };
  if (next) next.onclick = () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1); renderGrid(); };
}

// ----- Public API -----
export function initCalendar() {
  wireMonthNav();
  wireDayModalButtons();
  renderGrid();

  // Écoute le bus (import, édition, économie, réglages…) → rafraîchir
  on("state:daily",   renderGrid);
  on("state:changed", renderGrid);
  on("state:settings", renderGrid);

  // Quand on revient sur l’onglet
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderGrid();
  });

  // Si un autre onglet change le localStorage
  window.addEventListener("storage", () => renderGrid());

  // Fermer la modale si Échap
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeDayModal();
  });
}
