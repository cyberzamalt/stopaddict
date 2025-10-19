// web/js/stats.js
// -------------------------------------------------------------------
// En-tête "Stats" + bannière dans l’écran Stats.
// - Met à jour les KPIs globaux (jour/semaine/mois/coût/économies)
// - Gère les boutons d’échelle (Jour/Semaine/Mois) et notifie charts.js
// - Met à jour la bannière Stats à partir des totaux du graphe si disponibles
//   (écoute "charts:totals"); sinon, retombe sur les totaux du jour.
// -------------------------------------------------------------------
import { $, startOfWeek, startOfMonth } from "./utils.js";
import {
  getDaily,
  totalsHeader,
  ymd,
  on,          // bus: écouter les changements d’état
  emit         // bus: notifier le choix d’échelle
} from "./state.js";

function fmtEuros(x) {
  try {
    return (Number(x) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  } catch {
    return `${Number(x) || 0} €`;
  }
}

// ---------- KPIs header (si présents au-dessus du contenu) ----------
function renderKpiHeader() {
  const th = totalsHeader();
  if (!th) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set("todayTotal",  String(th.todayTotal ?? 0));
  set("weekTotal",   String(th.weekTotal ?? 0));
  set("monthTotal",  String(th.monthTotal ?? 0));
  set("todayCost",   fmtEuros(th.todayCost ?? 0));
  set("economies-amount", fmtEuros(th.economiesAmount ?? 0));
}

// ---------- Bannière dans l’écran Stats ----------
let currentRange = "day"; // "day" | "week" | "month"

function renderStatsBannerFallback() {
  // Fallback si charts.js n’a pas encore envoyé ses totaux : on met le jour courant
  const todayKey = ymd(new Date());
  const d = getDaily(todayKey) || {};
  const cl = Number(d.cigs || 0);
  const j  = Number(d.weed || 0);
  const a  = Number(d.alcohol || 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("stats-titre",  "Aujourd’hui");
  set("stats-clopes", String(cl));
  set("stats-joints", String(j));
  const la = document.getElementById("stats-alcool-line");
  set("stats-alcool", String(a));
  if (la) la.style.display = a > 0 ? "" : "none";
}

function renderStatsBannerFromCharts(payload) {
  // payload = { range, totals: { cigs, weed, alcohol, cost, economies } }
  const r = payload?.range || currentRange;
  const t = payload?.totals || {};
  const titleByRange = { day: "Aujourd’hui", week: "Cette semaine", month: "Ce mois-ci" };

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  document.getElementById("stats-titre") && (document.getElementById("stats-titre").textContent = titleByRange[r] || "Période");
  set("stats-clopes", String(Number(t.cigs || 0)));
  set("stats-joints", String(Number(t.weed || 0)));
  set("stats-alcool", String(Number(t.alcohol || 0)));

  const alLine = document.getElementById("stats-alcool-line");
  if (alLine) alLine.style.display = Number(t.alcohol || 0) > 0 ? "" : "none";
}

// ---------- Boutons d’échelle (Jour/Semaine/Mois) ----------
function wireRangeTabs() {
  const holder = document.getElementById("chartRange");
  if (!holder) return;

  holder.querySelectorAll("button[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      const r = btn.dataset.range || "day";
      if (r === currentRange) return;
      currentRange = r;

      // active visuel
      holder.querySelectorAll("button[data-range]").forEach(b => b.classList.toggle("active", b === btn));

      // notifier charts.js (il écoute "ui:chart-range")
      emit("ui:chart-range", { range: r });
    });
  });
}

// ---------- init ----------
export function initStatsHeader() {
  // KPIs init
  renderKpiHeader();
  // Bannière Stats init (fallback jour)
  renderStatsBannerFallback();
  // Tabs
  wireRangeTabs();

  // Se met à jour à chaque changement d’état
  on("state:changed",  () => { renderKpiHeader(); /* bannière restera pilotée par charts */ });
  on("state:daily",    () => { renderKpiHeader(); });
  on("state:economy",  () => { renderKpiHeader(); });
  on("state:settings", () => { renderKpiHeader(); });

  // Quand charts.js a calculé ses totaux, on met à jour la bannière
  on("charts:totals",  (e) => renderStatsBannerFromCharts(e?.detail));

  // Si on revient sur l’onglet / autre fenêtre a modifié le LS
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderKpiHeader();
  });
  window.addEventListener("storage", () => renderKpiHeader());
}
