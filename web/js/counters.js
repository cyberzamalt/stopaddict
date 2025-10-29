// web/js/counters.js
// Gestion des compteurs de l'écran Accueil : +/−, toggles (désactiver sans masquer),
// synchro avec l'état global et bandeau "stats rapides".
// Ne contient pas de logique métier de calcul (coûts, économies) : on s’appuie sur state.js.

import { $, $$ } from "./utils.js";
import {
  // Ces fonctions peuvent ne pas toutes exister selon ta version de state.js :
  on as _on, emit as _emit,
  adjustCount as _adjustCount,
  getTodayTotals as _getTodayTotals
} from "./state.js";

// --- Safe bus ---
const on   = _on   || ((evt, cb) => window.addEventListener(evt, e => cb(e.detail)));
const emit = _emit || ((evt, detail) => window.dispatchEvent(new CustomEvent(evt, { detail })));

// --- Si state n’expose pas getTodayTotals, on reconstruit un fallback minimal depuis un cache local ---
let _shadow = { cigs: 0, weed: 0, alcohol: 0, cost: 0 };
function getTotals() {
  try {
    const t = _getTodayTotals?.();
    if (t && typeof t === "object") return t;
  } catch { /* noop */ }
  return _shadow;
}
function adjust(kind, delta) {
  // 1) Essayer la vraie fonction de state.js
  if (typeof _adjustCount === "function") {
    _adjustCount(kind, delta);
    return;
  }
  // 2) Fallback: on fait suivre un événement à state.js (ou on garde ombre locale)
  emit("sa:counter-adjust", { kind, delta });
  // Ombre locale pour garder l'UI vivante si state n’écoute pas (jamais bloquant)
  if (typeof _shadow[kind] === "number") {
    _shadow[kind] = Math.max(0, _shadow[kind] + (delta || 0));
    emit("sa:counts-updated", { ..._shadow });
  }
}

// --- UI helpers ---
function setDisabled(nodeList, disabled) {
  (Array.isArray(nodeList) ? nodeList : [nodeList]).forEach(btn => {
    if (btn) btn.disabled = !!disabled;
  });
}
function text(el, v) {
  if (el) el.textContent = String(v);
}

// --- Rendu des stats rapides en haut de page ---
function renderQuickStats(tot = getTotals()) {
  text($("#bar-clopes"),  tot.cigs ?? 0);
  text($("#bar-joints"),  tot.weed ?? 0);
  text($("#bar-alcool"),  tot.alcohol ?? 0);
  // Coût du jour si fourni par state ; sinon on laisse tel quel
  if (typeof tot.cost === "number" && $("#stat-cout-jr")) {
    $("#stat-cout-jr").textContent = (Math.round(tot.cost * 100) / 100).toLocaleString() + "€";
  }
  // Cartes Accueil
  text($("#note-cigs"),   tot.cigs ?? 0);
  text($("#note-weed"),   tot.weed ?? 0);
  text($("#note-alcool"), tot.alcohol ?? 0);
}

// --- Toggles: on désactive les boutons associés mais on ne masque jamais la carte ---
function bindToggles() {
  const map = [
    {
      cb: $("#toggle-cigs"),
      plus: $("#cl-plus"), minus: $("#cl-moins")
    },
    {
      cb: $("#toggle-weed"),
      plus: $("#j-plus"), minus: $("#j-moins")
    },
    {
      cb: $("#toggle-alcool"),
      plus: $("#a-plus"), minus: $("#a-moins")
    }
  ];

  map.forEach(({ cb, plus, minus }) => {
    if (!cb) return;
    const apply = () => {
      const dis = !cb.checked;
      setDisabled([plus, minus], dis);
      // Propager aux autres modules intéressés (stats, charts, conseils…)
      emit("sa:toggle-changed", {
        target: cb.id,
        enabled: cb.checked
      });
      // Sauvegarde simple des toggles pour persister
      try {
        const raw = localStorage.getItem("sa:toggles");
        const obj = raw ? JSON.parse(raw) : {};
        obj[cb.id] = !!cb.checked;
        localStorage.setItem("sa:toggles", JSON.stringify(obj));
      } catch { /* noop */ }
    };
    apply();
    cb.addEventListener("change", apply);
  });

  // Hydratation initiale depuis localStorage (si dispo)
  try {
    const obj = JSON.parse(localStorage.getItem("sa:toggles") || "{}");
    if (obj["toggle-cigs"]  != null && $("#toggle-cigs"))  $("#toggle-cigs").checked  = !!obj["toggle-cigs"];
    if (obj["toggle-weed"]  != null && $("#toggle-weed"))  $("#toggle-weed").checked  = !!obj["toggle-weed"];
    if (obj["toggle-alcool"]!= null && $("#toggle-alcool"))$("#toggle-alcool").checked = !!obj["toggle-alcool"];
  } catch { /* noop */ }
}

// --- Boutons +/− ---
function bindPlusMinus() {
  const pairs = [
    { plus: "#cl-plus", minus: "#cl-moins", kind: "cigs",    toggle: "#toggle-cigs" },
    { plus: "#j-plus",  minus: "#j-moins",  kind: "weed",    toggle: "#toggle-weed" },
    { plus: "#a-plus",  minus: "#a-moins",  kind: "alcohol", toggle: "#toggle-alcool" },
  ];
  pairs.forEach(({ plus, minus, kind, toggle }) => {
    const btnP = $(plus), btnM = $(minus), cb = $(toggle);
    if (btnP) btnP.addEventListener("click", () => {
      if (cb && !cb.checked) return;
      adjust(kind, +1);
    });
    if (btnM) btnM.addEventListener("click", () => {
      if (cb && !cb.checked) return;
      adjust(kind, -1);
    });
  });
}

// --- Abonnements aux événements globaux (state) ---
function bindStateListeners() {
  on("sa:counts-updated", totals => { renderQuickStats(totals); });
  on("sa:storage-imported", () => { renderQuickStats(getTotals()); });
}

// --- Entrée publique ---
export function initCounters() {
  bindToggles();
  bindPlusMinus();
  bindStateListeners();
  // Rendu initial
  renderQuickStats(getTotals());
  console.log("[counters] ✓ ready");
}
