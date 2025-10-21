// ============================================================
// app.js — Boot, Routing, Lazy Init (PHASE 1 + hooks PHASE 2)
// ============================================================

import { initModals } from "./modals.js";
import { initCounters } from "./counters.js"; // PHASE 2
import { initStats } from "./stats.js";       // PHASE 2

console.log("[app.js] Module loaded");

// ------------------------------------------------------------
// Utils locaux (sans dépendre d'autres fichiers)
// ------------------------------------------------------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

// Petit toast local (utilisé par debug console). modals.js a le sien.
function showToast(msg, ms = 2000) {
  const bar = $("#snackbar");
  if (!bar) return;
  bar.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), ms);
}

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

function switchTo(ecranId) {
  ECRANS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === ecranId) el.classList.add("show");
    else el.classList.remove("show");
  });

  // Bascule visuelle des boutons nav
  const map = {
    "ecran-principal": "nav-principal",
    "ecran-stats": "nav-stats",
    "ecran-calendrier": "nav-calendrier",
    "ecran-habitudes": "nav-habitudes",
    "ecran-params": "nav-params",
  };
  Object.values(map).forEach(id => {
    const b = document.getElementById(id);
    if (b) b.classList.remove("actif");
  });
  const act = document.getElementById(map[ecranId]);
  if (act) act.classList.add("actif");

  // Événement pour lazy-init côté Stats (PHASE 2)
  document.dispatchEvent(new CustomEvent("sa:route-changed", { detail: { screen: ecranId }}));
}

function bindNav() {
  on($("#nav-principal"),  "click", () => switchTo("ecran-principal"));
  on($("#nav-stats"),      "click", () => switchTo("ecran-stats"));
  on($("#nav-calendrier"), "click", () => switchTo("ecran-calendrier"));
  on($("#nav-habitudes"),  "click", () => switchTo("ecran-habitudes"));
  on($("#nav-params"),     "click", () => switchTo("ecran-params"));
}

// ============================================================
// Console debug flottante (5 taps sur le header)
// ============================================================
(function setupDebugConsoleToggle() {
  const header = $(".header");
  const dbg = $("#debug-console");
  if (!header || !dbg) return;
  let tapCount = 0;
  let lastTap = 0;
  on(header, "click", () => {
    const now = Date.now();
    tapCount = (now - lastTap < 800) ? tapCount + 1 : 1;
    lastTap = now;
    if (tapCount >= 5) {
      dbg.classList.toggle("show");
      showToast(dbg.classList.contains("show") ? "Debug visible" : "Debug masqué");
      tapCount = 0;
    }
  });
})();

// ============================================================
// BOOT
// ============================================================
function boot() {
  console.log("[app.boot] binding nav + modules");
  bindNav();

  // PHASE 1
  initModals();

  // PHASE 2
  initCounters();  // active +/− & met à jour le bandeau haut + cartes
  initStats();     // active la bannière Stats, onglets & (optionnel) graphes

  console.log("[app.boot] ✓ prêt");
}

document.addEventListener("DOMContentLoaded", boot);
