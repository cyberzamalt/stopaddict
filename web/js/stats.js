// web/js/counters.js
// STOPADDICT — Accueil : compteurs + toggles modules/sous-modules
// Rôle : gérer les +/− par catégorie (cigs, weed, beer, strong, liquor) et
// permettre l’activation/désactivation depuis l’Accueil (grisé = OFF mais réactivable).
// Dépendances : ./state.js

import {
  getSettings,
  setSettings,
  getDaily,
  addEntry,
} from "./state.js";

const $ = (sel, root = document) => root.querySelector(sel);

// Définition des segments attendus sur l’Accueil (tous sont optionnels : on ne casse pas si absents)
const SEGMENTS = [
  { kind: "cigs",   plus: "#cl-plus",     minus: "#cl-moins",     seg: "#seg-cigs",   toggle: "#toggle-cigs",   count: "#cl-count" },
  { kind: "weed",   plus: "#j-plus",      minus: "#j-moins",       seg: "#seg-weed",   toggle: "#toggle-weed",   count: "#j-count" },
  { kind: "beer",   plus: "#beer-plus",   minus: "#beer-moins",    seg: "#seg-beer",   toggle: "#toggle-beer",   count: "#beer-count" },
  { kind: "strong", plus: "#strong-plus", minus: "#strong-moins",  seg: "#seg-strong", toggle: "#toggle-strong", count: "#strong-count" },
  { kind: "liquor", plus: "#liquor-plus", minus: "#liquor-moins",  seg: "#seg-liquor", toggle: "#toggle-liquor", count: "#liquor-count" },
];

/* -------------------------- Helpers état -------------------------- */

function isKindEnabled(kind, s = getSettings()) {
  if (kind === "cigs")   return !!s.enable_cigs;
  if (kind === "weed")   return !!s.enable_weed;
  if (kind === "beer")   return !!s.enable_alcohol && !!s.enable_beer;
  if (kind === "strong") return !!s.enable_alcohol && !!s.enable_strong;
  if (kind === "liquor") return !!s.enable_alcohol && !!s.enable_liquor;
  return false;
}

function setKindEnabled(kind, on) {
  const s = getSettings();
  if (kind === "cigs")   return setSettings({ enable_cigs: !!on });
  if (kind === "weed")   return setSettings({ enable_weed: !!on });
  if (kind === "beer") {
    const patch = { enable_alcohol: !!(on || s.enable_strong || s.enable_liquor), enable_beer: !!on };
    // si on active un sous-module alcool, on force le global à ON
    if (on) patch.enable_alcohol = true;
    return setSettings(patch);
  }
  if (kind === "strong") {
    const patch = { enable_alcohol: !!(on || s.enable_beer || s.enable_liquor), enable_strong: !!on };
    if (on) patch.enable_alcohol = true;
    return setSettings(patch);
  }
  if (kind === "liquor") {
    const patch = { enable_alcohol: !!(on || s.enable_beer || s.enable_strong), enable_liquor: !!on };
    if (on) patch.enable_alcohol = true;
    return setSettings(patch);
  }
}

/* -------------------------- UI refresh --------------------------- */

function refreshCountsUI() {
  const rec = getDaily(new Date());
  const map = {
    cigs:   +rec.cigs   || 0,
    weed:   +rec.weed   || 0,
    beer:   +rec.beer   || 0,
    strong: +rec.strong || 0,
    liquor: +rec.liquor || 0,
  };
  SEGMENTS.forEach(({ kind, count }) => {
    const el = $(count);
    if (el) el.textContent = String(map[kind] ?? 0);
  });
}

function refreshSegmentsState() {
  const s = getSettings();
  SEGMENTS.forEach(({ kind, seg, plus, minus, toggle }) => {
    const enabled = isKindEnabled(kind, s);

    // Griser le segment si OFF (mais visible pour pouvoir réactiver)
    const container = $(seg);
    if (container) {
      container.classList.toggle("off", !enabled);
      container.setAttribute("aria-disabled", String(!enabled));
    }

    // Désactiver les +/− quand OFF
    const btnPlus  = $(plus);
    const btnMinus = $(minus);
    [btnPlus, btnMinus].forEach((b) => {
      if (!b) return;
      b.disabled = !enabled;
      b.setAttribute("aria-disabled", String(!enabled));
    });

    // Synchro des toggles Accueil si présents
    const chk = $(toggle);
    if (chk && chk.type === "checkbox") {
      if (kind === "beer" || kind === "strong" || kind === "liquor") {
        chk.checked = enabled; // reflète le sous-module
      } else {
        chk.checked = enabled;
      }
    }
  });
}

/* -------------------------- Bind events -------------------------- */

function bindPlusMinus() {
  SEGMENTS.forEach(({ kind, plus, minus }) => {
    const bPlus  = $(plus);
    const bMinus = $(minus);

    if (bPlus) {
      bPlus.addEventListener("click", () => {
        if (!isKindEnabled(kind)) return;          // OFF = no-op
        addEntry(kind, +1, new Date());
        refreshCountsUI();
        document.dispatchEvent(new CustomEvent("sa:counts-updated", { detail: { kind, delta: +1 } }));
      });
    }
    if (bMinus) {
      bMinus.addEventListener("click", () => {
        if (!isKindEnabled(kind)) return;
        addEntry(kind, -1, new Date());
        refreshCountsUI();
        document.dispatchEvent(new CustomEvent("sa:counts-updated", { detail: { kind, delta: -1 } }));
      });
    }
  });
}

function bindTogglesAccueil() {
  SEGMENTS.forEach(({ kind, toggle }) => {
    const chk = $(toggle);
    if (!chk || chk.type !== "checkbox") return;

    chk.addEventListener("change", (e) => {
      const on = !!e.target.checked;
      setKindEnabled(kind, on);

      // Si on vient de couper le dernier sous-module alcool → couper global alcool
      if ((kind === "beer" || kind === "strong" || kind === "liquor") && !on) {
        const s = getSettings();
        if (!s.enable_beer && !s.enable_strong && !s.enable_liquor) {
          setSettings({ enable_alcohol: false });
        }
      }

      refreshSegmentsState();
      document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "counters.toggle", kind, on } }));
    });
  });
}

/* -------------------------- API publique ------------------------- */

export async function initCounters() {
  // Mettre à jour l’état visuel initial (grisé/actif + valeurs)
  refreshSegmentsState();
  refreshCountsUI();

  // Attacher les écouteurs
  bindPlusMinus();
  bindTogglesAccueil();

  // Quand les réglages changent ailleurs (écran Réglages), resynchroniser l’Accueil
  document.addEventListener("sa:state-changed", () => {
    refreshSegmentsState();
    refreshCountsUI();
  });
}

export default { initCounters };
