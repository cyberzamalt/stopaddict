/* web/js/stats.js — 2 graphiques + abscisses complètes (Jour/Semaine/Mois/Année) */
import { todayKey } from "./state.js";

const KINDS = ["cigs","joints","beer","hard","liqueur"];
let charts = { qty: null, money: null };
let PERIOD = "day";

/* ---------- utils ---------- */
const $  = (s) => document.querySelector(s);
function rangeDays(start, end){ // [YYYY-MM-DD,...]
  const a=[]; const d=new Date(start); const e=new Date(end);
  while (d <= e){ a.push(todayKey(d)); d.setDate(d.getDate()+1); }
  return a;
}
function ymd(date){ // "YYYY-MM-DD" from Date
  const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,"0"), d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function weekRange(d=new Date()){ // Mon..Sun around d
  const n=new Date(d); const wd=(n.getDay()+6)%7; // 0=Mon
  const s=new Date(n); s.setDate(n.getDate()-wd);
  const e=new Date(s); e.setDate(s.getDate()+6);
  return { start: ymd(s), end: ymd(e) };
}
function monthRange(d=new Date()){
  const s=new Date(d.getFullYear(), d.getMonth(), 1);
  const e=new Date(d.getFullYear(), d.getMonth()+1, 0);
  return { start: ymd(s), end: ymd(e) };
}
function yearRange(d=new Date()){
  const s=new Date(d.getFullYear(),0,1);
  const e=new Date(d.getFullYear(),11,31);
  return { start: ymd(s), end: ymd(e) };
}

/* ---------- labels (abscisses) ---------- */
function labelsFor(period, ref=new Date()){
  if(period==="day")    return ["Nuit","Matin","Après-midi","Soir"];
  if(period==="week")   return ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  if(period==="month")  return Array.from({length:31},(_,i)=>String(i+1));
  if(period==="year")   return ["Jan","Fév","Mar","Avr","Mai","Jui","Jui","Aoû","Sep","Oct","Nov","Déc"];
  return [];
}

/* ---------- binning (répartition) ---------- */
function binIndexFor(period, isoDate, eventTs){
  if(period==="day"){
    const h = eventTs!=null ? new Date(eventTs).getHours() : 12;
    if (h<6) return 0; if (h<12) return 1; if (h<18) return 2; return 3;
  }
  if(period==="week"){
    const d=new Date(isoDate); return (d.getDay()+6)%7; // 0=Mon..6=Sun
  }
  if(period==="month"){
    return Number(isoDate.slice(8,10)) - 1; // 0..30
  }
  if(period==="year"){
    return Number(isoDate.slice(5,7)) - 1; // 0..11
  }
  return 0;
}

/* ---------- data builder ---------- */
function buildData(getState, period=PERIOD){
  const S = getState();
  const labels = labelsFor(period);
  const qty = {
    cigs: Array(labels.length).fill(0),
    joints: Array(labels.length).fill(0),
    beer: Array(labels.length).fill(0),
    hard: Array(labels.length).fill(0),
    liqueur: Array(labels.length).fill(0),
  };
  const money = { cost: Array(labels.length).fill(0), saved: Array(labels.length).fill(0) };

  const todayIso = todayKey(new Date());
  const hist = S.history || {};
  const events = Array.isArray(S.events) ? S.events : [];

  if (period==="day"){
    // Répartition par tranches horaires, si journal dispo (S.events)
    const tsDayStart = new Date(todayIso+"T00:00:00").getTime();
    const tsDayEnd   = new Date(todayIso+"T23:59:59").getTime();
    const dayEvents = events.filter(ev => typeof ev?.ts==="number" && ev.ts>=tsDayStart && ev.ts<=tsDayEnd);

    if (dayEvents.length){
      for (const ev of dayEvents){
        const k = ev.kind;
        if (!KINDS.includes(k)) continue;
        const bin = binIndexFor("day", todayIso, ev.ts);
        const delta = Number(ev.delta||0);
        qty[k][bin] += delta;
      }
      // Argent du jour via history si dispo
      const d = hist[todayIso] || {};
      const b = binIndexFor("day", todayIso, tsDayStart+12*3600e3); // met sur "Après-midi" par défaut
      money.cost[b]  += Number(d.cost||0);
      money.saved[b] += Number(d.saved||0);
    } else {
      // Pas d'évènements → on met les compteurs du jour dans "Après-midi"
      const t = S.today?.counters || {};
      const b = 2;
      qty.cigs[b]    += Number(t.cigs||0);
      qty.joints[b]  += Number(t.joints||0);
      qty.beer[b]    += Number(t.beer||0);
      qty.hard[b]    += Number(t.hard||0);
      qty.liqueur[b] += Number(t.liqueur||0);
      const d = hist[todayIso] || {};
      money.cost[b]  += Number(d.cost||0);
      money.saved[b] += Number(d.saved||0);
    }
    $("#stats-date")?.textContent = new Date().toLocaleDateString("fr-FR");
  }

  else if (period==="week"){
    const {start,end} = weekRange(new Date());
    for (const iso of rangeDays(start,end)){
      const d = hist[iso] || {};
      const b = binIndexFor("week", iso);
      qty.cigs[b]    += Number(d.cigs||0);
      qty.joints[b]  += Number(d.joints||0);
      qty.beer[b]    += Number(d.beer||0);
      qty.hard[b]    += Number(d.hard||0);
      qty.liqueur[b] += Number(d.liqueur||0);
      money.cost[b]  += Number(d.cost||0);
      money.saved[b] += Number(d.saved||0);
    }
    $("#stats-date")?.textContent = `${start.split("-").reverse().join("/")} → ${end.split("-").reverse().join("/")}`;
  }

  else if (period==="month"){
    const {start,end} = monthRange(new Date());
    for (const iso of rangeDays(start,end)){
      const d = hist[iso] || {};
      const b = binIndexFor("month", iso);
      qty.cigs[b]    += Number(d.cigs||0);
      qty.joints[b]  += Number(d.joints||0);
      qty.beer[b]    += Number(d.beer||0);
      qty.hard[b]    += Number(d.hard||0);
      qty.liqueur[b] += Number(d.liqueur||0);
      money.cost[b]  += Number(d.cost||0);
      money.saved[b] += Number(d.saved||0);
    }
    $("#stats-date")?.textContent = new Date().toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
  }

  else if (period==="year"){
    const {start,end} = yearRange(new Date());
    for (const iso of Object.keys(hist)){
      if (iso<start || iso>end) continue;
      const d = hist[iso] || {};
      const b = binIndexFor("year", iso);
      qty.cigs[b]    += Number(d.cigs||0);
      qty.joints[b]  += Number(d.joints||0);
      qty.beer[b]    += Number(d.beer||0);
      qty.hard[b]    += Number(d.hard||0);
      qty.liqueur[b] += Number(d.liqueur||0);
      money.cost[b]  += Number(d.cost||0);
      money.saved[b] += Number(d.saved||0);
    }
    $("#stats-date")?.textContent = new Date().getFullYear();
  }

  return { labels, qty, money };
}

/* ---------- ensure canvases ---------- */
function ensureCanvases(){
  // 1) Quantités (existant)
  const c1 = $("#chart-main");
  // 2) Coûts/Économies (créé si absent)
  let c2 = $("#chart-costs");
  if (!c2){
    const wrap = document.createElement("div");
    wrap.className = "chart-block";
    c2 = document.createElement("canvas");
    c2.id = "chart-costs";
    wrap.appendChild(c2);
    $("#page-stats")?.appendChild(wrap);
  }
  return { c1, c2 };
}

/* ---------- painters ---------- */
function draw(getState, fmtMoneyFn){
  const { labels, qty, money } = buildData(getState, PERIOD);
  const { c1, c2 } = ensureCanvases();
  if (!c1 || !c2 || typeof Chart==="undefined") return;

  // Détruit anciens
  if (charts.qty) charts.qty.destroy();
  if (charts.money) charts.money.destroy();

  // Graphique quantités (5 jeux de barres)
  charts.qty = new Chart(c1.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Cigarettes", data: qty.cigs },
        { label:"Joints",     data: qty.joints },
        { label:"Bière",      data: qty.beer },
        { label:"Alcool fort",data: qty.hard },
        { label:"Liqueur",    data: qty.liqueur },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:"bottom" } },
      scales:{ y:{ beginAtZero:true } }
    }
  });

  // Graphique € (2 jeux)
  charts.money = new Chart(c2.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label:"Coûts",      data: money.cost },
        { label:"Économies",  data: money.saved },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{ position:"bottom" },
        tooltip:{ callbacks:{
          label: (ctx) => {
            const v = Number(ctx.parsed.y||0);
            try { return `${ctx.dataset.label}: ${fmtMoneyFn ? fmtMoneyFn(v) : (v.toFixed(2)+"€")}`; }
            catch { return `${ctx.dataset.label}: ${v.toFixed(2)}€`; }
          }
        }}
      },
      scales:{ y:{ beginAtZero:true } }
    }
  });
}

/* ---------- mount ---------- */
export function mountStats({ getState, fmtMoney }){
  const root = $("#page-stats");
  if (!root || root.dataset.bound==="1") return;
  root.dataset.bound = "1";

  const bind = (id, p) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.addEventListener("click", () => {
      PERIOD = p;
      draw(getState, fmtMoney);
    }, { passive:true });
  };

  bind("btnPeriod-day","day");
  bind("btnPeriod-week","week");
  bind("btnPeriod-month","month");
  bind("btnPeriod-year","year");

  // premier rendu
  PERIOD = "day";
  draw(getState, fmtMoney);
}

/* ---------- auto-expose (optionnel) ---------- */
try { window.StopAddictStats = { mountStats }; } catch {}
