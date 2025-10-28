// web/js/router.js
// Router hash-based pour StopAddict : #/ , #/stats , #/calendar , #/habits , #/params
// - Deep-link direct vers un écran
// - Sync du hash quand on clique la bottom-nav
// - Fallback si app.js n'a pas encore attaché ses listeners (click() sinon toggle direct)

const ROUTES = {
  "/":           "nav-principal",
  "/home":       "nav-principal",
  "/accueil":    "nav-principal",
  "/stats":      "nav-stats",
  "/calendar":   "nav-calendrier",
  "/calendrier": "nav-calendrier",
  "/habits":     "nav-habitudes",
  "/habitudes":  "nav-habitudes",
  "/params":     "nav-params",
  "/settings":   "nav-params",
};

const BTN_TO_SCREEN = {
  "nav-principal":  "ecran-principal",
  "nav-stats":      "ecran-stats",
  "nav-calendrier": "ecran-calendrier",
  "nav-habitudes":  "ecran-habitudes",
  "nav-params":     "ecran-params",
};

function normHash(h = location.hash) {
  let x = (h || "#/").replace(/^#/, "");
  if (!x.startsWith("/")) x = "/" + x;
  // strip query-like junk after route, keep only first segment
  const cut = x.split("?")[0].split("&")[0];
  return cut || "/";
}

function routeToButton(route) {
  return ROUTES[route] || ROUTES["/"];
}

function clickNav(btnId) {
  const btn = document.getElementById(btnId);
  if (btn) {
    // Laisser app.js gérer showScreen si listener déjà attaché
    btn.click?.();
    return true;
  }
  return false;
}

function toggleDirect(screenId) {
  // Fallback si app.js pas encore prêt
  const screens = Object.values(BTN_TO_SCREEN);
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("show");
  });
  const tgt = document.getElementById(screenId);
  if (tgt) tgt.classList.add("show");

  // Activer l'onglet
  Object.keys(BTN_TO_SCREEN).forEach(btnId => {
    const b = document.getElementById(btnId);
    if (!b) return;
    if (BTN_TO_SCREEN[btnId] === screenId) b.classList.add("actif");
    else b.classList.remove("actif");
  });
}

function syncFromHash() {
  const route = normHash();
  const btnId = routeToButton(route);
  if (!clickNav(btnId)) {
    // si pas de listener en place, toggle direct
    toggleDirect(BTN_TO_SCREEN[btnId]);
  }
}

function wireNavHashUpdates() {
  const pairs = [
    ["nav-principal",  "/"],
    ["nav-stats",      "/stats"],
    ["nav-calendrier", "/calendar"],
    ["nav-habitudes",  "/habits"],
    ["nav-params",     "/params"],
  ];
  pairs.forEach(([btnId, r]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      // Mettre à jour le hash pour permettre les deeplinks et l'historique
      const target = "#" + r;
      if (location.hash !== target) location.hash = target;
    }, { passive: true });
  });
}

export function goto(route = "/") {
  const r = normHash("#" + route);
  const target = "#" + r;
  if (location.hash !== target) location.hash = target;
  else syncFromHash();
}

export function initRouter() {
  // Attendre que le DOM et (idéalement) app.js soient prêts
  const start = () => {
    wireNavHashUpdates();
    // sync après que app.js a probablement attaché ses handlers
    setTimeout(syncFromHash, 0);
    window.addEventListener("hashchange", syncFromHash);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

// Auto-boot si chargé en <script type="module" src="./js/router.js">
initRouter();
