// web/js/settings.js
// Gère : navigation bas, (dé)activation “je fume/bois” sur l’accueil.
// Ne gère PAS la modale 18+ (uniquement dans app.js).

import { emit } from "./state.js";

function showScreen(id) {
  document.querySelectorAll(".ecran").forEach(el => el.classList.remove("show"));
  const sc = document.getElementById(id);
  if (sc) sc.classList.add("show");
}

function setActiveNav(btnId) {
  document.querySelectorAll(".nav button").forEach(b => b.classList.remove("actif"));
  const b = document.getElementById(btnId);
  if (b) b.classList.add("actif");
}

function wireNav() {
  const map = [
    ["nav-principal",   "ecran-principal"],
    ["nav-stats",       "ecran-stats"],
    ["nav-calendrier",  "ecran-calendrier"],
    ["nav-habitudes",   "ecran-habitudes"],
    // “nav-params” ouvre souvent une modale pages ; on laisse tel quel si présent ailleurs
  ];
  for (const [btnId, screenId] of map) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    btn.addEventListener("click", () => {
      showScreen(screenId);
      setActiveNav(btnId);
      // Informer le reste de l’app (charts, etc.)
      emit("ui:screen", { id: screenId });
    });
  }
}

/**
 * (Dé)activation de modules sur l’accueil
 * Stratégie : on NE MASQUE PAS la carte complète (sinon on ne peut plus réactiver).
 * On la grise et on désactive ses boutons, mais on laisse la case accessible.
 */
function applyModuleState(card, enabled) {
  if (!card) return;
  // Style visuel
  card.style.opacity = enabled ? "1" : "0.5";

  // Désactiver les boutons d’action & segments, MAIS PAS la checkbox
  card.querySelectorAll(".btn-round, .seg").forEach(el => {
    // Ne pas désactiver le toggle lui-même
    if (el.matches("input[type=checkbox], label.mini-toggle, .mini-toggle *")) return;
    el.setAttribute("tabindex", enabled ? "0" : "-1");
    if (enabled) {
      el.style.pointerEvents = "";
      el.setAttribute("aria-disabled", "false");
    } else {
      el.style.pointerEvents = "none";
      el.setAttribute("aria-disabled", "true");
    }
  });
}

function wireModuleToggles() {
  const defs = [
    { chk: "toggle-cigs",  card: null }, // trouver via l’input
    { chk: "toggle-weed",  card: null },
    { chk: "toggle-alcool", card: null },
  ];

  defs.forEach(d => {
    const input = document.getElementById(d.chk);
    if (!input) return;
    // remonter à la .card la plus proche
    const card = input.closest(".card");
    d.card = card;

    // État initial (checked par défaut dans le HTML)
    applyModuleState(card, !!input.checked);

    input.addEventListener("change", () => {
      const on = !!input.checked;
      applyModuleState(card, on);
      emit("state:settings", { module: d.chk, enabled: on });
    });
  });
}

export function initSettings() {
  try { wireNav(); } catch (e) { console.error("[Settings] nav error:", e); }
  try { wireModuleToggles(); } catch (e) { console.error("[Settings] toggles error:", e); }
}
