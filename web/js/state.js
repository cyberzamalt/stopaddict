// web/js/state.js
// STOPADDICT – State & Domain Logic (v1, “zéro par défaut”)
// Rôle : source de vérité unique pour l’état, les réglages, les agrégations et les coûts.
// ❗ Contrat d’API attendu par les autres modules (counters/stats/charts/calendar/export) :
//   - getDaily(date), addEntry(kind, delta, date), removeOneToday(kind)
//   - getSettings(), setSettings(patch)
//   - getActiveSegments(), setActiveSegment(key, isActive)
//   - ymd(date), totalsHeader(range, anchorDate)
//   - getRangeTotals(range, anchorDate)
//   - calculateDayCost(dayRec, settings)
//   - getEconomy(dayRec, settings)
//   - setViewRange(range), getViewRange()
//   - load(), save(), resetAll()
//   - ensureToday()
//
// Stockage : localStorage (clé primaire SA_STATE_KEY). Schéma versionné.

const SA_STATE_KEY = 'stopaddict_state_v1';
const SA_STATE_KEY_LEGACY = 'stopaddict_state'; // lecture compat descendante si existant

// ---------- Utils temps & formats ----------
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// Format YYYY-MM-DD (local)
export function ymd(d = new Date()) {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeekMonday(d = new Date()) {
  const dt = startOfDay(d);
  const day = (dt.getDay() + 6) % 7; // 0 = Monday
  dt.setDate(dt.getDate() - day);
  return dt;
}

function endOfWeekMonday(d = new Date()) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 11, 31);
}

function fr(d) {
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function monthNameFR(d) {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

// ---------- Schéma par défaut (“zéro par défaut”) ----------
const DEFAULT_STATE = {
  schema_version: 1,
  view: { range: 'day' }, // 'day' | 'week' | 'month' | 'year'
  ui: {
    activeSegments: {
      cigs: true,
      weed: true,
      beer: true,
      strong: true,
      liquor: true,
    },
  },
  settings: {
    // Modules ON/OFF (zéro par défaut = tout OFF)
    enable_cigs: false,
    enable_weed: false,
    enable_alcohol: false,
    // Sous-modules alcool
    enable_beer: false,
    enable_strong: false,
    enable_liquor: false,

    // Prix unitaires (zéro par défaut)
    prices: {
      cig: 0,     // prix d’une cigarette
      weed: 0,    // prix d’un joint
      beer: 0,    // prix d’une bière
      strong: 0,  // prix d’un alcool fort
      liquor: 0,  // prix d’une liqueur
    },

    // Baselines / objectifs par jour (zéro par défaut)
    baselines: {
      cig: 0,
      weed: 0,
      beer: 0,
      strong: 0,
      liquor: 0,
    },
  },

  // Historique par jour (clé: YYYY-MM-DD)
  // Chaque enregistrement : { cigs, weed, beer, strong, liquor }
  history: {},
};

// ---------- État en mémoire ----------
let _state = null;

// ---------- Persistence ----------
export function load() {
  if (_state) return _state;

  let raw = localStorage.getItem(SA_STATE_KEY);
  if (!raw) {
    // Compat : ancienne clé si présente
    raw = localStorage.getItem(SA_STATE_KEY_LEGACY);
  }

  if (!raw) {
    _state = structuredClone(DEFAULT_STATE);
    save();
    return _state;
  }

  try {
    const parsed = JSON.parse(raw);
    _state = migrateIfNeeded(parsed);
  } catch (e) {
    console.error('[state.load] corrupted JSON, resetting to defaults:', e);
    _state = structuredClone(DEFAULT_STATE);
  }

  // Filet de sécurité pour les champs manquants
  _state.schema_version ??= 1;
  _state.view ??= { range: 'day' };
  _state.ui ??= { activeSegments: structuredClone(DEFAULT_STATE.ui.activeSegments) };
  _state.settings ??= structuredClone(DEFAULT_STATE.settings);
  _state.history ??= {};

  // Normaliser champs imbriqués
  _state.settings.prices ??= structuredClone(DEFAULT_STATE.settings.prices);
  _state.settings.baselines ??= structuredClone(DEFAULT_STATE.settings.baselines);

  save();
  return _state;
}

function migrateIfNeeded(s) {
  // Réservé pour futures migrations de schéma
  if (!s || typeof s !== 'object') return structuredClone(DEFAULT_STATE);
  if (!('schema_version' in s)) s.schema_version = 1;

  // V1 -> V1 (rien à faire pour l’instant)
  return s;
}

export function save() {
  if (!_state) return;
  try {
    localStorage.setItem(SA_STATE_KEY, JSON.stringify(_state));
  } catch (e) {
    console.error('[state.save] localStorage error:', e);
  }
}

export function resetAll() {
  _state = structuredClone(DEFAULT_STATE);
  save();
  return _state;
}

// ---------- Accès réglages ----------
export function getSettings() {
  return load().settings;
}

export function setSettings(patch = {}) {
  const st = load();
  // Fusion superficielle + sous-objets attendus
  st.settings = {
    ...st.settings,
    ...patch,
    prices: { ...st.settings.prices, ...(patch.prices || {}) },
    baselines: { ...st.settings.baselines, ...(patch.baselines || {}) },
  };

  // Cohérence des sous-modules alcool si enable_alcohol = false
  if (st.settings.enable_alcohol === false) {
    st.settings.enable_beer = false;
    st.settings.enable_strong = false;
    st.settings.enable_liquor = false;
  }

  save();
  return st.settings;
}

// ---------- Segments actifs (affichage des séries/graphes) ----------
export function getActiveSegments() {
  return load().ui.activeSegments;
}

export function setActiveSegment(key, isActive) {
  const st = load();
  if (!(key in st.ui.activeSegments)) return st.ui.activeSegments;
  st.ui.activeSegments[key] = !!isActive;
  save();
  return st.ui.activeSegments;
}

// ---------- Vue (jour/semaine/mois/année) ----------
export function setViewRange(range) {
  const ok = ['day', 'week', 'month', 'year'].includes(range);
  if (!ok) return getViewRange();
  const st = load();
  st.view.range = range;
  save();
  return st.view.range;
}

export function getViewRange() {
  return load().view.range;
}

// ---------- Historique (lecture/écriture) ----------
function defaultDayRec() {
  return { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
}

export function ensureToday() {
  const st = load();
  const key = ymd(new Date());
  if (!st.history[key]) {
    st.history[key] = defaultDayRec();
    save();
  }
  return key;
}

export function getDaily(date = new Date()) {
  const st = load();
  const key = ymd(date);
  if (!st.history[key]) st.history[key] = defaultDayRec();
  return st.history[key];
}

// kind ∈ 'cigs' | 'weed' | 'beer' | 'strong' | 'liquor'
export function addEntry(kind, delta = 1, date = new Date()) {
  const st = load();
  const key = ymd(date);
  if (!st.history[key]) st.history[key] = defaultDayRec();
  const rec = st.history[key];

  // Respect des modules/sous-modules : si OFF → on ignore l’ajout
  if (!isKindEnabled(kind, st.settings)) return rec;

  const next = (rec[kind] || 0) + (Number(delta) || 0);
  rec[kind] = Math.max(0, next);
  save();
  return rec;
}

export function removeOneToday(kind) {
  return addEntry(kind, -1, new Date());
}

// ---------- Coûts & économies ----------
function priceForKind(kind, settings) {
  const p = settings.prices || {};
  switch (kind) {
    case 'cigs': return +p.cig || 0;
    case 'weed': return +p.weed || 0;
    case 'beer': return +p.beer || 0;
    case 'strong': return +p.strong || 0;
    case 'liquor': return +p.liquor || 0;
    default: return 0;
  }
}

function baselineForKind(kind, settings) {
  const b = settings.baselines || {};
  switch (kind) {
    case 'cigs': return +b.cig || 0;
    case 'weed': return +b.weed || 0;
    case 'beer': return +b.beer || 0;
    case 'strong': return +b.strong || 0;
    case 'liquor': return +b.liquor || 0;
    default: return 0;
  }
}

function isKindEnabled(kind, settings) {
  const s = settings || getSettings();
  switch (kind) {
    case 'cigs': return !!s.enable_cigs;
    case 'weed': return !!s.enable_weed;
    case 'beer': return !!s.enable_alcohol && !!s.enable_beer;
    case 'strong': return !!s.enable_alcohol && !!s.enable_strong;
    case 'liquor': return !!s.enable_alcohol && !!s.enable_liquor;
    default: return false;
  }
}

// Calcule le coût total d’une journée en tenant compte des modules actifs
export function calculateDayCost(dayRec, settings = getSettings()) {
  if (!dayRec) return 0;
  const kinds = ['cigs', 'weed', 'beer', 'strong', 'liquor'];
  let cost = 0;
  for (const k of kinds) {
    if (!isKindEnabled(k, settings)) continue; // OFF = exclu partout
    const qty = +dayRec[k] || 0;
    const unit = priceForKind(k, settings);
    cost += qty * unit;
  }
  return +cost.toFixed(2);
}

// Économies du jour : max(0, (baseline - qty) * prix) sommées sur toutes les catégories actives
export function getEconomy(dayRec, settings = getSettings()) {
  if (!dayRec) return 0;
  const kinds = ['cigs', 'weed', 'beer', 'strong', 'liquor'];
  let eco = 0;
  for (const k of kinds) {
    if (!isKindEnabled(k, settings)) continue;
    const qty = +dayRec[k] || 0;
    const base = baselineForKind(k, settings);
    const unit = priceForKind(k, settings);
    const delta = Math.max(0, base - qty);
    eco += delta * unit;
  }
  return +eco.toFixed(2);
}

// ---------- Agrégations pour Stats/Charts ----------
function eachDay(from, to, cb) {
  const cur = new Date(from);
  while (cur <= to) {
    cb(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
}

function monthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // YYYY-MM
}

// Retourne labels + séries par catégorie + totals
// range: 'day' | 'week' | 'month' | 'year'
export function getRangeTotals(range = getViewRange(), anchorDate = new Date()) {
  const st = load();
  const settings = st.settings;
  const kinds = ['cigs', 'weed', 'beer', 'strong', 'liquor'];

  const result = {
    range,
    labels: [],
    series: { cigs: [], weed: [], beer: [], strong: [], liquor: [], cost: [] },
    totalCount: 0,
    totalCost: 0,
    totalEconomy: 0,
  };

  if (range === 'day') {
    const key = ymd(anchorDate);
    const rec = st.history[key] || defaultDayRec();
    for (const k of kinds) {
      const qty = isKindEnabled(k, settings) ? (+rec[k] || 0) : 0;
      result.series[k].push(qty);
      result.totalCount += qty;
    }
    const c = calculateDayCost(rec, settings);
    result.series.cost.push(c);
    result.totalCost += c;
    result.totalEconomy += getEconomy(rec, settings);
    result.labels.push(fr(startOfDay(anchorDate)));
    return result;
  }

  if (range === 'week') {
    const from = startOfWeekMonday(anchorDate);
    const to = endOfWeekMonday(anchorDate);
    eachDay(from, to, (d) => {
      const key = ymd(d);
      const rec = st.history[key] || defaultDayRec();
      let dayCost = 0;
      for (const k of kinds) {
        const qty = isKindEnabled(k, settings) ? (+rec[k] || 0) : 0;
        result.series[k].push(qty);
        result.totalCount += qty;
      }
      dayCost = calculateDayCost(rec, settings);
      result.series.cost.push(dayCost);
      result.totalCost += dayCost;
      result.totalEconomy += getEconomy(rec, settings);
      result.labels.push(fr(d));
    });
    return result;
  }

  if (range === 'month') {
    const from = startOfMonth(anchorDate);
    const to = endOfMonth(anchorDate);
    eachDay(from, to, (d) => {
      const key = ymd(d);
      const rec = st.history[key] || defaultDayRec();
      let dayCost = 0;
      for (const k of kinds) {
        const qty = isKindEnabled(k, settings) ? (+rec[k] || 0) : 0;
        result.series[k].push(qty);
        result.totalCount += qty;
      }
      dayCost = calculateDayCost(rec, settings);
      result.series.cost.push(dayCost);
      result.totalCost += dayCost;
      result.totalEconomy += getEconomy(rec, settings);
      result.labels.push(pad2(d.getDate())); // 01..31
    });
    return result;
  }

  if (range === 'year') {
    // Agrégation par mois (12 points)
    const yearStart = startOfYear(anchorDate);
    const yearEnd = endOfYear(anchorDate);

    // Préparer 12 seaux mensuels
    const bucket = {};
    for (let m = 0; m < 12; m++) {
      const d = new Date(anchorDate.getFullYear(), m, 1);
      const mk = monthKey(d);
      bucket[mk] = { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0, cost: 0, eco: 0 };
    }

    // Balayer tous les jours de l’année
    eachDay(yearStart, yearEnd, (d) => {
      const key = ymd(d);
      const mk = monthKey(d);
      const rec = st.history[key] || defaultDayRec();
      for (const k of kinds) {
        const qty = isKindEnabled(k, settings) ? (+rec[k] || 0) : 0;
        bucket[mk][k] += qty;
      }
      bucket[mk].cost += calculateDayCost(rec, settings);
      bucket[mk].eco += getEconomy(rec, settings);
    });

    // Sortie triée mois 01..12
    for (let m = 0; m < 12; m++) {
      const d = new Date(anchorDate.getFullYear(), m, 1);
      const mk = monthKey(d);
      const b = bucket[mk];
      result.labels.push(d.toLocaleDateString(undefined, { month: 'short' })); // janv., févr., ...
      for (const k of kinds) {
        result.series[k].push(b[k]);
        result.totalCount += b[k];
      }
      result.series.cost.push(+b.cost.toFixed(2));
      result.totalCost += b.cost;
      result.totalEconomy += b.eco;
    }

    result.totalCost = +result.totalCost.toFixed(2);
    result.totalEconomy = +result.totalEconomy.toFixed(2);
    return result;
  }

  // Par défaut: day
  return getRangeTotals('day', anchorDate);
}

// ---------- En-tête titre Stats ----------
export function totalsHeader(range = getViewRange(), anchorDate = new Date()) {
  if (range === 'day') {
    const d = startOfDay(anchorDate);
    return `Bilan Jour — ${fr(d)}`;
  }
  if (range === 'week') {
    const from = startOfWeekMonday(anchorDate);
    const to = endOfWeekMonday(anchorDate);
    return `Bilan Semaine — du ${fr(from)} au ${fr(to)}`;
  }
  if (range === 'month') {
    return `Bilan Mois — ${monthNameFR(anchorDate)}`;
  }
  if (range === 'year') {
    return `Bilan Année — ${anchorDate.getFullYear()}`;
  }
  return `Bilan`;
}

// ---------- Export défaut facultatif (confort d’import côté modules) ----------
const stateAPI = {
  ymd,
  load, save, resetAll,
  getSettings, setSettings,
  getActiveSegments, setActiveSegment,
  getViewRange, setViewRange,
  ensureToday, getDaily,
  addEntry, removeOneToday,
  calculateDayCost, getEconomy,
  getRangeTotals, totalsHeader,
};

export default stateAPI;

// Optionnel : exposer sur window pour debug manuel
try {
  // eslint-disable-next-line no-undef
  window.SA = stateAPI;
} catch {}
