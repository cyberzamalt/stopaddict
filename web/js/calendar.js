/* ============================================================
   StopAddict — calendar.js  (v3, one-shot)
   Rôle : calendrier mensuel en LOCAL TIME
          - affichage du mois courant (Lundi→Dimanche)
          - marquage date d’arrêt (habits.stopDate)
          - marquage enabled_since.{cigs,weed,alcohol}
          - écouteurs uniques (event delegation)
   ============================================================ */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const root = $("calendar-root");

  if (!root) {
    console.warn("[calendar] #calendar-root manquant");
    return;
  }

  // ====== Helpers date (LOCAL TIME) ======
  function todayLocalISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function isoFromDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function firstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
  function daysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
  function weekdayIndexMon0Sun6(date) {
    // Lundi = 0 ... Dimanche = 6 (FR)
    const js = date.getDay(); // 0=Dimanche … 6=Samedi
    return (js + 6) % 7;
  }
  function monthLabelFR(date) {
    return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  }

  // ====== Rendu HTML du calendrier ======
  function renderCalendar(S) {
    const now = new Date();
    const first = firstDayOfMonth(now);
    const totalDays = daysInMonth(now);
    const leading = weekdayIndexMon0Sun6(first); // nombre de cases vides avant le 1er du mois

    const stopISO = (S.habits && S.habits.stopDate) || null;
    const since = (S.enabled_since) || {};
    const sinceMap = {
      cigs: since.cigs || null,
      weed: since.weed || null,
      alcohol: since.alcohol || null
    };

    // En-tête
    const header =
      `<div class="cal-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;">
         <strong>${monthLabelFR(now)}</strong>
         <span style="color:#777;font-size:.9rem;">Semaine L→D · Heure locale</span>
       </div>`;

    // Jours de la semaine
    const weekNames = ["L", "M", "M", "J", "V", "S", "D"];
    const headRow =
      `<div class="cal-row cal-head" style="display:grid;grid-template-columns:repeat(7,1fr);gap:.25rem;margin-bottom:.25rem;">
        ${weekNames.map(n => `<div class="cal-cell cal-head-cell" style="text-align:center;color:#666;font-weight:600;">${n}</div>`).join("")}
       </div>`;

    // Cases jours
    const cells = [];
    // vides avant le 1
    for (let i = 0; i < leading; i++) {
      cells.push(`<div class="cal-cell cal-empty" style="min-height:54px;border:1px dashed #eee;border-radius:6px;"></div>`);
    }

    // jours 1..totalDays
    for (let d = 1; d <= totalDays; d++) {
      const cur = new Date(now.getFullYear(), now.getMonth(), d);
      const iso = isoFromDate(cur);
      const isToday = iso === todayLocalISO();

      // marquages
      const marks = [];
      if (stopISO && iso === stopISO) marks.push("stop");
      if (sinceMap.cigs && iso === sinceMap.cigs) marks.push("since-cigs");
      if (sinceMap.weed && iso === sinceMap.weed) marks.push("since-weed");
      if (sinceMap.alcohol && iso === sinceMap.alcohol) marks.push("since-alcohol");

      const classes = ["cal-cell", "cal-day"];
      if (isToday) classes.push("is-today");
      marks.forEach(m => classes.push(`mark-${m}`));

      // badge des marquages
      const badges = marks.map(m => {
        const label = m === "stop" ? "Arrêt"
          : (m === "since-cigs" ? "Déb. clopes"
          : (m === "since-weed" ? "Déb. joints"
          : (m === "since-alcohol" ? "Déb. alcool" : m)));
        return `<span class="cal-badge cal-badge-${m}" style="display:inline-block;background:#1976d2;color:#fff;border-radius:10px;padding:0 .35rem;font-size:.7rem;margin-left:.35rem;">${label}</span>`;
      }).join("");

      cells.push(
        `<div class="${classes.join(" ")}"
              data-action="open-day"
              data-iso="${iso}"
              style="min-height:72px;border:1px solid #ddd;border-radius:6px;background:#fff;padding:.4rem;cursor:pointer;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <strong>${d}</strong>
              <div>${badges}</div>
            </div>
         </div>`
      );
    }

    // grille (7 colonnes)
    const grid =
      `<div class="cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:.25rem;">
        ${cells.join("")}
       </div>`;

    root.innerHTML = header + headRow + grid;
  }

  // ====== Fiche jour (simple) ======
  function openDayCard(S, iso) {
    // Agrège S.today ou S.history pour ce jour
    let data = { cigs:0, weed:0, alcohol:0, beer:0, hard:0, liqueur:0 };
    const todayISO = todayLocalISO();
    if (iso === todayISO) {
      data = Object.assign(data, S.today?.counters || {});
    } else if (S.history && S.history[iso]) {
      const h = S.history[iso];
      data = {
        cigs: +h.cigs || 0,
        weed: +h.weed || 0,
        alcohol: +h.alcohol || 0,
        beer: +h.beer || 0,
        hard: +h.hard || 0,
        liqueur: +h.liqueur || 0
      };
    }

    const info = [
      `Date : ${iso}`,
      `Clopes : ${data.cigs}`,
      `Joints : ${data.weed}`,
      `Alcool (global) : ${data.alcohol}`,
      `— Bière : ${data.beer}, Fort : ${data.hard}, Liqueur : ${data.liqueur}`,
      (S.habits?.stopDate === iso ? "🟢 Jour d’arrêt" : "")
    ].filter(Boolean).join("\n");

    alert(info);
  }

  // ====== Event delegation (écouteur unique) ======
  function bindOnce(S) {
    // On retire tout listener précédent en réassignant root.onclick
    root.onclick = (ev) => {
      const target = ev.target.closest("[data-action]");
      if (!target) return;
      const action = target.getAttribute("data-action");
      if (action === "open-day") {
        const iso = target.getAttribute("data-iso");
        openDayCard(S, iso);
      }
    };
  }

  // ====== API publique ======
  const CalendarAPI = {
    init(ctx) {
      const S = ctx?.S || window.S;
      if (!S) return;
      renderCalendar(S);
      bindOnce(S);
    },
    refresh(ctx) {
      const S = ctx?.S || window.S;
      if (!S) return;
      renderCalendar(S); // réaffiche si stopDate / since changent
      // bindOnce pas nécessaire à chaque refresh : event delegation déjà posée
    }
  };

  // Expose
  window.StopAddictCalendar = CalendarAPI;

  // Auto-init si la page Calendrier est affichée en premier (rare)
  document.addEventListener("DOMContentLoaded", () => {
    if (root && window.S) {
      CalendarAPI.init({ S: window.S });
    }
  });
})();
