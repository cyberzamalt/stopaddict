// web/js/tips.js
// STOPADDICT — Conseils adaptatifs (Accueil, bandeau bas)
// - Analyse la journée (comptes, objectifs, prix) et affiche 2–4 conseils utiles.
// - Personnalise avec le prénom (Réglages > Profil).
// - Respecte l’activation/désactivation des catégories et l’absence de prix.
// - Rafraîchit sur changements (comptes, réglages, langue, devise).
// Cibles DOM (tolérant) :
//   * #tips-box        (prioritaire, si présent dans la page)
//   * [data-tips]      (fallback sémantique)
//   * crée <div id="tips-box"> dans #ecran-accueil sinon.

"use strict";

import { getSettings, getDaily, calculateDayCost } from "./state.js";
import { t, categoryLabel } from "./i18n.js";

const $  = (sel, root = document) => root.querySelector(sel);

// --- Utilitaires locaux ---
function enabledKinds(s) {
  const out = [];
  if (s.enable_cigs) out.push("cigs");
  if (s.enable_weed) out.push("weed");
  if (s.enable_alcohol && s.enable_beer)   out.push("beer");
  if (s.enable_alcohol && s.enable_strong) out.push("strong");
  if (s.enable_alcohol && s.enable_liquor) out.push("liquor");
  return out;
}
function moneySymbol() {
  try { return window.SA_CURRENCY?.get()?.symbol || "€"; } catch { return "€"; }
}
function listLabels(kinds) {
  return kinds.map(categoryLabel).join(", ");
}
function integer(n) {
  const v = Number.parseInt(n, 10);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

// --- Génération des messages ---
function buildTips() {
  const s = getSettings();
  const today = getDaily(new Date());
  const kinds = enabledKinds(s);
  const msgs = [];

  // 0) Personnalisation (accroche douce si prénom)
  const name = (s.profile?.name || "").trim();
  const hello = name ? `👋 ${name} — ` : "";

  // 1) Prix manquants (uniquement parmi les catégories actives)
  const prices = s.prices || {};
  const missing = kinds.filter(k =>
    (k === "cigs"   && !+prices.cig)   ||
    (k === "weed"   && !+prices.weed)  ||
    (k === "beer"   && !+prices.beer)  ||
    (k === "strong" && !+prices.strong)||
    (k === "liquor" && !+prices.liquor)
  );
  if (missing.length) {
    msgs.push(t("tip.fill_prices", { list: listLabels(missing) }));
  }

  // 2) Coût du jour (toujours utile, avec devise)
  const cost = calculateDayCost(today, s);
  msgs.push(hello + t("cost.today", { n: cost.toFixed(2), sym: moneySymbol() }));

  // 3) Zéro aujourd’hui ?
  const totalToday = kinds.reduce((acc, k) => acc + integer(today[k]), 0);
  if (totalToday === 0) {
    msgs.push(t("tip.zero_today"));
  }

  // 4) En dessous de l’objectif ?
  const base = s.baselines || {};
  const below = kinds.filter(k => {
    const b =
      k === "cigs" ? +base.cig :
      k === "weed" ? +base.weed :
      k === "beer" ? +base.beer :
      k === "strong" ? +base.strong :
      k === "liquor" ? +base.liquor : 0;
    return Number.isFinite(b) && integer(today[k]) < b;
  });
  if (below.length) {
    msgs.push(t("tip.below_goal", { list: listLabels(below) }));
  }

  // 5) Micro-objectif (proposition simple sur la catégorie la plus haute aujourd’hui)
  let maxKind = null, maxVal = -1;
  for (const k of kinds) {
    const v = integer(today[k]);
    if (v > maxVal) { maxVal = v; maxKind = k; }
  }
  if (maxKind && maxVal > 0) {
    const target = Math.max(0, maxVal - 1);
    msgs.push(t("tip.micro_goal", { label: categoryLabel(maxKind), n: target }));
  }

  // Limiter à 3–4 messages pour rester lisible
  return msgs.slice(0, 4);
}

// --- Rendu DOM ---
function ensureHost() {
  let host = document.getElementById("tips-box");
  if (host) return host;

  host = document.querySelector("[data-tips]");
  if (host) return host;

  // Fallback : créer un bandeau minimal si rien n’existe
  const home = document.getElementById("ecran-accueil") || document.body;
  host = document.createElement("div");
  host.id = "tips-box";
  // styles légers si aucun style global
  host.style.background = "#f59e0b1a";
  host.style.borderTop = "1px solid #f59e0b55";
  host.style.padding = ".5rem .75rem";
  host.style.marginTop = "0.5rem";
  home.appendChild(host);
  return host;
}

function render() {
  const host = ensureHost();
  const tips = buildTips();

  // Structure simple : liste de paragraphes
  host.innerHTML = "";
  tips.forEach(txt => {
    const p = document.createElement("p");
    p.className = "tip-line";
    p.textContent = txt;
    host.appendChild(p);
  });
}

// --- API publique ---
export function initTips() {
  render();

  // Rafraîchir si la journée/les réglages changent
  document.addEventListener("sa:counts-updated", render);
  document.addEventListener("sa:state-changed", render);
  document.addEventListener("sa:lang-changed", render);
  document.addEventListener("sa:currency-changed", render);

  // Rafraîchir quand on revient sur l’Accueil
  const nav = document.getElementById("nav-accueil");
  if (nav) nav.addEventListener("click", () => setTimeout(render, 0));
}

export default { initTips };
