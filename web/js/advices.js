/* web/js/advices.js
   Conseils rotatifs filtrés selon modules & usages — v2
*/
import { $, loadJSON, saveJSON } from "./utils.js";
import { on, todayTotals, isModuleEnabled } from "./state.js";

const LS_ADV_IDX   = "sa:adv:index";
const LS_ADV_PAUSE = "sa:adv:paused";
const DATA_URL     = "./data/advices.json";

let advices = [];
let timer   = null;
let idx     = Number(localStorage.getItem(LS_ADV_IDX) || 0) || 0;
let paused  = localStorage.getItem(LS_ADV_PAUSE) === "1";

function setPaused(p) {
  paused = !!p;
  localStorage.setItem(LS_ADV_PAUSE, paused ? "1":"0");
}

function pickPool() {
  // Filtrage très tolérant : si le JSON contient des tags, on filtre par modules actifs.
  const active = [];
  if (isModuleEnabled("cigs")) active.push("cigs","cigarettes","tabac");
  if (isModuleEnabled("weed")) active.push("weed","cannabis","joint","joints");
  if (isModuleEnabled("alcohol")) active.push("alcohol","alcool","drink");

  const t = todayTotals();

  const pool = advices.filter(a => {
    if (!a || typeof a !== "object") return false;
    // tags optionnels
    if (Array.isArray(a.tags) && a.tags.length) {
      const hasCommon = a.tags.some(tag => active.includes(String(tag).toLowerCase()) || String(tag).toLowerCase()==="generic");
      if (!hasCommon) return false;
    }
    // seuils optionnels
    if (a.minCigs != null && t.cigs < Number(a.minCigs)) return false;
    if (a.minWeed != null && t.weed < Number(a.minWeed)) return false;
    if (a.minAlcohol != null && t.alcohol < Number(a.minAlcohol)) return false;
    return true;
  });

  // fallback si pool vide
  if (!pool.length) {
    return advices.filter(a => Array.isArray(a.tags) ? a.tags.includes("generic") : true);
  }
  return pool;
}

function show(idxToShow) {
  const el = $("#conseil-texte");
  if (!el) return;
  const pool = pickPool();
  if (!pool.length) {
    el.textContent = "Conseil bien-être : note tes réussites d’aujourd’hui. Même petites, elles comptent.";
    return;
  }
  const i = ((idxToShow % pool.length) + pool.length) % pool.length;
  const a = pool[i];

  // Support {text} ou {html} ou simple string
  if (typeof a === "string") {
    el.textContent = a;
  } else if (a && a.html) {
    el.innerHTML = a.html;
  } else if (a && a.text) {
    el.textContent = a.text;
  } else {
    el.textContent = String(a);
  }
}

function next() {
  idx++;
  localStorage.setItem(LS_ADV_IDX, String(idx));
  show(idx);
}
function prev() {
  idx--;
  localStorage.setItem(LS_ADV_IDX, String(idx));
  show(idx);
}

function startLoop() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (!paused) next();
  }, 12000); // 12 s
}

async function loadAdvices() {
  try {
    const res = await fetch(DATA_URL, { cache:"no-store" });
    if (!res.ok) throw new Error(res.statusText);
    const j = await res.json();
    if (Array.isArray(j)) advices = j;
    else if (Array.isArray(j?.advices)) advices = j.advices;
  } catch (e) {
    // Fallback générique
    advices = [
      { text:"Hydrate-toi régulièrement et note une envie que tu as su éviter aujourd’hui.", tags:["generic"] },
      { text:"Une baisse durable vaut mieux qu’un arrêt brutal si tu ne te sens pas prêt. Fixe un petit objectif atteignable.", tags:["generic"] },
      { text:"Marche 10 minutes quand l’envie monte : bouger change l’état interne et l’attente diminue.", tags:["generic"] },
      { text:"Note ton heure de dernière consommation : visualiser l’écart renforce la motivation.", tags:["generic"] },
    ];
  }
}

function bindControls() {
  const bPrev = $("#adv-prev");
  const bPause = $("#adv-pause");

  if (bPrev) bPrev.addEventListener("click", () => { prev(); });
  if (bPause) bPause.addEventListener("click", () => {
    setPaused(!paused);
    // feedback minimal visuel
    bPause.textContent = paused ? "▶" : "⏸";
  });
}

export async function initAdvices() {
  // Si l’UI n’est pas présente, on ne fait rien
  const card = $("#conseil-card");
  if (!card) return;

  await loadAdvices();
  bindControls();
  show(idx);
  startLoop();

  // Refiltrer à chaque MAJ de compteurs ou modules
  on("sa:counts-updated", () => show(idx));
  on("sa:modules-changed", () => show(idx));
}
