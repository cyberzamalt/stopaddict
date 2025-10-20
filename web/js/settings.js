// web/js/settings.js — v2.4.3 (plein écran Réglages, modale 18+ câblée)
// Objectif: rester fidèle au monolithe (pas de mini-modales pour Réglages)

const LS_SETTINGS = "app_settings_v23";

// ---------- Horloge (entête) ----------
function startClock() {
  const elDate = document.getElementById("date-actuelle");
  const elHeure = document.getElementById("heure-actuelle");
  function tick() {
    try {
      const now = new Date();
      if (elDate)  elDate.textContent  = now.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long" });
      if (elHeure) elHeure.textContent = now.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
    } catch {}
  }
  tick();
  setInterval(tick, 60_000);
}

// ---------- Settings (modules visibles Accueil) ----------
function readSettings() {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}"); }
  catch { return {}; }
}
function writeSettings(s) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s||{})); }
  catch {}
}

function applyModuleToggles() {
  const s = readSettings(); const m = s.modules || {};
  const cardC = document.getElementById("card-cigs");
  const cardW = document.getElementById("card-weed");
  const cardA = document.getElementById("card-alcool");
  if (cardC) cardC.style.display = (m.cigs    === false) ? "none" : "";
  if (cardW) cardW.style.display = (m.weed    === false) ? "none" : "";
  if (cardA) cardA.style.display = (m.alcohol === false) ? "none" : "";
}

function wireHomeToggles() {
  const s = readSettings(); s.modules = s.modules || {};
  const chkC = document.getElementById("toggle-cigs");
  const chkW = document.getElementById("toggle-weed");
  const chkA = document.getElementById("toggle-alcool");

  if (chkC) chkC.checked = !(s.modules.cigs    === false);
  if (chkW) chkW.checked = !(s.modules.weed    === false);
  if (chkA) chkA.checked = !(s.modules.alcohol === false);

  function persist() {
    s.modules = {
      cigs:    chkC ? !!chkC.checked : true,
      weed:    chkW ? !!chkW.checked : true,
      alcohol: chkA ? !!chkA.checked : true
    };
    writeSettings(s);
    applyModuleToggles();
    window.dispatchEvent(new CustomEvent("sa:settings:changed", { detail: s }));
  }
  chkC?.addEventListener("change", persist);
  chkW?.addEventListener("change", persist);
  chkA?.addEventListener("change", persist);

  applyModuleToggles();
}

// ---------- Lien "Ressources utiles" depuis la modale 18+ ----------
function wireWarnShortcut() {
  const link = document.getElementById("open-ressources-from-warn");
  if (!link) return;
  link.addEventListener("click", (e)=>{
    e.preventDefault();
    // Ici, on laisse ton onglet Réglages plein écran gérer l’affichage de la section Ressources
    window.dispatchEvent(new CustomEvent("sa:open:resources"));
  });
}

// ---------- Modale 18+ (validation/fermeture) ----------
function setupWarnModal(){
  const $ = (id)=>document.getElementById(id);
  const modal   = $("modal-warn");
  if (!modal) return;
  const chk18   = $("chk-warn-18");
  const chkHide = $("chk-warn-hide");
  const btnOK   = $("btn-warn-accept");
  const btnQuit = $("btn-warn-quit");
  const btnCanc = $("btn-warn-cancel");

  if (btnOK) btnOK.disabled = !(chk18 && chk18.checked);
  chk18?.addEventListener("change", ()=>{ if(btnOK) btnOK.disabled = !chk18.checked; });

  btnOK?.addEventListener("click", ()=>{
    try {
      localStorage.setItem("app_warn_v23", JSON.stringify({ accepted:true, hide: !!chkHide?.checked, ts: Date.now() }));
    } catch {}
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
  });

  btnCanc?.addEventListener("click", ()=>{
    if (chk18)  chk18.checked  = false;
    if (chkHide)chkHide.checked= false;
    if (btnOK)  btnOK.disabled = true;
  });

  btnQuit?.addEventListener("click", ()=> alert("Vous pouvez fermer l’application maintenant."));
}

// ---------- INIT PUBLIC ----------
export function initSettings() {
  startClock();
  wireHomeToggles();
  wireWarnShortcut();
  setupWarnModal();

  // réappliquer la visibilité au besoin
  window.addEventListener("sa:settings:changed", applyModuleToggles);
}
