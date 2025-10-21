// ============================================================
// stats.js — Statistiques (PHASE 2)
// - Bannière chiffres (jour) + libellé
// - Onglets de plage (jour/semaine/mois/année)
// - 2 graphiques si Chart.js est dispo (fallback sinon)
// - Écoute 'sa:counts-updated' émis par counters.js
// ============================================================

console.log("[stats.js] Module loaded");

// ------------------------------
// Helpers
// ------------------------------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function labelForRange(r) {
  switch (r) {
    case "day": return "Aujourd'hui";
    case "week": return "Cette semaine";
    case "month": return "Ce mois";
    case "year": return "Cette année";
    default: return "Période";
  }
}

function sumCounts(c) { return (c?.c || 0) + (c?.j || 0) + (c?.a || 0); }

// ------------------------------
// État local
// ------------------------------
let currentRange = "day";
let chartsCreated = false;
let chart1 = null;
let chart2 = null;

// ------------------------------
// Bannière / KPIs
// ------------------------------
function refreshBanner(counts) {
  const titre = $("#stats-titre");
  const vC = $("#stats-clopes");
  const vJ = $("#stats-joints");
  const lineA = $("#stats-alcool-line");
  const vA = $("#stats-alcool");

  if (titre) titre.textContent = labelForRange(currentRange);

  if (vC) vC.textContent = String(counts.c || 0);
  if (vJ) vJ.textContent = String(counts.j || 0);

  const hasAlcool = (counts.a || 0) > 0 || lineA; // garder la ligne si elle existe
  if (lineA) lineA.style.display = hasAlcool ? "" : "none";
  if (vA) vA.textContent = String(counts.a || 0);

  // KPIs header (simple: total jour, le reste placeholders PHASE 2)
  const todayTotal = $("#todayTotal");
  if (todayTotal) todayTotal.textContent = String(sumCounts(counts));

  const weekTotal = $("#weekTotal");
  const monthTotal = $("#monthTotal");
  const todayCost = $("#todayCost");
  const eco = $("#economies-amount");

  if (weekTotal) weekTotal.textContent = "—";
  if (monthTotal) monthTotal.textContent = "—";
  if (todayCost) todayCost.textContent = "0 €";
  if (eco) eco.textContent = "0 €";
}

// ------------------------------
// Graphiques (si Chart.js est présent)
// ------------------------------
function drawCharts(counts) {
  // Sécurité si Chart.js absent
  if (typeof window.Chart === "undefined") {
    console.warn("[stats] Chart.js introuvable — graphes ignorés (PHASE 2)");
    return;
  }

  const ctx1 = document.getElementById("chart-consommations");
  const ctx2 = document.getElementById("chart-cout-eco");
  if (!ctx1 || !ctx2) return;

  const labels = ["Cigarettes", "Joints", "Alcool"];
  const dataUnits = [counts.c || 0, counts.j || 0, counts.a || 0];

  // Détruire précédents si existent
  if (chart1) { chart1.destroy(); chart1 = null; }
  if (chart2) { chart2.destroy(); chart2 = null; }

  chart1 = new Chart(ctx1, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Consommations",
        data: dataUnits,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  });

  // PHASE 2: on réutilise les mêmes données comme placeholder
  chart2 = new Chart(ctx2, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Coût / Économies (placeholder)",
        data: dataUnits,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    }
  });

  chartsCreated = true;
}

// ------------------------------
// Onglets de plage (range)
// ------------------------------
function bindRangeTabs() {
  const container = $("#chartRange");
  if (!container) return;
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-range]");
    if (!btn) return;

    const range = btn.getAttribute("data-range");
    if (!range) return;

    // UI active
    $$("#chartRange .btn.pill").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentRange = range;

    // PHASE 2: on utilise les derniers compteurs du jour en attendant l’agrégation
    const counts = lastCountsCache || { c: 0, j: 0, a: 0 };
    refreshBanner(counts);
    drawCharts(counts);
  });
}

// ------------------------------
// Écoute des compteurs
// ------------------------------
let lastCountsCache = null;

function onCountsUpdated(e) {
  const counts = e?.detail?.counts || { c: 0, j: 0, a: 0 };
  lastCountsCache = counts;
  refreshBanner(counts);
  // Redessiner si on est sur l'écran stats (sinon on attend l’ouverture)
  const statsVisible = document.getElementById("ecran-stats")?.classList.contains("show");
  if (statsVisible) drawCharts(counts);
}

// ------------------------------
// Route change (lazy init charts à l’ouverture de Stats)
// ------------------------------
function onRouteChanged(e) {
  const screen = e?.detail?.screen;
  if (screen !== "ecran-stats") return;
  // À l'ouverture, si on a des compteurs, dessiner / redessiner
  const counts = lastCountsCache || { c: 0, j: 0, a: 0 };
  refreshBanner(counts);
  drawCharts(counts);
}

// ------------------------------
// API
// ------------------------------
export function refreshStatsFromCounts(counts) {
  lastCountsCache = counts || { c: 0, j: 0, a: 0 };
  refreshBanner(lastCountsCache);
  // ne force pas le dessin si l'écran n'est pas ouvert
}

export function initStats() {
  console.log("[stats] init…");
  try {
    bindRangeTabs();
    window.addEventListener("sa:counts-updated", onCountsUpdated);
    window.addEventListener("sa:route-changed", onRouteChanged);
    console.log("[stats] ✓ prêt");
  } catch (e) {
    console.error("[stats] init error:", e);
  }
}
