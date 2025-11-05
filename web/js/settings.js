/* web/js/settings.js
   Écran "Réglages" + source de vérité persistance/événements.
   Rôle: hydrate UI, écouter modifs, émettre sa:settings-changed.
*/
import { getSettings, setSettings, on, emit } from "./state.js";

// UI template (injecté dans #ecran-params)
const SETTINGS_HTML = `
  <div class="card">
    <div class="section-title">Modules principaux</div>
    <div class="grid-2">
      <div class="param"><label><input type="checkbox" id="set-mod-cigs"> Activer "Cigarettes"</label></div>
      <div class="param"><label><input type="checkbox" id="set-mod-weed"> Activer "Joints"</label></div>
      <div class="param"><label><input type="checkbox" id="set-mod-alcohol"> Activer "Alcool" (global)</label></div>
    </div>
  </div>

  <div class="card" id="card-sous-modules-alcool">
    <div class="section-title">Sous-modules Alcool</div>
    <div class="grid-2">
      <div class="param"><label><input type="checkbox" id="set-mod-beer"> Activer "Bière"</label></div>
      <div class="param"><label><input type="checkbox" id="set-mod-strong"> Activer "Alcool fort"</label></div>
      <div class="param"><label><input type="checkbox" id="set-mod-liquor"> Activer "Liqueur"</label></div>
    </div>
    <div class="hint">Note : Activez d'abord "Alcool" pour afficher ces options sur l'Accueil</div>
  </div>

  <div class="card">
    <div class="section-title">Prix & Devise (par unité)</div>
    <div class="grid-2">
      <div class="param"><label>Devise</label><input type="text" id="set-currency" placeholder="€" value="€"></div>
      <div class="param"><label>Cigarette</label><input type="number" id="set-price-cigs" min="0" step="0.01"></div>
      <div class="param"><label>Joint</label><input type="number" id="set-price-weed" min="0" step="0.01"></div>
      <div class="param"><label>Bière</label><input type="number" id="set-price-beer" min="0" step="0.01"></div>
      <div class="param"><label>Alcool fort</label><input type="number" id="set-price-strong" min="0" step="0.01"></div>
      <div class="param"><label>Liqueur</label><input type="number" id="set-price-liquor" min="0" step="0.01"></div>
    </div>
    <div class="hint">Laissez à 0 si vous ne souhaitez pas suivre les coûts</div>
  </div>

  <div class="card">
    <div class="section-title">Dates (jalons)</div>
    <div class="grid-2">
      <div class="param"><label>Réduction clopes</label><input type="date" id="date-reduc-clopes"></div>
      <div class="param"><label>Stop clopes</label><input type="date" id="date-stop-clopes"></div>
      <div class="param"><label>Objectif 0 clope</label><input type="date" id="date-no-clopes"></div>

      <div class="param"><label>Réduction joints</label><input type="date" id="date-reduc-joints"></div>
      <div class="param"><label>Stop joints</label><input type="date" id="date-stop-joints"></div>
      <div class="param"><label>Objectif 0 joint</label><input type="date" id="date-no-joints"></div>

      <div class="param"><label>Réduction alcool</label><input type="date" id="date-reduc-alcool"></div>
      <div class="param"><label>Stop alcool</label><input type="date" id="date-stop-alcool"></div>
      <div class="param"><label>Objectif 0 alcool</label><input type="date" id="date-no-alcool"></div>
      <div class="param hint">Ces dates s'affichent dans le calendrier.</div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Limites quotidiennes (alertes)</div>
    <div class="grid-2">
      <div class="param"><label>Max cigarettes/jour</label><input type="number" id="set-limit-cigs" min="0" step="1"></div>
      <div class="param"><label>Max joints/jour</label><input type="number" id="set-limit-weed" min="0" step="1"></div>
      <div class="param"><label>Max unités alcool/jour</label><input type="number" id="set-limit-alcohol" min="0" step="1"></div>
    </div>
    <div class="hint">Une alerte s'affiche quand vous dépassez ces limites (0 = pas de limite)</div>
  </div>

  <div class="card">
    <div class="section-title">Export / Import & Données</div>
    <div class="grid-2">
      <div class="param">
        <label>Langue (code)</label>
        <input type="text" id="set-lang" placeholder="fr" value="fr">
      </div>
      <div class="param">
        <label>Actions</label>
        <div>
          <button class="btn small" id="btn-export-all" type="button">📥 Exporter TOUT</button>
          <button class="btn small" id="btn-import-all" type="button">📤 Importer TOUT</button>
          <input type="file" id="input-import-all" accept=".json,.csv" style="display:none">
        </div>
      </div>
      <div class="param">
        <label>Réinitialisation</label>
        <button class="btn small danger" id="btn-reset-all" type="button">🗑️ RAZ complète</button>
      </div>
    </div>
  </div>
`;

function val(id) { return /** @type {HTMLInputElement|null} */(document.getElementById(id)); }

function readUIToSettings() {
  const cur = getSettings();
  const next = structuredClone(cur);

  // Modules principaux
  next.modules = next.modules || {};
  if (val("set-mod-cigs"))   next.modules.cigs   = val("set-mod-cigs").checked;
  if (val("set-mod-weed"))   next.modules.weed   = val("set-mod-weed").checked;
  if (val("set-mod-alcohol"))next.modules.alcohol= val("set-mod-alcohol").checked;
  
  // Sous-modules alcool
  if (val("set-mod-beer"))   next.modules.beer   = val("set-mod-beer").checked;
  if (val("set-mod-strong")) next.modules.strong = val("set-mod-strong").checked;
  if (val("set-mod-liquor")) next.modules.liquor = val("set-mod-liquor").checked;

  // Prix
  next.prices = next.prices || {};
  const get = (id) => parseFloat(val(id)?.value) || 0;
  next.prices.cigs   = get("set-price-cigs");
  next.prices.weed   = get("set-price-weed");
  next.prices.beer   = get("set-price-beer");
  next.prices.strong = get("set-price-strong");
  next.prices.liquor = get("set-price-liquor");

  // Limites
  next.limits = next.limits || {};
  next.limits.cigs    = parseFloat(val("set-limit-cigs")?.value) || 0;
  next.limits.weed    = parseFloat(val("set-limit-weed")?.value) || 0;
  next.limits.alcohol = parseFloat(val("set-limit-alcohol")?.value) || 0;

  // Devise & langue
  next.currency = val("set-currency")?.value || "€";
  next.lang = val("set-lang")?.value || "fr";

  // Jalons (dates)
  const jd = next.milestones || {};
  jd.cigs = jd.cigs || {};
  jd.weed = jd.weed || {};
  jd.alcohol = jd.alcohol || {};

  const getDate = (id) => val(id)?.value || "";
  jd.cigs.reduce = getDate("date-reduc-clopes");
  jd.cigs.stop   = getDate("date-stop-clopes");
  jd.cigs.zero   = getDate("date-no-clopes");
  
  jd.weed.reduce = getDate("date-reduc-joints");
  jd.weed.stop   = getDate("date-stop-joints");
  jd.weed.zero   = getDate("date-no-joints");
  
  jd.alcohol.reduce = getDate("date-reduc-alcool");
  jd.alcohol.stop   = getDate("date-stop-alcool");
  jd.alcohol.zero   = getDate("date-no-alcool");

  return next;
}

function writeSettingsToUI(s) {
  // Modules principaux
  const m = s.modules || {};
  const p = s.prices  || {};
  if (val("set-mod-cigs"))   val("set-mod-cigs").checked   = !!m.cigs;
  if (val("set-mod-weed"))   val("set-mod-weed").checked   = !!m.weed;
  if (val("set-mod-alcohol"))val("set-mod-alcohol").checked= !!m.alcohol;
  
  // Sous-modules alcool
  if (val("set-mod-beer"))   val("set-mod-beer").checked   = !!m.beer;
  if (val("set-mod-strong")) val("set-mod-strong").checked = !!m.strong;
  if (val("set-mod-liquor")) val("set-mod-liquor").checked = !!m.liquor;

  // Afficher/masquer la carte des sous-modules selon l'état du module alcool
  const alcoolCard = document.getElementById("card-sous-modules-alcool");
  if (alcoolCard) {
    alcoolCard.style.display = m.alcohol ? "block" : "none";
  }

  // Devise + Prix
  if (val("set-currency"))     val("set-currency").value   = s.currency || "€";
  if (val("set-price-cigs"))   val("set-price-cigs").value = String(p.cigs ?? 0);
  if (val("set-price-weed"))   val("set-price-weed").value = String(p.weed ?? 0);
  if (val("set-price-beer"))   val("set-price-beer").value = String(p.beer ?? 0);
  if (val("set-price-strong")) val("set-price-strong").value = String(p.strong ?? 0);
  if (val("set-price-liquor")) val("set-price-liquor").value = String(p.liquor ?? 0);

  // Limites
  const l = s.limits || {};
  if (val("set-limit-cigs"))    val("set-limit-cigs").value = String(l.cigs ?? 0);
  if (val("set-limit-weed"))    val("set-limit-weed").value = String(l.weed ?? 0);
  if (val("set-limit-alcohol")) val("set-limit-alcohol").value = String(l.alcohol ?? 0);

  // Langue
  if (val("set-lang")) val("set-lang").value = s.lang || "fr";

  // Jalons
  const jd = s.milestones || {};
  if (val("date-reduc-clopes")) val("date-reduc-clopes").value = jd.cigs?.reduce || "";
  if (val("date-stop-clopes"))  val("date-stop-clopes").value  = jd.cigs?.stop   || "";
  if (val("date-no-clopes"))    val("date-no-clopes").value    = jd.cigs?.zero   || "";
  
  if (val("date-reduc-joints")) val("date-reduc-joints").value = jd.weed?.reduce || "";
  if (val("date-stop-joints"))  val("date-stop-joints").value  = jd.weed?.stop   || "";
  if (val("date-no-joints"))    val("date-no-joints").value    = jd.weed?.zero   || "";
  
  if (val("date-reduc-alcool")) val("date-reduc-alcool").value = jd.alcohol?.reduce || "";
  if (val("date-stop-alcool"))  val("date-stop-alcool").value  = jd.alcohol?.stop   || "";
  if (val("date-no-alcool"))    val("date-no-alcool").value    = jd.alcohol?.zero   || "";
}

function bindSettingsEvents() {
  // Auto-save sur chaque modif
  const inputs = [
    "set-mod-cigs", "set-mod-weed", "set-mod-alcohol",
    "set-mod-beer", "set-mod-strong", "set-mod-liquor",
    "set-price-cigs", "set-price-weed", "set-price-beer", "set-price-strong", "set-price-liquor",
    "set-limit-cigs", "set-limit-weed", "set-limit-alcohol",
    "set-currency", "set-lang",
    "date-reduc-clopes", "date-stop-clopes", "date-no-clopes",
    "date-reduc-joints", "date-stop-joints", "date-no-joints",
    "date-reduc-alcool", "date-stop-alcool", "date-no-alcool"
  ];
  
  inputs.forEach(id => {
    const el = val(id);
    if (el) {
      el.addEventListener("change", () => {
        const updated = readUIToSettings();
        setSettings(updated);
        console.log(`[settings] ${id} modifié`);
        
        // Si on change le module alcool, afficher/masquer les sous-modules
        if (id === "set-mod-alcohol") {
          const alcoolCard = document.getElementById("card-sous-modules-alcool");
          if (alcoolCard) {
            alcoolCard.style.display = el.checked ? "block" : "none";
          }
        }
      });
    }
  });

  // Export TOUT
  const btnExport = val("btn-export-all");
  if (btnExport) {
    btnExport.addEventListener("click", async () => {
      try {
        const exp = await import("./export.js");
        if (exp?.exportAll) {
          await exp.exportAll(true); // true = inclure les graphiques
          console.log("[settings] Export complet effectué");
        } else {
          alert("Module export non disponible");
        }
      } catch (e) {
        alert("Export indisponible : " + e.message);
        console.error("[settings] exportAll:", e);
      }
    });
  }

  // Import TOUT
  const btnImport = val("btn-import-all");
  const fileIn = val("input-import-all");
  if (btnImport && fileIn) {
    btnImport.addEventListener("click", () => fileIn.click());
    fileIn.addEventListener("change", async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      try {
        const st = await import("./storage.js");
        if (st?.importAll) {
          await st.importAll(f);
          console.log("[settings] Import effectué");
          location.reload(); // Recharger pour appliquer
        }
      } catch (e) {
        alert("Import indisponible : " + e.message);
        console.warn("[settings] importAll:", e);
      } finally {
        fileIn.value = "";
      }
    });
  }

  // RAZ complète
  const btnReset = val("btn-reset-all");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      if (confirm("⚠️ ATTENTION : Cela supprimera TOUTES vos données (consommations, réglages, graphiques). Continuer ?")) {
        if (confirm("🔴 Dernière chance : Êtes-vous VRAIMENT sûr ? Cette action est IRRÉVERSIBLE !")) {
          localStorage.clear();
          sessionStorage.clear();
          console.log("[settings] RAZ complète effectuée");
          alert("✅ Réinitialisation complète effectuée. L'application va redémarrer.");
          location.reload();
        }
      }
    });
  }
}

export async function initSettings() {
  // Injecter l'UI si vide
  const pane = document.getElementById("ecran-params");
  if (pane) {
    pane.innerHTML = SETTINGS_HTML;
    console.log("[settings] Template HTML injecté");
  } else {
    console.warn("[settings] Element #ecran-params introuvable !");
  }

  // Hydrater depuis l'état
  const cur = getSettings();
  writeSettingsToUI(cur);

  // Brancher les events
  bindSettingsEvents();

  // Si les settings changent ailleurs (import, etc.), refléter dans l'UI
  on("sa:settings-changed", () => writeSettingsToUI(getSettings()));

  console.log("[settings] ✓ Initialisé avec succès");
}
