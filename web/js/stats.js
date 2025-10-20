// web/js/stats.js — v2.4.1
// Met à jour la bannière Stats (Aujourd’hui/Semaine/Mois) et réagit aux totaux.

import { on, totalsHeader, getSettings } from "./state.js";

export function initStatsHeader(){
  const $ = (sel)=>document.querySelector(sel);

  const elTitle = $("#stats-titre");
  const elCigs  = $("#stats-clopes");
  const elWeed  = $("#stats-joints");
  const elAlc   = $("#stats-alcool");
  const alcLine = $("#stats-alcool-line");

  function toggleAlcLine(){
    try{
      const mods = (getSettings()?.modules) || {};
      if (mods.alcohol === false) alcLine?.setAttribute("style","display:none");
      else alcLine?.removeAttribute("style");
    }catch(e){
      console.warn("[stats.toggleAlcLine]", e);
    }
  }

  function refreshForToday(){
    try{
      const t = totalsHeader(new Date()) || {};
      const day = t.day || {};
      if (elCigs) elCigs.textContent = String(Number(day.cigs||0));
      if (elWeed) elWeed.textContent = String(Number(day.weed||0));
      if (elAlc)  elAlc.textContent  = String(Number(day.alcohol||0));
      if (elTitle) elTitle.textContent = "Aujourd’hui";
      toggleAlcLine();
    }catch(e){
      console.warn("[stats.refreshForToday]", e);
    }
  }

  function refreshFromCharts(ev){
    try{
      const { range, totals } = ev.detail || {};
      const label = { day:"Aujourd’hui", week:"Semaine", month:"Mois", year:"Année" }[range] || "—";
      if (elTitle) elTitle.textContent = label;
      if (totals){
        if (elCigs) elCigs.textContent = String(Number(totals.cigs||0));
        if (elWeed) elWeed.textContent = String(Number(totals.weed||0));
        if (elAlc)  elAlc.textContent  = String(Number(totals.alcohol||0));
      }
      toggleAlcLine();
    }catch(e){
      console.warn("[stats.refreshFromCharts]", e);
    }
  }

  // Init + abonnements
  refreshForToday();
  on("state:changed", refreshForToday);
  on("charts:totals",  refreshFromCharts);

  console.log("[stats.init] Ready");
}
