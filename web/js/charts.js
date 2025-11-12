/* ============================================================
   StopAddict — charts.js  (v3, one-shot)
   Rôle : 2 graphiques Chart.js
          #1 Consommations (clopes, joints, alcool)
          #2 Coûts / Économies (si calculables)
   API   : StopAddictCharts.init({ S, dbg })
           StopAddictCharts.refresh({ S, dbg })
   ============================================================ */

(function () {
  "use strict";

  // ---- Guards ----
  const hasChart = () => (typeof window.Chart !== "undefined");
  const $ = (id) => document.getElementById(id);

  // ---- State (module-local) ----
  let chart1 = null; // consommations
  let chart2 = null; // coûts/économies
  let currentView = "day"; // "day" | "week" | "month" | "year"

  // ---- Helpers date (LOCAL TIME) ----
  function todayLocalISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }
  function addDays(iso, delta) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + delta);
    return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, "0"), String(dt.getDate()).padStart(2, "0")].join("-");
  }
  function startOfMonthISO(iso) {
    const [y, m] = iso.split("-").map(Number);
    return `${y}-${String(m).padStart(2, "0")}-01`;
  }
  function monthDaysCount(iso) {
    const [y, m] = iso.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  }
  function monthLabel(short = true, m/*1..12*/) {
    const names = short
      ? ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"]
      : ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
    return names[(m - 1 + 12) % 12];
  }

  // ---- Normalisations & coûts ----
  function effectiveAlcoholGroup(S, counters) {
    // Si alcool global > 0 ou actif : on ne compte pas beer/hard/liqueur
    const act = S.today?.active || {};
    const useGlobal = (counters.alcohol || 0) > 0 || !!act.alcohol;
    if (useGlobal) {
      return { alcohol: counters.alcohol || 0, beer: 0, hard: 0, liqueur: 0 };
    }
    return {
      alcohol: 0,
      beer: counters.beer || 0,
      hard: counters.hard || 0,
      liqueur: counters.liqueur || 0
    };
  }

  function calcCost(S, counters) {
    // s’appuie sur la logique centralisée de state.js si dispo
    if (window.StopAddictState && typeof window.StopAddictState.calculateDayCost === "function") {
      return window.StopAddictState.calculateDayCost(S, counters);
    }
    const P = S.prices || {};
    const g = effectiveAlcoholGroup(S, counters);
    const cost =
      (counters.cigs   || 0) * (P.cigs    || 0) +
      (counters.weed   || 0) * (P.weed    || 0) +
      (g.alcohol       || 0) * (P.alcohol || 0) +
      (g.beer          || 0) * (P.beer    || 0) +
      (g.hard          || 0) * (P.hard    || 0) +
      (g.liqueur       || 0) * (P.liqueur || 0);
    return Number.isFinite(cost) ? cost : 0;
  }

  // ---- Agrégations par vue ----
  // Source des données :
  // - Aujourd’hui : S.today.counters
  // - Historique : S.history[YYYY-MM-DD]
  function getDayTotals(S, iso) {
    const todayISO = todayLocalISO();
    let base = { cigs: 0, weed: 0, alcohol: 0, beer: 0, hard: 0, liqueur: 0 };
    if (iso === todayISO) {
      base = Object.assign(base, S.today?.counters || {});
    } else if (S.history && S.history[iso]) {
      const h = S.history[iso];
      base = {
        cigs: +h.cigs || 0,
        weed: +h.weed || 0,
        alcohol: +h.alcohol || 0,
        beer: +h.beer || 0,
        hard: +h.hard || 0,
        liqueur: +h.liqueur || 0
      };
    }
    return base;
  }

  // Jour : 4 tranches fixes (0–6, 6–12, 12–18, 18–24)
  function buildDayBuckets(S) {
    const labels = ["0–6", "6–12", "12–18", "18–24"];
    const iso = todayLocalISO();
    const t = getDayTotals(S, iso);

    // Dispatch uniforme sur 24h : total / 4
    const q = (n) => (n || 0) / 4;
    const alc = effectiveAlcoholGroup(S, t);
    return {
      labels,
      series: {
        cigs:    [q(t.cigs), q(t.cigs), q(t.cigs), q(t.cigs)],
        weed:    [q(t.weed), q(t.weed), q(t.weed), q(t.weed)],
        alcohol: [q(alc.alcohol + alc.beer + alc.hard + alc.liqueur),
                  q(alc.alcohol + alc.beer + alc.hard + alc.liqueur),
                  q(alc.alcohol + alc.beer + alc.hard + alc.liqueur),
                  q(alc.alcohol + alc.beer + alc.hard + alc.liqueur)],
      },
      cost:     [q(calcCost(S, t)), q(calcCost(S, t)), q(calcCost(S, t)), q(calcCost(S, t))]
    };
  }

  // Semaine : 7 jours (J-6 … J)
  function buildWeekBuckets(S) {
    const end = todayLocalISO();
    const labels = [];
    const serC = [], serW = [], serA = [], serCost = [];
    for (let i = 6; i >= 0; i--) {
      const dISO = addDays(end, -i);
      const dt = new Date(dISO);
      labels.push(`${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth()+1).padStart(2, "0")}`);
      const t = getDayTotals(S, dISO);
      const alc = effectiveAlcoholGroup(S, t);
      serC.push(t.cigs || 0);
      serW.push(t.weed || 0);
      serA.push((alc.alcohol || 0) + (alc.beer||0) + (alc.hard||0) + (alc.liqueur||0));
      serCost.push(calcCost(S, t));
    }
    return {
      labels,
      series: { cigs: serC, weed: serW, alcohol: serA },
      cost: serCost
    };
  }

  // Mois : par semaine (S1..S6) sur le mois courant (index de semaine dans le mois)
  function buildMonthBuckets(S) {
    const todayISO = todayLocalISO();
    const startISO = startOfMonthISO(todayISO);
    const days = monthDaysCount(todayISO);
    // semaine # = Math.floor((dayIndex)/7)+1
    const labels = ["S1","S2","S3","S4","S5","S6"];
    const acc = {
      cigs: [0,0,0,0,0,0],
      weed: [0,0,0,0,0,0],
      alcohol: [0,0,0,0,0,0],
      cost: [0,0,0,0,0,0]
    };
    for (let i = 0; i < days; i++) {
      const dISO = addDays(startISO, i);
      const wk = Math.floor(i / 7); // 0..5
      const t = getDayTotals(S, dISO);
      const alc = effectiveAlcoholGroup(S, t);
      acc.cigs[wk] += t.cigs || 0;
      acc.weed[wk] += t.weed || 0;
      acc.alcohol[wk] += (alc.alcohol || 0) + (alc.beer||0) + (alc.hard||0) + (alc.liqueur||0);
      acc.cost[wk] += calcCost(S, t);
    }
    // Tronquer étiquettes & valeurs aux semaines réellement couvertes
    const usedWeeks = Math.ceil(days / 7);
    return {
      labels: labels.slice(0, usedWeeks),
      series: {
        cigs: acc.cigs.slice(0, usedWeeks),
        weed: acc.weed.slice(0, usedWeeks),
        alcohol: acc.alcohol.slice(0, usedWeeks)
      },
      cost: acc.cost.slice(0, usedWeeks)
    };
  }

  // Année : 12 mois (Jan..Déc) cumulés sur l’année courante
  function buildYearBuckets(S) {
    const now = new Date();
    const year = now.getFullYear();
    const labels = Array.from({length:12}, (_,i)=>monthLabel(true, i+1));
    const acc = {
      cigs: Array(12).fill(0),
      weed: Array(12).fill(0),
      alcohol: Array(12).fill(0),
      cost: Array(12).fill(0)
    };
    // Balayer l'historique
    const H = S.history || {};
    Object.keys(H).forEach(iso => {
      const [y, m] = iso.split("-").map(Number);
      if (y !== year) return;
      const t = getDayTotals(S, iso);
      const alc = effectiveAlcoholGroup(S, t);
      const idx = m - 1;
      acc.cigs[idx] += t.cigs || 0;
      acc.weed[idx] += t.weed || 0;
      acc.alcohol[idx] += (alc.alcohol || 0) + (alc.beer||0) + (alc.hard||0) + (alc.liqueur||0);
      acc.cost[idx] += calcCost(S, t);
    });
    // Ajouter la journée en cours
    const t0 = getDayTotals(S, todayLocalISO());
    const a0 = effectiveAlcoholGroup(S, t0);
    const m0 = now.getMonth();
    acc.cigs[m0] += t0.cigs || 0;
    acc.weed[m0] += t0.weed || 0;
    acc.alcohol[m0] += (a0.alcohol||0) + (a0.beer||0) + (a0.hard||0) + (a0.liqueur||0);
    acc.cost[m0] += calcCost(S, t0);

    return { labels, series: acc, cost: acc.cost };
  }

  // ---- Build data for currentView ----
  function buildData(S) {
    if (currentView === "day")   return buildDayBuckets(S);
    if (currentView === "week")  return buildWeekBuckets(S);
    if (currentView === "month") return buildMonthBuckets(S);
    return buildYearBuckets(S);
  }

  // ---- Config Chart.js ----
  function dataset(label, data, hidden = false) {
    return {
      label,
      data,
      tension: 0.2,
      pointRadius: 2,
      borderWidth: 2,
      hidden
      // (Pas de couleurs forcées → thème par défaut, compatible Firefox/WebView)
    };
  }

  function ensureCharts() {
    if (!hasChart()) return;
    const ctx1 = $("chart1")?.getContext?.("2d");
    const ctx2 = $("chart2")?.getContext?.("2d");
    if (!chart1 && ctx1) {
      chart1 = new Chart(ctx1, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top" } },
          scales: {
            x: { title: { display: false } },
            y: { beginAtZero: true, title: { display: false } }
          }
        }
      });
    }
    if (!chart2 && ctx2) {
      chart2 = new Chart(ctx2, {
        type: "line",
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top" } },
          scales: {
            x: { title: { display: false } },
            y: { beginAtZero: true, title: { display: false } }
          }
        }
      });
    }
  }

  function sum(arr) { return (arr || []).reduce((a,b)=>a + (Number(b)||0), 0); }

  // ---- Public API ----
  const ChartsAPI = {
    init(ctx) {
      const S = ctx?.S || window.S;
      if (!S) return;

      // Bind boutons de vue (si présents)
      const btnDay   = $("view-day");
      const btnWeek  = $("view-week");
      const btnMonth = $("view-month");
      const btnYear  = $("view-year");
      if (btnDay)   btnDay.onclick   = () => { currentView = "day";   ChartsAPI.refresh({ S }); };
      if (btnWeek)  btnWeek.onclick  = () => { currentView = "week";  ChartsAPI.refresh({ S }); };
      if (btnMonth) btnMonth.onclick = () => { currentView = "month"; ChartsAPI.refresh({ S }); };
      if (btnYear)  btnYear.onclick  = () => { currentView = "year";  ChartsAPI.refresh({ S }); };

      ensureCharts();
      ChartsAPI.refresh({ S });
    },

    refresh(ctx) {
      const S = ctx?.S || window.S;
      if (!S || !hasChart()) return;
      ensureCharts();

      const pack = buildData(S);
      const L = pack.labels;
      const ser = pack.series;

      // ---- Chart #1 : consommations ----
      if (chart1) {
        chart1.data.labels = L.slice();
        chart1.data.datasets = [
          dataset("Cigarettes", ser.cigs),
          dataset("Joints", ser.weed),
          dataset("Alcool (total)", ser.alcohol)
        ];
        chart1.update();
      }

      // ---- Chart #2 : coûts / économies ----
      // Coût : toujours calculable si prix saisis ; sinon 0 → on masque si série nulle
      const cost = (pack.cost || []);
      // Économies (affichage uniquement si on a de quoi estimer) :
      // Ici on fait simple : si objectifs ou stopDate définis, on montre une estimation basique
      // économies ≈ max(0, (baseline - réel) * prix) ; baseline = goal si dispo, sinon 0
      let savings = L.map(_ => 0);
      const hasGoals = (S.habits?.goal?.cigs || S.habits?.goal?.weed || S.habits?.goal?.alcohol);
      const hasStop  = !!S.habits?.stopDate;
      if (hasGoals || hasStop) {
        // baseline journalière : somme des goals disponibles (sinon 0)
        const G = S.habits?.goal || {};
        const price = S.prices || {};
        // estimation par vue : répartir baseline sur buckets (comme day/dispatch ou par jour/semaine/mois/année)
        const baselinePerUnit =
          (G.cigs||0)*(price.cigs||0) +
          (G.weed||0)*(price.weed||0) +
          (G.alcohol||0)*(price.alcohol||0); // si alcool global utilisé
        const baseBucket = (currentView === "day") ? baselinePerUnit / 4
                          : (currentView === "week") ? baselinePerUnit
                          : (currentView === "month") ? baselinePerUnit * 7
                          : baselinePerUnit * 30; // approx par mois

        // économies par bucket = max(0, baseline_coût - coût_réel_bucket)
        savings = cost.map(c => Math.max(0, (baseBucket || 0) - (c || 0)));
      }

      if (chart2) {
        chart2.data.labels = L.slice();
        chart2.data.datasets = [
          dataset("Coûts", cost, sum(cost) === 0),
          dataset("Économies (estim.)", savings, sum(savings) === 0)
        ];
        chart2.update();
      }
    }
  };

  // ---- Expose ----
  window.StopAddictCharts = ChartsAPI;
})();
