// web/js/app.js
// -----------------------------------------------------------------------------
// Orchestrateur principal de l'application StopAddict
// - Initialise tous les modules
// - Gère la navigation entre écrans
// - Point d'entrée de l'application
// -----------------------------------------------------------------------------

import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initLimits }       from "./limits.js";
import { initCharts }       from "./charts.js";
import { initCalendar }     from "./calendar.js";
import { initEconomy }      from "./economy.js";
import { initI18n }         from "./i18n.js"; // i18n (fr/en) si présent

document.addEventListener("DOMContentLoaded", () => {
  console.log("[App] ========================================");
  console.log("[App] ========== DÉMARRAGE STOPADDICT ==========");
  console.log("[App] Version: 2.4.4");
  console.log("[App] ========================================");

  // ===================== INIT DE BASE =====================
  console.log("[App] ----- Initialisation modules -----");
  
  try {
    console.log("[App] Init i18n...");
    initI18n?.();
    console.log("[App] ✓ i18n initialisé");
  } catch (e) {
    console.warn("[App] ⚠ i18n init skipped:", e);
  }

  try {
    console.log("[App] Init counters...");
    initCounters();
    console.log("[App] ✓ Counters initialisés");
  } catch (e) {
    console.error("[App] ✗ Erreur init counters:", e);
  }

  try {
    console.log("[App] Init settings...");
    initSettings();
    console.log("[App] ✓ Settings initialisés");
  } catch (e) {
    console.error("[App] ✗ Erreur init settings:", e);
  }

  try {
    console.log("[App] Init import/export...");
    initImportExport();
    console.log("[App] ✓ Import/Export initialisés");
  } catch (e) {
    console.error("[App] ✗ Erreur init import/export:", e);
  }

  try {
    console.log("[App] Init stats header...");
    initStatsHeader();
    console.log("[App] ✓ Stats header initialisés");
  } catch (e) {
    console.error("[App] ✗ Erreur init stats header:", e);
  }

  try {
    console.log("[App] Init limits...");
    initLimits();
    console.log("[App] ✓ Limits initialisés");
  } catch (e) {
    console.error("[App] ✗ Erreur init limits:", e);
  }

  try {
    console.log("[App] Init calendar...");
    initCalendar();
    console.log("[App] ✓ Calendar initialisé");
  } catch (e) {
    console.error("[App] ✗ Erreur init calendar:", e);
  }

  try {
    console.log("[App] Init economy...");
    initEconomy();
    console.log("[App] ✓ Economy initialisé");
  } catch (e) {
    console.error("[App] ✗ Erreur init economy:", e);
  }

  console.log("[App] ----- Modules initialisés -----");

  // ===================== NAVIGATION / ROUTER =====================
  console.log("[App] ----- Configuration navigation -----");

  const SCREENS = {
    accueil:    "ecran-principal",
    stats:      "ecran-stats",
    cal:        "ecran-calendrier",
    habitudes:  "ecran-habitudes",
  };

  const NAV_BTNS = {
    "ecran-principal":  document.getElementById("nav-principal"),
    "ecran-stats":      document.getElementById("nav-stats"),
    "ecran-calendrier": document.getElementById("nav-calendrier"),
    "ecran-habitudes":  document.getElementById("nav-habitudes"),
    // "nav-params" est géré par settings.js (ouverture de la page/réglages)
  };

  console.log("[App] Écrans disponibles:", Object.keys(SCREENS));
  console.log("[App] Boutons nav détectés:", Object.keys(NAV_BTNS).filter(k => NAV_BTNS[k]));

  function setActiveNav(screenId) {
    try {
      console.log("[App] setActiveNav:", screenId);
      Object.entries(NAV_BTNS).forEach(([sid, btn]) => {
        if (!btn) return;
        btn.classList.toggle("actif", sid === screenId);
      });
    } catch (err) {
      console.error("[App] Erreur setActiveNav:", err);
    }
  }

  function showScreen(screenId) {
    try {
      console.log("[App] showScreen:", screenId);
      
      // Masquer toutes les .ecran et n'afficher que celle demandée
      document.querySelectorAll(".ecran").forEach(el => el.classList.remove("show"));
      
      const target = document.getElementById(screenId);
      if (target) {
        target.classList.add("show");
        console.log("[App] Écran affiché:", screenId);
      } else {
        console.warn("[App] Écran non trouvé:", screenId);
      }
      
      setActiveNav(screenId);

      // Si on arrive sur STATS, on s'assure d'initialiser les charts au besoin
      if (screenId === "ecran-stats") {
        console.log("[App] Navigation vers Stats, init charts...");
        ensureCharts();
      }
    } catch (err) {
      console.error("[App] Erreur showScreen:", err);
    }
  }

  // Liens nav bas
  try {
    console.log("[App] Configuration événements navigation...");
    
    if (NAV_BTNS["ecran-principal"]) {
      NAV_BTNS["ecran-principal"].addEventListener("click", () => {
        console.log("[App] Clic nav-principal");
        navigateTo("accueil");
      });
    }
    
    if (NAV_BTNS["ecran-stats"]) {
      NAV_BTNS["ecran-stats"].addEventListener("click", () => {
        console.log("[App] Clic nav-stats");
        navigateTo("stats");
      });
    }
    
    if (NAV_BTNS["ecran-calendrier"]) {
      NAV_BTNS["ecran-calendrier"].addEventListener("click", () => {
        console.log("[App] Clic nav-calendrier");
        navigateTo("cal");
      });
    }
    
    if (NAV_BTNS["ecran-habitudes"]) {
      NAV_BTNS["ecran-habitudes"].addEventListener("click", () => {
        console.log("[App] Clic nav-habitudes");
        navigateTo("habitudes");
      });
    }

    const navParams = document.getElementById("nav-params");
    if (navParams) {
      navParams.addEventListener("click", () => {
        console.log("[App] Clic nav-params, ouverture réglages");
        // Laisse settings.js gérer l'ouverture (page/modale).
        window.dispatchEvent(new CustomEvent("sa:open:settings"));
      });
    }

    console.log("[App] Événements navigation configurés");
  } catch (err) {
    console.error("[App] Erreur configuration navigation:", err);
  }

  function navigateTo(alias) {
    try {
      console.log("[App] navigateTo:", alias);
      const id = SCREENS[alias] || SCREENS.accueil;
      
      // Mettre à jour le hash pour deep-linking (#stats, #cal…)
      const nextHash = `#${alias}`;
      if (location.hash !== nextHash) {
        console.log("[App] Mise à jour hash:", nextHash);
        // Déclenchera hashchange -> showScreen
        location.hash = nextHash;
      } else {
        showScreen(id);
      }
    } catch (err) {
      console.error("[App] Erreur navigateTo:", err);
    }
  }

  function applyHashRoute() {
    try {
      const raw = (location.hash || "").replace(/^#/, "");
      console.log("[App] applyHashRoute - hash actuel:", raw || "(vide)");
      
      const alias = SCREENS[raw] ? raw : (Object.prototype.hasOwnProperty.call(SCREENS, raw) ? raw : null);
      
      if (alias && SCREENS[alias]) {
        console.log("[App] Route valide:", alias);
        showScreen(SCREENS[alias]);
      } else {
        // Valeurs acceptées: #accueil #stats #cal #habitudes
        // Par défaut: accueil
        console.log("[App] Route par défaut: accueil");
        showScreen(SCREENS.accueil);
        if (!location.hash) {
          history.replaceState(null, "", "#accueil");
        }
      }
    } catch (err) {
      console.error("[App] Erreur applyHashRoute:", err);
    }
  }

  window.addEventListener("hashchange", () => {
    console.log("[App] Événement hashchange détecté");
    applyHashRoute();
  });
  
  console.log("[App] Application du routing initial...");
  applyHashRoute();

  // ===================== LAZY INIT DES CHARTS =====================
  console.log("[App] ----- Configuration lazy loading charts -----");
  
  const statsScreen = document.getElementById("ecran-stats");
  let chartsInitialized = false;

  function ensureCharts() {
    try {
      if (!chartsInitialized) {
        console.log("[App] Premier chargement des charts...");
        chartsInitialized = true;
        initCharts();
        console.log("[App] Charts initialisés");
      } else {
        console.log("[App] Charts déjà initialisés");
      }
    } catch (e) {
      console.error("[App] Erreur init charts:", e);
    }
  }

  if (statsScreen && "IntersectionObserver" in window) {
    console.log("[App] IntersectionObserver disponible, utilisation pour lazy load");
    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          console.log("[App] Écran stats visible, init charts");
          ensureCharts();
          io.disconnect();
          break;
        }
      }
    }, { root: null, threshold: 0.1 });
    io.observe(statsScreen);
    console.log("[App] Observer configuré");
  } else {
    // Fallback (si pas d'IO ou pas d'élément) : init direct
    console.log("[App] Pas d'IntersectionObserver, init charts direct");
    ensureCharts();
  }

  // ===================== MODALE AVERTISSEMENT 18+ =====================
  console.log("[App] ----- Configuration modale avertissement -----");

  function warnAccepted() {
    try {
      const v = JSON.parse(localStorage.getItem("app_warn_v23") || "null");
      return !!(v && v.accepted === true);
    } catch {
      return false;
    }
  }

  let warnCameFromModal = false;

  try {
    const openRessourcesBtn = document.getElementById("open-ressources-from-warn");
    if (openRessourcesBtn) {
      openRessourcesBtn.addEventListener("click", () => {
        console.log("[App] Clic ressources depuis modale warn");
        warnCameFromModal = true;
        // L'ouverture de la page "Ressources" est gérée ailleurs (router/modale)
        window.dispatchEvent(new CustomEvent("sa:open:resources"));
      });
      console.log("[App] Bouton ressources configuré");
    }
  } catch (err) {
    console.error("[App] Erreur config bouton ressources:", err);
  }

  try {
    const pageCloseBtn = document.getElementById("btn-page-close");
    if (pageCloseBtn) {
      pageCloseBtn.addEventListener("click", () => {
        console.log("[App] Clic fermeture page modale");
        try {
          const page = document.getElementById("modal-page");
          if (page) {
            page.classList.remove("show");
            page.setAttribute("aria-hidden", "true");
            console.log("[App] Page modale fermée");
          }
          
          const mustReopen = !warnAccepted() || warnCameFromModal;
          warnCameFromModal = false;
          
          if (mustReopen) {
            console.log("[App] Réouverture modale avertissement");
            const warn = document.getElementById("modal-warn");
            if (warn) {
              warn.classList.add("show");
              warn.setAttribute("aria-hidden", "false");
            }
          }
        } catch (err) {
          console.error("[App] Erreur fermeture page:", err);
        }
      });
      console.log("[App] Bouton fermeture page configuré");
    }
  } catch (err) {
    console.error("[App] Erreur config bouton fermeture:", err);
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      console.log("[App] Touche Échap détectée");
      try {
        const page = document.getElementById("modal-page");
        const wasOpen = !!page && page.classList.contains("show");
        
        if (wasOpen) {
          page.classList.remove("show");
          page.setAttribute("aria-hidden", "true");
          console.log("[App] Page fermée via Échap");
        }
        
        if (wasOpen && (!warnAccepted() || warnCameFromModal)) {
          warnCameFromModal = false;
          const warn = document.getElementById("modal-warn");
          if (warn) {
            warn.classList.add("show");
            warn.setAttribute("aria-hidden", "false");
            console.log("[App] Modale warn réouverte");
          }
        }
      } catch (err) {
        console.error("[App] Erreur gestion Échap:", err);
      }
    }
  });

  // ===================== PETIT PLUS : CONSOLE DEBUG (5 taps) =====================
  console.log("[App] ----- Configuration debug toggle -----");
  
  (function setupDebugToggle() {
    try {
      const dateEl  = document.getElementById("date-actuelle");
      const dbg     = document.getElementById("debug-console");
      
      if (!dateEl || !dbg) {
        console.warn("[App] Éléments debug non trouvés");
        return;
      }

      let taps = 0, tmr = null;
      dateEl.addEventListener("click", () => {
        taps++;
        console.log("[App] Tap debug:", taps);
        clearTimeout(tmr);
        tmr = setTimeout(() => { taps = 0; }, 600);
        
        if (taps >= 5) {
          console.log("[App] 5 taps détectés, toggle console debug");
          taps = 0;
          dbg.classList.toggle("show");
        }
      });
      
      console.log("[App] Debug toggle configuré");
    } catch (err) {
      console.error("[App] Erreur setupDebugToggle:", err);
    }
  })();

  // Expose un mini namespace (facultatif, utile pour diag)
  try {
    window.SA = window.SA || {};
    window.SA.app = {
      version: "2.4.4",
      ensureCharts,
      navigateTo,
    };
    console.log("[App] API window.SA.app exposée");
  } catch (err) {
    console.error("[App] Erreur exposition API:", err);
  }

  console.log("[App] ========================================");
  console.log("[App] ========== STOPADDICT PRÊT ==========");
  console.log("[App] ========================================");
});
