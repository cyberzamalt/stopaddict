// ============================================================
// app.js — v2.4.4 PHASE 2
// Routing + Modals 18+ + Init PHASE 2 (counters, stats)
// ============================================================

import { initModals } from "./modals.js";
import { initCounters } from "./counters.js";
import { initStatsHeader } from "./stats.js";
// import { initCharts } from "./charts.js"; // PHASE 2 optionnel (lazy init possible)

console.log("[app.js] Module loaded");

// ===== DOM Helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, ev, cb) => { if (el) el.addEventListener(ev, cb); };

// ===== Sélecteurs écrans/nav
const ECRANS = [
  "ecran-principal",
  "ecran-stats",
  "ecran-calendrier",
  "ecran-habitudes",
  "ecran-params",
];

const NAV_BUTTONS = [
  ["nav-principal",   "ecran-principal"],
  ["nav-stats",       "ecran-stats"],
  ["nav-calendrier",  "ecran-calendrier"],
  ["nav-habitudes",   "ecran-habitudes"],
  ["nav-params",      "ecran-params"],
];

// ===== Toast
function showToast(message, duration = 2000) {
  const bar = $("#snackbar");
  if (!bar) return;
  bar.innerHTML = `${message}`;
  bar.classList.add("show");
  const hide = () => bar.classList.remove("show");
  setTimeout(hide, duration);
}

// ===== Debug console toggle (5 taps header)
(function setupDebugConsoleToggle() {
  const header = $(".header");
  const dbg = $("#debug-console");
  if (!header || !dbg) return;

  let tapCount = 0;
  let lastTap = 0;

  on(header, "click", () => {
    const now = Date.now();
    if (now - lastTap < 800) {
      tapCount += 1;
    } else {
      tapCount = 1;
    }
    lastTap = now;

    if (tapCount >= 5) {
      dbg.classList.toggle("show");
      showToast(dbg.classList.contains("show") ? "Debug visible" : "Debug masqué");
      tapCount = 0;
    }
  });
})();

// ===== Routing
function switchTo(ecranId) {
  const target = document.getElementById(ecranId);
  if (!target) {
    console.warn("[switchTo] Écran introuvable:", ecranId);
    showToast("Écran non disponible.");
    return;
  }

  // Masquer tous, afficher cible
  for (const id of ECRANS) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (id === ecranId) {
      el.classList.add("show");
      el.style.display = "";
    } else {
      el.classList.remove("show");
      el.style.display = "none";
    }
  }

  // Marquer bouton nav actif
  for (const [btnId, mapsTo] of NAV_BUTTONS) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    if (mapsTo === ecranId) btn.classList.add("actif");
    else btn.classList.remove("actif");
  }

  // Émettre événement
  window.dispatchEvent(new CustomEvent("sa:screen:changed", {
    detail: { screen: ecranId }
  }));
}

// ===== Navigation binding
function bindNav() {
  for (const [btnId, screenId] of NAV_BUTTONS) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    on(btn, "click", () => switchTo(screenId));
  }
}

// ===== Boot (PHASE 1 + PHASE 2)
function boot() {
  console.log("[app.boot] Starting...");
  
  // Navigation
  bindNav();
  console.log("[app.boot] Navigation câblée");

  // PHASE 1: Modale 18+
  initModals({
    onOpenResources: () => {},
    showToast,
  });
  console.log("[app.boot] Modale 18+ initialisée");

  // PHASE 2: Counters et Stats
  try {
    initCounters();
    console.log("[app.boot] Counters initialisés");
  } catch (e) {
    console.error("[app.boot] initCounters error:", e);
  }

  try {
    initStatsHeader();
    console.log("[app.boot] Stats header initialisé");
  } catch (e) {
    console.error("[app.boot] initStatsHeader error:", e);
  }

  // PHASE 2 optionnel: Charts lazy init (si tu veux)
  // Décommenter si charts.js est prêt:
  // try {
  //   initCharts();
  //   console.log("[app.boot] Charts initialisés");
  // } catch (e) {
  //   console.error("[app.boot] initCharts error:", e);
  // }

  // Afficher écran par défaut
  switchTo("ecran-principal");
  console.log("[app.boot] ✓ Accueil affiché");

  // Debug logs
  const dbg = $("#debug-console");
  if (dbg) {
    const log = (msg) => { dbg.insertAdjacentHTML("beforeend", `<div>• ${msg}</div>`); };
    log("App PHASE 1+2 initialisée");
    log("Routing OK");
    log("Counters OK");
    log("Stats OK");
  }

  console.log("[app.boot] ========== READY ✓ ==========");
}

// Démarrage
document.addEventListener("DOMContentLoaded", boot);
