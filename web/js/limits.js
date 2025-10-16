import { DAY_MS, startOfDay, inRange, isToday } from "./utils.js";
import { state } from "./state.js";

function todaySum(types) {
  const a = startOfDay(new Date());
  const b = new Date(+a + DAY_MS - 1);
  let s = 0;
  for (const e of state.entries) {
    if (!types.includes(e.type)) continue;
    if (inRange(e.ts, a, b)) s += (e.qty || 1);
  }
  return s;
}

function applyAlert(cardEl, alertEl, enabled, total, limit) {
  // reset
  cardEl.classList.remove("warn","over");
  alertEl.classList.add("hide");
  alertEl.textContent = "";

  if (!enabled || !limit || limit <= 0) return;

  if (total >= limit) {
    cardEl.classList.add("over");
    alertEl.classList.remove("hide");
    alertEl.textContent = `⚠ Limite dépassée (${total} / ${limit}).`;
    return;
  }
  if (total >= Math.ceil(limit * 0.8)) {
    cardEl.classList.add("warn");
    alertEl.classList.remove("hide");
    alertEl.textContent = `⚠ Proche de la limite (${total} / ${limit}).`;
  }
}

function render() {
  const en = state.settings.enable || {};
  const L  = (state.settings.limits && state.settings.limits.day) || {};

  // cigs
  const cigsTotal = todaySum(["cig"]);
  applyAlert(
    document.getElementById("cardCigs"),
    document.getElementById("alertCigs"),
    !!en.cigs,
    cigsTotal,
    +L.cigs || 0
  );

  // weed
  const weedTotal = todaySum(["weed"]);
  applyAlert(
    document.getElementById("cardWeed"),
    document.getElementById("alertWeed"),
    !!en.weed,
    weedTotal,
    +L.weed || 0
  );

  // alcohol = beer + strong + liquor
  const alcoTotal = todaySum(["beer","strong","liquor"]);
  applyAlert(
    document.getElementById("cardAlcohol"),
    document.getElementById("alertAlcohol"),
    !!en.alcohol,
    alcoTotal,
    +L.alcohol || 0
  );
}

export function initLimits() {
  render();

  // se re-render sur les évènements clés
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:imported", render);
  document.addEventListener("sa:settingsSaved", render);

  // filet de sécurité: après tout clic +/- on re-render (au cas où le module counters n’émet pas d’évènement)
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.classList.contains("plus") || btn.classList.contains("minus")) {
      setTimeout(render, 0);
    }
  });
}
