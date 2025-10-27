/* web/js/counters.js
   — Compteurs Accueil (boutons +/−, toggles modules, affichages) — v2.4.4
*/
import {
  addEntry, removeEntry, getDaily, on,
  isModuleEnabled, setModuleEnabled
} from "./state.js";

// ------------------------------------------------------------
// UI helpers
// ------------------------------------------------------------
function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(txt);
}
function toggleCardEnabled(cardId, btnMinusId, btnPlusId, enabled) {
  const card = document.getElementById(cardId);
  const b1 = document.getElementById(btnMinusId);
  const b2 = document.getElementById(btnPlusId);
  if (card) {
    card.style.opacity = enabled ? "1" : "0.5";
    card.style.filter = enabled ? "none" : "grayscale(0.3)";
  }
  if (b1) b1.disabled = !enabled;
  if (b2) b2.disabled = !enabled;
}

// ------------------------------------------------------------
// Refresh zones (barres + cartes)
// ------------------------------------------------------------
function refreshBars(counts) {
  setText("bar-clopes", counts.cigs || 0);
  setText("bar-joints", counts.weed || 0);
  setText("bar-alcool", counts.alcohol || 0);
  // coût jour si prix plus tard → laissé à 0€ par stats.js
}

function refreshCards(counts) {
  setText("note-cigs", counts.cigs || 0);
  setText("note-weed", counts.weed || 0);
  setText("note-alcool", counts.alcohol || 0);
}

// ------------------------------------------------------------
// Buttons +/−
// ------------------------------------------------------------
function setupButtons() {
  const map = [
    { id: "cl-moins", t: "cigs", delta: -1 },
    { id: "cl-plus",  t: "cigs", delta: +1 },
    { id: "j-moins",  t: "weed", delta: -1 },
    { id: "j-plus",   t: "weed", delta: +1 },
    { id: "a-moins",  t: "alcohol", delta: -1 },
    { id: "a-plus",   t: "alcohol", delta: +1 },
  ];
  for (var i = 0; i < map.length; i++) {
    (function (cfg) {
      const el = document.getElementById(cfg.id);
      if (!el) return;
      el.addEventListener("click", function () {
        try {
          if (cfg.delta > 0) addEntry(cfg.t, cfg.delta);
          else removeEntry(cfg.t, Math.abs(cfg.delta));
        } catch (e) { console.error("[counters.click]", cfg.id, e); }
      });
    })(map[i]);
  }
}

// ------------------------------------------------------------
// Toggles modules (checkboxes) + persistance via state.js
// ------------------------------------------------------------
function setupToggles() {
  var pairs = [
    { toggle: "toggle-cigs", type: "cigs", card: "card-cigs", m: "cl-moins", p: "cl-plus" },
    { toggle: "toggle-weed", type: "weed", card: "card-weed", m: "j-moins", p: "j-plus" },
    { toggle: "toggle-alcool", type: "alcohol", card: "card-alcool", m: "a-moins", p: "a-plus" },
  ];
  for (var i = 0; i < pairs.length; i++) {
    (function (cfg) {
      var t = document.getElementById(cfg.toggle);
      if (!t) return;
      // hydrate
      var enabled = isModuleEnabled(cfg.type);
      t.checked = enabled;
      toggleCardEnabled(cfg.card, cfg.m, cfg.p, enabled);
      // persist changes
      t.addEventListener("change", function () {
        var en = !!t.checked;
        setModuleEnabled(cfg.type, en);
        toggleCardEnabled(cfg.card, cfg.m, cfg.p, en);
      });
    })(pairs[i]);
  }
}

// ------------------------------------------------------------
// Initial render + live refresh
// ------------------------------------------------------------
function renderInitial() {
  try {
    const counts = getDaily();
    refreshBars(counts);
    refreshCards(counts);
  } catch (e) { console.error("[counters.renderInitial]", e); }
}
function listenState() {
  on("sa:counts-updated", function (e) {
    try {
      var detail = e && e.detail ? e.detail : null;
      var counts = detail && detail.counts ? detail.counts : getDaily();
      refreshBars(counts);
      refreshCards(counts);
    } catch (err) { console.error("[counters.listener]", err); }
  });
  on("sa:modules-changed", function () {
    // réaligner l’état visuel des cartes (au cas où)
    setupToggles();
  });
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export function getTodayCounts() { return getDaily(); }
export function initCounters() {
  try {
    setupButtons();
    setupToggles();
    renderInitial();
    listenState();
    console.log("[counters] ✓ ready");
  } catch (e) { console.error("[counters.init]", e); }
}
