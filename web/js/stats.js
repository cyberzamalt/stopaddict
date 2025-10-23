// ============================================================
// stats.js — Bannière stats + onglets range (PHASE 2)
// ============================================================
// Adapté : utilise state.js pour les données, délègue graphiques à charts.js
// ============================================================

import { getDaily, on, emit } from "./state.js";

console.log("[stats.js] Module loaded");

// ============================================================
// Helpers DOM
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ============================================================
// Label range
// ============================================================
function labelForRange(range) {
  const map = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    year: "Cette année",
  };
  return map[range] || "Période";
}

// ============================================================
// Refresh Bannière
// ============================================================
function refreshBanner(counts) {
  try {
    const titre = $("#stats-titre");
    if (titre) titre.textContent = labelForRange(getCurrentRange());

    const vC = $("#stats-clopes");
    const vJ = $("#stats-joints");
    const vA = $("#stats-alcool");
    const lineA = $("#stats-alcool-line");

    if (vC) vC.textContent = String(counts?.cigs || 0);
    if (vJ) vJ.textContent = String(counts?.weed || 0);

    const hasAlcool = (counts?.alcohol || 0) > 0;
    if (lineA) lineA.style.display = hasAlcool ? "" : "none";
    if (vA) vA.textContent = String(counts?.alcohol || 0);

    // KPIs header (jour)
    const todayTotal = $("#todayTotal");
    if (todayTotal) {
      todayTotal.textContent = String(
        (counts?.cigs || 0) + (counts?.weed || 0) + (counts?.alcohol || 0)
      );
    }

    console.log("[stats.refreshBanner] Updated with:", counts);
  } catch (e) {
    console.error("[stats.refreshBanner] error:", e);
  }
}

// ============================================================
// Range buttons
// ============================================================
let currentRange = "day";

function getCurrentRange() {
  return currentRange;
}

function bindRangeButtons() {
  const container = $("#chartRange");
  if (!container) {
    console.warn("[stats] ⚠️ #chartRange container not found");
    return;
  }

  const buttons = $$("#chartRange .btn.pill");
  console.log("[stats.bindRangeButtons] Found", buttons.length, "buttons");

  function setActive(btn) {
    buttons.forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = btn.dataset.range || "day";
      currentRange = r;
      setActive(btn);
      console.log("[stats] Range clicked:", r);
      // charts.js écoute ce event et redessine
      emit("charts:range-changed", { range: r });
    });
  });

  // Active initial
  if (buttons.length > 0) setActive(buttons[0]);
  console.log("[stats.bindRangeButtons] ✓ Buttons wired");
}

// ============================================================
// State Listeners
// ============================================================
function setupStateListener() {
  console.log("[stats.setupStateListener] Subscribing to state events...");

  on("sa:counts-updated", (e) => {
    try {
      const counts = e.detail?.counts || getDaily();
      refreshBanner(counts);
    } catch (err) {
      console.error("[stats.setupStateListener] error:", err);
    }
  });

  console.log("[stats.setupStateListener] ✓ Listener attached");
}

// ============================================================
// Public API (compatibilité app.js)
// ============================================================
export function refreshStatsFromCounts(counts) {
  try {
    refreshBanner(counts);
  } catch (e) {
    console.error("[stats.refreshStatsFromCounts] error:", e);
  }
}

export function initStats() {
  console.log("[stats.initStats] Starting...");
  try {
    bindRangeButtons();
    setupStateListener();

    // Render initial (jour)
    const today = getDaily();
    refreshBanner(today);

    console.log("[stats.initStats] ✓ Ready");
  } catch (e) {
    console.error("[stats.initStats] error:", e);
  }
}

console.log("[stats.js] ✓ Ready");
