// web/js/stats.js — v2.4.3
// Bannière Stats (Aujourd’hui/Semaine/Mois) ; init sûre qui ne bloque pas.

import { on, totalsHeader, getSettings } from "./state.js";

function safeRenderCharts() {
  try {
    if (typeof Chart === "undefined") return;           // pas de Chart.js → pas d’erreur
    if (typeof renderCharts === "function") renderCharts(); // si ta fonction globale existe
  } catch (e) {
    console.warn("[stats.safeRenderCharts]", e);
  }
}

export function initStatsHeader(){
  const $ = (sel)=>document.querySelector(sel);

  const elTitle = $("#stats-titre");
  const elCigs  = $("#stats-clopes");
  const elWeed  = $("#stats-joints");
  const elAlc   = $("#stats-alcool");
  const alcLine = $("#stats-alcool-line");

  function toggleAlcLine(){
    const mods = (getSettings()?.modules) || (getSettings()?.enabled) || {};
    if (mods.alcohol === false) alcLine?.setAttribute("style","display:none");
    else alcLine?.removeAttribute("style");
  }

  function refreshForToday(){
    const t = totalsHeader(new Date()) || {};
    const day = t.day || {};
    if (elCigs)  elCigs.textContent  = String(Number(day.cigs||0));
    if (elWeed)  elWeed.textContent  = String(Number(day.weed||0));
    if (elAlc)   elAlc.textContent   = String(Number(day.alcohol||0));
    if (elTitle) elTitle.textContent = "Aujourd’hui";
    toggleAlcLine();
  }

  function refreshFromCharts(ev){
    const { range, totals } = ev.detail || {};
    const label = { day:"Aujourd’hui", week:"Semaine", month:"Mois", year:"Année" }[range] || "—";
    if (elTitle) elTitle.textContent = label;
    if (totals){
      if (elCigs) elCigs.textContent = String(Number(totals.cigs||0));
      if (elWeed) elWeed.textContent = String(Number(totals.weed||0));
      if (elAlc)  elAlc.textContent  = String(Number(totals.alcohol||0));
    }
    toggleAlcLine();
  }

  // Init + relance éventuelle des charts quand on arrive sur Stats
  refreshForToday();
  setTimeout(safeRenderCharts, 50);

  on("state:changed", refreshForToday);
  on("charts:totals",  refreshFromCharts);

  window.addEventListener("sa:screen:changed", (e)=>{
    if (e?.detail?.screen === "stats") setTimeout(safeRenderCharts, 50);
  });

  console.log("[stats.init] Ready");
}
