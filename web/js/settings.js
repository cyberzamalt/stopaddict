// web/js/settings.js
import { state, save } from "./state.js";
import { t } from "./i18n.js";

export function initSettings(){
  const pricePack   = document.getElementById("pricePack");
  const cigsPerPack = document.getElementById("cigsPerPack");
  const priceJoint  = document.getElementById("priceJoint");
  const priceBeer   = document.getElementById("priceBeer");
  const priceStrong = document.getElementById("priceStrong");
  const priceLiquor = document.getElementById("priceLiquor");

  const limitDayCigs    = document.getElementById("limitDayCigs");
  const limitDayWeed    = document.getElementById("limitDayWeed");
  const limitDayAlcohol = document.getElementById("limitDayAlcohol");

  const goalCigs    = document.getElementById("goalCigs");
  const goalWeed    = document.getElementById("goalWeed");
  const goalAlcohol = document.getElementById("goalAlcohol");
  const baselineAuto = document.getElementById("baselineAuto");

  const btnSave = document.getElementById("btnSaveSettings");

  // hydrate
  const p = state.settings.price;
  if (pricePack)   pricePack.value   = p.pricePerPack ?? 0;
  if (cigsPerPack) cigsPerPack.value = p.cigsPerPack ?? 20;
  if (priceJoint)  priceJoint.value  = p.joint ?? 0;
  if (priceBeer)   priceBeer.value   = p.beer ?? 0;
  if (priceStrong) priceStrong.value = p.strong ?? 0;
  if (priceLiquor) priceLiquor.value = p.liquor ?? 0;

  const L = state.settings.limits?.day || {};
  if (limitDayCigs)    limitDayCigs.value    = L.cigs ?? 0;
  if (limitDayWeed)    limitDayWeed.value    = L.weed ?? 0;
  if (limitDayAlcohol) limitDayAlcohol.value = L.alcohol ?? 0;

  const G = state.settings.goals || {};
  if (goalCigs)    goalCigs.value    = G.cigs ?? "";
  if (goalWeed)    goalWeed.value    = G.weed ?? "";
  if (goalAlcohol) goalAlcohol.value = G.alcohol ?? "";
  if (baselineAuto) baselineAuto.checked = state.settings.baselineAuto ?? true;

  function flashSaved(){
    const fb = document.getElementById("feedback");
    if (!fb) return;
    fb.className = "feedback ok";
    fb.textContent = t("msg.settings.saved");
    setTimeout(()=>{ fb.className = "feedback"; fb.textContent = ""; }, 2500);
  }

  if (btnSave) {
    btnSave.onclick = () => {
      state.settings.price = {
        pricePerPack: +pricePack.value || 0,
        cigsPerPack: +cigsPerPack.value || 20,
        joint: +priceJoint.value || 0,
        beer: +priceBeer.value || 0,
        strong: +priceStrong.value || 0,
        liquor: +priceLiquor.value || 0
      };
      state.settings.limits = {
        ...state.settings.limits,
        day: {
          cigs: +limitDayCigs.value || 0,
          weed: +limitDayWeed.value || 0,
          alcohol: +limitDayAlcohol.value || 0
        }
      };
      state.settings.goals = {
        cigs: goalCigs.value ? +goalCigs.value : "",
        weed: goalWeed.value ? +goalWeed.value : "",
        alcohol: goalAlcohol.value ? +goalAlcohol.value : ""
      };
      state.settings.baselineAuto = !!baselineAuto.checked;

      save(state);
      document.dispatchEvent(new CustomEvent("sa:settingsSaved"));
      flashSaved();
    };
  }
}
