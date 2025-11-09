/* web/js/settings.js — Réglages + exclusivité “Alcool global” */

export function mountSettings({
  S,
  DefaultState,
  saveState,
  onChange = ()=>{},
  afterFactoryReset = ()=>{}
} = {}) {

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  /* ---------- Helpers ---------- */
  const num = (v)=> Number.isFinite(+v) ? +v : 0;

  function paintModules(){
    $("#mod-cigs").checked    = !!S.modules.cigs;
    $("#mod-joints").checked  = !!S.modules.joints;
    $("#mod-beer").checked    = !!S.modules.beer;
    $("#mod-hard").checked    = !!S.modules.hard;
    $("#mod-liqueur").checked = !!S.modules.liqueur;
    $("#mod-alcohol").checked = !!S.modules.alcohol;

    // Exclusivité UI (désactive les 3 détaillés si “global” actif)
    const globalOn = !!S.modules.alcohol;
    ["#mod-beer","#mod-hard","#mod-liqueur"].forEach(sel=>{
      const el=$(sel); if(!el) return;
      el.disabled = globalOn;
      el.parentElement?.classList.toggle("disabled", globalOn);
    });
  }

  function paintPrices(){
    $("#price-cigarette").value = S.prices.cigarette ?? "";
    $("#price-joint").value     = S.prices.joint ?? "";
    $("#price-beer").value      = S.prices.beer ?? "";
    $("#price-hard").value      = S.prices.hard ?? "";
    $("#price-liqueur").value   = S.prices.liqueur ?? "";
  }

  function paintCurrency(){
    $("#currency-symbol").value = S.currency.symbol ?? "€";
    const before = !!S.currency.before;
    $("#currency-before").checked = before;
    $("#currency-after").checked  = !before;
  }

  function paintProfile(){
    $("#profile-name").value = S.profile?.name ?? "";
    const sel = $("#select-language");
    if (sel && sel.children.length===0){
      [["fr","Français"],["en","English"]].forEach(([v,lab])=>{
        const o=document.createElement("option"); o.value=v; o.textContent=lab; sel.appendChild(o);
      });
    }
    if (sel) sel.value = S.profile?.language || "fr";
  }

  function repaint(){
    paintModules();
    paintPrices();
    paintCurrency();
    paintProfile();
  }

  /* ---------- Exclusivité “Alcool global” ---------- */
  function applyAlcoholExclusivity(trigger){
    const global = $("#mod-alcohol").checked;

    if (global){
      // Activer “global”, couper les 3 détaillés
      S.modules.alcohol  = true;
      S.modules.beer     = false;
      S.modules.hard     = false;
      S.modules.liqueur  = false;

      // Pour le jour courant : activer “global” visuellement via Accueil (les cases Accueil restent gérées par app.js)
      S.today.active.beer     = false;
      S.today.active.hard     = false;
      S.today.active.liqueur  = false;
    } else {
      // Désactivation du “global” -> ré-autoriser les 3 (sans les forcer cochés)
      S.modules.alcohol = false;
      // Les 3 redeviennent modifiables côté UI (leurs états actuels sont conservés)
    }

    saveState(S);
    repaint();
    onChange();
  }

  /* ---------- Écoutes ---------- */
  // Modules
  $("#mod-cigs")?.addEventListener("change",  e=>{ S.modules.cigs   = !!e.target.checked; saveState(S); onChange(); });
  $("#mod-joints")?.addEventListener("change",e=>{ S.modules.joints = !!e.target.checked; saveState(S); onChange(); });
  $("#mod-beer")?.addEventListener("change",  e=>{
    if ($("#mod-alcohol").checked){ e.preventDefault(); e.target.checked=false; return; }
    S.modules.beer = !!e.target.checked; saveState(S); onChange();
  });
  $("#mod-hard")?.addEventListener("change",  e=>{
    if ($("#mod-alcohol").checked){ e.preventDefault(); e.target.checked=false; return; }
    S.modules.hard = !!e.target.checked; saveState(S); onChange();
  });
  $("#mod-liqueur")?.addEventListener("change",e=>{
    if ($("#mod-alcohol").checked){ e.preventDefault(); e.target.checked=false; return; }
    S.modules.liqueur = !!e.target.checked; saveState(S); onChange();
  });
  $("#mod-alcohol")?.addEventListener("change", ()=> applyAlcoholExclusivity("toggle"));

  // Prix unitaires
  $("#btn-save-prices")?.addEventListener("click", ()=>{
    S.prices.cigarette = num($("#price-cigarette").value);
    S.prices.joint     = num($("#price-joint").value);
    S.prices.beer      = num($("#price-beer").value);
    S.prices.hard      = num($("#price-hard").value);
    S.prices.liqueur   = num($("#price-liqueur").value);
    saveState(S); onChange();
  });
  $("#btn-reset-prices")?.addEventListener("click", ()=>{
    S.prices = {...DefaultState().prices};
    repaint(); saveState(S); onChange();
  });

  // Devise
  $("#btn-apply-currency")?.addEventListener("click", ()=>{
    S.currency.symbol = ($("#currency-symbol").value || "€").slice(0,3);
    S.currency.before = !!$("#currency-before").checked;
    saveState(S); onChange();
  });

  // Profil
  $("#profile-name")?.addEventListener("change", e=>{
    S.profile.name = String(e.target.value||"").trim(); saveState(S); onChange();
  });
  $("#select-language")?.addEventListener("change", e=>{
    S.profile.language = e.target.value || "fr"; saveState(S); onChange();
  });

  // Maintenance & sauvegardes
  $("#btn-raz-day")?.addEventListener("click", ()=>{
    S.today.counters = {cigs:0,joints:0,beer:0,hard:0,liqueur:0};
    saveState(S); onChange();
  });
  $("#btn-raz-history")?.addEventListener("click", ()=>{
    S.history = {}; saveState(S); onChange();
  });
  $("#btn-raz-factory")?.addEventListener("click", ()=>{
    const fresh = DefaultState();
    // Conserver l’ACK majorité si existant
    const keepAge = localStorage.getItem("STOPADDICT_AGE_ACK")==="1";
    Object.keys(S).forEach(k=> delete S[k]);
    Object.assign(S, fresh);
    if (keepAge) localStorage.setItem("STOPADDICT_AGE_ACK","1");
    saveState(S);
    afterFactoryReset();
  });

  // Export / Import JSON (réglages étendus)
  $("#btn-save-json-settings")?.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="stopaddict_settings.json"; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#file-import-json-settings")?.addEventListener("change", async (ev)=>{
    const f = ev.target.files?.[0]; if(!f) return;
    try{
      const obj = JSON.parse(await f.text());
      // Merge “doux” dans S
      Object.assign(S, obj);
      saveState(S);
      repaint();
      onChange();
    }catch(e){ alert("Import JSON invalide."); }
    finally{ ev.target.value=""; }
  });

  // Debug overlay (optionnelle)
  $("#cb-debug-overlay")?.addEventListener("change", (e)=>{
    const box = $("#debug-console");
    if (!box) return;
    box.classList.toggle("hide", !e.target.checked);
  });

  // Paint initial
  repaint();
}
