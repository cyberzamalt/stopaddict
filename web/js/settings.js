import { $, toast } from "./utils.js";
import { state } from "./state.js";

export function initSettings() {
  const pricePack   = $("#pricePack");
  const cigsPerPack = $("#cigsPerPack");
  const priceJoint  = $("#priceJoint");
  const priceBeer   = $("#priceBeer");
  const priceStrong = $("#priceStrong");
  const priceLiquor = $("#priceLiquor");

  const limitDayCigs    = $("#limitDayCigs");
  const limitDayWeed    = $("#limitDayWeed");
  const limitDayAlcohol = $("#limitDayAlcohol");

  const btnSave = $("#btnSaveSettings");
  const feedback = $("#feedback");

  function fillForm() {
    const p = state.settings.price;
    pricePack.value   = p.pricePerPack;
    cigsPerPack.value = p.cigsPerPack;
    priceJoint.value  = p.joint;
    priceBeer.value   = p.beer;
    priceStrong.value = p.strong;
    priceLiquor.value = p.liquor;

    const L = state.settings.limits.day;
    limitDayCigs.value = L.cigs || 0;
    limitDayWeed.value = L.weed || 0;
    limitDayAlcohol.value = L.alcohol || 0;
  }

  fillForm();

  btnSave.onclick = () => {
    state.settings.price = {
      pricePerPack: +pricePack.value || 0,
      cigsPerPack: +cigsPerPack.value || 20,
      joint: +priceJoint.value || 0,
      beer: +priceBeer.value || 0,
      strong: +priceStrong.value || 0,
      liquor: +priceLiquor.value || 0
    };
    state.settings.limits.day = {
      cigs: +limitDayCigs.value || 0,
      weed: +limitDayWeed.value || 0,
      alcohol: +limitDayAlcohol.value || 0
    };
    localStorage.setItem("sa:data", JSON.stringify(state));
    toast(feedback, "Réglages enregistrés.", "ok");
    document.dispatchEvent(new Event("sa:settingsSaved"));
    document.dispatchEvent(new Event("sa:changed"));
  };

  document.addEventListener("sa:imported", fillForm);
}
