/* web/js/counters.js
   Boutons +/−, toggles modules, barres header, notes cartes — v2
*/
import { $, clamp, formatYMD } from "./utils.js";
import { on, inc, dec, todayTotals, isModuleEnabled, setModuleEnabled } from "./state.js";

let computeDayCostFn = null;
(async () => {
  try {
    const m = await import("./settings.js");
    if (typeof m.computeDayCost === "function") computeDayCostFn = m.computeDayCost;
  } catch(e) { /* facultatif */ }
})();

function updateHeaderBars() {
  const t = todayTotals();
  const elC = $("#bar-clopes");  if (elC) elC.textContent = String(t.cigs);
  const elJ = $("#bar-joints");  if (elJ) elJ.textContent = String(t.weed);
  const elA = $("#bar-alcool");  if (elA) elA.textContent = String(t.alcohol);

  // Coût jour (si settings fournit un calcul)
  const elCost = $("#stat-cout-jr");
  if (elCost) {
    if (computeDayCostFn) {
      try { elCost.textContent = computeDayCostFn(new Date()); }
      catch { elCost.textContent = "—"; }
    } else {
      elCost.textContent = "—";
    }
  }
}

function updateCardNotes() {
  const t = todayTotals();
  const nC = $("#note-cigs");   if (nC) nC.textContent = String(t.cigs);
  const nJ = $("#note-weed");   if (nJ) nJ.textContent = String(t.weed);
  const nA = $("#note-alcool"); if (nA) nA.textContent = String(t.alcohol);
}

function applyModuleVisibility() {
  const cards = [
    { id: "#card-cigs", key: "cigs", toggle: "#toggle-cigs" },
    { id: "#card-weed", key: "weed", toggle: "#toggle-weed" },
    { id: "#card-alcool", key: "alcohol", toggle: "#toggle-alcool" }
  ];
  for (const c of cards) {
    const vis = isModuleEnabled(c.key);
    const el = $(c.id);
    if (el) el.style.display = vis ? "" : "none";
    const t = $(c.toggle);
    if (t) t.checked = !!vis;
  }
}

function bindToggles() {
  const map = [
    { key:"cigs",    sel:"#toggle-cigs",    card:"#card-cigs" },
    { key:"weed",    sel:"#toggle-weed",    card:"#card-weed" },
    { key:"alcohol", sel:"#toggle-alcool",  card:"#card-alcool" },
  ];
  for (const it of map) {
    const box = $(it.sel);
    if (!box) continue;
    box.addEventListener("change", () => {
      setModuleEnabled(it.key, !!box.checked);
      const card = $(it.card);
      if (card) card.style.display = box.checked ? "" : "none";
    });
  }
}

function bindPlusMinus() {
  // Cigarettes
  const clP = $("#cl-plus");  if (clP) clP.addEventListener("click", () => inc("cigs"));
  const clM = $("#cl-moins"); if (clM) clM.addEventListener("click", () => dec("cigs"));

  // Joints
  const jP = $("#j-plus");  if (jP) jP.addEventListener("click", () => inc("weed"));
  const jM = $("#j-moins"); if (jM) jM.addEventListener("click", () => dec("weed"));

  // Alcool (total, sans sous-types ici)
  const aP = $("#a-plus");  if (aP) aP.addEventListener("click", () => inc("alcohol", null, 1));
  const aM = $("#a-moins"); if (aM) aM.addEventListener("click", () => dec("alcohol", null, 1));
}

function bootAdvicesIfPresent() {
  // Initialise les conseils si le bloc est présent, sans modifier app.js ni index.html
  const card = $("#conseil-card");
  if (!card) return;
  import("./advices.js").then(m => {
    if (typeof m.initAdvices === "function") m.initAdvices();
  }).catch(()=>{});
}

export function initCounters() {
  applyModuleVisibility();
  bindToggles();
  bindPlusMinus();
  updateHeaderBars();
  updateCardNotes();
  bootAdvicesIfPresent();

  // Réagir aux changements d’état (pour Stats/Charts déjà un event global existe)
  on("sa:counts-updated", () => {
    updateHeaderBars();
    updateCardNotes();
  });
  on("sa:modules-changed", () => {
    applyModuleVisibility();
  });
}
