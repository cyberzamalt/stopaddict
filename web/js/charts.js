// web/js/charts.js — v2.4.3 HYBRIDE FINAL
// Cible les 2 canvas : #chart-consommations (principal) + #chart-cout-eco (secondaire)
// Système de range jour/semaine/mois/année avec boutons dynamiques.
// Gère l'absence de Chart.js gracieusement (fallback sans crash).
// Émet "charts:totals" pour alimenter la bannière Stats.

import { totalsHeader, on } from "./state.js";

export function initCharts() {
  try {
    console.log("[charts.init] ========== STARTING ==========");
    
    // CORRECTION #3 : Utiliser les IDs CORRECTS des canvas (tirets, pas camelCase)
    const canvasMain = document.getElementById("chart-consommations");
    const canvasEco  = document.getElementById("chart-cout-eco");

    console.log("[charts.init] Canvas principal (#chart-consommations) found:", !!canvasMain);
    console.log("[charts.init] Canvas économie (#chart-cout-eco) found:", !!canvasEco);

    if (!canvasMain) {
      console.warn("[charts.init] ⚠️ Canvas #chart-consommations not found - charts disabled");
      return;
    }

    // Boutons de range (jour/semaine/mois/année)
    const rangeBar = document.getElementById("chartRange");
    const buttons  = rangeBar ? Array.from(rangeBar.querySelectorAll(".btn.pill")) : [];
    let currentRange = "day";

    console.log("[charts.init] Found " + buttons.length + " range buttons");

    function setActive(btn) {
      buttons.forEach(b => b.classList.remove("active"));
      btn?.classList.add("active");
    }

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const r = btn.dataset.range || "day";
        currentRange = r;
        setActive(btn);
        console.log("[charts.click] Range changed to: " + r);
        render(r);
      });
    });

    // Calcul des totaux pour une range donnée
    // Utilise totalsHeader() pour chaque jour et additionne
    function getTotalsForRange(range) {
      const today = new Date();
      const sum = { cigs: 0, weed: 0, alcohol: 0 };

      function addDay(d) {
        try {
          const t = totalsHeader?.(d) || {};
          const day = t.day || {};
          sum.cigs    += Number(day.cigs    || 0);
          sum.weed    += Number(day.weed    || 0);
          sum.alcohol += Number(day.alcohol || 0);
        } catch (e) {
          console.warn("[charts.addDay] Error for date " + d, e);
        }
      }

      // Jour : juste aujourd'hui
      if (range === "day") {
        const t = totalsHeader?.(today) || {};
        const d = t.day || {};
        return {
          cigs: Number(d.cigs || 0),
          weed: Number(d.weed || 0),
          alcohol: Number(d.alcohol || 0),
        };
      }

      // Semaine/Mois/Année : somme naïve sur N derniers jours
      const days = range === "week" ? 7 : range === "month" ? 30 : 365;
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        addDay(d);
      }

      console.log("[charts.getTotalsForRange] range=" + range + " totals=", sum);
      return sum;
    }

    // Rendu des graphiques
    let chartMain, chartEco;

    function render(range) {
      try {
        const totals = getTotalsForRange(range);

        // Toujours émettre pour stats.js (bannière)
        window.dispatchEvent(new CustomEvent("charts:totals", {
          detail: { range, totals }
        }));
        console.log("[charts.render] Event 'charts:totals' emitted for range=" + range);

        // Chart.js disponible ?
        const ChartLib = window.Chart;
        if (!ChartLib) {
          console.warn("[charts.render] ⚠️ Chart.js not loaded - skipping render (totals emitted)");
          return;
        }

        // ========================================================================
        // Graphique principal : "Consommations" (barres)
        // ========================================================================
        try {
          const ctx = canvasMain.getContext("2d");
          const data = {
            labels: ["Cigarettes", "Joints", "Alcool"],
            datasets: [{
              label: "Consommations (" + range + ")",
              data: [totals.cigs, totals.weed, totals.alcohol],
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
            }]
          };
          const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
          };

          if (chartMain) chartMain.destroy();
          chartMain = new ChartLib(ctx, { type: "bar", data, options });
          console.log("[charts.render] ✓ Main chart rendered for " + range);
        } catch (e) {
          console.error("[charts.render] Error rendering main chart:", e);
        }

        // ========================================================================
        // Graphique secondaire : "Coût/Économie" (ligne - si canvas existe)
        // ========================================================================
        if (canvasEco && canvasEco.getContext) {
          try {
            const ctx2 = canvasEco.getContext("2d");
            const data2 = {
              labels: ["Coût/Économie (" + range + ")"],
              datasets: [{
                label: "Coût/Économie",
                data: [0], // Placeholder : calcul réel dépendrait des prix
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.1)",
                tension: 0.1,
                fill: true
              }]
            };
            const options2 = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: true } },
              scales: { y: { beginAtZero: true } }
            };

            if (chartEco) chartEco.destroy();
            chartEco = new ChartLib(ctx2, { type: "line", data: data2, options: options2 });
            console.log("[charts.render] ✓ Secondary chart rendered for " + range);
          } catch (e) {
            console.error("[charts.render] Error rendering secondary chart:", e);
          }
        } else {
          console.warn("[charts.render] ⚠️ Canvas #chart-cout-eco not found or invalid");
        }

      } catch (e) {
        console.error("[charts.render] Fatal error:", e);
      }
    }

    // Écoute les changements d'état pour re-render
    on?.("state:changed", () => {
      console.log("[charts] State changed, re-rendering current range...");
      render(currentRange);
    });

    // Premier rendu
    render(currentRange);

    console.log("[charts.init] ========== READY ✓ ==========");
    
  } catch (e) {
    console.error("[charts.init] FATAL ERROR:", e);
    console.error("[charts.init] Stack:", e.stack);
  }
}
