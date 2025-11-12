/* ============================================================
   StopAddict v3 — calendar.js
   Calendrier enrichi : arrêts, suivis, jalons, fiche jour
   ============================================================ */
(function () {
  "use strict";

  const root = document.getElementById("calendar-root");
  if (!root) return;

  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();

  /* ---------- UTILITAIRES ---------- */
  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function pad2(n) {
    return n.toString().padStart(2, "0");
  }

  function isoDate(y, m, d) {
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  }

  function isSameDate(a, b) {
    return a && b && a.slice(0, 10) === b.slice(0, 10);
  }

  /* ---------- CONSTRUCTION DU CALENDRIER ---------- */
  function renderCalendar() {
    const S = window.S;
    if (!S) return;

    const monthName = new Date(currentYear, currentMonth).toLocaleString(S.profile.lang || "fr", { month: "long" });
    const nbDays = daysInMonth(currentYear, currentMonth);
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0=dimanche

    const startIndex = (firstDay + 6) % 7; // décaler pour que lundi soit le premier
    const cells = [];
    const stopDate = S.habits.stopDate;
    const follow = S.enabled_since;
    const hist = S.history;

    for (let i = 0; i < startIndex; i++) cells.push(`<div class="day empty"></div>`);

    for (let d = 1; d <= nbDays; d++) {
      const date = isoDate(currentYear, currentMonth, d);
      const dayData = hist[date] || null;

      // Badges
      const badges = [];

      // Arrêt
      if (isSameDate(stopDate, date)) badges.push(`<span class="badge stop">Arrêt</span>`);

      // Suivi depuis
      for (const [k, since] of Object.entries(follow)) {
        if (isSameDate(since, date)) badges.push(`<span class="badge follow">${k}</span>`);
      }

      // Jalons (1,7,30 jours depuis l'arrêt)
      if (stopDate) {
        const diff = Math.floor((new Date(date) - new Date(stopDate)) / (1000 * 60 * 60 * 24));
        if ([1, 7, 30].includes(diff)) {
          badges.push(`<span class="badge milestone">${diff}j</span>`);
        }
      }

      const classes = ["day"];
      if (isSameDate(date, S.today.date)) classes.push("today");

      cells.push(`
        <div class="${classes.join(" ")}" data-date="${date}">
          <div class="num">${d}</div>
          ${badges.join("")}
        </div>
      `);
    }

    root.innerHTML = `
      <div class="calendar-header">
        <button id="cal-prev">◀</button>
        <h3>${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${currentYear}</h3>
        <button id="cal-next">▶</button>
      </div>
      <div class="calendar-grid">
        <div class="dow">Lun</div><div class="dow">Mar</div><div class="dow">Mer</div><div class="dow">Jeu</div>
        <div class="dow">Ven</div><div class="dow">Sam</div><div class="dow">Dim</div>
        ${cells.join("")}
      </div>
    `;

    bindCalendarEvents();
  }

  /* ---------- FICHE JOUR ---------- */
  function showDayPopup(date) {
    const S = window.S;
    const day = S.history[date] || null;
    const dlg = document.createElement("dialog");
    dlg.className = "day-dialog";

    let html = `<h3>${date}</h3>`;
    if (!day) {
      html += `<p>Aucune donnée enregistrée.</p>`;
    } else {
      const c = day.counters || {};
      const cost = day.cost ?? window.StopAddictState.calculateDayCost({ ...S, today: day });
      html += `
        <ul>
          <li><b>Clopes :</b> ${c.cigs ?? 0}</li>
          <li><b>Joints :</b> ${c.joints ?? 0}</li>
          <li><b>Alcool :</b> ${c.alcohol ?? 0}</li>
          <li><b>Bière :</b> ${c.beer ?? 0}</li>
          <li><b>Fort :</b> ${c.hard ?? 0}</li>
          <li><b>Liqueur :</b> ${c.liqueur ?? 0}</li>
          <li><b>Coût :</b> ${cost.toFixed(2)} ${S.profile.currency}</li>
        </ul>
      `;

      // Économie estimée
      const goals = S.habits.goal;
      const ref = (goals.cigs || 0) + (goals.joints || 0) + (goals.alcohol || 0);
      const act = (c.cigs || 0) + (c.joints || 0) + (c.alcohol || 0);
      const diff = ref > 0 ? ref - act : 0;
      const priceAvg = mean(Object.values(S.prices));
      const saving = Math.max(0, diff * priceAvg);
      html += `<p><b>Économie estimée :</b> ${saving.toFixed(2)} ${S.profile.currency}</p>`;
    }

    html += `<div style="text-align:right;margin-top:.5rem;"><button id="close-day">Fermer</button></div>`;
    dlg.innerHTML = html;
    document.body.appendChild(dlg);
    dlg.showModal();

    dlg.querySelector("#close-day").addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => dlg.remove());
  }

  function mean(arr) {
    const vals = arr.filter(v => Number.isFinite(v));
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  }

  /* ---------- ÉVÉNEMENTS ---------- */
  function bindCalendarEvents() {
    $("#cal-prev")?.addEventListener("click", () => changeMonth(-1));
    $("#cal-next")?.addEventListener("click", () => changeMonth(1));

    root.querySelectorAll(".day").forEach(d => {
      d.addEventListener("click", () => {
        const date = d.dataset.date;
        if (!date) return;
        showDayPopup(date);
        // Déclencher conseils spéciaux (jalons)
        checkMilestoneAdvice(date);
      });
    });
  }

  function changeMonth(offset) {
    currentMonth += offset;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  }

  /* ---------- CONSEILS SPÉCIAUX ---------- */
  function checkMilestoneAdvice(date) {
    const S = window.S;
    if (!S.habits.stopDate) return;
    const diff = Math.floor((new Date(date) - new Date(S.habits.stopDate)) / (1000 * 60 * 60 * 24));
    if ([1, 7, 30].includes(diff)) {
      if (window.Advices?.showMilestone)
        window.Advices.showMilestone(diff);
    }
  }

  /* ---------- API PUBLIQUE ---------- */
  window.Calendar = {
    refresh: renderCalendar
  };

  // Premier rendu
  document.addEventListener("DOMContentLoaded", renderCalendar);

})();
