// web/js/state.js
// État central léger + exports attendus par stats.js : totalsHeader, costToday, economiesHint
// ⚠️ Ne casse rien : on lit/écrit seulement des clés locales, on expose des helpers.
// D'autres modules (counters, economy, charts) peuvent continuer à utiliser window.SA s'ils le souhaitent.

import { loadJSON, saveJSON, toCurrency, startOfDay } from "./utils.js";

// --- Clés de stockage (garde-rails)
const KEY_SETTINGS = "sa_settings_v2";
const KEY_DAILY    = "sa_daily_v2";     // { "YYYY-MM-DD": { cigs: n, joints: n, alcohol: { beer:n, strong:n, liqueur:n }, ... } }
const KEY_ECO      = "sa_economy_v2";   // { cigs:{unit:€, enabled:true}, beer:{unit:€, enabled:true}, ... }

function todayKey(d = new Date()) {
  const x = startOfDay(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
}

// --- État en mémoire (lazy)
const state = {
  settings: loadJSON(KEY_SETTINGS, {
    modules: { cigs: true, weed: true, alcohol: true },
    // autres réglages…
  }),
  daily: loadJSON(KEY_DAILY, {}),   // map jour -> consommations
  economy: loadJSON(KEY_ECO, {
    cigs:   { unit: 0, enabled: false },
    weed:   { unit: 0, enabled: false },
    beer:   { unit: 0, enabled: false },
    strong: { unit: 0, enabled: false },
    liqueur:{ unit: 0, enabled: false },
  }),
};

// Sauvegardes
export function saveSettings(next) {
  state.settings = { ...state.settings, ...next };
  saveJSON(KEY_SETTINGS, state.settings);
  window.dispatchEvent(new CustomEvent("sa:settings:changed", { detail: state.settings }));
}

export function saveDaily(dayKey, payload) {
  const next = { ...state.daily[dayKey], ...payload };
  state.daily = { ...state.daily, [dayKey]: next };
  saveJSON(KEY_DAILY, state.daily);
  window.dispatchEvent(new CustomEvent("sa:daily:changed", { detail: { dayKey, data: next } }));
}

export function saveEconomy(next) {
  state.economy = { ...state.economy, ...next };
  saveJSON(KEY_ECO, state.economy);
  window.dispatchEvent(new CustomEvent("sa:economy:changed", { detail: state.economy }));
}

// Getters simples
export const getSettings = () => state.settings;
export const getDaily    = () => state.daily;
export const getEconomy  = () => state.economy;

// ---- Helpers de calcul basiques

function sumAlcohol(d) {
  if (!d || !d.alcohol) return 0;
  const { beer = 0, strong = 0, liqueur = 0 } = d.alcohol;
  return (beer || 0) + (strong || 0) + (liqueur || 0);
}

function costForDay(d) {
  if (!d) return 0;
  const eco = state.economy;
  let total = 0;
  if (eco.cigs?.enabled)   total += (d.cigs   || 0) * (eco.cigs.unit   || 0);
  if (eco.weed?.enabled)   total += (d.joints || 0) * (eco.weed.unit   || 0);
  if (eco.beer?.enabled)   total += (d.alcohol?.beer    || 0) * (eco.beer.unit    || 0);
  if (eco.strong?.enabled) total += (d.alcohol?.strong  || 0) * (eco.strong.unit  || 0);
  if (eco.liqueur?.enabled)total += (d.alcohol?.liqueur || 0) * (eco.liqueur.unit || 0);
  return total;
}

// ---- Exports ATTENDUS par stats.js (selon le diagnostic Claude)

// 1) totalsHeader : renvoie un petit objet d’agrégats (jour / semaine / mois).
//    On laisse charts/stats décider comment afficher. Ici on ne fait QUE le jour (fiable).
export function totalsHeader(date = new Date()) {
  const k = todayKey(date);
  const d = state.daily[k] || {};
  const todayTotal = (d.cigs || 0) + (d.joints || 0) + sumAlcohol(d);
  const todayCost  = costForDay(d);
  return {
    todayTotal,
    weekTotal:  null, // laissé à null si non calculé ici (les charts peuvent les fournir)
    monthTotal: null,
    todayCost,
    economies:  null, // voir economiesHint() pour le texte user-facing
  };
}

// 2) costToday : nombre (euros) pour le jour courant
export function costToday(date = new Date()) {
  const k = todayKey(date);
  return costForDay(state.daily[k]);
}

// 3) economiesHint : petit texte explicatif si l’économie est activée
export function economiesHint(date = new Date()) {
  const eco = state.economy;
  const anyEnabled = !!(eco.cigs?.enabled || eco.weed?.enabled || eco.beer?.enabled || eco.strong?.enabled || eco.liqueur?.enabled);
  if (!anyEnabled) return "";
  const c = costToday(date);
  if (!isFinite(c) || c <= 0) return "Économies calculées quand des coûts unitaires sont saisis et des consommations enregistrées.";
  return `Coût estimé aujourd’hui : ${toCurrency(c)} (basé sur vos paramètres économiques).`;
}

// --- Expose un mini namespace optionnel (facultatif, utile à d’autres modules)
if (!window.SA) window.SA = {};
window.SA.state = {
  getSettings, getDaily, getEconomy,
  saveSettings, saveDaily, saveEconomy,
  totalsHeader, costToday, economiesHint,
};
