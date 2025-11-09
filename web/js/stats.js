/* web/js/stats.js — 2 graphes (Quantités + Coûts/Économies) avec abscisses Jour/Semaine/Mois/Année */

import { loadState, todayKey, fmtMoney } from "./state.js";

const PERIODS = ["day","week","month","year"];
let period = "day";
let chartQty = null;
let chartMoney = null;

const $ = (s, r=document)=> r.querySelector(s);

function getLabels(p, ref=new Date()){
  if (p==="day")   return ["0–6","6–12","12–18","18–24"];
  if (p==="week")  return ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  if (p==="month"){
    const d0 = new Date(ref.getFullYear(), ref.getMonth()+1, 0).getDate();
    return Array.from({length:d0},(_,i)=>String(i+1).padStart(2,"0"));
  }
  if (p==="year")  return ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
  return [];
}

function slotIndexForHour(h){            // pour la vue Jour
  if (h<6)  return 0;  // 0–6
  if (h<12) return 1;  // 6–12
  if (h<18) return 2;  // 12–18
  return 3;            // 18–24
}

function ymd(d){ return todayKey(d); }

function rangeForWeek(d){
  const x = new Date(d);
  const wd = (x.getDay()+6)%7; // Lundi=0
  const start = new Date(x); start.setDate(x.getDate()-wd);
  const days = Array.from({length:7},(_,i)=> ymd(new Date(start.getFullYear(),start.getMonth(),start.getDate()+i)));
  return days;
}

function rangeForMonth(d){
  const x=new Date(d);
  const last = new Date(x.getFullYear(), x.getMonth()+1, 0).getDate();
  return Array.from({length:last},(_,i)=> ymd(new Date(x.getFullYear(),x.getMonth(),i+1)));
}

function rangeForYear(d){
  const x=new Date(d);
  return Array.from({length:12},(_,i)=> ymd(new Date(x.getFullYear(),i,1)));
}

/* ---- Agrégation des données ----
   On lit:
   - S.history[YYYY-MM-DD] pour les totaux / coûts / économies
   - S.events[] (si présent) pour les tranches horaires de la vue Jour
*/
function aggregate(S, p){
  const KINDS = ["cigs","joints","beer","hard","liqueur"];
  const labels = getLabels(p);
  const now = new Date();
  const qty = { cigs:Array(labels.length).fill(0), joints:Array(labels.length).fill(0), beer:Array(labels.length).fill(0), hard:Array(labels.length).fill(0), liqueur:Array(labels.length).fill(0) };
  const money = { cost:Array(labels.length).fill(0), saved:Array(labels.length).fill(0) };

  if (p==="day"){
    // Tranches horaires via journal S.events si disponible
    const today = ymd(now);
    const events = Array.isArray(S.events)? S.events.filter(e=>e?.date===today) : [];
    if (events.length){
      // Chaque évènement contient { ts, kind, delta } (delta=+1/-1)
      events.forEach(e=>{
        if (!KINDS.includes(e.kind)) return;
        const h = new Date(e.ts||Date.now()).getHours();
        const idx = slotIndexForHour(h);
        qty[e.kind][idx] = Math.max(0, (qty[e.kind][idx]||0) + (Number(e.delta)||0));
      });
    } else {
      // fallback: tout dans la tranche “12–18” si pas de journal (lisible mais basique)
      const h = S.history[today]||{};
      qty.cigs[2]=(h.cigs||0); qty.joints[2]=(h.joints||0); qty.beer[2]=(h.beer||0); qty.hard[2]=(h.hard||0); qty.liqueur[2]=(h.liqueur||0);
    }
    // Coûts/économies (total jour) sur la dernière colonne pour rester lisible
    const h = S.history[today]||{};
    money.cost[labels.length-1]  = Number(h.cost||0);
    money.saved[labels.length-1] = Number(h.saved||0);
    return { labels, qty, money };
  }

  if (p==="week"){
    const days = rangeForWeek(now);
    days.forEach((k,idx)=>{
      const h=S.history[k]||{};
      qty.cigs[idx]+=h.cigs||0; qty.joints[idx]+=h.joints||0; qty.beer[idx]+=h.beer||0; qty.hard[idx]+=h.hard||0; qty.liqueur[idx]+=h.liqueur||0;
      money.cost[idx]+=Number(h.cost||0); money.saved[idx]+=Number(h.saved||0);
    });
    return { labels, qty, money };
  }

  if (p==="month"){
    const days = rangeForMonth(now);
    days.forEach((k,idx)=>{
      const h=S.history[k]||{};
      qty.cigs[idx]+=h.cigs||0; qty.joints[idx]+=h.joints||0; qty.beer[idx]+=h.beer||0; qty.hard[idx]+=h.hard||0; qty.liqueur[idx]+=h.liqueur||0;
      money.cost[idx]+=Number(h.cost||0); money.saved[idx]+=Number(h.saved||0);
    });
    return { labels, qty, money };
  }

  if (p==="year"){
    const months = rangeForYear(now);
    months.forEach((k,idx)=>{
      // on somme tous les jours du mois k (via prefix match)
      const monthPrefix = k.slice(0,7); // YYYY-MM
      Object.keys(S.history).forEach(d=>{
        if (d.startsWith(monthPrefix)){
          const h=S.history[d]||{};
          qty.cigs[idx]+=h.cigs||0; qty.joints[idx]+=h.joints||0; qty.beer[idx]+=h.beer||0; qty.hard[idx]+=h.hard||0; qty.liqueur[idx]+=h.liqueur||0;
          money.cost[idx]+=Number(h.cost||0); money.saved[idx]+=Number(h.saved||0);
        }
      });
    });
    return { labels, qty, money };
  }

  return { labels, qty, money };
}

/* ---- Rendu Chart.js ---- */
function drawCharts(){
  const S = loadState();
  const { labels, qty, money } = aggregate(S, period);

  // Détruit anciens graphes
  if (chartQty) chartQty.destroy();
  if (chartMoney) chartMoney.destroy();

  const elQty = $("#chart-qty");
  const elMoney = $("#chart-money");
  if (!elQty || !elMoney || typeof Chart==="undefined") return;

  // Graphe 1 : Quantités (5 courbes)
  chartQty = new Chart(elQty.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label:"Cigarettes", data: qty.cigs, fill:false },
        { label:"Joints",     data: qty.joints, fill:false },
        { label:"Bière",      data: qty.beer, fill:false },
        { label:"Alcool fort",data: qty.hard, fill:false },
        { label:"Liqueur",    data: qty.liqueur, fill:false },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:"index", intersect:false},
      plugins:{ legend:{position:"top"} },
      scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } }
    }
  });

  // Graphe 2 : Coûts & Économies (barres jumelées)
  chartMoney = new Chart(elMoney.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Coût",      data: money.cost },
        { label:"Économies", data: money.saved },
      ]
    },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{position:"top"},
        tooltip:{ callbacks:{
          label:(ctx)=>{
            const S2 = loadState();
            return `${ctx.dataset.label}: ${fmtMoney(Number(ctx.parsed.y)||0, S2.currency)}`;
          }
        }}
      },
      scales:{ y:{ beginAtZero:true } }
    }
  });

  // Affiche la période en en-tête Stats
  const lbl = $("#stats-date");
  if (lbl){
    const now = new Date();
    const f = (d)=> d.toLocaleDateString("fr-FR");
    if (period==="day"){
      lbl.textContent = f(now);
    } else if (period==="week"){
      const days = rangeForWeek(now);
      const a = new Date(days[0]); const z = new Date(days[6]);
      lbl.textContent = `${f(a)} → ${f(z)}`;
    } else if (period==="month"){
      const a = new Date(now.getFullYear(), now.getMonth(), 1);
      const z = new Date(now.getFullYear(), now.getMonth()+1, 0);
      lbl.textContent = `${f(a)} → ${f(z)}`;
    } else {
      lbl.textContent = String(now.getFullYear());
    }
  }
}

/* ---- Mount ---- */
function mountStats(){
  // Boutons période (IDs existants)
  $("#btnPeriod-day")?.addEventListener("click", ()=>{ period="day";  drawCharts(); });
  $("#btnPeriod-week")?.addEventListener("click", ()=>{ period="week"; drawCharts(); });
  $("#btnPeriod-month")?.addEventListener("click", ()=>{ period="month";drawCharts(); });
  $("#btnPeriod-year")?.addEventListener("click", ()=>{ period="year"; drawCharts(); });

  // Premier rendu
  drawCharts();

  // Rerender quand on revient sur l’onglet Stats (si ton app change d’onglet via classes .hide)
  document.querySelector('[data-tab="stats"]')?.addEventListener("click", ()=> drawCharts());
}

// Auto-mount
try{ mountStats(); }catch{}
