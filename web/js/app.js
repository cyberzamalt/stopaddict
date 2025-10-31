/* web/js/app.js — StopAddict (ES module)
   Nicolas — version initiale "functional core"

   ⚙️ Contenu :
   - State + persistence (localStorage)
   - Tabs + navigation
   - Age-gate (18+)
   - Accueil : compteurs +/−, modules actifs
   - Réglages : devise, modules, prix, variantes (stockage), RAZ
   - Habitudes : objectifs / dates clés
   - Stats : Chart.js, périodes, export CSV/JSON, import JSON
   - Journal & Debug overlay
*/

/* =========================
   Helpers (dates, storage)
   ========================= */
const LS_KEY = "sa_state_v1";
const LS_AGE = "sa_age_ack_v1";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtMoney(val, cur) {
  const n = Number(val || 0);
  const s = cur?.symbol ?? "€";
  const before = !!cur?.before;
  const fixed = n.toFixed(2);
  return before ? `${s}${fixed}` : `${fixed} ${s}`;
}

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

/* =========================
   State (defaults + load)
   ========================= */
const DefaultState = () => ({
  meta: { ver: "2.3.1-like", created: Date.now() },
  profile: { name: "", language: "fr" },
  currency: { symbol: "€", before: true },
  modules: {
    cigs: true,
    joints: true,
    beer: true,
    hard: true,
    liqueur: true,
    alcoholGlobal: true, // agrégat (info)
  },
  // Fallback prix unitaires (si variantes non définies)
  prices: {
    cigarette: 0, // prix/unité
    joint: 0,
    beer: 0,
    hard: 0, // dose
    liqueur: 0,
  },
  // Variantes (stockées mais pas recalculées ici en détail — on s'en sert si prix unitaires = 0)
  variants: {
    classic: { use: false, packPrice: 0, cigsPerPack: 20 },
    rolled: {
      use: false, tobacco30gPrice: 0, cigsPer30g: 0,
      smallLeavesPrice: 0, smallLeavesCount: 0,
      filtersPrice: 0, filtersCount: 0, useFilter: false,
    },
    tubed: {
      use: false, cigsPer30g: 0, tubesPrice: 0, tubesCount: 0, useFilter: false,
    },
    cannabis: {
      use: false, gramPrice: 0, gramsPerJoint: 0,
      bigLeafPrice: 0, bigLeafCount: 0, useFilter: false,
    },
    alcohol: {
      beer: { enabled: true, unitPrice: 0, unitLabel: "33 cl" },
      hard: { enabled: true, dosePrice: 0, doseUnit: "4 cl" },
      liqueur: { enabled: true, dosePrice: 0, doseUnit: "6 cl" },
    },
  },
  // Objectifs & limites
  goals: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
  limits: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
  dates: {
    stopGlobal: "", stopAlcohol: "", stopCigs: "", stopJoints: "",
    reduceCigs: "", quitCigsObj: "", noMoreCigs: "",
    reduceJoints: "", quitJointsObj: "", noMoreJoints: "",
    reduceAlcohol: "", quitAlcoholObj: "", noMoreAlcohol: "",
  },
  // Données par jour
  history: {
    // "YYYY-MM-DD": { cigs, joints, beer, hard, liqueur, cost, saved }
  },
  // État du jour courant (miroir pratique)
  today: {
    date: todayKey(),
    counters: { cigs: 0, joints: 0, beer: 0, hard: 0, liqueur: 0 },
    active:   { cigs: true, joints: true, beer: true, hard: true, liqueur: true },
  },
  debug: { logs: [] },
});

let S = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DefaultState();
    const obj = JSON.parse(raw);
    // merge doux : sécu si anciennes clés manquent
    return { ...DefaultState(), ...obj,
      currency: { ...DefaultState().currency, ...(obj.currency||{}) },
      modules:  { ...DefaultState().modules,  ...(obj.modules||{}) },
      prices:   { ...DefaultState().prices,   ...(obj.prices||{}) },
      variants: { ...DefaultState().variants, ...(obj.variants||{}) },
      goals:    { ...DefaultState().goals,    ...(obj.goals||{}) },
      limits:   { ...DefaultState().limits,   ...(obj.limits||{}) },
      dates:    { ...DefaultState().dates,    ...(obj.dates||{}) },
      today:    { ...DefaultState().today,    ...(obj.today||{}) },
      debug:    { ...DefaultState().debug,    ...(obj.debug||{}) },
    };
  } catch {
    return DefaultState();
  }
}
function saveState() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch {}
}

/* =========================
   Debug overlay
   ========================= */
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

/* =========================
   Age Gate (18+)
   ========================= */
function initAgeGate() {
  const ack = localStorage.getItem(LS_AGE);
  const dlg = $("#agegate");
  const btn = $("#btn-age-accept");
  const cb18 = $("#age-18plus");
  const cbHide = $("#age-hide");

  if (!dlg || !btn || !cb18) return;

  const close = () => {
    dlg.close?.();
    dlg.classList.add("hide");
  };

  const open = () => {
    try { dlg.showModal?.(); } catch { /* fallback */ }
    dlg.classList.remove("hide");
  };

  if (ack === "1") {
    close();
  } else {
    open();
    btn.disabled = true;
    cb18.addEventListener("change", () => {
      btn.disabled = !cb18.checked;
    });
    btn.addEventListener("click", () => {
      if (cb18.checked) {
        if (cbHide.checked) localStorage.setItem(LS_AGE, "1");
        close();
      }
    });
  }
}

/* =========================
   Tabs
   ========================= */
const PAGES = {
  home:    "#page-home",
  stats:   "#page-stats",
  calendar:"#page-calendar",
  habits:  "#page-habits",
  settings:"#page-settings"
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

/* =========================
   Accueil : compteurs
   ========================= */
const KINDS = ["cigs","joints","beer","hard","liqueur"];

function initCounters() {
  // boutons +/−
  $$("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.kind;
      const action = btn.dataset.action;
      if (!KINDS.includes(kind)) return;

      const active = S.today.active[kind];
      if (!active) return; // inactif => no-op

      const cur = Number(S.today.counters[kind] || 0);
      let next = cur;
      if (action === "inc") next = cur + 1;
      else if (action === "dec") next = Math.max(0, cur - 1);

      S.today.counters[kind] = next;
      reflectCounters();
      persistTodayIntoHistory();
      updateHeader();
      saveState();
      dbg.push(`Counter ${kind} -> ${next}`, "event");
    });
  });

  // cases à cocher "Activer"
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
}

function reflectCounters() {
  $("#val-cigs").textContent    = S.today.counters.cigs ?? 0;
  $("#val-joints").textContent  = S.today.counters.joints ?? 0;
  $("#val-beer").textContent    = S.today.counters.beer ?? 0;
  $("#val-hard").textContent    = S.today.counters.hard ?? 0;
  $("#val-liqueur").textContent = S.today.counters.liqueur ?? 0;

  // gestion visuelle des cartes inactives
  const setDisabled = (id, on) => {
    const el = $(id);
    if (!el) return;
    el.style.opacity = on ? "0.55" : "1";
  };
  setDisabled("#ctr-cigs",    !S.today.active.cigs);
  setDisabled("#ctr-joints",  !S.today.active.joints);
  setDisabled("#ctr-beer",    !S.today.active.beer);
  setDisabled("#ctr-hard",    !S.today.active.hard);
  setDisabled("#ctr-liqueur", !S.today.active.liqueur);
}

/* =========================
   Coûts & économies
   ========================= */
function unitPrice(kind) {
  // 1) prix simple si présent
  const p = S.prices;
  const v = S.variants;

  switch (kind) {
    case "cigs":
      if (p.cigarette > 0) return p.cigarette;
      // fallback approximatif si "classic" configuré
      if (v.classic.use && v.classic.packPrice > 0 && v.classic.cigsPerPack > 0) {
        return v.classic.packPrice / v.classic.cigsPerPack;
      }
      // roulées : si cigs/30g & prix 30g => prix/30g / cigs
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
    if (!S.today.active[k]) continue;
    if (!S.modules[k]) continue;
    const up = unitPrice(k);
    total += (Number(counters[k] || 0) * up);
  }
  return total;
}

function computeSaved(counters = S.today.counters) {
  // Idée simple : si objectif (goal) > 0, alors "économie" = max(0, (goal - actual)) * unitPrice
  let saved = 0;
  for (const k of KINDS) {
    const g = Number(S.goals[k] || 0);
    const a = Number(counters[k] || 0);
    if (g > 0 && a < g) {
      saved += (g - a) * unitPrice(k);
    }
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

  // badge "statut" (vert si 0 aujourd'hui)
  const badge = $("#hdr-status");
  const sum = KINDS.reduce((s,k)=>s+(S.today.counters[k]||0),0);
  badge.textContent = sum === 0 ? "✓" : "•";
  badge.style.background = sum === 0 ? "#124232" : "#1f2b48";
}

/* =========================
   History
   ========================= */
function persistTodayIntoHistory() {
  const key = todayKey();
  if (S.today.date !== key) {
    // changement de jour : on "avance"
    S.history[S.today.date] = {
      ...S.today.counters,
      cost: computeCost(S.today.counters),
      saved: computeSaved(S.today.counters),
    };
    S.today.date = key;
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
  }
  // miroir "live"
  S.history[key] = {
    ...S.today.counters,
    cost: computeCost(S.today.counters),
    saved: computeSaved(S.today.counters),
  };
}

/* =========================
   Stats (Chart.js)
   ========================= */
let chart;
function renderChart(period = _period) {
  persistTodayIntoHistory();
  const canvas = $("#chart-main");
  if (!canvas) return;

  const labels = ["Cigarettes","Joints","Bière","Alcool fort","Liqueur","Coût","Économies"];
  let counters = { cigs:0,joints:0,beer:0,hard:0,liqueur:0, cost:0, saved:0 };

  const now = new Date();
  const todayStr = todayKey(now);

  // agrégation selon période
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
    data: {
      labels,
      datasets: [{ label: "Valeurs", data }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero:true }
      },
      plugins: {
        legend: { display:false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const i = ctx.dataIndex;
              if (i >= 5) {
                return `${labels[i]}: ${fmtMoney(ctx.parsed.y, S.currency)}`;
              }
              return `${labels[i]}: ${ctx.parsed.y}`;
            }
          }
        }
      }
    }
  });
}

function fmtDate(iso) {
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function dateRangeFor(period, refDate) {
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
  } else { // day fallback
    // already day
  }
  return { start: todayKey(start), end: todayKey(end) };
}

let _period = "day";
function initStats() {
  $("#btnPeriod-day")?.addEventListener("click", ()=>{ _period="day"; renderChart(); });
  $("#btnPeriod-week")?.addEventListener("click", ()=>{ _period="week"; renderChart(); });
  $("#btnPeriod-month")?.addEventListener("click", ()=>{ _period="month"; renderChart(); });
  $("#btnPeriod-year")?.addEventListener("click", ()=>{ _period="year"; renderChart(); });

  // Export CSV
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

  // Export JSON (tout)
  $("#btn-export-json")?.addEventListener("click", () => {
    const payload = JSON.stringify(S, null, 2);
    download("stopaddict_export.json", payload, "application/json");
    dbg.push("Export JSON ok", "ok");
  });

  // Import JSON
  $("#file-import-json")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      // simple remplacement (sécurisé avec merge)
      const prev = S.meta?.ver || "unknown";
      S = { ...DefaultState(), ...obj };
      saveState();
      hydrateUIFromState();
      renderChart();
      dbg.push(`Import JSON ok (prev ver ${prev})`, "ok");
    } catch (e) {
      dbg.push("Import JSON erreur: " + e?.message, "err");
      alert("Import JSON invalide.");
    } finally {
      ev.target.value = "";
    }
  });
}

/* =========================
   Réglages
   ========================= */
function initSettings() {
  // profil
  $("#profile-name").value = S.profile.name || "";
  $("#profile-name").addEventListener("input", e => {
    S.profile.name = e.target.value || "";
    saveState();
  });

  // langue (placeholder simple)
  const langSel = $("#select-language");
  if (langSel) {
    langSel.innerHTML = `
      <option value="fr">Français</option>
      <option value="en">English</option>
    `;
    langSel.value = S.profile.language || "fr";
    langSel.addEventListener("change", () => {
      S.profile.language = langSel.value;
      saveState();
    });
  }

  // devise
  $("#currency-symbol").value = S.currency.symbol || "€";
  $("#currency-before").checked = !!S.currency.before;
  $("#currency-after").checked = !S.currency.before;

  $("#btn-apply-currency").addEventListener("click", () => {
    const sym = $("#currency-symbol").value || "€";
    const before = $("#currency-before").checked;
    S.currency = { symbol: sym, before };
    updateHeader();
    renderChart(_period);
    saveState();
    dbg.push("Devise appliquée", "ok");
  });

  // modules
  const modIds = {
    cigs: "#mod-cigs",
    beer: "#mod-beer",
    joints: "#mod-joints",
    hard: "#mod-hard",
    liqueur: "#mod-liqueur",
    alcoholGlobal: "#mod-alcohol"
  };
  for (const k in modIds) {
    const el = $(modIds[k]);
    if (!el) continue;
    el.checked = !!S.modules[k];
    el.addEventListener("change", () => {
      S.modules[k] = el.checked;
      // si on désactive un module, on rend la carte inactive aussi
      if (KINDS.includes(k)) {
        S.today.active[k] = el.checked;
        reflectCounters();
      }
      saveState();
    });
  }

  // prix unitaires simples
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
    persistTodayIntoHistory();
    updateHeader();
    renderChart(_period);
    saveState();
    dbg.push("Prix unitaires enregistrés", "ok");
  });

  $("#btn-reset-prices").addEventListener("click", () => {
    S.prices = { ...DefaultState().prices };
    $("#price-cigarette").value = 0;
    $("#price-joint").value     = 0;
    $("#price-beer").value      = 0;
    $("#price-hard").value      = 0;
    $("#price-liqueur").value   = 0;
    persistTodayIntoHistory();
    updateHeader();
    renderChart(_period);
    saveState();
    dbg.push("Prix unitaires réinitialisés", "ok");
  });

  // Variantes — Cigarettes classiques
  $("#classic-use")?.addEventListener("change", e => { S.variants.classic.use = e.target.checked; saveState(); });
  setVal("#classic-pack-price",    S.variants.classic.packPrice);
  setVal("#classic-cigs-per-pack", S.variants.classic.cigsPerPack);
  onNum("#classic-pack-price",    v => S.variants.classic.packPrice = v);
  onNum("#classic-cigs-per-pack", v => S.variants.classic.cigsPerPack = v);

  // Roulées
  $("#rolled-use")?.addEventListener("change", e => { S.variants.rolled.use = e.target.checked; saveState(); });
  setVal("#rolled-tobacco-30g-price", S.variants.rolled.tobacco30gPrice);
  setVal("#rolled-cigs-per-30g",      S.variants.rolled.cigsPer30g);
  setVal("#rolled-small-leaves-price", S.variants.rolled.smallLeavesPrice);
  setVal("#rolled-small-leaves-count", S.variants.rolled.smallLeavesCount);
  setVal("#rolled-filters-price", S.variants.rolled.filtersPrice);
  setVal("#rolled-filters-count", S.variants.rolled.filtersCount);
  $("#rolled-use-filter")?.addEventListener("change", e => { S.variants.rolled.useFilter = e.target.checked; saveState(); });
  onNum("#rolled-tobacco-30g-price", v => S.variants.rolled.tobacco30gPrice = v);
  onNum("#rolled-cigs-per-30g",      v => S.variants.rolled.cigsPer30g = v);
  onNum("#rolled-small-leaves-price", v => S.variants.rolled.smallLeavesPrice = v);
  onNum("#rolled-small-leaves-count", v => S.variants.rolled.smallLeavesCount = v);
  onNum("#rolled-filters-price", v => S.variants.rolled.filtersPrice = v);
  onNum("#rolled-filters-count", v => S.variants.rolled.filtersCount = v);

  // Tubées
  $("#tubed-use")?.addEventListener("change", e => { S.variants.tubed.use = e.target.checked; saveState(); });
  setVal("#tubed-cigs-per-30g", S.variants.tubed.cigsPer30g);
  setVal("#tubed-tubes-price",  S.variants.tubed.tubesPrice);
  setVal("#tubed-tubes-count",  S.variants.tubed.tubesCount);
  $("#tubed-use-filter")?.addEventListener("change", e => { S.variants.tubed.useFilter = e.target.checked; saveState(); });
  onNum("#tubed-cigs-per-30g", v => S.variants.tubed.cigsPer30g = v);
  onNum("#tubed-tubes-price",  v => S.variants.tubed.tubesPrice = v);
  onNum("#tubed-tubes-count",  v => S.variants.tubed.tubesCount = v);

  // Cannabis
  $("#canna-use")?.addEventListener("change", e => { S.variants.cannabis.use = e.target.checked; saveState(); });
  setVal("#canna-price-gram",      S.variants.cannabis.gramPrice);
  setVal("#canna-grams-per-joint", S.variants.cannabis.gramsPerJoint);
  setVal("#canna-bigleaf-price",   S.variants.cannabis.bigLeafPrice);
  setVal("#canna-bigleaf-count",   S.variants.cannabis.bigLeafCount);
  $("#canna-use-filter")?.addEventListener("change", e => { S.variants.cannabis.useFilter = e.target.checked; saveState(); });
  onNum("#canna-price-gram",      v => S.variants.cannabis.gramPrice = v);
  onNum("#canna-grams-per-joint", v => S.variants.cannabis.gramsPerJoint = v);
  onNum("#canna-bigleaf-price",   v => S.variants.cannabis.bigLeafPrice = v);
  onNum("#canna-bigleaf-count",   v => S.variants.cannabis.bigLeafCount = v);

  // Alcool catégories
  $("#beer-enabled")?.addEventListener("change", e => { S.variants.alcohol.beer.enabled = e.target.checked; saveState(); });
  setVal("#beer-price-unit", S.variants.alcohol.beer.unitPrice);
  setVal("#beer-unit-label", S.variants.alcohol.beer.unitLabel, true);
  onNum("#beer-price-unit", v => S.variants.alcohol.beer.unitPrice = v);
  onTxt("#beer-unit-label", v => S.variants.alcohol.beer.unitLabel = v);

  $("#hard-enabled")?.addEventListener("change", e => { S.variants.alcohol.hard.enabled = e.target.checked; saveState(); });
  setVal("#hard-price-dose", S.variants.alcohol.hard.dosePrice);
  setVal("#hard-dose-unit",  S.variants.alcohol.hard.doseUnit, true);
  onNum("#hard-price-dose", v => S.variants.alcohol.hard.dosePrice = v);
  onTxt("#hard-dose-unit",  v => S.variants.alcohol.hard.doseUnit = v);

  $("#liqueur-enabled")?.addEventListener("change", e => { S.variants.alcohol.liqueur.enabled = e.target.checked; saveState(); });
  setVal("#liqueur-price-dose", S.variants.alcohol.liqueur.dosePrice);
  setVal("#liqueur-dose-unit",  S.variants.alcohol.liqueur.doseUnit, true);
  onNum("#liqueur-price-dose", v => S.variants.alcohol.liqueur.dosePrice = v);
  onTxt("#liqueur-dose-unit",  v => S.variants.alcohol.liqueur.doseUnit = v);

  // RAZ & sauvegarde (réglages)
  $("#btn-raz-day")?.addEventListener("click", () => {
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    reflectCounters();
    persistTodayIntoHistory();
    updateHeader();
    renderChart(_period);
    saveState();
    dbg.push("RAZ du jour", "ok");
  });
  $("#btn-raz-period")?.addEventListener("click", () => {
    const { start, end } = dateRangeFor(_period, new Date());
    for (const k of Object.keys(S.history)) {
      if (k >= start && k <= end) delete S.history[k];
    }
    persistTodayIntoHistory();
    renderChart(_period);
    saveState();
    dbg.push("RAZ période (période active)", "ok");
  });
  $("#btn-raz-history")?.addEventListener("click", () => {
    S.history = {};
    persistTodayIntoHistory();
    renderChart(_period);
    saveState();
    dbg.push("RAZ historique conso", "ok");
  });
  $("#btn-raz-factory")?.addEventListener("click", () => {
    const keepHistory = S.history;
    const keepToday = S.today;
    S = DefaultState();
    // on garde l'historique si tu veux (moins destructif) :
    S.history = keepHistory;
    S.today = keepToday;
    hydrateUIFromState();
    renderChart(_period);
    saveState();
    dbg.push("RAZ réglages (usine) + conservation historique", "ok");
  });

  $("#btn-save-json-settings")?.addEventListener("click", () => {
    const json = JSON.stringify(S, null, 2);
    download("stopaddict_settings_backup.json", json, "application/json");
    dbg.push("Sauvegarder JSON (réglages + état) ok", "ok");
  });
  $("#file-import-json-settings")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      S = { ...DefaultState(), ...obj };
      saveState();
      hydrateUIFromState();
      renderChart(_period);
      dbg.push("Import JSON (réglages) ok", "ok");
    } catch (e) {
      alert("Import JSON invalide.");
      dbg.push("Import JSON (réglages) erreur: "+e?.message, "err");
    } finally {
      ev.target.value = "";
    }
  });

  $("#btn-purge-local-stats")?.addEventListener("click", () => {
    S.history = {};
    persistTodayIntoHistory();
    renderChart(_period);
    saveState();
    dbg.push("Purge données locales (Stats)", "ok");
  });

  // Journal & debug
  const dbgBox = $("#debug-console");
  $("#cb-debug-overlay")?.addEventListener("change", e => {
    if (e.target.checked) {
      dbgBox?.classList.remove("hide");
      dbg.push("Overlay DEBUG ON", "ok");
    } else {
      dbgBox?.classList.add("hide");
    }
  });
  $("#btn-copy-logs")?.addEventListener("click", () => dbg.copy());
  $("#btn-clear-logs")?.addEventListener("click", () => dbg.clear());

  // Ressources (placeholder)
  $("#btn-resources")?.addEventListener("click", () => {
    alert("Ressources & numéros utiles : à compléter (liens d'aide, 112/15/17/18, associations, etc.)");
  });
}

function setVal(sel, val, isText=false) {
  const el = $(sel);
  if (!el) return;
  el.value = isText ? (val ?? "") : Number(val ?? 0);
}
function onNum(sel, fn) {
  const el = $(sel);
  el?.addEventListener("input", () => { fn(Number(el.value||0)); saveState(); });
}
function onTxt(sel, fn) {
  const el = $(sel);
  el?.addEventListener("input", () => { fn(String(el.value||"")); saveState(); });
}

/* =========================
   Habitudes (objectifs, dates)
   ========================= */
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
    persistTodayIntoHistory();
    updateHeader();
    renderChart(_period);
    saveState();
    dbg.push("Objectifs quotidiens enregistrés", "ok");
  });

  $("#btn-habits-reset")?.addEventListener("click", () => {
    S.goals = { ...DefaultState().goals };
    setVal("#goal-cigs",0); setVal("#goal-joints",0); setVal("#goal-beer",0);
    setVal("#goal-hard",0); setVal("#goal-liqueur",0);
    persistTodayIntoHistory();
    updateHeader();
    renderChart(_period);
    saveState();
    dbg.push("Objectifs réinitialisés", "ok");
  });

  // dates clés
  const D = S.dates;
  setVal("#date-stop-global",    D.stopGlobal, true);
  setVal("#date-stop-alcohol",   D.stopAlcohol, true);
  setVal("#date-stop-cigs",      D.stopCigs, true);
  setVal("#date-stop-joints",    D.stopJoints, true);

  setVal("#date-reduce-cigs",    D.reduceCigs, true);
  setVal("#date-quit-cigs-obj",  D.quitCigsObj, true);
  setVal("#date-nomore-cigs",    D.noMoreCigs, true);

  setVal("#date-reduce-joints",  D.reduceJoints, true);
  setVal("#date-quit-joints-obj",D.quitJointsObj, true);
  setVal("#date-nomore-joints",  D.noMoreJoints, true);

  setVal("#date-reduce-alcohol", D.reduceAlcohol, true);
  setVal("#date-quit-alcohol-obj", D.quitAlcoholObj, true);
  setVal("#date-nomore-alcohol", D.noMoreAlcohol, true);
  setVal("#date-quit-global",    D.stopGlobal, true); // alias

  const bindDate = (sel, key) => {
    $(sel)?.addEventListener("change", (e) => {
      S.dates[key] = e.target.value || "";
      saveState();
    });
  };
  bindDate("#date-stop-global","stopGlobal");
  bindDate("#date-stop-alcohol","stopAlcohol");
  bindDate("#date-stop-cigs","stopCigs");
  bindDate("#date-stop-joints","stopJoints");

  bindDate("#date-reduce-cigs","reduceCigs");
  bindDate("#date-quit-cigs-obj","quitCigsObj");
  bindDate("#date-nomore-cigs","noMoreCigs");

  bindDate("#date-reduce-joints","reduceJoints");
  bindDate("#date-quit-joints-obj","quitJointsObj");
  bindDate("#date-nomore-joints","noMoreJoints");

  bindDate("#date-reduce-alcohol","reduceAlcohol");
  bindDate("#date-quit-alcohol-obj","quitAlcoholObj");
  bindDate("#date-nomore-alcohol","noMoreAlcohol");
}

/* =========================
   Calendrier (placeholder)
   ========================= */
function initCalendar() {
  const root = $("#calendar-root");
  if (!root) return;
  root.textContent = "Le calendrier détaillé sera alimenté par tes dates & ton historique.";
}

/* =========================
   UI Hydration on load
   ========================= */
function hydrateUIFromState() {
  // topbar title + date
  $("#app-title").textContent = "StopAddict";
  $("#today-date").textContent = new Date().toLocaleDateString("fr-FR");

  // counters & actives
  reflectCounters();
  // activer/désactiver les cases Activer selon modules
  $("#chk-cigs-active").checked    = !!S.today.active.cigs;
  $("#chk-joints-active").checked  = !!S.today.active.joints;
  $("#chk-beer-active").checked    = !!S.today.active.beer;
  $("#chk-hard-active").checked    = !!S.today.active.hard;
  $("#chk-liqueur-active").checked = !!S.today.active.liqueur;

  updateHeader();
}

/* =========================
   Boot
   ========================= */
window.addEventListener("DOMContentLoaded", () => {
  // Ensure today key
  if (!S.today?.date) S.today.date = todayKey();

  initAgeGate();
  initTabs();
  initCounters();
  initSettings();
  initHabits();
  initCalendar();
  initStats();

  hydrateUIFromState();
  persistTodayIntoHistory();
  renderChart(_period);

  // Geste "5 tapes" sur la date => toggle overlay
  let tapTimes = [];
  const dateEl = $("#today-date");
  dateEl?.addEventListener("click", () => {
    const now = Date.now();
    tapTimes.push(now);
    tapTimes = tapTimes.filter(t => now - t <= 900); // 0.9s fenêtre
    if (tapTimes.length >= 5) {
      const box = $("#debug-console");
      box?.classList.toggle("hide");
      tapTimes = [];
      dbg.push("Toggle overlay (5 taps)", "ok");
    }
  });

  dbg.push("App ready", "ok");
});
