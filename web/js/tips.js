/* web/js/tips.js — Panneau de conseils */
let $root = null;
let getState = () => ({});

const $ = (s, r=document) => r.querySelector(s);

function line(txt){
  const div = document.createElement('div');
  div.className = 'tip-line';
  div.textContent = txt;
  return div;
}

function computeUnitPrices(S){
  const v = S.variants || {};
  const p = S.prices   || {};
  const out = {
    cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0
  };
  // clopes
  if (p.cigarette > 0) out.cigs = p.cigarette;
  else if (v.classic?.use && v.classic.packPrice > 0 && v.classic.cigsPerPack > 0)
    out.cigs = v.classic.packPrice / v.classic.cigsPerPack;
  else if (v.rolled?.use && v.rolled.tobacco30gPrice > 0 && v.rolled.cigsPer30g > 0)
    out.cigs = v.rolled.tobacco30gPrice / v.rolled.cigsPer30g;

  // joints
  if (p.joint > 0) out.joints = p.joint;
  else if (v.cannabis?.use && v.cannabis.gramPrice > 0 && v.cannabis.gramsPerJoint > 0)
    out.joints = v.cannabis.gramPrice * v.cannabis.gramsPerJoint;

  // alcool
  out.beer    = p.beer    > 0 ? p.beer    : (v.alcohol?.beer?.enabled    ? (v.alcohol.beer.unitPrice||0)    : 0);
  out.hard    = p.hard    > 0 ? p.hard    : (v.alcohol?.hard?.enabled    ? (v.alcohol.hard.dosePrice||0)    : 0);
  out.liqueur = p.liqueur > 0 ? p.liqueur : (v.alcohol?.liqueur?.enabled ? (v.alcohol.liqueur.dosePrice||0) : 0);
  return out;
}

function fmtMoney(value, cur='€'){
  const n = Math.round(Number(value||0) * 100) / 100;
  return n.toFixed(2).replace('.', ',') + cur;
}

function renderTips(S){
  if (!$root) return;
  $root.replaceChildren();

  const card = document.createElement('div');
  card.className = 'tips-card';
  const h3 = document.createElement('h3');
  h3.textContent = 'Conseils du jour';
  card.appendChild(h3);

  const goals = S.goals || {};
  const act   = (S.today && S.today.counters) ? S.today.counters : {};
  const units = computeUnitPrices(S);
  const cur   = S.currency || '€';

  // 1) Félicitations zéro conso
  const sum = ['cigs','joints','beer','hard','liqueur'].reduce((t,k)=>t+(Number(act[k]||0)),0);
  if (sum === 0) card.appendChild(line('Bravo, journée sans consommation pour le moment. Continue !'));

  // 2) Par module vs objectif
  const pairs = [
    ['cigs','cigarettes'], ['joints','joints'],
    ['beer','bières'], ['hard','alcools forts'], ['liqueur','liqueurs']
  ];
  for (const [k, label] of pairs){
    const g = Number(goals[k]||0), a = Number(act[k]||0);
    if (!S.modules?.[k]) continue;
    if (g>0 && a>g) card.appendChild(line(`Tu as dépassé ton objectif ${label} (${a}/${g}). Essaie de freiner d’ici ce soir.`));
    else if (g>0 && a===g) card.appendChild(line(`Objectif atteint pour ${label} (${a}/${g}). Reste à ce niveau 💪`));
    else if (g>0 && a<g) card.appendChild(line(`Encore ${g-a} ${label} maximum pour rester dans l’objectif.`));
  }

  // 3) Coût estimé si tu augmentes de +1
  const deltas = [];
  for (const k of Object.keys(units)){
    if (!S.modules?.[k]) continue;
    if (units[k]>0) deltas.push(`${k} +1 = ${fmtMoney(units[k], cur)}`);
  }
  if (deltas.length) card.appendChild(line(`Impact financier (par +1) → ${deltas.join(' · ')}`));

  // 4) Rappel dates clés
  const d = S.dates || {};
  if (d.stopCigs || d.stopJoints || d.stopAlcohol) {
    card.appendChild(line('Tu as défini des dates clés — pense à les consulter dans Habitudes.'));
  }

  $root.appendChild(card);
}

export function mountTips({ rootSel = '#tips-root', stateGetter } = {}){
  $root = document.querySelector(rootSel);
  getState = typeof stateGetter === 'function' ? stateGetter : getState;
  if ($root) renderTips(getState());
}

export function updateTips(S){
  renderTips(S || getState());
}
