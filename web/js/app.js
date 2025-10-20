// web/js/app.js — v2.4.3 HYBRIDE FINAL
// 5 écrans plein format, boot fiable, lazy init Stats + Calendrier,
// modale 18+ respectée, horloge fallback, logs détaillés pour debug smartphone.

import { initSettings }   from "./settings.js";
import { initCounters }   from "./counters.js";
import { initStatsHeader } from "./stats.js";
import { initCharts }     from "./charts.js";
import { initCalendar }   from "./calendar.js";
// CORRECTION #1 : Commenter les 4 imports fragiles pour sécuriser le boot
// import { initEconomy }    from "./economy.js";   // ⚠️ DÉSACTIVÉ temporairement
// import { initExport }     from "./export.js";    // ⚠️ DÉSACTIVÉ temporairement
// import { initLimits }     from "./limits.js";    // ⚠️ DÉSACTIVÉ temporairement
// import { t }              from "./i18n.js";      // ⚠️ DÉSACTIVÉ temporairement

// ---------------------------------------------------------
// Sélecteurs utilitaires
// ---------------------------------------------------------
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Les 5 écrans cibles (monolithe)
const SCREENS = [
  "ecran-principal",
  "ecran-stats",
  "ecran-calendrier",
  "ecran-habitudes",
  "ecran-params",
];

// Boutons de la barre de nav
const NAV_IDS = [
  "nav-principal",
  "nav-stats",
  "nav-calendrier",
  "nav-habitudes",
  "nav-params",
];

// Flags d'initialisation lazy
let _statsInitialized = false;
let _calendarInitialized = false;

// ---------------------------------------------------------
// Horloge (fallback + robustesse)
// ---------------------------------------------------------
function startHeaderClock() {
  try {
    const elDate  = $("#date-actuelle");
    const elHeure = $("#heure-actuelle");
    if (!elDate && !elHeure) return;

    const fmtDate = () =>
      new Date().toLocaleDateString("fr-FR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });

    const fmtHeure = () =>
      new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    const tick = () => {
      if (elDate)  elDate.textContent  = fmtDate();
      if (elHeure) elHeure.textContent = fmtHeure();
    };

    tick();
    setInterval(tick, 1000);
    console.log("[app.clock] Started ✓");
  } catch (e) {
    console.warn("[app.clock] error:", e);
  }
}

// ---------------------------------------------------------
// Navigation (routing plein écran)
// ---------------------------------------------------------
function showScreen(screenId) {
  try {
    // Masquer tous les écrans
    SCREENS.forEach(id => {
      const el = $(`#${id}`);
      if (el) el.classList.remove("actif", "active", "show");
    });

    // Activer la cible
    const target = $(`#${screenId}`);
    if (target) target.classList.add("actif", "active", "show");

    // Activer l'onglet visuel
    NAV_IDS.forEach(id => {
      const b = $(`#${id}`);
      if (b) b.classList.remove("actif", "active");
    });
    const btn = $(`#nav-${screenId.replace("ecran-","")}`);
    if (btn) btn.classList.add("actif", "active");

    // Lazy init selon l'écran
    if (screenId === "ecran-stats") ensureStatsInit();
    if (screenId === "ecran-calendrier") ensureCalendarInit();

    // Notifier
    window.dispatchEvent(new CustomEvent("sa:screen:changed", { detail: { screen: screenId.replace("ecran-","") }}));
    
    console.log("[app.showScreen] Navigated to: " + screenId);
  } catch (e) {
    console.error("[app.showScreen] error:", e);
  }
}

function setupNavigation() {
  try {
    const map = {
      "nav-principal":   "ecran-principal",
      "nav-stats":       "ecran-stats",
      "nav-calendrier":  "ecran-calendrier",
      "nav-habitudes":   "ecran-habitudes",
      "nav-params":      "ecran-params",
    };
    
    NAV_IDS.forEach(id => {
      const el = $(`#${id}`);
      if (!el) {
        console.warn("[app.setupNavigation] Nav button not found: " + id);
        return;
      }
      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        const target = map[id];
        if (target) showScreen(target);
      });
    });
    
    console.log("[app.setupNavigation] Navigation wired ✓");
  } catch (e) {
    console.error("[app.setupNavigation] error:", e);
  }
}

// ---------------------------------------------------------
// Lazy init : Stats & Calendrier (non-critiques au boot)
// ---------------------------------------------------------
function ensureStatsInit() {
  try {
    if (_statsInitialized) return;
    console.log("[app.ensureStatsInit] Initializing stats...");
    
    // 1) Header/bannière Stats
    if (typeof initStatsHeader === "function") {
      initStatsHeader();
      console.log("[app.ensureStatsInit] Stats header initialized ✓");
    } else {
      console.warn("[app.ensureStatsInit] initStatsHeader not found");
    }
    
    // 2) Graphiques (charts.js) — dessiner les courbes
    if (typeof initCharts === "function") {
      initCharts();
      console.log("[app.ensureStatsInit] Charts initialized ✓");
    } else {
      console.warn("[app.ensureStatsInit] initCharts not found");
    }
    
    _statsInitialized = true;
  } catch (e) {
    console.warn("[app.ensureStatsInit] init stats error:", e);
  }
}

function ensureCalendarInit() {
  try {
    if (_calendarInitialized) return;
    console.log("[app.ensureCalendarInit] Initializing calendar...");
    
    if (typeof initCalendar === "function") {
      initCalendar();
      console.log("[app.ensureCalendarInit] Calendar initialized ✓");
    } else {
      console.warn("[app.ensureCalendarInit] initCalendar not found");
    }
    
    _calendarInitialized = true;
  } catch (e) {
    console.warn("[app.ensureCalendarInit] init calendar error:", e);
  }
}

// ---------------------------------------------------------
// Avertissement 18+ : affichage si nécessaire
// (Le câblage des boutons/checkbox est géré dans settings.js → setupWarnModal())
// ---------------------------------------------------------
function warnAccepted() {
  try {
    const raw = localStorage.getItem("app_warn_v23");
    if (!raw) return false;
    const v = JSON.parse(raw);
    return !!(v && v.accepted);
  } catch (e) {
    console.warn("[app.warnAccepted] parse error:", e);
    return false;
  }
}

function checkAndShowWarnIfNeeded() {
  try {
    if (warnAccepted()) {
      console.log("[app] Warning already accepted, skipping modal");
      return;
    }
    
    const modal = $("#modal-warn");
    if (!modal) {
      console.warn("[app] Modal #modal-warn not found");
      return;
    }
    
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
    console.log("[app] Warning modal shown ✓");
  } catch (e) {
    console.warn("[app.checkAndShowWarnIfNeeded] show error:", e);
  }
}

// ---------------------------------------------------------
// Global error handler (debug console)
// ---------------------------------------------------------
function setupGlobalErrorHandler() {
  try {
    window.addEventListener("error", (e) => {
      const dc = $("#debug-console");
      if (!dc) return;
      const line = `[${new Date().toLocaleTimeString()}] ERROR: ${e.message}`;
      dc.insertAdjacentHTML("beforeend", `${line}<br>`);
      dc.classList.add("show");
      console.error("[app.global] Uncaught error:", e);
    });
    
    window.addEventListener("unhandledrejection", (e) => {
      const dc = $("#debug-console");
      if (!dc) return;
      const line = `[${new Date().toLocaleTimeString()}] REJECT: ${e.reason}`;
      dc.insertAdjacentHTML("beforeend", `${line}<br>`);
      dc.classList.add("show");
      console.error("[app.global] Unhandled rejection:", e.reason);
    });
    
    console.log("[app.globalErrorHandler] Installed ✓");
  } catch (e) {
    console.warn("[app.globalErrorHandler] error:", e);
  }
}

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
function boot() {
  try {
    console.log("[app.boot] ========== STARTING StopAddict v2.4.3 ==========");
    
    // Démarrage des modules "toujours actifs"
    console.log("[app.boot] Initializing core modules...");
    
    if (typeof initSettings === "function") {
      initSettings();
      console.log("[app.boot] Settings initialized ✓");
    } else {
      console.error("[app.boot] initSettings not found ❌");
    }
    
    if (typeof initCounters === "function") {
      initCounters();
      console.log("[app.boot] Counters initialized ✓");
    } else {
      console.error("[app.boot] initCounters not found ❌");
    }

    // Les modules optionnels restent désactivés (Correction #1)
    // initEconomy?.();
    // initExport?.();
    // initLimits?.();

    setupNavigation();

    // Afficher l'écran par défaut (Accueil)
    showScreen("ecran-principal");

    // Vérifier l'avertissement 18+
    checkAndShowWarnIfNeeded();

    // Horloge (robustesse supplémentaire)
    startHeaderClock();

    // Setup global error handler pour debug
    setupGlobalErrorHandler();

    console.log("[app] ========== READY ✓ ==========");
    console.log("[app] Expected: clock ticking, buttons responsive, modal if needed");
  } catch (e) {
    console.error("[app.boot] FATAL ERROR:", e);
    console.error("[app] Stack:", e.stack);
  }
}

// Lancer au DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
