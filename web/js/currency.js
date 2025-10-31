// web/js/currency.js
// STOPADDICT — Monnaie (symbole + formatage) ultra-simple
// - Calculs inchangés : seul le symbole visuel s’adapte.
// - Détection par défaut via langue/pays du navigateur.
// - Persistance localStorage, évènement 'sa:currency-changed'.
// - API accessible : window.SA_CURRENCY { symbol, position, set(), format(), get(), render() }.

"use strict";

const STORE_KEY = "stopaddict_currency_v1";

// -------- Détection par défaut (grossière mais utile) --------
function detectDefault() {
  let lang = "en-US";
  try { lang = (navigator.language || "en-US").toLowerCase(); } catch {}
  const country = (lang.split("-")[1] || "").toUpperCase();

  // Zones € (élargies)
  const EUR = new Set(["FR","DE","ES","IT","PT","NL","BE","AT","FI","IE","LU","LT","LV","EE","SI","SK","GR","CY","MT","HR","MC","AD","SM","VA"]);

  // Cas particuliers courants
  if (country === "GB" || country === "UK") return { symbol: "£", position: "before" };
  if (country === "CH") return { symbol: "CHF", position: "after" };
  if (country === "MA") return { symbol: "MAD", position: "after" };
  if (country === "JP") return { symbol: "¥", position: "before" };
  if (country === "TH") return { symbol: "฿", position: "before" };
  if (EUR.has(country)) return { symbol: "€", position: "after" };

  // Amériques / autres : $
  return { symbol: "$", position: "before" };
}

// -------- State & persistence --------
let currency = (() => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && obj.symbol) {
        return { symbol: String(obj.symbol), position: obj.position === "before" ? "before" : "after" };
      }
    }
  } catch {}
  return detectDefault();
})();

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(currency)); } catch {}
}

// -------- Public helpers --------
function get() { return { ...currency }; }

function set(opts = {}) {
  const next = { ...currency };
  if (opts.symbol != null && String(opts.symbol).trim() !== "") next.symbol = String(opts.symbol).trim();
  if (opts.position === "before" || opts.position === "after") next.position = opts.position;
  currency = next;
  persist();
  // Notification globale
  try { document.dispatchEvent(new CustomEvent("sa:currency-changed", { detail: { ...currency } })); } catch {}
  renderDOM(); // si des éléments data-money / data-currency-symbol sont présents
}

function format(n, withSymbol = true, decimals = 2) {
  const v = Number.isFinite(+n) ? +n : 0;
  const num = v.toFixed(decimals);
  if (!withSymbol) return num;
  return currency.position === "before" ? `${currency.symbol}${num}` : `${num} ${currency.symbol}`;
}

// Met à jour les éléments marqués dans le DOM (optionnel)
// <span data-money="12.3"></span>  -> "12.30 €"
// <span data-money="12.3" data-money-symbol="0"></span> -> "12.30"
// <span data-money="12.3" data-money-dec="0"></span> -> "12"
// <span data-currency-symbol></span> -> "€"
function renderDOM(root = document) {
  const nodes = root.querySelectorAll("[data-money]");
  nodes.forEach(el => {
    const raw = el.getAttribute("data-money");
    const val = parseFloat(raw || "0");
    const wantSym = el.getAttribute("data-money-symbol") !== "0";
    const decAttr = el.getAttribute("data-money-dec");
    const dec = Number.isFinite(+decAttr) ? +decAttr : 2;
    el.textContent = format(val, wantSym, dec);
  });
  const symNodes = root.querySelectorAll("[data-currency-symbol]");
  symNodes.forEach(el => { el.textContent = currency.symbol; });
}

// -------- Init --------
export function initCurrency() {
  // Première application
  renderDOM();

  // Exposer l’API globale
  try {
    window.SA_CURRENCY = {
      get symbol() { return currency.symbol; },
      get position() { return currency.position; },
      set: set, get: get, format: format, render: renderDOM,
    };
  } catch {}
}

export { get, set, format, renderDOM };
export default { initCurrency, get, set, format, renderDOM };
