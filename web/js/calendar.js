// web/js/calendar.js
// Calendrier mensuel + édition d’un jour (modale)

import {
  ymd,
  getDaily,
  saveDaily,
  addEntry,
  removeOne,          // <-- attendue par ce module (retire 1 sur une date précise)
  emit,
  on
} from "./state.js";

let current = new Date(); // mois en cours dans la vue
let offHandlers = [];     // pour nettoyer les listeners du bus si besoin

// ---------- Helpers ----------
function fmtMonthTitle(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function daysInMonth(d) {
  const y = d.getFullYear();
  const m = d.getMonth();
  return new Date(y, m + 1, 0).getDate();
}

function firstWeekdayIndex(d) {
  // on veut une grille commençant LUNDI (0=lundi)
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const js = first.getDay(); // 0=dimanche..6=samedi
  return (js + 6) % 7;       // 0=lundi..6=dimanche
}

function hasAnyData(dayObj) {
  if (!dayObj) return false;
  const keys = Object.keys(dayObj).filter(k => k !== "hours");
  return keys.length > 0;
}

function sumTypes(dayObj) {
  if (!dayObj) return 0;
  return (dayObj.cigs || 0) + (dayObj.weed || 0) + (dayObj.alcohol || 0);
}

// ---------- Rendu du mois ----------
function renderMonth() {
  const titre = document.getElementById("cal-titre");
  const grid  = document.getElementById("cal-grid");
  if (!titre || !grid) return;

  titre.textContent = fmtMonthTitle(current);
  grid.innerHTML = "";

  const store = getDaily();
  const y = current.getFullYear();
  const m = current.getMonth();
  const nDays = daysInMonth(current);
  const startIdx = firstWeekdayIndex(current);

  // cases vides avant le 1er
  for (let i = 0; i < startIdx; i++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.setAttribute("aria-hidden", "true");
    grid.appendChild(cell);
  }

  const todayKey = ymd(new Date());

  for (let d = 1; d <= nDays; d++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    const k = ymd(new Date(y, m, d));

    // bandeau numéro
    const num = document.createElement("div");
    num.className = "cal-num";
    num.textContent = String(d);
    cell.appendChild(num);

    // puces si données
    const rec = store[k];
    if (hasAnyData(rec)) {
      cell.classList.add("has-data");
      const dotWrap = document.createElement("div");
      // Affiche une pastille par type présent
      if ((rec.cigs || 0) > 0) {
        const dc = document.createElement("span");
        dc.className = "dot c";
        dc.title = `Cigarettes: ${rec.cigs || 0}`;
        dotWrap.appendChild(dc);
      }
      if ((rec.weed || 0) > 0) {
        const dj = document.createElement("span");
        dj.className = "dot j";
        dj.title = `Joints: ${rec.weed || 0}`;
        dotWrap.appendChild(dj);
      }
      if ((rec.alcohol || 0) > 0) {
        const da = document.createElement("span");
        da.className = "dot a";
        da.title = `Alcool: ${rec.alcohol || 0}`;
        dotWrap.appendChild(da);
      }
      cell.appendChild(dotWrap);
    }

    // style "aujourd’hui"
    if (k === todayKey) {
      cell.classList.add("today");
    }

    // clic = ouvre modale jour
    cell.addEventListener("click", () => openDayModal(k));
    grid.appendChild(cell);
  }
}

// ---------- Modale Édition Jour ----------
function openDayModal(dateKey) {
  const modal = document.getElementById("cal-jour");
  const title = document.getElementById("cal-jour-titre");
  const spanCl = document.getElementById("cal-jour-cl");
  const spanJ  = document.getElementById("cal-jour-j");
  const spanA  = document.getElementById("cal-jour-a");

  if (!modal || !title || !spanCl || !spanJ || !spanA) return;

  // Titre lisible
  const d = new Date(dateKey);
  title.textContent = d.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  // Valeurs
  const store = getDaily();
  const rec = store[dateKey] || {};
  spanCl.textContent = String(rec.cigs || 0);
  spanJ.textContent  = String(rec.weed || 0);
  spanA.textContent  = String(rec.alcohol || 0);

  // Segments (si tu veux afficher des boutons de segments dans la modale)
  // Ici, on laisse simplement les conteneurs vides/présents (IDs existent dans ton HTML).
  document.getElementById("cal-jour-seg-cl")?.replaceChildren(); // placeholder
  document.getElementById("cal-jour-seg-a")?.replaceChildren();  // placeholder

  // Boutons +/- (jour ciblé)
  wireDayButtons(dateKey, spanCl, spanJ, spanA);

  // RAZ & fermer
  document.getElementById("cal-jour-raz")?.addEventListener("click", () => {
    const st = getDaily();
    delete st[dateKey];
    saveDaily(st);
    emit("state:daily", { daily: st });
    emit("state:changed", { scope: "daily" });
    // maj UI locale
    spanCl.textContent = "0";
    spanJ.textContent  = "0";
    spanA.textContent  = "0";
    // refresh grille
    renderMonth();
  });

  document.getElementById("cal-jour-fermer")?.addEventListener("click", () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  });

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function wireDayButtons(dateKey, spanCl, spanJ, spanA) {
  // cig -
  document.getElementById("cal-cl-moins")?.addEventListener("click", () => {
    if (removeOne(dateKey, "cigs")) {
      const v = Math.max(0, (parseInt(spanCl.textContent || "0", 10) - 1));
      spanCl.textContent = String(v);
      renderMonth(); // refresh pastilles
    }
  });
  // cig +
  document.getElementById("cal-cl-plus")?.addEventListener("click", () => {
    if (addEntry("cigs", 1, new Date(dateKey))) {
      const v = (parseInt(spanCl.textContent || "0", 10) + 1);
      spanCl.textContent = String(v);
      renderMonth();
    }
  });

  // weed -
  document.getElementById("cal-j-moins")?.addEventListener("click", () => {
    if (removeOne(dateKey, "weed")) {
      const v = Math.max(0, (parseInt(spanJ.textContent || "0", 10) - 1));
      spanJ.textContent = String(v);
      renderMonth();
    }
  });
  // weed +
  document.getElementById("cal-j-plus")?.addEventListener("click", () => {
    if (addEntry("weed", 1, new Date(dateKey))) {
      const v = (parseInt(spanJ.textContent || "0", 10) + 1);
      spanJ.textContent = String(v);
      renderMonth();
    }
  });

  // alcool -
  document.getElementById("cal-a-moins")?.addEventListener("click", () => {
    if (removeOne(dateKey, "alcohol")) {
      const v = Math.max(0, (parseInt(spanA.textContent || "0", 10) - 1));
      spanA.textContent = String(v);
      renderMonth();
    }
  });
  // alcool +
  document.getElementById("cal-a-plus")?.addEventListener("click", () => {
    if (addEntry("alcohol", 1, new Date(dateKey))) {
      const v = (parseInt(spanA.textContent || "0", 10) + 1);
      spanA.textContent = String(v);
      renderMonth();
    }
  });
}

// ---------- Navigation mois ----------
function wireMonthNav() {
  document.getElementById("cal-prev")?.addEventListener("click", () => {
    current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    renderMonth();
  });
  document.getElementById("cal-next")?.addEventListener("click", () => {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    renderMonth();
  });
}

// ---------- Initialisation ----------
export function initCalendar() {
  // premier rendu
  renderMonth();
  wireMonthNav();

  // Rafraîchissements automatiques quand le state bouge
  offHandlers.push(on("state:daily",   () => renderMonth()));
  offHandlers.push(on("state:changed", () => renderMonth()));

  // Si on revient sur l’app (visibilité), on rafraîchit
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderMonth();
  });
}
