// web/js/i18n.js
// STOPADDICT — Internationalisation (i18n) minimaliste et robuste
// - Langue détectée (localStorage > navigateur) : 'fr' (par défaut) ou 'en'
// - API : SA_I18N.t(key), SA_I18N.setLang('fr'|'en'), SA_I18N.getLang(), SA_I18N.apply()
// - Remplacement simple de variables : t('cost.today', {n:12.3, sym:'€'}) -> "Coût du jour : 12.30 €"
// - Bind automatique des éléments [data-i18n] (textContent) / [data-i18n-attr="placeholder"|...]
// - Fournit des labels standardisés pour les catégories : SA_I18N.categoryLabel('beer') -> "Bière"/"Beer"

const STORE_KEY = "stopaddict_lang";

const STRINGS = {
  fr: {
    // Navigation
    "nav.home": "Accueil",
    "nav.stats": "Stats",
    "nav.calendar": "Calendrier",
    "nav.habits": "Habitudes",
    "nav.settings": "Réglages",

    // Accueil & bar
    "today.title": "Aujourd’hui",
    "counts.cigs": "Clopes",
    "counts.weed": "Joints",
    "counts.alcohol": "Alcool",
    "cost": "Coût",
    "savings": "Économies",
    "tips.title": "Conseils",
    "resources": "Ressources & numéros utiles",
    "activate": "Activer",

    // Catégories
    "cat.cigs": "Cigarettes",
    "cat.weed": "Joints",
    "cat.beer": "Bière",
    "cat.strong": "Alcool fort",
    "cat.liquor": "Liqueur",

    // Stats
    "stats.totals": "Totaux",
    "stats.cost_total": "Coût total",
    "stats.savings_total": "Économies",
    "range.day": "Jour",
    "range.week": "Semaine",
    "range.month": "Mois",
    "range.year": "Année",
    "stats.header": "Bilan {range} — {title}",

    // Export
    "export.csv": "Exporter CSV",
    "export.json": "Exporter TOUT (JSON)",
    "import.json": "Importer (JSON)",
    "export.include_charts": "Inclure images des graphiques",

    // Calendrier
    "calendar.month": "Mois — Année",

    // Habitudes / Réglages
    "habits.title": "Habitudes",
    "habits.objectives": "Objectifs quotidiens",
    "habits.dates": "Dates clés",
    "btn.save": "Enregistrer",
    "btn.reset": "Réinitialiser",
    "btn.clear": "Effacer",
    "btn.close": "Fermer",

    // Conseils types
    "tip.fill_prices": "Renseigne le prix de {list} dans Réglages pour voir des coûts/économies réalistes.",
    "tip.zero_today": "🎯 Zéro aujourd’hui — parfait ! Garde ce rythme.",
    "tip.below_goal": "Bien joué : en dessous de l’objectif pour {list}.",
    "tip.micro_goal": "Micro-objectif 💡: {label} — vise {n} au prochain passage.",
    "cost.today": "Coût du jour : {n} {sym}. Un pas de moins réduit la note dès aujourd’hui.",
  },

  en: {
    // Navigation
    "nav.home": "Home",
    "nav.stats": "Stats",
    "nav.calendar": "Calendar",
    "nav.habits": "Habits",
    "nav.settings": "Settings",

    // Home & bar
    "today.title": "Today",
    "counts.cigs": "Cigs",
    "counts.weed": "Joints",
    "counts.alcohol": "Alcohol",
    "cost": "Cost",
    "savings": "Savings",
    "tips.title": "Tips",
    "resources": "Resources & helplines",
    "activate": "Enable",

    // Categories
    "cat.cigs": "Cigarettes",
    "cat.weed": "Joints",
    "cat.beer": "Beer",
    "cat.strong": "Spirits",
    "cat.liquor": "Liqueur",

    // Stats
    "stats.totals": "Totals",
    "stats.cost_total": "Total cost",
    "stats.savings_total": "Savings",
    "range.day": "Day",
    "range.week": "Week",
    "range.month": "Month",
    "range.year": "Year",
    "stats.header": "{range} summary — {title}",

    // Export
    "export.csv": "Export CSV",
    "export.json": "Export ALL (JSON)",
    "import.json": "Import (JSON)",
    "export.include_charts": "Include chart images",

    // Calendar
    "calendar.month": "Month — Year",

    // Habits / Settings
    "habits.title": "Habits",
    "habits.objectives": "Daily goals",
    "habits.dates": "Key dates",
    "btn.save": "Save",
    "btn.reset": "Reset",
    "btn.clear": "Clear",
    "btn.close": "Close",

    // Tips
    "tip.fill_prices": "Fill the price of {list} in Settings to get realistic costs/savings.",
    "tip.zero_today": "🎯 Zero today — great! Keep it up.",
    "tip.below_goal": "Nice: below the goal for {list}.",
    "tip.micro_goal": "Micro-goal 💡: {label} — aim {n} next time.",
    "cost.today": "Today’s cost: {n} {sym}. One less already reduces the bill.",
  },
};

// ------ Langue active ------
function detectLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {}
  try {
    const nav = (navigator.language || navigator.userLanguage || "fr").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
  } catch {}
  return "en"; // fallback
}

let current = detectLang();

function setLang(lang) {
  if (!STRINGS[lang]) lang = "fr";
  current = lang;
  try { localStorage.setItem(STORE_KEY, lang); } catch {}
  // maj <html lang="">
  try {
    const html = document.documentElement;
    if (html) html.setAttribute("lang", lang);
    // direction (toutes nos langues sont LTR ici)
    html.setAttribute("dir", "ltr");
  } catch {}
  // Appliquer aux éléments data-i18n
  apply();
  // Événement global
  try { document.dispatchEvent(new CustomEvent("sa:lang-changed", { detail: { lang } })); } catch {}
}

function getLang() { return current; }

// ------ Traduction ------
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function t(key, vars) {
  const dict = STRINGS[current] || STRINGS.fr;
  let out = dict[key];
  if (out == null) {
    // fallback en -> fr -> clé
    out = (STRINGS.fr && STRINGS.fr[key]) || (STRINGS.en && STRINGS.en[key]) || key;
  }
  if (typeof out !== "string") return key;
  return interpolate(out, vars);
}

// ------ Application auto sur le DOM ------
// Usage :
//   <span data-i18n="nav.settings"></span>
//   <input data-i18n="habits.title" data-i18n-attr="placeholder">
function apply(root = document) {
  const nodes = root.querySelectorAll("[data-i18n]");
  nodes.forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const attr = el.getAttribute("data-i18n-attr");
    const html = el.getAttribute("data-i18n-html") === "1";
    if (!key) return;
    const txt = t(key);
    if (attr) el.setAttribute(attr, txt);
    else if (html) el.innerHTML = txt;
    else el.textContent = txt;
  });
}

// ------ Labels de catégories (utiles aux modules) ------
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

// ------ API publique ------
export function initI18n() {
  // Mettre l'attribut lang au démarrage
  try {
    const html = document.documentElement;
    if (html) html.setAttribute("lang", current);
  } catch {}
  // Appliquer dès que possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => apply(), { once: true });
  } else {
    apply();
  }

  // Optionnel : bouton rapide si présent
  // <button id="toggle-lang">FR/EN</button>
  const toggle = document.getElementById("toggle-lang");
  if (toggle) {
    toggle.addEventListener("click", () => {
      setLang(getLang() === "fr" ? "en" : "fr");
    });
  }
}

try {
  window.SA_I18N = { t, setLang, getLang, apply, categoryLabel, STRINGS };
} catch { /* ignore */ }

export { t, setLang, getLang, apply, categoryLabel };
export default { initI18n, t, setLang, getLang, apply, categoryLabel };
