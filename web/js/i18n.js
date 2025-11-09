/* web/js/i18n.js — Dictionnaires + applyLanguage (ES module, autonome)
   Usage:
     import { t, getLanguage, setLanguage, applyLanguage } from "./i18n.js";
   - Stocke la langue dans localStorage (LS_LANG)
   - Met à jour les libellés visibles sans toucher à la logique
   - S’accroche sur #select-language si présent
*/

const LS_LANG = "stopaddict_lang";

const DICT = {
  fr: {
    title: "StopAddict",
    tabs: { home: "Accueil", stats: "Stats", calendar: "Calendrier", habits: "Habitudes", settings: "Réglages" },
    counters: {
      cigs: "Cigarettes", joints: "Joints", beer: "Bière", hard: "Alcool fort", liqueur: "Liqueur",
      alcoholGlobal: "Alcool (global)", enable: "Activer", minus: "−", plus: "+"
    },
    stats: {
      period: "Période",
      day: "Jour", week: "Semaine", month: "Mois", year: "Année",
      exportCSV: "Exporter CSV", exportJSON: "Exporter JSON", importJSON: "Importer JSON",
      qtyChart: "Quantités", moneyChart: "Coûts / Économies"
    },
    cal: { day: "Jour", week: "Semaine", month: "Mois", openStats: "Ouvrir Stats", openHabits: "Ouvrir Habitudes" },
    habits: { goals: "Objectifs par jour", dates: "Dates clés" },
    settings: {
      profile: "Profil", name: "Prénom", language: "Langue",
      currency: "Devise", symbol: "Symbole", before: "Avant", after: "Après", apply: "Appliquer",
      modules: "Modules",
      prices: "Prix unitaires",
      price: { cigs: "Cigarette (€)", joints: "Joint (€)", beer: "Bière (€)", hard: "Alcool fort (€)", liqueur: "Liqueur (€)" },
      pricesSave: "Enregistrer les prix", pricesReset: "Réinitialiser les prix",
      maintenance: "Maintenance & sauvegardes",
      razDay: "RAZ du jour", razHist: "RAZ historique", razFactory: "RAZ réglages (usine)",
      saveJSON: "Sauvegarder JSON", importJSON: "Importer JSON",
      debug: "Journal & Debug", showConsole: "Afficher la console",
      copyLogs: "Copier les logs", clearLogs: "Vider les logs", resources: "Ressources & numéros utiles"
    },
    age: { title: "+18", text: "J'ai plus de 18 ans.", yes: "Oui", hide: "Ne plus afficher", enter: "Entrer", help: "Besoin d'aide ? " },
    daysShort: ["Lu","Ma","Me","Je","Ve","Sa","Di"]
  },

  en: {
    title: "StopAddict",
    tabs: { home: "Home", stats: "Stats", calendar: "Calendar", habits: "Habits", settings: "Settings" },
    counters: {
      cigs: "Cigarettes", joints: "Joints", beer: "Beer", hard: "Spirits", liqueur: "Liqueur",
      alcoholGlobal: "Alcohol (global)", enable: "Enable", minus: "−", plus: "+"
    },
    stats: {
      period: "Period",
      day: "Day", week: "Week", month: "Month", year: "Year",
      exportCSV: "Export CSV", exportJSON: "Export JSON", importJSON: "Import JSON",
      qtyChart: "Quantities", moneyChart: "Costs / Savings"
    },
    cal: { day: "Day", week: "Week", month: "Month", openStats: "Open Stats", openHabits: "Open Habits" },
    habits: { goals: "Daily goals", dates: "Key dates" },
    settings: {
      profile: "Profile", name: "First name", language: "Language",
      currency: "Currency", symbol: "Symbol", before: "Before", after: "After", apply: "Apply",
      modules: "Modules",
      prices: "Unit prices",
      price: { cigs: "Cigarette (€)", joints: "Joint (€)", beer: "Beer (€)", hard: "Spirits (€)", liqueur: "Liqueur (€)" },
      pricesSave: "Save prices", pricesReset: "Reset prices",
      maintenance: "Maintenance & backups",
      razDay: "Reset today", razHist: "Reset history", razFactory: "Factory reset",
      saveJSON: "Save JSON", importJSON: "Import JSON",
      debug: "Logs & Debug", showConsole: "Show console",
      copyLogs: "Copy logs", clearLogs: "Clear logs", resources: "Resources & helplines"
    },
    age: { title: "+18", text: "I am over 18.", yes: "Yes", hide: "Don't show again", enter: "Enter", help: "Need help? " },
    daysShort: ["Mo","Tu","We","Th","Fr","Sa","Su"]
  }
};

/* ---------------- Core API ---------------- */
export function getLanguage(){
  return localStorage.getItem(LS_LANG) || "fr";
}
export function setLanguage(lang){
  if (!DICT[lang]) lang = "fr";
  localStorage.setItem(LS_LANG, lang);
}

export function t(path, fallback=""){
  const lang = getLanguage();
  const dict = DICT[lang] || DICT.fr;
  return path.split(".").reduce((o,k)=> (o && o[k]!=null ? o[k] : undefined), dict) ?? fallback;
}

/* Applique les libellés connus sans exiger data-i18n (index.html existant) */
export function applyLanguage(lang = getLanguage()){
  setLanguage(lang);

  // Title & Tabs
  setText("#app-title", t("title"));
  setText('#tabs .tab[data-tab="home"]', t("tabs.home"));
  setText('#tabs .tab[data-tab="stats"]', t("tabs.stats"));
  setText('#tabs .tab[data-tab="calendar"]', t("tabs.calendar"));
  setText('#tabs .tab[data-tab="habits"]', t("tabs.habits"));
  setText('#tabs .tab[data-tab="settings"]', t("tabs.settings"));

  // Home counters
  setText("#ctr-cigs h2", t("counters.cigs"));
  setText("#ctr-joints h2", t("counters.joints"));
  setText("#ctr-beer h2", t("counters.beer"));
  setText("#ctr-hard h2", t("counters.hard"));
  setText("#ctr-liqueur h2", t("counters.liqueur"));
  // Toggle labels (“Activer / Enable”)
  document.querySelectorAll(".toggle").forEach(lbl=>{
    const input = lbl.querySelector("input");
    if (input){
      // Conserve l’input et remplace le texte à côté
      const txt = document.createTextNode(" " + t("counters.enable"));
      // Nettoie tous les nœuds après l’input
      while (input.nextSibling) input.nextSibling.remove();
      input.after(txt);
    }
  });

  // Stats
  setText("#page-stats .kpi-block h3", t("stats.period"));
  setText("#btnPeriod-day", t("stats.day"));
  setText("#btnPeriod-week", t("stats.week"));
  setText("#btnPeriod-month", t("stats.month"));
  setText("#btnPeriod-year", t("stats.year"));
  setAttr("#btn-export-csv", "data-i18n-label", t("stats.exportCSV"));
  setAttr("#btn-export-json", "data-i18n-label", t("stats.exportJSON"));
  // Le label d'import est un <label> contenant l’input : on remplace son texte visible
  const importLbl = document.querySelector('#page-stats label.btn.small input#file-import-json')?.parentElement;
  if (importLbl){
    importLbl.childNodes.forEach(n=>{ if(n.nodeType===Node.TEXT_NODE) n.textContent = t("stats.importJSON")+" "; });
  }

  // Calendar toolbar buttons (si présents)
  setText('button[data-cal-mode="day"]', t("cal.day"));
  setText('button[data-cal-mode="week"]', t("cal.week"));
  setText('button[data-cal-mode="month"]', t("cal.month"));
  setText("#cal-open-stats", t("cal.openStats"));
  setText("#cal-open-habits", t("cal.openHabits"));

  // Habits & Settings section headers (ordre actuel du DOM)
  const setH2 = (rootSel, keys) => {
    const hs = document.querySelectorAll(`${rootSel} h2.section-title`);
    keys.forEach((k, i)=>{ if(hs[i]) hs[i].textContent = t(k); });
  };
  setH2("#page-habits", ["habits.goals","habits.dates"]);
  setH2("#page-settings", ["settings.profile","settings.currency","settings.modules","settings.prices","settings.maintenance","settings.debug"]);

  // Settings controls
  setLabelText("#profile-name", t("settings.name"));
  const langSel = document.getElementById("select-language");
  if (langSel){
    ensureLangOptions(langSel);
    langSel.value = lang;
  }
  setLabelText("#currency-symbol", t("settings.symbol"));
  setText("#btn-apply-currency", t("settings.apply"));
  // Prices block buttons
  setText("#btn-save-prices", t("settings.pricesSave"));
  setText("#btn-reset-prices", t("settings.pricesReset"));
  // Maintenance buttons
  setText("#btn-raz-day", t("settings.razDay"));
  setText("#btn-raz-history", t("settings.razHist"));
  setText("#btn-raz-factory", t("settings.razFactory"));
  // JSON buttons
  setText("#btn-save-json-settings", t("settings.saveJSON"));
  const importLbl2 = document.querySelector('#page-settings label.btn input#file-import-json-settings')?.parentElement;
  if (importLbl2){
    importLbl2.childNodes.forEach(n=>{ if(n.nodeType===Node.TEXT_NODE) n.textContent = t("settings.importJSON")+" "; });
  }
  // Debug & resources
  setLabelForCheckbox("#cb-debug-overlay", t("settings.showConsole"));
  setText("#btn-copy-logs", t("settings.copyLogs"));
  setText("#btn-clear-logs", t("settings.clearLogs"));
  setText("#btn-resources", t("settings.resources"));

  // Age Gate
  setText("#agegate h3", t("age.title"));
  setText("#agegate p", t("age.text"));
  // Les deux labels contiennent un input + texte
  replaceLabelText("#age-18plus", t("age.yes"));
  replaceLabelText("#age-hide", t("age.hide"));
  setText("#btn-age-accept", t("age.enter"));
  // (Le lien "Ressources…" est injecté par resources.js, son texte peut être ajusté là-bas au besoin)
}

/* ---------------- DOM utils ---------------- */
function setText(sel, text){
  const el = document.querySelector(sel);
  if (el && typeof text === "string") el.textContent = text;
}
function setAttr(sel, attr, val){
  const el = document.querySelector(sel);
  if (el) el.setAttribute(attr, val);
}
function ensureLangOptions(selectEl){
  if (selectEl.options.length===0){
    const opts = [
      { v:"fr", l:"Français" },
      { v:"en", l:"English" }
    ];
    opts.forEach(o=>{
      const op = document.createElement("option");
      op.value = o.v; op.textContent = o.l;
      selectEl.appendChild(op);
    });
  }
}
function setLabelText(inputSel, labelText){
  const input = document.querySelector(inputSel);
  if (!input) return;
  const label = input.closest("label");
  if (label){
    // Conserve l’input/select et remplace le texte autour
    const nodeText = Array.from(label.childNodes).find(n=> n.nodeType===Node.TEXT_NODE);
    if (nodeText) nodeText.textContent = labelText + " ";
    else label.prepend(document.createTextNode(labelText + " "));
  }
}
function setLabelForCheckbox(cbSel, text){
  const cb = document.querySelector(cbSel);
  if (!cb) return;
  const lbl = cb.closest("label");
  if (lbl){
    while (cb.nextSibling) cb.nextSibling.remove();
    cb.after(document.createTextNode(" " + text));
  }
}
function replaceLabelText(inputIdSel, text){
  const input = document.querySelector(inputIdSel);
  if (!input) return;
  const lbl = input.closest("label");
  if (!lbl) return;
  while (input.nextSibling) input.nextSibling.remove();
  input.after(document.createTextNode(" " + text));
}

/* ---------------- Auto-mount ---------------- */
function bindLanguageSelector(){
  const sel = document.getElementById("select-language");
  if (!sel) return;
  sel.addEventListener("change", ()=>{
    const val = sel.value || "fr";
    setLanguage(val);
    applyLanguage(val);
    // Optionnel: signaler aux autres modules que la langue a changé
    document.dispatchEvent(new CustomEvent("sa:lang-changed", { detail:{ lang: val }}));
  });
}

try{
  // Applique immédiatement la langue stockée (ou fr)
  applyLanguage(getLanguage());
  bindLanguageSelector();
}catch{}

/* Expose global (facultatif) */
try { window.StopAddictI18N = { t, getLanguage, setLanguage, applyLanguage }; } catch {}
