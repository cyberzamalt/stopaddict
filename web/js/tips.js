// Conseils dynamiques minimalistes (toujours quelque chose à afficher)
export function mountTips({ rootSel, stateGetter }) {
  const root = document.querySelector(rootSel);
  if (!root) return;
  root.innerHTML = `<div class="tips-card"><h3>Conseils du jour</h3><div id="tips-list"></div></div>`;
  updateTips(stateGetter());
}

export function updateTips(S) {
  const box = document.getElementById("tips-list");
  if (!box) return;
  const t = [];

  const sum = (S?.today && Object.values(S.today.counters||{}).reduce((a,b)=>a+Number(b||0),0))||0;
  if (sum === 0) t.push("🎯 Journée sans consommation : excellent départ, pense à noter ce qui t’aide.");
  const g = S?.goals||{}, c = S?.today?.counters||{};
  for (const [k,label] of Object.entries({cigs:"cigarettes",joints:"joints",beer:"bières",hard:"alcools forts",liqueur:"liqueurs"})) {
    const vv = Number(c[k]||0), gg = Number(g[k]||0);
    if (gg>0 && vv>gg) t.push(`⚠️ Tu dépasses ton objectif ${label} (${vv}/${gg}). Essaye une pause + eau/respiration 2 min.`);
  }
  const saved = Number((S?.history?.[S?.today?.date||""]||{}).saved||0);
  if (saved>0) t.push(`💶 Déjà ${new Intl.NumberFormat('fr-FR',{style:'currency',currency:S?.currency?.code||'EUR'}).format(saved)} économisés aujourd’hui.`);

  if (t.length===0) t.push("🧭 Fixe des objectifs dans « Habitudes » pour recevoir des conseils adaptés.");
  box.innerHTML = t.slice(0,3).map(s=>`<div class="tip-line">${s}</div>`).join("");
}
