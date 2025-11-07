/* Settings page wiring (ES module) */
export function mountSettings(ctx) {
  const {
    S, DefaultState, saveState,
    persistTodayIntoHistory, updateHeader,
    renderChart, reflectCounters, dbg
  } = ctx;

  const $ = (s) => document.querySelector(s);

  /* ---------- helpers ---------- */
  function setChecked(id, v) { const el = $(id); if (el) el.checked = !!v; }
  function setVal(id, v)     { const el = $(id); if (el) el.value = v ?? ""; }
  function num(el)           { return Math.max(0, Number(el.value || 0)); }

  function replaceState(newS){
    // keep same reference object
    const fresh = typeof newS === "function" ? newS() : newS;
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, fresh);
    saveState(S);
    reflectCounters();
    updateHeader();
    renderChart();
    syncUI();
  }

  function applyAlcoholExclusivity(){
    const alcoholGlobal = $("#mod-alcohol")?.checked ?? false;

    const alList = [
      ["#mod-beer", "beer"],
      ["#mod-hard", "hard"],
      ["#mod-liqueur", "liqueur"]
    ];

    alList.forEach(([sel, key])=>{
      const box = $(sel);
      if (!box) return;
      if (alcoholGlobal){
        box.checked = false;
        box.disabled = true;
        S.modules[key] = false;
        S.today.active[key] = false;
      } else {
        box.disabled = false;
      }
    });
  }

  /* ---------- sync UI from state ---------- */
  function syncUI(){
    // Profile / i18n
    setVal("#profile-name", S.profile?.name ?? "");

    const langSel = $("#select-language");
    if (langSel && !langSel.options.length){
      ["fr-FR","en-US","es-ES","de-DE","it-IT"].forEach(l=>{
        const opt = document.createElement("option");
        opt.value = l; opt.textContent = l;
        langSel.appendChild(opt);
      });
    }
    if (langSel) langSel.value = S.locale || "fr-FR";

    // Currency
    setVal("#currency-symbol", S.currency?.symbol ?? "€");
    setChecked("#currency-before", S.currency?.position === "before");
    setChecked("#currency-after",  S.currency?.position !== "before");

    // Modules
    setChecked("#mod-cigs",    !!S.modules.cigs);
    setChecked("#mod-joints",  !!S.modules.joints);
    setChecked("#mod-beer",    !!S.modules.beer);
    setChecked("#mod-hard",    !!S.modules.hard);
    setChecked("#mod-liqueur", !!S.modules.liqueur);
    setChecked("#mod-alcohol", !!S.modules.alcohol);

    applyAlcoholExclusivity();

    // Prices
    setVal("#price-cigarette", (S.prices.cigarette ?? 0));
    setVal("#price-joint",     (S.prices.joint ?? 0));
    setVal("#price-beer",      (S.prices.beer ?? 0));
    setVal("#price-hard",      (S.prices.hard ?? 0));
    setVal("#price-liqueur",   (S.prices.liqueur ?? 0));

    // Debug overlay checkbox reflects visibility
    const dbgBox = $("#debug-console");
    if ($("#cb-debug-overlay") && dbgBox){
      $("#cb-debug-overlay").checked = !dbgBox.classList.contains("hide");
    }
  }

  /* ---------- events: profile / i18n ---------- */
  $("#profile-name")?.addEventListener("input", e=>{
    S.profile.name = e.target.value || "";
    saveState(S);
  });

  $("#select-language")?.addEventListener("change", e=>{
    S.locale = e.target.value || "fr-FR";
    saveState(S);
  });

  /* ---------- events: currency ---------- */
  $("#btn-apply-currency")?.addEventListener("click", ()=>{
    const sym = $("#currency-symbol")?.value || "€";
    const before = $("#currency-before")?.checked;
    S.currency = { symbol: sym, position: before ? "before" : "after", space: false };
    saveState(S);
    updateHeader();
    renderChart();
    dbg?.push?.("Devise appliquée","ok");
  });

  /* ---------- events: modules (with exclusivity) ---------- */
  const modMap = [
    ["#mod-cigs","cigs"], ["#mod-joints","joints"],
    ["#mod-beer","beer"], ["#mod-hard","hard"], ["#mod-liqueur","liqueur"],
    ["#mod-alcohol","alcohol"]
  ];
  modMap.forEach(([sel,key])=>{
    $(sel)?.addEventListener("change", (e)=>{
      const on = !!e.target.checked;
      S.modules[key] = on;

      // exclusivité alcool global
      if (key === "alcohol"){
        applyAlcoholExclusivity();
      }

      // si module off → inactif côté accueil
      if (!on && S.today?.active?.[key] !== undefined){
        S.today.active[key] = false;
      }

      saveState(S);
      reflectCounters();
      updateHeader();
      renderChart();
    });
  });

  /* ---------- events: prices ---------- */
  $("#btn-save-prices")?.addEventListener("click", ()=>{
    S.prices.cigarette = num($("#price-cigarette"));
    S.prices.joint     = num($("#price-joint"));
    S.prices.beer      = num($("#price-beer"));
    S.prices.hard      = num($("#price-hard"));
    S.prices.liqueur   = num($("#price-liqueur"));
    saveState(S);
    persistTodayIntoHistory();
    updateHeader();
    renderChart();
    dbg?.push?.("Prix enregistrés","ok");
  });

  $("#btn-reset-prices")?.addEventListener("click", ()=>{
    const def = DefaultState().prices;
    Object.assign(S.prices, def);
    saveState(S);
    syncUI();
    persistTodayIntoHistory();
    updateHeader();
    renderChart();
    dbg?.push?.("Prix réinitialisés","ok");
  });

  /* ---------- events: maintenance & backups ---------- */
  $("#btn-raz-day")?.addEventListener("click", ()=>{
    if (!S.today) S.today = DefaultState().today;
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    persistTodayIntoHistory();
    reflectCounters();
    updateHeader();
    renderChart();
    saveState(S);
    dbg?.push?.("RAZ du jour","ok");
  });

  $("#btn-raz-history")?.addEventListener("click", ()=>{
    S.history = {};
    persistTodayIntoHistory();
    updateHeader();
    renderChart();
    saveState(S);
    dbg?.push?.("RAZ historique","ok");
  });

  $("#btn-raz-factory")?.addEventListener("click", ()=>{
    replaceState(DefaultState);
    dbg?.push?.("RAZ réglages (usine)","ok");
  });

  $("#btn-save-json-settings")?.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_settings.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    dbg?.push?.("Export JSON (réglages) ok","ok");
  });

  $("#file-import-json-settings")?.addEventListener("change", async (ev)=>{
    const f = ev.target.files?.[0];
    if (!f) return;
    try{
      const txt = await f.text();
      const obj = JSON.parse(txt);
      replaceState(()=>({ ...DefaultState(), ...obj }));
      dbg?.push?.("Import JSON (réglages) ok","ok");
    }catch(e){
      alert("Import JSON invalide.");
      dbg?.push?.("Import JSON (réglages) erreur: "+(e?.message||e),"err");
    }finally{
      ev.target.value = "";
    }
  });

  /* ---------- events: debug overlay & resources ---------- */
  $("#cb-debug-overlay")?.addEventListener("change",(e)=>{
    const box = $("#debug-console");
    if (!box) return;
    box.classList.toggle("hide", !e.target.checked);
  });

  $("#btn-copy-logs")?.addEventListener("click", ()=>{
    const lines = S.debug?.logs || [];
    navigator.clipboard?.writeText(lines.join("\n")).then(()=>{
      dbg?.push?.("Logs copiés","ok");
    }).catch(()=>{});
  });

  $("#btn-clear-logs")?.addEventListener("click", ()=>{
    S.debug.logs = [];
    $("#debug-console")?.replaceChildren();
    saveState(S);
    dbg?.push?.("Logs nettoyés","ok");
  });

  // resources.js accroche déjà #btn-resources côté module

  /* ---------- init ---------- */
  syncUI();
}
