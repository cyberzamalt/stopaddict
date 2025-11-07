/* Conseils (montage simple + fallback) */
export function mountTips({ rootSel="#tips-root", listSel="#tips-list", stateGetter }){
  const root=document.querySelector(rootSel); if(!root) return;
  const list=document.querySelector(listSel)||root.querySelector("#tips-list");
  if(!list){ const div=document.createElement("div"); div.id="tips-list"; root.appendChild(div); }
}
function computeTips(S){
  const tips=[];
  // Fallback par défaut pour afficher quelque chose
  if(!S) return ["Boire un verre d’eau avant le café.","Sortir 5 minutes pour respirer.","Note rapide : pourquoi je consomme aujourd’hui ?"];
  const anyPrice = (S.prices.cigarette||S.prices.joint||S.prices.beer||S.prices.hard||S.prices.liqueur)>0;
  const anyGoal  = (S.goals.cigs||S.goals.joints||S.goals.beer||S.goals.hard||S.goals.liqueur)>0;
  if(!anyPrice || !anyGoal){
    return ["Renseigne au moins 1 prix et 1 objectif dans Réglages pour des conseils adaptés.","Fixe un mini-objectif pour aujourd’hui (ex: −1 cigarette)."];
  }
  if((S.today?.counters?.cigs||0)>0){ tips.push("Astuce tabac : mâche quelque chose après le repas au lieu d’allumer."); }
  if((S.today?.counters?.beer||0)+(S.today?.counters?.hard||0)+(S.today?.counters?.liqueur||0)>0){ tips.push("Bois un verre d’eau entre deux verres alcoolisés."); }
  if((S.today?.counters?.joints||0)>0){ tips.push("Remplace 1 joint par une marche de 10 minutes aujourd’hui."); }
  if(S.economy?.cumulatedSavings>=5){ tips.push("Récompense : mets 5€ de côté pour un petit plaisir non-addictif."); }
  if(tips.length===0){ tips.push("Fais une pause 3 minutes respiration box (4-4-4-4)."); }
  return tips;
}
export function updateTips(S){
  const list=document.querySelector("#tips-list"); if(!list) return;
  list.innerHTML="";
  computeTips(S).forEach(t=>{
    const d=document.createElement("div"); d.className="tip-line"; d.textContent=t; list.appendChild(d);
  });
}
