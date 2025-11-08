/* web/js/settings.js — Panneau Réglages (ES module) */

export function mountSettings(ctx){
  const {
    S, DefaultState, saveState,
    persistTodayIntoHistory, updateHeader,
    renderChart, reflectCounters, dbg
  } = ctx;

  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // ---------- Helpers ----------
  const setVal = (sel, val="") => { const el=$(sel); if(el) el.value = val ?? ""; };
  const setNum = (sel, val=0)  => { const el=$(sel); if(el) el.value = Number(val ?? 0); };
  const setChk = (sel, on=false)=> { const el=$(sel); if(el) el.checked = !!on; };
  const getNum = (sel) => Number($(sel)?.value || 0);

  function syncAll(){
    // Profil
    setVal("#profile-name", S.profile?.name || "");
    // Langues (placeholder simple)
    const langSel = $("#select-language");
    if (langSel && !langSel.dataset.bound){
      langSel.innerHTML = `
        <option value="fr">Français</option>
        <option value="en">English</option>
      `;
      langSel.dataset.bound = "1";
    }
    if (langSel) langSel.value = S.language || "fr";

    // Devise
    setVal("#currency-symbol", S.currency?.symbol || "€");
    const before = S.currency?.position === "before";
    setChk("#currency-before", before);
    setChk("#currency-after", !before);

    // Modules
    setChk("#mod-cigs",    !!S.modules.cigs);
    setChk("#mod-joints",  !!S.modules.joints);
    setChk("#mod-beer",    !!S.modules.beer);
    setChk("#mod-hard",    !!S.modules.hard);
    setChk("#mod-liqueur", !!S.modules.liqueur);
    setChk("#mod-alcohol", !!S.modules.alcohol);

    // Prix unitaires
    setNum("#price-cigarette", S.prices?.cigarette ?? 0);
    setNum("#price-joint",     S.prices?.joint ?? 0);
    setNum("#price-beer",      S.prices?.beer ?? 0);
    setNum("#price-hard",      S.prices?.hard ?? 0);
    setNum("#price-liqueur",   S.prices?.liqueur ?? 0);

    // Overlay debug (état = visible ?)
    const dbgBox = $("#debug-console");
    setChk("#cb-debug-overlay", dbgBox && !dbgBox.classList.contains("hide"));
  }

  // ---------- Listeners (idempotents) ----------
  // Evite double-câblage si mountSettings est rappelé
  if (document.body.dataset.settingsBound === "1") {
    syncAll();
    return;
  }
  document.body.dataset.settingsBound = "1";

  // Profil
  $("#profile-name")?.addEventListener("input", (e)=>{
    S.profile = S.profile || {};
    S.profile.name = e.target.value || "";
    saveState(S);
  });

  $("#select-language")?.addEventListener("change", (e)=>{
    S.language = e.target.value || "fr";
    saveState(S);
    dbg?.push?.(`Langue: ${S.language}`,"ok");
  });

  // Devise
  $("#btn-apply-currency")?.addEventListener("click", ()=>{
    const sym = $("#currency-symbol")?.value || "€";
    const posBefore = $("#currency-before")?.checked ? "before" : "after";
    S.currency = { symbol: sym, position: posBefore };
    saveState(S);
    updateHeader?.();
    renderChart?.();
    dbg?.push?.("Devise appliquée","ok");
  });

  // Modules (avec exclusivité Alcool global vs sous-modules)
  function applyAlcoholExclusivity(){
    if (S.modules.alcohol) {
      // désactive sous-modules + actives day flags off
      ["beer","hard","liqueur"].forEach(k=>{
        S.modules[k] = false;
        S.today.active[k] = false;
        const homeToggle = document.querySelector(`#chk-${k}-active`);
        if (homeToggle) homeToggle.checked = false;
      });
    }
  }
  function onModuleToggle(id, key){
    const el = $(id); if(!el) return;
    el.addEventListener("change", ()=>{
      S.modules[key] = !!el.checked;
      if (!S.modules[key]) {
        // si module OFF, désactive le “Activer” du jour
        S.today.active[key] = false;
        const homeToggle = document.querySelector(`#chk-${key}-active`);
        if (homeToggle) homeToggle.checked = false;
      } else {
        // si module ON, on ne force pas le “Activer” (laisse l’utilisateur décider depuis l’accueil)
        if (typeof S.today.active[key] === "undefined") S.today.active[key] = true;
      }

      // Exclusivité alcool
      if (key === "alcohol") {
        applyAlcoholExclusivity();
        setChk("#mod-beer"   , !!S.modules.beer);
        setChk("#mod-hard"   , !!S.modules.hard);
        setChk("#mod-liqueur", !!S.modules.liqueur);
      } else if (["beer","hard","liqueur"].includes(key) && el.checked) {
        // si un sous-module est activé, on désactive l'alcohol global
        S.modules.alcohol = false;
        setChk("#mod-alcohol", false);
      }

      reflectCounters?.();
      updateHeader?.();
      saveState(S);
      dbg?.push?.(`Module ${key}: ${S.modules[key]?"ON":"OFF"}`, "event");
    });
  }
  onModuleToggle("#mod-cigs"   ,"cigs");
  onModuleToggle("#mod-joints" ,"joints");
  onModuleToggle("#mod-beer"   ,"beer");
  onModuleToggle("#mod-hard"   ,"hard");
  onModuleToggle("#mod-liqueur","liqueur");
  onModuleToggle("#mod-alcohol","alcohol");

  // Prix
  $("#btn-save-prices")?.addEventListener("click", ()=>{
    S.prices = S.prices || {};
    S.prices.cigarette = getNum("#price-cigarette");
    S.prices.joint     = getNum("#price-joint");
    S.prices.beer      = getNum("#price-beer");
    S.prices.hard      = getNum("#price-hard");
    S.prices.liqueur   = getNum("#price-liqueur");
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();
    saveState(S);
    dbg?.push?.("Prix enregistrés","ok");
  });

  $("#btn-reset-prices")?.addEventListener("click", ()=>{
    const def = DefaultState()?.prices || {};
    S.prices = { ...def };
    syncAll();
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();
    saveState(S);
    dbg?.push?.("Prix réinitialisés","ok");
  });

  // Maintenance
  $("#btn-raz-day")?.addEventListener("click", ()=>{
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    persistTodayIntoHistory?.();
    reflectCounters?.();
    updateHeader?.();
    renderChart?.();
    saveState(S);
    dbg?.push?.("RAZ du jour","ok");
  });

  $("#btn-raz-history")?.addEventListener("click", ()=>{
    S.history = {};
    persistTodayIntoHistory?.();
    updateHeader?.();
    renderChart?.();
    saveState(S);
    dbg?.push?.("RAZ historique","ok");
  });

  $("#btn-raz-factory")?.addEventListener("click", ()=>{
    const keepDate = S.today?.date;
    const fresh = DefaultState();
    if (keepDate) fresh.today.date = keepDate;
    // on garde éventuellement le profil/langue pour confort
    fresh.profile = { ...(S.profile||{}) };
    fresh.language = S.language || "fr";
    S.history = fresh.history;
    S.today   = fresh.today;
    S.modules = fresh.modules;
    S.prices  = fresh.prices;
    S.currency= fresh.currency;
    S.variants= fresh.variants;
    S.goals   = fresh.goals;
    S.dates   = fresh.dates;
    S.debug   = fresh.debug;
    syncAll();
    persistTodayIntoHistory?.();
    reflectCounters?.();
    updateHeader?.();
    renderChart?.();
    saveState(S);
    dbg?.push?.("RAZ réglages (usine)","ok");
  });

  // Sauvegarde / Import JSON (panneau Réglages)
  $("#btn-save-json-settings")?.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_settings_export.json";
    document.body.appendChild(a);
    a.click(); a.remove();
    dbg?.push?.("Export JSON (Réglages) ok","ok");
  });

  $("#file-import-json-settings")?.addEventListener("change", async (ev)=>{
    const file = ev.target.files?.[0]; if(!file) return;
    try{
      const text = await file.text();
      const obj  = JSON.parse(text);
      // merge soft, priorité au JSON importé
      Object.assign(S, DefaultState(), obj);
      syncAll();
      persistTodayIntoHistory?.();
      reflectCounters?.();
      updateHeader?.();
      renderChart?.();
      saveState(S);
      dbg?.push?.("Import JSON (Réglages) ok","ok");
    }catch(e){
      dbg?.push?.("Import JSON (Réglages) erreur: "+(e?.message||e), "err");
      alert("Import JSON invalide.");
    }finally{
      ev.target.value = "";
    }
  });

  // Journal & Debug
  $("#cb-debug-overlay")?.addEventListener("change", (e)=>{
    const box = $("#debug-console");
    if (!box) return;
    if (e.target.checked) box.classList.remove("hide");
    else box.classList.add("hide");
    dbg?.push?.("Overlay debug "+(e.target.checked?"ON":"OFF"), "ok");
  });

  $("#btn-copy-logs")?.addEventListener("click", ()=> {
    try{
      const logs = (S.debug?.logs||[]).join("\n");
      navigator.clipboard?.writeText(logs);
      dbg?.push?.("Logs copiés","ok");
    }catch{}
  });

  $("#btn-clear-logs")?.addEventListener("click", ()=>{
    S.debug.logs = [];
    $("#debug-console")?.replaceChildren();
    saveState(S);
    dbg?.push?.("Logs vidés","ok");
  });

  // Initial UI sync
  syncAll();
}
