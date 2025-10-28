// web/js/stats.js
// KPIs + agrégats + export/import + pilotage des graphiques.
// Robuste : lit l’historique via state.js si dispo, sinon via localStorage.

import { throttle } from "./utils.js"; // présent dans ton utils.js (déjà validé)
import * as U from "./utils.js";

// --- Accès state / settings (optionnels) ------------------------------------
let STATE_API = null;
let SETTINGS = null;

async function ensureState() {
  if (STATE_API) return STATE_API;
  try {
    // On n'impose pas de forme stricte : on pioche ce qui existe
    const mod = await import("./state.js");
    STATE_API = {
      on: mod.on || (() => {}),
      getHistory: mod.getHistory || (() => U.loadJSON("sa:history", {})),
      setHistory: mod.setHistory || ((h) => U.saveJSON("sa:history", h)),
      getSettings: mod.getSettings || (() => U.loadJSON("sa:settings", {})),
      mergeImport: mod.mergeImport || ((obj) => {
        // fallback : merge naïf des dates
        const cur = U.loadJSON("sa:history", {});
        const merged = { ...cur, ...obj };
        U.saveJSON("sa:history", merged);
        return true;
      })
    };
  } catch {
    STATE_API = {
      on: () => {},
      getHistory: () => U.loadJSON("sa:history", {}),
      setHistory: (h) => U.saveJSON("sa:history", h),
      getSettings: () => U.loadJSON("sa:settings", {}),
      mergeImport: (obj) => {
        const cur = U.loadJSON("sa:history", {});
        const merged = { ...cur, ...obj };
        U.saveJSON("sa:history", merged);
        return true;
      }
    };
  }
  return STATE_API;
}

function normNumber(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function totalAlcohol(a) {
  if (!a) return 0;
  if (typeof a === "number") return a;
  return normNumber(a.beer) + normNumber(a.strong) + normNumber(a.liquor);
}

// --- Fenêtres temporelles ---------------------------------------------------
function startOfYear(d = new Date()) {
  const x = U.startOfDay(d);
  x.setMonth(0, 1);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeInfo(kind, now = new Date()) {
  let from, to, label;
  switch (kind) {
    case "day":
      from = U.startOfDay(now); to = endOfDay(now); label = "Jour"; break;
    case "week":
      from = U.startOfWeek(now, 1); to = endOfDay(now); label = "Semaine"; break;
    case "month":
      from = U.startOfMonth(now); to = endOfDay(now); label = "Mois"; break;
    case "year":
      from = startOfYear(now); to = endOfDay(now); label = "Année"; break;
    default:
      from = U.startOfDay(now); to = endOfDay(now); label = "Jour";
  }
  return { from, to, label };
}

// --- Lecture / agrégation ---------------------------------------------------
function dateInRange(ymd, from, to) {
  const d = U.parseYMD(ymd);
  if (!d) return false;
  return d >= from && d <= to;
}

function sumPeriod(history, from, to) {
  let cigs = 0, joints = 0, alc = 0;
  for (const ymd in history) {
    if (!dateInRange(ymd, from, to)) continue;
    const row = history[ymd] || {};
    cigs += normNumber(row.cigs ?? row.clopes ?? 0);
    joints += normNumber(row.joints ?? row.weed ?? 0);
    alc += totalAlcohol(row.alcohol ?? row.alcool ?? 0);
  }
  return { cigs, joints, alcohol: alc, total: cigs + joints + alc };
}

function seriesForRange(history, kind, now = new Date()) {
  const out = { labels: [], cigs: [], joints: [], alcohol: [], cost: [], eco: [] };

  // settings (prix + habits) si existants
  const s = SETTINGS || {};
  const prices = (s.prices) || {};
  const habits = (s.habits) || null;

  const price = {
    cig: normNumber(prices.cigarette ?? prices.cig ?? 0.5),
    joint: normNumber(prices.joint ?? 2),
    beer: normNumber(prices.beer ?? 3),
    strong: normNumber(prices.strong ?? 4),
    liquor: normNumber(prices.liquor ?? 3)
  };

  const dayCost = (row) => {
    const c = normNumber(row.cigs ?? 0) * price.cig;
    const j = normNumber(row.joints ?? 0) * price.joint;
    let alc = 0;
    const A = row.alcohol || row.alcool || {};
    if (typeof A === "number") {
      // si déjà agrégé
      alc = A * price.beer; // fallback
    } else {
      alc = normNumber(A.beer) * price.beer
          + normNumber(A.strong) * price.strong
          + normNumber(A.liquor) * price.liquor;
    }
    return c + j + alc;
  };

  const baseDay = habits ? (
    normNumber(habits.cigs) * price.cig
    + normNumber(habits.joints) * price.joint
    + (normNumber(habits.beer) * price.beer
      + normNumber(habits.strong) * price.strong
      + normNumber(habits.liquor) * price.liquor)
  ) : null;

  const today = U.startOfDay(now);

  if (kind === "day") {
    const ymd = U.formatYMD(today);
    const row = history[ymd] || {};
    out.labels = ["Cigarettes", "Joints", "Alcool"];
    out.cigs = [normNumber(row.cigs ?? row.clopes ?? 0)];
    out.joints = [normNumber(row.joints ?? row.weed ?? 0)];
    out.alcohol = [totalAlcohol(row.alcohol ?? row.alcool ?? 0)];
    const c = dayCost(row);
    out.cost = [c];
    out.eco = [baseDay != null ? Math.max(0, baseDay - c) : 0];
    return out;
  }

  // helpers pour "dernier N"
  const copy = (d) => new Date(d.getTime());
  const addDays = (d, n) => { const x = copy(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = copy(d); x.setMonth(x.getMonth() + n, 1); return x; };

  if (kind === "week" || kind === "month") {
    const N = kind === "week" ? 7 : 30;
    const start = kind === "week" ? U.startOfWeek(now, 1) : addDays(U.startOfMonth(now), 0);
    for (let i = 0; i < N; i++) {
      const d = addDays(start, i);
      if (d > today) break;
      const ymd = U.formatYMD(d);
      const row = history[ymd] || {};
      out.labels.push(ymd.slice(5)); // "MM-DD"
      out.cigs.push(normNumber(row.cigs ?? row.clopes ?? 0));
      out.joints.push(normNumber(row.joints ?? row.weed ?? 0));
      out.alcohol.push(totalAlcohol(row.alcohol ?? row.alcool ?? 0));
      const c = dayCost(row);
      out.cost.push(c);
      out.eco.push(baseDay != null ? Math.max(0, baseDay - c) : 0);
    }
    return out;
  }

  // year = 12 mois agrégés
  if (kind === "year") {
    let d = startOfYear(now);
    for (let m = 0; m < 12; m++) {
      const mStart = addMonths(d, m);
      if (mStart > today) break;
      const mEnd = endOfDay(addMonths(mStart, 1) - 1); // fin du mois
      let C = 0, J = 0, A = 0, cost = 0, days = 0;
      for (const ymd in history) {
        const dd = U.parseYMD(ymd);
        if (!dd || dd < mStart || dd > mEnd) continue;
        const row = history[ymd] || {};
        const cc = normNumber(row.cigs ?? row.clopes ?? 0);
        const jj = normNumber(row.joints ?? row.weed ?? 0);
        const aa = totalAlcohol(row.alcohol ?? row.alcool ?? 0);
        C += cc; J += jj; A += aa;
        cost += (cc * price.cig) + (jj * price.joint);
        const Al = row.alcohol || row.alcool || {};
        if (typeof Al === "number") {
          cost += Al * price.beer;
        } else {
          cost += normNumber(Al.beer) * price.beer
                + normNumber(Al.strong) * price.strong
                + normNumber(Al.liquor) * price.liquor;
        }
        days++;
      }
      out.labels.push(`${(mStart.getMonth()+1).toString().padStart(2,"0")}/${mStart.getFullYear().toString().slice(2)}`);
      out.cigs.push(C); out.joints.push(J); out.alcohol.push(A);
      out.cost.push(cost);
      const ecoBase = (baseDay != null && days > 0) ? Math.max(0, baseDay * days - cost) : 0;
      out.eco.push(ecoBase);
    }
    return out;
  }

  return out;
}

// --- UI update --------------------------------------------------------------
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function updateKPIHeader(history) {
  const now = new Date();
  const tday = sumPeriod(history, U.startOfDay(now), endOfDay(now));
  const tweek = sumPeriod(history, U.startOfWeek(now, 1), endOfDay(now));
  const tmonth = sumPeriod(history, U.startOfMonth(now), endOfDay(now));

  setText("todayTotal", String(tday.total));
  setText("weekTotal", String(tweek.total));
  setText("monthTotal", String(tmonth.total));

  // coût jour
  const s = SETTINGS || {};
  const prices = (s.prices) || {};
  const p = {
    cig: normNumber(prices.cigarette ?? prices.cig ?? 0.5),
    joint: normNumber(prices.joint ?? 2),
    beer: normNumber(prices.beer ?? 3),
    strong: normNumber(prices.strong ?? 4),
    liquor: normNumber(prices.liquor ?? 3)
  };
  const todayRow = history[U.formatYMD(now)] || {};
  const A = todayRow.alcohol || todayRow.alcool || {};
  const cJour = normNumber(todayRow.cigs ?? 0) * p.cig
              + normNumber(todayRow.joints ?? 0) * p.joint
              + (typeof A === "number"
                  ? A * p.beer
                  : normNumber(A.beer) * p.beer + normNumber(A.strong) * p.strong + normNumber(A.liquor) * p.liquor);
  setText("todayCost", U.toCurrency(cJour, "€"));
  setText("stat-cout-jr", U.toCurrency(cJour, "€"));

  // économies estimées (optionnel si habits configurés)
  const habits = (s.habits) || null;
  let eco = 0;
  if (habits) {
    const baseDay = normNumber(habits.cigs) * p.cig
                  + normNumber(habits.joints) * p.joint
                  + (normNumber(habits.beer) * p.beer + normNumber(habits.strong) * p.strong + normNumber(habits.liquor) * p.liquor);
    eco = Math.max(0, baseDay - cJour);
  }
  setText("economies-amount", U.toCurrency(eco, "€"));
}

function updateStatsScreen(history, rangeKind) {
  const { from, to, label } = rangeInfo(rangeKind);
  const s = sumPeriod(history, from, to);
  // titre + lignes
  setText("stats-titre", `Bilan ${label} — Total ${s.total}`);
  setText("stats-clopes", String(s.cigs));
  setText("stats-joints", String(s.joints));
  const lineAlc = document.getElementById("stats-alcool-line");
  if (lineAlc) lineAlc.style.display = "flex";
  setText("stats-alcool", String(s.alcohol));
  // bloc KPI (3 lignes)
  setText("kpi-cigarettes-value", String(s.cigs));
  setText("kpi-joints-value", String(s.joints));
  setText("kpi-alcohol-value", String(s.alcohol));
  // summary card
  setText("summary-card-period-label", `Total ${label.toLowerCase()}`);
  setText("summary-card-period-value", String(s.total));
}

function setActiveRangeButton(kind) {
  document.querySelectorAll("#chartRange .btn.pill").forEach((b) => {
    const k = b.getAttribute("data-range");
    if (k === kind) b.classList.add("active");
    else b.classList.remove("active");
  });
}

// --- Export / Import --------------------------------------------------------
function download(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function historyToCSV(history) {
  const head = ["date","cigs","joints","beer","strong","liquor"];
  const rows = [head.join(",")];
  const dates = Object.keys(history).sort();
  for (const d of dates) {
    const r = history[d] || {};
    const alc = (r.alcohol || r.alcool || {}) || {};
    const beer = typeof alc === "number" ? alc : normNumber(alc.beer);
    const strong = typeof alc === "number" ? 0 : normNumber(alc.strong);
    const liquor = typeof alc === "number" ? 0 : normNumber(alc.liquor);
    rows.push([
      d,
      normNumber(r.cigs ?? r.clopes ?? 0),
      normNumber(r.joints ?? r.weed ?? 0),
      beer, strong, liquor
    ].join(","));
  }
  return rows.join("\n");
}

function csvToHistory(text) {
  const out = {};
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return out;
  const head = lines.shift().split(",").map(s => s.trim().toLowerCase());
  const idx = (k) => head.indexOf(k);
  for (const L of lines) {
    if (!L.trim()) continue;
    const c = L.split(",").map(x => x.trim());
    const date = c[idx("date")];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    out[date] = {
      cigs: normNumber(c[idx("cigs")] ?? 0),
      joints: normNumber(c[idx("joints")] ?? 0),
      alcohol: {
        beer: normNumber(c[idx("beer")] ?? 0),
        strong: normNumber(c[idx("strong")] ?? 0),
        liquor: normNumber(c[idx("liquor")] ?? 0),
      }
    };
  }
  return out;
}

// --- Pump données vers charts.js -------------------------------------------
function pushChartData(rangeKind, history) {
  const s = seriesForRange(history, rangeKind);
  const evt = new CustomEvent("sa:chart-data", { detail: { range: rangeKind, ...s } });
  document.dispatchEvent(evt);
}

// --- Handlers ---------------------------------------------------------------
async function onRangeClick(kind) {
  const API = await ensureState();
  const history = API.getHistory();
  setActiveRangeButton(kind);
  updateStatsScreen(history, kind);
  pushChartData(kind, history);
}

async function onExportAll() {
  const API = await ensureState();
  const history = API.getHistory();
  const csv = historyToCSV(history);
  download("stopaddict_history.csv", csv, "text/csv");
}

async function onExportView(currentRange) {
  const API = await ensureState();
  const history = API.getHistory();
  // on garde la même structure CSV mais restreinte à la période
  const { from, to } = rangeInfo(currentRange);
  const filtered = {};
  for (const d in history) if (dateInRange(d, from, to)) filtered[d] = history[d];
  const csv = historyToCSV(filtered);
  download(`stopaddict_${currentRange}.csv`, csv, "text/csv");
}

async function onImportFile(file) {
  const API = await ensureState();
  const text = await file.text();
  let obj = null;
  if (/\.json$/i.test(file.name)) {
    try { obj = JSON.parse(text); } catch { obj = null; }
  } else if (/\.csv$/i.test(file.name)) {
    obj = csvToHistory(text);
  }
  if (!obj || typeof obj !== "object") {
    alert("Fichier non reconnu (CSV/JSON attendu).");
    return;
  }
  API.mergeImport(obj);
  // rafraîchir l’écran courant
  const activeBtn = document.querySelector("#chartRange .btn.pill.active");
  const kind = activeBtn ? activeBtn.getAttribute("data-range") : "day";
  const history = API.getHistory();
  updateKPIHeader(history);
  updateStatsScreen(history, kind);
  pushChartData(kind, history);
}

// --- INIT -------------------------------------------------------------------
export async function initStats() {
  const API = await ensureState();
  SETTINGS = API.getSettings() || {};

  // range buttons
  let currentRange = "day";
  document.querySelectorAll("#chartRange .btn.pill").forEach((b) => {
    b.addEventListener("click", () => {
      const kind = b.getAttribute("data-range") || "day";
      currentRange = kind;
      onRangeClick(kind);
    });
  });

  // exports / import
  const btnAll = document.getElementById("btn-export-csv");
  const btnView = document.getElementById("btn-export-stats");
  const btnImport = document.getElementById("btn-import");
  const inputImport = document.getElementById("input-import");
  if (btnAll) btnAll.addEventListener("click", onExportAll);
  if (btnView) btnView.addEventListener("click", () => onExportView(currentRange));
  if (btnImport && inputImport) {
    btnImport.addEventListener("click", () => inputImport.click());
    inputImport.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) onImportFile(f);
      e.target.value = "";
    });
  }

  // réactions aux changements de compteurs
  API.on && API.on("sa:counts-updated", throttle(async () => {
    const H = API.getHistory();
    updateKPIHeader(H);
    updateStatsScreen(H, currentRange);
    pushChartData(currentRange, H);
  }, 200));

  // boot initial
  const H = API.getHistory();
  setActiveRangeButton(currentRange);
  updateKPIHeader(H);
  updateStatsScreen(H, currentRange);
  pushChartData(currentRange, H);
}
