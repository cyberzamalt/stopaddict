// ============================================================
// stats.js — v2.4.4 PHASE 2
// Bannière Stats (Aujourd'hui/Semaine/Mois/Année)
// ============================================================

import { on, totalsHeader, getSettings } from "./state.js";

console.log("[stats.js] Module loaded");

export function initStatsHeader() {
  try {
    console.log("[stats.init] Starting...");
    
    const $ = (sel) => document.querySelector(sel);
    const elTitle = $("#stats-titre");
    const elCigs  = $("#stats-clopes");
    const elWeed  = $("#stats-joints");
    const elAlc   = $("#stats-alcool");
    const alcLine = $("#stats-alcool-line");

    if (!elTitle) console.warn("[stats] ⚠️ #stats-titre not found");
    if (!elCigs)  console.warn("[stats] ⚠️ #stats-clopes not found");
    if (!elWeed)  console.warn("[stats] ⚠️ #stats-joints not found");
    if (!elAlc)   console.warn("[stats] ⚠️ #stats-alcool not found");

    // Gérer la visibilité ligne alcool selon settings
    function toggleAlcLine() {
      try {
        const mods = (getSettings()?.modules) || (getSettings()?.enabled) || {};
        if (mods.alcohol === false) {
          if (alcLine) alcLine.setAttribute("style", "display:none");
        } else {
          if (alcLine) alcLine.removeAttribute("style");
        }
      } catch (e) {
        console.warn("[stats.toggleAlcLine] error:", e);
      }
    }

    // Rafraîchir pour "Aujourd'hui" (totalsHeader)
    function refreshForToday() {
      try {
        const t = totalsHeader(new Date()) || {};
        const day = t.day || {};
        
        if (elCigs)  elCigs.textContent  = String(Number(day.cigs || 0));
        if (elWeed)  elWeed.textContent  = String(Number(day.weed || 0));
        if (elAlc)   elAlc.textContent   = String(Number(day.alcohol || 0));
        if (elTitle) elTitle.textContent = "Aujourd'hui";
        
        toggleAlcLine();
        console.log("[stats.refreshForToday] Updated");
      } catch (e) {
        console.warn("[stats.refreshForToday] error:", e);
      }
    }

    // Rafraîchir depuis event charts:totals (émis par charts.js)
    function refreshFromCharts(ev) {
      try {
        const { range, totals } = ev.detail || {};
        const label = { 
          day: "Aujourd'hui", 
          week: "Semaine", 
          month: "Mois", 
          year: "Année" 
        }[range] || "—";
        
        if (elTitle) elTitle.textContent = label;
        
        if (totals) {
          if (elCigs) elCigs.textContent = String(Number(totals.cigs || 0));
          if (elWeed) elWeed.textContent = String(Number(totals.weed || 0));
          if (elAlc)  elAlc.textContent  = String(Number(totals.alcohol || 0));
        }
        
        toggleAlcLine();
        console.log("[stats.refreshFromCharts] Updated for " + range);
      } catch (e) {
        console.warn("[stats.refreshFromCharts] error:", e);
      }
    }

    // Init: afficher aujourd'hui
    refreshForToday();

    // Écouter state:changed (de counters.js ou autre mutation)
    on("state:changed", refreshForToday);

    // Écouter charts:totals (de charts.js quand range change)
    on("charts:totals", refreshFromCharts);

    // Relancer charts si on arrive sur écran Stats (lazy init)
    window.addEventListener("sa:screen:changed", (e) => {
      if (e?.detail?.screen === "ecran-stats") {
        console.log("[stats] Screen changed to Stats");
        // charts.js s'auto-initialise ou sera appelé depuis app.js
      }
    });

    console.log("[stats.init] ✓ Ready");
  } catch (e) {
    console.error("[stats.init] FATAL:", e);
  }
}
