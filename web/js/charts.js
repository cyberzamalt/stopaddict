/* ============================================================
   StopAddict v3 — charts.js
   Visualisation et calculs graphiques
   ============================================================ */
(function () {
  "use strict";

  const ctx = document.getElementById("stats-chart");
  if (!ctx) return;

  let chart;

  /* ---------- UTILITAIRES ---------- */
  function colorFor(key) {
    return {
      cigs: "#ff9800",
      joints: "#8bc34a",
      alcohol: "#42a5f5",
      beer: "#90caf9",
      hard: "#1e88e5",
      liqueur: "#1976d2",
      cost: "#ffb300",
      saving: "#4caf50"
    }[key] || "#ccc";
  }

  function getTrancheLabel(i) {
    const ranges = ["0–6h", "6–12h", "12–18h", "18–24h"];
    return ranges[i] || "";
  }

  function mean(arr) {
    const vals = arr.filter(v => Number.isFinite(v));
    return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
  }

  /* ---------- CALCUL DU DISPATCH 24h ---------- */
  function computeTranches(S, key) {
    const today = S.today;
    const total = today.counters[key] || 0;
    // Répartir uniformément sur 24h
    const perTranche = total / 4;
    return [perTranche, perTranche, perTranche, perTranche];
  }

  /* ---------- GRAPHIQUE PRINCIPAL : CONSOMMATION ---------- */
  function renderConsumption(S) {
    const keys = ["cigs","joints","alcohol","beer","hard","liqueur"].filter(k => S.modules[k]);
    const labels = [0,1,2,3].map(getTrancheLabel);

    const datasets = keys.map(k => ({
      label: k,
      data: computeTranches(S, k),
      borderColor: colorFor(k),
      backgroundColor: colorFor(k) + "33",
      fill: true,
      tension: 0.4
    }));

    // Lignes d'objectif (habitudes)
    const goalDatasets = [];
    Object.entries(S.habits.goal).forEach(([k,v])=>{
      if (v && v>0 && S.modules[k]) {
        goalDatasets.push({
          label: `Objectif ${k}`,
          data: Array(4).fill(v),
          borderColor: colorFor(k),
          borderDash: [4,4],
          fill: false
        });
      }
    });

    const data = { labels, datasets: [...datasets, ...goalDatasets] };

    const opt = {
      responsive: true,
      plugins: {
        title: { display: true, text: "Consommation journalière (4 tranches horaires)" },
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: { ticks: { color: "#ccc" }, grid: { color: "#223" } },
        y: {
          beginAtZero: true,
          ticks: { color: "#ccc" },
          grid: { color: "#223" }
        }
      }
    };

    return new Chart(ctx, { type: "line", data, options: opt });
  }

  /* ---------- GRAPHIQUE : COÛTS & ÉCONOMIES ---------- */
  function renderEconomy(S) {
    const labels = Object.keys(S.history).slice(-7); // 7 derniers jours
    const costData = [];
    const savingData = [];

    labels.forEach(date => {
      const day = S.history[date];
      if (!day) return;
      costData.push(day.cost || 0);

      const goals = S.habits.goal;
      const ref = (goals.cigs||0)+(goals.joints||0)+(goals.alcohol||0);
      const act = (day.counters.cigs||0)+(day.counters.joints||0)+(day.counters.alcohol||0);
      const diff = ref>0 ? ref-act : 0;
      const priceAvg = mean(Object.values(S.prices));
      savingData.push(Math.max(0, diff*priceAvg));
    });

    const datasets = [];

    if (costData.some(v=>v>0))
      datasets.push({
        label: "Coût (€)",
        data: costData,
        borderColor: colorFor("cost"),
        backgroundColor: colorFor("cost")+"33",
        fill: true,
        tension: 0.3
      });

    if (savingData.some(v=>v>0))
      datasets.push({
        label: "Économies estimées (€)",
        data: savingData,
        borderColor: colorFor("saving"),
        backgroundColor: colorFor("saving")+"33",
        fill: true,
        tension: 0.3
      });

    const opt = {
      responsive: true,
      plugins: {
        title: { display: true, text: "Coûts & Économies" },
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: { ticks: { color: "#ccc" }, grid: { color: "#223" } },
        y: { beginAtZero: true, ticks: { color: "#ccc" }, grid: { color: "#223" } }
      }
    };

    return new Chart(ctx, { type: "line", data: { labels, datasets }, options: opt });
  }

  /* ---------- RENDER & REFRESH ---------- */
  function refresh() {
    const S = window.S;
    if (!S) return;

    try { chart.destroy(); } catch {}

    // Affichage selon le mode sélectionné
    const modeBtn = document.querySelector("#stats-controls button.active");
    const mode = modeBtn?.dataset?.period || "day";

    if (mode === "day") chart = renderConsumption(S);
    else chart = renderEconomy(S);
  }

  // ---------- Boutons de période ----------
  document.querySelectorAll("#stats-controls button").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelectorAll("#stats-controls button").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      refresh();
    });
  });

  // ---------- API publique ----------
  window.Charts = { refresh };

})();
