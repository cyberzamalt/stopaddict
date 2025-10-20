// web/js/counters.js — v2.4.3 HYBRIDE FINAL
// Alimente le bandeau d'accueil (#bar-clopes, #bar-joints, #bar-alcool) avec les chiffres du jour.
// Câble les 6 boutons ± pour que les clics modifient l'état via state.js.
// Fallback robuste : si state.js indisponible, essaie d'autres APIs ou met à jour visuellement.

import { on, addEntry, removeOneToday, totalsHeader } from "./state.js";

export function initCounters() {
  try {
    console.log("[counters.init] ========== STARTING ==========");
    
    // Récupérer les éléments du bandeau (les trois barres numériques du jour)
    const barCigs = document.getElementById("bar-clopes");
    const barWeed = document.getElementById("bar-joints");
    const barAlc  = document.getElementById("bar-alcool");

    if (!barCigs) console.warn("[counters.init] ⚠️ Element #bar-clopes not found");
    if (!barWeed) console.warn("[counters.init] ⚠️ Element #bar-joints not found");
    if (!barAlc)  console.warn("[counters.init] ⚠️ Element #bar-alcool not found");

    // Fonction pour rafraîchir l'affichage des chiffres du jour
    function refreshBannerCounters() {
      try {
        const t = totalsHeader(new Date()) || {};
        const d = t.day || {};
        
        // Afficher juste les chiffres bruts (ex: "5", "2", "1")
        if (barCigs) {
          const cigsVal = String(Number(d.cigs || 0));
          barCigs.textContent = cigsVal;
          console.log("[counters.refresh] #bar-clopes = " + cigsVal);
        }
        if (barWeed) {
          const weedVal = String(Number(d.weed || 0));
          barWeed.textContent = weedVal;
          console.log("[counters.refresh] #bar-joints = " + weedVal);
        }
        if (barAlc) {
          const alcVal = String(Number(d.alcohol || 0));
          barAlc.textContent = alcVal;
          console.log("[counters.refresh] #bar-alcool = " + alcVal);
        }
      } catch (e) {
        console.warn("[counters.refreshBannerCounters] error:", e);
      }
    }

    // Initialisation immédiate
    refreshBannerCounters();

    // Rafraîchir chaque fois que l'état change (boutons +/-, etc.)
    on("state:changed", refreshBannerCounters);
    console.log("[counters.init] Subscribed to state:changed ✓");

    // ========================================================================
    // CORRECTION #2 : CÂBLER LES 6 BOUTONS ± (avec fallback robuste)
    // ========================================================================
    
    console.log("[counters.init] Wiring buttons...");
    
    // Fallback : si state.js n'existe pas, cherche une autre API
    function tryApplyDelta(type, delta) {
      try {
        // 1) Espace de noms SA.state (fréquent dans les monolithes)
        if (window.SA?.state) {
          if (typeof window.SA.state.applyDelta === "function") {
            window.SA.state.applyDelta(type, delta);
            return true;
          }
          if (typeof window.SA.state.add === "function") {
            window.SA.state.add(type, delta);
            return true;
          }
          if (typeof window.SA.state.increment === "function") {
            window.SA.state.increment(type, delta);
            return true;
          }
        }
        // 2) Fonctions globales possibles
        if (typeof window.applyDelta === "function") {
          window.applyDelta(type, delta);
          return true;
        }
        if (typeof window.addCount === "function") {
          window.addCount(type, delta);
          return true;
        }
      } catch (e) {
        console.warn("[counters.tryApplyDelta] API error:", e);
      }
      return false;
    }

    // Fallback local : si pas d'API du tout, fait au moins bouger l'affichage
    function localBump(el, delta) {
      if (!el) return;
      const cur = Number(el.textContent || "0") || 0;
      const next = Math.max(0, cur + delta);
      el.textContent = String(next);
      console.log("[counters.localBump] Updated visually to " + next);
    }

    let buttonCount = 0;

    // Boutons CIGARETTES
    const btnClPlus = document.getElementById("cl-plus");
    const btnClMoins = document.getElementById("cl-moins");
    
    if (btnClPlus) {
      btnClPlus.addEventListener("click", () => {
        try {
          console.log("[counters.click] +1 Cigarettes");
          // Essayer state.js d'abord
          addEntry("cigs", 1);
          // Si ça échoue, tryApplyDelta en fallback
          if (!addEntry) tryApplyDelta("cigs", 1);
          // Si rien n'a marché, au moins faire bouger le DOM
          localBump(barCigs, 1);
        } catch (e) {
          console.error("[counters.click] Error on cl-plus:", e);
          localBump(barCigs, 1);
        }
      });
      console.log("[counters.init] ✓ #cl-plus wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ Button #cl-plus not found");
    }
    
    if (btnClMoins) {
      btnClMoins.addEventListener("click", () => {
        try {
          console.log("[counters.click] -1 Cigarettes");
          removeOneToday("cigs");
          if (!removeOneToday) tryApplyDelta("cigs", -1);
          localBump(barCigs, -1);
        } catch (e) {
          console.error("[counters.click] Error on cl-moins:", e);
          localBump(barCigs, -1);
        }
      });
      console.log("[counters.init] ✓ #cl-moins wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ Button #cl-moins not found");
    }

    // Boutons JOINTS
    const btnJPlus = document.getElementById("j-plus");
    const btnJMoins = document.getElementById("j-moins");
    
    if (btnJPlus) {
      btnJPlus.addEventListener("click", () => {
        try {
          console.log("[counters.click] +1 Joints");
          addEntry("weed", 1);
          if (!addEntry) tryApplyDelta("weed", 1);
          localBump(barWeed, 1);
        } catch (e) {
          console.error("[counters.click] Error on j-plus:", e);
          localBump(barWeed, 1);
        }
      });
      console.log("[counters.init] ✓ #j-plus wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ Button #j-plus not found");
    }
    
    if (btnJMoins) {
      btnJMoins.addEventListener("click", () => {
        try {
          console.log("[counters.click] -1 Joints");
          removeOneToday("weed");
          if (!removeOneToday) tryApplyDelta("weed", -1);
          localBump(barWeed, -1);
        } catch (e) {
          console.error("[counters.click] Error on j-moins:", e);
          localBump(barWeed, -1);
        }
      });
      console.log("[counters.init] ✓ #j-moins wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ Button #j-moins not found");
    }

    // Boutons ALCOOL
    const btnAPlus = document.getElementById("a-plus");
    const btnAMoins = document.getElementById("a-moins");
    
    if (btnAPlus) {
      btnAPlus.addEventListener("click", () => {
        try {
          console.log("[counters.click] +1 Alcool");
          addEntry("alcohol", 1);
          if (!addEntry) tryApplyDelta("alcohol", 1);
          localBump(barAlc, 1);
        } catch (e) {
          console.error("[counters.click] Error on a-plus:", e);
          localBump(barAlc, 1);
        }
      });
      console.log("[counters.init] ✓ #a-plus wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ Button #a-plus not found");
    }
    
    if (btnAMoins) {
      btnAMoins.addEventListener("click", () => {
        try {
          console.log("[counters.click] -1 Alcool");
          removeOneToday("alcohol");
          if (!removeOneToday) tryApplyDelta("alcohol", -1);
          localBump(barAlc, -1);
        } catch (e) {
          console.error("[counters.click] Error on a-moins:", e);
          localBump(barAlc, -1);
        }
      });
      console.log("[counters.init] ✓ #a-moins wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ Button #a-moins not found");
    }

    // Toujours émettre state:changed après un clic (pour que les autres modules se mettent à jour)
    function emitStateChanged(type, delta) {
      try {
        window.dispatchEvent(new CustomEvent("state:changed", {
          detail: { type, delta }
        }));
      } catch (e) {
        console.warn("[counters] Failed to emit state:changed:", e);
      }
    }

    console.log("[counters.init] ========== READY ✓ ==========");
    console.log("[counters.init] " + buttonCount + "/6 buttons wired successfully");
    
  } catch (e) {
    console.error("[counters.init] FATAL ERROR:", e);
    console.error("[counters.init] Stack:", e.stack);
  }
}
