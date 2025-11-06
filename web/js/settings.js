/* web/js/settings.js — fournit mountSettings() et réutilise la logique du fallback */
export function mountSettings(ctx) {
  const { S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, renderChart, reflectCounters, dbg } = ctx;
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

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
    updateHeader(); renderChart(); saveState(S);
    dbg.push("Devise appliquée", "ok");
  });

  // Modules (+ miroirs compteurs)
  const modIds = {
    cigs: "#mod-cigs", beer: "#mod-beer", joints: "#mod-joints",
    hard: "#mod-hard", liqueur: "#mod-liqueur", alcoholGlobal: "#mod-alcohol"
  };
  for (const k in modIds) {
    const el = $(modIds[k]); if (!el) continue;
    el.checked = !!S.modules[k];
    el.addEventListener("change", () => {
      S.modules[k] = el.checked;
      if (["cigs","joints","beer","hard","liqueur"].includes(k)) {
        S.today.active[k] = el.checked; reflectCounters();
      }
      saveState(S);
    });
  }

  // Prix unitaires
  $("#price-cigarette").value = S.prices.cigarette ?? 0;
  "#price-joint"     in document && ($("#price-joint").value     = S.prices.joint     ?? 0);
  $("#price-beer").value      = S.prices.beer      ?? 0;
  $("#price-hard").value      = S.prices.hard      ?? 0;
  $("#price-liqueur").value   = S.prices.liqueur   ?? 0;

  $("#btn-save-prices").addEventListener("click", () => {
    S.prices.cigarette = Number($("#price-cigarette").value || 0);
    "price-joint" in (document.all||{}) && (S.prices.joint = Number($("#price-joint").value || 0));
    S.prices.beer      = Number($("#price-beer").value || 0);
    S.prices.hard      = Number($("#price-hard").value || 0);
    S.prices.liqueur   = Number($("#price-liqueur").value || 0);
    persistTodayIntoHistory(); updateHeader(); renderChart(); saveState(S);
    dbg.push("Prix unitaires enregistrés", "ok");
  });

  $("#btn-reset-prices").addEventListener("click", () => {
    S.prices = { ...DefaultState().prices };
    $("#price-cigarette").value = 0; 
    "price-joint" in (document.all||{}) && ($("#price-joint").value = 0);
    $("#price-beer").value = 0; $("#price-hard").value = 0; $("#price-liqueur").value = 0;
    persistTodayIntoHistory(); updateHeader(); renderChart(); saveState(S);
    dbg.push("Prix unitaires réinitialisés", "ok");
  });

  // RAZ & sauvegardes
  $("#btn-raz-day")?.addEventListener("click", () => {
    S.today.counters = { cigs:0, joints:0, beer:0, hard:0, liqueur:0 };
    reflectCounters(); persistTodayIntoHistory(); updateHeader(); renderChart(); saveState(S);
    dbg.push("RAZ du jour", "ok");
  });
  $("#btn-raz-history")?.addEventListener("click", () => {
    S.history = {}; persistTodayIntoHistory(); renderChart(); saveState(S);
    dbg.push("RAZ historique", "ok");
  });
  $("#btn-raz-factory")?.addEventListener("click", () => {
    const keepHistory = S.history; const keepToday = S.today; const keepCurrency = S.currency;
    const fresh = DefaultState(); fresh.history = keepHistory; fresh.today = keepToday; fresh.currency = keepCurrency;
    Object.assign(S, fresh);
    // rafraîchir l’UI
    reflectCounters(); renderChart(); saveState(S);
    dbg.push("RAZ réglages (usine) + conservation historique", "ok");
  });

  $("#btn-save-json-settings")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "stopaddict_settings_backup.json";
    document.body.appendChild(a); a.click(); a.remove();
    dbg.push("Sauvegarder JSON (réglages + état) ok", "ok");
  });
  $("#file-import-json-settings")?.addEventListener("change", async (ev) => {
    const file = ev.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const fresh = { ...DefaultState(), ...obj };
      Object.assign(S, fresh);
      // best effort rerender
      reflectCounters(); renderChart(); saveState(S);
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
  $("#btn-copy-logs")?.addEventListener("click", () => {
    navigator.clipboard?.writeText((S.debug.logs||[]).join("\n")).catch(()=>{});
  });
  $("#btn-clear-logs")?.addEventListener("click", () => { S.debug.logs = []; $("#debug-console").innerHTML = ""; });
}
