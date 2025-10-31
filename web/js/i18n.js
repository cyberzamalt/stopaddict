// web/js/i18n.js
// STOPADDICT — Internationalisation via JSON externes + fallback embarqué
// - Charge /web/i18n/{lang}.json et /web/i18n/_meta.json (liste des langues).
// - Persistance de la langue (localStorage), évènement 'sa:lang-changed'.
// - API globale: window.SA_I18N { t, setLang, getLang, apply, getAvailable, categoryLabel }.
// - Tolérant : si un JSON manque, on retombe sur les dictionnaires intégrés FR/EN.

"use strict";

const STORE_KEY = "stopaddict_lang";
const META_URL  = "web/i18n/_meta.json";
const FILE_URL  = (lang) => `web/i18n/${lang}.json`;

// --- Fallbacks intégrés (minimum vital)
const EMBED = {
  fr: {
    "nav.home": "Accueil", "nav.stats":"Stats", "nav.calendar":"Calendrier", "nav.habits":"Habitudes", "nav.settings":"Réglages",
    "today.title":"Aujourd’hui", "counts.cigs":"Clopes", "counts.weed":"Joints", "counts.alcohol":"Alcool",
    "cost":"Coût", "savings":"Économies", "tips.title":"Conseils", "resources":"Ressources & numéros utiles", "activate":"Activer",
    "cat.cigs":"Cigarettes", "cat.weed":"Joints", "cat.beer":"Bière", "cat.strong":"Alcool fort", "cat.liquor":"Liqueur",
    "stats.totals":"Totaux", "stats.cost_total":"Coût total", "stats.savings_total":"Économies",
    "range.day":"Jour", "range.week":"Semaine", "range.month":"Mois", "range.year":"Année",
    "stats.header":"Bilan {range} — {title}",
    "export.csv":"Exporter CSV", "export.json":"Exporter TOUT (JSON)", "import.json":"Importer (JSON)", "export.include_charts":"Inclure images des graphiques",
    "calendar.month":"Mois — Année",
    "habits.title":"Habitudes", "habits.objectives":"Objectifs quotidiens", "habits.dates":"Dates clés",
    "btn.save":"Enregistrer", "btn.reset":"Réinitialiser", "btn.clear":"Effacer", "btn.close":"Fermer",
    "tip.fill_prices":"Renseigne le prix de {list} dans Réglages pour voir des coûts/économies réalistes.",
    "tip.zero_today":"🎯 Zéro aujourd’hui — parfait ! Garde ce rythme.",
    "tip.below_goal":"Bien joué : en dessous de l’objectif pour {list}.",
    "tip.micro_goal":"Micro-objectif 💡: {label} — vise {n} au prochain passage.",
    "cost.today":"Coût du jour : {n} {sym}. Un pas de moins réduit la note dès aujourd’hui.",
  },
  en: {
    "nav.home":"Home", "nav.stats":"Stats", "nav.calendar":"Calendar", "nav.habits":"Habits", "nav.settings":"Settings",
    "today.title":"Today", "counts.cigs":"Cigs", "counts.weed":"Joints", "counts.alcohol":"Alcohol",
    "cost":"Cost", "savings":"Savings", "tips.title":"Tips", "resources":"Resources & helplines", "activate":"Enable",
    "cat.cigs":"Cigarettes", "cat.weed":"Joints", "cat.beer":"Beer", "cat.strong":"Spirits", "cat.liquor":"Liqueur",
    "stats.totals":"Totals", "stats.cost_total":"Total cost", "stats.savings_total":"Savings",
    "range.day":"Day", "range.week":"Week", "range.month":"Month", "range.year":"Year",
    "stats.header":"{range} summary — {title}",
    "export.csv":"Export CSV", "export.json":"Export ALL (JSON)", "import.json":"Import (JSON)", "export.include_charts":"Include chart images",
    "calendar.month":"Month — Year",
    "habits.title":"Habits", "habits.objectives":"Daily goals", "habits.dates":"Key dates",
    "btn.save":"Save", "btn.reset":"Reset", "btn.clear":"Clear", "btn.close":"Close",
    "tip.fill_prices":"Fill the price of {list} in Settings to get realistic costs/savings.",
    "tip.zero_today":"🎯 Zero today — great! Keep it up.",
    "tip.below_goal":"Nice: below the goal for {list}.",
    "tip.micro_goal":"Micro-goal 💡: {label} — aim {n} next time.",
    "cost.today":"Today’s cost: {n} {sym}. One less already reduces the bill.",
  },
};

// --- État interne
let current = detectLang();
let dicts   = { ...EMBED };   // cache (fr/en préremplis)
let meta    = null;            // liste des langues disponibles (si _meta.json chargé)

// --- Détection langue
function detectLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return saved;
  } catch {}
  try {
    const nav = (navigator.language || navigator.userLanguage || "fr").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
  } catch {}
  return "en";
}

// --- Utilitaires texte
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function t(key, vars) {
  const d = dicts[current] || dicts.fr || dicts.en || {};
  let out = d[key];
  if (out == null) {
    const fb = (dicts.fr && dicts.fr[key]) || (dicts.en && dicts.en[key]);
    out = fb != null ? fb : key;
  }
  return typeof out === "string" ? interpolate(out, vars) : key;
}

// --- Application DOM
//   <span data-i18n="nav.settings"></span>
//   <input data-i18n="habits.title" data-i18n-attr="placeholder">
//   <span data-i18n="tips.title" data-i18n-html="1"></span>
function apply(root = document) {
  const nodes = root.querySelectorAll("[data-i18n]");
  nodes.forEach((el) => {
    const key  = el.getAttribute("data-i18n");
    const attr = el.getAttribute("data-i18n-attr");
    const html = el.getAttribute("data-i18n-html") === "1";
    if (!key) return;
    const txt = t(key);
    if (attr) el.setAttribute(attr, txt);
    else if (html) el.innerHTML = txt;
    else el.textContent = txt;
  });
}

// --- Labels de catégories
function categoryLabel(kind) {
  switch (kind) {
    case "cigs":   return t("cat.cigs");
    case "weed":   return t("cat.weed");
    case "beer":   return t("cat.beer");
    case "strong": return t("cat.strong");
    case "liquor": return t("cat.liquor");
    default:       return kind;
  }
}

// --- Chargement JSON (_meta + dictionnaires)
async function loadMetaOnce() {
  if (meta) return meta;
  try {
    const res = await fetch(META_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    meta = await res.json();
    return meta;
  } catch {
    meta = { languages: [{ code: "fr", label: "Français" }, { code: "en", label: "English" }] };
    return meta;
  }
}

async function loadDict(lang) {
  if (dicts[lang]) return dicts[lang];
  try {
    const res = await fetch(FILE_URL(lang), { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const json = await res.json();
    dicts[lang] = json && typeof json === "object" ? json : {};
  } catch {
    // garde fallback embarqué si échec
    dicts[lang] = dicts[lang] || {};
  }
  return dicts[lang];
}

// --- Changement de langue
async function setLang(lang) {
  if (!lang) lang = "fr";
  current = lang;
  try { localStorage.setItem(STORE_KEY, lang); } catch {}

  // Attributs HTML
  try {
    const html = document.documentElement;
    if (html) { html.setAttribute("lang", lang); html.setAttribute("dir", "ltr"); }
  } catch {}

  // Charger le JSON externe (si besoin), puis appliquer
  await loadDict(lang);
  apply();

  // Optionnel : suggérer une devise via le JSON si présent (currency.symbol/position)
  // → currency.js peut écouter et décider d’appliquer ou non.
  try {
    const d = dicts[lang];
    if (d && d.currency && (d.currency.symbol || d.currency.position)) {
      document.dispatchEvent(new CustomEvent("sa:currency-suggest", { detail: { ...d.currency } }));
    }
  } catch {}

  // Notification globale
  try { document.dispatchEvent(new CustomEvent("sa:lang-changed", { detail: { lang } })); } catch {}
}

function getLang() { return current; }

// --- Langues disponibles (pour Réglages)
async function getAvailable() {
  await loadMetaOnce();
  // meta.languages : [{code:"fr", label:"Français"}, ...]
  return Array.isArray(meta.languages) && meta.languages.length
    ? meta.languages
    : [{ code: "fr", label: "Français" }, { code: "en", label: "English" }];
}

// --- Initialisation
export async function initI18n() {
  // Charger meta + dictionnaire courant, puis appliquer
  await Promise.race([
    (async () => { await loadMetaOnce(); await loadDict(current); })(),
    // garde-fou pour ne pas bloquer l’app si CDN/GitHub flanche
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);

  // Mettre lang sur <html>
  try {
    const html = document.documentElement;
    if (html) { html.setAttribute("lang", current); html.setAttribute("dir", "ltr"); }
  } catch {}

  // Appliquer au DOM existant
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => apply(), { once: true });
  } else {
    apply();
  }

  // Bouton optionnel (si présent dans l’UI)
  const toggle = document.getElementById("toggle-lang");
  if (toggle) {
    toggle.addEventListener("click", async () => {
      const next = getLang() === "fr" ? "en" : "fr";
      await setLang(next);
    });
  }

  // Exposer l’API globale
  try {
    window.SA_I18N = { t, setLang, getLang, apply, getAvailable, categoryLabel };
  } catch {}
}

// Exports nommés
export { t, setLang, getLang, apply, getAvailable, categoryLabel };
export default { initI18n, t, setLang, getLang, apply, getAvailable, categoryLabel };
