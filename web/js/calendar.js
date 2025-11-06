/* web/js/calendar.js — V2 : Mois + Semaine + Jour, filtres modules, liens Stats/Habitudes */
export function mountCalendar(ctx) {
  const { S, getState = () => S, showTab } = ctx || {};
  const elGrid = document.querySelector("#calendar-grid");
  const elTitle = document.querySelector("#cal-title");
  const elDetails = document.querySelector("#calendar-details");

  if (!elGrid || !elTitle || !elDetails) return null;

  // Etat interne
  let mode = "month"; // "day" | "week" | "month"
  let ref = new Date();

  // Filtres
  function readFilters() {
    const c = (name) => !!document.querySelector(`[data-cal-filter="${name}"]`)?.checked;
    return { cigs: c("cigs"), joints: c("joints"), beer: c("beer"), hard: c("hard"), liqueur: c("liqueur") };
  }

  const fmt = (d) => d.toISOString().slice(0,10);
  const isoMonday = (d) => { const x = new Date(d); const wd = (x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x; };

  function getDayData(dateStr, filters) {
    const st = getState();
    const d = st.history?.[dateStr] || {};
    const out = {
      cigs: filters.cigs ? (d.cigs||0) : 0,
      joints: filters.joints ? (d.joints||0) : 0,
      beer: filters.beer ? (d.beer||0) : 0,
      hard: filters.hard ? (d.hard||0) : 0,
      liqueur: filters.liqueur ? (d.liqueur||0) : 0,
      cost: d.cost||0,
      saved: d.saved||0
    };
    return out;
  }

  function sumDay(d) {
    return (d.cigs||0)+(d.joints||0)+(d.beer||0)+(d.hard||0)+(d.liqueur||0);
    // coût/économies visibles dans détail
  }

  function renderMonth() {
    const st = getState();
    const y = ref.getFullYear(), m = ref.getMonth();
    const first = new Date(y, m, 1);
    const start = isoMonday(first);
    const today = fmt(new Date());

    elTitle.textContent = first.toLocaleDateString(st.profile?.language || "fr-FR", { month:"long", year:"numeric" });

    // En-têtes jours
    const headers = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    let html = `<div class="cal-head">${headers.map(h=>`<div>${h}</div>`).join("")}</div>`;

    // 6 semaines * 7 jours
    const filters = readFilters();
    let d = new Date(start);
    html += `<div class="cal-body">`;
    for (let w=0; w<6; w++) {
      for (let i=0; i<7; i++) {
        const key = fmt(d);
        const data = getDayData(key, filters);
        const total = sumDay(data);
        const inMonth = d.getMonth() === m;
        const isToday = key === today;
        html += `
          <div class="cal-cell ${inMonth?'':'cal-other'} ${isToday?'cal-today':''}" data-date="${key}">
            <div class="cal-day">${d.getDate()}</div>
            <div class="cal-mini">
              ${total>0?`<span class="mini-dot">${total}</span>`:""}
              ${data.cost?`<span class="mini-euro">€</span>`:""}
            </div>
          </div>`;
        d.setDate(d.getDate()+1);
      }
    }
    html += `</div>`;
    elGrid.innerHTML = html;

    // Click -> détail jour
    elGrid.querySelectorAll(".cal-cell").forEach(cell=>{
      cell.addEventListener("click", ()=>{
        mode = "day";
        ref = new Date(cell.dataset.date+"T00:00:00");
        render();
      });
    });

    // Détail du mois (synthèse)
    showMonthSummary(filters);
  }

  function showMonthSummary(filters) {
    const st = getState();
    const y = ref.getFullYear(), m = ref.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m+1, 0);

    let iter = new Date(first);
    let total = {cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0};
    while (iter <= last) {
      const k = fmt(iter);
      const d = getDayData(k, filters);
      total.cigs+=d.cigs; total.joints+=d.joints; total.beer+=d.beer; total.hard+=d.hard; total.liqueur+=d.liqueur;
      total.cost+=d.cost; total.saved+=d.saved;
      iter.setDate(iter.getDate()+1);
    }

    elDetails.innerHTML = `
      <div class="cal-box">
        <h4>Récapitulatif du mois</h4>
        <div class="cal-summary">
          <div>🚬 ${total.cigs}</div>
          <div>🌿 ${total.joints}</div>
          <div>🍺 ${total.beer}</div>
          <div>🥃 ${total.hard}</div>
          <div>🍸 ${total.liqueur}</div>
          <div>💸 ${(total.cost||0).toFixed(2)}</div>
          <div>💶 ${(total.saved||0).toFixed(2)}</div>
        </div>
      </div>`;
  }

  function renderWeek() {
    const st = getState();
    const start = isoMonday(ref);
    const today = fmt(new Date());
    elTitle.textContent = `${start.toLocaleDateString(st.profile?.language||"fr-FR")} → ${new Date(start.getFullYear(),start.getMonth(),start.getDate()+6).toLocaleDateString(st.profile?.language||"fr-FR")}`;

    const filters = readFilters();
    let d = new Date(start);
    let html = `<div class="cal-row">`;
    for (let i=0;i<7;i++){
      const key = fmt(d);
      const data = getDayData(key, filters);
      const isToday = key === today;
      html += `
        <div class="cal-cell week ${isToday?'cal-today':''}" data-date="${key}">
          <div class="cal-day">${d.toLocaleDateString(st.profile?.language||"fr-FR",{weekday:"short"})} ${d.getDate()}</div>
          <div class="cal-breakdown">
            <span title="Cigarettes">🚬 ${data.cigs||0}</span>
            <span title="Joints">🌿 ${data.joints||0}</span>
            <span title="Bière">🍺 ${data.beer||0}</span>
            <span title="Fort">🥃 ${data.hard||0}</span>
            <span title="Liqueur">🍸 ${data.liqueur||0}</span>
            <span title="Coût">💸 ${(data.cost||0).toFixed(2)}</span>
            <span title="Économies">💶 ${(data.saved||0).toFixed(2)}</span>
          </div>
        </div>`;
      d.setDate(d.getDate()+1);
    }
    html += `</div>`;
    elGrid.innerHTML = html;

    elDetails.innerHTML = `<div class="cal-box"><h4>Conseil</h4><p>Clique un jour pour le détail, utilise les filtres modules en haut.</p></div>`;

    elGrid.querySelectorAll(".cal-cell").forEach(cell=>{
      cell.addEventListener("click", ()=>{
        mode="day";
        ref = new Date(cell.dataset.date+"T00:00:00");
        render();
      });
    });
  }

  function renderDay() {
    const st = getState();
    const key = fmt(ref);
    elTitle.textContent = `Jour : ${ref.toLocaleDateString(st.profile?.language||"fr-FR",{weekday:"long", year:"numeric", month:"long", day:"numeric"})}`;
    const filters = readFilters();
    const d = getDayData(key, filters);

    elGrid.innerHTML = `
      <div class="cal-dayview">
        <div class="cal-box">
          <h4>${key}</h4>
          <div class="cal-summary">
            <div>🚬 ${d.cigs||0}</div>
            <div>🌿 ${d.joints||0}</div>
            <div>🍺 ${d.beer||0}</div>
            <div>🥃 ${d.hard||0}</div>
            <div>🍸 ${d.liqueur||0}</div>
            <div>💸 ${(d.cost||0).toFixed(2)}</div>
            <div>💶 ${(d.saved||0).toFixed(2)}</div>
          </div>
        </div>
      </div>`;

    elDetails.innerHTML = `<div class="cal-box"><h4>Astuce</h4><p>Utilise Habitudes pour fixer des objectifs (onglet <em>Habitudes</em>).</p></div>`;
  }

  function render() {
    if (mode==="month") renderMonth();
    else if (mode==="week") renderWeek();
    else renderDay();
  }

  // Toolbar events
  document.querySelectorAll('[data-cal-mode]').forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll('[data-cal-mode]').forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      mode = b.dataset.calMode;
      render();
    });
  });
  document.getElementById("cal-prev")?.addEventListener("click", ()=>{
    if (mode==="month") ref.setMonth(ref.getMonth()-1);
    else if (mode==="week") ref.setDate(ref.getDate()-7);
    else ref.setDate(ref.getDate()-1);
    render();
  });
  document.getElementById("cal-next")?.addEventListener("click", ()=>{
    if (mode==="month") ref.setMonth(ref.getMonth()+1);
    else if (mode==="week") ref.setDate(ref.getDate()+7);
    else ref.setDate(ref.getDate()+1);
    render();
  });
  document.querySelectorAll('[data-cal-filter]').forEach(cb=>{
    cb.addEventListener("change", render);
  });

  document.getElementById("cal-open-stats")?.addEventListener("click", ()=> showTab?.("stats"));
  document.getElementById("cal-open-habits")?.addEventListener("click", ()=> showTab?.("habits"));

  // Initial
  render();

  // API publique pour l’app
  return {
    update(nextS){ render(); }
  };
}
