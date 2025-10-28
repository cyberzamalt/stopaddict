/* web/js/app.js
   — Boot app, nav, date/heure, snackbar/undo, modules — v2.4.4
*/
import { on, undoLast, canUndo } from "./state.js";
import { initCounters } from "./counters.js";

// ✅ Pack 3: outillage commun
import { installGlobalErrorHooks, autoEnableIfRequested } from "./debug.js";
import * as storage from "./storage.js";
// (utils déjà en place, rien à changer ici)

// ----------------------------------------------
// Date / heure (header)
// ----------------------------------------------
function fmtDateFR(d) {
  const jours = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const mois  = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  return jours[d.getDay()] + " " + d.getDate() + " " + mois[d.getMonth()] + " " + d.getFullYear();
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
  } catch (e) { /* noop */ }
}

// ----------------------------------------------
// Navigation écrans (bottom bar)
// ----------------------------------------------
function showScreen(id) {
  const screens = ["ecran-principal","ecran-stats","ecran-calendrier","ecran-habitudes","ecran-params"];
  for (var i=0;i<screens.length;i++) {
    var el = document.getElementById(screens[i]);
    if (el) el.classList.remove("show");
  }
  var tgt = document.getElementById(id);
  if (tgt) tgt.classList.add("show");

  // activer l’onglet
  const tabs = [
    {btn:"nav-principal", scr:"ecran-principal"},
    {btn:"nav-stats", scr:"ecran-stats"},
    {btn:"nav-calendrier", scr:"ecran-calendrier"},
    {btn:"nav-habitudes", scr:"ecran-habitudes"},
    {btn:"nav-params", scr:"ecran-params"}
  ];
  for (var j=0;j<tabs.length;j++){
    var b = document.getElementById(tabs[j].btn);
    if (b) {
      if (tabs[j].scr === id) b.classList.add("actif");
      else b.classList.remove("actif");
    }
  }
}
function setupNav() {
  var map = [
    {btn:"nav-principal", id:"ecran-principal"},
    {btn:"nav-stats", id:"ecran-stats"},
    {btn:"nav-calendrier", id:"ecran-calendrier"},
    {btn:"nav-habitudes", id:"ecran-habitudes"},
    {btn:"nav-params", id:"ecran-params"},
  ];
  for (var i=0;i<map.length;i++){
    (function(cfg){
      var b = document.getElementById(cfg.btn);
      if (!b) return;
      b.addEventListener("click", function(){ showScreen(cfg.id); });
    })(map[i]);
  }
  showScreen("ecran-principal");
}

// ----------------------------------------------
// Snackbar + Undo
// ----------------------------------------------
function setupUndo() {
  var bar = document.getElementById("snackbar");
  var link = document.getElementById("undo-link");
  if (!bar || !link) return;

  function show(msg) {
    bar.textContent = ""; // reset
    bar.innerHTML = (msg || "Action enregistrée") + ' — <a href="#" id="undo-link">Annuler</a>';
    bar.classList.add("show");
    setTimeout(function(){ bar.classList.remove("show"); }, 2500);
    // ré-attacher le listener du lien nouvellement injecté
    var l2 = document.getElementById("undo-link");
    if (l2) l2.addEventListener("click", function(ev){
      ev.preventDefault();
      if (canUndo()) undoLast();
      bar.classList.remove("show");
    });
  }

  on("sa:counts-updated", function(){ show("Action enregistrée"); });
}

// ----------------------------------------------
// Modales 18+ (si présent) + modules optionnels
// ----------------------------------------------
async function bootOptionalModules() {
  // modals (18+)
  try {
    const mod = await import("./modals.js");
    if (mod && typeof mod.initModals === "function") mod.initModals();
  } catch (e) { /* silencieux */ }

  // stats
  try {
    const s = await import("./stats.js");
    if (s && typeof s.initStats === "function") s.initStats();
  } catch (e2) { /* silencieux */ }

  // charts
  try {
    const c = await import("./charts.js");
    if (c && typeof c.initCharts === "function") c.initCharts();
  } catch (e3) { /* silencieux */ }

  // calendrier
  try {
    const cal = await import("./calendar.js");
    if (cal && typeof cal.initCalendar === "function") cal.initCalendar();
  } catch (e4) { /* silencieux */ }
}

// ----------------------------------------------
// Boot
// ----------------------------------------------
function boot() {
  try {
    // ✅ Hooks erreurs + debug auto si demandé
    installGlobalErrorHooks();
    autoEnableIfRequested();

    // Expose outils au besoin pour tests manuels (sans impacter l’app)
    if (!window.SA) window.SA = {};
    window.SA.storage = storage;

    tickClock();
    setInterval(tickClock, 15000); // rafraîchit l’heure
    setupNav();
    setupUndo();
    initCounters();
    bootOptionalModules();
    console.log("[app] ✓ prêt");
  } catch (e) {
    console.error("[app.boot]", e);
    var dbg = document.getElementById("debug-console");
    if (dbg) { dbg.classList.add("show"); dbg.textContent += "\n[boot] " + (e && e.message ? e.message : e); }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
