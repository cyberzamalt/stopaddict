// web/js/stats.js
//
// Met à jour le bandeau de l’écran Stats (titre, totaux) et écoute les totaux
// calculés/émis par charts.js via l’événement `charts:totals`.
// Affiche aussi les KPIs rapides si présents en header.
//
// Dépendances : state.js (on, ymd, getTodayTotals, totalsHeader)

import { on, ymd, getTodayTotals, totalsHeader } from "./state.js";

const $ = (sel, root=document) => root.querySelector(sel);

// --------- Bandeau Stats (écran Stats) ----------
function setStatsBanner(range, totals) {
  const now = new Date();
  const titleEl = $("#stats-titre");
  if (titleEl) {
    if (range === "day")   titleEl.textContent = "Aujourd’hui";
    if (range === "week")  titleEl.textContent = "7 derniers jours";
    if (range === "month") titleEl.textContent = "30 derniers jours";
  }
  $("#stats-clopes")  && ($("#stats-clopes").textContent  = String(totals?.cigs ?? 0));
  $("#stats-joints")  && ($("#stats-joints").textContent  = String(totals?.weed ?? 0));
  const alcLine = $("#stats-alcool-line");
  if (alcLine) {
    const alc = Number(totals?.alcohol ?? 0);
    if (alc > 0) {
      alcLine.style.display = "";
      $("#stats-alcool").textContent = String(alc);
    } else {
      alcLine.style.display = "none";
    }
  }
}

// --------- KPIs header (si présents) ----------
function setHeaderKPIs() {
  const today = getTodayTotals(); // { cigs, weed, alcohol, cost }
  // On affiche seulement si les éléments existent dans le DOM
  $("#todayTotal") && ($("#todayTotal").textContent = String((today.cigs||0)+(today.weed||0)+(today.alcohol||0)));
  $("#todayCost")  && ($("#todayCost").textContent  = (Number(today.cost||0)).toFixed(2)+" €");

  // Petits cumul naifs pour "7 j" / "30 j" → on laisse charts.js faire la source de vérité,
  // mais si les éléments existent, on montre au moins le jour.
  // (Les vrais totaux semaine/mois seront poussés par charts.js → charts:totals quand on change d’onglet)
}

// --------- Init ----------
export function initStatsHeader() {
  // Totaux init (fallback : affiche le jour au boot)
  try {
    const t = getTodayTotals();
    setStatsBanner("day", { cigs:t.cigs||0, weed:t.weed||0, alcohol:t.alcohol||0, cost:t.cost||0 });
    setHeaderKPIs();
  } catch(e) {
    console.warn("[stats] init fallback failed:", e);
  }

  // Quand charts.js calcule/rend une vue, il nous envoie ses totaux
  on("charts:totals", ({ detail }) => {
    try {
      setStatsBanner(detail?.range || "day", detail?.totals || {});
    } catch(e) {
      console.error("[stats] charts:totals handler error:", e);
    }
  });

  // Se rafraîchir quand l’état change (au cas où on reste sur l’onglet Jour)
  on("state:changed",  setHeaderKPIs);
  on("state:daily",    setHeaderKPIs);
  on("state:economy",  setHeaderKPIs);
  on("state:settings", setHeaderKPIs);
}
