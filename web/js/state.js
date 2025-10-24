// ============================================================
// state.js — Source unique de vérité (PHASE 2 - v2.4.4)
// ============================================================
// Objectif : un seul endroit pour localStorage, un seul event bus.
// Les modules parlent à state.js, pas les uns aux autres directement.
// ============================================================
// AJOUT PHASE 2 :
// - getAggregates(range, date) : API unique pour tous les agrégats
// - Support "year" en plus de day/week/month
// - Cohérence clé : "alcohol" partout (pas "alcool")
// ============================================================

console.log("[state.js] Module loaded");

// ============================================================
// Event bus centralisé
// ============================================================
const bus = new EventTarget();

export function emit(eventName, detail = {}) {
  try {
    console.log(`[state.emit] ${eventName}`, detail);
    bus.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (e) {
    console.error("[state.emit] error:", e, eventName);
  }
}

export function on(eventName, handler) {
  try {
    bus.addEventListener(eventName, handler);
    return () => bus.removeEventListener(eventName, handler);
  } catch (e) {
    console.error("[state.on] error:", e);
    return () => {};
  }
}

// ============================================================
// Clés localStorage unifiées
// ============================================================
const LS_KEYS = {
  DAILY:     "sa_daily_v1",        // { "YYYY-MM-DD": { cigs, weed, alcohol } }
  SETTINGS:  "sa_settings_v1",     // { modules: {cigs, weed, alcohol}, prices: {...} }
  LIMITS:    "sa_limits_v1",       // { cigs, weed, alcohol_biere, alcohol_fort, alcohol_liqueur }
  ECONOMY:   "sa_economy_v1",      // { enabled, cigs, weed, alcohol_biere, ... }
  WARN:      "sa_warn_v1",         // { accepted, hide, timestamp }
};

// ============================================================
// Période active (source unique)
// ============================================================
let currentRange = "day"; // day, week, month, year

export function getCurrentRange() {
  return currentRange;
}

export function setCurrentRange(range) {
  if (!["day", "week", "month", "year"].includes(range)) {
    console.warn("[state.setCurrentRange] invalid range:", range);
    return false;
  }
  currentRange = range;
  console.log("[state.setCurrentRange]", range);
  emit("sa:range-changed", { range });
  return true;
}

// ============================================================
// Utilitaires date
// ============================================================
export function ymd(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function nowHour() {
  return new Date().getHours();
}

// ============================================================
// Helpers : JSON safe
// ============================================================
function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[state.readJSON] parse fail for ${key}:`, e);
    return fallback;
  }
}

function writeJSON(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error(`[state.writeJSON] write fail for ${key}:`, e);
    return false;
  }
}

// ============================================================
// API Settings (modules on/off, prix, etc.)
// ============================================================
export function getSettings() {
  return readJSON(LS_KEYS.SETTINGS, {
    modules: { cigs: true, weed: true, alcohol: true },
    prices: { cigs: 0, weed: 0, beer: 0, fort: 0, liqueur: 0 },
  });
}

export function saveSettings(next) {
  try {
    const ok = writeJSON(LS_KEYS.SETTINGS, next);
    if (ok) {
      console.log("[state.saveSettings]", next);
      emit("sa:settings-updated", { settings: next });
    }
    return ok;
  } catch (e) {
    console.error("[state.saveSettings] error:", e);
    return false;
  }
}

export function setSetting(keyPath, value) {
  try {
    const s = getSettings();
    const keys = keyPath.split(".");
    let current = s;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    return saveSettings(s);
  } catch (e) {
    console.error("[state.setSetting] error:", e);
    return false;
  }
}

// ============================================================
// API Limites
// ============================================================
export function getLimits() {
  return readJSON(LS_KEYS.LIMITS, {
    cigs: 20,
    weed: 3,
    alcohol_biere: 2,
    alcohol_fort: 1,
    alcohol_liqueur: 1,
  });
}

export function saveLimits(next) {
  try {
    const ok = writeJSON(LS_KEYS.LIMITS, next);
    if (ok) {
      console.log("[state.saveLimits]", next);
      emit("sa:limits-updated", { limits: next });
    }
    return ok;
  } catch (e) {
    console.error("[state.saveLimits] error:", e);
    return false;
  }
}

// ============================================================
// API Économie
// ============================================================
export function getEconomy() {
  return readJSON(LS_KEYS.ECONOMY, {
    enabled: true,
    cigs: 0,
    weed: 0,
    alcohol_biere: 0,
    alcohol_fort: 0,
    alcohol_liqueur: 0,
  });
}

export function saveEconomy(next) {
  try {
    const ok = writeJSON(LS_KEYS.ECONOMY, next);
    if (ok) {
      console.log("[state.saveEconomy]", next);
      emit("sa:economy-updated", { economy: next });
    }
    return ok;
  } catch (e) {
    console.error("[state.saveEconomy] error:", e);
    return false;
  }
}

// ============================================================
// API Avertissement 18+
// ============================================================
export function getWarnState() {
  return readJSON(LS_KEYS.WARN, {});
}

export function saveWarnState(next) {
  try {
    const ok = writeJSON(LS_KEYS.WARN, next);
    if (ok) {
      console.log("[state.saveWarnState]", next);
      emit("sa:warn-updated", { warn: next });
    }
    return ok;
  } catch (e) {
    console.error("[state.saveWarnState] error:", e);
    return false;
  }
}

// ============================================================
// API Données journalières
// ============================================================
export function getDaily(dateKey = ymd()) {
  const store = readJSON(LS_KEYS.DAILY, {});
  return store[dateKey] || { cigs: 0, weed: 0, alcohol: 0 };
}

export function getAllDaily() {
  return readJSON(LS_KEYS.DAILY, {});
}

export function addEntry(type, qty = 1, date = new Date()) {
  try {
    if (!["cigs", "weed", "alcohol"].includes(type)) {
      console.error("[state.addEntry] invalid type:", type);
      return false;
    }

    const key = ymd(date);
    const hour = nowHour();
    const store = getAllDaily();

    if (!store[key]) {
      store[key] = { cigs: 0, weed: 0, alcohol: 0 };
    }

    store[key][type] = Math.max(0, (store[key][type] || 0) + qty);

    // Détail horaire (optionnel, pour futur)
    if (!store[key].hours) store[key].hours = {};
    if (!store[key].hours[hour]) store[key].hours[hour] = {};
    store[key].hours[hour][type] = Math.max(0, (store[key].hours[hour][type] || 0) + qty);

    const ok = writeJSON(LS_KEYS.DAILY, store);
    if (ok) {
      console.log(`[state.addEntry] +1 ${type} on ${key}`);
      emit("sa:counts-updated", {
        date: new Date(date),
        counts: store[key],
        dateKey: key,
      });
    }
    return ok;
  } catch (e) {
    console.error("[state.addEntry] error:", e);
    return false;
  }
}

export function removeEntry(type, qty = 1, date = new Date()) {
  try {
    if (!["cigs", "weed", "alcohol"].includes(type)) {
      console.error("[state.removeEntry] invalid type:", type);
      return false;
    }

    const key = ymd(date);
    const store = getAllDaily();
    const day = store[key];

    if (!day) return false;

    day[type] = Math.max(0, (day[type] || 0) - qty);

    // Nettoyage si vide
    const hasData = day.cigs || day.weed || day.alcohol;
    if (!hasData) {
      delete store[key];
    }

    const ok = writeJSON(LS_KEYS.DAILY, store);
    if (ok) {
      console.log(`[state.removeEntry] -1 ${type} on ${key}`);
      emit("sa:counts-updated", {
        date: new Date(date),
        counts: store[key] || { cigs: 0, weed: 0, alcohol: 0 },
        dateKey: key,
      });
    }
    return ok;
  } catch (e) {
    console.error("[state.removeEntry] error:", e);
    return false;
  }
}

// ============================================================
// Calculs agrégés (PHASE 2 - API unique getAggregates)
// ============================================================

/**
 * totalsForDate - Retourne les totaux pour une date donnée
 */
export function totalsForDate(date = new Date()) {
  const key = ymd(date);
  const day = getDaily(key);
  return {
    cigarettes: day.cigs || 0,
    joints: day.weed || 0,
    alcohol: day.alcohol || 0,
    total: (day.cigs || 0) + (day.weed || 0) + (day.alcohol || 0),
  };
}

/**
 * totalsForWeek - Retourne les totaux pour la semaine ISO (lundi-dimanche)
 */
export function totalsForWeek(date = new Date()) {
  const dt = new Date(date);
  const dayIdx = (dt.getDay() + 6) % 7; // 0 = lundi ISO
  const monday = new Date(dt);
  monday.setDate(dt.getDate() - dayIdx);

  let sum = { cigarettes: 0, joints: 0, alcohol: 0 };
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const daily = totalsForDate(d);
    sum.cigarettes += daily.cigarettes;
    sum.joints += daily.joints;
    sum.alcohol += daily.alcohol;
  }

  return {
    ...sum,
    total: sum.cigarettes + sum.joints + sum.alcohol,
  };
}

/**
 * totalsForMonth - Retourne les totaux pour le mois
 */
export function totalsForMonth(date = new Date()) {
  const dt = new Date(date);
  const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  const next = new Date(dt.getFullYear(), dt.getMonth() + 1, 1);

  let sum = { cigarettes: 0, joints: 0, alcohol: 0 };
  for (let d = new Date(first); d < next; d.setDate(d.getDate() + 1)) {
    const daily = totalsForDate(d);
    sum.cigarettes += daily.cigarettes;
    sum.joints += daily.joints;
    sum.alcohol += daily.alcohol;
  }

  return {
    ...sum,
    total: sum.cigarettes + sum.joints + sum.alcohol,
  };
}

/**
 * totalsForYear - Retourne les totaux pour l'année (PHASE 2 - nouveau)
 */
export function totalsForYear(date = new Date()) {
  const dt = new Date(date);
  const first = new Date(dt.getFullYear(), 0, 1);
  const next = new Date(dt.getFullYear() + 1, 0, 1);

  let sum = { cigarettes: 0, joints: 0, alcohol: 0 };
  for (let d = new Date(first); d < next; d.setDate(d.getDate() + 1)) {
    const daily = totalsForDate(d);
    sum.cigarettes += daily.cigarettes;
    sum.joints += daily.joints;
    sum.alcohol += daily.alcohol;
  }

  return {
    ...sum,
    total: sum.cigarettes + sum.joints + sum.alcohol,
  };
}

/**
 * getAggregates - API UNIQUE pour tous les agrégats (PHASE 2)
 * @param {string} range - "day", "week", "month", "year"
 * @param {Date} date - Date de référence
 * @returns {object} { cigarettes, joints, alcohol } - Toujours des entiers
 * 
 * Règle : Retourne TOUJOURS les 3 valeurs (0 si module désactivé)
 * C'est l'UI qui décide si elle grise ou masque la ligne
 */
export function getAggregates(range = "day", date = new Date()) {
  try {
    const settings = getSettings();
    let result;

    // Calcul selon le range
    if (range === "day") result = totalsForDate(date);
    else if (range === "week") result = totalsForWeek(date);
    else if (range === "month") result = totalsForMonth(date);
    else if (range === "year") result = totalsForYear(date);
    else result = totalsForDate(date); // fallback

    // Appliquer les modules désactivés (0 si off)
    const modules = settings.modules || { cigs: true, weed: true, alcohol: true };
    
    const aggregates = {
      cigarettes: modules.cigs ? (result.cigarettes || 0) : 0,
      joints: modules.weed ? (result.joints || 0) : 0,
      alcohol: modules.alcohol ? (result.alcohol || 0) : 0,
    };

    console.log(`[state.getAggregates] ${range}:`, aggregates);
    return aggregates;
  } catch (e) {
    console.error("[state.getAggregates] error:", e);
    return { cigarettes: 0, joints: 0, alcohol: 0 };
  }
}

/**
 * getTotalsForRange - Alias pour compatibilité (DEPRECATED, utiliser getAggregates)
 */
export function getTotalsForRange(range = "day", date = new Date()) {
  const agg = getAggregates(range, date);
  return {
    cigs: agg.cigarettes,
    weed: agg.joints,
    alcohol: agg.alcohol,
    total: agg.cigarettes + agg.joints + agg.alcohol,
  };
}

console.log("[state.js] ✓ Ready (Phase 2 - v2.4.4)");
