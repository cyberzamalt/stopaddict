/* web/js/app.js — Orchestrateur StopAddict (ES module)
   - State centralisé via state.js (load/save/migration)
   - Age-gate 18+
   - Onglets (Accueil, Stats, Calendrier, Habitudes, Réglages)
   - Accueil : +/−, (dés)activation per-module
   - Réglages : devise, modules, prix, variantes, RAZ, import/export (via settings.js si dispo)
   - Habitudes : objectifs + dates clés
   - Stats : Chart.js + périodes (jour/semaine/mois/année) + export CSV/JSON + import JSON
   - Debug overlay (copie et purge)
   - i18n (optionnel) via i18n.js si présent (charge web/i18n/*.json)
*/

import {
  LS_KEY, LS_AGE,
  DefaultState, loadState, saveState,
  todayKey, fmtMoney
} from './state.js';

// Essayons d’importer settings.js (exclusivité alcool gérée dedans). Sinon fallback interne.
let mountSettings = null;
try {
  const mod = await import('./settings.js');
  if (typeof mod?.mountSettings === 'function') {
    mountSettings = mod.mountSettings;
  }
} catch { /* pas grave, fallback plus bas */ }

// i18n optionnel
let I18N = null;
try {
  const mod = await import('./i18n.js');
  if (typeof mod?.initI18n === 'function') {
    I18N = mod;
  }
} catch { /* ok si absent */ }

/* =========================================
   Sélecteurs & utilitaires de base
   ========================================= */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function download(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================================
   État global
   ========================================= */
let S = loadState();

/* =========================================
   Debug overlay
   ========================================= */
const dbg = {
  push(msg, type = "info") {
    const line = `[${new Date().toLocaleTimeString()}] [${type}] ${msg}`;
    S.debug.logs.push(line);
    if (S.debug.logs.length > 500) S.debug.logs.shift();
    const box = $("#debug-console");
    if (box && !box.classList.contains("hide")) {
      const div = document.createElement("div");
      div.className = "debug-line";
      div.textContent = line;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
    }
  },
  clear() {
    S.debug.logs = [];
    const box = $("#debug-console");
    if (box) box.innerHTML = "";
  },
  copy() {
    navigator.clipboard?.writeText(S.debug.logs.join("\n")).catch(()=>{});
  }
};

/* =========================================
   Age Gate 18+
   ========================================= */
function initAgeGate() {
  const ack = localStorage.getItem(LS_AGE);
  const dlg = $("#agegate");
  const btn = $("#btn-age-accept");
  const cb18 = $("#age-18plus");
  const cbHide = $("#age-hide");

  if (!dlg || !btn || !cb18) return;

  const close = () => { dlg.close?.(); dlg.classList.add("hide"); };
  const open  = () => { try { dlg.showModal?.(); } catch {} dlg.classList.remove("hide"); };

  if (ack === "1") {
    close();
  } else {
    open();
    btn.disabled = true;
    cb18.addEventListener("change", () => { btn.disabled = !cb18.checked; });
    btn.addEventListener("click", () => {
      if (cb18.checked) {
        if (cbHide.checked) localStorage.setItem(LS_AGE, "1");
        close();
      }
    });
  }
}

/* =========================================
   Onglets
   ========================================= */
const PAGES = {
  home:     "#page-home",
  stats:    "#page-stats",
  calendar: "#page-calendar",
  habits:   "#page-habits",
  settings: "#page-settings"
};

function showTab(id) {
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  if (id === "stats") renderChart();
}

function initTabs() {
  $$("#tabs .tab").forEach(btn => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
}

/* =========================================
   Accueil : compteurs +/− et activation
   ========================================= */
const KINDS = ["cigs","joints","beer","hard","liqueur"];

function reflectCounters() {
  $("#val-cigs").textContent    = S.today.counters.cigs ?? 0;
  $("#val-joints").textContent  = S.today.counters.joints ?? 0;
  $("#val-beer").textContent    = S.today.counters.beer ?? 0;
  $("#val-hard").textContent    = S.today.counters.hard ?? 0;
  $("#val-liqueur").textContent = S.today.counters.liqueur ?? 0;

  const setDisabled = (id, on) => {
    const el = $(id);
    if (!el) return;
    el.style.opacity = on ? "0.55" : "1";
    el.style.pointerEvents = on ? "none" : "auto";
  };
  setDisabled("#ctr-cigs",    !S.today.active.cigs || !S.modules.cigs);
  setDisabled("#ctr-joints",  !S.today.active.joints || !S.modules.joints);
  setDisabled("#ctr-beer",    !S.today.active.beer || !S.modules.beer);
  setDisabled("#ctr-hard",    !S.today.active.hard || !S.modules.hard);
  setDisabled("#ctr-liqueur", !S.today.active.liqueur || !S.modules.liqueur);
}

function initCounters() {
  $$("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.kind;
      const action = btn.dataset.action;
      if (!KINDS.includes(kind)) return;

      if (!S.modules[kind] || !S.today.active[kind]) return;

      const cur = Number(S.today.counters[kind] || 0);
      const next = action === "inc" ? cur + 1 : Math.max(0, cur - 1);
      S.today.counters[kind] = next;

      persistTodayIntoHistory();
      reflectCounters();
      updateHeader();
      renderChart(_period);
      saveState();
      dbg.push(`Counter ${kind} -> ${next}`, "event");
    });
  });

  const mapChk = {
    cigs:   "#chk-cigs-active",
    joints: "#chk-joints-active",
    beer:   "#chk-beer-active",
    hard:   "#chk-hard-active",
    liqueur:"#chk-liqueur-active",
  };
  for (const k of KINDS) {
    const el = $(mapChk[k]);
    if (el) {
      el.checked = !!S.today.active[k];
      el.addEventListener("change", () => {
        S.today.active[k] = el.checked;
        reflectCounters();
        saveState();
      });
    }
  }

  reflectCounters();
}

/* =========================================
   Coûts & économies (unitPrice, cost, saved)
   ========================================= */
function unitPrice(kind) {
  const p = S.prices;
  const v = S.variants;

  switch (kind) {
    case "cigs":
      if (p.cigarette > 0) return p.cigarette;
      if (v.classic.use && v.classic.packPrice > 0 && v.classic.cigsPerPack > 0) {
        return v.classic.packPrice / v.classic.cigsPerPack;
      }
      if (v.rolled.use && v.rolled.tobacco30gPrice > 0 && v.rolled.cigsPer30g > 0) {
        return v.rolled.tobacco30gPrice / v.rolled.cigsPer30g;
      }
      return 0;
    case "joints":
      if (p.joint > 0) return p.joint;
      if (v.cannabis.use && v.cannabis.gramPrice > 0 && v.cannabis.gramsPerJoint > 0) {
        return v.cannabis.gramPrice * v.cannabis.gramsPerJoint;
      }
      return 0;
    case "beer":
      if (p.beer > 0) return p.beer;
      if (v.alcohol.beer.enabled && v.alcohol.beer.unitPrice > 0) return v.alcohol.beer.unitPrice;
      return 0;
    case "hard":
      if (p.hard > 0) return p.hard;
      if (v.alcohol.hard.enabled && v.alcohol.hard.dosePrice > 0) return v.alcohol.hard.dosePrice;
      return 0;
    case "liqueur":
      if (p.liqueur > 0) return p.liqueur;
      if (v.alcohol.liqueur.enabled && v.alcohol.liqueur.dosePrice > 0) return v.alcohol.liqueur.dosePrice;
      return 0;
  }
  return 0;
}

function computeCost(counters = S.today.counters) {
  let total = 0;
  for (const k of KINDS) {
    if (!S.modules[k]) continue;
    if (!S.today.active[k]) continue;
    const up = unitPrice(k);
    total += (Number(counters[k] || 0) * up);
  }
  return total;
}

function computeSaved(counters = S.today.counters) {
  let saved = 0;
  for (const k of KINDS) {
    const g = Number(S.goals[k] || 0);
    const a = Number(counters[k] || 0);
    if (g > 0 && a < g) saved += (g - a) * unitPrice(k);
  }
  return saved;
}

function updateHeader() {
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");
  $("#hdr-cigs").textContent   = S.today.counters.cigs ?? 0;
  $("#hdr-joints").textContent = S.today.counters.joints ?? 0;
  $("#hdr-alcohol").textContent= (S.today.counters.beer + S.today.counters.hard + S.today.counters.liqueur) || 0;

  const cost = computeCost();
  const saved = computeSaved();
  $("#hdr-cost").textContent   = fmtMoney(cost, S.currency);
  $("#hdr-saved").textContent  = fmtMoney(saved, S.currency);

  const badge = $("#hdr-status");
  const sum = KINDS.reduce((s,k)=>s+(S.today.counters[k]||0),0);
  badge.textContent = sum === 0 ? "✓" : "•";
  badge.style.background = sum === 0 ? "#124232" : "#1f2b48";
}

/* =========================================
   Historique
   ========================================= */
function persistTodayIntoHistory() {
  const key = todayKey();
  if (S.today.date !== key) {
    // On “clôture” la veille
    S.history[S.today.date] = {
      ...S.today.counters,
      cost: computeCost(S.today.counters),
      saved: computeSaved(S.today.counters),
    };
    S.today.date = key;
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
  }
  // Miroir live
  S.history[key] = {
    ...S.today.counters,
    cost: computeCost(S.today.counters),
    saved: computeSaved(S.today.counters),
  };
}

/* =========================================
   Stats (Chart.js) + Export/Import
   ========================================= */
let chart;
let _period = "day";

function fmtDate(iso) {
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function dateRangeFor(period, refDate = new Date()) {
  const d = new Date(refDate);
  const start = new Date(d);
  const end = new Date(d);
  if (period === "week") {
    const wd = (d.getDay() + 6) % 7; // ISO (lundi=0)
    start.setDate(d.getDate() - wd);
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start.setDate(1);
    end.setMonth(d.getMonth()+1, 0);
  } else if (period === "year") {
    start.setMonth(0,1);
    end.setMonth(11,31);
  }
  return { start: todayKey(start), end: todayKey(end) };
}

function renderChart(period = _period) {
  persistTodayIntoHistory();
  const canvas = $("#chart-main");
  if (!canvas || typeof Chart === "undefined") return;

  const labels = ["Cigarettes","Joints","Bière","Alcool fort","Liqueur","Coût","Économies"];
  let counters = { cigs:0,joints:0,beer:0,hard:0,liqueur:0, cost:0, saved:0 };

  const now = new Date();
  const todayStr = todayKey(now);

  if (period === "day") {
    const d = S.history[todayStr] || {};
    counters = {
      cigs: d.cigs||0, joints:d.joints||0, beer:d.beer||0, hard:d.hard||0, liqueur:d.liqueur||0,
      cost:d.cost||0, saved:d.saved||0
    };
    $("#stats-date").textContent = new Date().toLocaleDateString("fr-FR");
  } else {
    const range = dateRangeFor(period, now);
    for (const k of Object.keys(S.history)) {
      if (k >= range.start && k <= range.end) {
        const d = S.history[k] || {};
        counters.cigs += d.cigs||0;
        counters.joints += d.joints||0;
        counters.beer += d.beer||0;
        counters.hard += d.hard||0;
        counters.liqueur += d.liqueur||0;
        counters.cost += d.cost||0;
        counters.saved += d.saved||0;
      }
    }
    $("#stats-date").textContent = `${fmtDate(range.start)} → ${fmtDate(range.end)}`;
  }

  const data = [
    counters.cigs, counters.joints, counters.beer, counters.hard, counters.liqueur,
    Number(counters.cost || 0), Number(counters.saved || 0)
  ];

  if (chart) chart.destroy();
  chart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Valeurs", data }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero:true } },
      plugins: {
        legend: { display:false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const i = ctx.dataIndex;
              return (i >= 5)
                ? `${labels[i]}: ${fmtMoney(ctx.parsed.y, S.currency)}`
                : `${labels[i]}: ${ctx.parsed.y}`;
            }
          }
        }
      }
    }
  });
}

function initStats() {
  $("#btnPeriod-day")?.addEventListener("click", ()=>{ _period="day"; renderChart(); });
  $("#btnPeriod-week")?.addEventListener("click", ()=>{ _period="week"; renderChart(); });
  $("#btnPeriod-month")?.addEventListener("click", ()=>{ _period="month"; renderChart(); });
  $("#btnPeriod-year")?.addEventListener("click", ()=>{ _period="year"; renderChart(); });

  // Export CSV (historique complet)
  $("#btn-export-csv")?.addEventListener("click", () => {
    const rows = [["date","cigs","joints","beer","hard","liqueur","cost","saved"]];
    const keys = Object.keys(S.history).sort();
    for (const k of keys) {
      const d = S.history[k] || {};
      rows.push([
        k, d.cigs||0, d.joints||0, d.beer||0, d.hard||0, d.liqueur||0,
        (d.cost||0).toFixed(2), (d.saved||0).toFixed(2)
      ]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    download("stopaddict_stats.csv", csv, "text/csv");
    dbg.push("Export CSV ok", "ok");
  });

  // Export JSON (snapshot global)
  $("#btn-export-json")?.addEventListener("click", () => {
    const payload = JSON.stringify(S, null, 2);
    download("stopaddict_export.json", payload, "application/json");
    dbg.push("Export JSON ok", "ok");
  });

  // Import JSON (remplace l’état en douceur)
  $("#file-import-json")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      S = { ...DefaultState(), ...obj };
      saveState(S);
      hydrateUIFromState();
      renderChart(_period);
      dbg.push("Import JSON ok", "ok");
    } catch (e) {
      dbg.push("Import JSON erreur: " + e?.message, "err");
      alert("Import JSON invalide.");
    } finally {
      ev.target.value = "";
    }
  });
}

/* =========================================
   Réglages — fallback local (si settings.js absent)
   ========================================= */
function initSettingsFallback() {
  // Prénom + langue (minimal, i18n si dispo)
  $("#profile-name").value = S.profile.name || "";
  $("#profile-name").addEventListener("input", e => {
    S.profile.name = e.target.value || "";
    saveState(S);
  });

  const langSel = $("#select-language");
  if (langSel) {
    if (!langSel.options.length) {
      langSel.innerHTML = `<option value="fr">Français</option><option value="en">English</option>`;
    }
    langSel.value = S.profile.language || "fr";
    langSel.addEventListener("change", async () => {
      S.profile.language = langSel.value;
      saveState(S);
      if (I18N) await I18N.applyLanguage(S.profile.language);
    });
  }

  // Devise
  $("#currency-symbol").value = S.currency.symbol || "€";
  $("#currency-before").checked = !!S.currency.before;
  $("#currency-after").checked  = !S.currency.before;
  $("#btn-apply-currency").addEventListener("click", () => {
    const sym = $("#currency-symbol").value || "€";
    const before = $("#currency-before").checked;
    S.currency = { symbol: sym, before };
    updateHeader(); renderChart(_period); saveState(S);
    dbg.push("Devise appliquée", "ok");
  });

  // Modules (sans exclusivité avancée ici)
  const modIds = {
    cigs: "#mod-cigs", beer: "#mod-beer", joints: "#mod-joints",
    hard: "#mod-hard", liqueur: "#mod-liqueur", alcoholGlobal: "#mod-alcohol"
  };
  for (const k in modIds) {
    const el = $(modIds[k]); if (!el) continue;
    el.checked = !!S.modules[k];
    el.addEventListener("change", () => {
      S.modules[k] = el.checked;
      if (KINDS.includes(k)) { S.today.active[k] = el.checked; reflectCounters(); }
      saveState(S);
    });
  }

  // Prix unitaires
  $("#price-cigarette").value = S.prices.cigarette ?? 0;
  $("#price-joint").value     = S.prices.joint ?? 0;
  $("#price-beer").value      = S.prices.beer ?? 0;
  $("#price-hard").value      = S.prices.hard ?? 0;
  $("#price-liqueur").value   = S.prices.liqueur ?? 0;

  $("#btn-save-prices").addEventListener("click", () => {
    S.prices.cigarette = Number($("#price-cigarette").value || 0);
    S.prices.joint     = Number($("#price-joint").value || 0);
    S.prices.beer      = Number($("#price-beer").value || 0);
    S.prices.hard      = Number($("#price-hard").value || 0);
    S.prices.liqueur   = Number($("#price-liqueur").value || 0);
    persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S);
    dbg.push("Prix unitaires enregistrés", "ok");
  });

  $("#btn-reset-prices").addEventListener("click", () => {
    S.prices = { ...DefaultState().prices };
    $("#price-cigarette").value = 0; $("#price-joint").value = 0;
    $("#price-beer").value = 0;      $("#price-hard").value = 0;
    $("#price-liqueur").value = 0;
    persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S);
    dbg.push("Prix unitaires réinitialisés", "ok");
  });

  // RAZ & sauvegardes
  $("#btn-raz-day")?.addEventListener("click", () => {
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    reflectCounters(); persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S);
    dbg.push("RAZ du jour", "ok");
  });
  $("#btn-raz-history")?.addEventListener("click", () => {
    S.history = {}; persistTodayIntoHistory(); renderChart(_period); saveState(S);
    dbg.push("RAZ historique", "ok");
  });
  $("#btn-raz-factory")?.addEventListener("click", () => {
    const keepHistory = S.history; const keepToday = S.today; const keepCurrency = S.currency;
    S = DefaultState(); S.history = keepHistory; S.today = keepToday; S.currency = keepCurrency;
    hydrateUIFromState(); renderChart(_period); saveState(S);
    dbg.push("RAZ réglages (usine) + conservation historique", "ok");
  });

  $("#btn-save-json-settings")?.addEventListener("click", () => {
    download("stopaddict_settings_backup.json", JSON.stringify(S, null, 2), "application/json");
    dbg.push("Sauvegarder JSON (réglages + état) ok", "ok");
  });
  $("#file-import-json-settings")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      S = { ...DefaultState(), ...obj };
      hydrateUIFromState(); renderChart(_period); saveState(S);
      dbg.push("Import JSON (réglages) ok", "ok");
    } catch (e) {
      alert("Import JSON invalide."); dbg.push("Import JSON (réglages) erreur: "+e?.message, "err");
    } finally { ev.target.value = ""; }
  });

  $("#cb-debug-overlay")?.addEventListener("change", e => {
    const box = $("#debug-console");
    if (e.target.checked) { box?.classList.remove("hide"); dbg.push("Overlay DEBUG ON","ok"); }
    else { box?.classList.add("hide"); }
  });
  $("#btn-copy-logs")?.addEventListener("click", () => dbg.copy());
  $("#btn-clear-logs")?.addEventListener("click", () => dbg.clear());

  $("#btn-resources")?.addEventListener("click", () => {
    alert("Ressources & numéros utiles : à compléter (associations, 112/15/17/18, etc.)");
  });
}

/* =========================================
   Habitudes
   ========================================= */
function setVal(sel, val, isText=false) {
  const el = $(sel); if (!el) return;
  el.value = isText ? (val ?? "") : Number(val ?? 0);
}
function onNum(sel, fn) {
  const el = $(sel);
  el?.addEventListener("input", () => { fn(Number(el.value||0)); saveState(S); });
}

function initHabits() {
  // objectifs/jour
  setVal("#goal-cigs",    S.goals.cigs);
  setVal("#goal-joints",  S.goals.joints);
  setVal("#goal-beer",    S.goals.beer);
  setVal("#goal-hard",    S.goals.hard);
  setVal("#goal-liqueur", S.goals.liqueur);

  $("#btn-habits-save")?.addEventListener("click", () => {
    S.goals.cigs    = Number($("#goal-cigs").value||0);
    S.goals.joints  = Number($("#goal-joints").value||0);
    S.goals.beer    = Number($("#goal-beer").value||0);
    S.goals.hard    = Number($("#goal-hard").value||0);
    S.goals.liqueur = Number($("#goal-liqueur").value||0);
    persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S);
    dbg.push("Objectifs quotidiens enregistrés", "ok");
  });

  $("#btn-habits-reset")?.addEventListener("click", () => {
    S.goals = { ...DefaultState().goals };
    setVal("#goal-cigs",0); setVal("#goal-joints",0); setVal("#goal-beer",0);
    setVal("#goal-hard",0); setVal("#goal-liqueur",0);
    persistTodayIntoHistory(); updateHeader(); renderChart(_period); saveState(S);
    dbg.push("Objectifs réinitialisés", "ok");
  });

  // dates clés
  const D = S.dates;
  const datesMap = [
    ["#date-stop-global","stopGlobal"],["#date-stop-alcohol","stopAlcohol"],
    ["#date-stop-cigs","stopCigs"],["#date-stop-joints","stopJoints"],
    ["#date-reduce-cigs","reduceCigs"],["#date-quit-cigs-obj","quitCigsObj"],["#date-nomore-cigs","noMoreCigs"],
    ["#date-reduce-joints","reduceJoints"],["#date-quit-joints-obj","quitJointsObj"],["#date-nomore-joints","noMoreJoints"],
    ["#date-reduce-alcohol","reduceAlcohol"],["#date-quit-alcohol-obj","quitAlcoholObj"],["#date-nomore-alcohol","noMoreAlcohol"]
  ];
  datesMap.forEach(([sel,key]) => {
    const el = $(sel); if (!el) return;
    el.value = D[key] || "";
    el.addEventListener("change", (e) => { S.dates[key] = e.target.value || ""; saveState(S); });
  });
}

/* =========================================
   Calendrier (placeholder)
   ========================================= */
function initCalendar() {
  const root = $("#calendar-root");
  if (!root) return;
  root.textContent = "Le calendrier détaillé sera alimenté par tes dates & ton historique.";
}

/* =========================================
   i18n (optionnel)
   ========================================= */
async function initI18nIfAvailable() {
  if (!I18N) return;
  try {
    await I18N.initI18n({
      lang: S.profile.language || "fr",
      metaUrl: "../i18n/_meta.json" // relatif à web/js/
    });
    // Remplir le select langue si vide
    const langSel = $("#select-language");
    if (langSel && !langSel.options.length) {
      const langs = I18N.getAvailableLanguages();
      langSel.innerHTML = langs.map(l => `<option value="${l.code}">${l.label}</option>`).join("");
      langSel.value = S.profile.language || "fr";
      langSel.addEventListener("change", async () => {
        S.profile.language = langSel.value; saveState(S);
        await I18N.applyLanguage(S.profile.language);
      });
    }
  } catch (e) {
    dbg.push("i18n init erreur: "+e?.message, "err");
  }
}

/* =========================================
   Hydratation UI
   ========================================= */
function hydrateUIFromState() {
  $("#app-title").textContent = "StopAddict";
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");

  // header + compteurs
  reflectCounters();
  $("#chk-cigs-active").checked    = !!S.today.active.cigs;
  $("#chk-joints-active").checked  = !!S.today.active.joints;
  $("#chk-beer-active").checked    = !!S.today.active.beer;
  $("#chk-hard-active").checked    = !!S.today.active.hard;
  $("#chk-liqueur-active").checked = !!S.today.active.liqueur;

  updateHeader();
}

/* =========================================
   Boot
   ========================================= */
window.addEventListener("DOMContentLoaded", async () => {
  if (!S.today?.date) S.today.date = todayKey();

  // i18n (optionnel)
  await initI18nIfAvailable();

  initAgeGate();
  initTabs();
  initCounters();
  initHabits();
  initCalendar();
  initStats();

  // Réglages : préférer settings.js si dispo, sinon fallback interne
  if (mountSettings) {
    mountSettings({
      S, DefaultState, saveState,
      persistTodayIntoHistory, updateHeader, renderChart,
      reflectCounters, dbg
    });
  } else {
    initSettingsFallback();
  }

  hydrateUIFromState();
  persistTodayIntoHistory();
  renderChart(_period);

  // Toggle overlay (5 taps) sur la date
  let tapTimes = [];
  $("#today-date")?.addEventListener("click", () => {
    const now = Date.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(t => now - t <= 900);
    if (tapTimes.length >= 5) {
      $("#debug-console")?.classList.toggle("hide");
      tapTimes = [];
      dbg.push("Toggle overlay (5 taps)", "ok");
    }
  });

  dbg.push("App ready", "ok");
});
