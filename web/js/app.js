// ============================================================
// app.js — Boot, Routing, Debug, Date/Heure (phase 2, aligné Claude)
// ============================================================

import { initModals } from "./modals.js";
import { initCounters } from "./counters.js";
import { initCharts } from "./charts.js";
import { on as onState, emit as emitState } from "./state.js";

console.log("[app.js] Module loaded");

// ---------- utils DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

// ---------- toast ----------
function showToast(msg, ms = 2500) {
  const bar = $("#snackbar");
  if (!bar) return;
  bar.textContent = msg;
  bar.classList.add("show");
  setTimeout(() => bar.classList.remove("show"), ms);
}

// ---------- header: date / heure ----------
function startClock() {
  const elDate = $("#date-actuelle");
  const elTime = $("#heure-actuelle");
  const fmtDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

  function tick() {
    const now = new Date();
    if (elDate) elDate.textContent = fmtDate.format(now);
    if (elTime) elTime.textContent = fmtTime.format(now);
  }
  tick();
  setInterval(tick, 1000);
}

// ---------- debug console (5 taps header) ----------
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

// ---------- routing ----------
const ECRANS = [
  "ecran-principal",
  "ecran-stats",
  "ecran-calendrier",
  "ecran-habitudes",
  "ecran-params"
];

function switchTo(screenId) {
  ECRANS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) el.classList.add("show");
    else el.classList.remove("show");
  });

  // nav active
  const map = {
    "ecran-principal": "nav-principal",
    "ecran-stats": "nav-stats",
    "ecran-calendrier": "nav-calendrier",
    "ecran-habitudes": "nav-habitudes",
    "ecran-params": "nav-params",
  };
  $$(".nav button").forEach(b => b.classList.remove("actif"));
  const activeBtn = document.getElementById(map[screenId]);
  if (activeBtn) activeBtn.classList.add("actif");

  // notifier les modules (charts, stats…) qu’on a changé d’écran
  emitState("sa:route-changed", { screen: screenId });
}

function bindNav() {
  const pairs = [
    ["nav-principal", "ecran-principal"],
    ["nav-stats", "ecran-stats"],
    ["nav-calendrier", "ecran-calendrier"],
    ["nav-habitudes", "ecran-habitudes"],
    ["nav-params", "ecran-params"],
  ];
  pairs.forEach(([btnId, screenId]) => {
    const btn = document.getElementById(btnId);
    on(btn, "click", () => switchTo(screenId));
  });
}

// ---------- boot ----------
function boot() {
  console.log("[app.boot] starting…");

  // phase 1
  initModals();

  // phase 2
  initCounters();   // +/− accueil (émet sa:counts-updated via state.js)
  initCharts();     // graphiques + onglets (écoute sa:counts-updated)

  // horloge & date
  startClock();

  // nav
  bindNav();
  switchTo("ecran-principal");

  console.log("[app.boot] ready ✓");
}

window.addEventListener("DOMContentLoaded", boot);
