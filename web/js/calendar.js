/* web/js/calendar.js — Calendrier V2 (jour / semaine / mois) */
export function mountCalendar({ S, getState, showTab }) {
  // ------- DOM -------
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const elTitle   = $("#cal-title");
  const elGrid    = $("#calendar-grid");
  const elDetails = $("#calendar-details");

  const btnPrev   = $("#cal-prev");
  const btnNext   = $("#cal-next");
  const btnStats  = $("#cal-open-stats");
  const btnHabits = $("#cal-open-habits");

  const modeBtns  = $$(".toolbar-center [data-cal-mode]");
  const filterCbs = $$(".cal-filters [data-cal-filter]");

  // ------- État local -------
  const WDAY = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  let refDate = new Date();            // date de référence
  let mode    = "month";               // "day" | "week" | "month"
  let filters = { cigs:true, joints:true, beer:true, hard:true, liqueur:true };
  let selectedISO = iso(new Date());   // jour sélectionné (pour panneau de droite)

  // ------- Utils -------
  function iso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da= String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }
  function fromISO(s){
    const [y,m,d] = s.split("-").map(Number);
    return new Date(y, m-1, d);
  }
  function startOfWeek(d){ // lundi
    const nd = new Date(d);
    const w = (nd.getDay()+6)%7;
    nd.setDate(nd.getDate()-w);
    nd.setHours(0,0,0,0);
    return nd;
  }
  function endOfWeek(d){
    const s = startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate()+6);
    return e;
  }
  function startOfMonth(d){
    const nd = new Date(d.getFullYear(), d.getMonth(), 1);
    nd.setHours(0,0,0,0);
    return nd;
  }
  function endOfMonth(d){
    const nd = new Date(d.getFullYear(), d.getMonth()+1, 0);
    nd.setHours(23,59,59,999);
    return nd;
  }
  function betweenISO(a,b,c){ // a<=b<=c (ISO strings)
    return (b>=a && b<=c);
  }
  function monthLabel(d){
    return d.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
  }
  function weekLabel(d){
    const s = startOfWeek(d), e = endOfWeek(d);
    return `${fmtDate(s)} → ${fmtDate(e)}`;
  }
  function fmtDate(d){
    const dt = (d instanceof Date) ? d : fromISO(d);
    const dd = String(dt.getDate()).padStart(2,"0");
    const mm = String(dt.getMonth()+1).padStart(2,"0");
    return `${dd}/${mm}/${dt.getFullYear()}`;
  }

  function dayData(isoKey) {
    const St = getState?.() ?? S;
    const base = St.history?.[isoKey] || {};
    // Inclure le jour en cours si c’est aujourd’hui
    if (isoKey === (St.today?.date || iso(new Date()))) {
      const t = St.today?.counters || {};
      const cost = (base.cost ?? 0) + (t.cigs||0)*unit("cigs",St) + (t.joints||0)*unit("joints",St)
                 + (t.beer||0)*unit("beer",St) + (t.hard||0)*unit("hard",St) + (t.liqueur||0)*unit("liqueur",St);
      return {
        cigs: (base.cigs||0)+(t.cigs||0),
        joints:(base.joints||0)+(t.joints||0),
        beer: (base.beer||0)+(t.beer||0),
        hard: (base.hard||0)+(t.hard||0),
        liqueur:(base.liqueur||0)+(t.liqueur||0),
        cost,
        saved: base.saved||0
      };
    }
    return {
      cigs: base.cigs||0, joints: base.joints||0, beer: base.beer||0,
      hard: base.hard||0, liqueur: base.liqueur||0, cost: base.cost||0, saved: base.saved||0
    };
  }
  function unit(kind, St){
    const p=St.prices||{}, v=St.variants||{};
    if (kind==="cigs"){
      if (p.cigarette>0) return p.cigarette;
      if (v?.classic?.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if (v?.rolled?.use && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    }
    if (kind==="joints"){
      if (p.joint>0) return p.joint;
      if (v?.cannabis?.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice*v.cannabis.gramsPerJoint;
      return 0;
    }
    if (kind==="beer")    return p.beer>0 ? p.beer : (v?.alcohol?.beer?.enabled && v.alcohol.beer.unitPrice>0 ? v.alcohol.beer.unitPrice : 0);
    if (kind==="hard")    return p.hard>0 ? p.hard : (v?.alcohol?.hard?.enabled && v.alcohol.hard.dosePrice>0 ? v.alcohol.hard.dosePrice : 0);
    if (kind==="liqueur") return p.liqueur>0 ? p.liqueur : (v?.alcohol?.liqueur?.enabled && v.alcohol.liqueur.dosePrice>0 ? v.alcohol.liqueur.dosePrice : 0);
    return 0;
  }

  // ------- Rendu -------
  function render() {
    const St = getState?.() ?? S;

    // Titre
    elTitle.textContent = (mode==="month") ? monthLabel(refDate)
                         : (mode==="week") ? weekLabel(refDate)
                         : fmtDate(refDate);

    // En-tête
    const head = `<div class="cal-head">${WDAY.map(w=>`<div>${w}</div>`).join("")}</div>`;

    // Corps selon mode
    let bodyHTML = "";
    if (mode==="month") bodyHTML = renderMonth(St);
    else if (mode==="week") bodyHTML = renderWeek(St);
    else bodyHTML = renderDay(St);

    elGrid.innerHTML = head + bodyHTML;

    // Détails (panneau de droite)
    renderDetails(St);

    // Clicks sur cases jour
    $$(".cal-cell[data-iso]")?.forEach(cell=>{
      cell.addEventListener("click", ()=>{
        selectedISO = cell.dataset.iso;
        // En mode jour, cliquer change la journée affichée
        if (mode==="day") refDate = fromISO(selectedISO);
        render();
      });
    });
  }

  function renderMonth(St){
    const s = startOfMonth(refDate);
    const e = endOfMonth(refDate);
    // Début grille = lundi de la 1re semaine contenant le 1er du mois
    const gridStart = startOfWeek(s);
    const cells = [];
    for (let i=0;i<42;i++){
      const d = new Date(gridStart); d.setDate(d.getDate()+i);
      const key = iso(d);
      const inMonth = (d.getMonth()===refDate.getMonth());
      const today   = (key===iso(new Date()));
      const dd = dayData(key);

      // Filtres
      const showCigs    = filters.cigs && dd.cigs>0;
      const showJoints  = filters.joints && dd.joints>0;
      const showBeer    = filters.beer && dd.beer>0;
      const showHard    = filters.hard && dd.hard>0;
      const showLiqueur = filters.liqueur && dd.liqueur>0;
      const any = showCigs||showJoints||showBeer||showHard||showLiqueur;

      const mini = `
        <div class="cal-mini">
          ${showCigs?`<span class="mini-dot">🚬 ${dd.cigs}</span>`:""}
          ${showJoints?`<span class="mini-dot">🌿 ${dd.joints}</span>`:""}
          ${showBeer?`<span class="mini-dot">🍺 ${dd.beer}</span>`:""}
          ${showHard?`<span class="mini-dot">🥃 ${dd.hard}</span>`:""}
          ${showLiqueur?`<span class="mini-dot">🍸 ${dd.liqueur}</span>`:""}
          ${any?`<span class="mini-euro">€ ${(dd.cost||0).toFixed(2)}</span>`:""}
        </div>`;

      cells.push(
        `<div class="cal-cell ${inMonth?"":"cal-other"} ${today?"cal-today":""}" data-iso="${key}">
           <div class="cal-day">${d.getDate()}</div>
           ${mini}
         </div>`
      );
    }
    return `<div class="cal-body">${cells.join("")}</div>`;
  }

  function renderWeek(St){
    const s = startOfWeek(refDate);
    const cells = [];
    for (let i=0;i<7;i++){
      const d = new Date(s); d.setDate(d.getDate()+i);
      const key = iso(d);
      const today = (key===iso(new Date()));
      const dd = dayData(key);

      const showCigs    = filters.cigs && dd.cigs>0;
      const showJoints  = filters.joints && dd.joints>0;
      const showBeer    = filters.beer && dd.beer>0;
      const showHard    = filters.hard && dd.hard>0;
      const showLiqueur = filters.liqueur && dd.liqueur>0;

      const mini = `
        <div class="cal-mini">
          ${showCigs?`<span class="mini-dot">🚬 ${dd.cigs}</span>`:""}
          ${showJoints?`<span class="mini-dot">🌿 ${dd.joints}</span>`:""}
          ${showBeer?`<span class="mini-dot">🍺 ${dd.beer}</span>`:""}
          ${showHard?`<span class="mini-dot">🥃 ${dd.hard}</span>`:""}
          ${showLiqueur?`<span class="mini-dot">🍸 ${dd.liqueur}</span>`:""}
          <span class="mini-euro">€ ${(dd.cost||0).toFixed(2)}</span>
        </div>`;

      cells.push(
        `<div class="cal-cell" data-iso="${key}">
           <div class="cal-day">${WDAY[i]} ${d.getDate()}</div>
           ${mini}
         </div>`
      );
    }
    return `<div class="cal-body">${cells.join("")}</div>`;
  }

  function renderDay(St){
    const key = iso(refDate);
    const dd  = dayData(key);
    selectedISO = key;

    const blocks = `
      <div class="cal-dayview">
        <div class="cal-box">
          <h4>${fmtDate(refDate)}</h4>
          <div class="cal-summary">
            <div>🚬 Cigarettes<br><strong>${dd.cigs}</strong></div>
            <div>🌿 Joints<br><strong>${dd.joints}</strong></div>
            <div>🍺 Bière<br><strong>${dd.beer}</strong></div>
            <div>🥃 Alcool fort<br><strong>${dd.hard}</strong></div>
            <div>🍸 Liqueur<br><strong>${dd.liqueur}</strong></div>
            <div>€ Coût<br><strong>${(dd.cost||0).toFixed(2)}</strong></div>
            <div>💶 Économies<br><strong>${(dd.saved||0).toFixed(2)}</strong></div>
          </div>
        </div>
      </div>`;
    return blocks;
  }

  function renderDetails(St){
    const key = selectedISO || iso(new Date());
    const dd  = dayData(key);

    elDetails.innerHTML = `
      <div class="cal-box">
        <h4>Détail du ${fmtDate(key)}</h4>
        <div class="cal-breakdown">
          <div class="mini-dot">🚬 ${dd.cigs}</div>
          <div class="mini-dot">🌿 ${dd.joints}</div>
          <div class="mini-dot">🍺 ${dd.beer}</div>
          <div class="mini-dot">🥃 ${dd.hard}</div>
          <div class="mini-dot">🍸 ${dd.liqueur}</div>
          <div class="mini-euro">€ ${(dd.cost||0).toFixed(2)}</div>
        </div>
      </div>`;
  }

  // ------- Écouteurs -------
  btnPrev?.addEventListener("click", ()=>{
    if (mode==="month"){ refDate.setMonth(refDate.getMonth()-1); }
    else if (mode==="week"){ refDate.setDate(refDate.getDate()-7); }
    else { refDate.setDate(refDate.getDate()-1); }
    render();
  });

  btnNext?.addEventListener("click", ()=>{
    if (mode==="month"){ refDate.setMonth(refDate.getMonth()+1); }
    else if (mode==="week"){ refDate.setDate(refDate.getDate()+7); }
    else { refDate.setDate(refDate.getDate()+1); }
    render();
  });

  btnStats?.addEventListener("click", ()=> showTab?.("stats"));
  btnHabits?.addEventListener("click",()=> showTab?.("habits"));

  modeBtns.forEach(b=>{
    b.addEventListener("click", ()=>{
      modeBtns.forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      mode = b.dataset.calMode;
      render();
    });
  });

  filterCbs.forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const k = cb.dataset.calFilter;
      filters[k] = cb.checked;
      render();
    });
  });

  // ------- API publique -------
  function update() {
    // Recalcul léger : on rerend avec l’état courant
    render();
  }

  // Premier rendu
  render();

  return { update };
}
