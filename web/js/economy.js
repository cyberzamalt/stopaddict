// web/js/economy.js
// Calcule et met à jour le coût du jour (+ expose une petite API globale)
// Lit: state.entries (array {ts, type, qty}), state.settings (enable + prix)
// MAJ: #stat-cout-jr (header)
// Écoute: "sa:changed", "sa:settingsSaved", "sa:imported"

import { state } from "./state.js";
import { startOfDay } from "./utils.js";

function getEnable() {
  const en = (state.settings && state.settings.enable) || {};
  return {
    cigs:   (en.cigs   !== false),
    weed:   (en.weed   !== false),
    alcohol:(en.alcohol!== false),
  };
}

function getPrices() {
  // On récupère les prix quelle que soit la forme choisie dans settings
  const s = state.settings || {};
  const p = s.prices || s.price || {};
  return {
    cl_class:  +((p.cl_class  ?? s.prix_cl_class)  ?? 0),
    cl_roul:   +((p.cl_roul   ?? s.prix_cl_roul)   ?? 0),
    cl_tube:   +((p.cl_tube   ?? s.prix_cl_tube)   ?? 0),
    joint:     +((p.joint     ?? s.prix_joint)     ?? 0),
    biere:     +((p.biere     ?? s.prix_biere)     ?? 0),
    fort:      +((p.fort      ?? s.prix_fort)      ?? 0),
    liqueur:   +((p.liqueur   ?? s.prix_liqueur)   ?? 0),
  };
}

function priceForType(type) {
  const pr = getPrices();
  if (type==="cig" || type==="cig_class") return pr.cl_class;
  if (type==="cig_roul")                  return pr.cl_roul;
  if (type==="cig_tube")                  return pr.cl_tube;
  if (type==="weed" || type==="joint" || type==="joints") return pr.joint;
  if (type==="beer" || type==="alc_biere")                 return pr.biere;
  if (type==="strong" || type==="alc_fort")                return pr.fort;
  if (type==="liquor" || type==="alc_liqueur" || type==="alcohol") return pr.liqueur;
  return 0;
}

function moduleGuards(type) {
  const en = getEnable();
  if (type==="cig" || type==="cig_class" || type==="cig_roul" || type==="cig_tube") return en.cigs;
  if (type==="weed" || type==="joint" || type==="joints")                            return en.weed;
  if (type==="beer" || type==="strong" || type==="liquor" || type.startsWith("alc") || type==="alcohol") return en.alcohol;
  return true;
}

function costToday() {
  const a0 = startOfDay(new Date());
  const a1 = new Date(+a0 + 86400000);
  let total = 0;
  for (const e of (state.entries || [])) {
    const t = new Date(e.ts);
    if (t < a0 || t >= a1) continue;
    if (!moduleGuards(e.type)) continue;
    const qty = +e.qty || 1;
    total += qty * priceForType(e.type);
  }
  return Math.max(0, +total.toFixed(2));
}

// Simple “hint” d’économies : si des limites sont définies, on estime
// économies = max(0, (limiteTotale - consoTotale) * prix_moyen)
function economiesHint() {
  const en  = getEnable();
  const lim = (state.settings && state.settings.limits && state.settings.limits.day) || {};
  const a0 = startOfDay(new Date());
  const a1 = new Date(+a0 + 86400000);

  let cig=0, we=0, alc=0, sumCost=0, sumQty=0;
  for (const e of (state.entries || [])) {
    const t = new Date(e.ts);
    if (t < a0 || t >= a1) continue;
    if (!moduleGuards(e.type)) continue;
    const q = +e.qty || 1;
    sumQty  += q;
    sumCost += q * priceForType(e.type);
    if (e.type.startsWith("cig")) cig += q;
    else if (e.type==="weed" || e.type==="joint" || e.type==="joints") we += q;
    else alc += q;
  }

  const limTot =
    (en.cigs    ? (+lim.cigs    || 0) : 0) +
    (en.weed    ? (+lim.weed    || 0) : 0) +
    (en.alcohol ? (+lim.alcohol || 0) : 0);

  if (!limTot) return 0;
  const consoTot = cig + we + alc;
  const avg = sumQty ? (sumCost / sumQty) : 0;
  const eco = Math.max(0, (limTot - consoTot) * avg);
  return +eco.toFixed(2);
}

function updateHeaderCost() {
  const el = document.getElementById("stat-cout-jr");
  if (!el) return;
  el.textContent = costToday().toFixed(2) + "€";
}

function render() {
  updateHeaderCost();
}

export function initEconomy() {
  // premier rendu
  render();
  // expose petite API (facultatif, utile à d'autres modules)
  window.saEconomy = {
    costToday,
    economiesHint
  };
  // écoute
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:settingsSaved", render);
  document.addEventListener("sa:imported", render);
}
