/* Réglages : modules, prix, devise, sauvegardes, XOR alcool */
export function mountSettings(ctx){
  const { S, DefaultState, saveState, persistToday, updateHeader, renderCharts, reflectCounters } = ctx;
  // Devise
  $("#currency-symbol").value = S.currency || "€";
  (S.currencyPos==="before" ? $("#currency-before") : $("#currency-after")).checked = true;
  $("#btn-apply-currency")?.addEventListener("click", ()=>{
    S.currency = $("#currency-symbol").value || "€";
    S.currencyPos = $("#currency-before").checked ? "before" : "after";
    saveState(S); updateHeader(); renderCharts();
  });

  // Modules (XOR alcool global ↔ biere/hard/liqueur)
  const mods=["cigs","joints","beer","hard","liqueur","alcohol"];
  mods.forEach(m=>{ const el=$("#mod-"+m); if(!el) return; el.checked=!!S.modules[m]; el.addEventListener("change",()=>{ S.modules[m]=el.checked; xorAlcohol(); saveState(S); reflectCounters(); }); });
  function xorAlcohol(){
    if(S.modules.alcohol){ S.modules.beer=false; S.modules.hard=false; S.modules.liqueur=false; }
    // Si un des sous-modules alcool est ON, forcer global à OFF
    if(S.modules.beer || S.modules.hard || S.modules.liqueur){ S.modules.alcohol=false; }
    ["beer","hard","liqueur"].forEach(k=>{ const card=$("#ctr-"+k); if(card){ card.style.opacity=S.modules.alcohol?".35":"1"; card.style.pointerEvents=S.modules.alcohol?"none":"auto"; }});
    const map={beer:"#chk-beer-active",hard:"#chk-hard-active",liqueur:"#chk-liqueur-active"};
    ["beer","hard","liqueur"].forEach(k=>{ const el=$(map[k]); if(el) el.checked = !S.modules.alcohol && !!S.today.active[k]; });
  }
  xorAlcohol();

  // Prix
  $("#price-cigarette").value=S.prices.cigarette||0;
  $("#price-joint").value=S.prices.joint||0;
  $("#price-beer").value=S.prices.beer||0;
  $("#price-hard").value=S.prices.hard||0;
  $("#price-liqueur").value=S.prices.liqueur||0;
  $("#btn-save-prices")?.addEventListener("click",()=>{
    S.prices.cigarette=+$("#price-cigarette").value||0;
    S.prices.joint=+$("#price-joint").value||0;
    S.prices.beer=+$("#price-beer").value||0;
    S.prices.hard=+$("#price-hard").value||0;
    S.prices.liqueur=+$("#price-liqueur").value||0;
    persistToday(); saveState(S); updateHeader(); renderCharts();
  });
  $("#btn-reset-prices")?.addEventListener("click",()=>{
    S.prices={...DefaultState().prices}; ["#price-cigarette","#price-joint","#price-beer","#price-hard","#price-liqueur"].forEach(s=>$(s).value=0);
    persistToday(); saveState(S); updateHeader(); renderCharts();
  });

  // RAZ & sauvegardes
  $("#btn-raz-day")?.addEventListener("click",()=>{ S.today.counters={cigs:0,joints:0,beer:0,hard:0,liqueur:0}; persistToday(); saveState(S); updateHeader(); renderCharts(); });
  $("#btn-raz-history")?.addEventListener("click",()=>{ S.history={}; persistToday(); saveState(S); renderCharts(); });
  $("#btn-raz-factory")?.addEventListener("click",()=>{ const d=DefaultState(); S={...d, today:{...d.today, date:todayKey()}}; saveState(S); location.reload(); });

  $("#btn-save-json-settings")?.addEventListener("click",()=>{
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:"application/json"})); a.download="stopaddict_settings.json"; document.body.appendChild(a); a.click(); a.remove();
  });
  $("#file-import-json-settings")?.addEventListener("change", async (ev)=>{
    const f=ev.target.files?.[0]; if(!f) return;
    try{ const obj=JSON.parse(await f.text()); Object.assign(S,obj); saveState(S); location.reload(); }catch{ alert("Import invalide."); }finally{ ev.target.value=""; }
  });
}
