// web/js/app.js — Option A "monolithe visuel"
// 5 écrans plein format (dont #ecran-params), routing simple,
// init explicite des modules non-critiques (Stats + Calendrier) quand on entre sur l'écran.
// Emet "sa:screen:changed" à chaque navigation.

import { initSettings }   from "./settings.js";
import { initCounters }   from "./counters.js";
import { initStatsHeader } from "./stats.js";
import { initCharts }     from "./charts.js";
import { initCalendar }   from "./calendar.js";
import { initEconomy }    from "./economy.js";   // si tu as ce module
import { initExport }     from "./export.js";    // si tu as ce module
import { initLimits }     from "./limits.js";    // si tu as ce module
import { t }              from "./i18n.js";      // si tu as ce module

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
  } catch (e) {
    console.error("[app.showScreen] error:", e);
  }
}

function setupNavigation() {
  const map = {
    "nav-principal":   "ecran-principal",
    "nav-stats":       "ecran-stats",
    "nav-calendrier":  "ecran-calendrier",
    "nav-habitudes":   "ecran-habitudes",
    "nav-params":      "ecran-params", // ← monolithe : Réglages en plein écran
  };
  NAV_IDS.forEach(id => {
    const el = $(`#${id}`);
    if (!el) return;
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      const target = map[id];
      if (target) showScreen(target);
    });
  });
}

// ---------------------------------------------------------
// Lazy init : Stats & Calendrier (non-critiques au boot)
// ---------------------------------------------------------
function ensureStatsInit() {
  try {
    if (_statsInitialized) return;
    // 1) Header/bannière Stats
    initStatsHeader?.();
    // 2) Graphiques (charts.js) — dessiner les courbes
    initCharts?.();
    _statsInitialized = true;
  } catch (e) {
    console.warn("[app.ensureStatsInit] init stats error:", e);
  }
}

function ensureCalendarInit() {
  try {
    if (_calendarInitialized) return;
    initCalendar?.();
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
  } catch {
    return false;
  }
}

function checkAndShowWarnIfNeeded() {
  try {
    if (warnAccepted()) return;
    const modal = $("#modal-warn");
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");
  } catch (e) {
    console.warn("[app.warn] show error:", e);
  }
}

// ---------------------------------------------------------
// Boot
// ---------------------------------------------------------
function boot() {
  try {
    // Démarrage des modules "toujours actifs"
    initSettings?.();   // horloge, toggles modules, modale 18+ câblée
    initCounters?.();   // accueil (boutons ± → state → bandeau)

    // (facultatifs)
    initEconomy?.();
    initExport?.();
    initLimits?.();

    setupNavigation();

    // Afficher l'écran par défaut (Accueil)
    showScreen("ecran-principal");

    // Vérifier l'avertissement 18+
    checkAndShowWarnIfNeeded();

    console.log("[app] Ready");
  } catch (e) {
    console.error("[app.boot] fatal:", e);
  }
}

// Lancer au DOM ready
document.addEventListener("DOMContentLoaded", boot);
