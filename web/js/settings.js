/* web/js/settings.js
   Module optionnel de câblage de la page "Réglages".
   ➜ Exporte mountSettings(ctx) pour brancher tous les champs/boutons.

   Utilisation (si tu veux un jour séparer depuis app.js) :
     import { mountSettings } from './settings.js';
     mountSettings({
       S, DefaultState, saveState,
       persistTodayIntoHistory, updateHeader, renderChart,
       reflectCounters, dbg
     });
*/

export function mountSettings(ctx) {
  const {
    S, DefaultState, saveState,
    persistTodayIntoHistory, updateHeader, renderChart,
    reflectCounters, dbg
  } = ctx;

  // Helpers locaux (sélecteurs + setters)
  const $  = (sel) => document.querySelector(sel);
  const setVal = (sel, val, isText=false) => {
    const el = $(sel);
    if (!el) return;
    el.value = isText ? (val ?? "") : Number(val ?? 0);
  };
  const onNum = (sel, fn) => {
    const el = $(sel);
    el?.addEventListener("input", () => { fn(Number(el.value||0)); saveState(); });
  };
  const onTxt = (sel, fn) => {
    const el = $(sel);
    el?.addEventListener("input", () => { fn(String(el.value||"")); saveState(); });
  };

  /* -----------------------
     Profil (prénom) + langue
     ----------------------- */
  $("#profile-name").value = S.profile.name || "";
  $("#profile-name").addEventListener("input", e => {
    S.profile.name = e.target.value || "";
    saveState();
  });

  const langSel = $("#select-language");
  if (langSel) {
    // Liste minimale (peut être alimentée par i18n externe si besoin)
    if (!langSel.options.length) {
      langSel.innerHTML = `
        <option value="fr">Français</option>
        <option value="en">English</option>
      `;
    }
    langSel.value = S.profile.language || "fr";
    langSel.addEventListener("change", () => {
      S.profile.language = langSel.value;
      saveState();
      // (si i18n externe en place : re-hydrater les libellés ici)
    });
  }

  /* -------------
     Devise (UI)
     ------------- */
  $("#currency-symbol").value = S.currency.symbol || "€";
  $("#currency-before").checked = !!S.currency.before;
  $("#currency-after").checked  = !S.currency.before;

  $("#btn-apply-currency").addEventListener("click", () => {
    const sym = $("#currency-symbol").value || "€";
    const before = $("#currency-before").checked;
    S.currency = { symbol: sym, before };
    updateHeader?.();
    renderChart?.();
    saveState();
    dbg?.push?.("Devise appliquée", "ok");
  });

  /* -----------------------------
     Modules (switches principaux)
     ----------------------------- */
  const modIds = {
    cigs: "#mod-cigs",
    beer: "#mod-beer",
    joints: "#mod-joints",
    hard: "#mod-hard",
    liqueur: "#mod-liqueur",
    alcoholGlobal: "#mod-alcohol"
  };
  for (const k in modIds) {
    const el = $(modIds[k]);
    if (!el) continue;
    el.checked = !!S.modules[k];
    el.addEventListener("change", () => {
      S.modules[k] = el.checked;
      // si on désactive un module, on rend la carte du jour inactive aussi
      if (["cigs","beer","joints","hard","liqueur"].includes(k)) {
        S.today.active[k] = el.checked;
        reflectCounters?.();
      }
      saveState();
    });
  }

  /* ------------------------
     Prix unitaires (fallback)
     ------------------------ */
  $("#price-cigarette").value = S.prices.cigarette ?? 0;
  $("#price-joint").value     = S.prices.joint ?? 0;
  $("#price-beer").value      = S.prices.beer ?? 0;
  $("#price-hard").value      = S.prices.hard ?? 0;
  $("#price-liqueur").value   = S.prices.liqueur ?? 0;

  $("#btn-save-prices").addEventListener("click", () => {
    S.prices.cigarette = Number($("#price-cigarette").value || 0);
    S.prices.joint     = Number($("#price-joint").value || 0);
    S.prices.beer      = Number($("#price-beer").value || 0);
    S.prices.hard      = Number($("#price-hard").value || 0);
    S.prices.liqueur   = Number($("#price-liqueur").value || 0);
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();
    saveState();
    dbg?.push?.("Prix unitaires enregistrés", "ok");
  });

  $("#btn-reset-prices").addEventListener("click", () => {
    S.prices = { ...DefaultState().prices };
    $("#price-cigarette").value = 0;
    $("#price-joint").value     = 0;
    $("#price-beer").value      = 0;
    $("#price-hard").value      = 0;
    $("#price-liqueur").value   = 0;
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();
    saveState();
    dbg?.push?.("Prix unitaires réinitialisés", "ok");
  });

  /* --------------------------------
     Variantes Cigarettes (classiques)
     -------------------------------- */
  $("#classic-use")?.addEventListener("change", e => { S.variants.classic.use = e.target.checked; saveState(); });
  setVal("#classic-pack-price",    S.variants.classic.packPrice);
  setVal("#classic-cigs-per-pack", S.variants.classic.cigsPerPack);
  onNum("#classic-pack-price",    v => S.variants.classic.packPrice = v);
  onNum("#classic-cigs-per-pack", v => S.variants.classic.cigsPerPack = v);

  /* --------------------------
     Cigarettes (roulées/tubées)
     -------------------------- */
  $("#rolled-use")?.addEventListener("change", e => { S.variants.rolled.use = e.target.checked; saveState(); });
  setVal("#rolled-tobacco-30g-price", S.variants.rolled.tobacco30gPrice);
  setVal("#rolled-cigs-per-30g",      S.variants.rolled.cigsPer30g);
  setVal("#rolled-small-leaves-price", S.variants.rolled.smallLeavesPrice);
  setVal("#rolled-small-leaves-count", S.variants.rolled.smallLeavesCount);
  setVal("#rolled-filters-price", S.variants.rolled.filtersPrice);
  setVal("#rolled-filters-count", S.variants.rolled.filtersCount);
  $("#rolled-use-filter")?.addEventListener("change", e => { S.variants.rolled.useFilter = e.target.checked; saveState(); });
  onNum("#rolled-tobacco-30g-price", v => S.variants.rolled.tobacco30gPrice = v);
  onNum("#rolled-cigs-per-30g",      v => S.variants.rolled.cigsPer30g = v);
  onNum("#rolled-small-leaves-price", v => S.variants.rolled.smallLeavesPrice = v);
  onNum("#rolled-small-leaves-count", v => S.variants.rolled.smallLeavesCount = v);
  onNum("#rolled-filters-price", v => S.variants.rolled.filtersPrice = v);
  onNum("#rolled-filters-count", v => S.variants.rolled.filtersCount = v);

  $("#tubed-use")?.addEventListener("change", e => { S.variants.tubed.use = e.target.checked; saveState(); });
  setVal("#tubed-cigs-per-30g", S.variants.tubed.cigsPer30g);
  setVal("#tubed-tubes-price",  S.variants.tubed.tubesPrice);
  setVal("#tubed-tubes-count",  S.variants.tubed.tubesCount);
  $("#tubed-use-filter")?.addEventListener("change", e => { S.variants.tubed.useFilter = e.target.checked; saveState(); });
  onNum("#tubed-cigs-per-30g", v => S.variants.tubed.cigsPer30g = v);
  onNum("#tubed-tubes-price",  v => S.variants.tubed.tubesPrice = v);
  onNum("#tubed-tubes-count",  v => S.variants.tubed.tubesCount = v);

  /* --------------
     Cannabis (UI)
     -------------- */
  $("#canna-use")?.addEventListener("change", e => { S.variants.cannabis.use = e.target.checked; saveState(); });
  setVal("#canna-price-gram",      S.variants.cannabis.gramPrice);
  setVal("#canna-grams-per-joint", S.variants.cannabis.gramsPerJoint);
  setVal("#canna-bigleaf-price",   S.variants.cannabis.bigLeafPrice);
  setVal("#canna-bigleaf-count",   S.variants.cannabis.bigLeafCount);
  $("#canna-use-filter")?.addEventListener("change", e => { S.variants.cannabis.useFilter = e.target.checked; saveState(); });
  onNum("#canna-price-gram",      v => S.variants.cannabis.gramPrice = v);
  onNum("#canna-grams-per-joint", v => S.variants.cannabis.gramsPerJoint = v);
  onNum("#canna-bigleaf-price",   v => S.variants.cannabis.bigLeafPrice = v);
  onNum("#canna-bigleaf-count",   v => S.variants.cannabis.bigLeafCount = v);

  /* --------------------------
     Alcool — catégories & prix
     -------------------------- */
  $("#beer-enabled")?.addEventListener("change", e => { S.variants.alcohol.beer.enabled = e.target.checked; saveState(); });
  setVal("#beer-price-unit", S.variants.alcohol.beer.unitPrice);
  setVal("#beer-unit-label", S.variants.alcohol.beer.unitLabel, true);
  onNum("#beer-price-unit", v => S.variants.alcohol.beer.unitPrice = v);
  onTxt("#beer-unit-label", v => S.variants.alcohol.beer.unitLabel = v);

  $("#hard-enabled")?.addEventListener("change", e => { S.variants.alcohol.hard.enabled = e.target.checked; saveState(); });
  setVal("#hard-price-dose", S.variants.alcohol.hard.dosePrice);
  setVal("#hard-dose-unit",  S.variants.alcohol.hard.doseUnit, true);
  onNum("#hard-price-dose", v => S.variants.alcohol.hard.dosePrice = v);
  onTxt("#hard-dose-unit",  v => S.variants.alcohol.hard.doseUnit = v);

  $("#liqueur-enabled")?.addEventListener("change", e => { S.variants.alcohol.liqueur.enabled = e.target.checked; saveState(); });
  setVal("#liqueur-price-dose", S.variants.alcohol.liqueur.dosePrice);
  setVal("#liqueur-dose-unit",  S.variants.alcohol.liqueur.doseUnit, true);
  onNum("#liqueur-price-dose", v => S.variants.alcohol.liqueur.dosePrice = v);
  onTxt("#liqueur-dose-unit",  v => S.variants.alcohol.liqueur.doseUnit = v);

  /* ------------------------
     RAZ & sauvegarde locaux
     ------------------------ */
  $("#btn-raz-day")?.addEventListener("click", () => {
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    reflectCounters?.();
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();
    saveState();
    dbg?.push?.("RAZ du jour", "ok");
  });

  $("#btn-raz-period")?.addEventListener("click", () => {
    // ⚠️ Ici on s’appuie sur la période active et la logique de stats dans app.js,
    // donc si tu veux isoler complètement, il faudra passer une API "currentRange()".
    dbg?.push?.("RAZ période : action déléguée au module stats", "info");
    // Laisser géré par app.js pour éviter les divergences.
  });

  $("#btn-raz-history")?.addEventListener("click", () => {
    S.history = {};
    persistTodayIntoHistory?.();
    renderChart?.();
    saveState();
    dbg?.push?.("RAZ historique conso", "ok");
  });

  $("#btn-raz-factory")?.addEventListener("click", () => {
    const keepHistory = S.history;
    const keepToday = S.today;
    const keepCurrency = S.currency;
    S = Object.assign(S, DefaultState()); // merge dans l'objet existant
    S.history = keepHistory;
    S.today = keepToday;
    S.currency = keepCurrency;
    // Ré-hydrater
    mountSettings(ctx); // re-bind pour refléter les defaults
    renderChart?.();
    saveState();
    dbg?.push?.("RAZ réglages (usine) + conservation historique", "ok");
  });

  $("#btn-save-json-settings")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stopaddict_settings_backup.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    dbg?.push?.("Sauvegarder JSON (réglages + état) ok", "ok");
  });

  $("#file-import-json-settings")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      Object.assign(S, DefaultState(), obj); // merge doux
      // Ré-hydrater
      mountSettings(ctx);
      renderChart?.();
      saveState();
      dbg?.push?.("Import JSON (réglages) ok", "ok");
    } catch (e) {
      alert("Import JSON invalide.");
      dbg?.push?.("Import JSON (réglages) erreur: "+e?.message, "err");
    } finally {
      ev.target.value = "";
    }
  });

  $("#btn-purge-local-stats")?.addEventListener("click", () => {
    S.history = {};
    persistTodayIntoHistory?.();
    renderChart?.();
    saveState();
    dbg?.push?.("Purge données locales (Stats)", "ok");
  });

  /* ----------------------
     Journal & DEBUG (UI)
     ---------------------- */
  const dbgBox = $("#debug-console");
  $("#cb-debug-overlay")?.addEventListener("change", e => {
    if (e.target.checked) {
      dbgBox?.classList.remove("hide");
      dbg?.push?.("Overlay DEBUG ON", "ok");
    } else {
      dbgBox?.classList.add("hide");
    }
  });
  $("#btn-copy-logs")?.addEventListener("click", () => dbg?.copy?.());
  $("#btn-clear-logs")?.addEventListener("click", () => dbg?.clear?.());

  /* ------------------------
     Ressources (placeholder)
     ------------------------ */
  $("#btn-resources")?.addEventListener("click", () => {
    alert("Ressources & numéros utiles : à compléter (liens d'aide, 112/15/17/18, associations, etc.)");
  });
}
