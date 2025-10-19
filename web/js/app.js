// web/js/app.js
// COMPLET v2.4.0-clean - Boot principal + Routing + Modales + Navigation
// Rôle: Orchestration centralisée de l'app, gestion du routing et des modales globales

import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initLimits }       from "./limits.js";
import { initCharts }       from "./charts.js";
import { initCalendar }     from "./calendar.js";
import { initEconomy }      from "./economy.js";
import { initI18n }         from "./i18n.js";

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let chartsInitialized = false;

// ============================================================
// HELPER: Vérifier si 18+ accepté
// ============================================================
function warnAccepted() {
  try {
    const v = JSON.parse(localStorage.getItem("app_warn_v23") || "null");
    return !!(v && v.accepted === true);
  } catch {
    return false;
  }
}

// ============================================================
// ROUTING / NAVIGATION
// ============================================================
const ROUTES = {
  accueil:    "ecran-principal",
  stats:      "ecran-stats",
  cal:        "ecran-calendrier",
  habitudes:  "ecran-habitudes",
};

function showScreen(screenId) {
  try {
    // Masquer tous les écrans
    document.querySelectorAll(".ecran").forEach(el => {
      el.classList.remove("show");
    });

    // Afficher l'écran demandé
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add("show");
      console.log("[app.router] Showing screen:", screenId);
    } else {
      console.warn("[app.router] Screen not found:", screenId);
    }

    // Marquer les boutons nav comme actif/inactif
    updateNavButtons(screenId);

    // Si on affiche stats, on s'assure que charts est init
    if (screenId === "ecran-stats") {
      ensureCharts();
    }
  } catch (e) {
    console.error("[app.showScreen] error:", e);
  }
}

function updateNavButtons(screenId) {
  try {
    const map = {
      "ecran-principal":  "nav-principal",
      "ecran-stats":      "nav-stats",
      "ecran-calendrier": "nav-calendrier",
      "ecran-habitudes":  "nav-habitudes",
    };

    document.querySelectorAll(".nav button").forEach(btn => {
      btn.classList.remove("actif");
    });

    const activeBtn = document.getElementById(map[screenId]);
    if (activeBtn) {
      activeBtn.classList.add("actif");
    }
  } catch (e) {
    console.error("[app.updateNavButtons] error:", e);
  }
}

function navigateTo(routeAlias) {
  try {
    const screenId = ROUTES[routeAlias];
    if (!screenId) {
      console.warn("[app.navigateTo] Unknown route:", routeAlias);
      return;
    }

    // Mettre à jour le hash
    const newHash = `#${routeAlias}`;
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
      // hashchange event va déclencher applyRoute()
    } else {
      // Le hash est déjà bon, on affiche juste l'écran
      showScreen(screenId);
    }
  } catch (e) {
    console.error("[app.navigateTo] error:", e);
  }
}

function applyRoute() {
  try {
    const hash = (window.location.hash || "").replace(/^#/, "");
    const screenId = ROUTES[hash] || ROUTES.accueil;
    showScreen(screenId);
  } catch (e) {
    console.error("[app.applyRoute] error:", e);
  }
}

// ============================================================
// CHARTS LAZY INIT
// ============================================================
function ensureCharts() {
  if (chartsInitialized) {
    console.log("[app.charts] Already initialized, skipping");
    return;
  }

  chartsInitialized = true;
  try {
    console.log("[app.charts] Initializing charts...");
    initCharts();
  } catch (e) {
    console.error("[app.charts] init failed:", e);
  }
}

// ============================================================
// MODALE 18+ (minimal, juste vérif au boot)
// ============================================================
function checkAndShowWarnIfNeeded() {
  try {
    const accepted = warnAccepted();
    if (!accepted) {
      const modal = document.getElementById("modal-warn");
      if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        console.log("[app.warn] Showing 18+ warning modal");
      }
    } else {
      console.log("[app.warn] 18+ already accepted, skipping modal");
    }
  } catch (e) {
    console.error("[app.warn] error:", e);
  }
}

// ============================================================
// DEBUG CONSOLE (5 taps sur la date)
// ============================================================
function setupDebugToggle() {
  try {
    const dateEl = document.getElementById("date-actuelle");
    const dbgBox = document.getElementById("debug-console");
    if (!dateEl || !dbgBox) {
      console.warn("[app.setupDebugToggle] elements not found");
      return;
    }

    let taps = 0;
    let timer = null;

    dateEl.addEventListener("click", () => {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => {
        taps = 0;
      }, 600);

      if (taps >= 5) {
        taps = 0;
        dbgBox.classList.toggle("show");
        console.log("[app.debug] Debug console toggled");
      }
    });

    console.log("[app.setupDebugToggle] Wired");
  } catch (e) {
    console.error("[app.setupDebugToggle] error:", e);
  }
}

// ============================================================
// PAGE CLOSE (gère le retour à la modale 18+ si nécessaire)
// ============================================================
function handlePageClose() {
  try {
    const btnClose = document.getElementById("btn-page-close");
    if (!btnClose) {
      console.warn("[app.handlePageClose] btn-page-close not found");
      return;
    }

    btnClose.addEventListener("click", () => {
      const modal = document.getElementById("modal-page");
      if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        console.log("[app.handlePageClose] Modal page closed");
      }

      // Si 18+ pas encore accepté, on réouvre la modale
      if (!warnAccepted()) {
        const warn = document.getElementById("modal-warn");
        if (warn) {
          warn.classList.add("show");
          warn.setAttribute("aria-hidden", "false");
          console.log("[app.handlePageClose] Reopening warn modal (18+ not accepted)");
        }
      }
    });

    console.log("[app.handlePageClose] Wired");
  } catch (e) {
    console.error("[app.handlePageClose] error:", e);
  }
}

// ============================================================
// ESCAPE KEY (ferme modales)
// ============================================================
function handleEscapeKey() {
  try {
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;

      const page = document.getElementById("modal-page");
      const wasPageOpen = page && page.classList.contains("show");

      if (wasPageOpen) {
        page.classList.remove("show");
        page.setAttribute("aria-hidden", "true");
        console.log("[app.handleEscapeKey] Modal page closed via Escape");

        // Si 18+ pas accepté, on réouvre la modale
        if (!warnAccepted()) {
          const warn = document.getElementById("modal-warn");
          if (warn) {
            warn.classList.add("show");
            warn.setAttribute("aria-hidden", "false");
            console.log("[app.handleEscapeKey] Reopening warn modal (18+ not accepted)");
          }
        }
      }
    });

    console.log("[app.handleEscapeKey] Wired");
  } catch (e) {
    console.error("[app.handleEscapeKey] error:", e);
  }
}

// ============================================================
// SETUP NAV BUTTONS (routing des 5 boutons bas)
// ============================================================
function setupNavigation() {
  try {
    const navPrincipal = document.getElementById("nav-principal");
    const navStats = document.getElementById("nav-stats");
    const navCal = document.getElementById("nav-calendrier");
    const navHabitudes = document.getElementById("nav-habitudes");
    const navParams = document.getElementById("nav-params");

    // Boutons de navigation (routing par hash)
    if (navPrincipal) {
      navPrincipal.addEventListener("click", () => {
        navigateTo("accueil");
        console.log("[app.nav] Navigating to accueil");
      });
    } else {
      console.warn("[app.setupNavigation] nav-principal not found");
    }

    if (navStats) {
      navStats.addEventListener("click", () => {
        navigateTo("stats");
        console.log("[app.nav] Navigating to stats");
      });
    } else {
      console.warn("[app.setupNavigation] nav-stats not found");
    }

    if (navCal) {
      navCal.addEventListener("click", () => {
        navigateTo("cal");
        console.log("[app.nav] Navigating to cal");
      });
    } else {
      console.warn("[app.setupNavigation] nav-calendrier not found");
    }

    if (navHabitudes) {
      navHabitudes.addEventListener("click", () => {
        navigateTo("habitudes");
        console.log("[app.nav] Navigating to habitudes");
      });
    } else {
      console.warn("[app.setupNavigation] nav-habitudes not found");
    }

    // Réglages = dispatche event pour que settings.js l'écoute
    if (navParams) {
      navParams.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("sa:openSettingsMenu"));
        console.log("[app.nav] Dispatching sa:openSettingsMenu event");
      });
    } else {
      console.warn("[app.setupNavigation] nav-params not found");
    }

    console.log("[app.nav] Navigation setup complete");
  } catch (e) {
    console.error("[app.setupNavigation] error:", e);
  }
}

// ============================================================
// BOOT PRINCIPAL (DOMContentLoaded)
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[app.boot] ============ STARTING APP INITIALIZATION ============");

  try {
    // 1) i18n (non-bloquant, optionnel)
    try {
      initI18n?.();
      console.log("[app.boot] i18n initialized");
    } catch (e) {
      console.warn("[app.boot] i18n skipped:", e.message);
    }

    // 2) Initialiser tous les modules "légers" (counters, settings, export, stats, limites, calendrier, economie)
    console.log("[app.boot] Initializing modules...");
    try { initCounters(); } catch (e) { console.error("[app.boot] initCounters error:", e); }
    try { initSettings(); } catch (e) { console.error("[app.boot] initSettings error:", e); }
    try { initImportExport(); } catch (e) { console.error("[app.boot] initImportExport error:", e); }
    try { initStatsHeader(); } catch (e) { console.error("[app.boot] initStatsHeader error:", e); }
    try { initLimits(); } catch (e) { console.error("[app.boot] initLimits error:", e); }
    try { initCalendar(); } catch (e) { console.error("[app.boot] initCalendar error:", e); }
    try { initEconomy(); } catch (e) { console.error("[app.boot] initEconomy error:", e); }
    console.log("[app.boot] Modules initialized");

    // 3) Setup navigation (5 boutons bas)
    setupNavigation();

    // 4) Setup routing par hash (hashchange listener)
    window.addEventListener("hashchange", applyRoute);
    applyRoute(); // Affiche l'écran initial (accueil par défaut)
    console.log("[app.boot] Routing setup complete");

    // 5) Charts lazy init (via IntersectionObserver si possible)
    const statsScreen = document.getElementById("ecran-stats");
    if (statsScreen && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) {
            ensureCharts();
            io.disconnect();
            console.log("[app.boot] Charts initialized (via IntersectionObserver)");
            break;
          }
        }
      }, { threshold: 0.1 });
      io.observe(statsScreen);
      console.log("[app.boot] IntersectionObserver setup for charts");
    } else {
      // Fallback : init immédiatement
      ensureCharts();
      console.log("[app.boot] Charts initialized (fallback)");
    }

    // 6) Modale 18+ (vérif + affichage si nécessaire)
    checkAndShowWarnIfNeeded();

    // 7) Handlers globaux des modales (page close, escape key)
    handlePageClose();
    handleEscapeKey();

    // 8) Debug toggle (5 taps sur la date)
    setupDebugToggle();

    // 9) Expose namespace global (pour diag/debug)
    window.SA = window.SA || {};
    window.SA.app = {
      version: "2.4.0-clean",
      navigateTo,
      ensureCharts,
      showScreen,
      ROUTES,
    };
    console.log("[app.boot] Namespace window.SA.app exposed");

    console.log("[app.boot] ============ APP READY ============");
  } catch (e) {
    console.error("[app.boot] ============ CRITICAL ERROR ============:", e);
  }
});
