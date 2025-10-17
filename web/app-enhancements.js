/* StopAddict – Surcouche Plan A (monolith)
   - Import JSON robuste (fusion non destructive)
   - Export CSV propre
   - Compteurs +/− (si présents)
   - Stats en-tête (Aujourd’hui / Semaine / Mois / Coût jour)
   - Économies (estimation simple, jamais négative)
   - Limites (proche/dépassée via classes .warn / .over si disponibles)
   - Graphique (24h / semaine / mois) si un <canvas id="chartCanvas"> existe
   - Tolérant : ne plante pas si certains blocs ne sont pas dans ta page
*/

(function () {
  // --------- Utils temps ---------
  const DAY_MS = 86400000;
  const $ = (sel) => document.querySelector(sel);

  function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function inRange(ts, a, b) {
    const t = +new Date(ts);
    return t >= +a && t <= +b;
    }
  function startOfWeek(d = new Date()) {
    const x = startOfDay(d);
    const day = x.getDay() || 7; // lun=1..dim=7
    x.setDate(x.getDate() - (day - 1));
    return x;
  }
  function startOfMonth(d = new Date()) {
    const x = startOfDay(d);
    x.setDate(1);
    return x;
  }

  // --------- Stockage ----------
  const KEY = "sa:data";
  function load() {
    const def = {
      settings: {
        enable: { cigs: true, weed: false, alcohol: false },
        price: {
          pricePerPack: 10, cigsPerPack: 20,
          joint: 5, beer: 2.5, strong: 3, liquor: 4
        },
        limits: { day: { cigs: 0, weed: 0, alcohol: 0 } }
      },
      entries: [] // {ts: ISO, type:'cig'|'weed'|'beer'|'strong'|'liquor', qty:1}
    };
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : def;
    } catch {
      return def;
    }
  }
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  let state = load();

  // --------- Sélecteurs tolérants (si existent) ----------
  const el = {
    // toggles
    enableCigs: $("#enableCigs"),
    enableWeed: $("#enableWeed"),
    enableAlcohol: $("#enableAlcohol"),

    // cartes
    cardCigs: $("#cardCigs"),
    cardWeed: $("#cardWeed"),
    cardAlcohol: $("#cardAlcohol"),

    // compteurs jour
    cigsToday: $("#cigsToday"),
    weedToday: $("#weedToday"),
    alcoToday: $("#alcoToday"),

    // en-tête stats
    todayTotal: $("#todayTotal"),
    weekTotal: $("#weekTotal"),
    monthTotal: $("#monthTotal"),
    todayCost: $("#todayCost"),

    // limites (affichage)
    limitCigs: $("#limitCigs"),
    limitWeed: $("#limitWeed"),
    limitAlcohol: $("#limitAlcohol"),

    // champs réglages (si présents dans ta page)
    pricePack: $("#pricePack"),
    cigsPerPack: $("#cigsPerPack"),
    priceJoint: $("#priceJoint"),
    priceBeer: $("#priceBeer"),
    priceStrong: $("#priceStrong"),
    priceLiquor: $("#priceLiquor"),
    limitDayCigs: $("#limitDayCigs"),
    limitDayWeed: $("#limitDayWeed"),
    limitDayAlcohol: $("#limitDayAlcohol"),
    btnSaveSettings: $("#btnSaveSettings"),

    // import/export
    btnImport: $("#btnImport"),
    fileJson: $("#fileJson"),
    btnExport: $("#btnExport"),
    feedback: $("#feedback"),
    preview: $("#preview"),

    // limites alertes
    alertCigs: $("#alertCigs"),
    alertWeed: $("#alertWeed"),
    alertAlcohol: $("#alertAlcohol"),

    // graphique (optionnel)
    chartCanvas: $("#chartCanvas"),
    chartButtons: document.querySelectorAll("#chartRange .btn")
  };

  // --------- Rendu / logique ----------
  function sumInRange(types, a, b) {
    let total = 0;
    for (const e of state.entries) {
      if (!types.includes(e.type)) continue;
      if (inRange(e.ts, a, b)) total += (e.qty || 1);
    }
    return total;
  }
  function sumToday(types) {
    const a = startOfDay(new Date());
    const b = new Date(+a + DAY_MS - 1);
    return sumInRange(types, a, b);
  }

  // coûts & économies
  function costToday() {
    const p = state.settings.price || {};
    const cigs = sumToday(["cig"]);
    const weed = sumToday(["weed"]);
    const beer = sumToday(["beer"]);
    const strong = sumToday(["strong"]);
    const liquor = sumToday(["liquor"]);

    const cigCost = p.pricePerPack && p.cigsPerPack ? (cigs / p.cigsPerPack) * p.pricePerPack : 0;
    const weedCost = weed * (p.joint || 0);
    const alcoCost = beer * (p.beer || 0) + strong * (p.strong || 0) + liquor * (p.liquor || 0);
    return (cigCost + weedCost + alcoCost) || 0;
  }

  function economiesHint() {
    // Estimation simple basée sur limites/jour si définies
    const L = (state.settings.limits && state.settings.limits.day) || {};
    const p = state.settings.price || {};
    let euros = 0;

    if (L.cigs) {
      const left = Math.max(0, L.cigs - sumToday(["cig"]));
      euros += p.pricePerPack && p.cigsPerPack ? (left / p.cigsPerPack) * p.pricePerPack : 0;
    }
    if (L.weed) {
      const left = Math.max(0, L.weed - sumToday(["weed"]));
      euros += left * (p.joint || 0);
    }
    if (L.alcohol) {
      const left = Math.max(0, L.alcohol - sumToday(["beer", "strong", "liquor"]));
      const avg = ((p.beer || 0) + (p.strong || 0) + (p.liquor || 0)) / 3;
      euros += left * (avg || 0);
    }
    return Math.max(0, euros || 0);
  }

  function renderHeaderStats() {
    if (!el.todayTotal && !el.todayCost) return;

    const a = startOfDay();
    const b = new Date(+a + DAY_MS - 1);
    const wA = startOfWeek();
    const wB = new Date(+wA + 7 * DAY_MS - 1);
    const mA = startOfMonth();
    const mB = new Date(mA.getFullYear(), mA.getMonth() + 1, 0, 23, 59, 59, 999);

    const typesAll = ["cig", "weed", "beer", "strong", "liquor"];

    if (el.todayTotal) el.todayTotal.textContent = sumInRange(typesAll, a, b);
    if (el.weekTotal) el.weekTotal.textContent = sumInRange(typesAll, wA, wB);
    if (el.monthTotal) el.monthTotal.textContent = sumInRange(typesAll, mA, mB);
    if (el.todayCost) el.todayCost.textContent = costToday().toFixed(2) + " €";

    const eco = $("#economies-amount");
    if (eco) eco.textContent = economiesHint().toFixed(2) + " €";
  }

  function renderCountersCards() {
    if (el.cigsToday) el.cigsToday.textContent = sumToday(["cig"]);
    if (el.weedToday) el.weedToday.textContent = sumToday(["weed"]);
    if (el.alcoToday) el.alcoToday.textContent = sumToday(["beer", "strong", "liquor"]);

    const L = (state.settings.limits && state.settings.limits.day) || {};
    if (el.limitCigs) el.limitCigs.textContent = L.cigs ? `Limite jour: ${L.cigs}` : "";
    if (el.limitWeed) el.limitWeed.textContent = L.weed ? `Limite jour: ${L.weed}` : "";
    if (el.limitAlcohol) el.limitAlcohol.textContent = L.alcohol ? `Limite jour: ${L.alcohol}` : "";
  }

  function renderActivation() {
    const en = (state.settings && state.settings.enable) || {};
    if (el.cardCigs) el.cardCigs.classList.toggle("hide", !en.cigs);
    if (el.cardWeed) el.cardWeed.classList.toggle("hide", !en.weed);
    if (el.cardAlcohol) el.cardAlcohol.classList.toggle("hide", !en.alcohol);
    if (el.enableCigs) el.enableCigs.checked = !!en.cigs;
    if (el.enableWeed) el.enableWeed.checked = !!en.weed;
    if (el.enableAlcohol) el.enableAlcohol.checked = !!en.alcohol;
  }

  function applyAlert(card, alertEl, enabled, total, limit) {
    if (!card || !alertEl) return;
    card.classList.remove("warn", "over");
    alertEl.classList.add("hide");
    alertEl.textContent = "";
    if (!enabled || !limit || limit <= 0) return;

    if (total >= limit) {
      card.classList.add("over");
      alertEl.classList.remove("hide");
      alertEl.textContent = `⚠ Limite dépassée (${total} / ${limit}).`;
    } else if (total >= Math.ceil(limit * 0.8)) {
      card.classList.add("warn");
      alertEl.classList.remove("hide");
      alertEl.textContent = `⚠ Proche de la limite (${total} / ${limit}).`;
    }
  }

  function renderLimitsAlerts() {
    const en = (state.settings && state.settings.enable) || {};
    const L = (state.settings.limits && state.settings.limits.day) || {};
    applyAlert(el.cardCigs, el.alertCigs, !!en.cigs, sumToday(["cig"]), +L.cigs || 0);
    applyAlert(el.cardWeed, el.alertWeed, !!en.weed, sumToday(["weed"]), +L.weed || 0);
    applyAlert(el.cardAlcohol, el.alertAlcohol, !!en.alcohol, sumToday(["beer", "strong", "liquor"]), +L.alcohol || 0);
  }

  function renderAll() {
    renderActivation();
    renderCountersCards();
    renderHeaderStats();
    renderLimitsAlerts();
    renderChart(); // si canvas présent
  }

  // --------- Actions +/− (si boutons présents) ----------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.classList.contains("plus")) {
      const type = btn.dataset.type;
      if (type) {
        state.entries.push({ ts: new Date().toISOString(), type, qty: 1 });
        save(state);
        renderAll();
      }
    }
    if (btn.classList.contains("minus")) {
      const type = btn.dataset.type;
      if (type) {
        for (let i = state.entries.length - 1; i >= 0; i--) {
          const e = state.entries[i];
          const a = startOfDay();
          const b = new Date(+a + DAY_MS - 1);
          if (e.type === type && inRange(e.ts, a, b)) { state.entries.splice(i, 1); break; }
        }
        save(state);
        renderAll();
      }
    }
  });

  // --------- Réglages (si présents) ----------
  if (el.btnSaveSettings) {
    el.btnSaveSettings.onclick = () => {
      const p = state.settings.price || {};
      const L = (state.settings.limits && state.settings.limits.day) || {};

      if (el.pricePack)    p.pricePerPack = +el.pricePack.value || 0;
      if (el.cigsPerPack)  p.cigsPerPack  = +el.cigsPerPack.value || 20;
      if (el.priceJoint)   p.joint        = +el.priceJoint.value || 0;
      if (el.priceBeer)    p.beer         = +el.priceBeer.value || 0;
      if (el.priceStrong)  p.strong       = +el.priceStrong.value || 0;
      if (el.priceLiquor)  p.liquor       = +el.priceLiquor.value || 0;

      state.settings.price = p;

      const D = {};
      if (el.limitDayCigs)    D.cigs    = +el.limitDayCigs.value || 0;
      if (el.limitDayWeed)    D.weed    = +el.limitDayWeed.value || 0;
      if (el.limitDayAlcohol) D.alcohol = +el.limitDayAlcohol.value || 0;
      state.settings.limits = state.settings.limits || {};
      state.settings.limits.day = D;

      if (el.enableCigs)    state.settings.enable.cigs = !!el.enableCigs.checked;
      if (el.enableWeed)    state.settings.enable.weed = !!el.enableWeed.checked;
      if (el.enableAlcohol) state.settings.enable.alcohol = !!el.enableAlcohol.checked;

      save(state);
      flash("Réglages enregistrés.", "ok");
      renderAll();
    };
  }

  function flash(msg, kind = "info") {
    if (!el.feedback) return;
    el.feedback.className = "feedback " + kind;
    el.feedback.textContent = msg;
    setTimeout(() => {
      el.feedback.className = "feedback";
      el.feedback.textContent = "";
    }, 3000);
  }

  // --------- Import / Export ----------
  if (el.btnImport && el.fileJson) {
    el.btnImport.onclick = () => el.fileJson.click();
    el.fileJson.onchange = async () => {
      const f = el.fileJson.files?.[0];
      if (!f) return;
      try {
        const txt = await f.text();
        const json = JSON.parse(txt);
        // Fusion non destructive
        if (json.settings) {
          state.settings = {
            ...state.settings,
            ...json.settings,
            enable: { ...(state.settings.enable||{}), ...((json.settings||{}).enable||{}) },
            price:  { ...(state.settings.price||{}),  ...((json.settings||{}).price||{})  },
            limits: { ...(state.settings.limits||{}), ...((json.settings||{}).limits||{}) }
          };
        }
        if (Array.isArray(json.entries)) state.entries = json.entries;
        save(state);
        if (el.preview) { el.preview.hidden = false; el.preview.textContent = JSON.stringify(json, null, 2); }
        flash("Import réussi. Données enregistrées.", "ok");
        renderAll();
        document.dispatchEvent(new CustomEvent("sa:imported"));
      } catch {
        flash("Import invalide.", "error");
      } finally {
        el.fileJson.value = "";
      }
    };
  }

  if (el.btnExport) {
    el.btnExport.onclick = () => {
      const rows = [["ts", "type", "qty"]];
      for (const e of state.entries) rows.push([e.ts, e.type, e.qty ?? 1]);
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "stopaddict_export.csv";
      a.click();
      URL.revokeObjectURL(a.href);
      flash("Export CSV prêt.", "ok");
    };
  }

  // --------- Graphique simple (canvas 2D maison) ----------
  function bucketizeDay(entries) {
    const a = startOfDay(new Date());
    const b = new Date(+a + DAY_MS - 1);
    const buckets = Array(24).fill(0);
    for (const e of entries) {
      const t = new Date(e.ts);
      if (t >= a && t <= b) buckets[t.getHours()] += (e.qty || 1);
    }
    return { labels: Array.from({ length: 24 }, (_, h) => `${h}h`), data: buckets };
  }
  function bucketizeWeek(entries) {
    const a = startOfWeek(new Date());
    const buckets = Array(7).fill(0);
    for (const e of entries) {
      const t = startOfDay(new Date(e.ts));
      const idx = Math.floor((t - a) / DAY_MS);
      if (idx >= 0 && idx < 7) buckets[idx] += (e.qty || 1);
    }
    return { labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"], data: buckets };
  }
  function bucketizeMonth(entries) {
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const buckets = Array(days).fill(0);
    for (const e of entries) {
      const t = new Date(e.ts);
      if (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear()) {
        buckets[t.getDate() - 1] += (e.qty || 1);
      }
    }
    return { labels: Array.from({ length: days }, (_, i) => String(i + 1)), data: buckets };
  }
  function getEnabledTypes() {
    const en = (state.settings && state.settings.enable) || {};
    const all = [];
    if (en.cigs) all.push("cig");
    if (en.weed) all.push("weed");
    if (en.alcohol) all.push("beer", "strong", "liquor");
    return all.length ? all : ["cig", "weed", "beer", "strong", "liquor"];
  }

  function computeDayLimitSum() {
    const L = (state.settings.limits && state.settings.limits.day) || {};
    const en = (state.settings && state.settings.enable) || {};
    let s = 0;
    if (en.cigs)    s += +L.cigs    || 0;
    if (en.weed)    s += +L.weed    || 0;
    if (en.alcohol) s += +L.alcohol || 0;
    return s || 0;
  }

  function drawChart(ctx, labels, data, opts = {}) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = 32;
    const innerW = W - pad * 2;
    const innerH = H - pad * 2;

    const maxVal = Math.max(1, ...data, opts.limitLine || 0);
    const barW = innerW / data.length;

    // axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, H - pad);
    ctx.stroke();

    // barres
    ctx.fillStyle = "#0ea5e9";
    data.forEach((v, i) => {
      const h = (v / maxVal) * (innerH - 10);
      const x = pad + i * barW + 2;
      const y = H - pad - h;
      ctx.fillRect(x, y, Math.max(2, barW - 4), h);
    });

    // ligne limite
    if (opts.limitLine) {
      const y = H - pad - (opts.limitLine / maxVal) * (innerH - 10);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(W - pad, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // labels X (échantillonnés)
    ctx.fillStyle = "#475569";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const skip = Math.ceil(labels.length / 12);
    labels.forEach((lab, i) => {
      if (i % skip !== 0) return;
      const x = pad + i * barW + barW / 2;
      ctx.fillText(lab, x - 10, H - pad + 14);
    });
  }

  // état du graphe (si boutons présents)
  let chartRange = "day";
  if (el.chartButtons && el.chartButtons.length) {
    el.chartButtons.forEach((b) => {
      b.addEventListener("click", () => {
        el.chartButtons.forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        chartRange = b.dataset.range || "day";
        renderChart();
      });
    });
  }

  function renderChart() {
    if (!el.chartCanvas) return;
    const ctx = el.chartCanvas.getContext("2d");
    const types = getEnabledTypes();
    const list = state.entries.filter(e => types.includes(e.type));

    let labels, data;
    if (chartRange === "week") {
      ({ labels, data } = bucketizeWeek(list));
    } else if (chartRange === "month") {
      ({ labels, data } = bucketizeMonth(list));
    } else {
      ({ labels, data } = bucketizeDay(list));
    }
    const opts = { limitLine: chartRange === "day" ? computeDayLimitSum() : 0 };
    drawChart(ctx, labels, data, opts);
  }

  // --------- Bootstrap ----------
  function bindTogglesIfAny() {
    if (el.enableCigs) el.enableCigs.onchange = () => { state.settings.enable.cigs = el.enableCigs.checked; save(state); renderAll(); };
    if (el.enableWeed) el.enableWeed.onchange = () => { state.settings.enable.weed = el.enableWeed.checked; save(state); renderAll(); };
    if (el.enableAlcohol) el.enableAlcohol.onchange = () => { state.settings.enable.alcohol = el.enableAlcohol.checked; save(state); renderAll(); };
  }

  function init() {
    bindTogglesIfAny();
    renderAll();
    // redraw on resize si canvas
    if (el.chartCanvas) window.addEventListener("resize", renderChart);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
