// web/js/counters.js
// Compteurs Accueil + Modale Jour
// ✓ Fonctionne avec OU sans data-type sur les boutons.
//   - Si data-type existe, on l'utilise.
//   - Sinon, on mappe les IDs connus (cl-plus, j-plus, a-plus, …).

import { addEntry, removeOneToday } from "./state.js";

// --- Utilitaires ---
function notifyDataChanged() {
  // Laisse les autres modules (stats/charts/limits) se rafraîchir
  try {
    window.dispatchEvent(new CustomEvent("sa:data-changed"));
  } catch {}
}

function byId(id) { return document.getElementById(id); }

// Map d’IDs → type de consommation
const ID_TO_TYPE = {
  // Accueil
  "cl-plus":    "cigs",
  "cl-moins":   "cigs",
  "j-plus":     "weed",
  "j-moins":    "weed",
  "a-plus":     "alcohol",
  "a-moins":    "alcohol",

  // Modale calendrier (jour)
  "cal-cl-plus":"cigs",
  "cal-cl-moins":"cigs",
  "cal-j-plus":"weed",
  "cal-j-moins":"weed",
  "cal-a-plus":"alcohol",
  "cal-a-moins":"alcohol",
};

// Applique l’incrément/décrément
function applyDelta(type, delta) {
  if (!type || !Number.isFinite(delta) || delta === 0) return;
  try {
    if (delta > 0) {
      addEntry(type, +delta);
    } else {
      // on répète removeOneToday |delta| fois (sécurité)
      for (let i = 0; i < Math.abs(delta); i++) removeOneToday(type);
    }
    notifyDataChanged();
    showSnack("Action enregistrée");
  } catch (e) {
    console.error("[counters] applyDelta error:", e);
    showSnack("Erreur");
  }
}

// Snackbar (déjà présente dans index)
let snackTimer = null;
function showSnack(msg) {
  const bar = byId("snackbar");
  if (!bar) return;
  bar.innerHTML = `${msg} — <a href="#" id="undo-link">Annuler</a>`;
  bar.classList.add("show");
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => bar.classList.remove("show"), 2500);

  // Optionnel : l’annulation retire la dernière entrée ajoutée (si delta positif)
  const undo = byId("undo-link");
  if (undo) {
    undo.onclick = (ev) => {
      ev.preventDefault();
      // Naïf : on retire une unité de chaque type connu (dernier ajout non tracé ici)
      // Si tu as un mécanisme d'historique précis, branche-le ici.
      try { removeOneToday("cigs"); } catch {}
      try { removeOneToday("weed"); } catch {}
      try { removeOneToday("alcohol"); } catch {}
      notifyDataChanged();
      bar.classList.remove("show");
    };
  }
}

// Gestion d’un clic sur un bouton +/-
// 1) On tente via data-type
// 2) Sinon, on mappe via l’ID
function handleButtonClick(btn, isPlus) {
  const dataType = btn?.dataset?.type;
  const id = btn?.id || "";
  let type = dataType || ID_TO_TYPE[id] || null;
  if (!type) {
    // Essai “intelligent” via préfixe d’ID (compat divers index)
    if (/^cl-/.test(id) || /^cal-cl-/.test(id)) type = "cigs";
    else if (/^j-/.test(id) || /^cal-j-/.test(id)) type = "weed";
    else if (/^a-/.test(id) || /^cal-a-/.test(id)) type = "alcohol";
  }
  applyDelta(type, isPlus ? +1 : -1);
}

// Attache listeners aux boutons +/-
function bindPlusMinus(root = document) {
  // Tous les boutons ronds
  const nodes = root.querySelectorAll("button.btn-round");
  nodes.forEach((btn) => {
    // déjà bindé ?
    if (btn.__saBound) return;
    btn.__saBound = true;

    // className peut contenir "btn-plus" ou "btn-minus"
    const cls = btn.classList;
    if (cls.contains("btn-plus")) {
      btn.addEventListener("click", () => handleButtonClick(btn, true));
    } else if (cls.contains("btn-minus")) {
      btn.addEventListener("click", () => handleButtonClick(btn, false));
    }
  });
}

// Init segments horaires (clopes/alcool) si présents (clic = +1)
function bindSegments() {
  const segCl = byId("seg-clopes");
  if (segCl && !segCl.__saSegBound) {
    segCl.__saSegBound = true;
    segCl.addEventListener("click", (ev) => {
      const target = ev.target;
      if (target && target.classList?.contains("seg")) {
        applyDelta("cigs", +1);
      }
    });
  }
  const segA = byId("seg-alcool");
  if (segA && !segA.__saSegBound) {
    segA.__saSegBound = true;
    segA.addEventListener("click", (ev) => {
      const target = ev.target;
      if (target && target.classList?.contains("seg")) {
        applyDelta("alcohol", +1);
      }
    });
  }
}

// Exposé public
export function initCounters() {
  try {
    bindPlusMinus(document);
    bindSegments();

    // si du contenu dynamique est injecté plus tard (modales), on rebinde
    document.addEventListener("sa:ui:rebinding", () => {
      bindPlusMinus(document);
      bindSegments();
    });
  } catch (e) {
    console.error("[counters] init error:", e);
  }
}
