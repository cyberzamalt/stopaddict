// ============================================================
// StopAddict v3 - state.js
// Cœur de l'état applicatif (profil, modules, prix, habitudes,
// dates, historique, identité / majorité, import / export)
// ============================================================
(function () {
  "use strict";

  // ----------------------------------------------------------
  // Petit helper global DOM : remplace jQuery $()
  // ----------------------------------------------------------
  if (!window.$) {
    window.$ = function (sel) {
      if (typeof sel !== "string") return null;
      if (sel[0] === "#") return document.getElementById(sel.slice(1));
      return document.querySelector(sel);
    };
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  const STORAGE_KEYS = [
    "stopaddict_state_v3",   // clé actuelle
    "stopaddict_state",      // anciennes clés possibles
    "stopaddict"
  ];
  const CURRENT_KEY = STORAGE_KEYS[0];

  let currentState = null; // <- état en mémoire, partagé avec window.S

  function todayISO() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  function log(level, msg, data) {
    if (window.Logger && typeof window.Logger.log === "function") {
      window.Logger.log(level, "[state] " + msg, data);
    } else {
      if (data !== undefined) {
        console.log("[state][" + level + "] " + msg, data);
      } else {
        console.log("[state][" + level + "] " + msg);
      }
    }
  }

  // ----------------------------------------------------------
  // État par défaut
  // ----------------------------------------------------------
  const DEFAULT_STATE = {
    profile: {
      name: "",
      lang: "fr",
      currency: "€",
      currencyPos: "after"
    },
    identity: {
      age: null,
      isAdult: false
    },
    legal: {
      acceptedCGU: false
    },
    modules: {
      cigs: true,
      joints: true,
      alcohol: true,  // global alcool
      beer: false,    // sous-types
      hard: false,
      liqueur: false
    },
    enabled_since: {
      cigs: null,
      joints: null,
      alcohol: null
    },
    habits: {
      goal: {
        cigs: null,
        joints: null,
        alcohol: null
      },
      stopDate: null
    },
    prices: {
      cigs: null,
      joints: null,
      beer: null,
      hard: null,
      liqueur: null,
      alcohol: null
    },
    today: {
      date: todayISO(),
      counters: {
        cigs: 0,
        joints: 0,
        alcohol: 0,
        beer: 0,
        hard: 0,
        liqueur: 0
      }
    },
    history: {
      // "YYYY-MM-DD": { counters:{...}, meta:{...} }
    },
    meta: {
      version: 3,
      lastSeenDate: todayISO()
    }
  };

  // ----------------------------------------------------------
  // Merge récursif : on complète les anciens états avec le défaut
  // ----------------------------------------------------------
  function mergeDefaults(target, defaults) {
    if (!target || typeof target !== "object") return clone(defaults);
    const out = Array.isArray(defaults) ? [] : {};
    const keys = new Set([
      ...Object.keys(defaults || {}),
      ...Object.keys(target || {})
    ]);
    keys.forEach((k) => {
      const defVal = defaults ? defaults[k] : undefined;
      const curVal = target ? target[k] : undefined;
      if (defVal && typeof defVal === "object" && !Array.isArray(defVal)) {
        out[k] = mergeDefaults(curVal || {}, defVal);
      } else if (curVal === undefined) {
        out[k] = defVal;
      } else {
        out[k] = curVal;
      }
    });
    return out;
  }

  // ----------------------------------------------------------
  // Chargement brut depuis localStorage
  // ----------------------------------------------------------
  function loadRaw() {
    let raw = null;
    let keyUsed = null;

    for (const key of STORAGE_KEYS) {
      try {
        const v = localStorage.getItem(key);
        if (v) {
          raw = JSON.parse(v);
          keyUsed = key;
          break;
        }
      } catch (e) {
        log("WARN", "Impossible de lire " + key + " depuis localStorage", e);
      }
    }

    if (!raw) {
      const fresh = clone(DEFAULT_STATE);
      log("INFO", "Aucun état trouvé, utilisation de l'état par défaut.", fresh);
      return fresh;
    }

    const merged = mergeDefaults(raw, DEFAULT_STATE);
    merged.meta = merged.meta || {};
    merged.meta.version = 3;
    if (!merged.meta.lastSeenDate) {
      merged.meta.lastSeenDate = todayISO();
    }
    log("INFO", "État brut chargé depuis " + (keyUsed || "inconnu"), merged);
    return merged;
  }

  // ----------------------------------------------------------
  // Coherence métier
  // ----------------------------------------------------------
  function ensureCoherence(state) {
    // Sécurité structure
    state.profile = mergeDefaults(state.profile, DEFAULT_STATE.profile);
    state.identity = mergeDefaults(state.identity, DEFAULT_STATE.identity);
    state.legal = mergeDefaults(state.legal, DEFAULT_STATE.legal);
    state.modules = mergeDefaults(state.modules, DEFAULT_STATE.modules);
    state.enabled_since = mergeDefaults(state.enabled_since, DEFAULT_STATE.enabled_since);
    state.habits = mergeDefaults(state.habits, DEFAULT_STATE.habits);
    state.prices = mergeDefaults(state.prices, DEFAULT_STATE.prices);
    state.today = mergeDefaults(state.today, DEFAULT_STATE.today);
    state.history = state.history || {};
    state.meta = mergeDefaults(state.meta, DEFAULT_STATE.meta);

    // Date du jour cohérente
    if (!state.today.date) {
      state.today.date = todayISO();
    }

    // Règle alcool global vs sous-types :
    const m = state.modules;
    if (m.alcohol) {
      m.beer = false;
      m.hard = false;
      m.liqueur = false;
    } else if (m.beer || m.hard || m.liqueur) {
      m.alcohol = false;
    }

    // Habitudes : valeurs négatives interdites
    ["cigs", "joints", "alcohol"].forEach((k) => {
      let v = state.habits.goal[k];
      if (v != null && v < 0) state.habits.goal[k] = 0;
    });

    // Prices : négatifs -> 0
    Object.keys(state.prices).forEach((k) => {
      const v = state.prices[k];
      if (v != null && v < 0) state.prices[k] = 0;
    });

    // Meta lastSeenDate
    if (!state.meta.lastSeenDate) {
      state.meta.lastSeenDate = todayISO();
    }

    return state;
  }

  // ----------------------------------------------------------
  // Chargement public
  // ----------------------------------------------------------
  function load() {
    if (currentState) {
      return currentState;
    }
    const s = ensureCoherence(loadRaw());
    currentState = s;
    window.S = s; // <- important pour app.js (S.today, etc.)
    log("INFO", "État initial chargé", s);
    return s;
  }

  // ----------------------------------------------------------
  // Sauvegarde
  // ----------------------------------------------------------
  function save(state) {
    try {
      const toSave = ensureCoherence(clone(state));
      currentState = toSave;
      window.S = toSave; // <- garder S synchronisé
      localStorage.setItem(CURRENT_KEY, JSON.stringify(toSave));
      log("INFO", "État sauvegardé", toSave);
    } catch (e) {
      log("WARN", "Échec de la sauvegarde de l'état", e);
    }
  }

  // ----------------------------------------------------------
  // updateState : met à jour l'état SANS appeler App.onRefresh()
  // (pour éviter les boucles infinies)
  // ----------------------------------------------------------
  function updateState(mutator) {
    const base = load(); // garantit que currentState & S sont initialisés
    let next;

    if (typeof mutator === "function") {
      const draft = clone(base);
      const res = mutator(draft) || draft;
      next = res;
    } else if (mutator && typeof mutator === "object") {
      next = Object.assign(clone(base), mutator);
    } else {
      next = base;
    }

    ensureCoherence(next);
    save(next);
    return next;
  }

  // ----------------------------------------------------------
  // Coût d'une journée
  // ----------------------------------------------------------
  function calculateDayCost(state, day) {
    const s = state || load();
    const d = day || s.today || {};
    const counters =
      d.counters ||
      d.today ||
      s.today?.counters ||
      s.today ||
      {};

    const prices = s.prices || {};
    const keys = ["cigs", "joints", "beer", "hard", "liqueur", "alcohol"];
    const breakdown = {};
    let total = 0;

    keys.forEach((k) => {
      const nb = Number(counters[k] || 0);
      const price = Number(prices[k] || 0);
      const cost = nb * price;
      breakdown[k] = cost;
      total += cost;
    });

    return {
      total,
      breakdown
    };
  }

  // ----------------------------------------------------------
  // Export complet
  // ----------------------------------------------------------
  function exportAll() {
    const state = load();
    const payload = {
      schema: "stopaddict-v3",
      exportedAt: new Date().toISOString(),
      state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_export_" + todayISO() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    log("INFO", "Export complet déclenché", payload);
  }

  // ----------------------------------------------------------
  // Import complet
  // ----------------------------------------------------------
  function importAll(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const importedState = parsed.state || parsed;

      const ensured = ensureCoherence(importedState);
      save(ensured);
      log("INFO", "Import réussi", ensured);
      return ensured;
    } catch (e) {
      log("WARN", "Échec de l'import", e);
      alert("Import impossible : fichier invalide.");
      return load();
    }
  }

  // ----------------------------------------------------------
  // Expose API globale
  // ----------------------------------------------------------
  window.StopAddictState = {
    load,
    save,
    updateState,
    ensureCoherence,
    calculateDayCost,
    exportAll,
    importAll
  };

  // Initialisation immédiate de S au premier chargement
  load();

})();
