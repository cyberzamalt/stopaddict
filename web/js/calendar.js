// web/js/calendar.js
// Rendu du calendrier + pastilles par consommation + jalons
// Modale "jour" avec +/- et RAZ, sauvegarde directe dans l'historique LS (clé robuste)
// Émet "sa:history-changed" et "sa:counts-updated" après modif pour rafraîchir le reste

import { $, $$, startOfMonth, formatYMD } from "./utils.js";

const LS_HISTORY_KEYS = ["sa:history","sa_history","SA_HISTORY","history"];

function getJSONFromKeys(keys, def=null){
  for (const k of keys){
    try {
      const v = localStorage.getItem(k);
      if (v) return JSON.parse(v);
    } catch(e){}
  }
  return def;
}
function setJSONFirstKey(keys, obj){
  try { localStorage.setItem(keys[0], JSON.stringify(obj)); } catch(e){}
}

function normDayEntry(raw){
  if (!raw || typeof raw!=="object") return { c:0,j:0,a:0 };
  const c = raw.c ?? raw.cigs ?? raw.clopes ?? raw.cl ?? 0;
  const j = raw.j ?? raw.weed ?? raw.joints ?? raw.jt ?? 0;
  let a  = raw.a ?? raw.alcool ?? raw.alcohol ?? 0;
  const beer   = raw.beer ?? raw.biere ?? 0;
  const strong = raw.strong ?? raw.fort ?? 0;
  const liquor = raw.liquor ?? raw.liqueur ?? 0;
  if (beer||strong||liquor) a = (Number(a)||0)+beer+strong+liquor;
  return { c:Number(c)||0, j:Number(j)||0, a:Number(a)||0 };
}

function loadHistory(){ return getJSONFromKeys(LS_HISTORY_KEYS, {}) || {}; }

function monthMeta(d){
  const som = startOfMonth(d);
  const year = som.getFullYear();
  const month= som.getMonth();
  const firstDay = new Date(year, month, 1);
  const next     = new Date(year, month+1, 1);
  const days = [];
  for (let dt = new Date(firstDay); dt < next; dt.setDate(dt.getDate()+1)){
    days.push(new Date(dt));
  }
  const label = firstDay.toLocaleString("fr-FR", { month:"long", year:"numeric" });
  return { days, label };
}

function renderGrid(baseDate){
  const grid = $("#cal-grid");
  const title = $("#cal-titre");
  if (!grid || !title) return;

  const meta = monthMeta(baseDate);
  title.textContent = meta.label[0].toUpperCase()+meta.label.slice(1);

  grid.innerHTML = "";
  const todayYMD = formatYMD(new Date());
  const history = loadHistory();

  for (const dt of meta.days){
    const ymd = formatYMD(dt);
    const e = normDayEntry(history[ymd] || {});
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    if (ymd===todayYMD) cell.classList.add("today");
    if ((e.c||0) + (e.j||0) + (e.a||0) > 0) cell.classList.add("has-data");

    const num = document.createElement("div");
    num.className = "cal-num";
    num.textContent = String(dt.getDate());
    cell.appendChild(num);

    // Dots conso
    const dots = document.createElement("div");
    if (e.c>0){ const d=document.createElement("span"); d.className="dot c"; dots.appendChild(d); }
    if (e.j>0){ const d=document.createElement("span"); d.className="dot j"; dots.appendChild(d); }
    if (e.a>0){ const d=document.createElement("span"); d.className="dot a"; dots.appendChild(d); }
    cell.appendChild(dots);

    cell.addEventListener("click", ()=> openDayModal(ymd));
    grid.appendChild(cell);
  }
}

let currentMonth = new Date();

function openDayModal(ymd){
  const modal = $("#cal-jour");
  if (!modal) return;

  const t = $("#cal-jour-titre");
  if (t) t.textContent = new Date(ymd).toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });

  const history = loadHistory();
  const e = normDayEntry(history[ymd] || {});
  const elC = $("#cal-jour-cl"); if (elC) elC.textContent = e.c;
  const elJ = $("#cal-jour-j");  if (elJ) elJ.textContent = e.j;
  const elA = $("#cal-jour-a");  if (elA) elA.textContent = e.a;

  // segments (si besoin)
  const segCl = $("#cal-jour-seg-cl"); if (segCl) segCl.innerHTML = "";
  const segA  = $("#cal-jour-seg-a");  if (segA)  segA.innerHTML  = "";

  // Bind +/- et RAZ
  const bind = (id, delta, key) => {
    const btn = $(id);
    if (!btn) return;
    btn.onclick = ()=>{
      const hist = loadHistory();
      const cur  = normDayEntry(hist[ymd] || {});
      cur[key] = Math.max(0, (Number(cur[key])||0) + delta);
      hist[ymd] = cur;
      setJSONFirstKey(LS_HISTORY_KEYS, hist);
      // maj UI
      openDayModal(ymd);
      // signale
      window.dispatchEvent(new CustomEvent("sa:history-changed", {detail:{ymd}}));
      window.dispatchEvent(new CustomEvent("sa:counts-updated"));
      // rafraîchit grille
      renderGrid(currentMonth);
    };
  };
  bind("#cal-cl-plus",  +1, "c");
  bind("#cal-cl-moins", -1, "c");
  bind("#cal-j-plus",   +1, "j");
  bind("#cal-j-moins",  -1, "j");
  bind("#cal-a-plus",   +1, "a");
  bind("#cal-a-moins",  -1, "a");

  const raz = $("#cal-jour-raz");
  if (raz) raz.onclick = ()=>{
    const hist = loadHistory();
    hist[ymd] = { c:0, j:0, a:0 };
    setJSONFirstKey(LS_HISTORY_KEYS, hist);
    openDayModal(ymd);
    window.dispatchEvent(new CustomEvent("sa:history-changed", {detail:{ymd}}));
    window.dispatchEvent(new CustomEvent("sa:counts-updated"));
    renderGrid(currentMonth);
  };

  const close = $("#cal-jour-fermer");
  if (close) close.onclick = ()=>{ modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); };

  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

export function initCalendar(){
  // boutons mois
  const prev = $("#cal-prev");
  const next = $("#cal-next");
  const grid = $("#cal-grid");
  if (!grid) return;

  renderGrid(currentMonth);

  if (prev) prev.addEventListener("click", ()=>{
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()-1, 1);
    renderGrid(currentMonth);
  });
  if (next) next.addEventListener("click", ()=>{
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);
    renderGrid(currentMonth);
  });

  // Rafraîchir si import / maj
  window.addEventListener("sa:storage-imported", ()=> renderGrid(currentMonth));
  window.addEventListener("sa:history-changed",  ()=> renderGrid(currentMonth));
}
