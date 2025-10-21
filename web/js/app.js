// ============================================================
// app.js — Boot, Routing, Lazy Init (PHASE 2)
// ============================================================

import { initModals } from "./modals.js";
import { initCounters, getTodayCounts } from "./counters.js";
import { initStats, refreshStatsFromCounts } from "./stats.js";

console.log("[app.js] Module loaded");

// ------------------------------
// Helpers DOM
// ------------------------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ------------------------------
// Toast (réutilise #snackbar)
// ------------------------------
function showToast(message, duration = 2500) {
  const bar = $("#snackbar");
  if (!bar) return;
  bar.textContent = message;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), duration);
}
window.__showToast = showToast; // utile pour d'autres modules si besoin

// ------------------------------
// Debug console (5 taps sur header)
// ------------------------------
(function setupDebugConsoleToggle() {
  const header = $(".header");
  const dbg = $("#debug-console");
  if (!header || !dbg) return;

  let tapCount = 0;
  let lastTap = 0;

  header.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 800) tapCount += 1;
    else tapCount = 1;
    lastTap = now;

    if (tapCount >= 5) {
      dbg.classList.toggle("show");
      showToast(dbg.classList.contains("show") ? "Debug visible" : "Debug masqué");
      tapCount = 0;
    }
  });
})();

// Petit logger vers la console flottante (optionnel)
function uiLog(msg) {
  const dbg = $("#debug-console");
  if (!dbg) return;
  const line = document.createElement("div");
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  dbg.appendChild(line);
}

// ------------------------------
// Horloge (date + heure header)
// ------------------------------
function startClock() {
  const elDate  = $("#date-actuelle");
  const elHeure = $("#heure-actuelle");
  if (!elDate || !elHeure) return;

  const tick = () => {
    const now = new Date();
    elDate.textContent  = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
    elHeure.textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  tick();
  setInterval(tick, 1000);
}

// ------------------------------
// ROUTING — Basculer entre écrans
// ------------------------------
const ECRANS = [
  "ecran-principal",
  "ecran-stats",
  "ecran-calendrier",
  "ecran-habitudes",
  "ecran-params",
];

function switchTo(ecranId) {
  ECRANS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("show", id === ecranId);
  });

  // Nav active
  const map = {
    "ecran-principal":  "nav-principal",
    "ecran-stats":      "nav-stats",
    "ecran-calendrier": "nav-calendrier",
    "ecran-habitudes":  "nav-habitudes",
    "ecran-params":     "nav-params",
  };
  Object.entries(map).forEach(([screenId, navId]) => {
    const btn = document.getElementById(navId);
    if (btn) btn.classList.toggle("actif", screenId === ecranId);
  });

  // Événement global (lazy init éventuel)
  window.dispatchEvent(new CustomEvent("sa:route-changed", { detail: { screen: ecranId } }));
  uiLog(`Route: ${ecranId}`);
}

function bindNav() {
  const bindings = [
    ["nav-principal",  "ecran-principal"],
    ["nav-stats",      "ecran-stats"],
    ["nav-calendrier", "ecran-calendrier"],
    ["nav-habitudes",  "ecran-habitudes"],
    ["nav-params",     "ecran-params"],
  ];
  bindings.forEach(([navId, screenId]) => {
    const btn = document.getElementById(navId);
    if (btn) btn.addEventListener("click", () => switchTo(screenId));
  });
}

// ------------------------------
// BOOT
// ------------------------------
function boot() {
  uiLog("Boot…");
  bindNav();
  startClock();

  // Init modules
  initModals();
  initCounters();
  initStats();

  // Première remontée des stats depuis les compteurs du jour
  const todayCounts = getTodayCounts();
  refreshStatsFromCounts(todayCounts);

  // Écran par défaut (déjà visible dans HTML, mais on synchronise nav)
  switchTo("ecran-principal");

  uiLog("✓ App prête (PHASE 2)");
}

document.addEventListener("DOMContentLoaded", boot);
