// web/js/economy.js
// -----------------------------------------------------------------------------
// Coût & économies :
// - Injecte un petit panneau "💶 Prix & Économies" dans l’écran Habitudes (dynamiquement)
//   sans toucher à ton HTML.
// - Stocke les prix unitaires, + un toggle "Inclure coût/économies dans les stats".
// - Fournit window.SA.economy pour que charts.js calcule la série "Coût".
// - Déclenche "sa:economy:changed" quand on modifie les prix/toggle.
// - Export/Import compatibles via la clé localStorage "app_prices_v23" (déjà gérée dans export.js).
// -----------------------------------------------------------------------------

const LS_PRICES = "app_prices_v23";

function loadPrices() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_PRICES) || "null");
    if (v && typeof v === "object") return v;
  } catch {}
  // valeurs par défaut = 0 (pas de coût tant que non saisi)
  return {
    enabled: true,                  // inclure le coût dans les stats/graphiques
    cigs: 0,                        // € par cigarette
    weed: 0,                        // € par joint (ou unité que tu enregistres)
    // alcool : trois sous-types possibles, mais on additionne au même compteur "alcohol"
    alcohol_biere: 0,               // € par bière
    alcohol_fort: 0,                // € par alcool fort / shot
    alcohol_liqueur: 0,             // € par liqueur / verre
  };
}
function savePrices(p) {
  try { localStorage.setItem(LS_PRICES, JSON.stringify(p)); } catch {}
  window.dispatchEvent(new Event("sa:economy:changed"));
}

// Calcule le coût d'une liste d'entrées brutes [{ts,type,qty}]
function costFor(entries) {
  const P = loadPrices();
  if (!P.enabled) return 0;

  let total = 0;
  for (const e of entries) {
    const qty = Number(e.qty||1);
    if (e.type === "cigs") total += qty * (Number(P.cigs)||0);
    else if (e.type === "weed") total += qty * (Number(P.weed)||0);
    else if (e.type === "alcohol") {
      // l'historique ne précise pas le sous-type (bière/fort/liqueur),
      // donc on prend un tarif moyen s'il existe (moyenne des sous-prix > 0).
      const prices = [Number(P.alcohol_biere)||0, Number(P.alcohol_fort)||0, Number(P.alcohol_liqueur)||0]
        .filter(x=>x>0);
      const unit = prices.length ? (prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
      total += qty * unit;
    }
  }
  return Math.round(total * 100) / 100;
}

// UI injection (dans #ecran-habitudes)
function injectPanel() {
  const host = document.getElementById("ecran-habitudes");
  if (!host) return;

  if (document.getElementById("eco-card")) return; // déjà injecté

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
    <button class="btn small" id="eco-save" type="button" style="margin-top:10px">Enregistrer</button>
  `;
  host.appendChild(card);

  const P = loadPrices();
  // set values
  const $ = (id)=>document.getElementById(id);
  $("eco-enabled").checked = !!P.enabled;
  $("eco-cigs").value = P.cigs ?? 0;
  $("eco-weed").value = P.weed ?? 0;
  $("eco-biere").value = P.alcohol_biere ?? 0;
  $("eco-fort").value = P.alcohol_fort ?? 0;
  $("eco-liqueur").value = P.alcohol_liqueur ?? 0;

  $("eco-save").addEventListener("click", ()=>{
    const n = (id)=> Number($(id).value || 0);
    const enabled = !!$("eco-enabled").checked;
    const np = {
      enabled,
      cigs: n("eco-cigs"),
      weed: n("eco-weed"),
      alcohol_biere: n("eco-biere"),
      alcohol_fort: n("eco-fort"),
      alcohol_liqueur: n("eco-liqueur"),
    };
    savePrices(np);
    showSnack("Paramètres économies enregistrés.");
  });
}

function showSnack(msg) {
  const bar = document.getElementById("snackbar");
  if (!bar) { alert(msg); return; }
  bar.firstChild && (bar.firstChild.textContent = msg + " — ");
  bar.classList.add("show");
  setTimeout(()=> bar.classList.remove("show"), 2000);
}

// Expose API publique
function exposeAPI() {
  window.SA = window.SA || {};
  window.SA.economy = {
    get prices(){ return loadPrices(); },
    set prices(p){ savePrices({...loadPrices(), ...(p||{})}); },
    setEnabled(v){ const p = loadPrices(); p.enabled = !!v; savePrices(p); },
    costFor, // costFor(entries[])
  };
}

// Entrée publique
export function initEconomy() {
  injectPanel();
  exposeAPI();
}
