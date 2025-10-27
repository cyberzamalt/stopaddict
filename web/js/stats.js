// ============================================================
// stats.js — KPIs + Range selector (PHASE 2)
// ============================================================
// Met à jour les compteurs de l'écran Stats + le bandeau KPI en haut,
// et notifie charts.js quand l'échelle change.
// Dépendances: state.js (getTotalsForRange, on, emit)
// ============================================================

import { getTotalsForRange, on, emit } from "./state.js";

console.log("[stats.js] Module loaded");

let currentRange = "day";

// ------------------------------------------------------------
// Helpers DOM
// ------------------------------------------------------------
function $(id) { return document.getElementById(id); }
function setText(id, val) { const el = $(id); if (el) el.textContent = String(val); }
function addClass(el, cls){ if (el && el.classList && !el.classList.contains(cls)) el.classList.add(cls); }
function removeClass(el, cls){ if (el && el.classList && el.classList.contains(cls)) el.classList.remove(cls); }

function labelForRange(r){
  if (r === "day") return "Jour";
  if (r === "week") return "Semaine";
  if (r === "month") return "Mois";
  if (r === "year") return "Année";
  return r;
}

// ------------------------------------------------------------
// Header KPIs (au-dessus des écrans)
// ------------------------------------------------------------
function refreshHeaderKPIs(){
  try{
    const tDay   = getTotalsForRange("day");
    const tWeek  = getTotalsForRange("week");
    const tMonth = getTotalsForRange("month");
    const totDay   = (tDay.cigs|0) + (tDay.weed|0) + (tDay.alcohol|0);
    const totWeek  = (tWeek.cigs|0) + (tWeek.weed|0) + (tWeek.alcohol|0);
    const totMonth = (tMonth.cigs|0) + (tMonth.weed|0) + (tMonth.alcohol|0);

    setText("todayTotal", String(totDay));
    setText("weekTotal",  String(totWeek));
    setText("monthTotal", String(totMonth));

    // Coût jour + Économies si l'info existe dans state.js (facultatif)
    const c = (typeof tDay.cost === "number") ? tDay.cost : 0;
    const e = (typeof tDay.economies === "number") ? tDay.economies : 0;
    setText("todayCost", (Math.round(c*100)/100).toString() + " €");
    setText("economies-amount", (Math.round(e*100)/100).toString() + " €");
  }catch(err){
    console.warn("[stats] refreshHeaderKPIs error:", err);
  }
}

// ------------------------------------------------------------
// Stats screen (milieu de page)
// ------------------------------------------------------------
function refreshStatsCenter(range){
  try{
    const totals = getTotalsForRange(range) || {cigs:0, weed:0, alcohol:0};
    const total = (totals.cigs|0) + (totals.weed|0) + (totals.alcohol|0);

    // Bloc KPI vert
    setText("kpi-cigarettes-value", String(totals.cigs|0));
    setText("kpi-joints-value",     String(totals.weed|0));
    setText("kpi-alcohol-value",    String(totals.alcohol|0));

    // Carte agrégée
    setText("summary-card-period-label", "Total " + labelForRange(range));
    setText("summary-card-period-value", String(total));

    // Bannière détaillée
    setText("stats-titre", "Bilan " + labelForRange(range) + " — Total " + total);
    setText("stats-clopes", String(totals.cigs|0));
    setText("stats-joints", String(totals.weed|0));
    setText("stats-alcool", String(totals.alcohol|0));
  }catch(err){
    console.error("[stats] refreshStatsCenter error:", err);
  }
}

// ------------------------------------------------------------
// Range tabs
// ------------------------------------------------------------
function setupRangeTabs(){
  const cont = document.getElementById("chartRange");
  if (!cont) return;

  const btns = cont.querySelectorAll("button[data-range]");
  for (var i=0;i<btns.length;i++){
    (function(btn){
      btn.addEventListener("click", function(){
        const r = btn.getAttribute("data-range") || "day";
        if (r === currentRange) return;

        // Visuel
        for (var j=0;j<btns.length;j++) removeClass(btns[j],"active");
        addClass(btn,"active");

        // État + MAJ UI + notifier charts
        currentRange = r;
        refreshStatsCenter(currentRange);
        emit("sa:range-change", { range: currentRange });
      });
    })(btns[i]);
  }
}

// ------------------------------------------------------------
// Events venant de state.js
// ------------------------------------------------------------
function setupStateListeners(){
  on("sa:counts-updated", function(){
    // Quand les compteurs changent, on recalcule tout
    refreshHeaderKPIs();
    refreshStatsCenter(currentRange);
    // charts.js s'auto-redessinera aussi sur ce même event
  });
}

// ------------------------------------------------------------
// Public
// ------------------------------------------------------------
export function initStats(){
  console.log("[stats.initStats] Starting...");
  try{
    // Range par défaut
    currentRange = "day";

    refreshHeaderKPIs();
    refreshStatsCenter(currentRange);
    setupRangeTabs();
    setupStateListeners();

    // Notifier charts du range initial
    emit("sa:range-change",{ range: currentRange });

    console.log("[stats.initStats] ✓ Ready");
  }catch(e){
    console.error("[stats.initStats] error:", e);
  }
}
