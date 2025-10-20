// web/js/counters.js — v2.4.3 CORRIGÉ
// Alimente le bandeau d'accueil (#bar-clopes, #bar-joints, #bar-alcool) avec les chiffres du jour.
// Pas de petits compteurs val-*, un seul flux de vérité visuelle.

import { on, totalsHeader } from "./state.js";

export function initCounters() {
  // Récupérer les éléments du bandeau (les trois barres numériques du jour)
  const barCigs = document.getElementById("bar-clopes");
  const barWeed = document.getElementById("bar-joints");
  const barAlc  = document.getElementById("bar-alcool");

  // Fonction pour rafraîchir l'affichage des chiffres du jour
  function refreshBannerCounters() {
    try {
      const t = totalsHeader(new Date()) || {};
      const d = t.day || {};
      
      // Afficher juste les chiffres bruts (ex: "5", "2", "1")
      if (barCigs) barCigs.textContent = String(Number(d.cigs || 0));
      if (barWeed) barWeed.textContent = String(Number(d.weed || 0));
      if (barAlc)  barAlc.textContent  = String(Number(d.alcohol || 0));
    } catch (e) {
      console.warn("[counters.refreshBannerCounters] error:", e);
    }
  }

  // Initialisation immédiate
  refreshBannerCounters();

  // Rafraîchir chaque fois que l'état change (boutons +/-, etc.)
  on("state:changed", refreshBannerCounters);

  console.log("[counters.init] Ready");
}
