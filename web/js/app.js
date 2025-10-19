// web/js/app.js
import { initCounters }     from "./counters.js";
import { initSettings }     from "./settings.js";
import { initImportExport } from "./export.js";
import { initStatsHeader }  from "./stats.js";
import { initLimits }       from "./limits.js";
import { initCharts }       from "./charts.js";
import { initCalendar }     from "./calendar.js";
import { initEconomy }      from "./economy.js";
import { initI18n }         from "./i18n.js";

/**
 * Stockage de l’acceptation 18+
 * Clé : app_warn_v23  => { accepted: boolean, hide: boolean, ts: number }
 */
function getWarnState() {
  try {
    return JSON.parse(localStorage.getItem("app_warn_v23") || "null") || { accepted:false, hide:false };
  } catch { return { accepted:false, hide:false }; }
}
function setWarnState(next) {
  try {
    const v = { ...getWarnState(), ...next, ts: Date.now() };
    localStorage.setItem("app_warn_v23", JSON.stringify(v));
  } catch {}
}
function isWarnAccepted() {
  const v = getWarnState();
  return !!v.accepted;
}

/** Gère uniquement ici la modale 18+ (pas ailleurs) */
function wireWarnModal() {
  const modal = document.getElementById("modal-warn");
  if (!modal) return;

  const chk18   = document.getElementById("chk-warn-18");
  const chkHide = document.getElementById("chk-warn-hide");
  const btnQuit   = document.getElementById("btn-warn-quit");
  const btnCancel = document.getElementById("btn-warn-cancel");
  const btnAccept = document.getElementById("btn-warn-accept");

  // Affiche la modale si pas encore acceptée
  function openWarn() {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    // état initial du bouton
    if (btnAccept) btnAccept.disabled = !(chk18 && chk18.checked);
  }
  function closeWarn() {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  // Activer/désactiver “J’accepte…”
  chk18?.addEventListener("change", () => {
    if (btnAccept) btnAccept.disabled = !chk18.checked;
  });

  // Actions
  btnQuit?.addEventListener("click", () => {
    // On ferme l’app (dans un navigateur ça revient juste à masquer la modale)
    closeWarn();
  });
  btnCancel?.addEventListener("click", () => {
    closeWarn();
  });
  btnAccept?.addEventListener("click", () => {
    setWarnState({ accepted: true, hide: !!(chkHide && chkHide.checked) });
    closeWarn();
  });

  // Première ouverture
  const st = getWarnState();
  if (!st.accepted) {
    openWarn();
  } else {
    // Si accepté & hide, on s’assure qu’elle reste fermée
    closeWarn();
  }

  // Sécurité Échap
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && modal.classList.contains("show")) {
      // Si pas encore accepté, on laisse ouverte
      if (isWarnAccepted()) closeWarn();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // i18n non bloquant (pas d'await)
  try { initI18n?.(); } catch (e) { console.warn("[i18n] init skipped:", e); }

  // Init “légères”
  initCounters();
  initSettings();       // nav + toggles modules (sans gérer la modale 18+)
  initImportExport();
  initStatsHeader();
  initLimits();
  initCalendar();
  initEconomy();

  // Modale 18+ : gérée uniquement ici
  wireWarnModal();

  // Lazy init des charts quand l’écran Stats devient visible
  const statsScreen = document.getElementById("ecran-stats");
  let chartsInitialized = false;
  const ensureCharts = () => {
    if (!chartsInitialized) {
      chartsInitialized = true;
      try { initCharts(); } catch (e) { console.error("[Charts] init error:", e); }
    }
  };
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
    ensureCharts();
  }
});
