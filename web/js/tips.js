/* web/js/tips.js — Conseils dynamiques (toujours visibles, personnalisés) */

import { fmtMoney } from "./state.js";

let _root = null;
let _getState = null;

function daysBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b);
  d1.setHours(0,0,0,0); d2.setHours(0,0,0,0);
  return Math.round((d2 - d1) / 86400000);
}

function todayISO(d=new Date()){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function unitApprox(S, kind){
  // Approximations simples (on utilise les prix directs si fournis)
  const p = S?.prices || {};
  switch(kind){
    case "cigs":    return Number(p.cigarette || 0);
    case "joints":  return Number(p.joint || 0);
    case "beer":    return Number(p.beer || 0);
    case "hard":    return Number(p.hard || 0);
    case "liqueur": return Number(p.liqueur || 0);
    default: return 0;
  }
}

function todayCostApprox(S){
  const t = S?.today || {}, c = t.counters || {}, cur = S?.currency;
  const kinds = ["cigs","joints","beer","hard","liqueur"];
  let sum = 0;
  kinds.forEach(k=>{
    if (!S.modules?.[k] || !S.today?.active?.[k]) return;
    sum += Number(c[k]||0) * unitApprox(S,k);
  });
  return fmtMoney(sum, cur);
}

function tip(text){
  const div = document.createElement("div");
  div.className = "tip-line";
  div.textContent = text;
  return div;
}

function tipHTML(html){
  const div = document.createElement("div");
  div.className = "tip-line";
  div.innerHTML = html;
  return div;
}

function renderTips(S){
  if (!_root) return;
  _root.innerHTML = ""; // reset

  // Carte conseils
  const card = document.createElement("div");
  card.className = "tips-card";
  const name = (S?.profile?.name || "").trim();
  const title = document.createElement("h3");
  title.textContent = name ? `Conseils pour ${name}` : "Conseils du jour";
  card.appendChild(title);

  // — Conseils génériques (toujours présents)
  card.appendChild(tip("Note chaque consommation avec +/−. Tu peux activer/désactiver des modules sur l’Accueil."));
  card.appendChild(tip("Règle tes objectifs et les prix dans Réglages pour un suivi plus précis."));
  card.appendChild(tip("Tu peux exporter/importer tes données (JSON/CSV) depuis la page Stats/Réglages."));

  // — Personnalisation : objectifs
  const goals = S?.goals || {};
  const counters = S?.today?.counters || {};
  const modules  = S?.modules || {};
  const act      = S?.today?.active || {};
  const goalKinds = ["cigs","joints","beer","hard","liqueur"];
  let hasGoal = false;

  goalKinds.forEach(k=>{
    const g = Number(goals[k]||0);
    if (!g || !modules[k]) return;
    hasGoal = true;
    const cur = Number(counters[k]||0);
    const left = Math.max(0, g - cur);
    if (left > 0) {
      card.appendChild(tip(`Objectif ${k}: il reste ${left} avant d’atteindre ta limite du jour (${g}).`));
    } else {
      card.appendChild(tip(`Objectif ${k}: ✅ tu as atteint ou dépassé ton objectif (${g}).`));
    }
  });

  if (!hasGoal) {
    card.appendChild(tip("Aucun objectif défini : ajoute-en un dans Habitudes pour recevoir des conseils ciblés."));
  }

  // — Personnalisation : prix / coût du jour
  const anyPrice = ["cigarette","joint","beer","hard","liqueur"].some(k=> Number(S?.prices?.[k]||0) > 0);
  if (anyPrice) {
    card.appendChild(tip(`Coût estimé aujourd’hui : ${todayCostApprox(S)} (affine tes prix dans Réglages).`));
  } else {
    card.appendChild(tip("Ajoute tes prix (cigarette, bière, etc.) dans Réglages pour estimer tes coûts/économies."));
  }

  // — Personnalisation : dates clés
  const D = S?.dates || {};
  const today = todayISO();
  const keys = [
    ["stopGlobal","Arrêt global"],
    ["stopAlcohol","Arrêt alcool"],
    ["reduceCigs","Début réduction clopes"],
    ["quitCigsObj","Objectif arrêt clopes"],
    ["noMoreCigs","Plus jamais clopes"],
    ["reduceJoints","Début réduction joints"],
    ["quitJointsObj","Objectif arrêt joints"],
    ["noMoreJoints","Plus jamais joints"],
    ["reduceAlcohol","Début réduction alcool"],
    ["quitAlcoholObj","Objectif arrêt alcool"],
    ["noMoreAlcohol","Plus jamais alcool"],
  ];
  let hasDate=false;
  keys.forEach(([k, label])=>{
    const v = (D[k]||"").trim();
    if (!v) return;
    hasDate=true;
    const d = daysBetween(v, today);
    if (d === 0)      card.appendChild(tip(`${label}: c’est aujourd’hui — courage !`));
    else if (d > 0)  card.appendChild(tip(`${label}: +${d} jour(s) depuis cette étape — continue !`));
    else             card.appendChild(tip(`${label}: dans ${Math.abs(d)} jour(s) — prépare-toi.`));
  });
  if (!hasDate){
    card.appendChild(tip("Ajoute des dates clés (début réduction, objectif, plus jamais…) pour des repères concrets."));
  }

  // — Personnalisation : modules / alcool global
  const alcoholGlobal = !!modules.alcohol;
  const drinksOn = ["beer","hard","liqueur"].some(k => modules[k] && act[k]);
  if (alcoholGlobal && drinksOn){
    card.appendChild(tip("“Alcool global” activé : les boissons unitaires seront désactivées pour éviter les doublons."));
  } else if (!alcoholGlobal && !drinksOn && (modules.beer||modules.hard||modules.liqueur)) {
    card.appendChild(tip("Active au choix “Alcool global” ou tes boissons (bière/alcool fort/liqueur) pour suivre l’alcool."));
  }

  // — Personnalisation : prénom
  if (name){
    card.appendChild(tip(`Bravo ${name} pour le suivi régulier — pense à exporter tes données chaque semaine.`));
  }

  _root.appendChild(card);
}

export function mountTips({ rootSel, stateGetter }){
  _root = document.querySelector(rootSel || "#tips-root");
  _getState = stateGetter || (()=> (window?.S || null));
  if (_root) renderTips(_getState());
}

export function updateTips(S){
  const state = S || (_getState ? _getState() : null);
  if (!_root) return;
  renderTips(state);
}
