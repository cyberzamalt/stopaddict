// ============================================================
// app.js — Boot, Routing, Lazy Init (PHASE 1)
// ============================================================

import { initModals } from "./modals.js";
// import { initCounters } from "./counters.js";   // PHASE 2
// import { initStats } from "./stats.js";         // PHASE 2
// import { initSettingsScreen } from "./settings.js"; // PHASE 3
// import { initPages } from "./pages.js";         // PHASE 3

console.log("[app.js] Module loaded");

// ============================================================
// ROUTING — Basculer entre écrans
// ============================================================

const ECRANS = [
  "ecran-principal",
  "ecran-stats",
  "ecran-calendrier",
  "ecran-habitudes",
  "ecran-params"
];

const NAV_BUTTONS = [
  "nav-principal",
  "nav-stats",
  "nav-calendrier",
  "nav-habitudes",
  "nav-params"
];

function switchTo(ecranId) {
  try {
    if (!ECRANS.includes(ecranId)) {
      console.warn(`[app.switchTo] Écran inconnu: ${ecranId}`);
      return;
    }

    // Masquer tous les écrans
    ECRANS.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("show");
        el.style.display = "none";
      }
    });

    // Afficher l'écran cible
    const target = document.getElementById(ecranId);
    if (target) {
      target.classList.add("show");
      target.style.display = "block";
      console.log(`[app.switchTo] Écran actif: ${ecranId}`);
    }

    // Mettre à jour état des boutons nav
    NAV_BUTTONS.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        const correspondingScreen = id.replace("nav-", "ecran-");
        if (correspondingScreen === ecranId) {
          btn.classList.add("actif");
        } else {
          btn.classList.remove("actif");
        }
      }
    });

    // Émettre événement
    window.dispatchEvent(new CustomEvent("sa:screen:changed", {
      detail: { screen: ecranId }
    }));

  } catch (e) {
    console.error("[app.switchTo] error:", e);
  }
}

// ============================================================
// SETUP NAVIGATION
// ============================================================

function setupNavigation() {
  try {
    const navPrincipal = document.getElementById("nav-principal");
    const navStats = document.getElementById("nav-stats");
    const navCalendrier = document.getElementById("nav-calendrier");
    const navHabitudes = document.getElementById("nav-habitudes");
    const navParams = document.getElementById("nav-params");

    if (navPrincipal) navPrincipal.addEventListener("click", () => switchTo("ecran-principal"));
    if (navStats) navStats.addEventListener("click", () => switchTo("ecran-stats"));
    if (navCalendrier) navCalendrier.addEventListener("click", () => switchTo("ecran-calendrier"));
    if (navHabitudes) navHabitudes.addEventListener("click", () => switchTo("ecran-habitudes"));
    if (navParams) navParams.addEventListener("click", () => switchTo("ecran-params"));

    console.log("[app.setupNavigation] Navigation câblée");
  } catch (e) {
    console.error("[app.setupNavigation] error:", e);
  }
}

// ============================================================
// LAZY INIT ÉCRANS (placeholder pour PHASE 2+)
// ============================================================

let _statsInitialized = false;
let _calendarInitialized = false;

function ensureStatsInit() {
  if (_statsInitialized) return;
  try {
    console.log("[app.ensureStatsInit] Initialisation Stats...");
    // TODO: PHASE 2 — appeler initStatsHeader() et initCharts()
    _statsInitialized = true;
  } catch (e) {
    console.error("[app.ensureStatsInit] error:", e);
  }
}

function ensureCalendarInit() {
  if (_calendarInitialized) return;
  try {
    console.log("[app.ensureCalendarInit] Initialisation Calendrier...");
    // TODO: PHASE 2 — appeler initCalendar()
    _calendarInitialized = true;
  } catch (e) {
    console.error("[app.ensureCalendarInit] error:", e);
  }
}

// ============================================================
// LISTENERS ÉCRANS (pour lazy init)
// ============================================================

function setupScreenListeners() {
  try {
    window.addEventListener("sa:screen:changed", (event) => {
      const screen = event.detail.screen;
      console.log(`[app] Écran changé: ${screen}`);
      
      // Lazy init Stats
      if (screen === "ecran-stats") {
        ensureStatsInit();
      }

      // Lazy init Calendrier
      if (screen === "ecran-calendrier") {
        ensureCalendarInit();
      }
    });
  } catch (e) {
    console.error("[app.setupScreenListeners] error:", e);
  }
}

// ============================================================
// BOOT
// ============================================================

function boot() {
  try {
    console.log("[app.boot] Démarrage...");

    // 1. Setup navigation (menu bas)
    setupNavigation();

    // 2. Setup screen change listeners (lazy init)
    setupScreenListeners();

    // 3. Initialiser modales (18+)
    initModals();

    // 4. Afficher écran par défaut (Accueil)
    switchTo("ecran-principal");

    // 5. Global error handler (debug)
    window.addEventListener("error", (e) => {
      console.error("[app.globalErrorHandler]", e);
    });

    console.log("[app.boot] ✓ Prêt");
  } catch (e) {
    console.error("[app.boot] error:", e);
    console.error("[app.boot] Tentative fallback...");
    
    // Fallback minimal
    try {
      switchTo("ecran-principal");
      initModals();
    } catch (e2) {
      console.error("[app.boot] Fallback échoué:", e2);
    }
  }
}

// ============================================================
// Lancer boot au chargement DOM
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("[app] DOMContentLoaded triggered");
  boot();
});

// Fallback si DOM déjà chargé
if (document.readyState === "loading") {
  console.log("[app] DOM en cours de chargement, écouteur attaché");
} else {
  console.log("[app] DOM déjà chargé, boot direct");
  boot();
}
