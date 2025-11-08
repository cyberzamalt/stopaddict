/* web/js/calendar.js — Calendrier/Agenda V2 (ES module, idempotent) */

/* Local helpers (indépendants) */
function $(s){return document.querySelector(s);}
function $$(s){return document.querySelectorAll(s);}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function pad2(n){return String(n).padStart(2,"0");}
function ymd(d){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;}
function isSameDay(a,b){return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();}

/* Récupère les modules cochés dans les filtres (checkbox data-cal-filter) */
function getActiveFilters(){
  const act = new Set();
  $$('[data-cal-filter]').forEach(cb=>{ if(cb.checked) act.add(cb.getAttribute('data-cal-filter')); });
  return act;
}

/* Lecture d’un jour dans l’historique + fallback aujourd’hui */
function readDay(state, dateKey){
  const d = state.history?.[dateKey] || {};
  // Sécurise champs
  return {
    cigs: Number(d.cigs||0),
    joints: Number(d.joints||0),
    beer: Number(d.beer||0),
    hard: Number(d.hard||0),
    liqueur: Number(d.liqueur||0),
    cost: Number(d.cost||0),
    saved: Number(d.saved||0),
  };
}

/* Applique les filtres au résumés d’un jour */
function dayFilteredTotals(day, filters){
  const map = { cigs:day.cigs, joints:day.joints, beer:day.beer, hard:day.hard, liqueur:day.liqueur };
  let qty=0;
  for(const k of Object.keys(map)){ if(filters.has(k)) qty += Number(map[k]||0); }
  return { qty, cost: day.cost, saved: day.saved };
}

/* Rendu de petits badges dans les cases */
function renderMiniTotals(day, filters){
  const { qty, cost, saved } = dayFilteredTotals(day, filters);
  const frMoney = (n)=> {
    try{ return n.toLocaleString('fr-FR',{style:'currency', currency:'EUR'}); }
    catch{ return `${(n||0).toFixed(2)}€`; }
  };
  const bits = [];
  if(qty>0) bits.push(`<span class="mini-dot">${qty}</span>`);
  if(cost>0) bits.push(`<span class="mini-euro" title="Coût">${frMoney(cost)}</span>`);
  if(saved>0) bits.push(`<span class="mini-euro" title="Économies">+${frMoney(saved)}</span>`);
  return bits.join(' ');
}

/* ----------------------------------------------------------------------------
   Module principal
----------------------------------------------------------------------------- */
export function mountCalendar({ S, getState, showTab }){
  // Empêche double montage
  if (document.body.dataset.calBound === "1") {
    return { update: (state)=>renderAll(state || (getState?getState():S)) };
  }
  document.body.dataset.calBound = "1";

  const grid = $("#calendar-grid");
  const details = $("#calendar-details");
  const titleEl = $("#cal-title");
  const btnPrev = $("#cal-prev");
  const btnNext = $("#cal-next");
  const modeBtns = $$('[data-cal-mode]');
  const openStats = $("#cal-open-stats");
  const openHabits= $("#cal-open-habits");

  let mode = "month";             // "day" | "week" | "month"
  let refDate = new Date();       // date de référence
  let filters = getActiveFilters();

  /* ---------- Navigation ---------- */
  function shiftRef(dir){
    const d = new Date(refDate);
    if (mode==="day"){ d.setDate(d.getDate() + (dir>0?+1:-1)); }
    else if (mode==="week"){ d.setDate(d.getDate() + (dir>0?+7:-7)); }
    else { // month
      d.setMonth(d.getMonth() + (dir>0?+1:-1), 1);
    }
    refDate = d;
  }

  btnPrev?.addEventListener("click", ()=>{ shiftRef(-1); renderAll(getState?getState():S); });
  btnNext?.addEventListener("click", ()=>{ shiftRef(+1); renderAll(getState?getState():S); });

  modeBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      modeBtns.forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      mode = b.getAttribute("data-cal-mode") || "month";
      renderAll(getState?getState():S);
    });
  });

  $$('[data-cal-filter]').forEach(cb=>{
    cb.addEventListener("change", ()=>{
      filters = getActiveFilters();
      renderAll(getState?getState():S);
    });
  });

  openStats?.addEventListener("click", ()=> showTab && showTab("stats"));
  openHabits?.addEventListener("click",()=> showTab && showTab("habits"));

  /* ---------- Rendus ---------- */
  function renderHeaderLabel(){
    const months = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
    const days = ["dim.","lun.","mar.","mer.","jeu.","ven.","sam."];

    if (mode==="day"){
      const d = refDate;
      titleEl && (titleEl.textContent = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`);
    } else if (mode==="week"){
      const d = new Date(refDate);
      const wd = (d.getDay()+6)%7; // Lundi=0
      const start = new Date(d); start.setDate(d.getDate()-wd);
      const end = new Date(start); end.setDate(start.getDate()+6);
      titleEl && (titleEl.textContent = `Semaine du ${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} au ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`);
    } else {
      const d = refDate;
      titleEl && (titleEl.textContent = `${months[d.getMonth()].replace('.','')} ${d.getFullYear()}`);
    }
  }

  function renderMonth(state){
    if(!grid) return;
    grid.className = "cal-grid";
    grid.innerHTML = "";

    const y = refDate.getFullYear(), m = refDate.getMonth();
    const first = new Date(y,m,1);
    const last = new Date(y,m+1,0);
    const start = new Date(first);
    const offset = (first.getDay()+6)%7; // Lundi=0
    start.setDate(first.getDate() - offset);
    const totalCells = 42; // 6 semaines

    const today = new Date();
    for(let i=0;i<totalCells;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      const key = ymd(d);
      const day = readDay(state, key);

      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (d.getMonth()!==m) cell.classList.add("cal-other");
      if (isSameDay(d,today)) cell.classList.add("cal-today");

      cell.innerHTML = `
        <div class="cal-day">${d.getDate()}</div>
        <div class="cal-mini">${renderMiniTotals(day, filters)}</div>
      `;
      cell.addEventListener("click", ()=>{
        modeBtns.forEach(x=>x.classList.remove("active"));
        $$('[data-cal-mode="day"]')[0]?.classList.add("active");
        mode="day"; refDate=new Date(d);
        renderAll(state);
      });

      grid.appendChild(cell);
    }
  }

  function renderWeek(state){
    if(!grid) return;
    grid.className = "cal-row";
    grid.innerHTML = "";

    const d = new Date(refDate);
    const wd = (d.getDay()+6)%7;
    const start = new Date(d); start.setDate(d.getDate()-wd);

    const today = new Date();
    for(let i=0;i<7;i++){
      const cur = new Date(start); cur.setDate(start.getDate()+i);
      const key = ymd(cur);
      const day = readDay(state, key);
      const cell = document.createElement("div");
      cell.className = "cal-cell week";
      if (isSameDay(cur,today)) cell.classList.add("cal-today");

      const rows = [];
      const kinds = ["cigs","joints","beer","hard","liqueur"];
      const icons = { cigs:"🚬", joints:"🌿", beer:"🍺", hard:"🥃", liqueur:"🍸" };
      kinds.forEach(k=>{
        if (!filters.has(k)) return;
        const val = Number(day[k]||0);
        if (val>0) rows.push(`<span class="mini-dot">${icons[k]} ${val}</span>`);
      });

      cell.innerHTML = `
        <div class="cal-day"><strong>${cur.getDate()}</strong></div>
        <div class="cal-breakdown">${rows.join(" ")}</div>
        <div class="cal-mini">${renderMiniTotals(day, filters)}</div>
      `;
      cell.addEventListener("click", ()=>{
        modeBtns.forEach(x=>x.classList.remove("active"));
        $$('[data-cal-mode="day"]')[0]?.classList.add("active");
        mode="day"; refDate=new Date(cur);
        renderAll(state);
      });

      grid.appendChild(cell);
    }
  }

  function renderDay(state){
    if(!grid || !details) return;
    grid.className = "cal-dayview";
    grid.innerHTML = "";
    details.innerHTML = "";

    const key = ymd(refDate);
    const day = readDay(state,key);

    // Résumé
    const sum = document.createElement("div");
    sum.className = "cal-box";
    const blocks = [
      {label:"Cigarettes",   val: day.cigs},
      {label:"Joints",       val: day.joints},
      {label:"Bière",        val: day.beer},
      {label:"Alcool fort",  val: day.hard},
      {label:"Liqueur",      val: day.liqueur},
      {label:"Coût (€)",     val: (day.cost||0).toFixed(2)},
      {label:"Économies (€)",val: (day.saved||0).toFixed(2)},
    ];
    sum.innerHTML = `
      <h4>Résumé du ${refDate.toLocaleDateString("fr-FR")}</h4>
      <div class="cal-summary">
        ${blocks.map(b=>`<div><div>${b.label}</div><strong>${b.val}</strong></div>`).join("")}
      </div>
    `;
    grid.appendChild(sum);

    // Détails (barres simples)
    const det = document.createElement("div");
    det.className = "cal-box";
    det.innerHTML = `<h4>Détails</h4>`;
    const wrap = document.createElement("div");
    wrap.className = "cal-breakdown";
    const kinds = ["cigs","joints","beer","hard","liqueur"];
    const labels= { cigs:"Cigarettes", joints:"Joints", beer:"Bière", hard:"Alcool fort", liqueur:"Liqueur" };
    kinds.forEach(k=>{
      if (!filters.has(k)) return;
      const v = Number(day[k]||0);
      const span = document.createElement("span");
      span.className = "mini-dot";
      span.textContent = `${labels[k]}: ${v}`;
      wrap.appendChild(span);
    });
    det.appendChild(wrap);
    details.appendChild(det);
  }

  function renderAll(state){
    // recalcul filtre (au cas où)
    filters = getActiveFilters();
    renderHeaderLabel();
    details && (details.innerHTML = "");
    if (mode==="day") renderDay(state);
    else if (mode==="week") renderWeek(state);
    else renderMonth(state);
  }

  // Premier rendu
  renderAll(S);

  // Expose une méthode d’update pour l’app
  return {
    update(nextState){
      renderAll(nextState || (getState?getState():S));
    }
  };
}
