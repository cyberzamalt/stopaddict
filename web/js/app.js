// web/js/app.js
import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initLimits }       from "./limits.js";
import { initCharts }       from "./charts.js";
import { initCalendar }     from "./calendar.js";
import { initEconomy }      from "./economy.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialisations "légères"
  initCounters();
  initSettings();
  initImportExport();
  initStatsHeader();
  initLimits();
  initCalendar();
  initEconomy();

  // --- Lazy init des charts si la section Stats est présente ---
  // Objectif : éviter de calculer/rendre les graphes tant que l'écran Stats n'est pas visible.
  // Si #screen-stats n'existe pas, on tombe en "init immédiat" (comportement d'avant).
  const statsScreen = document.getElementById("screen-stats");
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
    // Fallback (structure différente) : init direct comme avant
    ensureCharts();
  }

  // ======================================================================
  // Sécurisation du flux AVERTISSEMENT 18+ (pas de "validation fantôme")
  // ======================================================================

  // Lecture de l'état "avertissement accepté" depuis le stockage (clé v23)
  function warnAccepted() {
    try {
      const v = JSON.parse(localStorage.getItem("app_warn_v23") || "null");
      return !!(v && v.accepted === true);
    } catch {
      return false;
    }
  }

  // Drapeau interne : "je viens d'ouvrir Ressources depuis la modale 18+"
  let warnCameFromModal = false;

  // Quand on clique le lien "Ressources et numéros utiles" depuis la modale 18+
  // (id à brancher dans le HTML : #open-ressources-from-warn)
  document.getElementById("open-ressources-from-warn")?.addEventListener("click", () => {
    warnCameFromModal = true;
    // NOTE : l'ouverture effective de la page Ressources/modale-page
    // est gérée ailleurs (routeur/modale existants).
  });

  // Bouton "Fermer" de la modale des pages (Ressources, Manuel, etc.)
  // (id à brancher dans le HTML : #btn-page-close)
  document.getElementById("btn-page-close")?.addEventListener("click", () => {
    // On masque la page/modale en cours…
    const page = document.getElementById("modal-page");
    if (page) {
      page.classList.remove("show");
      page.setAttribute("aria-hidden", "true");
    }
    // …et si l'avertissement n'est pas accepté OU qu'on venait de l'avertissement,
    // on ré-ouvre la modale 18+
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

  // Sécurité au clavier (Échap) : si on ferme la page ouverte alors que
  // l'avertissement n'est pas accepté (ou qu'on vient de lui), on le rouvre.
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
});
