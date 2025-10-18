// web/js/limits.js
// Conseils dynamiques + rappel des limites
// Lit: state.settings (enable, limits), state.entries (aujourd'hui)
// Met à jour: #conseil-texte (+ petits contrôles: prev/pause facultatifs)

import { state } from "./state.js";
import { startOfDay } from "./utils.js";

let tips = [];
let tipIdx = 0;
let timer = null;
let paused = false;

function todayTotals() {
  const a0 = startOfDay(new Date());
  const a1 = new Date(+a0 + 86400000);
  let c=0, j=0, a=0;
  for (const e of (state.entries || [])) {
    const t = new Date(e.ts);
    if (t < a0 || t >= a1) continue;
    if (e.type==="cig" || e.type==="cig_class" || e.type==="cig_roul" || e.type==="cig_tube") c += (e.qty||1);
    else if (e.type==="weed" || e.type==="joint" || e.type==="joints") j += (e.qty||1);
    else if (e.type==="beer" || e.type==="strong" || e.type==="liquor" || e.type==="alc_biere" || e.type==="alc_fort" || e.type==="alc_liqueur" || e.type==="alcohol") a += (e.qty||1);
  }
  return { cigs:c, weed:j, alcohol:a };
}

function buildTips() {
  const en = (state.settings && state.settings.enable) || {};
  const L  = (state.settings && state.settings.limits && state.settings.limits.day) || {};
  const { cigs, weed, alcohol } = todayTotals();

  const out = [];

  // Modules off → messages spécifiques
  if (en.cigs === false && en.weed === false && en.alcohol === false) {
    out.push("Tous les modules sont désactivés. Active « Je fume / Joints / Je bois » dans Réglages pour suivre tes consommations.");
  } else {
    if (en.cigs === false)    out.push("Le suivi tabac est désactivé. Tu peux l’activer à tout moment depuis Réglages.");
    if (en.weed === false)    out.push("Le suivi cannabis est désactivé. Tu peux l’activer à tout moment depuis Réglages.");
    if (en.alcohol === false) out.push("Le suivi alcool est désactivé. Tu peux l’activer à tout moment depuis Réglages.");
  }

  // Limites (si définies)
  if (en.cigs !== false && +L.cigs > 0) {
    if (cigs === 0) out.push("🎯 Objectif tabac: " + L.cigs + "/jour. Astuce: fixe un créneau sans cigarette (ex: matin).");
    else if (cigs < L.cigs) out.push("👍 Tabac: " + cigs + "/" + L.cigs + " aujourd’hui. Tu es sous la limite, continue !");
    else if (cigs === L.cigs) out.push("⚠️ Tabac: tu viens d’atteindre ta limite journalière (" + L.cigs + ").");
    else out.push("🚨 Tabac: " + cigs + " > " + L.cigs + " aujourd’hui. Pense à une pause longue ou à repousser la prochaine.");
  }

  if (en.weed !== false && +L.weed > 0) {
    if (weed === 0) out.push("🎯 Cannabis: objectif " + L.weed + "/jour. Planifie un soir sur deux sans joint.");
    else if (weed < L.weed) out.push("👍 Cannabis: " + weed + "/" + L.weed + " aujourd’hui. Reste à l’écoute de ton corps.");
    else if (weed === L.weed) out.push("⚠️ Cannabis: limite du jour atteinte (" + L.weed + "). Hydrate-toi, respire.");
    else out.push("🚨 Cannabis: " + weed + " > " + L.weed + " aujourd’hui. Essaie une activité de substitution (marche courte, douche).");
  }

  if (en.alcohol !== false && +L.alcohol > 0) {
    if (alcohol === 0) out.push("🎯 Alcool: objectif " + L.alcohol + " verres/jour. Prévois des boissons sans alcool dans le frigo.");
    else if (alcohol < L.alcohol) out.push("👍 Alcool: " + alcohol + "/" + L.alcohol + " aujourd’hui. Continue à alterner avec de l’eau.");
    else if (alcohol === L.alcohol) out.push("⚠️ Alcool: limite du jour atteinte (" + L.alcohol + ").");
    else out.push("🚨 Alcool: " + alcohol + " > " + L.alcohol + " aujourd’hui. Ralentis maintenant pour mieux récupérer.");
  }

  // Conseils génériques si aucune limite définie
  if (out.length === 0) {
    out.push("Astuce: définis des limites dans Habitudes → Limites consommation/jour pour activer les alertes intelligentes.");
    out.push("Pense à noter les dates clés (réduction/stop) — elles s’affichent dans le calendrier.");
  }

  return out;
}

function renderTip() {
  const el = document.getElementById("conseil-texte");
  if (!el || tips.length === 0) return;
  tipIdx = (tipIdx + tips.length) % tips.length;
  el.textContent = tips[tipIdx];
}

function nextTipAuto() {
  if (paused) return;
  tipIdx = (tipIdx + 1) % tips.length;
  renderTip();
}

function attachControls() {
  const prev  = document.getElementById("adv-prev");
  const pause = document.getElementById("adv-pause");
  prev?.addEventListener("click", ()=>{ tipIdx = (tipIdx - 1 + tips.length) % tips.length; renderTip(); });
  pause?.addEventListener("click", ()=>{
    paused = !paused;
    if (!paused) nextTipAuto();
    pause.textContent = paused ? "▶" : "⏸";
  });
}

function schedule() {
  clearInterval(timer);
  timer = setInterval(nextTipAuto, 6500);
}

function render() {
  tips = buildTips();
  tipIdx = 0;
  renderTip();
  schedule();
}

export function initLimits() {
  attachControls();
  render();
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:settingsSaved", render);
  document.addEventListener("sa:imported", render);
}
