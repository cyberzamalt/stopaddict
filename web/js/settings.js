/* web/js/settings.js — Réglages StopAddict (ES module) */

export function mountSettings(opts){
  const {
    S,
    DefaultState,
    saveState,
    onModulesChanged,
    onPricesChanged,
    onProfileChanged,
    onLangChanged,
  } = opts || {};

  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  /* ---------- Helpers callbacks ---------- */
  const emitModulesChanged = () => { onModulesChanged?.({ ...S.modules }); };
  const emitPricesChanged  = () => { onPricesChanged?.({ ...S.prices }); };
  const emitProfileChanged = () => { onProfileChanged?.({ ...S.profile }); };
  const emitLangChanged    = () => { onLangChanged?.(S.i18n?.lang || "fr"); };

  /* ---------- MODULES (cases à cocher) ---------- */
  const modIds = {
    cigs:     "#mod-cigs",
    joints:   "#mod-joints",
    beer:     "#mod-beer",
    hard:     "#mod-hard",
    liqueur:  "#mod-liqueur",
    alcoholG: "#mod-alcohol"
  };

  function setChecked(sel, v){
    const el = $(sel);
    if (el) el.checked = !!v;
  }
  function setDisabled(sel, v){
    const el = $(sel);
    if (el) el.disabled = !!v;
  }

  function syncModuleUIFromState(){
    setChecked(modIds.cigs,     S.modules.cigs);
    setChecked(modIds.joints,   S.modules.joints);
    setChecked(modIds.beer,     S.modules.beer);
    setChecked(modIds.hard,     S.modules.hard);
    setChecked(modIds.liqueur,  S.modules.liqueur);
    setChecked(modIds.alcoholG, S.modules.alcoholGlobal);

    // Si "alcool global" actif -> désactiver visuellement les 3 autres
    const lock = !!S.modules.alcoholGlobal;
    setDisabled(modIds.beer,    lock);
    setDisabled(modIds.hard,    lock);
    setDisabled(modIds.liqueur, lock);
  }

  function enforceAlcoholExclusivity(source){
    // Si alcool global ON -> forcer OFF beer/hard/liqueur et inactifs côté today
    if (S.modules.alcoholGlobal){
      S.modules.beer = false;
      S.modules.hard = false;
      S.modules.liqueur = false;
      S.today.active.beer = false;
      S.today.active.hard = false;
      S.today.active.liqueur = false;
    } else {
      // Si l’un des 3 est ON -> alcool global OFF
      if (S.modules.beer || S.modules.hard || S.modules.liqueur){
        S.modules.alcoholGlobal = false;
      }
    }
    saveState(S);
    syncModuleUIFromState();
    emitModulesChanged();
  }

  // Listeners modules
  Object.entries(modIds).forEach(([key, sel])=>{
    const el = $(sel);
    if (!el) return;
    el.addEventListener("change", ()=>{
      if (key === "alcoholG"){
        S.modules.alcoholGlobal = !!el.checked;
        enforceAlcoholExclusivity("alcoholG");
      } else {
        S.modules[key] = !!el.checked;
        // Si on active un alcool unit, on s’assure de couper alcoolGlobal
        if (["beer","hard","liqueur"].includes(key) && S.modules[key]){
          S.modules.alcoholGlobal = false;
        }
        enforceAlcoholExclusivity(key);
      }
    });
  });

  /* ---------- PRIX ---------- */
  const priceIds = {
    cigarette: "#price-cigarette",
    joint:     "#price-joint",
    beer:      "#price-beer",
    hard:      "#price-hard",
    liqueur:   "#price-liqueur",
  };

  function fillPrices(){
    Object.entries(priceIds).forEach(([k, sel])=>{
      const el = $(sel);
      if (el) el.value = (Number(S.prices?.[k]) || 0).toString();
    });
  }

  $("#btn-save-prices")?.addEventListener("click", ()=>{
    Object.entries(priceIds).forEach(([k, sel])=>{
      const el = $(sel);
      S.prices[k] = Number(el?.value || 0) || 0;
    });
    saveState(S);
    emitPricesChanged();
  });

  $("#btn-reset-prices")?.addEventListener("click", ()=>{
    const def = DefaultState();
    S.prices = { ...def.prices };
    saveState(S);
    fillPrices();
    emitPricesChanged();
  });

  /* ---------- PROFIL / DEVISE ---------- */
  // Prénom
  const nameEl = $("#profile-name");
  if (nameEl){
    nameEl.value = S.profile?.name || "";
    nameEl.addEventListener("input", ()=>{
      S.profile.name = nameEl.value.trim();
      saveState(S);
      emitProfileChanged();
    });
  }

  // Devise
  const symEl = $("#currency-symbol");
  const beforeEl = $("#currency-before");
  const afterEl  = $("#currency-after");

  function fillCurrency(){
    if (symEl) symEl.value = S.currency?.symbol ?? "€";
    const pos = S.currency?.position || "after";
    if (beforeEl) beforeEl.checked = (pos === "before");
    if (afterEl)  afterEl.checked  = (pos === "after");
  }

  $("#btn-apply-currency")?.addEventListener("click", ()=>{
    const symbol = symEl?.value || "€";
    const pos    = beforeEl?.checked ? "before" : "after";
    S.currency = { symbol, position: pos };
    saveState(S);
    emitPricesChanged(); // pour forcer re-render des montants
  });

  /* ---------- LANGUE (i18n hook léger) ---------- */
  const langSel = $("#select-language");
  if (langSel){
    // Simple: FR/EN par défaut
    const current = (S.i18n?.lang) || "fr";
    const choices = ["fr","en"];
    langSel.innerHTML = choices.map(c=>`<option value="${c}" ${c===current?'selected':''}>${c.toUpperCase()}</option>`).join("");
    langSel.addEventListener("change", ()=>{
      S.i18n = { ...(S.i18n||{}), lang: langSel.value };
      saveState(S);
      emitLangChanged();
    });
  }

  /* ---------- MAINTENANCE / SAUVEGARDES ---------- */
  $("#btn-raz-day")?.addEventListener("click", ()=>{
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    saveState(S);
    emitPricesChanged(); // pour rafraîchir l’entête (coûts/éco recalculés)
  });

  $("#btn-raz-history")?.addEventListener("click", ()=>{
    S.history = {};
    saveState(S);
    emitPricesChanged();
  });

  $("#btn-raz-factory")?.addEventListener("click", ()=>{
    const def = DefaultState();
    // On conserve i18n.lang si présent
    const keepLang = S.i18n?.lang;
    Object.keys(S).forEach(k=> delete S[k]);
    Object.assign(S, def);
    if (keepLang) S.i18n.lang = keepLang;

    saveState(S);
    syncModuleUIFromState();
    fillPrices();
    fillCurrency();
    emitModulesChanged();
    emitPricesChanged();
    emitProfileChanged();
    emitLangChanged();
  });

  // Export / Import JSON (réglages complets)
  $("#btn-save-json-settings")?.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(S, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_settings.json";
    document.body.appendChild(a); a.click(); a.remove();
  });

  $("#file-import-json-settings")?.addEventListener("change", async (ev)=>{
    const file = ev.target.files?.[0];
    if (!file) return;
    try{
      const text = await file.text();
      const obj = JSON.parse(text);

      // Merge très prudent
      const def = DefaultState();
      const merged = { ...def, ...obj };

      // Remplacer S (objet muté pour rester partagé)
      Object.keys(S).forEach(k=> delete S[k]);
      Object.assign(S, merged);

      saveState(S);

      // Refléter l’UI
      syncModuleUIFromState();
      fillPrices();
      fillCurrency();
      if (nameEl) nameEl.value = S.profile?.name || "";
      if (langSel){
        const cur = S.i18n?.lang || "fr";
        Array.from(langSel.options).forEach(o => o.selected = (o.value === cur));
      }

      emitModulesChanged();
      emitPricesChanged();
      emitProfileChanged();
      emitLangChanged();
      alert("Import des réglages réussi.");
    }catch(e){
      alert("Import invalide.");
    }finally{
      ev.target.value = "";
    }
  });

  /* ---------- DEBUG overlay (léger) ---------- */
  $("#cb-debug-overlay")?.addEventListener("change", (e)=>{
    const box = $("#debug-console");
    if (!box) return;
    box.classList.toggle("hide", !e.target.checked);
  });

  $("#btn-copy-logs")?.addEventListener("click", ()=>{
    const txt = (S.debug?.logs || []).join("\n");
    navigator.clipboard?.writeText(txt).catch(()=>{});
  });

  $("#btn-clear-logs")?.addEventListener("click", ()=>{
    if (S.debug) S.debug.logs = [];
    const box = $("#debug-console");
    if (box) box.innerHTML = "";
  });

  /* ---------- Initial fill ---------- */
  syncModuleUIFromState();
  fillPrices();
  fillCurrency();
}
