/* ============================================================
   StopAddict — state.js  (v3, one-shot)
   Rôle : état global, compatibilité, coûts, cohérence.
   ============================================================ */

(function () {
  "use strict";

  // ---------- Constantes & stockage ----------
  const STORAGE_KEY = "stopaddict_state_v3";

  // Date locale (YYYY-MM-DD)
  function todayLocalISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  // ---------- État par défaut ----------
  function defaultState() {
    const today = todayLocalISO();
    return {
      profile: {
        name: "",           // prénom (facultatif)
        lang: "fr",         // "fr" | "en" | ...
        currency: "EUR",    // "EUR" | "USD" | "GBP" ...
        currencyPos: "before" // "before" | "after"
      },
      modules: {            // disponibilité (réglages)
        cigs: true,
        weed: true,
        alcohol: true
      },
      enabled_since: {      // bornes de suivi (réglages)
        cigs: null,         // "YYYY-MM-DD" | null
        weed: null,
        alcohol: null
      },
      prices: {             // tarifs unitaires
        cigs: 0,
        weed: 0,
        beer: 0,
        hard: 0,
        liqueur: 0,
        alcohol: 0          // prix unitaire si on suit l’alcool en global
      },
      habits: {             // objectifs / dates d’arrêt globales
        goal: {
          cigs: null,       // ex: 10 / jour
          weed: null,
          alcohol: null
        },
        stopDate: null      // "YYYY-MM-DD"
      },
      today: {              // journée courante
        date: today,
        counters: {
          cigs: 0,
          weed: 0,
          // Alcool (global OU sous-types)
          alcohol: 0,       // compteur global
          beer: 0,
          hard: 0,
          liqueur: 0
        },
        active: {           // activation du jour (UI Accueil / Réglages)
          cigs: true,
          weed: true,
          alcohol: false,   // exclusif avec beer/hard/liqueur
          beer: false,
          hard: false,
          liqueur: false
        },
        goals: {            // objectifs du jour (optionnels)
          cigs: null,
          weed: null,
          alcohol: null
        }
      },
      history: {            // "YYYY-MM-DD": { cigs, weed, alcohol, beer, hard, liqueur }
        // ex: "2025-11-10": { cigs: 12, weed: 1, alcohol: 0, beer: 2, hard: 0, liqueur: 0 }
      },
      // Réservé pour extensions (conseils, flags UI, etc.)
      meta: {
        lastExportAt: null,
        warnDismissed: false
      }
    };
  }

  // ---------- Compatibilité / migration ----------
  function compatLoad(S) {
    // Ajout des branches manquantes
    S.profile = S.profile || { name: "", lang: "fr", currency: "EUR", currencyPos: "before" };
    if (!S.profile.currencyPos) S.profile.currencyPos = "before";

    S.modules = S.modules || { cigs: true, weed: true, alcohol: true };
    ["cigs", "weed", "alcohol"].forEach(k => {
      if (typeof S.modules[k] !== "boolean") S.modules[k] = !!S.modules[k];
    });

    S.enabled_since = S.enabled_since || { cigs: null, weed: null, alcohol: null };
    ["cigs", "weed", "alcohol"].forEach(k => {
      if (!Object.prototype.hasOwnProperty.call(S.enabled_since, k)) S.enabled_since[k] = null;
    });

    S.prices = S.prices || {};
    ["cigs", "weed", "beer", "hard", "liqueur", "alcohol"].forEach(k => {
      if (typeof S.prices[k] !== "number") S.prices[k] = 0;
    });

    S.habits = S.habits || {};
    if (!S.habits.goal) S.habits.goal = { cigs: null, weed: null, alcohol: null };
    ["cigs", "weed", "alcohol"].forEach(k => {
      if (!Object.prototype.hasOwnProperty.call(S.habits.goal, k)) S.habits.goal[k] = null;
    });
    if (!("stopDate" in S.habits)) S.habits.stopDate = null;

    // today
    S.today = S.today || {};
    if (!S.today.date) S.today.date = todayLocalISO();
    S.today.counters = S.today.counters || {};
    ["cigs", "weed", "alcohol", "beer", "hard", "liqueur"].forEach(k => {
      if (typeof S.today.counters[k] !== "number") S.today.counters[k] = 0;
    });
    S.today.active = S.today.active || {};
    ["cigs", "weed", "alcohol", "beer", "hard", "liqueur"].forEach(k => {
      if (typeof S.today.active[k] !== "boolean") S.today.active[k] = false;
    });
    S.today.goals = S.today.goals || {};
    ["cigs", "weed", "alcohol"].forEach(k => {
      if (!Object.prototype.hasOwnProperty.call(S.today.goals, k)) S.today.goals[k] = null;
    });

    // history
    S.history = S.history || {};
    // Migration d’anciens noms possibles (ex: historique → history)
    if (S.historique && !Object.keys(S.history).length) {
      try {
        Object.keys(S.historique).forEach(d => {
          const h = S.historique[d] || {};
          S.history[d] = {
            cigs: +h.cigs || 0,
            weed: +h.weed || 0,
            alcohol: +h.alcohol || 0,
            beer: +h.beer || 0,
            hard: +h.hard || 0,
            liqueur: +h.liqueur || 0
          };
        });
      } catch (_) { /* ignore */ }
    }

    // Cohérence finale (exclusivité alcool)
    ensureCoherence(S);
    return S;
  }

  // ---------- Chargement / Sauvegarde ----------
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return compatLoad(defaultState());
      const parsed = JSON.parse(raw);
      return compatLoad(parsed);
    } catch (e) {
      console.warn("[state] loadState failed, using default", e);
      return compatLoad(defaultState());
    }
  }

  function saveState(S) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    } catch (e) {
      console.warn("[state] saveState failed", e);
    }
  }

  // ---------- Cohérence (exclusivité alcool) ----------
  function ensureCoherence(S) {
    // Règle : si today.active.alcohol == true → beer/hard/liqueur forcés à false (grisage côté UI)
    //         si l’un de beer/hard/liqueur == true → alcohol = false
    const a = S.today.active;
    if (a.alcohol) {
      a.beer = false;
      a.hard = false;
      a.liqueur = false;
    } else {
      if (a.beer || a.hard || a.liqueur) {
        a.alcohol = false;
      }
    }
    // Modules indisponibles → forcer les actives à false
    const m = S.modules;
    if (!m.cigs) a.cigs = false;
    if (!m.weed) a.weed = false;
    if (!m.alcohol) {
      a.alcohol = false; a.beer = false; a.hard = false; a.liqueur = false;
    }
    return S;
  }

  // ---------- Archivage journée ----------
  // Ajoute S.today.counters dans history[S.today.date] en cumul, puis remet à zéro.
  function persistTodayIntoHistory(S) {
    const d = S.today.date || todayLocalISO();
    const t = S.today.counters;
    const h = S.history[d] || { cigs: 0, weed: 0, alcohol: 0, beer: 0, hard: 0, liqueur: 0 };
    S.history[d] = {
      cigs: (h.cigs || 0) + (t.cigs || 0),
      weed: (h.weed || 0) + (t.weed || 0),
      alcohol: (h.alcohol || 0) + (t.alcohol || 0),
      beer: (h.beer || 0) + (t.beer || 0),
      hard: (h.hard || 0) + (t.hard || 0),
      liqueur: (h.liqueur || 0) + (t.liqueur || 0)
    };
    // RAZ pour la nouvelle journée
    ["cigs", "weed", "alcohol", "beer", "hard", "liqueur"].forEach(k => S.today.counters[k] = 0);
    return S;
  }

  // Si la date a changé, on peut (optionnel) archiver et avancer la journée
  function rollToToday(S, { archive = false } = {}) {
    const cur = todayLocalISO();
    if (S.today.date !== cur) {
      if (archive) persistTodayIntoHistory(S);
      S.today.date = cur;
    }
    return S;
  }

  // ---------- Coûts (centralisés) ----------
  // NB : on évite la double-comptabilisation alcool global vs sous-types.
  function normalizeAlcoholForCost(S, day) {
    const d = day || S.today.counters;
    const act = S.today.active || {};
    // Priorité logique :
    // 1) Si alcohol > 0 OU (act.alcohol === true), on ne compte PAS beer/hard/liqueur.
    // 2) Sinon, on ne compte pas alcohol (on utilise les sous-types).
    const useGlobal = (d.alcohol > 0) || !!act.alcohol;
    return {
      cigs: d.cigs || 0,
      weed: d.weed || 0,
      alcohol: useGlobal ? (d.alcohol || 0) : 0,
      beer:  useGlobal ? 0 : (d.beer || 0),
      hard:  useGlobal ? 0 : (d.hard || 0),
      liqueur: useGlobal ? 0 : (d.liqueur || 0)
    };
  }

  // Coût d’une journée (par défaut : S.today)
  function calculateDayCost(S, dayCounters /* optional */) {
    const cnt = dayCounters ? normalizeAlcoholForCost(S, dayCounters)
                            : normalizeAlcoholForCost(S, S.today.counters);
    const P = S.prices;
    const cost =
      (cnt.cigs    * (P.cigs    || 0)) +
      (cnt.weed    * (P.weed    || 0)) +
      (cnt.alcohol * (P.alcohol || 0)) +
      (cnt.beer    * (P.beer    || 0)) +
      (cnt.hard    * (P.hard    || 0)) +
      (cnt.liqueur * (P.liqueur || 0));
    return Number.isFinite(cost) ? cost : 0;
  }

  // ---------- Export / Import (tout) ----------
  function exportAllState(S) {
    // On exporte TOUT l’état, aucune perte (restauration complète)
    return JSON.stringify(S, null, 2);
  }

  function importAllState(jsonText) {
    let next;
    try {
      next = JSON.parse(jsonText);
    } catch (e) {
      throw new Error("JSON invalide");
    }
    next = compatLoad(next);
    saveState(next);
    // expose aussi S global mis à jour si présent
    if (window.S) window.S = next;
    return next;
  }

  // ---------- Exposition globale ----------
  const S = loadState();
  // Toujours mettre la date du jour (sans archiver automatiquement)
  rollToToday(S, { archive: false });
  ensureCoherence(S);
  saveState(S);

  // Expose l’état et les helpers
  window.S = S;
  window.StopAddictState = {
    STORAGE_KEY,
    loadState,
    saveState,
    defaultState,
    compatLoad,
    ensureCoherence,
    rollToToday,
    persistTodayIntoHistory,
    calculateDayCost,
    exportAllState,
    importAllState,
    todayLocalISO
  };
})();
