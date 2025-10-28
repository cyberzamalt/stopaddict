// ============================================================
// habits.js — Limites, baselines, dates + toggles modules
// ============================================================
// - Sauvegarde/chargement des champs de l'écran Habitudes
// - Gère les toggles des cartes (cigarettes / joints / alcool)
// - Émet des events pour info: "sa:habits-updated", "sa:module-toggle"
// ============================================================

import { on, emit } from "./state.js";

console.log("[habits.js] Module loaded");

var STORAGE_KEY = "sa_habits_v1";
var TOGGLES_KEY = "sa_toggles_v1";

function $(id){ return document.getElementById(id); }

// ---------------------------
// Storage
// ---------------------------
function loadJSON(key, def){
  try{
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (def || {});
  }catch(e){
    console.warn("[habits] loadJSON error:", e);
    return (def || {});
  }
}
function saveJSON(key, obj){
  try{ localStorage.setItem(key, JSON.stringify(obj)); }catch(e){ console.warn("[habits] saveJSON error:", e); }
}

// ---------------------------
// Habitudes: hydrater / lire
// ---------------------------
function hydrateInputs(){
  var h = loadJSON(STORAGE_KEY, {});

  // Limites
  setVal("limite-clopes", num(h["limite-clopes"], 0));
  setVal("limite-joints", num(h["limite-joints"], 0));
  setVal("limite-biere",  num(h["limite-biere"],  0));
  setVal("limite-fort",   num(h["limite-fort"],   0));
  setVal("limite-liqueur",num(h["limite-liqueur"],0));

  // Baselines
  setVal("hab-min-cl-class", num(h["hab-min-cl-class"], 0));
  setVal("hab-max-cl-class", num(h["hab-max-cl-class"], 0));
  setVal("hab-min-cl-roul",  num(h["hab-min-cl-roul"],  0));
  setVal("hab-max-cl-roul",  num(h["hab-max-cl-roul"],  0));
  setVal("hab-min-cl-tube",  num(h["hab-min-cl-tube"],  0));
  setVal("hab-max-cl-tube",  num(h["hab-max-cl-tube"],  0));
  setVal("hab-min-joint",    num(h["hab-min-joint"],    0));
  setVal("hab-max-joint",    num(h["hab-max-joint"],    0));
  setVal("hab-min-biere",    num(h["hab-min-biere"],    0));
  setVal("hab-max-biere",    num(h["hab-max-biere"],    0));
  setVal("hab-min-fort",     num(h["hab-min-fort"],     0));
  setVal("hab-max-fort",     num(h["hab-max-fort"],     0));
  setVal("hab-min-liqueur",  num(h["hab-min-liqueur"],  0));
  setVal("hab-max-liqueur",  num(h["hab-max-liqueur"],  0));

  // Dates clés
  setVal("date-reduc-clopes", safe(h["date-reduc-clopes"]));
  setVal("date-stop-clopes",  safe(h["date-stop-clopes"]));
  setVal("date-no-clopes",    safe(h["date-no-clopes"]));
  setVal("date-reduc-joints", safe(h["date-reduc-joints"]));
  setVal("date-stop-joints",  safe(h["date-stop-joints"]));
  setVal("date-no-joints",    safe(h["date-no-joints"]));
  setVal("date-reduc-alcool", safe(h["date-reduc-alcool"]));
  setVal("date-stop-alcool",  safe(h["date-stop-alcool"]));
  setVal("date-no-alcool",    safe(h["date-no-alcool"]));
}

function collectInputs(){
  var h = {};
  // Limites
  h["limite-clopes"]  = num(getVal("limite-clopes"), 0);
  h["limite-joints"]  = num(getVal("limite-joints"), 0);
  h["limite-biere"]   = num(getVal("limite-biere"),  0);
  h["limite-fort"]    = num(getVal("limite-fort"),   0);
  h["limite-liqueur"] = num(getVal("limite-liqueur"),0);

  // Baselines
  h["hab-min-cl-class"] = num(getVal("hab-min-cl-class"), 0);
  h["hab-max-cl-class"] = num(getVal("hab-max-cl-class"), 0);
  h["hab-min-cl-roul"]  = num(getVal("hab-min-cl-roul"),  0);
  h["hab-max-cl-roul"]  = num(getVal("hab-max-cl-roul"),  0);
  h["hab-min-cl-tube"]  = num(getVal("hab-min-cl-tube"),  0);
  h["hab-max-cl-tube"]  = num(getVal("hab-max-cl-tube"),  0);
  h["hab-min-joint"]    = num(getVal("hab-min-joint"),    0);
  h["hab-max-joint"]    = num(getVal("hab-max-joint"),    0);
  h["hab-min-biere"]    = num(getVal("hab-min-biere"),    0);
  h["hab-max-biere"]    = num(getVal("hab-max-biere"),    0);
  h["hab-min-fort"]     = num(getVal("hab-min-fort"),     0);
  h["hab-max-fort"]     = num(getVal("hab-max-fort"),     0);
  h["hab-min-liqueur"]  = num(getVal("hab-min-liqueur"),  0);
  h["hab-max-liqueur"]  = num(getVal("hab-max-liqueur"),  0);

  // Dates
  h["date-reduc-clopes"] = safe(getVal("date-reduc-clopes"));
  h["date-stop-clopes"]  = safe(getVal("date-stop-clopes"));
  h["date-no-clopes"]    = safe(getVal("date-no-clopes"));
  h["date-reduc-joints"] = safe(getVal("date-reduc-joints"));
  h["date-stop-joints"]  = safe(getVal("date-stop-joints"));
  h["date-no-joints"]    = safe(getVal("date-no-joints"));
  h["date-reduc-alcool"] = safe(getVal("date-reduc-alcool"));
  h["date-stop-alcool"]  = safe(getVal("date-stop-alcool"));
  h["date-no-alcool"]    = safe(getVal("date-no-alcool"));

  return h;
}

// ---------------------------
// Helpers DOM valeurs
// ---------------------------
function getVal(id){
  var el = $(id); return el ? el.value : "";
}
function setVal(id, v){
  var el = $(id); if (el) el.value = v;
}
function num(v, d){
  var n = parseFloat(v); return isFinite(n) ? n : (d||0);
}
function safe(v){ return (typeof v === "string") ? v : ""; }

// ---------------------------
// Toggles modules (Accueil)
// ---------------------------
function applyToggleUI(){
  var tg = loadJSON(TOGGLES_KEY, { cigs:true, weed:true, alcohol:true });

  toggleCard("cigs",    tg.cigs !== false);
  toggleCard("weed",    tg.weed !== false);
  toggleCard("alcohol", tg.alcohol !== false);

  // Hydrater les checkboxes
  var cbC = $("toggle-cigs");
  var cbW = $("toggle-weed");
  var cbA = $("toggle-alcool");
  if (cbC) cbC.checked = tg.cigs !== false;
  if (cbW) cbW.checked = tg.weed !== false;
  if (cbA) cbA.checked = tg.alcohol !== false;
}

function toggleCard(type, enabled){
  var cardId = type==="cigs" ? "card-cigs" : (type==="weed" ? "card-weed" : "card-alcool");
  var btnPlus = type==="cigs" ? "cl-plus" : (type==="weed" ? "j-plus" : "a-plus");
  var btnMoins= type==="cigs" ? "cl-moins": (type==="weed" ? "j-moins": "a-moins");

  var card = $(cardId);
  var bp = $(btnPlus);
  var bm = $(btnMoins);

  if (card){
    if (!enabled){
      card.style.opacity = "0.5";
    } else {
      card.style.opacity = "1";
    }
  }
  if (bp) bp.disabled = !enabled;
  if (bm) bm.disabled = !enabled;
}

// ---------------------------
// Wiring
// ---------------------------
function setupSave(){
  var btn = $("btn-save-hab");
  if (!btn) return;
  btn.addEventListener("click", function(){
    try{
      var data = collectInputs();
      saveJSON(STORAGE_KEY, data);
      console.log("[habits] saved", data);
      emit("sa:habits-updated", { habits: data });
      showToast("Paramètres enregistrés");
    }catch(e){
      console.error("[habits] save error:", e);
    }
  });
}

function setupToggles(){
  var cbC = $("toggle-cigs");
  var cbW = $("toggle-weed");
  var cbA = $("toggle-alcool");

  function saveAndEmit(){
    var tg = {
      cigs: cbC ? !!cbC.checked : true,
      weed: cbW ? !!cbW.checked : true,
      alcohol: cbA ? !!cbA.checked : true
    };
    saveJSON(TOGGLES_KEY, tg);
    toggleCard("cigs", tg.cigs);
    toggleCard("weed", tg.weed);
    toggleCard("alcohol", tg.alcohol);
    emit("sa:module-toggle", { toggles: tg });
  }

  if (cbC) cbC.addEventListener("change", saveAndEmit);
  if (cbW) cbW.addEventListener("change", saveAndEmit);
  if (cbA) cbA.addEventListener("change", saveAndEmit);
}

function showToast(msg){
  try{
    var s = $("snackbar");
    if (!s) return;
    s.textContent = msg;
    s.classList.add("show");
    setTimeout(function(){ s.classList.remove("show"); }, 2000);
  }catch(e){}
}

// ---------------------------
// Public
// ---------------------------
export function initHabits(){
  console.log("[habits.initHabits] Starting...");
  try{
    hydrateInputs();
    setupSave();
    setupToggles();
    applyToggleUI();

    // Quand d'autres modules mettent à jour, on peut ré-appliquer si besoin
    on("sa:counts-updated", function(){ /* no-op */ });
    console.log("[habits.initHabits] ✓ Ready");
  }catch(e){
    console.error("[habits.initHabits] error:", e);
  }
}
