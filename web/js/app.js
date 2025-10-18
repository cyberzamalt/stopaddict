// web/js/app.js
import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initLimits }       from "./limits.js";
import { initCharts }       from "./charts.js";
import { initCalendar }     from "./calendar.js";
import { initEconomy }      from "./economy.js";
import { initI18n }         from "./i18n.js"; // i18n (fr/en) si présent

document.addEventListener("DOMContentLoaded", () => {
  // ===================== INIT DE BASE =====================
  try { initI18n?.(); } catch (e) { console.warn("[i18n] init skipped:", e); }
  initCounters();
  initSettings();
  initImportExport();
  initStatsHeader();
  initLimits();
  initCalendar();
  initEconomy();

  // ===================== NAVIGATION / ROUTER =====================
  const SCREENS = {
    accueil:    "ecran-principal",
    stats:      "ecran-stats",
    cal:        "ecran-calendrier",
    habitudes:  "ecran-habitudes",
  };

  const NAV_BTNS = {
    "ecran-principal":  document.getElementById("nav-principal"),
    "ecran-stats":      document.getElementById("nav-stats"),
    "ecran-calendrier": document.getElementById("nav-calendrier"),
    "ecran-habitudes":  document.getElementById("nav-habitudes"),
    // "nav-params" est géré par settings.js (ouverture de la page/réglages)
  };

  function setActiveNav(screenId) {
    Object.entries(NAV_BTNS).forEach(([sid, btn]) => {
      if (!btn) return;
      btn.classList.toggle("actif", sid === screenId);
    });
  }

  function showScreen(screenId) {
    // Masquer toutes les .ecran et n'afficher que celle demandée
    document.querySelectorAll(".ecran").forEach(el => el.classList.remove("show"));
    const target = document.getElementById(screenId);
    if (target) target.classList.add("show");
    setActiveNav(screenId);

    // Si on arrive sur STATS, on s'assure d'initialiser les charts au besoin
    if (screenId === "ecran-stats") ensureCharts();
  }

  // Liens nav bas
  NAV_BTNS["ecran-principal"]?.addEventListener("click", () => navigateTo("accueil"));
  NAV_BTNS["ecran-stats"]?.addEventListener("click",     () => navigateTo("stats"));
  NAV_BTNS["ecran-calendrier"]?.addEventListener("click",() => navigateTo("cal"));
  NAV_BTNS["ecran-habitudes"]?.addEventListener("click", () => navigateTo("habitudes"));
  document.getElementById("nav-params")?.addEventListener("click", () => {
    // Laisse settings.js gérer l’ouverture (page/modale).
    window.dispatchEvent(new CustomEvent("sa:open:settings"));
  });

  function navigateTo(alias) {
    const id = SCREENS[alias] || SCREENS.accueil;
    // Mettre à jour le hash pour deep-linking (#stats, #cal…)
    const nextHash = `#${alias}`;
    if (location.hash !== nextHash) {
      // Déclenchera hashchange -> showScreen
      location.hash = nextHash;
    } else {
      showScreen(id);
    }
  }

  function applyHashRoute() {
    const raw = (location.hash || "").replace(/^#/, "");
    const alias = SCREENS[raw] ? raw : (Object.prototype.hasOwnProperty.call(SCREENS, raw) ? raw : null);
    if (alias && SCREENS[alias]) {
      showScreen(SCREENS[alias]);
    } else {
      // Valeurs acceptées: #accueil #stats #cal #habitudes
      // Par défaut: accueil
      showScreen(SCREENS.accueil);
      if (!location.hash) history.replaceState(null, "", "#accueil");
    }
  }

  window.addEventListener("hashchange", applyHashRoute);
  applyHashRoute();

  // ===================== LAZY INIT DES CHARTS =====================
  const statsScreen = document.getElementById("ecran-stats");
  let chartsInitialized = false;

  function ensureCharts() {
    if (!chartsInitialized) {
      chartsInitialized = true;
      try { initCharts(); } catch (e) { console.error("[Charts] init error:", e); }
    }
  }

  if (statsScreen && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (ent.isIntersecting) {
          ensureCharts();
          io.disconnect();
          break;
        }
      }
    }, { root: null, threshold: 0.1 });
    io.observe(statsScreen);
  } else {
    // Fallback (si pas d'IO ou pas d'élément) : init direct
    ensureCharts();
  }

  // ===================== MODALE AVERTISSEMENT 18+ =====================
  function warnAccepted() {
    try {
      const v = JSON.parse(localStorage.getItem("app_warn_v23") || "null");
      return !!(v && v.accepted === true);
    } catch {
      return false;
    }
  }

  let warnCameFromModal = false;

  document.getElementById("open-ressources-from-warn")?.addEventListener("click", () => {
    warnCameFromModal = true;
    // L’ouverture de la page “Ressources” est gérée ailleurs (router/modale)
    window.dispatchEvent(new CustomEvent("sa:open:resources"));
  });

  document.getElementById("btn-page-close")?.addEventListener("click", () => {
    const page = document.getElementById("modal-page");
    if (page) {
      page.classList.remove("show");
      page.setAttribute("aria-hidden", "true");
    }
    const mustReopen = !warnAccepted() || warnCameFromModal;
    warnCameFromModal = false;
    if (mustReopen) {
      const warn = document.getElementById("modal-warn");
      if (warn) {
        warn.classList.add("show");
        warn.setAttribute("aria-hidden", "false");
      }
    }
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      const page = document.getElementById("modal-page");
      const wasOpen = !!page && page.classList.contains("show");
      if (wasOpen) {
        page.classList.remove("show");
        page.setAttribute("aria-hidden", "true");
      }
      if (wasOpen && (!warnAccepted() || warnCameFromModal)) {
        warnCameFromModal = false;
        const warn = document.getElementById("modal-warn");
        if (warn) {
          warn.classList.add("show");
          warn.setAttribute("aria-hidden", "false");
        }
      }
    }
  });

  // ===================== PETIT PLUS : CONSOLE DEBUG (5 taps) =====================
  (function setupDebugToggle() {
    const dateEl  = document.getElementById("date-actuelle");
    const dbg     = document.getElementById("debug-console");
    if (!dateEl || !dbg) return;
    let taps = 0, tmr = null;
    dateEl.addEventListener("click", () => {
      taps++;
      clearTimeout(tmr);
      tmr = setTimeout(() => { taps = 0; }, 600);
      if (taps >= 5) {
        taps = 0;
        dbg.classList.toggle("show");
      }
    });
  })();

  // Expose un mini namespace (facultatif, utile pour diag)
  window.SA = window.SA || {};
  window.SA.app = {
    version: "2.4.0-clean",
    ensureCharts,
    navigateTo,
  };
});
