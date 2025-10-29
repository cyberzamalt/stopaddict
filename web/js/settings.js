/* web/js/settings.js
   Écran “Réglages” + source de vérité persistance/événements.
   Rôle: hydrate UI, écouter modifs, émettre sa:settings-changed.
*/
import { getSettings, setSettings, on, emit } from "./state.js";

// UI template (injecté dans #ecran-params)
const SETTINGS_HTML = `
  <div class="card">
    <div class="section-title">Modules</div>
    <div class="grid-2">
      <div class="param"><label><input type="checkbox" id="set-mod-cigs"> Activer “Cigarettes”</label></div>
      <div class="param"><label><input type="checkbox" id="set-mod-weed"> Activer “Joints”</label></div>
      <div class="param"><label><input type="checkbox" id="set-mod-alcohol"> Activer “Alcool”</label></div>
    </div>
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
      <div class="param hint">Ces dates s’affichent dans le calendrier.</div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Langue & Données</div>
    <div class="grid-2">
      <div class="param">
        <label>Langue (code)</label>
        <input type="text" id="set-lang" placeholder="fr" value="fr">
      </div>
      <div class="param">
        <label>—</label>
        <div>
          <button class="btn small" id="btn-export-all" type="button">Exporter TOUT</button>
          <button class="btn small" id="btn-import-all" type="button">Importer TOUT</button>
          <input type="file" id="input-import-all" accept=".json,.csv" style="display:none">
        </div>
      </div>
    </div>
  </div>
`;

function val(id) { return /** @type {HTMLInputElement|null} */(document.getElementById(id)); }

function readUIToSettings() {
  const cur = getSettings();
  const next = structuredClone(cur);

  // Modules
  next.modules.cigs   = !!val("set-mod-cigs")?.checked;
  next.modules.weed   = !!val("set-mod-weed")?.checked;
  next.modules.alcohol= !!val("set-mod-alcohol")?.checked;

  // Devise + Prix
  next.currency       = (val("set-currency")?.value || "€").trim() || "€";
  next.prices.cigs    = Number(val("set-price-cigs")?.value || 0) || 0;
  next.prices.weed    = Number(val("set-price-weed")?.value || 0) || 0;
  next.prices.beer    = Number(val("set-price-beer")?.value || 0) || 0;
  next.prices.strong  = Number(val("set-price-strong")?.value || 0) || 0;
  next.prices.liquor  = Number(val("set-price-liquor")?.value || 0) || 0;

  // Langue
  next.lang = (val("set-lang")?.value || "fr").trim() || "fr";

  // Jalons (dates)
  const jd = next.milestones;
  const get = (id) => val(id)?.value || "";
  jd.cigs.reduce = get("date-reduc-clopes");
  jd.cigs.stop   = get("date-stop-clopes");
  jd.cigs.zero   = get("date-no-clopes");

  jd.weed.reduce = get("date-reduc-joints");
  jd.weed.stop   = get("date-stop-joints");
  jd.weed.zero   = get("date-no-joints");

  jd.alcohol.reduce = get("date-reduc-alcool");
  jd.alcohol.stop   = get("date-stop-alcool");
  jd.alcohol.zero   = get("date-no-alcool");

  return next;
}

function writeSettingsToUI(s) {
  // Modules
  const m = s.modules || {};
  const p = s.prices  || {};
  if (val("set-mod-cigs"))   val("set-mod-cigs").checked   = !!m.cigs;
  if (val("set-mod-weed"))   val("set-mod-weed").checked   = !!m.weed;
  if (val("set-mod-alcohol"))val("set-mod-alcohol").checked= !!m.alcohol;

  // Devise + Prix
  if (val("set-currency"))     val("set-currency").value   = s.currency || "€";
  if (val("set-price-cigs"))   val("set-price-cigs").value = String(p.cigs ?? 0);
  if (val("set-price-weed"))   val("set-price-weed").value = String(p.weed ?? 0);
  if (val("set-price-beer"))   val("set-price-beer").value = String(p.beer ?? 0);
  if (val("set-price-strong")) val("set-price-strong").value = String(p.strong ?? 0);
  if (val("set-price-liquor")) val("set-price-liquor").value = String(p.liquor ?? 0);

  // Langue
  if (val("set-lang")) val("set-lang").value = s.lang || "fr";

  // Jalons
  const jd = s.milestones;
  if (val("date-reduc-clopes")) val("date-reduc-clopes").value = jd.cigs.reduce || "";
  if (val("date-stop-clopes"))  val("date-stop-clopes").value  = jd.cigs.stop   || "";
  if (val("date-no-clopes"))    val("date-no-clopes").value    = jd.cigs.zero   || "";

  if (val("date-reduc-joints")) val("date-reduc-joints").value = jd.weed.reduce || "";
  if (val("date-stop-joints"))  val("date-stop-joints").value  = jd.weed.stop   || "";
  if (val("date-no-joints"))    val("date-no-joints").value    = jd.weed.zero   || "";

  if (val("date-reduc-alcool")) val("date-reduc-alcool").value = jd.alcohol.reduce || "";
  if (val("date-stop-alcool"))  val("date-stop-alcool").value  = jd.alcohol.stop   || "";
  if (val("date-no-alcool"))    val("date-no-alcool").value    = jd.alcohol.zero   || "";
}

function bindSettingsEvents() {
  // Toute modification sauvegarde + notifie
  const inputs = document.querySelectorAll("#ecran-params input");
  inputs.forEach((el) => {
    el.addEventListener("change", () => {
      const next = readUIToSettings();
      setSettings(next);               // persist + emit
      emit("sa:settings-changed", {}); // redondant mais explicite
    });
  });

  // Export / Import TOUT (lazy-load storage.js)
  const btnExp = document.getElementById("btn-export-all");
  const btnImp = document.getElementById("btn-import-all");
  const fileIn = document.getElementById("input-import-all");

  if (btnExp) btnExp.addEventListener("click", async () => {
    try {
      const st = await import("./storage.js");
      if (st?.exportAll) st.exportAll();
    } catch (e) {
      alert("Module de stockage indisponible.");
      console.warn("[settings] exportAll:", e?.message || e);
    }
  });

  if (btnImp && fileIn) {
    btnImp.addEventListener("click", () => fileIn.click());
    fileIn.addEventListener("change", async () => {
      const f = fileIn.files?.[0];
      if (!f) return;
      try {
        const st = await import("./storage.js");
        if (st?.importAll) {
          await st.importAll(f);
        }
      } catch (e) {
        alert("Import indisponible.");
        console.warn("[settings] importAll:", e?.message || e);
      } finally {
        fileIn.value = "";
      }
    });
  }
}

export async function initSettings() {
  // Injecter l’UI si vide
  const pane = document.getElementById("ecran-params");
  if (pane) {
    pane.innerHTML = SETTINGS_HTML;
  }

  // Hydrater depuis l’état
  const cur = getSettings();
  writeSettingsToUI(cur);

  // Brancher les events
  bindSettingsEvents();

  // Si les settings changent ailleurs (import, etc.), refléter dans l’UI
  on("sa:settings-changed", () => writeSettingsToUI(getSettings()));

  console.log("[settings] ✓ prêt");
}
