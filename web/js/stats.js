// web/js/stats.js
// -------------------------------------------------------------------
// En-tête "Stats" + bannière dans l'écran Stats.
// - Met à jour les KPIs globaux (jour/semaine/mois/coût/économies)
// - Gère les boutons d'échelle (Jour/Semaine/Mois) et notifie charts.js
// - Met à jour la bannière Stats à partir des totaux du graphe si disponibles
//   (écoute "charts:totals"); sinon, retombe sur les totaux du jour.
// -------------------------------------------------------------------
import { $, startOfWeek, startOfMonth } from "./utils.js";
import {
  getDaily,
  totalsHeader,
  ymd,
  on,          // bus: écouter les changements d'état
  emit         // bus: notifier le choix d'échelle
} from "./state.js";

console.log('[Stats] Module chargé');

function fmtEuros(x) {
  try {
    return (Number(x) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  } catch (e) {
    console.warn('[Stats] fmtEuros erreur:', e);
    return `${Number(x) || 0} €`;
  }
}

// ---------- KPIs header (si présents au-dessus du contenu) ----------
function renderKpiHeader() {
  console.log('[Stats] renderKpiHeader');
  try {
    const th = totalsHeader();
    if (!th) {
      console.warn('[Stats] totalsHeader() retourne null');
      return;
    }
    console.log('[Stats] Totaux header:', th);

    const set = (id, val) => { 
      const el = document.getElementById(id); 
      if (el) {
        el.textContent = val;
        console.log(`[Stats] ${id} = ${val}`);
      }
    };

    set("todayTotal",  String(th.todayTotal ?? 0));
    set("weekTotal",   String(th.weekTotal ?? 0));
    set("monthTotal",  String(th.monthTotal ?? 0));
    set("todayCost",   fmtEuros(th.todayCost ?? 0));
    set("economies-amount", fmtEuros(th.economiesAmount ?? 0));
  } catch (e) {
    console.error('[Stats] renderKpiHeader erreur:', e);
  }
}

// ---------- Bannière dans l'écran Stats ----------
let currentRange = "day"; // "day" | "week" | "month"

function renderStatsBannerFallback() {
  console.log('[Stats] renderStatsBannerFallback (données du jour)');
  try {
    // Fallback si charts.js n'a pas encore envoyé ses totaux : on met le jour courant
    const todayKey = ymd(new Date());
    const d = getDaily(todayKey) || {};
    const cl = Number(d.cigs || 0);
    const j  = Number(d.weed || 0);
    const a  = Number(d.alcohol || 0);

    console.log('[Stats] Bannière fallback:', { clopes: cl, joints: j, alcool: a });

    const set = (id, val) => { 
      const el = document.getElementById(id); 
      if (el) el.textContent = val; 
    };
    set("stats-titre",  "Aujourd'hui");
    set("stats-clopes", String(cl));
    set("stats-joints", String(j));
    const la = document.getElementById("stats-alcool-line");
    set("stats-alcool", String(a));
    if (la) la.style.display = a > 0 ? "" : "none";
  } catch (e) {
    console.error('[Stats] renderStatsBannerFallback erreur:', e);
  }
}

function renderStatsBannerFromCharts(payload) {
  console.log('[Stats] renderStatsBannerFromCharts:', payload);
  try {
    // payload = { range, totals: { cigs, weed, alcohol, cost, economies } }
    const r = payload?.range || currentRange;
    const t = payload?.totals || {};
    const titleByRange = { day: "Aujourd'hui", week: "Cette semaine", month: "Ce mois-ci" };

    const set = (id, val) => { 
      const el = document.getElementById(id); 
      if (el) el.textContent = val; 
    };

    document.getElementById("stats-titre") && (document.getElementById("stats-titre").textContent = titleByRange[r] || "Période");
    set("stats-clopes", String(Number(t.cigs || 0)));
    set("stats-joints", String(Number(t.weed || 0)));
    set("stats-alcool", String(Number(t.alcohol || 0)));

    const alLine = document.getElementById("stats-alcool-line");
    if (alLine) alLine.style.display = Number(t.alcohol || 0) > 0 ? "" : "none";

    console.log('[Stats] Bannière mise à jour depuis charts:', { range: r, totals: t });
  } catch (e) {
    console.error('[Stats] renderStatsBannerFromCharts erreur:', e);
  }
}

// ---------- Boutons d'échelle (Jour/Semaine/Mois) ----------
function wireRangeTabs() {
  console.log('[Stats] wireRangeTabs: initialisation boutons échelle');
  try {
    const holder = document.getElementById("chartRange");
    if (!holder) {
      console.warn('[Stats] #chartRange introuvable');
      return;
    }

    const buttons = holder.querySelectorAll("button[data-range]");
    console.log('[Stats] Boutons échelle trouvés:', buttons.length);

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const r = btn.dataset.range || "day";
        if (r === currentRange) {
          console.log('[Stats] Échelle déjà active:', r);
          return;
        }
        currentRange = r;
        console.log('[Stats] Nouvelle échelle:', r);

        // active visuel
        holder.querySelectorAll("button[data-range]").forEach(b => b.classList.toggle("active", b === btn));

        // notifier charts.js (il écoute "ui:chart-range")
        console.log('[Stats] Émission événement ui:chart-range:', r);
        emit("ui:chart-range", { range: r });
      });
    });
  } catch (e) {
    console.error('[Stats] wireRangeTabs erreur:', e);
  }
}

// ---------- init ----------
export function initStatsHeader() {
  console.log('[Stats] === INITIALISATION ===');
  try {
    // KPIs init
    renderKpiHeader();
    // Bannière Stats init (fallback jour)
    renderStatsBannerFallback();
    // Tabs
    wireRangeTabs();

    // Se met à jour à chaque changement d'état
    console.log('[Stats] Écoute des événements state:*');
    on("state:changed",  () => { 
      console.log('[Stats] Événement state:changed reçu');
      renderKpiHeader(); 
    });
    on("state:daily",    () => { 
      console.log('[Stats] Événement state:daily reçu');
      renderKpiHeader(); 
    });
    on("state:economy",  () => { 
      console.log('[Stats] Événement state:economy reçu');
      renderKpiHeader(); 
    });
    on("state:settings", () => { 
      console.log('[Stats] Événement state:settings reçu');
      renderKpiHeader(); 
    });

    // Quand charts.js a calculé ses totaux, on met à jour la bannière
    console.log('[Stats] Écoute événement charts:totals');
    on("charts:totals",  (e) => {
      console.log('[Stats] Événement charts:totals reçu:', e?.detail);
      renderStatsBannerFromCharts(e?.detail);
    });

    // Si on revient sur l'onglet / autre fenêtre a modifié le LS
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log('[Stats] Page redevenue visible');
        renderKpiHeader();
      }
    });
    window.addEventListener("storage", () => {
      console.log('[Stats] Événement storage reçu');
      renderKpiHeader();
    });

    console.log('[Stats] === INITIALISATION TERMINÉE ===');
  } catch (e) {
    console.error('[Stats] initStatsHeader erreur critique:', e);
  }
}
