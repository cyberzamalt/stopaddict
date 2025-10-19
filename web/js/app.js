// web/js/app.js
// COMPLET v2.4.0-secure - Boot principal sécurisé avec logging DOM
// Rôle: Orchestration centralisée + import dynamique de tous les modules
// Affiche les erreurs directement dans le DOM (bandeau debug en haut)

// ============================================================
// LOGGING DANS LE DOM (visible sur téléphone)
// ============================================================
const debugLogs = [];

function addDebugLog(msg, type = "info") {
  console.log(`[app.debug] [${type}] ${msg}`);
  debugLogs.push({ msg, type, time: new Date().toLocaleTimeString() });
  updateDebugUI();
}

function updateDebugUI() {
  try {
    const dbgBox = document.getElementById("debug-console");
    if (!dbgBox) return;
    
    dbgBox.innerHTML = debugLogs
      .map(log => `<div class="debug-line debug-${log.type}">[${log.time}] ${log.msg}</div>`)
      .join("");
    
    dbgBox.scrollTop = dbgBox.scrollHeight;
  } catch (e) {
    console.error("[app.updateDebugUI] error:", e);
  }
}

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let chartsInitialized = false;
const modules = {};

// ============================================================
// HELPER: Vérifier si 18+ accepté
// ============================================================
function warnAccepted() {
  try {
    const v = JSON.parse(localStorage.getItem("app_warn_v23") || "null");
    return !!(v && v.accepted === true);
  } catch {
    return false;
  }
}

// ============================================================
// ROUTING / NAVIGATION
// ============================================================
const ROUTES = {
  accueil:    "ecran-principal",
  stats:      "ecran-stats",
  cal:        "ecran-calendrier",
  habitudes:  "ecran-habitudes",
};

function showScreen(screenId) {
  try {
    document.querySelectorAll(".ecran").forEach(el => {
      el.classList.remove("show");
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add("show");
      addDebugLog(`Screen shown: ${screenId}`, "nav");
    } else {
      addDebugLog(`Screen NOT found: ${screenId}`, "warn");
    }

    updateNavButtons(screenId);

    if (screenId === "ecran-stats") {
      ensureCharts();
    }
  } catch (e) {
    addDebugLog(`showScreen error: ${e.message}`, "error");
  }
}

function updateNavButtons(screenId) {
  try {
    const map = {
      "ecran-principal":  "nav-principal",
      "ecran-stats":      "nav-stats",
      "ecran-calendrier": "nav-calendrier",
      "ecran-habitudes":  "nav-habitudes",
    };

    document.querySelectorAll(".nav button").forEach(btn => {
      btn.classList.remove("actif");
    });

    const activeBtn = document.getElementById(map[screenId]);
    if (activeBtn) {
      activeBtn.classList.add("actif");
    }
  } catch (e) {
    addDebugLog(`updateNavButtons error: ${e.message}`, "error");
  }
}

function navigateTo(routeAlias) {
  try {
    const screenId = ROUTES[routeAlias];
    if (!screenId) {
      addDebugLog(`Unknown route: ${routeAlias}`, "warn");
      return;
    }

    const newHash = `#${routeAlias}`;
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    } else {
      showScreen(screenId);
    }
  } catch (e) {
    addDebugLog(`navigateTo error: ${e.message}`, "error");
  }
}

function applyRoute() {
  try {
    const hash = (window.location.hash || "").replace(/^#/, "");
    const screenId = ROUTES[hash] || ROUTES.accueil;
    showScreen(screenId);
  } catch (e) {
    addDebugLog(`applyRoute error: ${e.message}`, "error");
  }
}

// ============================================================
// CHARTS LAZY INIT
// ============================================================
function ensureCharts() {
  if (chartsInitialized) return;

  chartsInitialized = true;
  try {
    if (modules.initCharts) {
      addDebugLog("Initializing charts...", "info");
      modules.initCharts();
    } else {
      addDebugLog("initCharts NOT loaded", "warn");
    }
  } catch (e) {
    addDebugLog(`Charts init failed: ${e.message}`, "error");
  }
}

// ============================================================
// MODALE 18+
// ============================================================
function checkAndShowWarnIfNeeded() {
  try {
    const accepted = warnAccepted();
    if (!accepted) {
      const modal = document.getElementById("modal-warn");
      if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        addDebugLog("18+ warning shown", "info");
      }
    }
  } catch (e) {
    addDebugLog(`Warn check error: ${e.message}`, "error");
  }
}

// ============================================================
// DEBUG CONSOLE TOGGLE
// ============================================================
function setupDebugToggle() {
  try {
    const dateEl = document.getElementById("date-actuelle");
    const dbgBox = document.getElementById("debug-console");
    if (!dateEl || !dbgBox) return;

    let taps = 0;
    let timer = null;

    dateEl.addEventListener("click", () => {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => {
        taps = 0;
      }, 600);

      if (taps >= 5) {
        taps = 0;
        dbgBox.classList.toggle("show");
      }
    });
  } catch (e) {
    addDebugLog(`Debug toggle setup error: ${e.message}`, "error");
  }
}

// ============================================================
// PAGE CLOSE
// ============================================================
function handlePageClose() {
  try {
    const btnClose = document.getElementById("btn-page-close");
    if (!btnClose) return;

    btnClose.addEventListener("click", () => {
      const modal = document.getElementById("modal-page");
      if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
      }

      if (!warnAccepted()) {
        const warn = document.getElementById("modal-warn");
        if (warn) {
          warn.classList.add("show");
          warn.setAttribute("aria-hidden", "false");
        }
      }
    });
  } catch (e) {
    addDebugLog(`Page close handler error: ${e.message}`, "error");
  }
}

// ============================================================
// ESCAPE KEY
// ============================================================
function handleEscapeKey() {
  try {
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape") return;

      const page = document.getElementById("modal-page");
      if (page && page.classList.contains("show")) {
        page.classList.remove("show");
        page.setAttribute("aria-hidden", "true");

        if (!warnAccepted()) {
          const warn = document.getElementById("modal-warn");
          if (warn) {
            warn.classList.add("show");
            warn.setAttribute("aria-hidden", "false");
          }
        }
      }
    });
  } catch (e) {
    addDebugLog(`Escape key handler error: ${e.message}`, "error");
  }
}

// ============================================================
// SETUP NAVIGATION
// ============================================================
function setupNavigation() {
  try {
    const navPrincipal = document.getElementById("nav-principal");
    const navStats = document.getElementById("nav-stats");
    const navCal = document.getElementById("nav-calendrier");
    const navHabitudes = document.getElementById("nav-habitudes");
    const navParams = document.getElementById("nav-params");

    if (navPrincipal) {
      navPrincipal.addEventListener("click", () => {
        navigateTo("accueil");
        addDebugLog("Nav: accueil clicked", "nav");
      });
    }

    if (navStats) {
      navStats.addEventListener("click", () => {
        navigateTo("stats");
        addDebugLog("Nav: stats clicked", "nav");
      });
    }

    if (navCal) {
      navCal.addEventListener("click", () => {
        navigateTo("cal");
        addDebugLog("Nav: calendrier clicked", "nav");
      });
    }

    if (navHabitudes) {
      navHabitudes.addEventListener("click", () => {
        navigateTo("habitudes");
        addDebugLog("Nav: habitudes clicked", "nav");
      });
    }

    if (navParams) {
      navParams.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("sa:openSettingsMenu"));
        addDebugLog("Nav: params clicked (event dispatched)", "nav");
      });
    }

    addDebugLog("Navigation wired", "success");
  } catch (e) {
    addDebugLog(`Navigation setup error: ${e.message}`, "error");
  }
}

// ============================================================
// IMPORT DYNAMIQUE DES MODULES (sécurisé)
// ============================================================
async function loadModulesSafe() {
  addDebugLog("Starting module loading...", "info");

  // Liste des modules à charger dans l'ordre
  const moduleList = [
    { name: "initI18n", file: "i18n.js", critical: false },
    { name: "initCounters", file: "counters.js", critical: true },
    { name: "initSettings", file: "settings.js", critical: true },
    { name: "initImportExport", file: "export.js", critical: false },
    { name: "initStatsHeader", file: "stats.js", critical: false },
    { name: "initLimits", file: "limits.js", critical: false },
    { name: "initCalendar", file: "calendar.js", critical: false },
    { name: "initEconomy", file: "economy.js", critical: false },
    { name: "initCharts", file: "charts.js", critical: false },
  ];

  for (const mod of moduleList) {
    try {
      addDebugLog(`Loading ${mod.name} from ${mod.file}...`, "info");
      
      const imported = await import(`./${mod.file}`);
      const initFunc = imported[mod.name];
      
      if (!initFunc || typeof initFunc !== "function") {
        throw new Error(`Export ${mod.name} not found or not a function`);
      }

      modules[mod.name] = initFunc;
      addDebugLog(`✓ ${mod.name} loaded`, "success");

      // Initialiser immédiatement si critique
      if (mod.critical) {
        initFunc();
        addDebugLog(`✓ ${mod.name} initialized`, "success");
      }
    } catch (e) {
      const status = mod.critical ? "CRITICAL" : "WARNING";
      addDebugLog(`✗ ${mod.name}: ${e.message} [${status}]`, "error");
      
      if (mod.critical) {
        addDebugLog(`Cannot continue without ${mod.name}!`, "error");
        throw new Error(`Critical module failed: ${mod.name}`);
      }
    }
  }

  addDebugLog("Module loading complete!", "success");
}

// ============================================================
// BOOT PRINCIPAL (DOMContentLoaded)
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  addDebugLog("========== APP BOOT START ==========", "info");

  try {
    // 1) Charger tous les modules de manière sécurisée
    try {
      await loadModulesSafe();
      addDebugLog("All modules loaded successfully", "success");
    } catch (e) {
      addDebugLog(`Module loading FAILED: ${e.message}`, "error");
      addDebugLog("App is in a broken state. Please check the errors above.", "error");
      return; // Stop boot
    }

    // 2) Setup navigation
    setupNavigation();

    // 3) Setup routing
    window.addEventListener("hashchange", applyRoute);
    applyRoute();
    addDebugLog("Routing setup complete", "success");

    // 4) Charts lazy init (via IntersectionObserver)
    const statsScreen = document.getElementById("ecran-stats");
    if (statsScreen && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) {
            ensureCharts();
            io.disconnect();
            addDebugLog("Charts lazy-loaded (IntersectionObserver)", "success");
            break;
          }
        }
      }, { threshold: 0.1 });
      io.observe(statsScreen);
    } else {
      ensureCharts();
    }

    // 5) Modale 18+
    checkAndShowWarnIfNeeded();

    // 6) Global handlers
    handlePageClose();
    handleEscapeKey();

    // 7) Debug toggle
    setupDebugToggle();

    // 8) Expose namespace global
    window.SA = window.SA || {};
    window.SA.app = {
      version: "2.4.0-secure",
      navigateTo,
      ensureCharts,
      showScreen,
      ROUTES,
      modules,
      debugLogs,
    };

    addDebugLog("========== APP READY ✓ ==========", "success");
  } catch (e) {
    addDebugLog(`CRITICAL ERROR: ${e.message}`, "error");
    addDebugLog("App boot failed. Check debug console.", "error");
  }
});
