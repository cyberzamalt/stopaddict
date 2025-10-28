// ============================================================
// advices.js — Conseil du jour (rotation simple)
// ============================================================
// - Affiche un conseil dans #conseil-texte
// - Boutons: #adv-prev (conseil précédent), #adv-pause (pause/reprise)
// - Persiste index + pause dans localStorage
// ============================================================

console.log("[advices.js] Module loaded");

var STORAGE_KEY = "sa_adv_v1";
var advices = [
  "Bois un grand verre d’eau quand l’envie monte : ça occupe l’esprit.",
  "Marche 5 minutes : l’envie baisse souvent avec le mouvement.",
  "Respire lentement 4-4-4 (inspire 4s, bloque 4s, expire 4s).",
  "Note ton déclencheur (stress, ennui, café) et évite-le 1 jour.",
  "Remplace la clope par 10 press-ups ou 20 squats.",
  "Appelle quelqu’un 2 minutes au lieu de fumer/boire.",
  "Prends un chewing-gum sans sucre : mâcher réduit l’envie.",
  "Occupe tes mains (balle anti-stress, stylo, élastique).",
  "Rappelle-toi ta raison n°1 d’arrêter. Écris-la!",
  "Chaque envie passe. Attends 3 minutes, puis 3 de plus."
];

var idx = 0;
var paused = false;
var timer = null;

function $(id){ return document.getElementById(id); }

function loadState(){
  try{
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var s = JSON.parse(raw);
    if (typeof s.idx === "number") idx = s.idx;
    if (typeof s.paused === "boolean") paused = s.paused;
  }catch(e){}
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify({ idx: idx, paused: paused })); }catch(e){}
}

function showAdvice(){
  var el = $("conseil-texte");
  if (!el) return;
  var text = advices[idx % advices.length];
  el.textContent = text;
}

function next(){
  idx = (idx + 1) % advices.length;
  saveState();
  showAdvice();
}
function prev(){
  idx = (idx - 1 + advices.length) % advices.length;
  saveState();
  showAdvice();
}

function startAuto(){
  stopAuto();
  if (paused) return;
  timer = setInterval(function(){ next(); }, 12000); // 12s
}
function stopAuto(){
  if (timer){ clearInterval(timer); timer = null; }
}

function setupButtons(){
  var bPrev = $("adv-prev");
  var bPause= $("adv-pause");
  if (bPrev) bPrev.addEventListener("click", function(){ prev(); });
  if (bPause) bPause.addEventListener("click", function(){
    paused = !paused;
    saveState();
    if (paused){
      stopAuto();
      bPause.textContent = "▶";
    } else {
      bPause.textContent = "⏸";
      startAuto();
    }
  });
}

// Public
export function initAdvices(){
  console.log("[advices.initAdvices] Starting...");
  try{
    loadState();
    showAdvice();
    setupButtons();
    if (!paused) startAuto();
    console.log("[advices.initAdvices] ✓ Ready");
  }catch(e){
    console.error("[advices.initAdvices] error:", e);
  }
}
