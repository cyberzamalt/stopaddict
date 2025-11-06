/* web/js/tips.js — Conseils dynamiques (module optionnel) */

const $ = (s) => document.querySelector(s);

export function mountTips({ rootSel = "#tips-root", stateGetter }) {
  const root = $(rootSel);
  if (!root) return;
  root.innerHTML = `<div class="tips-card"><h3>Conseils</h3><div id="tips-content">—</div></div>`;
  updateTips(stateGetter());
}

export function updateTips(S) {
  const box = $("#tips-content");
  if (!box) return;

  const lines = [];
  const T = S.today?.counters || {};
  const G = S.goals || {};

  // Cigarettes
  if ((T.cigs||0) > 0) {
    if (G.cigs > 0 && T.cigs > G.cigs) lines.push("🚬 Tu dépasses ton objectif cigarettes aujourd'hui.");
    else if (T.cigs > 0) lines.push("🚬 Pense à espacer tes cigarettes ou à réduire d'1 par palier.");
  } else {
    lines.push("✅ Pas de cigarette pour l’instant, continue !");
  }

  // Joints
  if ((T.joints||0) > 0) {
    if (G.joints > 0 && T.joints > G.joints) lines.push("🌿 Tu dépasses ton objectif joints aujourd'hui.");
    else lines.push("🌿 Hydrate-toi et privilégie un environnement calme.");
  } else {
    lines.push("✅ Pas de joint pour l’instant, bien joué.");
  }

  // Alcool
  const alc = (T.beer||0) + (T.hard||0) + (T.liqueur||0);
  const gAlc = (G.beer||0) + (G.hard||0) + (G.liqueur||0);
  if (alc > 0) {
    if (gAlc > 0 && alc > gAlc) lines.push("🍺 Tu as dépassé ton objectif alcool aujourd’hui.");
    else lines.push("🍺 Alterne boisson alcoolisée et eau, mange avant et pendant.");
  } else {
    lines.push("✅ Pas d’alcool consommé à cette heure.");
  }

  // Économie
  const cost = Number((S.history?.[S.today?.date||""]?.cost) || 0);
  const saved = Number((S.history?.[S.today?.date||""]?.saved) || 0);
  if (saved > 0) lines.push(`💶 Économies estimées aujourd'hui : ${saved.toFixed(2)}${S.currency?.symbol||"€"}.`);
  else if (cost > 0) lines.push(`💸 Coût estimé aujourd’hui : ${cost.toFixed(2)}${S.currency?.symbol||"€"}.`);

  box.innerHTML = lines.map(l => `<div class="tip-line">${l}</div>`).join("") || "—";
}
