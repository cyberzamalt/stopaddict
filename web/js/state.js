/* ============================================================
   StopAddict v3 — state.js
   Structure centrale (le “cerveau”)
   Gère : profil, identité, modules, prix, habitudes, historique,
          cohérence globale, sauvegarde automatique, import/export.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "StopAddictState";

  /* ============================================================
     🧩 Données par défaut
     ============================================================ */
  const DEFAULT_STATE = {
    profile: {
      name: "",
      lang: detectLang(),
      country: detectCountry(),
      currency: detectCurrency(),
      currencyPos: "before"
    },
    identity: { age: null, isAdult: false },
    legal: { acceptedCGU: false },
    modules: { cigs: true, joints: true, alcohol: true, beer: true, hard: true, liqueur: true },
    enabled_since: { cigs: null, joints: null, alcohol: null },
    habits: {
      goal: { cigs: null, joints: null, alcohol: null },
      stopDate: null
    },
    prices: {
      cigs: 0, joints: 0,
      beer: 0, hard: 0, liqueur: 0, alcohol: 0
    },
    today: {
      date: todayLocalISO(),
      counters: { cigs: 0, joints: 0, alcohol: 0, beer: 0, hard: 0, liqueur: 0 },
      active: { cigs: true, joints: true, alcohol: true, beer: true, hard: true, liqueur: true },
      goals: { cigs: null, joints: null, alcohol: null }
    },
    history: {},
    meta: { lastExportAt: null, warnDismissed: false }
  };

  /* ============================================================
     🧠 Utilitaires généraux
     ============================================================ */
  function todayLocalISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  function detectLang() {
    const lang = (navigator.language || "fr").slice(0, 2);
    return ["fr", "en"].includes(lang) ? lang : "fr";
  }

  function detectCountry() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale.split("-")[1] || "FR";
    } catch {
      return "FR";
    }
  }

  function detectCurrency() {
    try {
      const region = detectCountry();
      const map = { FR: "EUR", BE: "EUR", CH: "CHF", GB: "GBP", US: "USD", CA: "CAD" };
      return map[region] || "EUR";
    } catch {
      return "EUR";
    }
  }

  /* ============================================================
     💾 Chargement & compatibilité
     ============================================================ */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return compatLoad(parsed);
    } catch (e) {
      console.warn("[state] Échec chargement, reset:", e);
      return structuredClone(DEFAULT_STATE);
    }
  }

  function compatLoad(S) {
    // Complète les champs manquants (ajoutés après version monolith)
    const def = structuredClone(DEFAULT_STATE);
    for (const key in def) {
      if (!(key in S)) S[key] = def[key];
      else if (typeof def[key] === "object") {
        S[key] = { ...def[key], ...S[key] };
      }
    }
    // Correction de date du jour si ancienne version
    if (!S.today?.date) S.today.date = todayLocalISO();

    // S’assure que tous les modules existent
    for (const k in def.modules) {
      if (!(k in S.modules)) S.modules[k] = def.modules[k];
    }

    return S;
  }

  function saveState(S) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    } catch (e) {
      console.error("[state] Erreur saveState:", e);
    }
  }

  /* ============================================================
     🔁 Cohérence des modules et activations
     ============================================================ */
  function ensureCoherence(S) {
    const T = S.today;

    // Exclusivité alcool
    if (T.active.alcohol) {
      T.active.beer = false;
      T.active.hard = false;
      T.active.liqueur = false;
    } else if (T.active.beer || T.active.hard || T.active.liqueur) {
      T.active.alcohol = false;
    }

    // Cohérence modules ↔ active
    for (const key in T.active) {
      if (S.modules[key] === false) T.active[key] = false;
    }

    // Réactivation impossible si module désactivé
    for (const key in S.modules) {
      if (!S.modules[key]) T.active[key] = false;
    }

    return S;
  }

  /* ============================================================
     💰 Calcul des coûts (jour)
     ============================================================ */
  function calculateDayCost(S) {
    const T = S.today.counters;
    const P = S.prices;
    let cost = 0;

    // Alcool global ou sous-types exclusifs
    if (S.today.active.alcohol) {
      cost += T.alcohol * (P.alcohol || 0);
    } else {
      cost += (T.beer * (P.beer || 0)) +
              (T.hard * (P.hard || 0)) +
              (T.liqueur * (P.liqueur || 0));
    }

    cost += (T.cigs * (P.cigs || 0)) + (T.joints * (P.joints || 0));
    return cost;
  }

  /* ============================================================
     🔄 Mise à jour automatique (sauvegarde + refresh)
     ============================================================ */
  function updateState(mutator) {
    const S = window.S;
    if (!S) return;
    mutator(S);
    ensureCoherence(S);
    saveState(S);
    if (typeof window.onRefresh === "function") window.onRefresh();
  }

  /* ============================================================
     📦 Export / Import
     ============================================================ */
  function exportAll() {
    const S = window.S;
    const data = JSON.stringify(S, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stopaddict_backup.json";
    a.click();
    URL.revokeObjectURL(url);
    S.meta.lastExportAt = new Date().toISOString();
    saveState(S);
  }

  function importAll(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        window.S = compatLoad(imported);
        ensureCoherence(window.S);
        saveState(window.S);
        if (typeof callback === "function") callback(true);
        if (typeof window.onRefresh === "function") window.onRefresh();
      } catch (err) {
        console.error("[state] Import échoué:", err);
        if (typeof callback === "function") callback(false);
      }
    };
    reader.readAsText(file);
  }

  /* ============================================================
     🚀 Initialisation globale
     ============================================================ */
  window.S = loadState();
  ensureCoherence(window.S);

  // Expose API publique
  window.StopAddictState = {
    STORAGE_KEY,
    todayLocalISO,
    loadState,
    saveState,
    ensureCoherence,
    calculateDayCost,
    updateState,
    exportAll,
    importAll
  };

  console.info("[state] État initial chargé:", window.S);
})();
