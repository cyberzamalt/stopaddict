/* ============================================================
   StopAddict — app.js  (v3, one-shot)
   Rôle : bootstrap appli, navigation, compteurs, onRefresh(),
          intégration Settings & Charts (init/refresh).
   ============================================================ */

(function () {
  "use strict";

  // -------- Aliases vers APIs exposées par state.js / settings.js / charts.js --------
  const StateAPI   = window.StopAddictState   || {};
  const Settings   = window.StopAddictSettings|| {};
  const Charts     = window.StopAddictCharts  || null; // doit fournir init(ctx) + refresh(ctx) si présent

  const {
    saveState,
    rollToToday,
    ensureCoherence,
    persistTodayIntoHistory,
    calculateDayCost,
    todayLocalISO
  } = StateAPI;

  // -------- Helpers DOM --------
  const $  = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // -------- Navigation / pages --------
  const PAGES = ["page-home","page-stats","page-calendar","page-habits","page-settings","debug-section"];
  function showPage(id) {
    PAGES.forEach(pid => {
      const el = $(pid);
      if (!el) return;
      if (pid === id) el.removeAttribute("hidden");
      else el.setAttribute("hidden","hidden");
    });
  }

  // -------- Compteurs (Accueil) --------
  const countersIds = [
    "cigs","weed","alcohol","beer","hard","liqueur"
  ];
  function incCounter(S, key, step = 1) {
    const t = S.today.counters;
    t[key] = Math.max(0, (t[key] || 0) + step);
    saveState(S);
    onRefresh();
  }
  function decCounter(S, key, step = 1) {
    const t = S.today.counters;
    t[key] = Math.max(0, (t[key] || 0) - step);
    saveState(S);
    onRefresh();
  }

  // -------- UI reflection (Accueil/Header/KPIs) --------
  function formatCurrency(S, n) {
    const sym = (S.profile.currency || "EUR") === "EUR" ? "€"
              : (S.profile.currency === "USD" ? "$"
              : (S.profile.currency === "GBP" ? "£" : S.profile.currency));
    const txt = Number(n || 0).toFixed(2);
    return (S.profile.currencyPos === "after") ? `${txt} ${sym}` : `${sym} ${txt}`;
  }

  function reflectHeader(S) {
    const greet = $("greeting");
    const name  = (S.profile && S.profile.name || "").trim();
    greet.textContent = name ? `Salut ${name} !` : "";
  }

  function reflectCounters(S) {
    // Valeurs visibles
    const t = S.today.counters;
    const map = {
      cigs: $("val-cigs"),
      weed: $("val-weed"),
      alcohol: $("val-alcohol"),
      beer: $("val-beer"),
      hard: $("val-hard"),
      liqueur: $("val-liqueur")
    };
    Object.keys(map).forEach(k => {
      if (map[k]) map[k].textContent = String(t[k] || 0);
    });

    // KPIs de la section Accueil
    if ($("kpi-cigs"))     $("kpi-cigs").textContent = String(t.cigs || 0);
    if ($("kpi-weed"))     $("kpi-weed").textContent = String(t.weed || 0);
    if ($("kpi-alcohol"))  $("kpi-alcohol").textContent = String(t.alcohol || 0);
    if ($("kpi-beer"))     $("kpi-beer").textContent = String(t.beer || 0);
    if ($("kpi-hard"))     $("kpi-hard").textContent = String(t.hard || 0);
    if ($("kpi-liqueur"))  $("kpi-liqueur").textContent = String(t.liqueur || 0);

    const cost = calculateDayCost(S);
    if ($("kpi-cost")) $("kpi-cost").textContent = formatCurrency(S, cost);
  }

  // -------- Charts lifecycle (remplace *Stats.renderAll/initStats*) --------
  let chartsInitialized = false;
  function initChartsOnce() {
    if (chartsInitialized) return;
    if (Charts && typeof Charts.init === "function") {
      try {
        Charts.init({ S: window.S, dbg: $("#toggle-debug")?.checked === true });
        chartsInitialized = true;
      } catch (e) {
        console.warn("[app] Charts.init error", e);
      }
    } else {
      // Charts non chargé : on ne bloque pas l’app
      chartsInitialized = true; // évite de tenter à chaque refresh
    }
  }
  function refreshCharts() {
    if (!Charts || typeof Charts.refresh !== "function") return;
    try {
      Charts.refresh({ S: window.S, dbg: $("#toggle-debug")?.checked === true });
    } catch (e) {
      console.warn("[app] Charts.refresh error", e);
    }
  }

  // -------- onRefresh : chaîne unique de rafraîchissement --------
  function onRefresh() {
    const S = window.S;
    if (!S) return;
    // Date du jour (pas d’archivage auto)
    rollToToday(S, { archive: false });
    ensureCoherence(S);

    reflectHeader(S);
    reflectCounters(S);

    // Charts (nouvelle API)
    initChartsOnce();
    refreshCharts();
  }

  // -------- Bind des boutons / nav --------
  function bindNav() {
    if ($("nav-home"))     $("nav-home").onclick = () => showPage("page-home");
    if ($("nav-stats"))    $("nav-stats").onclick = () => { showPage("page-stats"); onRefresh(); };
    if ($("nav-calendar")) $("nav-calendar").onclick = () => showPage("page-calendar");
    if ($("nav-habits"))   $("nav-habits").onclick = () => showPage("page-habits");
    if ($("nav-settings")) $("nav-settings").onclick = () => { showPage("page-settings"); Settings.reflect && Settings.reflect(); };
  }

  function bindCounters(S) {
    // Incrémentations / décrémentations
    countersIds.forEach(k => {
      const inc = $(`ctr-${k}-inc`);
      const dec = $(`ctr-${k}-dec`);
      if (inc) inc.onclick = () => incCounter(S, k, 1);
      if (dec) dec.onclick = () => decCounter(S, k, 1);
    });

    // Reset today
    const resetBtn = $("btn-reset-today");
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (!confirm("Remise à zéro des compteurs du jour ?")) return;
        countersIds.forEach(k => { S.today.counters[k] = 0; });
        saveState(S);
        onRefresh();
      };
    }
  }

  function bindDebug() {
    const tgl = $("toggle-debug");
    if (!tgl) return;
    tgl.onchange = () => {
      // Affiche la page console si coché
      if (tgl.checked) showPage("debug-section");
      onRefresh(); // pour passer dbg aux charts
    };
  }

  // -------- Bootstrap --------
  function boot() {
    // S global prêt
    const S = window.S;
    if (!S) {
      console.error("[app] État global introuvable.");
      return;
    }

    // Nav & événements
    bindNav();
    bindCounters(S);
    bindDebug();

    // Settings : contexte minimal { S, onRefresh }
    if (Settings && typeof Settings.init === "function") {
      Settings.init({ S, onRefresh });
    }

    // Page par défaut
    showPage("page-home");

    // Premier rendu
    onRefresh();
  }

  // -------- Go --------
  document.addEventListener("DOMContentLoaded", boot);
})();
