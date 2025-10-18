// web/js/counters.js
import { addEntry, removeOneToday, on, emit } from "./state.js";
import { $, formatDate } from "./utils.js";

let lastAction = null; // { type: "cigs"|"weed"|"alcohol", delta: +1|-1, ts: number }

/** Mappe un id de bouton (+/-) vers le type logique attendu par state.js */
function typeFromButtonId(id) {
  if (!id) return null;
  // Schémas tolérés : cl-plus / cl-moins / c-plus / c-moins
  //                   j-plus  / j-moins
  //                   a-plus  / a-moins
  const low = id.toLowerCase();
  if (low.startsWith("cl-") || low.startsWith("c-")) return "cigs";
  if (low.startsWith("j-")) return "weed";
  if (low.startsWith("a-")) return "alcohol";
  return null;
}

/** Détermine le type soit via data-type, soit via l’ID du bouton */
function resolveType(btn) {
  // 1) si l’attribut data-type est présent, on le prend
  const dt = btn?.dataset?.type;
  if (dt === "cigs" || dt === "weed" || dt === "alcohol") return dt;

  // 2) sinon on infère depuis l’ID
  return typeFromButtonId(btn?.id);
}

function applyDelta(type, delta) {
  if (!type || !Number.isInteger(delta) || delta === 0) return;

  if (delta > 0) addEntry(type, delta);
  else if (delta < 0) removeOneToday(type);

  lastAction = { type, delta, ts: Date.now() };

  // Snackbar “Annuler”
  const bar = $("#snackbar");
  const undo = $("#undo-link");
  if (bar && undo) {
    bar.classList.add("show");
    // auto-hide après 3.5s
    window.clearTimeout(bar._hideTimer);
    bar._hideTimer = setTimeout(() => bar.classList.remove("show"), 3500);
  }

  emit("counters:updated", { type, delta });
}

/** Gestion du clic sur le lien “Annuler” (dernier mouvement uniquement) */
function handleUndo(e) {
  e?.preventDefault?.();
  const bar = $("#snackbar");
  if (!lastAction) return;
  const { type, delta } = lastAction;

  // On inverse : si dernier mouvement était +1, on retire 1 ; si −1, on remet +1
  if (delta > 0) removeOneToday(type);
  else if (delta < 0) addEntry(type, Math.abs(delta));

  lastAction = null;
  if (bar) bar.classList.remove("show");
  emit("counters:updated", { type, delta: -delta, undo: true });
}

/** Branche tous les boutons +1 / −1 sur l’écran d’accueil */
function bindHomeButtons() {
  // Tous les boutons ronds
  document.querySelectorAll(".btn-round").forEach((btn) => {
    btn.addEventListener("click", () => {
      // +1 ?
      if (btn.classList.contains("btn-plus") || btn.classList.contains("plus")) {
        const type = resolveType(btn);
        if (type) applyDelta(type, +1);
        return;
      }
      // −1 ?
      if (btn.classList.contains("btn-minus") || btn.classList.contains("minus")) {
        const type = resolveType(btn);
        if (type) applyDelta(type, -1);
      }
    });
  });

  // Lien Annuler
  $("#undo-link")?.addEventListener("click", handleUndo);
}

/** Branche les boutons de la modale “Calendrier > Jour” */
function bindCalendarDay() {
  $("#cal-cl-plus")?.addEventListener("click", () => applyDelta("cigs", +1));
  $("#cal-cl-moins")?.addEventListener("click", () => applyDelta("cigs", -1));

  $("#cal-j-plus")?.addEventListener("click", () => applyDelta("weed", +1));
  $("#cal-j-moins")?.addEventListener("click", () => applyDelta("weed", -1));

  $("#cal-a-plus")?.addEventListener("click", () => applyDelta("alcohol", +1));
  $("#cal-a-moins")?.addEventListener("click", () => applyDelta("alcohol", -1));
}

/** Met à jour les petits totaux de l’entête (jour courant) si l’app expose ces IDs */
function updateQuickStats(s) {
  const { today } = s || {};
  if (!today) return;
  $("#stat-clopes-jr") && ($("#stat-clopes-jr").textContent = today.cigs ?? 0);
  $("#stat-joints-jr") && ($("#stat-joints-jr").textContent = today.weed ?? 0);
  $("#stat-alcool-jr") && ($("#stat-alcool-jr").textContent = today.alcohol ?? 0);
  $("#stat-cout-jr") && ($("#stat-cout-jr").textContent = (today.cost ?? 0) + "€");
}

/** Init public */
export function initCounters() {
  bindHomeButtons();
  bindCalendarDay();

  // Si la page gère des “segments horaires”, d’autres modules les rempliront ;
  // on se contente d’écouter les mises à jour pour rafraîchir l’entête.
  on("state:changed", (s) => updateQuickStats(s));
  on("economy:recomputed", () => emit("charts:refresh"));
  // première passe éventuelle
  emit("request:state:ping");
}
