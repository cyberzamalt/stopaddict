/* web/js/state.js
   — Store central (localStorage + events) — v2.4.4
   — Pas d’opérateur ?. ou ?? pour compatibilité WebView anciennes
*/
const STORAGE_KEY = "sa_v244_state";

// ----------------------------------------------
// Event bus (via document) — simple et robuste
// ----------------------------------------------
export function on(name, handler) {
  document.addEventListener(name, handler, false);
  return function off() { document.removeEventListener(name, handler, false); };
}
export function emit(name, detail) {
  try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); }
  catch (e) { console.error("[state.emit]", e); }
}

// ----------------------------------------------
// Helpers date
// ----------------------------------------------
export function todayKey(d) {
  const t = d ? new Date(d) : new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + dd;
}

// ----------------------------------------------
// Lecture / Écriture storage
// ----------------------------------------------
function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch (e) {
    console.error("[state.readRaw]", e);
    return {};
  }
}
function writeRaw(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next || {}));
  } catch (e) {
    console.error("[state.writeRaw]", e);
  }
}

// ----------------------------------------------
// État par défaut
// ----------------------------------------------
function defaultState() {
  return {
    version: "2.4.4",
    entries: {}, // { "YYYY-MM-DD": { cigs, weed, alcohol } }
    config: {
      modules: { cigs: true, weed: true, alcohol: true },
      limits: { cigs: 20, weed: 3, beer: 2, fort: 1, liqueur: 1 },
      prices: { cigs: 0, weed: 0, alcohol: 0 }
    }
  };
}

// ----------------------------------------------
// Accès haut-niveau
// ----------------------------------------------
function ensureDay(obj, dayKey) {
  if (!obj.entries) obj.entries = {};
  if (!obj.entries[dayKey]) obj.entries[dayKey] = { cigs: 0, weed: 0, alcohol: 0 };
  const d = obj.entries[dayKey];
  if (typeof d.cigs !== "number") d.cigs = 0;
  if (typeof d.weed !== "number") d.weed = 0;
  if (typeof d.alcohol !== "number") d.alcohol = 0;
  return d;
}

function loadState() {
  const cur = readRaw();
  if (!cur || typeof cur !== "object") return defaultState();
  // Merge minimal
  const base = defaultState();
  cur.version = base.version;
  if (!cur.config) cur.config = base.config;
  if (!cur.config.modules) cur.config.modules = base.config.modules;
  if (!cur.config.limits) cur.config.limits = base.config.limits;
  if (!cur.config.prices) cur.config.prices = base.config.prices;
  if (!cur.entries) cur.entries = {};
  return cur;
}
function saveState(next) { writeRaw(next); emit("sa:state-saved", { state: next }); }

let MEM = loadState();
let LAST_ACTION = null; // pour Undo

export function getState() { return loadState(); }
export function getConfig() { MEM = loadState(); return MEM.config; }
export function setConfigPatch(patch) {
  MEM = loadState();
  const cfg = MEM.config || (MEM.config = {});
  for (var k in patch) { cfg[k] = patch[k]; }
  saveState(MEM);
}

export function isModuleEnabled(type) {
  MEM = loadState();
  const m = MEM.config && MEM.config.modules ? MEM.config.modules : {};
  return !!m[type];
}
export function setModuleEnabled(type, enabled) {
  MEM = loadState();
  if (!MEM.config) MEM.config = {};
  if (!MEM.config.modules) MEM.config.modules = {};
  MEM.config.modules[type] = !!enabled;
  saveState(MEM);
  emit("sa:modules-changed", { modules: MEM.config.modules });
}

// ----------------------------------------------
// Données jour
// ----------------------------------------------
export function getDaily(date) {
  MEM = loadState();
  const dkey = todayKey(date);
  const d = ensureDay(MEM, dkey);
  return { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol, date: dkey };
}

export function setDailyCounts(date, counts) {
  MEM = loadState();
  const dkey = todayKey(date);
  const d = ensureDay(MEM, dkey);
  d.cigs = Math.max(0, parseInt(counts.cigs || 0, 10));
  d.weed = Math.max(0, parseInt(counts.weed || 0, 10));
  d.alcohol = Math.max(0, parseInt(counts.alcohol || 0, 10));
  saveState(MEM);
  emit("sa:counts-updated", { date: dkey, counts: { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol } });
  return { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol };
}

export function addEntry(type, amount, date) {
  MEM = loadState();
  const n = Math.max(1, Math.abs(parseInt(amount || 1, 10)));
  const dkey = todayKey(date);
  const d = ensureDay(MEM, dkey);
  const before = { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol };
  if (type === "cigs") d.cigs += n;
  else if (type === "weed") d.weed += n;
  else if (type === "alcohol") d.alcohol += n;

  saveState(MEM);
  LAST_ACTION = { kind: "add", type: type, n: n, date: dkey, before: before };
  emit("sa:counts-updated", { date: dkey, counts: { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol } });
}

export function removeEntry(type, amount, date) {
  MEM = loadState();
  const n = Math.max(1, Math.abs(parseInt(amount || 1, 10)));
  const dkey = todayKey(date);
  const d = ensureDay(MEM, dkey);
  const before = { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol };
  if (type === "cigs") d.cigs = Math.max(0, d.cigs - n);
  else if (type === "weed") d.weed = Math.max(0, d.weed - n);
  else if (type === "alcohol") d.alcohol = Math.max(0, d.alcohol - n);

  saveState(MEM);
  LAST_ACTION = { kind: "remove", type: type, n: n, date: dkey, before: before };
  emit("sa:counts-updated", { date: dkey, counts: { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol } });
}

export function canUndo() { return !!LAST_ACTION; }
export function undoLast() {
  if (!LAST_ACTION) return false;
  MEM = loadState();
  const dkey = LAST_ACTION.date;
  const d = ensureDay(MEM, dkey);
  d.cigs = LAST_ACTION.before.cigs;
  d.weed = LAST_ACTION.before.weed;
  d.alcohol = LAST_ACTION.before.alcohol;
  saveState(MEM);
  emit("sa:counts-updated", { date: dkey, counts: { cigs: d.cigs, weed: d.weed, alcohol: d.alcohol } });
  LAST_ACTION = null;
  return true;
}
