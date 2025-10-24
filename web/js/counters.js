// ============================================================
// counters.js — Compteurs Accueil (PHASE 2) — compat WebView
// ============================================================

import { addEntry, removeEntry, getDaily, on } from "./state.js";

console.log("[counters.js] Module loaded");

function refreshBars(counts) {
  const elC = document.getElementById("bar-clopes");
  const elJ = document.getElementById("bar-joints");
  const elA = document.getElementById("bar-alcool");
  if (elC) elC.textContent = String(counts.cigs || 0);
  if (elJ) elJ.textContent = String(counts.weed || 0);
  if (elA) elA.textContent = String(counts.alcohol || 0);
  console.log("[counters.refreshBars]", counts);
}

function refreshCards(counts) {
  const cardC = document.getElementById("card-cigs");
  if (cardC) {
    const v = cardC.querySelector(".val");
    if (v) v.textContent = String(counts.cigs || 0);
  }
  const cardJ = document.getElementById("card-weed");
  if (cardJ) {
    const v = cardJ.querySelector(".val");
    if (v) v.textContent = String(counts.weed || 0);
  }
  const cardA = document.getElementById("card-alcool");
  if (cardA) {
    const v = cardA.querySelector(".val");
    if (v) v.textContent = String(counts.alcohol || 0);
  }
  console.log("[counters.refreshCards]", counts);
}

function setupButtons() {
  console.log("[counters.setupButtons] Wiring buttons...");
  const btns = [
    ["cl-moins", "cigs", -1],
    ["cl-plus", "cigs", 1],
    ["j-moins", "weed", -1],
    ["j-plus", "weed", 1],
    ["a-moins", "alcohol", -1],
    ["a-plus", "alcohol", 1],
  ];
  btns.forEach(([id, type, delta]) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`[counters] Button #${id} not found`);
      return;
    }
    el.addEventListener("click", () => {
      try {
        if (delta > 0) addEntry(type, Math.abs(delta));
        else removeEntry(type, Math.abs(delta));
      } catch (e) {
        console.error(`[counters] Button click error for ${id}:`, e);
      }
    });
  });
  console.log("[counters.setupButtons] ✓ Buttons wired");
}

function setupStateListener() {
  console.log("[counters.setupStateListener] Subscribing...");
  on("sa:counts-updated", (e) => {
    try {
      const counts = (e && e.detail && e.detail.counts) || getDaily();
      refreshBars(counts);
      refreshCards(counts);
    } catch (err) {
      console.error("[counters.setupStateListener] error:", err);
    }
  });
  console.log("[counters.setupStateListener] ✓");
}

function renderInitial() {
  try {
    const counts = getDaily();
    refreshBars(counts);
    refreshCards(counts);
    console.log("[counters.renderInitial] ✓", counts);
  } catch (e) {
    console.error("[counters.renderInitial] error:", e);
  }
}

export function initCounters() {
  console.log("[counters.initCounters] Starting...");
  try {
    setupButtons();
    setupStateListener();
    renderInitial();
    console.log("[counters.initCounters] ✓ Ready");
  } catch (e) {
    console.error("[counters.initCounters] error:", e);
  }
}
