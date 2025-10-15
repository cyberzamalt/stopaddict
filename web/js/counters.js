import { $, toast } from "./utils.js";
import { state, addEntry, removeOneToday, sumToday } from "./state.js";

export function initCounters() {
  // Activation
  const enableCigs = $("#enableCigs");
  const enableWeed = $("#enableWeed");
  const enableAlcohol = $("#enableAlcohol");

  enableCigs.checked    = !!state.settings.enable.cigs;
  enableWeed.checked    = !!state.settings.enable.weed;
  enableAlcohol.checked = !!state.settings.enable.alcohol;

  const cardCigs = $("#cardCigs");
  const cardWeed = $("#cardWeed");
  const cardAlcohol = $("#cardAlcohol");

  function renderActivation() {
    cardCigs.classList.toggle("hide", !state.settings.enable.cigs);
    cardWeed.classList.toggle("hide", !state.settings.enable.weed);
    cardAlcohol.classList.toggle("hide", !state.settings.enable.alcohol);
  }
  renderActivation();

  enableCigs.onchange    = () => { state.settings.enable.cigs = enableCigs.checked;    localStorage.setItem("sa:data", JSON.stringify(state)); renderActivation(); };
  enableWeed.onchange    = () => { state.settings.enable.weed = enableWeed.checked;    localStorage.setItem("sa:data", JSON.stringify(state)); renderActivation(); };
  enableAlcohol.onchange = () => { state.settings.enable.alcohol = enableAlcohol.checked; localStorage.setItem("sa:data", JSON.stringify(state)); renderActivation(); };

  // Compteurs du jour
  const cigsToday = $("#cigsToday");
  const weedToday = $("#weedToday");
  const alcoToday = $("#alcoToday");

  function renderCounters() {
    cigsToday.textContent = sumToday(["cig"]);
    weedToday.textContent = sumToday(["weed"]);
    alcoToday.textContent = sumToday(["beer","strong","liquor"]);
  }
  renderCounters();

  // Plus / Moins
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if (!btn) return;

    if (btn.classList.contains("plus")) {
      const type = btn.dataset.type;
      if (type) { addEntry(type, 1); renderCounters(); document.dispatchEvent(new Event("sa:changed")); }
    }
    if (btn.classList.contains("minus")) {
      const type = btn.dataset.type;
      if (type) { removeOneToday(type); renderCounters(); document.dispatchEvent(new Event("sa:changed")); }
    }
  });

  // Limites affichage
  const limitCigs = $("#limitCigs");
  const limitWeed = $("#limitWeed");
  const limitAlcohol = $("#limitAlcohol");

  function renderLimits() {
    const L = state.settings.limits.day;
    limitCigs.textContent = L.cigs ? `Limite jour: ${L.cigs}` : "";
    limitWeed.textContent = L.weed ? `Limite jour: ${L.weed}` : "";
    limitAlcohol.textContent = L.alcohol ? `Limite jour: ${L.alcohol}` : "";
  }
  renderLimits();

  document.addEventListener("sa:settingsSaved", renderLimits);
  document.addEventListener("sa:imported",      () => { renderCounters(); renderLimits(); });
}
