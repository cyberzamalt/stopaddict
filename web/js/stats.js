// ============================================================
// stats.js — PHASE 2 Option B — Agrégations réelles + 2 graphes
// Bannière Stats + Range tabs (jour/semaine/mois/année)
// Graphe Consommations (barres) + Graphe Coût/Économies (ligne/barres)
// ============================================================

console.log("[stats.js] Module loaded");

const LS_TODAY = "sa:today:v1";
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ============================================================
// HELPERS — Gestion localStorage & dates
// ============================================================

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateKeyForDate(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readDayData(dateKey) {
  try {
    const raw = localStorage.getItem(LS_TODAY);
    if (!raw) return { c: 0, j: 0, a: 0 };
    const t = JSON.parse(raw);
    if (t.date !== dateKey) return { c: 0, j: 0, a: 0 };
    return { c: t.c | 0, j: t.j | 0, a: t.a | 0 };
  } catch (e) {
    console.warn("[stats.readDayData] Error reading " + dateKey, e);
    return { c: 0, j: 0, a: 0 };
  }
}

// ============================================================
// AGRÉGATIONS — getTotalsForRange
// ============================================================

function getTotalsForRange(range, today = new Date()) {
  try {
    const now = new Date(today);
    const sum = { cigs: 0, weed: 0, alcohol: 0 };

    function addDay(date) {
      try {
        const key = dateKeyForDate(date);
        const day = readDayData(key);
        sum.cigs += Number(day.c || 0);
        sum.weed += Number(day.j || 0);
        sum.alcohol += Number(day.a || 0);
      } catch (e) {
        console.warn("[stats.addDay] Error for date " + date, e);
      }
    }

    // Jour : aujourd'hui uniquement
    if (range === "day") {
      addDay(now);
      console.log("[stats.getTotals] day totals: c=" + sum.cigs + " j=" + sum.weed + " a=" + sum.alcohol);
      return sum;
    }

    // Semaine : 7 derniers jours (rolling)
    if (range === "week") {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        addDay(d);
      }
      console.log("[stats.getTotals] week totals: c=" + sum.cigs + " j=" + sum.weed + " a=" + sum.alcohol);
      return sum;
    }

    // Mois : 30 derniers jours (rolling)
    if (range === "month") {
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        addDay(d);
      }
      console.log("[stats.getTotals] month totals: c=" + sum.cigs + " j=" + sum.weed + " a=" + sum.alcohol);
      return sum;
    }

    // Année : 365 derniers jours (rolling)
    if (range === "year") {
      for (let i = 0; i < 365; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        addDay(d);
      }
      console.log("[stats.getTotals] year totals: c=" + sum.cigs + " j=" + sum.weed + " a=" + sum.alcohol);
      return sum;
    }

    console.warn("[stats.getTotals] Unknown range: " + range);
    return sum;
  } catch (e) {
    console.error("[stats.getTotals] Fatal error:", e);
    return { cigs: 0, weed: 0, alcohol: 0 };
  }
}

// ============================================================
// BANNIÈRE — Mise à jour des chiffres Stats
// ============================================================

function refreshBanner(totals, range = "day") {
  try {
    const labelMap = {
      day: "Aujourd'hui",
      week: "Semaine en cours",
      month: "Mois en cours",
      year: "Année en cours"
    };
    const label = labelMap[range] || "—";

    const titre = $("#stats-titre");
    const clopes = $("#stats-clopes");
    const joints = $("#stats-joints");
    const alcool = $("#stats-alcool");
    const lineAlc = $("#stats-alcool-line");

    if (titre) titre.textContent = label;
    if (clopes) clopes.textContent = String(totals.cigs || 0);
    if (joints) joints.textContent = String(totals.weed || 0);
    if (alcool) alcool.textContent = String(totals.alcohol || 0);
    
    // Visibilité ligne alcool (cohérence)
    if (lineAlc) lineAlc.style.display = (totals.alcohol > 0) ? "" : "";

    console.log("[stats.refreshBanner] Updated for " + range);
  } catch (e) {
    console.warn("[stats.refreshBanner] Error:", e);
  }
}

// ============================================================
// GRAPHES — Consommations (barres)
// ============================================================

let chartConsumptions = null;

function drawConsumptionsChart(totals) {
  try {
    const canvas = $("#chart-consommations");
    if (!canvas) {
      console.warn("[stats.drawConsumptions] Canvas #chart-consommations not found");
      return;
    }

    // Chart.js disponible ?
    const ChartLib = window.Chart;
    if (!ChartLib) {
      console.warn("[stats.drawConsumptions] Chart.js not loaded - skipping");
      return;
    }

    try {
      const ctx = canvas.getContext("2d");
      const data = {
        labels: ["Cigarettes", "Joints", "Alcool"],
        datasets: [
          {
            label: "Unités",
            data: [totals.cigs || 0, totals.weed || 0, totals.alcohol || 0],
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(75, 192, 75, 0.7)",
              "rgba(255, 193, 7, 0.7)"
            ],
            borderColor: [
              "rgb(255, 99, 132)",
              "rgb(75, 192, 75)",
              "rgb(255, 193, 7)"
            ],
            borderWidth: 1
          }
        ]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 }
          }
        }
      };

      // Destroy ancien graphe
      if (chartConsumptions) {
        chartConsumptions.destroy();
        chartConsumptions = null;
      }

      chartConsumptions = new ChartLib(ctx, {
        type: "bar",
        data: data,
        options: options
      });

      console.log("[stats.drawConsumptions] Chart rendered successfully");
    } catch (e) {
      console.error("[stats.drawConsumptions] Error creating chart:", e);
    }
  } catch (e) {
    console.error("[stats.drawConsumptions] Fatal error:", e);
  }
}

// ============================================================
// GRAPHES — Coût/Économies (placeholder ou réel si prices)
// ============================================================

let chartCost = null;

function drawCostChart(totals) {
  try {
    const canvas = $("#chart-cout-eco");
    if (!canvas) {
      console.warn("[stats.drawCost] Canvas #chart-cout-eco not found");
      return;
    }

    // Chart.js disponible ?
    const ChartLib = window.Chart;
    if (!ChartLib) {
      console.warn("[stats.drawCost] Chart.js not loaded - skipping");
      return;
    }

    try {
      const ctx = canvas.getContext("2d");

      // Essayer de lire les prix depuis settings (si dispo)
      // Fallback : utiliser les unités comme placeholder
      let costData = [totals.cigs || 0, totals.weed || 0, totals.alcohol || 0];
      let costLabel = "Unités (placeholder)";

      try {
        const settingsRaw = localStorage.getItem("sa:settings:v1");
        if (settingsRaw) {
          const settings = JSON.parse(settingsRaw);
          const prices = settings.prices || {};
          if (prices.cigs && prices.weed && prices.alcohol) {
            costData = [
              (totals.cigs || 0) * (prices.cigs || 1),
              (totals.weed || 0) * (prices.weed || 1),
              (totals.alcohol || 0) * (prices.alcohol || 1)
            ];
            costLabel = "Coût (€)";
            console.log("[stats.drawCost] Using prices from settings");
          }
        }
      } catch (e) {
        console.warn("[stats.drawCost] Could not read prices, using placeholder:", e);
      }

      const data = {
        labels: ["Cigarettes", "Joints", "Alcool"],
        datasets: [
          {
            label: costLabel,
            data: costData,
            borderColor: "rgba(75, 192, 192, 1)",
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderWidth: 2,
            tension: 0.1,
            fill: true
          }
        ]
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      };

      // Destroy ancien graphe
      if (chartCost) {
        chartCost.destroy();
        chartCost = null;
      }

      chartCost = new ChartLib(ctx, {
        type: "line",
        data: data,
        options: options
      });

      console.log("[stats.drawCost] Chart rendered successfully (" + costLabel + ")");
    } catch (e) {
      console.error("[stats.drawCost] Error creating chart:", e);
    }
  } catch (e) {
    console.error("[stats.drawCost] Fatal error:", e);
  }
}

// ============================================================
// ÉVÉNEMENTS — Changement de range (onglets)
// ============================================================

function handleRangeChange(range) {
  try {
    console.log("[stats.rangeChange] Switching to: " + range);

    // Recalculer totaux pour cette période
    const totals = getTotalsForRange(range);

    // Mettre à jour bannière
    refreshBanner(totals, range);

    // Re-draw graphes
    drawConsumptionsChart(totals);
    drawCostChart(totals);

    console.log("[stats.rangeChange] Complete for " + range);
  } catch (e) {
    console.error("[stats.rangeChange] Error:", e);
  }
}

function bindRangeTabs() {
  try {
    const wrap = $("#chartRange");
    if (!wrap) {
      console.warn("[stats.bindRangeTabs] #chartRange not found");
      return;
    }

    // Ajouter listener au conteneur
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn.pill");
      if (!btn) return;

      const range = btn.getAttribute("data-range") || "day";

      // Marquer actif
      $$(".btn.pill", wrap).forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Recalculer et redessiner
      handleRangeChange(range);
    });

    console.log("[stats.bindRangeTabs] Listeners attached");
  } catch (e) {
    console.warn("[stats.bindRangeTabs] Error:", e);
  }
}

// ============================================================
// INITIALISATION
// ============================================================

export function initStats() {
  try {
    console.log("[stats.init] ========== STARTING ==========");

    // Câbler les onglets range
    bindRangeTabs();

    // Affichage initial (jour)
    const today = getTotalsForRange("day");
    refreshBanner(today, "day");
    drawConsumptionsChart(today);
    drawCostChart(today);

    // Écouter les mises à jour des compteurs
    document.addEventListener("sa:counts-updated", (e) => {
      try {
        console.log("[stats] Received sa:counts-updated");
        
        // Quel onglet est actif ?
        const activeBtn = $("#chartRange .btn.pill.active");
        const range = activeBtn ? activeBtn.getAttribute("data-range") : "day";

        // Recalculer et redessiner pour la période actuelle
        handleRangeChange(range);
      } catch (err) {
        console.warn("[stats] Error handling counts-updated:", err);
      }
    });

    // Initialiser onglet "Jour" comme actif
    const dayBtn = $("#chartRange .btn.pill[data-range='day']");
    if (dayBtn) {
      $$(".btn.pill", $("#chartRange")).forEach(b => b.classList.remove("active"));
      dayBtn.classList.add("active");
    }

    console.log("[stats.init] ========== READY ✓ ==========");
  } catch (e) {
    console.error("[stats.init] FATAL ERROR:", e);
    console.error("[stats.init] Stack:", e.stack);
  }
}
