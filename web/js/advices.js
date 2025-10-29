// web/js/advices.js
// Carte “Conseil du jour” : chargement JSON (fallback interne),
// navigation ◀, pause ⏸ (toggle play/stop), personnalisation basique possible si besoin.
// Aucune dépendance forte : si settings/state indisponibles, on affiche une liste par défaut.

import { $ } from "./utils.js";
import { on as _on } from "./state.js";

const on = _on || ((evt, cb) => window.addEventListener(evt, e => cb(e.detail)));

let advices = [];
let idx = 0;
let timer = null;
let playing = true;

// Fallback local si fetch échoue
const FALLBACK = [
  "Buvez un verre d’eau et respirez 10 secondes avant d’allumer la prochaine cigarette.",
  "Marchez 3 minutes : micro-pause = micro-victoire.",
  "Notez votre dernière envie (0-10) : observer réduit déjà l’envie.",
  "Repoussez de 5 minutes : le délai casse l’automatisme.",
  "Une clope en moins aujourd’hui, c’est déjà une vraie économie demain."
];

// --- Chargement JSON (advices + resources facultatif) ---
async function loadAdvices() {
  try {
    const res = await fetch("./data/advices.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json();
    if (Array.isArray(list) && list.length) {
      advices = list;
      return;
    }
  } catch { /* noop */ }
  advices = FALLBACK.slice();
}

// --- Rendu ---
function showCurrent() {
  const el = $("#conseil-texte");
  if (!el) return;
  if (!advices.length) { el.textContent = "—"; return; }
  const a = advices[idx % advices.length];
  el.textContent = (typeof a === "string") ? a : (a && a.text) ? a.text : String(a);
}

// --- Lecture automatique ---
function startAuto() {
  stopAuto();
  timer = setInterval(() => {
    if (!playing) return;
    idx = (idx + 1) % (advices.length || 1);
    showCurrent();
  }, 8000);
}
function stopAuto() {
  if (timer) clearInterval(timer);
  timer = null;
}

// --- Actions UI ---
function bindControls() {
  const btnPrev  = $("#adv-prev");
  const btnPause = $("#adv-pause");
  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      if (!advices.length) return;
      idx = (idx - 1 + advices.length) % advices.length;
      showCurrent();
    });
  }
  if (btnPause) {
    btnPause.addEventListener("click", () => {
      playing = !playing;
      // changer l’icône ⏸/▶ en fonction de l’état
      btnPause.textContent = playing ? "⏸" : "▶";
    });
  }
}

// --- Personnalisation simple (facultatif) ---
// Ici on écoute les changements globaux, et on peut choisir une "catégorie" d’astuces.
// Par défaut, on garde la liste telle quelle (sans filtrer).
function bindPersonalizationHooks() {
  on("sa:counts-updated", () => {
    // Exemple minimal : rien à faire ici pour l’instant.
    // Tu pourras filtrer/surclasser 'advices' selon settings/habitudes si besoin.
  });
  on("sa:toggle-changed", () => { /* idem */ });
  on("sa:storage-imported", () => {
    // Après import, on réaffiche proprement
    idx = 0; showCurrent();
  });
}

// --- Entrée publique ---
export async function initAdvices() {
  await loadAdvices();
  bindControls();
  bindPersonalizationHooks();
  showCurrent();
  startAuto();
  console.log("[advices] ✓ ready");
}
