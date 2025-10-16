// web/js/settings.js
import { state, save, emit } from "./state.js";

export function initSettings() {
  // Toggles activation
  const enableCigs    = document.getElementById("enableCigs");
  const enableWeed    = document.getElementById("enableWeed");
  const enableAlcohol = document.getElementById("enableAlcohol");

  const cardCigs    = document.getElementById("cardCigs");
  const cardWeed    = document.getElementById("cardWeed");
  const cardAlcohol = document.getElementById("cardAlcohol");

  // Prix
  const pricePack   = document.getElementById("pricePack");
  const cigsPerPack = document.getElementById("cigsPerPack");
  const priceJoint  = document.getElementById("priceJoint");
  const priceBeer   = document.getElementById("priceBeer");
  const priceStrong = document.getElementById("priceStrong");
  const priceLiquor = document.getElementById("priceLiquor");

  // Limites jour
  const limitDayCigs    = document.getElementById("limitDayCigs");
  const limitDayWeed    = document.getElementById("limitDayWeed");
  const limitDayAlcohol = document.getElementById("limitDayAlcohol");

  // Nouveaux champs Pack 8 — objectifs/baseline
  const goalCigs   = document.getElementById("goalCigs");
  const goalWeed   = document.getElementById("goalWeed");
  const goalAlcohol= document.getElementById("goalAlcohol");
  const baseAuto   = document.getElementById("baselineAuto"); // checkbox

  const btnSave = document.getElementById("btnSaveSettings");

  // init
  if (enableCigs)    enableCigs.checked    = !!state.settings.enable.cigs;
  if (enableWeed)    enableWeed.checked    = !!state.settings.enable.weed;
  if (enableAlcohol) enableAlcohol.checked = !!state.settings.enable.alcohol;

  renderActivation();

  const p = state.settings.price;
  if (pricePack)   pricePack.value   = p.pricePerPack;
  if (cigsPerPack) cigsPerPack.value = p.cigsPerPack;
  if (priceJoint)  priceJoint.value  = p.joint;
  if (priceBeer)   priceBeer.value   = p.beer;
  if (priceStrong) priceStrong.value = p.strong;
  if (priceLiquor) priceLiquor.value = p.liquor;

  const L = state.settings.limits.day;
  if (limitDayCigs)    limitDayCigs.value    = L.cigs || 0;
  if (limitDayWeed)    limitDayWeed.value    = L.weed || 0;
  if (limitDayAlcohol) limitDayAlcohol.value = L.alcohol || 0;

  const G = state.settings.goals || {};
  if (goalCigs)    goalCigs.value    = G.cigs || 0;
  if (goalWeed)    goalWeed.value    = G.weed || 0;
  if (goalAlcohol) goalAlcohol.value = G.alcohol || 0;
  if (baseAuto)    baseAuto.checked  = ((state.settings.baseline && state.settings.baseline.mode) || "auto") === "auto";

  // handlers
  if (enableCigs) enableCigs.onchange = ()=>{ state.settings.enable.cigs = enableCigs.checked; save(state); renderActivation(); emit("sa:settingsSaved"); };
  if (enableWeed) enableWeed.onchange = ()=>{ state.settings.enable.weed = enableWeed.checked; save(state); renderActivation(); emit("sa:settingsSaved"); };
  if (enableAlcohol) enableAlcohol.onchange = ()=>{ state.settings.enable.alcohol = enableAlcohol.checked; save(state); renderActivation(); emit("sa:settingsSaved"); };

  if (btnSave) btnSave.onclick = ()=>{
    state.settings.price = {
      pricePerPack: +pricePack.value || 0,
      cigsPerPack:  +cigsPerPack.value || 20,
      joint:        +priceJoint.value || 0,
      beer:         +priceBeer.value || 0,
      strong:       +priceStrong.value || 0,
      liquor:       +priceLiquor.value || 0
    };
    state.settings.limits.day = {
      cigs:    +limitDayCigs.value || 0,
      weed:    +limitDayWeed.value || 0,
      alcohol: +limitDayAlcohol.value || 0
    };
    state.settings.goals = {
      cigs:    Math.max(0, Math.floor(+goalCigs.value || 0)),
      weed:    Math.max(0, Math.floor(+goalWeed.value || 0)),
      alcohol: Math.max(0, Math.floor(+goalAlcohol.value || 0))
    };
    state.settings.baseline = {
      mode: baseAuto && baseAuto.checked ? "auto" : "manual"
    };

    save(state);
    emit("sa:settingsSaved");
    flash("Réglages enregistrés.", "ok");
  };

  function renderActivation() {
    if (cardCigs)    cardCigs.classList.toggle("hide", !state.settings.enable.cigs);
    if (cardWeed)    cardWeed.classList.toggle("hide", !state.settings.enable.weed);
    if (cardAlcohol) cardAlcohol.classList.toggle("hide", !state.settings.enable.alcohol);
  }

  function flash(msg, kind="info") {
    const feedback = document.getElementById("feedback");
    if (!feedback) return;
    feedback.className = "feedback " + kind;
    feedback.textContent = msg;
    setTimeout(()=>{ feedback.className = "feedback"; feedback.textContent = ""; }, 2500);
  }
}
