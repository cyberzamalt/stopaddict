// web/js/app.js
// FICHIER COMPLET - Copier-coller direct dans GitHub
// Rôle: Boot de l'app + routing par hash + lazy init charts + modale 18+ (minimal)

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
    if (!dateEl || !dbgBox) return;

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
    if (!btnClose) return;

    btnClose.addEventListener("click", () => {
      const modal = document.getElementById("modal-page");
      if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
      }

      // Si 18+ pas encore accepté, on réouvre la modale
      if (!warnAccepted()) {
        const warn = document.getElementById("modal-warn");
        if (warn) {
          warn.classList.add("show");
          warn.setAttribute("aria-hidden", "false");
        }
      }
    });
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

        // Si 18+ pas accepté, on réouvre la modale
        if (!warnAccepted()) {
          const warn = document.getElementById("modal-warn");
          if (warn) {
            warn.classList.add("show");
            warn.setAttribute("aria-hidden", "false");
          }
        }
      }
    });
  } catch (e) {
    console.error("[app.handleEscapeKey] error:", e);
  }
}

// ============================================================
// SETUP NAV BUTTONS (delegué à app, pas settings)
// ============================================================
function setupNavigation() {
  try {
    const navPrincipal = document.getElementById("nav-principal");
    const navStats = document.getElementById("nav-stats");
    const navCal = document.getElementById("nav-calendrier");
    const navHabitudes = document.getElementById("nav-habitudes");
    const navParams = document.getElementById("nav-params");

    navPrincipal?.addEventListener("click", () => navigateTo("accueil"));
    navStats?.addEventListener("click", () => navigateTo("stats"));
    navCal?.addEventListener("click", () => navigateTo("cal"));
    navHabitudes?.addEventListener("click", () => navigateTo("habitudes"));

    // Réglages = open settings menu (délégué à settings.js)
    navParams?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("sa:openSettingsMenu"));
    });

    console.log("[app.nav] Navigation wired");
  } catch (e) {
    console.error("[app.setupNavigation] error:", e);
  }
}

// ============================================================
// BOOT PRINCIPAL
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[app.boot] Starting app initialization...");

  try {
    // 1) i18n (non-bloquant)
    try {
      initI18n?.();
      console.log("[app] i18n initialized");
    } catch (e) {
      console.warn("[app] i18n skipped:", e.message);
    }

    // 2) Modules "légersé"
    console.log("[app] Initializing modules...");
    initCounters();
    initSettings();
    initImportExport();
    initStatsHeader();
    initLimits();
    initCalendar();
    initEconomy();

    // 3) Navigation
    setupNavigation();

    // 4) Routing par hash
    window.addEventListener("hashchange", applyRoute);
    applyRoute();

    // 5) Charts lazy init
    const statsScreen = document.getElementById("ecran-stats");
    if (statsScreen && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) {
            ensureCharts();
            io.disconnect();
            break;
          }
        }
      }, { threshold: 0.1 });
      io.observe(statsScreen);
    } else {
      // Fallback
      ensureCharts();
    }

    // 6) Modale 18+
    checkAndShowWarnIfNeeded();

    // 7) Handlers modales
    handlePageClose();
    handleEscapeKey();

    // 8) Debug toggle
    setupDebugToggle();

    // 9) Expose namespace
    window.SA = window.SA || {};
    window.SA.app = {
      version: "2.4.0-clean",
      navigateTo,
      ensureCharts,
    };

    console.log("[app.boot] App ready!");
  } catch (e) {
    console.error("[app.boot] CRITICAL ERROR:", e);
  }
});
