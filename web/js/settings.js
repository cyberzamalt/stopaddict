// web/js/settings.js
// Gestion des réglages (prix, modules, préférences UI, etc.) + helpers coût.
// Stocke dans storage.js mais offre une API claire et typée.

import { mergeDeep } from "./utils.js";
import { get as sget, set as sset, KEYS } from "./storage.js";

// ---------- Valeurs par défaut ----------
const DEFAULTS = {
  locale: "fr-FR",
  prices: {
    // Coût unitaire estimatif (modifiable dans Réglages quand l’écran sera câblé)
    cig:    0.60,  // par cigarette
    joint:  2.00,  // par joint
    beer:   2.50,  // par bière
    strong: 3.00,  // par verre d’alcool fort
    liqueur:2.00   // par verre de liqueur
  },
  modules: {
    cigs:   true,   // activer carte Cigarettes
    weed:   true,   // activer carte Joints
    alcohol:true    // activer carte Alcool
  },
  advice: {
    enabled:   true,
    autoRotate:true,
    rotateMs:  15000
  },
  charts: {
    smoothing: 0,      // 0..1 (si besoin plus tard)
    stacked:   false,  // mode empilé vs séries séparées
    range:     "day"   // "day" | "week" | "month" | "year"
  }
};

// ---------- Accès / mutation ----------
export function getSettings() {
  const cur = sget(KEYS.SETTINGS, null);
  if (!cur) {
    sset(KEYS.SETTINGS, DEFAULTS);
    return structuredClone(DEFAULTS);
  }
  // merge défensif (nouvelles clés)
  const merged = mergeDeep(DEFAULTS, cur);
  if (JSON.stringify(merged) !== JSON.stringify(cur)) {
    sset(KEYS.SETTINGS, merged);
  }
  return structuredClone(merged);
}

export function updateSettings(patch) {
  const cur = getSettings();
  const next = mergeDeep(cur, patch || {});
  sset(KEYS.SETTINGS, next);
  dispatchEvent(new CustomEvent("sa:settings-changed", { detail: { settings: next }}));
  return next;
}

export function resetSettings() {
  sset(KEYS.SETTINGS, DEFAULTS);
  dispatchEvent(new CustomEvent("sa:settings-changed", { detail: { settings: structuredClone(DEFAULTS) }}));
  return structuredClone(DEFAULTS);
}

export function onSettingsChange(handler) {
  // usage: onSettingsChange(({settings}) => { ... })
  addEventListener("sa:settings-changed", (e) => handler(e.detail || {}));
}

// ---------- Helpers coût ----------
export function getUnitPrice(kind /* "cig"|"joint"|"beer"|"strong"|"liqueur" */) {
  const s = getSettings();
  return Number(s?.prices?.[kind] ?? 0);
}
export function computeCostFromCounts(counts /* {c,j,beer,strong,liqueur} */) {
  const s = getSettings();
  const p = s.prices || {};
  const cigs    = Number(counts?.c || 0) * Number(p.cig || 0);
  const joints  = Number(counts?.j || 0) * Number(p.joint || 0);
  const beer    = Number(counts?.beer || 0) * Number(p.beer || 0);
  const strong  = Number(counts?.strong || 0) * Number(p.strong || 0);
  const liqueur = Number(counts?.liqueur || 0) * Number(p.liqueur || 0);
  return cigs + joints + beer + strong + liqueur;
}

// ---------- Modules actifs (toggles Accueil) ----------
export function isModuleEnabled(key /* "cigs"|"weed"|"alcohol" */) {
  const s = getSettings();
  return !!s?.modules?.[key];
}
export function setModuleEnabled(key, enabled) {
  const s = getSettings();
  const next = mergeDeep(s, { modules: { [key]: !!enabled } });
  return updateSettings(next);
}
