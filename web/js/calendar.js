// ============================================================
// calendar.js — Calendrier mensuel + modale jour (PHASE 2)
// ============================================================
// Objectif minimal fiable sans dépendre de fonctions inconnues :
// - Affiche le mois en cours
// - Navigation ◀ / ▶
// - Ouvre la modale jour : édition active uniquement si le jour = aujourd’hui
// - Pour aujourd’hui : +/- et RAZ fonctionnent (via addEntry/removeEntry)
// - Pour autres jours : lecture seule (texte "édition bientôt")
// ============================================================

import { addEntry, removeEntry, getDaily, on } from "./state.js";

console.log("[calendar.js] Module loaded");

var cur = new Date(); // mois affiché (1er du mois non nécessaire)
function $(id){ return document.getElementById(id); }

function ymd(d){
  var y = d.getFullYear();
  var m = d.getMonth()+1; if (m<10) m = "0"+m;
  var day = d.getDate(); if (day<10) day = "0"+day;
  return y + "-" + m + "-" + day;
}
function todayYMD(){ return ymd(new Date()); }

function firstOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }

function renderTitle(){
  var t = $("cal-titre");
  if (!t) return;
  var mo = cur.toLocaleString("fr-FR", { month: "long" });
  t.textContent = (mo.charAt(0).toUpperCase() + mo.slice(1)) + " " + cur.getFullYear();
}

function buildGrid(){
  var grid = $("cal-grid");
  if (!grid) return;

  grid.innerHTML = "";
  var first = firstOfMonth(cur);
  var last  = lastOfMonth(cur);

  // Commencer au lundi (ou dimanche selon locale), ici on aligne sur lundi:
  var start = new Date(first);
  var dayOfWeek = (first.getDay()+6)%7; // 0=lundi ... 6=dimanche
  start.setDate(first.getDate() - dayOfWeek);

  // 6 lignes x 7 colonnes = 42 cases
  for (var i=0; i<42; i++){
    var d = new Date(start);
    d.setDate(start.getDate() + i);

    var cell = document.createElement("div");
    cell.className = "cal-cell";

    // Numéro du jour
    var num = document.createElement("div");
    num.className = "cal-num";
    num.textContent = String(d.getDate());
    cell.appendChild(num);

    // Style today
    if (ymd(d) === todayYMD()){
      cell.className += " today";
    }

    // Style hors mois
    if (d.getMonth() !== cur.getMonth()){
      cell.style.opacity = "0.4";
    }

    // (facultatif) pointillés indicatifs
    var dots = document.createElement("div");
    // Ici on ne dispose pas de l’historique par date -> on reste neutre
    // Vous pourrez peupler .dot selon vos données ultérieures.
    dots.innerHTML = '<span class="dot c"></span><span class="dot j"></span><span class="dot a"></span>';
    dots.style.opacity = "0.25";
    cell.appendChild(dots);

    // Click -> modale jour
    (function(dateCopy){
      cell.addEventListener("click", function(){
        openDayModal(dateCopy);
      });
    })(new Date(d));

    grid.appendChild(cell);
  }
}

function openDayModal(d){
  var modal = $("cal-jour");
  if (!modal) return;

  var title = $("cal-jour-titre");
  var cl    = $("cal-jour-cl");
  var j     = $("cal-jour-j");
  var a     = $("cal-jour-a");

  var isToday = (ymd(d) === todayYMD());
  var fmt = d.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
  if (title) title.textContent = fmt.charAt(0).toUpperCase() + fmt.slice(1);

  // Récupérer les compteurs du jour concerné
  // -> on ne sait éditer que "aujourd'hui" avec state.js actuel
  var counts = getDaily();
  var cigs = isToday ? (counts.cigs||0) : 0;
  var weed = isToday ? (counts.weed||0) : 0;
  var alco = isToday ? (counts.alcohol||0) : 0;

  if (cl) cl.textContent = String(cigs);
  if (j)  j.textContent  = String(weed);
  if (a)  a.textContent  = String(alco);

  // Boutons
  setupDayButtons(isToday);

  modal.setAttribute("aria-hidden","false");
  modal.style.display = "flex";
}

function setupDayButtons(isToday){
  var plusC = $("cal-cl-plus");
  var moinsC= $("cal-cl-moins");
  var plusJ = $("cal-j-plus");
  var moinsJ= $("cal-j-moins");
  var plusA = $("cal-a-plus");
  var moinsA= $("cal-a-moins");
  var raz   = $("cal-jour-raz");
  var close = $("cal-jour-fermer");

  function setDisabled(dis){
    if (plusC) plusC.disabled = dis;
    if (moinsC) moinsC.disabled = dis;
    if (plusJ) plusJ.disabled = dis;
    if (moinsJ) moinsJ.disabled = dis;
    if (plusA) plusA.disabled = dis;
    if (moinsA) moinsA.disabled = dis;
    if (raz)   raz.disabled   = dis;
  }

  // Nettoyage des anciens listeners: on clone/replace
  function resetBtn(id){
    var b = $(id);
    if (!b) return null;
    var nb = b.cloneNode(true);
    b.parentNode.replaceChild(nb, b);
    return nb;
  }
  plusC = resetBtn("cal-cl-plus");
  moinsC= resetBtn("cal-cl-moins");
  plusJ = resetBtn("cal-j-plus");
  moinsJ= resetBtn("cal-j-moins");
  plusA = resetBtn("cal-a-plus");
  moinsA= resetBtn("cal-a-moins");
  raz   = resetBtn("cal-jour-raz");
  close = resetBtn("cal-jour-fermer");

  if (!isToday){
    setDisabled(true);
  }else{
    setDisabled(false);

    if (plusC) plusC.addEventListener("click", function(){ addEntry("cigs", 1); });
    if (moinsC)moinsC.addEventListener("click", function(){ addEntry("cigs", 1*-1); removeEntry("cigs",1); });
    if (plusJ) plusJ.addEventListener("click", function(){ addEntry("weed", 1); });
    if (moinsJ)moinsJ.addEventListener("click", function(){ addEntry("weed", 1*-1); removeEntry("weed",1); });
    if (plusA) plusA.addEventListener("click", function(){ addEntry("alcohol", 1); });
    if (moinsA)moinsA.addEventListener("click", function(){ addEntry("alcohol", 1*-1); removeEntry("alcohol",1); });

    if (raz) raz.addEventListener("click", function(){
      try{
        var c = getDaily();
        var nC = c.cigs||0, nW = c.weed||0, nA = c.alcohol||0;
        for (var i=0;i<nC;i++) removeEntry("cigs",1);
        for (var j=0;j<nW;j++) removeEntry("weed",1);
        for (var k=0;k<nA;k++) removeEntry("alcohol",1);
      }catch(e){ console.warn("[calendar] RAZ error:", e); }
    });
  }

  if (close){
    close.addEventListener("click", function(){
      var modal = $("cal-jour");
      if (!modal) return;
      modal.setAttribute("aria-hidden","true");
      modal.style.display = "none";
    });
  }
}

function wireNav(){
  var prev = $("cal-prev");
  var next = $("cal-next");
  if (prev) prev.addEventListener("click", function(){
    cur = new Date(cur.getFullYear(), cur.getMonth()-1, 1);
    renderTitle(); buildGrid();
  });
  if (next) next.addEventListener("click", function(){
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
    renderTitle(); buildGrid();
  });
}

// Public
export function initCalendar(){
  console.log("[calendar.initCalendar] Starting...");
  try{
    renderTitle();
    buildGrid();
    wireNav();

    on("sa:counts-updated", function(){
      // au changement de compteurs, rafraîchir le grid (au moins today)
      buildGrid();
    });

    console.log("[calendar.initCalendar] ✓ Ready");
  }catch(e){
    console.error("[calendar.initCalendar] error:", e);
  }
}
