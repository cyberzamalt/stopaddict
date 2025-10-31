// web/js/app.js
// STOPADDICT — Boot principal & navigation (orchestrateur)
// Branche tous les modules (core + utilitaires) en mode tolérant.
// Dépendances directes : ./state.js + ./settings.js

"use strict";

import state, {
  load, save,
  ymd,
  getSettings, setSettings,
  getViewRange, setViewRange,
  getDaily, ensureToday,
  totalsHeader, getRangeTotals,
  calculateDayCost, getEconomy,
} from "./state.js";

import { initSettings } from "./settings.js";

// ------- Helpers DOM -------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const SCREENS = ["ecran-accueil", "ecran-stats", "ecran-calendrier", "ecran-habitudes", "ecran-params"];
const NAVS    = ["nav-accueil", "nav-stats", "nav-calendrier", "nav-habitudes", "nav-params"];

// ------- Navigation entre écrans -------
function showScreen(screenId) {
  SCREENS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === screenId) ? "block" : "none";
  });
  NAVS.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const target = btn.dataset.target || "";
    const active = target === screenId;
    btn.classList.toggle("actif", active);
    btn.setAttribute("aria-current", active ? "page" : "false");
  });
}

function bindNav() {
  NAVS.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.dataset.target;
      if (target) {
        showScreen(target);
        if (target === "ecran-stats") updateStatsHeader();
        if (target === "ecran-accueil") queueMicrotask(updateTopBar);
      }
    });
  });
}

// ------- Stats : range & header -------
function setActiveRangeButton(range) {
  const buttons = $$("[data-range]");
  buttons.forEach(b => b.classList.toggle("actif", b.dataset.range === range));
  ["day","week","month","year"].forEach(r => {
    const el = document.getElementById(`btn-range-${r}`);
    if (el) el.classList.toggle("actif", r === range);
  });
}

function bindRangeTabs() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-range]");
    if (!btn) return;
    const range = btn.dataset.range;
    if (!["day","week","month","year"].includes(range)) return;

    setViewRange(range);
    setActiveRangeButton(range);
    updateStatsHeader();

    try {
      document.dispatchEvent(new CustomEvent("sa:view-range-changed", { detail: { range } }));
    } catch (err) {
      console.warn("[app] sa:view-range-changed event failed:", err);
    }
  });
}

function updateStatsHeader() {
  const range = getViewRange() || "day";
  const titre = totalsHeader(range, new Date());
  const el = document.getElementById("stats-titre");
  if (el) el.textContent = titre;
}

// ------- Bandeau haut (résumé du jour) -------
function updateTopBar() {
  const today = getDaily(new Date());
  const alcoholCount = (+today.beer || 0) + (+today.strong || 0) + (+today.liquor || 0);

  const elCigs   = document.getElementById("bar-clopes");
  const elWeed   = document.getElementById("bar-joints");
  const elAlcool = document.getElementById("bar-alcool");
  if (elCigs)   elCigs.textContent   = String(+today.cigs   || 0);
  if (elWeed)   elWeed.textContent   = String(+today.weed   || 0);
  if (elAlcool) elAlcool.textContent = String(alcoholCount);

  const elCost = document.getElementById("bar-cost");
  const elEco  = document.getElementById("bar-eco");
  if (elCost) elCost.textContent = calculateDayCost(today).toFixed(2);
  if (elEco)  elEco.textContent  = getEconomy(today).toFixed(2);
}

// ------- Dynamic import “safe” (modules optionnels) -------
async function safeInit(path, exportName) {
  try {
    const mod = await import(path);
    const fn  = mod[exportName] || mod.default;
    if (typeof fn === "function") {
      await fn();
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[app] Module optionnel introuvable ou en erreur: ${path}`, err);
    return false;
  }
}

// ------- Boot principal -------
async function boot() {
  try {
    // État
    load();
    ensureToday();

    // Core utilitaires (tolérants si absents)
    await safeInit("./i18n.js",    "initI18n");     // langue
    await safeInit("./currency.js","initCurrency"); // symbole monnaie

    // Écran Réglages (injecte le formulaire si vide)
    try { initSettings(); } catch (e) { console.warn("[app] initSettings() a échoué:", e); }

    // Nav & stats-range
    bindNav();
    bindRangeTabs();

    // Vue par défaut
    const currentRange = getViewRange() || "day";
    setActiveRangeButton(currentRange);
    updateStatsHeader();
    updateTopBar();
    showScreen("ecran-accueil");

    // Modules cœur (tolérants)
    await safeInit("./counters.js", "initCounters");
    await safeInit("./stats.js",    "initStats");
    await safeInit("./charts.js",   "initCharts");
    await safeInit("./calendar.js", "initCalendar");
    await safeInit("./economy.js",  "initEconomy");
    await safeInit("./export.js",   "initExport");

    // Modules complémentaires (tolérants)
    await safeInit("./tips.js",      "initTips");      // Conseils adaptatifs
    await safeInit("./habits.js",    "initHabits");    // Habitudes (objectifs/dates)
    await safeInit("./agegate.js",   "initAgeGate");   // Modale majorité
    await safeInit("./resources.js", "initResources"); // Ressources utiles
    await safeInit("./debug.js",     "initDebug");     // Console intégrée
    await safeInit("./ads.js",       "initAds");       // Bandeau pub

    // Réactions globales utiles
    document.addEventListener("sa:state-changed", () => {
      updateTopBar();
      updateStatsHeader();
    });
    document.addEventListener("sa:counts-updated", () => {
      updateTopBar();
    });
    document.addEventListener("sa:lang-changed", () => {
      updateStatsHeader();
      queueMicrotask(updateTopBar);
    });
    document.addEventListener("sa:currency-changed", () => {
      queueMicrotask(updateTopBar);
    });

  } catch (err) {
    console.error("[app.boot] erreur critique:", err);
    const dbg = document.getElementById("debug-console");
    if (dbg) {
      dbg.style.display = "block";
      dbg.textContent = `[app.boot] ${err?.message || err}`;
    }
  }
}

window.addEventListener("DOMContentLoaded", boot);
