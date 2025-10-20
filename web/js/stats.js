// web/js/stats.js
// COMPLET v2.4.0 - Gestion de la bannière Stats
// Rôle: Met à jour le header Stats (titre + totaux) selon la vue active

import { on, totalsHeader, getSettings } from "./state.js";

// ============================================================
// INITIALISATION DE LA BANNIÈRE STATS
// ============================================================
export function initStatsHeader() {
  console.log("[stats.init] Starting...");
  
  try {
    // Éléments DOM
    const elTitle = document.querySelector("#stats-titre");
    const elCigs = document.querySelector("#stats-clopes");
    const elWeed = document.querySelector("#stats-joints");
    const elAlc = document.querySelector("#stats-alcool");
    const alcLine = document.querySelector("#stats-alcool-line");

    // Vérifications d'existence
    if (!elTitle) {
      console.warn("[stats.init] #stats-titre not found");
    }
    if (!elCigs) {
      console.warn("[stats.init] #stats-clopes not found");
    }
    if (!elWeed) {
      console.warn("[stats.init] #stats-joints not found");
    }
    if (!elAlc) {
      console.warn("[stats.init] #stats-alcool not found");
    }

    // ========================================
    // FONCTION: Afficher/masquer la ligne alcool
    // ========================================
    function toggleAlcLine() {
      try {
        if (!alcLine) return;
        
        const settings = getSettings();
        const modules = settings?.enabled || {};
        
        if (modules.alcohol === false) {
          alcLine.style.display = "none";
          console.log("[stats.toggleAlcLine] Alcohol line hidden");
        } else {
          alcLine.style.display = "";
          console.log("[stats.toggleAlcLine] Alcohol line visible");
        }
      } catch (e) {
        console.error("[stats.toggleAlcLine] error:", e);
      }
    }

    // ========================================
    // FONCTION: Rafraîchir avec les totaux du jour
    // ========================================
    function refreshForToday() {
      try {
        console.log("[stats.refreshForToday] Updating...");
        
        const totals = totalsHeader(new Date());
        if (!totals) {
          console.warn("[stats.refreshForToday] totalsHeader returned null");
          return;
        }

        const day = totals.day || {};
        
        // Mettre à jour les valeurs
        if (elCigs) {
          elCigs.textContent = String(Number(day.cigs || 0));
        }
        if (elWeed) {
          elWeed.textContent = String(Number(day.weed || 0));
        }
        if (elAlc) {
          elAlc.textContent = String(Number(day.alcohol || 0));
        }
        if (elTitle) {
          elTitle.textContent = "Aujourd'hui";
        }

        toggleAlcLine();
        
        console.log("[stats.refreshForToday] Updated:", day);
      } catch (e) {
        console.error("[stats.refreshForToday] error:", e);
      }
    }

    // ========================================
    // FONCTION: Rafraîchir depuis les charts (événement)
    // ========================================
    function refreshFromCharts(event) {
      try {
        console.log("[stats.refreshFromCharts] Event received:", event.detail);
        
        const detail = event.detail || {};
        const range = detail.range;
        const totals = detail.totals || {};

        // Map des labels selon la période
        const labels = {
          day: "Aujourd'hui",
          week: "Semaine",
          month: "Mois",
          year: "Année"
        };

        const label = labels[range] || "—";

        // Mettre à jour le titre
        if (elTitle) {
          elTitle.textContent = label;
        }

        // Mettre à jour les totaux
        if (elCigs) {
          elCigs.textContent = String(Number(totals.cigs || 0));
        }
        if (elWeed) {
          elWeed.textContent = String(Number(totals.weed || 0));
        }
        if (elAlc) {
          elAlc.textContent = String(Number(totals.alcohol || 0));
        }

        toggleAlcLine();
        
        console.log("[stats.refreshFromCharts] Updated for range:", range, totals);
      } catch (e) {
        console.error("[stats.refreshFromCharts] error:", e);
      }
    }

    // ========================================
    // INIT IMMÉDIATE
    // ========================================
    refreshForToday();
    console.log("[stats.init] Initial refresh done");

    // ========================================
    // ABONNEMENTS AUX ÉVÉNEMENTS
    // ========================================
    
    // 1. Changement dans state.js (nouveau compteur ajouté, etc.)
    try {
      on("state:changed", () => {
        console.log("[stats] state:changed event received");
        refreshForToday();
      });
      console.log("[stats.init] Subscribed to state:changed");
    } catch (e) {
      console.error("[stats.init] state:changed subscription error:", e);
    }

    // 2. Changement de vue dans les charts (Jour/Semaine/Mois)
    try {
      on("charts:totals", (event) => {
        console.log("[stats] charts:totals event received");
        refreshFromCharts(event);
      });
      console.log("[stats.init] Subscribed to charts:totals");
    } catch (e) {
      console.error("[stats.init] charts:totals subscription error:", e);
    }

    // 3. Changement de settings (toggle modules)
    try {
      window.addEventListener("sa:settings:changed", () => {
        console.log("[stats] sa:settings:changed event received");
        toggleAlcLine();
      });
      console.log("[stats.init] Subscribed to sa:settings:changed");
    } catch (e) {
      console.error("[stats.init] sa:settings:changed subscription error:", e);
    }

    console.log("[stats.init] Done ✅");
    
  } catch (e) {
    console.error("[stats.init] CRITICAL ERROR:", e);
  }
}
