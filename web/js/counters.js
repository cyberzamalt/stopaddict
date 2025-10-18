// web/js/counters.js
// Compteurs Accueil + Modale Jour
// ✓ Fonctionne avec OU sans data-type sur les boutons.
//   - Si data-type existe, on l'utilise.
//   - Sinon, on mappe les IDs connus (cl-plus, j-plus, a-plus, …).
// ✓ Undo correct : annule UNIQUEMENT la toute dernière action (type + delta).

import { addEntry, removeOneToday } from "./state.js";

// --- Utilitaires DOM ---
function byId(id) { return document.getElementById(id); }

// --- Snackbar ---
let snackTimer = null;
let lastAction = null; // { type: "cigs"|"weed"|"alcohol", delta: number }

function showSnack(msg) {
  const bar = byId("snackbar");
  if (!bar) return;
  bar.innerHTML = `${msg} — <a href="#" id="undo-link">Annuler</a>`;
  bar.classList.add("show");
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => bar.classList.remove("show"), 2500);

  const undo = byId("undo-link");
  if (undo) {
    undo.onclick = (ev) => {
      ev.preventDefault();
      handleUndo();
      bar.classList.remove("show");
    };
  }
}

function handleUndo() {
  // Annule UNIQUEMENT la toute dernière action
  const a = lastAction;
  if (!a || !a.type || !Number.isFinite(a.delta) || a.delta === 0) return;

  try {
    if (a.delta > 0) {
      // on a ajouté -> on retire la même quantité
      for (let i = 0; i < a.delta; i++) removeOneToday(a.type);
    } else {
      // on a retiré -> on ré-ajoute la même quantité
      addEntry(a.type, Math.abs(a.delta));
    }
    // Considère l’undo comme action à part entière ? Ici on réinitialise.
    lastAction = null;
    notifyDataChanged();
    showSnack("Dernière action annulée");
  } catch (e) {
    console.error("[counters] undo error:", e);
    showSnack("Erreur lors de l'annulation");
  }
}

// --- Notification cross-modules ---
function notifyDataChanged() {
  try {
    window.dispatchEvent(new CustomEvent("sa:data-changed"));
  } catch {}
}

// --- Map d’IDs → type de consommation (fallback si pas de data-type) ---
const ID_TO_TYPE = {
  // Accueil
  "cl-plus":     "cigs",
  "cl-moins":    "cigs",
  "j-plus":      "weed",
  "j-moins":     "weed",
  "a-plus":      "alcohol",
  "a-moins":     "alcohol",

  // Modale calendrier (jour)
  "cal-cl-plus":  "cigs",
  "cal-cl-moins": "cigs",
  "cal-j-plus":   "weed",
  "cal-j-moins":  "weed",
  "cal-a-plus":   "alcohol",
  "cal-a-moins":  "alcohol",
};

// --- Application d’un delta ---
function applyDelta(type, delta) {
  if (!type || !Number.isFinite(delta) || delta === 0) return;

  try {
    if (delta > 0) {
      addEntry(type, delta);
    } else {
      // on répète removeOneToday |delta| fois
      for (let i = 0; i < Math.abs(delta); i++) removeOneToday(type);
    }
    // On trace précisément la dernière action (pour Undo)
    lastAction = { type, delta };

    notifyDataChanged();
    showSnack("Action enregistrée");
  } catch (e) {
    console.error("[counters] applyDelta error:", e);
    showSnack("Erreur");
  }
}

// --- Résolution type depuis bouton ---
// 1) via data-type si présent
// 2) via ID connu
// 3) via pattern d’ID (“cl-”, “j-”, “a-” et variantes modale “cal-”)
function getTypeFromButton(btn) {
  if (!btn) return null;
  const dataType = btn.dataset?.type;
  if (dataType) return dataType;

  const id = btn.id || "";
  if (ID_TO_TYPE[id]) return ID_TO_TYPE[id];

  if (/^cl-/.test(id) || /^cal-cl-/.test(id)) return "cigs";
  if (/^j-/.test(id)  || /^cal-j-/.test(id))  return "weed";
  if (/^a-/.test(id)  || /^cal-a-/.test(id))  return "alcohol";

  return null;
}

// --- Gestion clic +/- ---
function handleButtonClick(btn, isPlus) {
  const type = getTypeFromButton(btn);
  applyDelta(type, isPlus ? +1 : -1);
}

// --- Bind des boutons +/− ---
function bindPlusMinus(root = document) {
  const nodes = root.querySelectorAll("button.btn-round");
  nodes.forEach((btn) => {
    if (btn.__saBound) return;
    btn.__saBound = true;

    const cls = btn.classList;
    if (cls.contains("btn-plus")) {
      btn.addEventListener("click", () => handleButtonClick(btn, true));
    } else if (cls.contains("btn-minus")) {
      btn.addEventListener("click", () => handleButtonClick(btn, false));
    }
  });
}

// --- Segments horaires (clopes/alcool) : clic = +1 ---
function bindSegments() {
  const segCl = byId("seg-clopes");
  if (segCl && !segCl.__saSegBound) {
    segCl.__saSegBound = true;
    segCl.addEventListener("click", (ev) => {
      const t = ev.target;
      if (t && t.classList?.contains("seg")) applyDelta("cigs", +1);
    });
  }
  const segA = byId("seg-alcool");
  if (segA && !segA.__saSegBound) {
    segA.__saSegBound = true;
    segA.addEventListener("click", (ev) => {
      const t = ev.target;
      if (t && t.classList?.contains("seg")) applyDelta("alcohol", +1);
    });
  }
}

// --- API publique ---
export function initCounters() {
  try {
    bindPlusMinus(document);
    bindSegments();

    // Si du contenu dynamique est injecté plus tard (ex. ouverture modale jour), on rebinde
    document.addEventListener("sa:ui:rebinding", () => {
      bindPlusMinus(document);
      bindSegments();
    });
  } catch (e) {
    console.error("[counters] init error:", e);
  }
}
