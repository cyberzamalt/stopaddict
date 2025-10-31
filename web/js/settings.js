/* web/js/settings.js
   Module de câblage de la page "Réglages" avec exclusivité :
   - "Alcool global" EXCLUSIF avec "Bière", "Alcool fort", "Liqueur".
   - Si Alcool global = ON => beer/hard/liqueur OFF + disabled en UI.
   - Si beer/hard/liqueur => ON => Alcool global forcé à OFF.

   Utilisation (facultative si tu veux séparer depuis app.js) :
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

  // ----- Helpers locaux -----
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

  // -------------------------------------------------
  // Profil + Langue
  // -------------------------------------------------
  $("#profile-name").value = S.profile.name || "";
  $("#profile-name").addEventListener("input", e => {
    S.profile.name = e.target.value || "";
    saveState();
  });

  const langSel = $("#select-language");
  if (langSel) {
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
      // (si i18n externe : re-hydrater ici)
    });
  }

  // -------------------------------------------------
  // Devise
  // -------------------------------------------------
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

  // -------------------------------------------------
  // Modules (avec EXCLUSIVITÉ Alcool)
  // -------------------------------------------------
  const modIds = {
    cigs: "#mod-cigs",
    beer: "#mod-beer",
    joints: "#mod-joints",
    hard: "#mod-hard",
    liqueur: "#mod-liqueur",
    alcoholGlobal: "#mod-alcohol"
  };

  const getEl = (key) => $(modIds[key]);

  // Applique l’exclusivité et synchronise l’UI
  function applyAlcoholExclusivity({persist=true, from=""} = {}) {
    const elAlcohol = getEl("alcoholGlobal");
    const elBeer    = getEl("beer");
    const elHard    = getEl("hard");
    const elLiq     = getEl("liqueur");

    const alcoholGlobalOn = !!S.modules.alcoholGlobal;
    const anySubOn = !!(S.modules.beer || S.modules.hard || S.modules.liqueur);

    // Règle d’exclusivité :
    // 1) Si des sous-modules sont ON -> Alcool global = OFF.
    if (anySubOn && alcoholGlobalOn) {
      S.modules.alcoholGlobal = false;
    }

    // 2) Si Alcool global = ON -> forcer les sous-modules à OFF + désactiver UI
    if (S.modules.alcoholGlobal) {
      S.modules.beer = false;
      S.modules.hard = false;
      S.modules.liqueur = false;

      // Désactiver cartes du jour correspondantes
      S.today.active.beer = false;
      S.today.active.hard = false;
      S.today.active.liqueur = false;

      // UI
      if (elBeer) { elBeer.checked = false; elBeer.disabled = true; elBeer.title = "Désactivé car 'Alcool global' est actif"; }
      if (elHard) { elHard.checked = false; elHard.disabled = true; elHard.title = "Désactivé car 'Alcool global' est actif"; }
      if (elLiq)  { elLiq.checked  = false; elLiq.disabled  = true; elLiq.title  = "Désactivé car 'Alcool global' est actif"; }
      if (elAlcohol) { elAlcohol.checked = true; elAlcohol.disabled = false; elAlcohol.title = ""; }
    } else {
      // Alcool global = OFF -> on (ré)autorise les sous-modules
      if (elBeer) { elBeer.disabled = false; elBeer.checked = !!S.modules.beer; elBeer.title = ""; }
      if (elHard) { elHard.disabled = false; elHard.checked = !!S.modules.hard; elHard.title = ""; }
      if (elLiq)  { elLiq.disabled  = false; elLiq.checked  = !!S.modules.liqueur; elLiq.title = ""; }
      if (elAlcohol) { elAlcohol.checked = false; elAlcohol.disabled = false; elAlcohol.title = ""; }
    }

    // Réflexions UI Accueil + recalcul
    reflectCounters?.();
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();

    if (persist) saveState();
    dbg?.push?.(`Exclusivité alcool appliquée (${from||'evt'})`, "info");
  }

  // Initialiser les cases module selon l’état
  for (const k in modIds) {
    const el = getEl(k);
    if (!el) continue;
    el.checked = !!S.modules[k];
  }
  // Appliquer une première fois l’exclusivité pour que l’UI soit cohérente au chargement
  applyAlcoholExclusivity({persist:false, from:"init"});

  // Listeners modules (général)
  const setModule = (key, checked) => {
    S.modules[key] = checked;
    if (["cigs","beer","joints","hard","liqueur"].includes(key)) {
      S.today.active[key] = checked; // reflète l’état sur les cartes du jour
      reflectCounters?.();
    }
    saveState();
  };

  // Listener Alcool global
  getEl("alcoholGlobal")?.addEventListener("change", (e) => {
    setModule("alcoholGlobal", e.target.checked);
    applyAlcoholExclusivity({from:"mod-alcoholGlobal"});
  });

  // Listeners sous-modules Alcool
  ["beer","hard","liqueur"].forEach(k => {
    getEl(k)?.addEventListener("change", (e) => {
      setModule(k, e.target.checked);
      // Si un sous-module passe à ON -> couper Alcool global
      if (e.target.checked && S.modules.alcoholGlobal) {
        S.modules.alcoholGlobal = false;
        const elAlcohol = getEl("alcoholGlobal");
        if (elAlcohol) elAlcohol.checked = false;
      }
      applyAlcoholExclusivity({from:`mod-${k}`});
    });
  });

  // -------------------------------------------------
  // Prix unitaires (fallback)
  // -------------------------------------------------
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

  // -------------------------------------------------
  // Variantes (classiques / roulées / tubées / cannabis / alcool)
  // -------------------------------------------------
  // Classiques
  $("#classic-use")?.addEventListener("change", e => { S.variants.classic.use = e.target.checked; saveState(); });
  setVal("#classic-pack-price",    S.variants.classic.packPrice);
  setVal("#classic-cigs-per-pack", S.variants.classic.cigsPerPack);
  onNum("#classic-pack-price",    v => S.variants.classic.packPrice = v);
  onNum("#classic-cigs-per-pack", v => S.variants.classic.cigsPerPack = v);

  // Roulées
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

  // Tubées
  $("#tubed-use")?.addEventListener("change", e => { S.variants.tubed.use = e.target.checked; saveState(); });
  setVal("#tubed-cigs-per-30g", S.variants.tubed.cigsPer30g);
  setVal("#tubed-tubes-price",  S.variants.tubed.tubesPrice);
  setVal("#tubed-tubes-count",  S.variants.tubed.tubesCount);
  $("#tubed-use-filter")?.addEventListener("change", e => { S.variants.tubed.useFilter = e.target.checked; saveState(); });
  onNum("#tubed-cigs-per-30g", v => S.variants.tubed.cigsPer30g = v);
  onNum("#tubed-tubes-price",  v => S.variants.tubed.tubesPrice = v);
  onNum("#tubed-tubes-count",  v => S.variants.tubed.tubesCount = v);

  // Cannabis
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

  // Alcool (catégories internes)
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

  // -------------------------------------------------
  // RAZ & Sauvegardes locales
  // -------------------------------------------------
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
    dbg?.push?.("RAZ période : géré côté stats/app.js", "info");
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
    const keepToday   = S.today;
    const keepCurrency= S.currency;
    // Réinitialise en conservant des morceaux utiles
    let D = DefaultState();
    S.meta = D.meta;
    S.profile = D.profile;
    S.currency = keepCurrency;
    S.modules = D.modules;
    S.prices = D.prices;
    S.variants = D.variants;
    S.goals = D.goals;
    S.limits = D.limits;
    S.dates = D.dates;
    S.history = keepHistory;
    S.today = keepToday;

    // Re-monter l'UI et re-appliquer exclusivité
    mountSettings(ctx);
    applyAlcoholExclusivity({from:"factory"});
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
      // Merge doux
      const D = DefaultState();
      Object.assign(S, D, obj);
      mountSettings(ctx);
      applyAlcoholExclusivity({from:"import"});
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

  // Assure une dernière fois la cohérence à la fin du montage
  applyAlcoholExclusivity({persist:false, from:"post-mount"});
}
