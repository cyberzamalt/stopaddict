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

// --- Gestion locale du bandeau 18+ (fail-safe) ---
function getWarnState() {
  try {
    return JSON.parse(localStorage.getItem("app_warn_v23") || "null") || { accepted:false, hideAgain:false };
  } catch { return { accepted:false, hideAgain:false }; }
}
function setWarnState(next) {
  try { localStorage.setItem("app_warn_v23", JSON.stringify(next)); } catch {}
}
function showWarn() {
  const warn = document.getElementById("modal-warn");
  if (warn) { warn.classList.add("show"); warn.setAttribute("aria-hidden","false"); }
}
function hideWarn() {
  const warn = document.getElementById("modal-warn");
  if (warn) { warn.classList.remove("show"); warn.setAttribute("aria-hidden","true"); }
}

function wireWarnModal() {
  const modal = document.getElementById("modal-warn");
  if (!modal) return;

  const chk18   = document.getElementById("chk-warn-18");
  const chkHide = document.getElementById("chk-warn-hide");
  const btnQuit   = document.getElementById("btn-warn-quit");
  const btnCancel = document.getElementById("btn-warn-cancel");
  const btnAccept = document.getElementById("btn-warn-accept");

  // État initial bouton "J'accepte"
  btnAccept?.setAttribute("disabled","true");

  chk18?.addEventListener("change", () => {
    if (chk18.checked) btnAccept?.removeAttribute("disabled");
    else btnAccept?.setAttribute("disabled","true");
  });

  btnAccept?.addEventListener("click", () => {
    if (!chk18?.checked) return;
    const st = getWarnState();
    st.accepted = true;
    st.hideAgain = !!chkHide?.checked;
    setWarnState(st);
    hideWarn();
  });

  btnCancel?.addEventListener("click", () => {
    // On ne valide rien, on garde l'appli bloquée par la modale
    showWarn();
  });

  btnQuit?.addEventListener("click", () => {
    // Dans un webview / PWA : on masque, mais on laisse l’utilisateur fermer
    showWarn();
    alert("Fermez l’application si vous ne souhaitez pas continuer.");
  });

  // Lien "Ressources" → simplement ouvrir la modale pages (géré ailleurs)
  document.getElementById("open-ressources-from-warn")?.addEventListener("click", () => {
    // rien de spécial ici, l'ouverture de la page est gérée par settings / routes
  });
}

function maybeOpenWarnOnStart() {
  const st = getWarnState();
  // Si jamais on n'a pas accepté / ou pas demandé "ne plus réafficher", on ouvre
  if (!st.accepted || !st.hideAgain) {
    showWarn();
  }
}

// --- Lazy init charts (quand l'écran stats devient visible) ---
function lazyInitCharts() {
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
    }, { root: null, threshold: 0.12 });
    io.observe(statsScreen);
  } else {
    ensureCharts();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // i18n non bloquant (ne pas casser le boot si file:// refuse le fetch)
  try { initI18n?.(); } catch (e) { console.warn("[i18n] init skipped:", e); }

  // Initialisations “légères”
  try { initCounters();     } catch(e){ console.error("[initCounters] ", e); }
  try { initSettings();     } catch(e){ console.error("[initSettings] ", e); }
  try { initImportExport(); } catch(e){ console.error("[initImportExport] ", e); }
  try { initStatsHeader();  } catch(e){ console.error("[initStatsHeader] ", e); }
  try { initLimits();       } catch(e){ console.error("[initLimits] ", e); }
  try { initCalendar();     } catch(e){ console.error("[initCalendar] ", e); }
  try { initEconomy();      } catch(e){ console.error("[initEconomy] ", e); }

  // Bandeau 18+ (fail-safe, indépendant des autres modules)
  wireWarnModal();
  maybeOpenWarnOnStart();

  // Graphiques en lazy
  lazyInitCharts();

  // Sécurité clavier (Échap) pour fermeture des “pages” → si 18+ pas accepté, on ré-ouvre
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    const page = document.getElementById("modal-page");
    const wasOpen = !!page && page.classList.contains("show");
    if (wasOpen) {
      page.classList.remove("show");
      page.setAttribute("aria-hidden","true");
    }
    const st = getWarnState();
    if (wasOpen && (!st.accepted || !st.hideAgain)) {
      showWarn();
    }
  });
});
