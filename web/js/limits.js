// web/js/limits.js
// -----------------------------------------------------------------------------
// Limites quotidiennes :
// - Persiste les limites (clopes/joints/alcool) dans localStorage
// - Met à jour l'écran Habitudes (champs #limite-* existants)
// - Expose window.SA.limits pour que charts.js affiche les overlays
// - Déclenche "sa:limits:changed" à chaque modification
// -----------------------------------------------------------------------------


const LS_LIMITS = "app_limits_v23";

function loadLimits() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_LIMITS) || "null");
    if (v && typeof v === "object") {
      // Normalise les clés attendues
      return {
        cigs: Number(v.cigs || 0),
        weed: Number(v.weed || 0),
        alcohol_biere: Number(v.alcohol_biere || 0),
        alcohol_fort: Number(v.alcohol_fort || 0),
        alcohol_liqueur: Number(v.alcohol_liqueur || 0),
      };
    }
  } catch {}
  return {
    cigs: 20,
    weed: 3,
    alcohol_biere: 2,
    alcohol_fort: 1,
    alcohol_liqueur: 1,
  };
}

function saveLimits(lim) {
  try { localStorage.setItem(LS_LIMITS, JSON.stringify(lim)); } catch {}
  window.dispatchEvent(new Event("sa:limits:changed"));
}

// ----- API publique -----
function exposeAPI() {
  window.SA = window.SA || {};
  window.SA.limits = {
    get raw() { return loadLimits(); },

    // total quotidien pour la série "alcohol" (on additionne les sous-types)
    get alcoholDailyTotal() {
      const L = loadLimits();
      return Number(L.alcohol_biere||0) + Number(L.alcohol_fort||0) + Number(L.alcohol_liqueur||0);
    },

    /**
     * Valeurs de limite par "bucket" du graphe en fonction de l'échelle.
     * - range = "day"   : il y a 24 barres (une par heure) => limite/24
     * - range = "week"  : 7 barres (une par jour)         => limite/jour
     * - range = "month" : 28~31 barres (une par jour)     => limite/jour
     * Retourne un objet { cigs, weed, alcohol }
     */
    perBucket(range) {
      const L = loadLimits();
      const alc = this.alcoholDailyTotal;
      if (range === "day") {
        return {
          cigs: (Number(L.cigs||0))/24,
          weed: (Number(L.weed||0))/24,
          alcohol: (Number(alc||0))/24,
        };
      }
      // week / month => 1 barre = 1 jour
      return {
        cigs: Number(L.cigs||0),
        weed: Number(L.weed||0),
        alcohol: Number(alc||0),
      };
    },

    // setter partiel
    set(partial) {
      const cur = loadLimits();
      saveLimits({ ...cur, ...(partial||{}) });
    }
  };
}

// ----- Wiring écran Habitudes -----
function $(id){ return document.getElementById(id); }

function wireUI() {
  // Les inputs existent dans l’index fourni :
  // #limite-clopes, #limite-joints, #limite-biere, #limite-fort, #limite-liqueur
  const L = loadLimits();

  if ($("limite-clopes")) $("limite-clopes").value = L.cigs ?? 0;
  if ($("limite-joints")) $("limite-joints").value = L.weed ?? 0;
  if ($("limite-biere")) $("limite-biere").value = L.alcohol_biere ?? 0;
  if ($("limite-fort")) $("limite-fort").value = L.alcohol_fort ?? 0;
  if ($("limite-liqueur")) $("limite-liqueur").value = L.alcohol_liqueur ?? 0;

  const onChange = () => {
    const lim = {
      cigs: Number($("limite-clopes")?.value || 0),
      weed: Number($("limite-joints")?.value || 0),
      alcohol_biere: Number($("limite-biere")?.value || 0),
      alcohol_fort: Number($("limite-fort")?.value || 0),
      alcohol_liqueur: Number($("limite-liqueur")?.value || 0),
    };
    saveLimits(lim);
  };

  ["limite-clopes","limite-joints","limite-biere","limite-fort","limite-liqueur"]
    .forEach(id => $(id)?.addEventListener("input", onChange));
}

export function initLimits() {
  exposeAPI();
  wireUI();
  // Signal initial (utile si charts.js est déjà monté)
  window.dispatchEvent(new Event("sa:limits:changed"));
}
