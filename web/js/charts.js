// ============================================================
// charts.js — Graphiques Chart.js via state.js (PHASE 2)
// ============================================================
// Utilise state.js pour données + events.
// Dessine 2 graphes : "Consommations" + "Coût/Économies" (placeholder)
// ============================================================

import { getTotalsForRange, on, emit } from "./state.js";

console.log("[charts.js] Module loaded");

// ============================================================
// Module state
// ============================================================
let currentRange = "day";
let chartMain = null;
let chartEco = null;
const canvases = {
  main: null,
  eco: null,
};

// ============================================================
// Initialisation Canvas
// ============================================================
function setupCanvases() {
  canvases.main = document.getElementById("chart-consommations");
  canvases.eco = document.getElementById("chart-cout-eco");

  console.log("[charts.setupCanvases] Main canvas found:", !!canvases.main);
  console.log("[charts.setupCanvases] Eco canvas found:", !!canvases.eco);

  if (!canvases.main) {
    console.warn("[charts] ⚠️ Canvas #chart-consommations NOT found - charts disabled");
    return false;
  }

  return true;
}

// ============================================================
// Range buttons
// ============================================================
function setupRangeButtons() {
  const rangeBar = document.getElementById("chartRange");
  if (!rangeBar) {
    console.warn("[charts] ⚠️ #chartRange container not found");
    return;
  }

  const buttons = Array.from(rangeBar.querySelectorAll(".btn.pill"));
  console.log("[charts.setupRangeButtons] Found", buttons.length, "buttons");

  if (!buttons.length) {
    console.warn("[charts] ⚠️ No .btn.pill buttons found in #chartRange");
    return;
  }

  function setActive(btn) {
    buttons.forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const r = btn.dataset.range || "day";
      currentRange = r;
      setActive(btn);
      console.log("[charts] Range clicked:", r);
      render(r);
    });
  });

  // Active initial
  setActive(buttons[0]);
  console.log("[charts.setupRangeButtons] ✓ Buttons wired");
}

// ============================================================
// Rendering
// ============================================================
function render(range = "day") {
  try {
    const totals = getTotalsForRange(range);

    // *** Chart.js vérification ***
    if (typeof window.Chart === "undefined") {
      console.warn("[charts.render] ⚠️ Chart.js NOT loaded - skip render");
      emit("charts:totals", { range, totals }); // event même sans graphe
      return;
    }

    console.log("[charts.render] Rendering for range:", range, totals);

    // ========== Graphique principal (Consommations) ==========
    try {
      if (!canvases.main) throw new Error("Main canvas not available");

      const ctx = canvases.main.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D context");

      // Destroy previous
      if (chartMain) {
        try {
          chartMain.destroy();
        } catch (e) {
          console.warn("[charts] Failed to destroy previous main chart:", e);
        }
        chartMain = null;
      }

      const data = {
        labels: ["Cigarettes", "Joints", "Alcool"],
        datasets: [
          {
            label: `Consommations (${range})`,
            data: [totals.cigs, totals.weed, totals.alcohol],
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(75, 192, 75, 0.7)",
              "rgba(255, 193, 7, 0.7)",
            ],
            borderColor: [
              "rgb(255, 99, 132)",
              "rgb(75, 192, 75)",
              "rgb(255, 193, 7)",
            ],
            borderWidth: 1,
          },
        ],
      };

      const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      };

      chartMain = new window.Chart(ctx, {
        type: "bar",
        data,
        options,
      });

      console.log("[charts.render] ✓ Main chart created for range:", range);
    } catch (e) {
      console.error("[charts.render] Error rendering main chart:", e);
    }

    // ========== Graphique secondaire (Coût/Économies placeholder) ==========
    if (canvases.eco) {
      try {
        const ctx2 = canvases.eco.getContext("2d");
        if (!ctx2) throw new Error("Could not get 2D context for eco canvas");

        // Destroy previous
        if (chartEco) {
          try {
            chartEco.destroy();
          } catch (e) {
            console.warn("[charts] Failed to destroy previous eco chart:", e);
          }
          chartEco = null;
        }

        const data2 = {
          labels: ["Coût/Économie (placeholder)"],
          datasets: [
            {
              label: "Coût/Économie",
              data: [0],
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.1)",
              tension: 0.1,
              fill: true,
            },
          ],
        };

        const options2 = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
          },
          scales: {
            y: { beginAtZero: true },
          },
        };

        chartEco = new window.Chart(ctx2, {
          type: "line",
          data: data2,
          options: options2,
        });

        console.log("[charts.render] ✓ Eco chart created for range:", range);
      } catch (e) {
        console.error("[charts.render] Error rendering eco chart:", e);
      }
    }

    // Emit event pour les autres modules (stats.js peut l'utiliser)
    emit("charts:totals", { range, totals });
  } catch (e) {
    console.error("[charts.render] Fatal error:", e);
  }
}

// ============================================================
// State Listeners
// ============================================================
function setupStateListeners() {
  console.log("[charts.setupStateListeners] Subscribing to state events...");

  on("sa:counts-updated", () => {
    console.log("[charts] sa:counts-updated event received, re-rendering...");
    render(currentRange);
  });

  on("sa:settings-updated", () => {
    console.log("[charts] sa:settings-updated event received, re-rendering...");
    render(currentRange);
  });

  on("sa:route-changed", (e) => {
    const screen = e.detail?.screen;
    if (screen === "ecran-stats") {
      console.log("[charts] Route changed to stats, rendering...");
      render(currentRange);
    }
  });

  console.log("[charts.setupStateListeners] ✓ Listeners attached");
}

// ============================================================
// Public API
// ============================================================
export function initCharts() {
  console.log("[charts.initCharts] ========== STARTING ==========");

  try {
    if (!setupCanvases()) {
      console.warn("[charts.initCharts] Canvas setup failed, aborting");
      return;
    }

    setupRangeButtons();
    setupStateListeners();

    // Render initial
    render(currentRange);

    console.log("[charts.initCharts] ========== READY ✓ ==========");
  } catch (e) {
    console.error("[charts.initCharts] FATAL ERROR:", e);
  }
}
