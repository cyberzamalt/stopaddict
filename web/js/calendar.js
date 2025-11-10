/* web/js/calendar.js — Calendrier mensuel façon monolithe */
import { todayKey } from "./state.js";

const KINDS = ["cigs","joints","beer","hard","liqueur"];
const KIND_EMOJI = { cigs:"🚬", joints:"🌿", beer:"🍺", hard:"🥃", liqueur:"🍸" };

let _S = null;
let _getState = null;
let _showTab = null;

let $grid, $details, $title, $prev, $next, $openStats, $openHabits;
let _current = firstOfMonth(new Date());
let _selected = keyToDate(todayKey());

function $(s){ return document.querySelector(s); }
function $all(s){ return Array.from(document.querySelectorAll(s)); }

function firstOfMonth(d){ const x=new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; }
function keyToDate(k){ const [y,m,d]=k.split("-").map(Number); return new Date(y,(m||1)-1,d||1); }
function dateToKey(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), da=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${da}`; }
function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function sameMonth(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth(); }
function mondayIndex(d){ return (d.getDay()+6)%7; } // 0 = Lundi

function getS(){ return _getState ? _getState() : (_S||{}); }
function dayData(S, key){
  // Données affichées : counters + cost/saved
  const today = todayKey();
  if(key === today){
    const t=S.today||{};
    const c=t.counters||{};
    return {
      cigs: c.cigs||0, joints:c.joints||0, beer:c.beer||0, hard:c.hard||0, liqueur:c.liqueur||0,
      cost: (S.history?.[key]?.cost ?? 0), saved: (S.history?.[key]?.saved ?? 0)
    };
  }
  const d=S.history?.[key]||{};
  return {
    cigs: d.cigs||0, joints:d.joints||0, beer:d.beer||0, hard:d.hard||0, liqueur:d.liqueur||0,
    cost: d.cost||0, saved: d.saved||0
  };
}

function activeKinds(){
  // Filtre via checkbox data-cal-filter (toutes cochées par défaut)
  const boxes = $all('[data-cal-filter]');
  if(!boxes.length) return [...KINDS];
  return boxes.filter(b=>b.checked).map(b=>b.getAttribute('data-cal-filter')).filter(k=>KINDS.includes(k));
}

function renderHeader(){
  const opts = { month:"long", year:"numeric" };
  $title.textContent = _current.toLocaleDateString("fr-FR", opts);
}

function renderGrid(){
  if(!$grid) return;
  const kinds = new Set(activeKinds());
  const head = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const body = document.createElement("div");
  body.className = "cal-body";

  // Point de départ : lundi de la semaine contenant le 1er du mois
  const start = addDays(firstOfMonth(_current), -mondayIndex(firstOfMonth(_current)));
  // 6 semaines = 42 cases
  for(let i=0;i<42;i++){
    const d = addDays(start, i);
    const key = dateToKey(d);
    const data = dayData(getS(), key);

    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if(!sameMonth(d, _current)) cell.classList.add("cal-other");
    if(dateToKey(d) === dateToKey(new Date())) cell.classList.add("cal-today");
    cell.dataset.date = key;

    // numéro du jour
    const day = document.createElement("div");
    day.className = "cal-day";
    day.textContent = String(d.getDate());
    cell.appendChild(day);

    // mini récap (icônes sélectionnées + coût € si > 0)
    const mini = document.createElement("div");
    mini.className = "cal-mini";

    KINDS.forEach(k=>{
      const v = Number(data[k]||0);
      if(!kinds.has(k) || v<=0) return;
      const dot = document.createElement("span");
      dot.className = "mini-dot";
      dot.textContent = KIND_EMOJI[k];
      dot.title = `${v} ${k}`;
      mini.appendChild(dot);
    });

    if((data.cost||0) > 0){
      const euro = document.createElement("span");
      euro.className = "mini-euro";
      euro.textContent = "€";
      euro.title = `Coût: ${data.cost.toFixed(2)}`;
      mini.appendChild(euro);
    }

    cell.appendChild(mini);

    // sélection
    cell.addEventListener("click", ()=>{
      _selected = d;
      highlightSelection();
      renderDetails();
    });

    body.appendChild(cell);
  }

  // Compose head + body
  const headRow = document.createElement("div");
  headRow.className = "cal-head";
  head.forEach(lbl=>{
    const h = document.createElement("div");
    h.textContent = lbl;
    headRow.appendChild(h);
  });

  $grid.innerHTML = "";
  $grid.appendChild(headRow);
  $grid.appendChild(body);

  highlightSelection();
}

function highlightSelection(){
  const selKey = dateToKey(_selected);
  $all(".cal-cell").forEach(c=>{
    c.classList.toggle("cal-selected", c.dataset.date === selKey);
  });
}

function renderDetails(){
  if(!$details) return;
  const S = getS();
  const key = dateToKey(_selected);
  const data = dayData(S, key);

  const sumAlcohol = (data.beer||0)+(data.hard||0)+(data.liqueur||0);

  $details.innerHTML = `
    <div class="cal-box">
      <h4>Détail du ${new Date(key).toLocaleDateString("fr-FR")}</h4>
      <div class="cal-summary">
        <div>🚬 Clopes<br><strong>${data.cigs||0}</strong></div>
        <div>🌿 Joints<br><strong>${data.joints||0}</strong></div>
        <div>🍺+🥃+🍸 Alcool<br><strong>${sumAlcohol}</strong></div>
        <div>€ Coût<br><strong>${(data.cost||0).toFixed(2)}</strong></div>
        <div>💶 Économies<br><strong>${(data.saved||0).toFixed(2)}</strong></div>
      </div>
      <div class="cal-links">
        <button id="goto-stats" class="btn small">Ouvrir Stats</button>
        <button id="goto-habits" class="btn small">Ouvrir Habitudes</button>
      </div>
    </div>
  `;

  $details.querySelector("#goto-stats")?.addEventListener("click", ()=> _showTab && _showTab("stats"));
  $details.querySelector("#goto-habits")?.addEventListener("click", ()=> _showTab && _showTab("habits"));
}

function bindNav(){
  $prev?.addEventListener("click", ()=>{
    _current = firstOfMonth(addDays(_current, -1)); // recule d’un jour puis re-1er → mois précédent
    renderHeader(); renderGrid(); renderDetails();
  });
  $next?.addEventListener("click", ()=>{
    const nextMonth = new Date(_current); nextMonth.setMonth(_current.getMonth()+1, 1);
    _current = firstOfMonth(nextMonth);
    renderHeader(); renderGrid(); renderDetails();
  });
  // Filtres
  $all('[data-cal-filter]').forEach(cb=>{
    cb.addEventListener("change", ()=>{ renderGrid(); renderDetails(); });
  });
  // Liens persistants
  $openStats?.addEventListener("click", ()=> _showTab && _showTab("stats"));
  $openHabits?.addEventListener("click", ()=> _showTab && _showTab("habits"));
}

function initialSelect(){
  // Si le mois affiché ne contient pas la date sélectionnée, on sélectionne le 1er du mois.
  if(!sameMonth(_selected, _current)) _selected = firstOfMonth(_current);
}

/* --------- API --------- */
export function mountCalendar({ S, getState, showTab } = {}){
  _S = S || null;
  _getState = typeof getState==="function" ? getState : null;
  _showTab = typeof showTab==="function" ? showTab : null;

  $grid = $("#calendar-grid");
  $details = $("#calendar-details");
  $title = $("#cal-title");
  $prev = $("#cal-prev");
  $next = $("#cal-next");
  $openStats = $("#cal-open-stats");
  $openHabits = $("#cal-open-habits");

  initialSelect();
  bindNav();
  renderHeader();
  renderGrid();
  renderDetails();

  return {
    update(S2){
      if(S2) _S = S2;
      // Rerender (utile après changement de counters / filtres / mois)
      renderHeader();
      renderGrid();
      renderDetails();
    }
  };
}
