/* web/js/calendar.js — Grille mensuelle type monolithe (mini-récaps + détail jour) */

import { loadState, todayKey, fmtMoney } from "./state.js";

/* ---------- Config ---------- */
const KINDS = ["cigs","joints","beer","hard","liqueur"];
const LABELS = {
  cigs:"Cigarettes", joints:"Joints", beer:"Bière", hard:"Alcool fort", liqueur:"Liqueur"
};
const EMOJI = { cigs:"🚬", joints:"🌿", beer:"🍺", hard:"🥃", liqueur:"🍸" };

/* ---------- Helpers ---------- */
const ISO = d => d.toISOString().slice(0,10);
function firstOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function startOfGrid(d){
  const f = firstOfMonth(d);
  // grille Lundi→Dimanche (6 semaines)
  const wd = (f.getDay()+6)%7; // 0=Lundi
  f.setDate(f.getDate()-wd);
  return f;
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function isSameMonth(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth(); }
function isToday(d){ return ISO(d)===ISO(new Date()); }

/* ---------- State (module) ---------- */
let curDate = new Date(); // mois courant
let filters = { cigs:true, joints:true, beer:true, hard:true, liqueur:true };
let refs = {}; // DOM refs
let external = { getState: null, showTab: null };

/* ---------- Rendering ---------- */
function setTitleMonth(d){
  const el = refs.title;
  if (!el) return;
  el.textContent = d.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
}

function renderGrid(S){
  const root = refs.grid; if (!root) return;
  root.innerHTML = "";

  const start = startOfGrid(curDate);
  const cells = [];
  for (let i=0;i<42;i++){
    const d = addDays(start,i);
    const iso = ISO(d);
    const data = S.history?.[iso] || {};
    const other = !isSameMonth(d, curDate);

    // mini récap par type filtré
    const minis = [];
    for (const k of KINDS){
      const v = Number(data[k]||0);
      if (!v) continue;
      if (!filters[k]) continue;
      const chip = `<span class="mini-dot" title="${LABELS[k]}">${EMOJI[k]} ${v}</span>`;
      minis.push(chip);
    }
    // coût mini
    if ((data.cost||0) > 0){
      minis.push(`<span class="mini-euro" title="Coût">${(data.cost||0).toFixed(0)}€</span>`);
    }

    const classes = ["cal-cell"];
    if (other) classes.push("cal-other");
    if (isToday(d)) classes.push("cal-today");

    cells.push(`
      <div class="${classes.join(" ")}" data-date="${iso}">
        <div class="cal-day">${d.getDate()}</div>
        <div class="cal-mini">${minis.join("")}</div>
      </div>
    `);
  }

  root.innerHTML = `
    <div class="cal-head">
      <div>Lu</div><div>Ma</div><div>Me</div><div>Je</div><div>Ve</div><div>Sa</div><div>Di</div>
    </div>
    <div class="cal-body">
      ${cells.join("")}
    </div>
  `;

  // Click handlers -> détail jour
  root.querySelectorAll(".cal-cell").forEach(cell=>{
    cell.addEventListener("click", ()=>{
      const iso = cell.getAttribute("data-date");
      showDayDetails(S, iso);
    });
  });
}

function showDayDetails(S, iso){
  const box = refs.details; if (!box) return;
  const d = S.history?.[iso] || {};
  const dateLabel = new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long", day:"2-digit", month:"long", year:"numeric"});

  const lines = KINDS.map(k=>{
    return `
      <div class="tip-line">
        <strong>${EMOJI[k]} ${LABELS[k]}</strong>
        <span style="float:right">${Number(d[k]||0)}</span>
      </div>
    `;
  }).join("");

  const cur = loadState(); // pour la devise
  const money = `
    <div class="cal-summary">
      <div><div><strong>Coût</strong></div><div>${fmtMoney(+d.cost||0, cur.currency)}</div></div>
      <div><div><strong>Économies</strong></div><div>${fmtMoney(+d.saved||0, cur.currency)}</div></div>
    </div>
  `;

  box.innerHTML = `
    <div class="cal-box">
      <h4>${dateLabel}</h4>
      ${money}
      <div class="cal-breakdown">
        ${lines}
      </div>
      <div class="cal-links">
        <button id="cal-open-stats" class="btn small">Ouvrir Stats</button>
        <button id="cal-open-habits" class="btn small">Ouvrir Habitudes</button>
      </div>
    </div>
  `;

  // Liens -> onglets
  box.querySelector("#cal-open-stats")?.addEventListener("click", ()=>{
    external.showTab?.("stats");
  });
  box.querySelector("#cal-open-habits")?.addEventListener("click", ()=>{
    external.showTab?.("habits");
  });
}

/* ---------- Events ---------- */
function bindToolbar(){
  refs.prev?.addEventListener("click", ()=>{
    const d=new Date(curDate); d.setMonth(d.getMonth()-1); curDate=d;
    setTitleMonth(curDate);
    renderGrid(external.getState ? external.getState() : loadState());
  });
  refs.next?.addEventListener("click", ()=>{
    const d=new Date(curDate); d.setMonth(d.getMonth()+1); curDate=d;
    setTitleMonth(curDate);
    renderGrid(external.getState ? external.getState() : loadState());
  });

  // Filtres (si présents)
  (refs.filterWrap?.querySelectorAll("[data-cal-filter]")||[]).forEach(cb=>{
    const k = cb.getAttribute("data-cal-filter");
    if (k && k in filters){
      cb.checked = filters[k];
      cb.addEventListener("change", ()=>{
        filters[k] = cb.checked;
        renderGrid(external.getState ? external.getState() : loadState());
      });
    }
  });
}

/* ---------- Public API ---------- */
export function mountCalendar({ S, getState, showTab }={}){
  external.getState = typeof getState==="function" ? getState : null;
  external.showTab = typeof showTab==="function" ? showTab : null;

  refs = {
    title:   document.getElementById("cal-title"),
    prev:    document.getElementById("cal-prev"),
    next:    document.getElementById("cal-next"),
    grid:    document.getElementById("calendar-grid"),
    details: document.getElementById("calendar-details"),
    filterWrap: document.querySelector(".cal-filters")
  };

  // Init mois et rendu
  curDate = new Date();
  setTitleMonth(curDate);
  bindToolbar();
  renderGrid(S || loadState());

  // Pré-sélection : afficher le détail d’aujourd’hui si visible
  const isoToday = todayKey(new Date());
  showDayDetails(S || loadState(), isoToday);

  return {
    update(newState){
      // Appelé depuis d’autres modules (counters/habits/settings)
      renderGrid(newState || (external.getState ? external.getState() : loadState()));
      // Si le jour affiché est aujourd’hui, rafraîchir panel
      showDayDetails(newState || loadState(), isoToday);
    }
  };
}

/* Auto-mount si utilisé seul (optionnel) */
try {
  if (!window.__calMounted){
    window.__calMounted = true;
    mountCalendar({ S: loadState() });
  }
} catch {}
