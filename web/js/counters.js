// web/js/counters.js — v2.4.3
// Aligne l'accueil sur le monolithe : met à jour aussi les petits compteurs val-*.

import { on, totalsHeader } from "./state.js";

export function initCounters(){
  const valCigs = document.getElementById("val-clopes");
  const valWeed = document.getElementById("val-joints");
  const valAlc  = document.getElementById("val-alcool");

  function refreshSmallCounters(){
    try {
      const t = totalsHeader(new Date()) || {};
      const d = t.day || {};
      if (valCigs) valCigs.textContent = String(Number(d.cigs||0));
      if (valWeed) valWeed.textContent = String(Number(d.weed||0));
      if (valAlc)  valAlc.textContent  = String(Number(d.alcohol||0));
    } catch(e) {
      console.warn("[counters.refreshSmallCounters]", e);
    }
  }

  // initial + à chaque changement d’état (les boutons +/- déclenchent déjà ce changement)
  refreshSmallCounters();
  on("state:changed", refreshSmallCounters);

  console.log("[counters.init] Ready");
}
