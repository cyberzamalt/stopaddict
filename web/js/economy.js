// web/js/economy.js
// -----------------------------------------------------------------------------
// Coût & économies :
// - Injecte un petit panneau "💶 Prix & Économies" dans l'écran Habitudes (dynamiquement)
//   sans toucher à ton HTML.
// - Stocke les prix unitaires, + un toggle "Inclure coût/économies dans les stats".
// - Fournit window.SA.economy pour que charts.js calcule la série "Coût".
// - Déclenche "sa:economy:changed" quand on modifie les prix/toggle.
// - Export/Import compatibles via la clé localStorage "app_prices_v23" (déjà gérée dans export.js).
// - UTILISE calculateDayCost() de state.js pour cohérence avec les autres modules
// -----------------------------------------------------------------------------

import { calculateDayCost } from "./state.js";

const LS_PRICES = "app_prices_v23";
const LS_BASELINE = "app_baseline_v23";

function loadPrices() {
  console.log("[Economy] Chargement des prix...");
  try {
    const v = JSON.parse(localStorage.getItem(LS_PRICES) || "null");
    if (v && typeof v === "object") {
      console.log("[Economy] Prix chargés:", v);
      return v;
    }
  } catch (err) {
    console.error("[Economy] Erreur chargement prix:", err);
  }
  // valeurs par défaut = 0 (pas de coût tant que non saisi)
  const defaultPrices = {
    enabled: true,                  // inclure le coût dans les stats/graphiques
    cigs: 0,                        // € par cigarette
    weed: 0,                        // € par joint (ou unité que tu enregistres)
    // alcool : trois sous-types possibles, mais on additionne au même compteur "alcohol"
    alcohol_biere: 0,               // € par bière
    alcohol_fort: 0,                // € par alcool fort / shot
    alcohol_liqueur: 0,             // € par liqueur / verre
  };
  console.log("[Economy] Utilisation prix par défaut (zéro)");
  return defaultPrices;
}

function savePrices(p) {
  console.log("[Economy] Sauvegarde des prix:", p);
  try { 
    localStorage.setItem(LS_PRICES, JSON.stringify(p)); 
    console.log("[Economy] Prix sauvegardés avec succès");
  } catch (err) {
    console.error("[Economy] Erreur sauvegarde prix:", err);
  }
  try {
    window.dispatchEvent(new Event("sa:economy:changed"));
    console.log("[Economy] Événement 'sa:economy:changed' émis");
  } catch (err) {
    console.error("[Economy] Erreur émission événement:", err);
  }
}

function loadBaseline() {
  console.log("[Economy] Chargement baseline...");
  try {
    const v = JSON.parse(localStorage.getItem(LS_BASELINE) || "null");
    if (v && typeof v === "object") {
      console.log("[Economy] Baseline chargée:", v);
      return v;
    }
  } catch (err) {
    console.error("[Economy] Erreur chargement baseline:", err);
  }
  const defaultBaseline = {
    cigs: 0,
    weed: 0,
    beer: 0,
    strong: 0,
    liquor: 0
  };
  console.log("[Economy] Utilisation baseline par défaut (zéro)");
  return defaultBaseline;
}

function saveBaseline(b) {
  console.log("[Economy] Sauvegarde baseline:", b);
  try {
    localStorage.setItem(LS_BASELINE, JSON.stringify(b));
    console.log("[Economy] Baseline sauvegardée avec succès");
  } catch (err) {
    console.error("[Economy] Erreur sauvegarde baseline:", err);
  }
}

// Calcule le coût d'une liste d'entrées brutes [{ts,type,qty}]
// UTILISE calculateDayCost() pour cohérence
function costFor(entries) {
  console.log("[Economy] Calcul coût pour", entries.length, "entrées");
  try {
    const P = loadPrices();
    if (!P.enabled) {
      console.log("[Economy] Économies désactivées, retour 0");
      return 0;
    }

    // Convertir entries en format day pour calculateDayCost
    const day = {
      cigs: 0,
      weed: 0,
      beer: 0,
      strong: 0,
      liquor: 0
    };

    for (const e of entries) {
      const qty = Number(e.qty || 1);
      if (e.type === "cigs") {
        day.cigs += qty;
      } else if (e.type === "weed") {
        day.weed += qty;
      } else if (e.type === "alcohol") {
        // l'historique ne précise pas le sous-type (bière/fort/liqueur),
        // donc on utilise beer par défaut pour la cohérence
        day.beer += qty;
      }
    }

    const total = calculateDayCost(day);
    console.log("[Economy] Coût calculé:", total, "€");
    return total;
  } catch (err) {
    console.error("[Economy] Erreur calcul coût:", err);
    return 0;
  }
}

// Calcul économies réalisées vs baseline
function calculateSavings(currentDay) {
  console.log("[Economy] Calcul économies vs baseline");
  try {
    const baseline = loadBaseline();
    const P = loadPrices();
    
    if (!P.enabled) {
      console.log("[Economy] Économies désactivées");
      return 0;
    }

    // Coût baseline
    const baselineCost = calculateDayCost(baseline);
    console.log("[Economy] Coût baseline:", baselineCost, "€");

    // Coût actuel
    const currentCost = calculateDayCost(currentDay);
    console.log("[Economy] Coût actuel:", currentCost, "€");

    const savings = baselineCost - currentCost;
    console.log("[Economy] Économies:", savings, "€");
    
    return Math.round(savings * 100) / 100;
  } catch (err) {
    console.error("[Economy] Erreur calcul économies:", err);
    return 0;
  }
}

// UI injection (dans #ecran-habitudes)
function injectPanel() {
  console.log("[Economy] Injection panneau UI...");
  try {
    const host = document.getElementById("ecran-habitudes");
    if (!host) {
      console.warn("[Economy] #ecran-habitudes non trouvé");
      return;
    }

    if (document.getElementById("eco-card")) {
      console.log("[Economy] Panneau déjà injecté");
      return;
    }

    const card = document.createElement("div");
    card.className = "card";
    card.id = "eco-card";
    card.innerHTML = `
      <div class="section-title">💶 Prix & Économies</div>
      <div class="grid-2">
        <div class="param"><label>Inclure coût/économies</label><input type="checkbox" id="eco-enabled"></div>
        <div class="param hint">Si coché, la série "Coût" apparaît dans les stats et le total coût jour/sem./mois est calculé.</div>

        <div class="param"><label>Prix par cigarette (€)</label><input type="number" step="0.01" min="0" id="eco-cigs"></div>
        <div class="param"><label>Prix par joint (€)</label><input type="number" step="0.01" min="0" id="eco-weed"></div>

        <div class="param"><label>Prix bière (€)</label><input type="number" step="0.01" min="0" id="eco-biere"></div>
        <div class="param"><label>Prix alcool fort (€)</label><input type="number" step="0.01" min="0" id="eco-fort"></div>
        <div class="param"><label>Prix liqueur (€)</label><input type="number" step="0.01" min="0" id="eco-liqueur"></div>
        <div class="param hint">Ces valeurs servent à estimer le coût de vos consommations et vos économies.</div>
      </div>

      <div class="section-title" style="margin-top:20px">📊 Baseline (consommation de référence)</div>
      <div class="grid-2">
        <div class="param"><label>Cigarettes/jour baseline</label><input type="number" step="1" min="0" id="eco-base-cigs"></div>
        <div class="param"><label>Joints/jour baseline</label><input type="number" step="1" min="0" id="eco-base-weed"></div>
        <div class="param"><label>Bières/jour baseline</label><input type="number" step="1" min="0" id="eco-base-beer"></div>
        <div class="param"><label>Alcool fort/jour baseline</label><input type="number" step="1" min="0" id="eco-base-strong"></div>
        <div class="param"><label>Liqueur/jour baseline</label><input type="number" step="1" min="0" id="eco-base-liquor"></div>
        <div class="param hint">Votre consommation habituelle avant réduction. Permet de calculer les économies.</div>
      </div>

      <button class="btn small" id="eco-save" type="button" style="margin-top:10px">Enregistrer</button>
    `;
    host.appendChild(card);
    console.log("[Economy] Panneau UI injecté");

    const P = loadPrices();
    const B = loadBaseline();
    
    // set values
    const $ = (id) => document.getElementById(id);
    $("eco-enabled").checked = !!P.enabled;
    $("eco-cigs").value = P.cigs ?? 0;
    $("eco-weed").value = P.weed ?? 0;
    $("eco-biere").value = P.alcohol_biere ?? 0;
    $("eco-fort").value = P.alcohol_fort ?? 0;
    $("eco-liqueur").value = P.alcohol_liqueur ?? 0;

    $("eco-base-cigs").value = B.cigs ?? 0;
    $("eco-base-weed").value = B.weed ?? 0;
    $("eco-base-beer").value = B.beer ?? 0;
    $("eco-base-strong").value = B.strong ?? 0;
    $("eco-base-liquor").value = B.liquor ?? 0;

    console.log("[Economy] Valeurs chargées dans le formulaire");

    $("eco-save").addEventListener("click", () => {
      console.log("[Economy] Clic sur Enregistrer");
      try {
        const n = (id) => Number($(id).value || 0);
        const enabled = !!$("eco-enabled").checked;
        
        const np = {
          enabled,
          cigs: n("eco-cigs"),
          weed: n("eco-weed"),
          alcohol_biere: n("eco-biere"),
          alcohol_fort: n("eco-fort"),
          alcohol_liqueur: n("eco-liqueur"),
        };
        
        const nb = {
          cigs: n("eco-base-cigs"),
          weed: n("eco-base-weed"),
          beer: n("eco-base-beer"),
          strong: n("eco-base-strong"),
          liquor: n("eco-base-liquor")
        };

        savePrices(np);
        saveBaseline(nb);
        showSnack("Paramètres économies enregistrés.");
      } catch (err) {
        console.error("[Economy] Erreur lors de l'enregistrement:", err);
        showSnack("Erreur lors de l'enregistrement.");
      }
    });

  } catch (err) {
    console.error("[Economy] Erreur injection panneau:", err);
  }
}

function showSnack(msg) {
  console.log("[Economy] Snackbar:", msg);
  try {
    const bar = document.getElementById("snackbar");
    if (!bar) { 
      alert(msg); 
      return; 
    }
    bar.firstChild && (bar.firstChild.textContent = msg + " — ");
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 2000);
  } catch (err) {
    console.error("[Economy] Erreur affichage snackbar:", err);
    alert(msg);
  }
}

// Expose API publique
function exposeAPI() {
  console.log("[Economy] Exposition API publique...");
  try {
    window.SA = window.SA || {};
    window.SA.economy = {
      get prices() { return loadPrices(); },
      set prices(p) { savePrices({ ...loadPrices(), ...(p || {}) }); },
      setEnabled(v) { 
        const p = loadPrices(); 
        p.enabled = !!v; 
        savePrices(p); 
      },
      costFor,                      // costFor(entries[])
      calculateSavings,             // calculateSavings(currentDay)
      get baseline() { return loadBaseline(); },
      set baseline(b) { saveBaseline({ ...loadBaseline(), ...(b || {}) }); }
    };
    console.log("[Economy] API window.SA.economy exposée");
  } catch (err) {
    console.error("[Economy] Erreur exposition API:", err);
  }
}

// Entrée publique
export function initEconomy() {
  console.log("[Economy] ========== Initialisation module Economy ==========");
  try {
    injectPanel();
    exposeAPI();
    console.log("[Economy] ========== Initialisation terminée ==========");
  } catch (err) {
    console.error("[Economy] ========== ERREUR INITIALISATION ==========", err);
  }
}
