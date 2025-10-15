import { $, startOfDay, startOfWeek, startOfMonth } from "./utils.js";
import { totalsHeader, costToday, economiesHint } from "./state.js";

export function initStatsHeader() {
  const todayTotal = $("#todayTotal");
  const weekTotal  = $("#weekTotal");
  const monthTotal = $("#monthTotal");
  const todayCost  = $("#todayCost");
  const ecoAmount  = $("#economies-amount");

  function render() {
    const t = totalsHeader();
    todayTotal.textContent = t.today;
    weekTotal.textContent  = t.week;
    monthTotal.textContent = t.month;
    todayCost.textContent  = costToday().toFixed(2) + " €";
    ecoAmount.textContent  = economiesHint().toFixed(2) + " €";
  }

  render();
  document.addEventListener("sa:changed", render);
  document.addEventListener("sa:imported", render);
  document.addEventListener("sa:settingsSaved", render);
}
