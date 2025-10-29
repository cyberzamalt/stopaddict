/* web/js/app.js
   Boot, nav, horloge, snackbar/undo, branchement modules — v2.4.4
*/
import { on, undoLast, canUndo, emit } from "./state.js";

// ----------------------------------------------
// Date / heure (header)
// ----------------------------------------------
function fmtDateFR(d) {
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()}`;
}
function tickClock() {
  try {
    const now = new Date();
    const elD = document.getElementById("date-actuelle");
    const elH = document.getElementById("heure-actuelle");
    if (elD) elD.textContent = fmtDateFR(now);
    if (elH) {
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      elH.textContent = h + ":" + m;
    }
  } catch {}
}

// ----------------------------------------------
// Navigation écrans (bottom bar)
// ----------------------------------------------
function showScreen(id) {
  const screens = ["ecran-principal","ecran-stats","ecran-calendrier","ecran-habitudes","ecran-params"];
  for (let s of screens) {
    const el = document.getElementById(s);
    if (el) el.classList.remove("show");
  }
  const tgt = document.getElementById(id);
  if (tgt) tgt.classList.add("show");

  const tabs = [
    {btn:"nav-principal", scr:"ecran-principal"},
    {btn:"nav-stats", scr:"ecran-stats"},
    {btn:"nav-calendrier", scr:"ecran-calendrier"},
    {btn:"nav-habitudes", scr:"ecran-habitudes"},
    {btn:"nav-params", scr:"ecran-params"},
  ];
  for (let t of tabs) {
    const b = document.getElementById(t.btn);
    if (!b) continue;
    if (t.scr === id) b.classList.add("actif"); else b.classList.remove("actif");
  }
}
function setupNav() {
  const map = [
    {btn:"nav-principal", id:"ecran-principal"},
    {btn:"nav-stats", id:"ecran-stats"},
    {btn:"nav-calendrier", id:"ecran-calendrier"},
    {btn:"nav-habitudes", id:"ecran-habitudes"},
    {btn:"nav-params", id:"ecran-params"},
  ];
  for (let cfg of map) {
    const b = document.getElementById(cfg.btn);
    if (!b) continue;
    b.addEventListener("click", () => showScreen(cfg.id));
  }
  showScreen("ecran-principal");
}

// ----------------------------------------------
// Snackbar + Undo (écoute l’événement global des compteurs)
// ----------------------------------------------
function setupUndo() {
  const bar = document.getElementById("snackbar");
  if (!bar) return;

  function wireLink() {
    const link = document.getElementById("undo-link");
    if (!link) return;
    link.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (canUndo()) undoLast();
      bar.classList.remove("show");
    });
  }
  function show(msg) {
    bar.innerHTML = (msg || "Action enregistrée") + ' — <a href="#" id="undo-link">Annuler</a>';
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 2500);
    wireLink();
  }
  on("sa:counts-updated", () => show("Action enregistrée"));
}

// ----------------------------------------------
// Debug overlay : 5 clics sur l’en-tête => affiche #debug-console
// ----------------------------------------------
function setupDebugOverlay() {
  const header = document.querySelector(".header");
  if (!header) return;
  let tapCount = 0;
  let timer = null;
  header.addEventListener("click", () => {
    tapCount++;
    clearTimeout(timer);
    timer = setTimeout(() => (tapCount = 0), 800);
    if (tapCount >= 5) {
      const dbg = document.getElementById("debug-console");
      if (dbg) dbg.classList.add("show");
      emit("sa:debug:shown", {});
      tapCount = 0;
    }
  });
}

// ----------------------------------------------
// Boot des modules (import dynamique, ordre maîtrisé)
// ----------------------------------------------
async function bootModules() {
  // 1) Modale 18+ si présente
  try {
    const mod = await import("./modals.js");
    if (mod?.initModals) mod.initModals();
  } catch {}

  // 2) Réglages (source de vérité + écran)
  try {
    const s = await import("./settings.js");
    if (s?.initSettings) await s.initSettings();
  } catch (e) {
    console.warn("[app] settings.js non chargé:", e?.message || e);
  }

  // 3) Compteurs (accueil)
  try {
    const c = await import("./counters.js");
    if (c?.initCounters) c.initCounters();
  } catch (e) {
    console.warn("[app] counters.js non chargé:", e?.message || e);
  }

  // 4) Stats (KPI + commandes export/import)
  try {
    const s2 = await import("./stats.js");
    if (s2?.initStats) s2.initStats();
  } catch (e) {
    console.warn("[app] stats.js non chargé:", e?.message || e);
  }

  // 5) Graphiques
  try {
    const ch = await import("./charts.js");
    if (ch?.initCharts) ch.initCharts();
  } catch (e) {
    console.warn("[app] charts.js non chargé:", e?.message || e);
  }

  // 6) Calendrier
  try {
    const cal = await import("./calendar.js");
    if (cal?.initCalendar) cal.initCalendar();
  } catch (e) {
    console.warn("[app] calendar.js non chargé:", e?.message || e);
  }

  // 7) Habitudes (limites/baselines)
  try {
    const hb = await import("./habits.js");
    if (hb?.initHabits) hb.initHabits();
  } catch (e) {
    console.warn("[app] habits.js non chargé:", e?.message || e);
  }

  // 8) Conseils (rotation + personnalisation)
  try {
    const adv = await import("./advices.js");
    if (adv?.initAdvices) adv.initAdvices();
  } catch (e) {
    console.warn("[app] advices.js non chargé:", e?.message || e);
  }

  // 9) Pages (manuel / CGV / mentions / ressources)
  try {
    const pg = await import("./pages.js");
    if (pg?.initPages) pg.initPages();
  } catch (e) {
    console.warn("[app] pages.js non chargé:", e?.message || e);
  }

  // 10) Router (deeplinks #/stats etc.) si présent
  try {
    const r = await import("./router.js");
    if (r?.initRouter) r.initRouter({ showScreen });
  } catch {}
}

// ----------------------------------------------
// Boot
// ----------------------------------------------
function boot() {
  try {
    tickClock();
    setInterval(tickClock, 15_000);
    setupNav();
    setupUndo();
    setupDebugOverlay();
    bootModules();
    console.log("[app] ✓ prêt");
  } catch (e) {
    console.error("[app.boot]", e);
    const dbg = document.getElementById("debug-console");
    if (dbg) { dbg.classList.add("show"); dbg.textContent += "\n[boot] " + (e?.message || e); }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
