// ============================================================
// state.js — Source unique de vérité (PHASE 2)
// ============================================================
// Objectif : un seul endroit pour localStorage, un seul event bus.
// Les modules parlent à state.js, pas les uns aux autres directement.
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
// Calculs agrégés (KPIs)
// ============================================================
export function totalsForDate(date = new Date()) {
  const key = ymd(date);
  const day = getDaily(key);
  return {
    cigs: day.cigs || 0,
    weed: day.weed || 0,
    alcohol: day.alcohol || 0,
    total: (day.cigs || 0) + (day.weed || 0) + (day.alcohol || 0),
  };
}

export function totalsForWeek(date = new Date()) {
  const dt = new Date(date);
  const dayIdx = (dt.getDay() + 6) % 7; // 0 = lundi
  const monday = new Date(dt);
  monday.setDate(dt.getDate() - dayIdx);

  let sum = { cigs: 0, weed: 0, alcohol: 0 };
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const daily = totalsForDate(d);
    sum.cigs += daily.cigs;
    sum.weed += daily.weed;
    sum.alcohol += daily.alcohol;
  }

  return {
    ...sum,
    total: sum.cigs + sum.weed + sum.alcohol,
  };
}

export function totalsForMonth(date = new Date()) {
  const dt = new Date(date);
  const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  const next = new Date(dt.getFullYear(), dt.getMonth() + 1, 1);

  let sum = { cigs: 0, weed: 0, alcohol: 0 };
  for (let d = new Date(first); d < next; d.setDate(d.getDate() + 1)) {
    const daily = totalsForDate(d);
    sum.cigs += daily.cigs;
    sum.weed += daily.weed;
    sum.alcohol += daily.alcohol;
  }

  return {
    ...sum,
    total: sum.cigs + sum.weed + sum.alcohol,
  };
}

export function getTotalsForRange(range = "day", date = new Date()) {
  try {
    let result;
    if (range === "day") result = totalsForDate(date);
    else if (range === "week") result = totalsForWeek(date);
    else if (range === "month") result = totalsForMonth(date);
    else result = totalsForDate(date); // fallback

    console.log(`[state.getTotalsForRange] ${range}:`, result);
    return result;
  } catch (e) {
    console.error("[state.getTotalsForRange] error:", e);
    return { cigs: 0, weed: 0, alcohol: 0, total: 0 };
  }
}

console.log("[state.js] ✓ Ready");
