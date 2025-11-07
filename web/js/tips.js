/* web/js/tips.js — Conseils contextuels (toujours présents, puis affinés) */

let ROOT = null;
let GET_STATE = () => ({});

/* ---------- Helpers ---------- */

function todayKey(d = new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

// Prix unitaire minimal (utilise les prix simples si disponibles)
function unitPrice(S, kind){
  const p = S?.prices || {};
  switch(kind){
    case "cigs":    return Number(p.cigarette||0);
    case "joints":  return Number(p.joint||0);
    case "beer":    return Number(p.beer||0);
    case "hard":    return Number(p.hard||0);
    case "liqueur": return Number(p.liqueur||0);
    default: return 0;
  }
}

function fmtMoney(n, cur=S?.currency){
  const sym = cur?.symbol ?? "€";
  const pos = cur?.position ?? "after";
  const v = (Number(n)||0).toFixed(2).replace(".",",");
  return pos==="before" ? `${sym}${v}` : `${v}${sym}`;
}

/* ---------- Génération de conseils ---------- */

function baseTips(){
  return [
    { icon:"🕒", text:"Repousse l’envie de 10 minutes, puis 10 de plus." },
    { icon:"🚶", text:"Fais 5 minutes de marche ou d’étirements." },
    { icon:"💧", text:"Bois un grand verre d’eau." },
    { icon:"🫁", text:"Respiration 4-7-8 : 4s inspire, 7s bloque, 8s expire." },
    { icon:"🪥", text:"Brosse-toi les dents ou mâche un chewing-gum." },
    { icon:"✍️", text:"Note l’envie (heure, contexte, intensité)." },
  ];
}

function contextualTips(S){
  const tips = [];

  // Récap objectif / progression
  const kinds = ["cigs","joints","beer","hard","liqueur"];
  const labels = { cigs:"cigarettes", joints:"joints", beer:"bières", hard:"alcools forts", liqueur:"liqueurs" };

  kinds.forEach(k=>{
    if (!S.modules?.[k]) return;
    const goal = Number(S.goals?.[k]||0);
    const val  = Number(S.today?.counters?.[k]||0);
    if (goal>0){
      if (val<goal){
        const rest = goal - val;
        tips.push({icon:"🎯", text:`Objectif ${labels[k]} : il t’en reste ${rest} pour aujourd’hui.`});
      } else if (val===goal){
        tips.push({icon:"✅", text:`Objectif ${labels[k]} atteint pour aujourd’hui — bravo !`});
      } else {
        tips.push({icon:"🔁", text:`Tu as dépassé l’objectif ${labels[k]} de ${val-goal}. Pause et reset possible demain.`});
      }
    }
  });

  // Coût du jour (approx. via prix simples)
  try{
    const cost = kinds.reduce((s,k)=> s + (Number(S.today?.counters?.[k]||0)*unitPrice(S,k)), 0);
    if (cost>0) tips.push({icon:"💶", text:`Coût estimé aujourd’hui : ${fmtMoney(cost, S.currency)}.`});
  }catch{}

  // Dates clés (arrêts/étapes)
  const D = S.dates || {};
  const today = todayKey();
  const praise = [];
  [["stopGlobal","arrêt global"],["stopCigs","arrêt clopes"],["stopJoints","arrêt joints"],["stopAlcohol","arrêt alcool"]]
    .forEach(([key,label])=>{
      const iso = D[key]; if (!iso) return;
      if (iso <= today) praise.push(label);
    });
  if (praise.length){
    tips.push({icon:"🏁", text:`Étapes déjà posées : ${praise.join(", ")} — tiens le cap.`});
  }

  // Journée clean
  const sum = kinds.reduce((s,k)=> s + Number(S.today?.counters?.[k]||0), 0);
  if (sum===0) tips.push({icon:"🌟", text:"Journée clean pour l’instant. Continue comme ça !"});

  return tips;
}

/* ---------- Rendu ---------- */

function render(S){
  if (!ROOT) return;
  ROOT.innerHTML = ""; // reset
  const wrap = document.createElement("div");
  wrap.className = "tips-card";

  const h3 = document.createElement("h3");
  h3.textContent = "Conseils du jour";
  wrap.appendChild(h3);

  const list = document.createElement("div");

  // Toujours au moins 1–2 conseils génériques
  const tips = [...baseTips().slice(0,2), ...contextualTips(S)];

  if (!tips.length){
    const line = document.createElement("div");
    line.className = "tip-line";
    line.textContent = "Fixe des objectifs dans « Habitudes » pour recevoir des conseils adaptés.";
    list.appendChild(line);
  } else {
    tips.forEach(t=>{
      const line = document.createElement("div");
      line.className = "tip-line";
      line.textContent = `${t.icon} ${t.text}`;
      list.appendChild(line);
    });
  }

  wrap.appendChild(list);
  ROOT.appendChild(wrap);
}

/* ---------- API ---------- */

export function mountTips({ rootSel="#tips-root", stateGetter } = {}){
  ROOT = document.querySelector(rootSel);
  GET_STATE = typeof stateGetter==="function" ? stateGetter : ()=>({});

  if (!ROOT) return;
  try { render(GET_STATE()); } catch {}
}

export function updateTips(S){
  try { render(S || GET_STATE()); } catch {}
}
