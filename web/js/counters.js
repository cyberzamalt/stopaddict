// ============================================================
// counters.js — v2.4.4 PHASE 2
// Alimente le bandeau d'accueil (#bar-clopes, #bar-joints, #bar-alcool)
// Câble les 6 boutons ± avec logique de fallback robuste
// ============================================================

import { on, addEntry, removeOneToday, totalsHeader, emit } from "./state.js";

console.log("[counters.js] Module loaded");

export function initCounters() {
  try {
    console.log("[counters.init] ========== STARTING ==========");
    
    // Récupérer les éléments du bandeau
    const barCigs = document.getElementById("bar-clopes");
    const barWeed = document.getElementById("bar-joints");
    const barAlc  = document.getElementById("bar-alcool");

    if (!barCigs) console.warn("[counters.init] ⚠️ #bar-clopes not found");
    if (!barWeed) console.warn("[counters.init] ⚠️ #bar-joints not found");
    if (!barAlc)  console.warn("[counters.init] ⚠️ #bar-alcool not found");

    // Rafraîchir l'affichage des chiffres du jour
    function refreshBannerCounters() {
      try {
        const t = totalsHeader(new Date()) || {};
        const d = t.day || {};
        
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

    // Init immédiate + écouter state:changed (émis par state.js)
    refreshBannerCounters();
    on("state:changed", refreshBannerCounters);
    console.log("[counters.init] Subscribed to state:changed ✓");

    // ========================================================================
    // CÂBLER LES 6 BOUTONS ± (FALLBACK ROBUSTE)
    // ========================================================================
    
    function tryApplyDelta(type, delta) {
      try {
        // Espace SA.state (fallback)
        if (window.SA?.state) {
          if (typeof window.SA.state.applyDelta === "function") {
            window.SA.state.applyDelta(type, delta);
            return true;
          }
          if (typeof window.SA.state.add === "function") {
            window.SA.state.add(type, delta);
            return true;
          }
        }
        // Fonctions globales
        if (typeof window.applyDelta === "function") {
          window.applyDelta(type, delta);
          return true;
        }
      } catch (e) {
        console.warn("[counters.tryApplyDelta] error:", e);
      }
      return false;
    }

    function localBump(el, delta) {
      if (!el) return;
      const cur = Number(el.textContent || "0") || 0;
      const next = Math.max(0, cur + delta);
      el.textContent = String(next);
      console.log("[counters.localBump] Updated visually: " + next);
    }

    let buttonCount = 0;

    // ---- CIGARETTES ----
    const btnClPlus = document.getElementById("cl-plus");
    const btnClMoins = document.getElementById("cl-moins");
    
    if (btnClPlus) {
      btnClPlus.addEventListener("click", () => {
        try {
          console.log("[counters.click] +1 Cigarettes");
          const ok = addEntry("cigs", 1);
          if (!ok) {
            const fallbackOk = tryApplyDelta("cigs", 1);
            if (!fallbackOk) localBump(barCigs, 1);
          }
        } catch (e) {
          console.error("[counters] Error cl-plus:", e);
          localBump(barCigs, 1);
        }
      });
      console.log("[counters.init] ✓ #cl-plus wired");
      buttonCount++;
    } else {
      console.warn("[counters.init] ⚠️ #cl-plus not found");
    }
    
    if (btnClMoins) {
      btnClMoins.addEventListener("click", () => {
        try {
          console.log("[counters.click] -1 Cigarettes");
          const ok = removeOneToday("cigs");
          if (!ok) {
            const fallbackOk = tryApplyDelta("cigs", -1);
            if (!fallbackOk) localBump(barCigs, -1);
          }
        } catch (e) {
          console.error("[counters] Error cl-moins:", e);
          localBump(barCigs, -1);
        }
      });
      console.log("[counters.init] ✓ #cl-moins wired");
      buttonCount++;
    }

    // ---- JOINTS ----
    const btnJPlus = document.getElementById("j-plus");
    const btnJMoins = document.getElementById("j-moins");
    
    if (btnJPlus) {
      btnJPlus.addEventListener("click", () => {
        try {
          console.log("[counters.click] +1 Joints");
          const ok = addEntry("weed", 1);
          if (!ok) {
            const fallbackOk = tryApplyDelta("weed", 1);
            if (!fallbackOk) localBump(barWeed, 1);
          }
        } catch (e) {
          console.error("[counters] Error j-plus:", e);
          localBump(barWeed, 1);
        }
      });
      console.log("[counters.init] ✓ #j-plus wired");
      buttonCount++;
    }
    
    if (btnJMoins) {
      btnJMoins.addEventListener("click", () => {
        try {
          console.log("[counters.click] -1 Joints");
          const ok = removeOneToday("weed");
          if (!ok) {
            const fallbackOk = tryApplyDelta("weed", -1);
            if (!fallbackOk) localBump(barWeed, -1);
          }
        } catch (e) {
          console.error("[counters] Error j-moins:", e);
          localBump(barWeed, -1);
        }
      });
      console.log("[counters.init] ✓ #j-moins wired");
      buttonCount++;
    }

    // ---- ALCOOL ----
    const btnAPlus = document.getElementById("a-plus");
    const btnAMoins = document.getElementById("a-moins");
    
    if (btnAPlus) {
      btnAPlus.addEventListener("click", () => {
        try {
          console.log("[counters.click] +1 Alcool");
          const ok = addEntry("alcohol", 1);
          if (!ok) {
            const fallbackOk = tryApplyDelta("alcohol", 1);
            if (!fallbackOk) localBump(barAlc, 1);
          }
        } catch (e) {
          console.error("[counters] Error a-plus:", e);
          localBump(barAlc, 1);
        }
      });
      console.log("[counters.init] ✓ #a-plus wired");
      buttonCount++;
    }
    
    if (btnAMoins) {
      btnAMoins.addEventListener("click", () => {
        try {
          console.log("[counters.click] -1 Alcool");
          const ok = removeOneToday("alcohol");
          if (!ok) {
            const fallbackOk = tryApplyDelta("alcohol", -1);
            if (!fallbackOk) localBump(barAlc, -1);
          }
        } catch (e) {
          console.error("[counters] Error a-moins:", e);
          localBump(barAlc, -1);
        }
      });
      console.log("[counters.init] ✓ #a-moins wired");
      buttonCount++;
    }

    console.log("[counters.init] ========== READY ✓ ==========");
    console.log("[counters.init] " + buttonCount + "/6 buttons wired");
    
  } catch (e) {
    console.error("[counters.init] FATAL:", e);
  }
}
