/* web/js/settings.js — Panneau Réglages (modules, devise, prix, import/export, langue) */
import { saveState, DefaultState } from "./state.js";

/** Montage du panneau Réglages.
 * ctx: { S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, renderChart, reflectCounters, dbg }
 */
export function mountSettings(ctx){
  const {
    S,
    persistTodayIntoHistory,
    updateHeader,
    renderChart,
    reflectCounters,
    dbg
  } = ctx;

  // ---------- Helpers ----------
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  function writeAndRefresh(note="settings:update"){
    persistTodayIntoHistory();
    saveState(S);
    reflectCounters?.();
    updateHeader?.();
    renderChart?.();
    // rafraîchir conseils si dispo
    try{ window.Tips?.updateTips?.(S); }catch{}
    dbg?.push?.(note, "ok");
  }

  // ---------- Dévise ----------
  const inpCurSym = $("#currency-symbol");
  const rbBefore  = $("#currency-before");
  const rbAfter   = $("#currency-after");
  const btnCur    = $("#btn-apply-currency");

  if (inpCurSym) inpCurSym.value = S.currency?.symbol ?? "€";
  if (rbBefore && rbAfter){
    const before = !!S.currency?.before;
    rbBefore.checked = before;
    rbAfter.checked  = !before;
  }
  on(btnCur, "click", () => {
    const before = !!$("#currency-before")?.checked;
    S.currency = {
      symbol: $("#currency-symbol")?.value?.trim() || "€",
      before
    };
    writeAndRefresh("currency:apply");
  });

  // ---------- Prix unitaires ----------
  const mapPrice = {
    cigarette: "#price-cigarette",
    joint:     "#price-joint",
    beer:      "#price-beer",
    hard:      "#price-hard",
    liqueur:   "#price-liqueur",
  };

  // init
  for (const k in mapPrice){
    const el = $(mapPrice[k]);
    if (el) el.value = Number(S.prices?.[k] ?? 0);
  }

  on($("#btn-save-prices"), "click", () => {
    for (const k in mapPrice){
      const el = $(mapPrice[k]);
      if (!el) continue;
      const v = Number(el.value || 0);
      S.prices[k] = isFinite(v) ? v : 0;
    }
    writeAndRefresh("prices:save");
  });

  on($("#btn-reset-prices"), "click", () => {
    const def = DefaultState().prices;
    for (const k in mapPrice){
      const el = $(mapPrice[k]);
      if (el) el.value = Number(def?.[k] ?? 0);
      S.prices[k] = def?.[k] ?? 0;
    }
    writeAndRefresh("prices:reset");
  });

  // ---------- Modules & Exclusivité “Alcool global” ----------
  const modIds = {
    cigs:    "#mod-cigs",
    joints:  "#mod-joints",
    beer:    "#mod-beer",
    hard:    "#mod-hard",
    liqueur: "#mod-liqueur",
    alcohol: "#mod-alcohol", // global
  };

  // init cases Réglages depuis S.modules
  for (const k in modIds){
    const el = $(modIds[k]);
    if (el) el.checked = !!S.modules[k];
  }

  function applyExclusivityFromAlcohol(){
    const isGlobal = !!S.modules.alcohol;

    // Modules exclusifs
    S.modules.beer    = !isGlobal && S.modules.beer;
    S.modules.hard    = !isGlobal && S.modules.hard;
    S.modules.liqueur = !isGlobal && S.modules.liqueur;

    // Actifs du jour en cohérence
    S.today.active.alcohol = isGlobal;
    if (isGlobal){
      S.today.active.beer = false;
      S.today.active.hard = false;
      S.today.active.liqueur = false;
    }

    // UI Réglages
    if (modIds.beer)    $(modIds.beer).checked    = !!S.modules.beer;
    if (modIds.hard)    $(modIds.hard).checked    = !!S.modules.hard;
    if (modIds.liqueur) $(modIds.liqueur).checked = !!S.modules.liqueur;

    // UI Accueil
    const chk = {
      beer:    "#chk-beer-active",
      hard:    "#chk-hard-active",
      liqueur: "#chk-liqueur-active",
    };
    if (isGlobal){
      for (const k of ["beer","hard","liqueur"]){
        const el = $(chk[k]); if (el) el.checked = false;
      }
    }

    writeAndRefresh("modules:alcohol:exclusive");
  }

  function mirrorModuleToTodayActive(kind){
    // Si on active un module → on autorise aussi côté Accueil (actif du jour)
    if (S.modules[kind]) S.today.active[kind] = true;
    else                 S.today.active[kind] = false;
  }

  // Écouteurs sur toutes les cases Modules
  for (const k in modIds){
    const el = $(modIds[k]); if (!el) continue;
    on(el, "change", () => {
      S.modules[k] = !!el.checked;

      if (k === "alcohol"){
        applyExclusivityFromAlcohol();
      } else {
        // si on change beer/hard/liqueur alors que "alcohol" est actif, on empêche
        if (S.modules.alcohol && (k==="beer"||k==="hard"||k==="liqueur")){
          S.modules[k] = false;
          el.checked = false;
          dbg?.push?.(`blocked:${k}-while-alcohol`, "warn");
        } else {
          mirrorModuleToTodayActive(k);
          writeAndRefresh(`modules:${k}:${S.modules[k]?"on":"off"}`);
        }
      }
    });
  }

  // ---------- Maintenance ----------
  on($("#btn-raz-day"), "click", () => {
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    writeAndRefresh("maintenance:raz-day");
  });

  on($("#btn-raz-history"), "click", () => {
    S.history = {};
    writeAndRefresh("maintenance:raz-history");
  });

  on($("#btn-raz-factory"), "click", () => {
    const fresh = DefaultState();
    // On conserve éventuellement la langue si déjà choisie
    const keepLang = S.language || fresh.language;
    Object.assign(S, fresh);
    S.language = keepLang;
    writeAndRefresh("maintenance:factory");
  });

  // ---------- Import / Export JSON ----------
  on($("#btn-save-json-settings"), "click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stopaddict_settings_export.json";
    document.body.appendChild(a);
    a.click(); a.remove();
    dbg?.push?.("settings:export-json", "ok");
  });

  on($("#file-import-json-settings"), "change", async (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    try{
      const txt = await f.text();
      const obj = JSON.parse(txt);

      // Fusion basique (priorité à l’import)
      const base = DefaultState();
      Object.assign(S, base, obj);

      // Re-synchroniser UI
      // Devise
      if (inpCurSym) inpCurSym.value = S.currency?.symbol ?? "€";
      if (rbBefore && rbAfter){
        rbBefore.checked = !!S.currency?.before;
        rbAfter.checked  = !S.currency?.before;
      }
      // Prix
      for (const k in mapPrice){
        const el = $(mapPrice[k]);
        if (el) el.value = Number(S.prices?.[k] ?? 0);
      }
      // Modules
      for (const k in modIds){
        const el = $(modIds[k]);
        if (el) el.checked = !!S.modules[k];
      }

      writeAndRefresh("settings:import-json");
    }catch(e){
      alert("Import JSON invalide.");
      dbg?.push?.("settings:import-json:err:"+ (e?.message||e), "err");
    }finally{
      ev.target.value = "";
    }
  });

  // ---------- Langue (si i18n présent) ----------
  const selLang = $("#select-language");
  const I18N = globalThis.I18N; // défini par js/i18n.js si inclus
  if (selLang && I18N?.getLanguages && I18N?.applyLanguage){
    // Remplir <select>
    const langs = I18N.getLanguages(); // [{code, label}]
    selLang.innerHTML = "";
    langs.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.code; opt.textContent = l.label;
      selLang.appendChild(opt);
    });
    // Sélection actuelle
    if (S.language && langs.some(x => x.code === S.language)){
      selLang.value = S.language;
      try { I18N.applyLanguage(S.language); } catch {}
    }

    on(selLang, "change", () => {
      const code = selLang.value;
      S.language = code;
      try { I18N.applyLanguage(code); } catch {}
      writeAndRefresh("i18n:apply");
    });
  }

  // ---------- Console debug (affichage) ----------
  const cbDbg = $("#cb-debug-overlay");
  const dbgBox = $("#debug-console");
  if (cbDbg && dbgBox){
    // garder l’état
    dbgBox.classList.toggle("hide", !cbDbg.checked);
    on(cbDbg, "change", () => {
      dbgBox.classList.toggle("hide", !cbDbg.checked);
      saveState(S);
    });
  }

  dbg?.push?.("[Settings] mounted", "ok");
}
