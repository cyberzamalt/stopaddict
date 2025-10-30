// web/js/app.js
// STOPADDICT — Boot principal & navigation (orchestrateur)
// Objectif : démarrer l’app sans casser si certains modules ne sont pas encore branchés.
// Dépendances directes : ./state.js (source de vérité) + ./settings.js (écran Réglages)

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
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const SCREENS = ["ecran-accueil", "ecran-stats", "ecran-calendrier", "ecran-habitudes", "ecran-params"];
const NAVS    = ["nav-accueil", "nav-stats", "nav-calendrier", "nav-habitudes", "nav-params"];

// ------- Navigation entre écrans -------
function showScreen(screenId) {
  SCREENS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === screenId) ? "block" : "none";
  });
  // Activer l’onglet de nav correspondant
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
      }
    });
  });
}

// ------- Stats : range & header -------
function setActiveRangeButton(range) {
  // On supporte soit les IDs (#btn-range-day...) soit des éléments avec [data-range]
  const buttons = $$("[data-range]");
  buttons.forEach(b => b.classList.toggle("actif", b.dataset.range === range));

  const idBtn = document.getElementById(`btn-range-${range}`);
  if (idBtn) {
    ["day","week","month","year"].forEach(r => {
      const el = document.getElementById(`btn-range-${r}`);
      if (el) el.classList.toggle("actif", r === range);
    });
  }
}

function bindRangeTabs() {
  // Délégation : clique sur n’importe quel élément [data-range]
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-range]");
    if (!btn) return;
    const range = btn.dataset.range;
    if (!["day","week","month","year"].includes(range)) return;

    setViewRange(range);
    setActiveRangeButton(range);
    updateStatsHeader();

    // Notifier les autres modules (charts, stats détaillées, etc.)
    try {
      document.dispatchEvent(new CustomEvent("sa:view-range-changed", { detail: { range } }));
    } catch (err) {
      console.warn("[app] sa:view-range-changed event failed:", err);
    }
  });
}

function updateStatsHeader() {
  const range = getViewRange();
  const titre = totalsHeader(range, new Date());
  const el = document.getElementById("stats-titre");
  if (el) el.textContent = titre;
}

// ------- Bandeau haut (résumé du jour) -------
function updateTopBar() {
  const today = getDaily(new Date());
  // Somme alcool = beer + strong + liquor
  const alcoholCount = (+today.beer || 0) + (+today.strong || 0) + (+today.liquor || 0);

  const elCigs   = document.getElementById("bar-clopes");
  const elWeed   = document.getElementById("bar-joints");
  const elAlcool = document.getElementById("bar-alcool");
  if (elCigs)   elCigs.textContent   = String(+today.cigs   || 0);
  if (elWeed)   elWeed.textContent   = String(+today.weed   || 0);
  if (elAlcool) elAlcool.textContent = String(alcoholCount);

  // Coût & économies du jour (si des éléments existent)
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
    // Ne bloque pas le boot si un module est manquant
    console.warn(`[app] Module optionnel introuvable ou en erreur: ${path}`, err);
    return false;
  }
}

// ------- Boot principal -------
async function boot() {
  try {
    load();        // charge (ou crée) l’état
    ensureToday(); // s’assure que le jour courant existe

    // Écran Réglages (injecte le template s’il était vide)
    try { initSettings(); } catch (e) { console.warn("[app] initSettings() a échoué:", e); }

    // Navigation & onglets Stats
    bindNav();
    bindRangeTabs();

    // Vue par défaut (si manquante)
    const currentRange = getViewRange() || "day";
    setActiveRangeButton(currentRange);
    updateStatsHeader();
    updateTopBar();

    // Écran d’accueil par défaut
    showScreen("ecran-accueil");

    // Initialiser les modules optionnels (ne jette pas si absents)
    await safeInit("./counters.js", "initCounters");
    await safeInit("./stats.js",    "initStats");
    await safeInit("./charts.js",   "initCharts");
    await safeInit("./calendar.js", "initCalendar");
    await safeInit("./economy.js",  "initEconomy");
    await safeInit("./export.js",   "initExport");

    // Événements utiles : quand on modifie les réglages / la date du jour / etc., on met à jour l’UI
    document.addEventListener("sa:state-changed", () => {
      updateTopBar();
      updateStatsHeader();
    });
    document.addEventListener("sa:counts-updated", () => {
      updateTopBar();
    });

  } catch (err) {
    // En dernier recours, laisser une trace visible
    console.error("[app.boot] erreur critique:", err);
    const dbg = document.getElementById("debug-console");
    if (dbg) {
      dbg.style.display = "block";
      dbg.textContent = `[app.boot] ${err?.message || err}`;
    }
  }
}

window.addEventListener("DOMContentLoaded", boot);
