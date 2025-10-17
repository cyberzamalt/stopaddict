// web/fixes-monolith.js
// Patch tolérant pour: Import/Export, Graphes (Jour/Semaine/Mois), Economies/Coûts
// Sans casser ton HTML monolithique. Aucune dépendance externe.

(() => {
  // ---------- Utils stockage ----------
  const KEY = "sa:data";
  const safeParse = (t, def) => { try { return JSON.parse(t); } catch { return def; } };
  const load = () => {
    const def = {
      settings: {
        enable: { cigs: true, weed: false, alcohol: false },
        price: { pricePerPack: 0, cigsPerPack: 20, joint: 0, beer: 0, strong: 0, liquor: 0 },
        limits: { day: { cigs: 0, weed: 0, alcohol: 0 } }
      },
      entries: [] // { ts: ISO, type:'cig'|'weed'|'beer'|'strong'|'liquor', qty:1 }
    };
    return safeParse(localStorage.getItem(KEY), def);
  };
  const save = (data) => localStorage.setItem(KEY, JSON.stringify(data));
  let state = load();

  // ---------- Time helpers ----------
  const DAY_MS = 86400000;
  const startOfDay = (d=new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const inRange = (ts, a, b) => {
    const t = +new Date(ts);
    return t >= +a && t <= +b;
  };
  const isToday = (ts) => {
    const a = startOfDay();
    const b = new Date(+a + DAY_MS - 1);
    return inRange(ts, a, b);
  };

  // ---------- DOM helpers tolérants ----------
  const $  = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => Array.from(root.querySelectorAll(s));
  const byText = (text) => {
    // Recherche bouton par texte approx.
    text = text.toLowerCase();
    const btns = $$("button, a, input[type=button], input[type=submit]");
    return btns.find(b => (b.textContent||b.value||"").toLowerCase().includes(text));
  };

  // ---------- Import / Export ----------
  function setupImportExport() {
    // Cherche boutons existants par id OU par texte
    const btnImport = $("#btnImport") || byText("importer json") || byText("importer");
    const btnExportCsv = $("#btnExport, #btnExportCsv") || byText("exporter csv");
    const btnExportJson = $("#btnExportJson") || byText("exporter json");

    // Ajoute input file si absent
    let fileInput = $("#sa_file_json");
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "application/json";
      fileInput.id = "sa_file_json";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);
    }

    // Zone feedback si possible
    const feedback = $("#feedback") || (() => {
      const p = document.createElement("p");
      p.id = "sa_feedback";
      p.style.margin = ".5rem 0";
      const target = btnImport?.closest("section") || $("main") || document.body;
      target.appendChild(p);
      return p;
    })();
    const flash = (msg, kind="info") => {
      feedback.textContent = msg;
      feedback.className = `feedback ${kind}`;
      setTimeout(()=>{ feedback.textContent=""; feedback.className=""; }, 3500);
    };

    // Import JSON
    if (btnImport) {
      btnImport.addEventListener("click", () => fileInput.click());
    }
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files?.[0]; if (!f) return;
      try {
        const txt = await f.text();
        const json = JSON.parse(txt);
        if (json.settings) state.settings = { ...state.settings, ...json.settings };
        if (Array.isArray(json.entries)) state.entries = json.entries;
        save(state);
        document.dispatchEvent(new CustomEvent("sa:imported"));
        flash("Import réussi. Données enregistrées (local).", "ok");
      } catch(e) {
        flash("Import invalide.", "error");
      } finally {
        fileInput.value = "";
      }
    });

    // Export CSV
    const exportCsv = () => {
      const rows = [["ts","type","qty"]];
      for (const e of state.entries) rows.push([e.ts, e.type, e.qty ?? 1]);
      const csv = rows.map(r=>r.join(",")).join("\n");
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "stopaddict_export.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    };
    if (btnExportCsv) btnExportCsv.addEventListener("click", exportCsv);

    // Export JSON (optionnel)
    const exportJson = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "stopaddict_export.json";
      a.click();
      URL.revokeObjectURL(a.href);
    };
    if (btnExportJson) btnExportJson.addEventListener("click", exportJson);
  }

  // ---------- Coûts / Économies ----------
  function sumToday(types) {
    return state.entries
      .filter(e => types.includes(e.type) && isToday(e.ts))
      .reduce((s,e)=> s + (e.qty || 1), 0);
  }
  function costToday() {
    const p = state.settings.price || {};
    const cigs = sumToday(["cig"]);
    const weed = sumToday(["weed"]);
    const beer = sumToday(["beer"]);
    const strong = sumToday(["strong"]);
    const liquor = sumToday(["liquor"]);
    const cigCost = p.pricePerPack && p.cigsPerPack ? (cigs / p.cigsPerPack) * p.pricePerPack : 0;
    const weedCost = weed * (p.joint||0);
    const alcoCost = beer*(p.beer||0) + strong*(p.strong||0) + liquor*(p.liquor||0);
    return (cigCost + weedCost + alcoCost) || 0;
  }
  function economiesHint() {
    const L = (state.settings.limits && state.settings.limits.day) || {};
    const p = state.settings.price || {};
    let euros = 0;
    if (L.cigs) {
      const left = Math.max(0, L.cigs - sumToday(["cig"]));
      euros += p.pricePerPack && p.cigsPerPack ? (left / p.cigsPerPack) * p.pricePerPack : 0;
    }
    if (L.weed) {
      euros += Math.max(0, L.weed - sumToday(["weed"])) * (p.joint||0);
    }
    if (L.alcohol) {
      const left = Math.max(0, L.alcohol - sumToday(["beer","strong","liquor"]));
      const avg = ((p.beer||0) + (p.strong||0) + (p.liquor||0)) / 3;
      euros += left * (avg || 0);
    }
    return euros || 0;
  }
  function paintEconomies() {
    const cost = costToday();
    const eco  = economiesHint();

    // Tente de remplir des emplacements connus, sinon crée un petit bloc
    const costEl = $("#todayCost, #costDay, #sa_cost_today");
    const ecoEl  = $("#economies-amount, #sa_eco_today");

    if (costEl) costEl.textContent = (Math.round(cost*100)/100).toFixed(2) + " €";
    if (ecoEl)  ecoEl.textContent  = (Math.round(eco*100)/100).toFixed(2) + " €";

    if (!ecoEl) {
      let box = $("#sa_eco_box");
      if (!box) {
        box = document.createElement("div");
        box.id = "sa_eco_box";
        box.style.margin = "12px 16px";
        box.style.padding = "10px 12px";
        box.style.borderRadius = "10px";
        box.style.background = "#f8fafc";
        box.style.border = "1px solid #e5e7eb";
        const hdr = document.createElement("div");
        hdr.textContent = "Économies (estimation)";
        hdr.style.fontWeight = "600";
        hdr.style.marginBottom = "4px";
        const p1 = document.createElement("div");
        p1.id = "sa_eco_today";
        p1.style.fontSize = "15px";
        box.appendChild(hdr);
        box.appendChild(p1);
        // insère sous la zone stats si possible
        const target = $(".stats, #stats, main") || document.body;
        target.appendChild(box);
      }
      $("#sa_eco_today").textContent = (Math.round(eco*100)/100).toFixed(2) + " €";
    }
  }

  // ---------- Graphiques ----------
  function ensureCanvas() {
    // essaie de trouver le canvas existant; sinon on en crée un
    let canvas = $("#chartCanvas, canvas.sa_chart");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 260;
      canvas.className = "sa_chart";
      const holder = $(".chart-holder, .stats, #stats") || $("main") || document.body;
      holder.appendChild(canvas);
    }
    return canvas.getContext("2d");
  }
  function enabledTypes() {
    const en = (state.settings && state.settings.enable) || {};
    const all = [];
    if (en.cigs) all.push("cig");
    if (en.weed) all.push("weed");
    if (en.alcohol) all.push("beer","strong","liquor");
    return all.length ? all : ["cig","weed","beer","strong","liquor"];
  }
  function bucketsDay(list) {
    const a = startOfDay(new Date());
    const b = new Date(+a + DAY_MS - 1);
    const buckets = Array(24).fill(0);
    for (const e of list) {
      const t = new Date(e.ts);
      if (t >= a && t <= b) buckets[t.getHours()] += (e.qty||1);
    }
    return { labels: Array.from({length:24}, (_,h)=>`${h}h`), data: buckets };
  }
  function bucketsWeek(list) {
    const a = startOfDay(new Date());
    const day = (a.getDay() || 7) - 1; // lun=0..dim=6
    a.setDate(a.getDate() - day);
    const buckets = Array(7).fill(0);
    for (const e of list) {
      const t0 = startOfDay(new Date(e.ts));
      const idx = Math.floor((t0 - a)/DAY_MS);
      if (idx>=0 && idx<7) buckets[idx] += (e.qty||1);
    }
    return { labels: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"], data: buckets };
  }
  function bucketsMonth(list) {
    const now = new Date();
    const a = new Date(now.getFullYear(), now.getMonth(), 1);
    const days = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const buckets = Array(days).fill(0);
    for (const e of list) {
      const t = new Date(e.ts);
      if (t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear()) {
        buckets[t.getDate()-1] += (e.qty||1);
      }
    }
    return { labels: Array.from({length:days},(_,i)=>String(i+1)), data: buckets };
  }
  function draw(ctx, labels, data, limitLine=0) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    const pad = 32;
    const innerW = W - pad*2;
    const innerH = H - pad*2;
    const maxVal = Math.max(1, ...data, limitLine||0);
    const barW = innerW / data.length;

    // axes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H-pad); ctx.lineTo(W-pad, H-pad);
    ctx.moveTo(pad, pad);   ctx.lineTo(pad, H-pad);
    ctx.stroke();

    // barres
    ctx.fillStyle = "#0ea5e9";
    data.forEach((v,i)=>{
      const h = (v/maxVal)*(innerH-10);
      const x = pad + i*barW + 2;
      const y = H - pad - h;
      ctx.fillRect(x, y, Math.max(2, barW-4), h);
    });

    // ligne de limite (si jour)
    if (limitLine) {
      const y = H - pad - (limitLine/maxVal)*(innerH-10);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.setLineDash([6,6]);
      ctx.beginPath();
      ctx.moveTo(pad, y); ctx.lineTo(W-pad, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // labels X (échantillonnés)
    ctx.fillStyle = "#475569";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const skip = Math.ceil(labels.length/12);
    labels.forEach((lab,i)=>{
      if (i%skip!==0) return;
      const x = pad + i*barW + barW/2;
      ctx.fillText(lab, x-10, H - pad + 14);
    });
  }
  function computeDayLimit() {
    const L = (state.settings.limits && state.settings.limits.day) || {};
    const en = state.settings.enable || {};
    let limit = 0;
    if (en.cigs)    limit += +L.cigs    || 0;
    if (en.weed)    limit += +L.weed    || 0;
    if (en.alcohol) limit += +L.alcohol || 0;
    return limit || 0;
  }
  function setupCharts() {
    const ctx = ensureCanvas();
    const types = () => enabledTypes();
    let range = "day";

    // essaie de capter tes onglets “Jour/Semaine/Mois”
    const btnDay = byText("jour")   || $("[data-range=day]");
    const btnWeek= byText("semaine")|| $("[data-range=week]");
    const btnMonth=byText("mois")   || $("[data-range=month]");

    const render = () => {
      const list = state.entries.filter(e => types().includes(e.type));
      let pack;
      if (range==="week")  pack = bucketsWeek(list);
      else if (range==="month") pack = bucketsMonth(list);
      else pack = bucketsDay(list);
      draw(ctx, pack.labels, pack.data, range==="day" ? computeDayLimit() : 0);
    };

    btnDay   && btnDay.addEventListener("click", ()=>{ range="day";   render(); });
    btnWeek  && btnWeek.addEventListener("click", ()=>{ range="week";  render(); });
    btnMonth && btnMonth.addEventListener("click", ()=>{ range="month"; render(); });

    // écoute modifications
    document.addEventListener("sa:changed", render);
    document.addEventListener("sa:settingsSaved", render);
    document.addEventListener("sa:imported", render);
    window.addEventListener("resize", render);

    render();
  }

  // ---------- Rebrancher +/- si besoin pour emettre des events ----------
  function hookCounters() {
    document.addEventListener("click", (e)=>{
      const b = e.target.closest("button");
      if (!b) return;
      if (b.classList.contains("plus") || b.classList.contains("minus")) {
        // après tout clic ±, republie un event pour graphs/éco
        setTimeout(()=>{
          state = load(); // recharge pour rester sync avec ton JS existant
          document.dispatchEvent(new CustomEvent("sa:changed"));
          paintEconomies();
        }, 0);
      }
    });
  }

  // ---------- Boot ----------
  function boot() {
    setupImportExport();
    setupCharts();
    paintEconomies();
    hookCounters();
  }
  // retard léger pour laisser le JS existant s’initialiser
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(boot, 50);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 50));
  }
})();
