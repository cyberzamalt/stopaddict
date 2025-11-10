/* web/js/tips.js — Conseils évolutifs (génériques → personnalisés) */
import { fmtMoney, todayKey } from "./state.js";

let _root = null;
let _getState = null;

/* ------ helpers ------ */
const KINDS = ["cigs","joints","beer","hard","liqueur"];

function unitPrice(S, kind){
  const p=S.prices||{}, v=S.variants||{};
  switch(kind){
    case "cigs":
      if(p.cigarette>0) return p.cigarette;
      if(v.classic?.use && v.classic.packPrice>0 && v.classic.cigsPerPack>0) return v.classic.packPrice/v.classic.cigsPerPack;
      if(v.rolled?.use && v.rolled.tobacco30gPrice>0 && v.rolled.cigsPer30g>0) return v.rolled.tobacco30gPrice/v.rolled.cigsPer30g;
      return 0;
    case "joints":
      if(p.joint>0) return p.joint;
      if(v.cannabis?.use && v.cannabis.gramPrice>0 && v.cannabis.gramsPerJoint>0) return v.cannabis.gramPrice*v.cannabis.gramsPerJoint;
      return 0;
    case "beer":    return p.beer>0 ? p.beer : (v.alcohol?.beer?.enabled && v.alcohol.beer.unitPrice>0 ? v.alcohol.beer.unitPrice : 0);
    case "hard":    return p.hard>0 ? p.hard : (v.alcohol?.hard?.enabled && v.alcohol.hard.dosePrice>0 ? v.alcohol.hard.dosePrice : 0);
    case "liqueur": return p.liqueur>0 ? p.liqueur : (v.alcohol?.liqueur?.enabled && v.alcohol.liqueur.dosePrice>0 ? v.alcohol.liqueur.dosePrice : 0);
    default: return 0;
  }
}

function computeCost(S){
  let t=0;
  for(const k of KINDS){
    if(!S.modules?.[k] || !S.today?.active?.[k]) continue;
    t += Number(S.today?.counters?.[k]||0)*unitPrice(S,k);
  }
  return t;
}

function computeSaved(S){
  let s=0;
  for(const k of KINDS){
    const g=Number(S.goals?.[k]||0), a=Number(S.today?.counters?.[k]||0);
    if(g>0 && a<g) s += (g-a)*unitPrice(S,k);
  }
  return s;
}

function daysFromTo(dateStr){
  if(!dateStr) return null;
  const [y,m,d]=dateStr.split("-").map(Number);
  const target = new Date(y,(m||1)-1,d||1);
  const one = 24*3600*1000;
  const t0 = new Date(todayKey());
  return Math.round((target - t0)/one); // négatif = passé
}

function anyPrice(S){
  const p=S.prices||{};
  return (p.cigarette||0)>0 || (p.joint||0)>0 || (p.beer||0)>0 || (p.hard||0)>0 || (p.liqueur||0)>0;
}
function anyGoal(S){
  const g=S.goals||{};
  return (g.cigs||0)>0 || (g.joints||0)>0 || (g.beer||0)>0 || (g.hard||0)>0 || (g.liqueur||0)>0;
}
function someDate(S){
  const d=S.dates||{};
  return Object.values(d).some(x=>!!x);
}

/* ------ tip builder ------ */
function buildTips(S){
  const tips = [];
  const name = (S.profile?.name||"").trim();

  // En-tête amicale
  tips.push({
    title: name ? `Courage ${name} !` : "On progresse pas à pas",
    lines: [
      name
        ? "Chaque clic te rapproche de ton objectif. Tu gères ✌️"
        : "Tu peux utiliser l’app juste en compteur. Les réglages viendront ensuite."
    ]
  });

  // Génériques de base (toujours présents)
  if(!anyGoal(S)){
    tips.push({
      title: "Commence petit",
      lines: ["Fixe 1 objectif léger (par ex. Cigarettes = 5) dans Habitudes."]
    });
  } else {
    // Personnalisation sur objectifs/journée
    for(const k of KINDS){
      if(!S.modules?.[k] || !S.today?.active?.[k]) continue;
      const g = Number(S.goals?.[k]||0);
      if(g>0){
        const a = Number(S.today?.counters?.[k]||0);
        if(a <= g){
          tips.push({ title:"Objectif en cours", lines:[`Encore ${g-a} ${label(k)} avant l’objectif du jour.`] });
        } else {
          tips.push({ title:"Au-dessus de l’objectif", lines:[`+${a-g} ${label(k)} au-delà de la cible. Fais une pause, respire.`] });
        }
      }
    }
  }

  if(!anyPrice(S)){
    tips.push({
      title: "Active les prix",
      lines: ["Renseigne 1 ou 2 prix dans Réglages pour estimer le coût et les économies."]
    });
  } else {
    const cost = computeCost(S);
    const saved = computeSaved(S);
    tips.push({
      title: "Bilan € (aujourd’hui)",
      lines: [
        `Coût estimé : ${fmtMoney(cost,S.currency)}`,
        `Économies potentielles : ${fmtMoney(saved,S.currency)}`
      ]
    });
  }

  if(someDate(S)){
    const d = S.dates||{};
    const items = [
      ["Arrêt global", d.stopGlobal],
      ["Arrêt alcool", d.stopAlcohol],
      ["Clopes (réduction)", d.reduceCigs],
      ["Clopes (objectif arrêt)", d.quitCigsObj],
      ["Joints (réduction)", d.reduceJoints],
      ["Joints (objectif arrêt)", d.quitJointsObj],
      ["Alcool (réduction)", d.reduceAlcohol],
      ["Alcool (objectif arrêt)", d.quitAlcoholObj],
    ].filter(([,val])=>!!val);
    if(items.length){
      const lines = items.slice(0,3).map(([lbl, val])=>{
        const dd = daysFromTo(val);
        if(dd===0) return `${lbl} : c’est aujourd’hui 🎯`;
        return dd>0 ? `${lbl} : J-${dd}` : `${lbl} : J+${Math.abs(dd)}`;
      });
      tips.push({ title:"Repères temporels", lines });
    }
  } else {
    tips.push({
      title: "Pose une date clé",
      lines: ["Choisis une date de réduction/arrêt pour te donner un cap."]
    });
  }

  // Cas alcool global
  if(!!S.modules?.alcohol){
    tips.push({
      title: "Mode Alcool (global)",
      lines: ["Hydrate-toi régulièrement, et pense à noter l’horaire de tes consommations."]
    });
  }

  // Conseil sauvegarde
  tips.push({
    title: "Sauvegarde",
    lines: ["Export JSON régulièrement (Stats/Réglages) pour garder ton historique."]
  });

  return tips;
}

function label(kind){
  switch(kind){
    case "cigs": return "clopes";
    case "joints": return "joints";
    case "beer": return "bières";
    case "hard": return "doses (alcool fort)";
    case "liqueur": return "doses (liqueur)";
    default: return kind;
  }
}

/* ------ rendering ------ */
function render(S){
  if(!_root) return;
  _root.innerHTML = ""; // reset

  const tips = buildTips(S);
  // Un seul bloc carte, plusieurs lignes (comme monolithe minimal)
  const card = document.createElement("div");
  card.className = "tips-card";

  const h3 = document.createElement("h3");
  h3.textContent = "Conseils du jour";
  card.appendChild(h3);

  tips.forEach(t=>{
    const title = document.createElement("div");
    title.className = "tip-line";
    title.style.fontWeight = "600";
    title.textContent = t.title;
    card.appendChild(title);

    (t.lines||[]).forEach(txt=>{
      const line = document.createElement("div");
      line.className = "tip-line";
      line.textContent = txt;
      card.appendChild(line);
    });
  });

  _root.appendChild(card);
}

/* ------ API ------ */
export function mountTips({ rootSel = "#tips-root", stateGetter } = {}){
  _root = document.querySelector(rootSel);
  _getState = typeof stateGetter === "function" ? stateGetter : null;
  const S = _getState ? _getState() : null;
  if(S) render(S);
}

export function updateTips(S){
  // S peut être passé directement, sinon on tente stateGetter
  const st = S || (_getState ? _getState() : null);
  if(st) render(st);
}
