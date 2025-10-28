// ============================================================
// pages.js — Pages modales (Ressources / Manuel / etc.)
// ============================================================
// - Ouvre #modal-page et injecte un contenu simple
// - Gère le lien #open-ressources-from-warn
// - Pas d'optional chaining pour compatibilité WebView
// ============================================================

console.log("[pages.js] Module loaded");

function $(id){ return document.getElementById(id); }

function openModalPage(title, html){
  try{
    var modal = $("modal-page");
    var h     = $("page-title");
    var c     = $("page-content");
    if (!modal || !h || !c) return;
    h.textContent = title;
    c.innerHTML = html;
    modal.setAttribute("aria-hidden","false");
    modal.style.display = "flex";
  }catch(e){
    console.error("[pages] openModalPage error:", e);
  }
}
function closeModalPage(){
  try{
    var modal = $("modal-page");
    if (!modal) return;
    modal.setAttribute("aria-hidden","true");
    modal.style.display = "none";
  }catch(e){}
}

function htmlRessources(){
  // Contenu neutre (à compléter si besoin)
  return [
    '<div class="card">',
    '<p><strong>Ressources et numéros utiles</strong></p>',
    '<ul style="padding-left:18px; line-height:1.6">',
    '<li>Tabac : service d’aide (ex. ligne nationale), site officiel de santé.</li>',
    '<li>Alcool : structures d’écoute et d’accompagnement.</li>',
    '<li>Cannabis : informations, écoute et orientation.</li>',
    '<li>Urgence : contactez les services d’urgence de votre pays si nécessaire.</li>',
    '</ul>',
    '<p style="font-size:12px;color:#6b7280">Ce contenu est générique et peut être adapté à votre région.</p>',
    '</div>'
  ].join("");
}

function setupLinks(){
  var l = $("open-ressources-from-warn");
  if (l){
    l.addEventListener("click", function(e){
      try{
        e.preventDefault();
      }catch(err){}
      openModalPage("Ressources utiles", htmlRessources());
    });
  }
  var btnClose = $("btn-page-close");
  if (btnClose){
    btnClose.addEventListener("click", function(){ closeModalPage(); });
  }
}

// Public
export function initPages(){
  console.log("[pages.initPages] Starting...");
  try{
    setupLinks();
    console.log("[pages.initPages] ✓ Ready");
  }catch(e){
    console.error("[pages.initPages] error:", e);
  }
}
