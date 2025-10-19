// web/js/state.js
// Store & event bus centralisés pour StopAddict

// ---------- Event bus ----------
const bus = new EventTarget();

export function emit(name, detail = {}) {
  try { bus.dispatchEvent(new CustomEvent(name, { detail })); }
  catch (e) { console.error("[state.emit] error:", e, name, detail); }
}

export function on(name, handler) {
  bus.addEventListener(name, handler);
  return () => bus.removeEventListener(name, handler);
}

// ---------- Utils clés/temps ----------
export function ymd(d = new Date()) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function nowHour() {
  const d = new Date();
  return d.getHours(); // 0..23
}

// ---------- Namespaces LocalStorage ----------
const LS_SETTINGS = "sa_settings_v1";
const LS_DAILY    = "sa_daily_v1";
const LS_ECO      = "sa_economy_v1";
const LS_SEGMENTS = "sa_segments_v1"; // segments actifs (clopes: classic/rolled/tube, alcool: beer/fort/liqueur)

// ---------- Accès stockage sûr ----------
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("[state.readJSON] parse fail for", key, e);
    return fallback;
  }
}

function writeJSON(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error("[state.writeJSON] write fail for", key, e);
    return false;
  }
}

// ---------- Settings ----------
export function getSettings() {
  // Télécommande modules + prix, etc.
  return readJSON(LS_SETTINGS, {
    modules: { cigs: true, weed: true, alcohol: true },
    prices:  { cigs: 0, weed: 0, beer: 0, fort: 0, liqueur: 0 },
    i18n:    { lang: "fr" },
  });
}

export function saveSettings(next) {
  const ok = writeJSON(LS_SETTINGS, next);
  if (ok) {
    emit("state:settings", { settings: next });
    emit("state:changed",  { scope: "settings" });
  }
  return ok;
}

// ---------- Segments actifs (UI accueil) ----------
const DEFAULT_SEGMENTS = {
  cigs: { classic: true, rolled: false, tube: false },
  alcohol: { beer: true, fort: false, liqueur: false },
};

export function getActiveSegments() {
  const seg = readJSON(LS_SEGMENTS, DEFAULT_SEGMENTS);
  // garde au moins un segment actif par groupe
  if (!seg.cigs || Object.values(seg.cigs).every(v => !v)) seg.cigs = { ...DEFAULT_SEGMENTS.cigs };
  if (!seg.alcohol || Object.values(seg.alcohol).every(v => !v)) seg.alcohol = { ...DEFAULT_SEGMENTS.alcohol };
  return seg;
}

export function setActiveSegment(group, key, active) {
  const seg = getActiveSegments();
  if (!seg[group]) seg[group] = {};
  seg[group][key] = !!active;
  // Au moins 1 actif par groupe
  if (Object.values(seg[group]).every(v => !v)) {
    // Restaure défaut
    seg[group] = { ...DEFAULT_SEGMENTS[group] };
  }
  const ok = writeJSON(LS_SEGMENTS, seg);
  if (ok) {
    emit("ui:segments", { group, key, active, segments: seg });
    emit("state:changed", { scope: "segments" });
  }
  return ok;
}

// ---------- Données journalières ----------
export function getDaily() {
  return readJSON(LS_DAILY, {}); // { "YYYY-MM-DD": { cigs: n, weed: n, alcohol: n, classic: n, rolled: n, tube: n, beer: n, fort: n, liqueur: n, hours: {0..23: {cigs: n, weed: n, alcohol: n}} } }
}

export function saveDaily(next) {
  const ok = writeJSON(LS_DAILY, next);
  if (ok) {
    emit("state:daily", { daily: next });
    emit("state:changed", { scope: "daily" });
  }
  return ok;
}

// ---------- Économie ----------
export function getEconomy() {
  return readJSON(LS_ECO, {
    habits: {
      cigs:   { min: 0, max: 20, split: { classic: 0, rolled: 0, tube: 0 } },
      weed:   { min: 0, max: 5 },
      alcohol:{ min: 0, max: 3, split: { beer: 0, fort: 0, liqueur: 0 } },
    },
    dates: {
      reduce: { cigs: null, weed: null, alcohol: null },
      stop:   { cigs: null, weed: null, alcohol: null },
      zero:   { cigs: null, weed: null, alcohol: null },
    }
  });
}

export function saveEconomy(next) {
  const ok = writeJSON(LS_ECO, next);
  if (ok) {
    emit("state:economy", { economy: next });
    emit("state:changed", { scope: "economy" });
  }
  return ok;
}

// ---------- Mutations (ajout/suppression) ----------

// Ajoute 1 unité pour un type donné (cigs|weed|alcohol) au jour courant, et dans l'heure courante
export function addEntry(type, qty = 1, date = new Date()) {
  if (!type) return false;
  const key = ymd(date);
  const hour = nowHour();

  const store = getDaily();
  const day = store[key] || (store[key] = {});

  // total par type
  day[type] = (day[type] || 0) + qty;

  // détail horaire
  if (!day.hours) day.hours = {};
  if (!day.hours[hour]) day.hours[hour] = {};
  day.hours[hour][type] = (day.hours[hour][type] || 0) + qty;

  const ok = saveDaily(store);
  if (ok) {
    emit("op:add", { key, type, qty, hour });
  }
  return ok;
}

// Retire 1 unité pour un type donné sur le jour (par défaut aujourd’hui)
export function removeOneToday(type, date = new Date()) {
  if (!type) return false;
  const key = ymd(date);
  const store = getDaily();
  const day = store[key];
  if (!day) return false;

  if (day[type] > 0) {
    day[type] -= 1;
    if (day[type] === 0) delete day[type];
  }

  // Optionnel : on pourrait aussi décrémenter l’heure la plus récente > 0,
  // mais ce n’est pas indispensable pour l’instant.

  // Nettoyage si vide
  if (Object.keys(day).filter(k => k !== "hours").length === 0 && (!day.hours || Object.keys(day.hours).length === 0)) {
    delete store[key];
  }

  const ok = saveDaily(store);
  if (ok) {
    emit("op:remove", { key, type, qty: 1 });
  }
  return ok;
}

// *** NOUVEL EXPORT ATTENDU PAR calendar.js ***
// Retire 1 unité sur une date précise (dateKey est "YYYY-MM-DD")
export function removeOne(dateKey, type) {
  try {
    if (!dateKey || !type) return false;
    const store = getDaily();
    const day = store[dateKey];
    if (!day) return false;

    if (day[type] > 0) {
      day[type] -= 1;
      if (day[type] === 0) delete day[type];
    } else {
      // rien à retirer
      return false;
    }

    // Nettoyage si vide
    const nonHoursKeys = Object.keys(day).filter(k => k !== "hours");
    const hoursEmpty = !day.hours || Object.keys(day.hours).length === 0;
    if (nonHoursKeys.length === 0 && hoursEmpty) {
      delete store[dateKey];
    }

    const ok = saveDaily(store);
    if (ok) {
      emit("op:remove", { key: dateKey, type, qty: 1 });
    }
    return ok;
  } catch (e) {
    console.error("[state.removeOne] error:", e, dateKey, type);
    return false;
  }
}

// ---------- Calculs agrégés (KPIs / bannières / coûts) ----------
export function totalsHeader(date = new Date()) {
  const dkey = ymd(date);
  const store = getDaily();

  // Jour
  const day = store[dkey] || {};
  const dayCigs = day.cigs || 0;
  const dayWeed = day.weed || 0;
  const dayAlc  = day.alcohol || 0;
  const dayTotal = dayCigs + dayWeed + dayAlc;

  // Semaine (lundi->dimanche)
  const dt = new Date(date);
  const dayIdx = (dt.getDay() + 6) % 7; // 0=lundi
  const monday = new Date(dt); monday.setDate(dt.getDate() - dayIdx);
  const weekKeys = [];
  for (let i=0;i<7;i++){
    const k = ymd(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()+i));
    weekKeys.push(k);
  }
  let weekTotal = 0;
  for (const k of weekKeys) {
    const r = store[k] || {};
    weekTotal += (r.cigs||0) + (r.weed||0) + (r.alcohol||0);
  }

  // Mois
  const first = new Date(dt.getFullYear(), dt.getMonth(), 1);
  const next  = new Date(dt.getFullYear(), dt.getMonth()+1, 1);
  let monthTotal = 0;
  for (let d = new Date(first); d < next; d.setDate(d.getDate()+1)) {
    const k = ymd(d);
    const r = store[k] || {};
    monthTotal += (r.cigs||0) + (r.weed||0) + (r.alcohol||0);
  }

  return {
    day:   { total: dayTotal, cigs: dayCigs, weed: dayWeed, alcohol: dayAlc },
    week:  { total: weekTotal },
    month: { total: monthTotal },
  };
}

export function costToday(date = new Date()) {
  const s = getSettings();
  const prices = s?.prices || {};
  const day = getDaily()[ymd(date)] || {};
  const cigs = (day.cigs   || 0) * (prices.cigs   || 0);
  const weed = (day.weed   || 0) * (prices.weed   || 0);
  // alcool détaillé : beer/fort/liqueur → si total uniquement, on applique un prix moyen 0
  const alcUnits = (day.alcohol || 0);
  // si des sous-segments existent avec prix, on additionne ; sinon 0
  const beerCost    = (day.beer    || 0) * (prices.beer    || 0);
  const fortCost    = (day.fort    || 0) * (prices.fort    || 0);
  const liqueurCost = (day.liqueur || 0) * (prices.liqueur || 0);
  const alcohol = (beerCost + fortCost + liqueurCost) || (alcUnits * 0);
  return Math.round((cigs + weed + alcohol) * 100) / 100;
}

export function economiesHint(date = new Date()) {
  // Estimation simple basée sur habits max vs consommation réelle
  const eco = getEconomy();
  const habits = eco?.habits || {};
  const day = getDaily()[ymd(date)] || {};
  const diffC = Math.max(0, (habits.cigs?.max || 0) - (day.cigs || 0));
  const diffW = Math.max(0, (habits.weed?.max || 0) - (day.weed || 0));
  const diffA = Math.max(0, (habits.alcohol?.max || 0) - (day.alcohol || 0));
  const s = getSettings();
  const p = s?.prices || {};
  const eur = diffC*(p.cigs||0) + diffW*(p.weed||0)
            + (day.beer?diffA*(p.beer||0):0) // approximations
            + (day.fort?diffA*(p.fort||0):0)
            + (day.liqueur?diffA*(p.liqueur||0):0);
  return Math.round(eur*100)/100;
}
