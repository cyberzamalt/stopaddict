/* ============================================================
   StopAddict — settings.js  (v3, one-shot)
   Rôle : Réglages UI (profil/devise/langue, tarifs, modules,
          dates 'enabled_since', activation jour, import/export).
          Contexte minimal : { S, onRefresh }.
   ============================================================ */

(function () {
  "use strict";

  // ------- Raccourcis vers l'état & helpers exposés par state.js -------
  const StateAPI = window.StopAddictState || {};
  const {
    saveState,
    ensureCoherence,
    exportAllState,
    importAllState,
    todayLocalISO,
    calculateDayCost
  } = StateAPI;

  // ------- Sélecteurs sécurisés -------
  const $ = (id) => document.getElementById(id);
  const valNum = (el) => {
    if (!el) return 0;
    const n = Number(el.value);
    return Number.isFinite(n) ? n : 0;
  };
  const valStr = (el) => (el ? String(el.value || "").trim() : "");
  const valBool = (el) => !!(el && el.checked);

  // ------- Réflexion visuelle (form ← S) -------
  function reflectSettingsUI(S) {
    // Profil / i18n / devise
    if ($("cfg-name")) $("cfg-name").value = S.profile.name || "";
    if ($("cfg-lang")) $("cfg-lang").value = S.profile.lang || "fr";
    if ($("cfg-currency")) $("cfg-currency").value = S.profile.currency || "EUR";
    if ($("cfg-currency-pos")) $("cfg-currency-pos").value = S.profile.currencyPos || "before";

    // Tarifs
    if ($("price-cigs")) $("price-cigs").value = S.prices.cigs ?? 0;
    if ($("price-weed")) $("price-weed").value = S.prices.weed ?? 0;
    if ($("price-beer")) $("price-beer").value = S.prices.beer ?? 0;
    if ($("price-hard")) $("price-hard").value = S.prices.hard ?? 0;
    if ($("price-liqueur")) $("price-liqueur").value = S.prices.liqueur ?? 0;
    if ($("price-alcohol")) $("price-alcohol").value = S.prices.alcohol ?? 0;

    // Modules (disponibilité) + dates de début de suivi
    if ($("mod-cigs")) $("mod-cigs").checked = !!S.modules.cigs;
    if ($("mod-weed")) $("mod-weed").checked = !!S.modules.weed;
    if ($("mod-alcohol")) $("mod-alcohol").checked = !!S.modules.alcohol;

    if ($("since-cigs")) $("since-cigs").value = S.enabled_since.cigs || "";
    if ($("since-weed")) $("since-weed").value = S.enabled_since.weed || "";
    if ($("since-alcohol")) $("since-alcohol").value = S.enabled_since.alcohol || "";

    // Activation du jour (Accueil)
    if ($("act-cigs")) $("act-cigs").checked = !!S.today.active.cigs;
    if ($("act-weed")) $("act-weed").checked = !!S.today.active.weed;
    if ($("act-alcohol")) $("act-alcohol").checked = !!S.today.active.alcohol;

    if ($("act-beer")) $("act-beer").checked = !!S.today.active.beer;
    if ($("act-hard")) $("act-hard").checked = !!S.today.active.hard;
    if ($("act-liqueur")) $("act-liqueur").checked = !!S.today.active.liqueur;

    reflectAlcoholExclusivityUI(S);
  }

  // ------- Exclusivité visuelle alcool global ↔ sous-alcools -------
  function reflectAlcoholExclusivityUI(S) {
    const a = S.today.active || {};
    const alcoholOn = !!a.alcohol;

    // Si alcool global ON, on grise les sous-alcools
    ["act-beer", "act-hard", "act-liqueur"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.disabled = alcoholOn;
      if (alcoholOn) el.checked = false;
    });

    // Si un sous-alcool est ON, on grise alcool global
    const anySub = !!a.beer || !!a.hard || !!a.liqueur;
    const g = $("act-alcohol");
    if (g) {
      g.disabled = anySub;
      if (anySub) g.checked = false;
    }
  }

  // ------- Lecture formulaire → S (sans onRefresh) -------
  function readSettingsInto(S) {
    // Profil / i18n / devise
    if ($("cfg-name")) S.profile.name = valStr($("cfg-name"));
    if ($("cfg-lang")) S.profile.lang = valStr($("cfg-lang")) || "fr";
    if ($("cfg-currency")) S.profile.currency = valStr($("cfg-currency")) || "EUR";
    if ($("cfg-currency-pos")) S.profile.currencyPos = valStr($("cfg-currency-pos")) || "before";

    // Tarifs
    if ($("price-cigs")) S.prices.cigs = valNum($("price-cigs"));
    if ($("price-weed")) S.prices.weed = valNum($("price-weed"));
    if ($("price-beer")) S.prices.beer = valNum($("price-beer"));
    if ($("price-hard")) S.prices.hard = valNum($("price-hard"));
    if ($("price-liqueur")) S.prices.liqueur = valNum($("price-liqueur"));
    if ($("price-alcohol")) S.prices.alcohol = valNum($("price-alcohol"));

    // Modules + dates
    if ($("mod-cigs")) S.modules.cigs = valBool($("mod-cigs"));
    if ($("mod-weed")) S.modules.weed = valBool($("mod-weed"));
    if ($("mod-alcohol")) S.modules.alcohol = valBool($("mod-alcohol"));

    if ($("since-cigs")) {
      const v = valStr($("since-cigs"));
      S.enabled_since.cigs = v || null;
    }
    if ($("since-weed")) {
      const v = valStr($("since-weed"));
      S.enabled_since.weed = v || null;
    }
    if ($("since-alcohol")) {
      const v = valStr($("since-alcohol"));
      S.enabled_since.alcohol = v || null;
    }

    // Activation du jour
    if ($("act-cigs")) S.today.active.cigs = valBool($("act-cigs"));
    if ($("act-weed")) S.today.active.weed = valBool($("act-weed"));
    if ($("act-alcohol")) S.today.active.alcohol = valBool($("act-alcohol"));

    if ($("act-beer")) S.today.active.beer = valBool($("act-beer"));
    if ($("act-hard")) S.today.active.hard = valBool($("act-hard"));
    if ($("act-liqueur")) S.today.active.liqueur = valBool($("act-liqueur"));

    // Cohérence après saisie
    ensureCoherence(S);
    reflectAlcoholExclusivityUI(S);
    return S;
  }

  // ------- Sauvegarde + onRefresh (chaîne unique) -------
  function writeAndRefresh(S, onRefresh) {
    saveState(S);
    try {
      if (typeof onRefresh === "function") onRefresh();
    } catch (e) {
      console.warn("[settings] onRefresh error:", e);
    }
  }

  // ------- Import/Export TOUT -------
  function handleExportJSON(S) {
    const blob = new Blob([exportAllState(S)], { type: "application/json" });
    const a = document.createElement("a");
    const d = S.today?.date || todayLocalISO();
    a.href = URL.createObjectURL(blob);
    a.download = `stopaddict_backup_${d}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function handleImportJSON(onRefresh) {
    const fileInput = $("file-import-json");
    if (!fileInput) return;

    fileInput.onchange = async (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const next = importAllState(text);
        reflectSettingsUI(next);
        writeAndRefresh(next, onRefresh);
        alert("Import terminé ✔");
      } catch (e) {
        console.error(e);
        alert("Échec de l’import (JSON invalide).");
      } finally {
        fileInput.value = "";
      }
    };
    fileInput.click();
  }

  // ------- Export CSV (historique) -------
  function exportHistoryCSV(S) {
    const rows = [];
    rows.push(["date", "cigs", "weed", "alcohol", "beer", "hard", "liqueur", "cost"]);
    const keys = Object.keys(S.history || {}).sort();
    for (const d of keys) {
      const h = S.history[d] || {};
      const dayCounters = {
        cigs: +h.cigs || 0,
        weed: +h.weed || 0,
        alcohol: +h.alcohol || 0,
        beer: +h.beer || 0,
        hard: +h.hard || 0,
        liqueur: +h.liqueur || 0
      };
      const cost = calculateDayCost(S, dayCounters);
      rows.push([d, dayCounters.cigs, dayCounters.weed, dayCounters.alcohol, dayCounters.beer, dayCounters.hard, dayCounters.liqueur, cost]);
    }
    const csv = rows.map(r => r.map(x => String(x).replaceAll('"', '""')).map(x => `"${x}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_history.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  // ------- Bind listeners (Réglages) -------
  function bindSettingsListeners(S, onRefresh) {
    // Save
    const saveBtn = $("btn-save-settings");
    if (saveBtn) {
      saveBtn.onclick = () => {
        readSettingsInto(S);
        writeAndRefresh(S, onRefresh);
        alert("Réglages enregistrés ✔");
      };
    }

    // Clear all
    const clearBtn = $("btn-clear-all");
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (!confirm("Tout supprimer et réinitialiser ?")) return;
        const fresh = (StateAPI.defaultState && StateAPI.defaultState()) || {};
        // Conserver la langue si possible
        if (S?.profile?.lang) fresh.profile.lang = S.profile.lang;
        saveState(fresh);
        if (window.S) window.S = fresh;
        reflectSettingsUI(fresh);
        writeAndRefresh(fresh, onRefresh);
      };
    }

    // Import / Export JSON
    const expJson = $("btn-export-json");
    if (expJson) expJson.onclick = () => handleExportJSON(S);

    const impJson = $("btn-import-json");
    if (impJson) impJson.onclick = () => handleImportJSON(onRefresh);

    // Export CSV (depuis Réglages) + (depuis Accueil si présent)
    const expCsv2 = $("btn-export-csv-2");
    if (expCsv2) expCsv2.onclick = () => exportHistoryCSV(S);
    const expCsv1 = $("btn-export-csv");
    if (expCsv1) expCsv1.onclick = () => exportHistoryCSV(S);

    // Exclusivité alcool : dès qu’on touche à un toggle, on maintient la règle
    const alcoholGlobal = $("act-alcohol");
    ["act-alcohol", "act-beer", "act-hard", "act-liqueur"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.onchange = () => {
        readSettingsInto(S);          // met à jour S.today.active.*
        reflectAlcoholExclusivityUI(S); // grise/dégrise
        writeAndRefresh(S, onRefresh);
      };
    });

    // Disponibilité modules : applique cohérence si alcool indisponible
    ["mod-cigs", "mod-weed", "mod-alcohol"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.onchange = () => {
        readSettingsInto(S);
        writeAndRefresh(S, onRefresh);
      };
    });

    // Tarifs & profil & langue/devise : save à la volée (optionnel)
    [
      "cfg-name","cfg-lang","cfg-currency","cfg-currency-pos",
      "price-cigs","price-weed","price-beer","price-hard","price-liqueur","price-alcohol",
      "since-cigs","since-weed","since-alcohol"
    ].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.onchange = () => {
        readSettingsInto(S);
        writeAndRefresh(S, onRefresh);
      };
    });
  }

  // ------- API publique Settings -------
  const Settings = {
    init(ctx) {
      // Contexte minimal requis : { S, onRefresh }
      const S = ctx && ctx.S ? ctx.S : window.S;
      const onRefresh = (ctx && typeof ctx.onRefresh === "function") ? ctx.onRefresh : null;
      if (!S) {
        console.warn("[settings] état S manquant");
        return;
      }
      // Réflexion initiale puis bind des listeners
      reflectSettingsUI(S);
      bindSettingsListeners(S, onRefresh);
    },
    // Utilitaire : relire l’UI (si tu veux forcer depuis ailleurs)
    syncFromForm() {
      const S = window.S;
      if (!S) return;
      readSettingsInto(S);
      saveState(S);
    },
    // Utilitaire : réafficher le formulaire depuis S
    reflect() {
      const S = window.S;
      if (!S) return;
      reflectSettingsUI(S);
    }
  };

  // Expose
  window.StopAddictSettings = Settings;
})();
