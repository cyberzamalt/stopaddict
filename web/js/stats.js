import { on } from "./state.js";

console.log("[stats.js] Module loaded");

function updateSummary(totals) {
  const el = document.getElementById("stats-summary");
  if (!el) return;
  el.innerHTML = `
    <div>Cigarettes: ${totals.cigs || 0}</div>
    <div>Joints: ${totals.weed || 0}</div>
    <div>Alcool: ${totals.alcohol || 0}</div>
  `;
}

export function initStats() {
  console.log("[stats.initStats] Starting...");
  on("charts:totals", e => {
    const { totals } = e.detail || {};
    if (totals) updateSummary(totals);
  });
  console.log("[stats.initStats] ✓ Listening to charts:totals");
}
