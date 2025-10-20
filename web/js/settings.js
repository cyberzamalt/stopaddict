// web/js/settings.js
// COMPLET v2.4.1 - Réglages, Modales Pages, Toggles Modules, Warn 18+
// NOTE: La navigation (routing, showScreen) est gérée par app.js.

const LS_SETTINGS = "app_settings_v23";

// ============================================================
// HORLOGE (date/heure header)
// ============================================================
function startClock() {
  try {
    const elDate = document.getElementById("date-actuelle");
    const elHeure = document.getElementById("heure-actuelle");

    function tick() {
      try {
        const now = new Date();
        const optsDate = { weekday: "long", day: "2-digit", month: "long" };
        const optsHeure = { hour: "2-digit", minute: "2-digit" };
        if (elDate) elDate.textContent = now.toLocaleDateString("fr-FR", optsDate);
        if (elHeure) elHeure.textContent = now.toLocaleTimeString("fr-FR", optsHeure);
      } catch (e) {
        console.warn("[settings.tick] date render error:", e);
      }
    }
    tick();
    setInterval(tick, 60_000);
  } catch (e) {
    console.error("[settings.startClock] error:", e);
  }
}

// ============================================================
// SETTINGS (modules visibles Accueil)
// ============================================================
function readSettingsSafe() {
  try { return JSON.parse(localStorage.getItem(LS_SETTINGS) || "{}"); }
  catch { return {}; }
}
function saveSettingsSafe(obj) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(obj || {})); }
  catch (e) { console.warn("[settings.saveSettingsSafe]", e); }
}

function applyModuleToggles() {
  try {
    const s = readSettingsSafe();
    const mods = s.modules || {};
    const cardC = document.getElementById("card-cigs");   // Cigarettes
    const cardW = document.getElementById("card-weed");   // Joints
    const cardA = document.getElementById("card-alcool"); // Alcool

    if (cardC) cardC.style.display = (mods.cigs    === false) ? "none" : "";
    if (cardW) cardW.style.display = (mods.weed    === false) ? "none" : "";
    if (cardA) cardA.style.display = (mods.alcohol === false) ? "none" : "";
  } catch (e) {
    console.error("[settings.applyModuleToggles] error:", e);
  }
}

function wireHomeToggles() {
  try {
    const s = readSettingsSafe();
    s.modules = s.modules || {};
    const mods = s.modules;

    const chkC = document.getElementById("toggle-cigs");
    const chkW = document.getElementById("toggle-weed");
    const chkA = document.getElementById("toggle-alcool");

    if (chkC) chkC.checked = !(mods.cigs === false);
    if (chkW) chkW.checked = !(mods.weed === false);
    if (chkA) chkA.checked = !(mods.alcohol === false);

    function persist() {
      try {
        s.modules = {
          cigs:    chkC ? !!chkC.checked : true,
          weed:    chkW ? !!chkW.checked : true,
          alcohol: chkA ? !!chkA.checked : true
        };
        saveSettingsSafe(s);
        applyModuleToggles();
      } catch (e) {
        console.error("[settings.persist toggles] error:", e);
      }
    }

    chkC?.addEventListener("change", persist);
    chkW?.addEventListener("change", persist);
    chkA?.addEventListener("change", persist);
    applyModuleToggles();
  } catch (e) {
    console.error("[settings.wireHomeToggles] error:", e);
  }
}

// ============================================================
// PAGES MODALES (Manuel / Ressources / Mentions / CGU)
// ============================================================
function openPageModal(title, html) {
  try {
    const modal = document.getElementById("modal-page");
    const h3    = document.getElementById("page-title");
    const body  = document.getElementById("page-content");
    if (!modal || !h3 || !body) return;

    h3.textContent = title || "—";
    body.innerHTML = html || "";
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    const btnClose = document.getElementById("btn-page-close");
    btnClose?.addEventListener("click", () => closePageModal(), { once: true });
  } catch (e) {
    console.error("[settings.openPageModal] error:", e);
  }
}
function closePageModal() {
  try {
    const modal = document.getElementById("modal-page");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  } catch (e) {
    console.error("[settings.closePageModal] error:", e);
  }
}

function contentManual() {
  return `
    <div>
      <p><strong>Bienvenue dans StopAddict</strong>.</p>
      <ol>
        <li><em>Accueil</em> : utilisez les boutons ± pour enregistrer.</li>
        <li><em>Habitudes</em> : fixez limites et objectifs.</li>
        <li><em>Stats</em> : changez l'échelle (Jour/Semaine/Mois) et exportez.</li>
        <li><em>Réglages</em> : import/export des données locales.</li>
      </ol>
    </div>
  `;
}
function contentCgvCgu() {
  return `
    <div>
      <p><strong>Conditions d'utilisation</strong> : auto-suivi d’aide à la réduction/arrêt. Ne remplace pas un suivi médical.</p>
      <p>Les données restent <em>localement</em> sur l’appareil (localStorage).</p>
    </div>
  `;
}
function contentMentions() {
  return `
    <div>
      <p>Éditeur : Projet personnel • Licence MIT • Aucune collecte externe.</p>
    </div>
  `;
}
function contentRessources() {
  return `
    <div>
      <ul>
        <li><strong>Tabac info service</strong> : 39 89</li>
        <li><strong>Alcool info service</strong> : 0&nbsp;980&nbsp;980&nbsp;930</li>
        <li><strong>Drogues info service</strong> : 0&nbsp;800&nbsp;23&nbsp;13&nbsp;13</li>
      </ul>
    </div>
  `;
}

// Menu “Réglages” (ouvert via event depuis app.js)
function openSettingsMenu() {
  try {
    const html = `
      <div class="settings-menu">
        <h4>Réglages</h4>
        <div class="grid">
          <button class="btn" id="btn-open-manuel">Manuel d'utilisation</button>
          <button class="btn" id="btn-open-ressources">Ressources utiles</button>
          <button class="btn" id="btn-open-mentions">Mentions légales</button>
          <button class="btn" id="btn-open-cgv">Conditions d'utilisation</button>
        </div>
        <hr/>
        <h4>Import / Export</h4>
        <div class="grid">
          <button class="btn" id="btn-trigger-export">Exporter mes données</button>
          <button class="btn" id="btn-trigger-import">Importer des données</button>
        </div>
      </div>
    `;
    openPageModal("Réglages", html);

    document.getElementById("btn-open-manuel")   ?.addEventListener("click", ()=> openPageModal("Manuel", contentManual()));
    document.getElementById("btn-open-ressources")?.addEventListener("click", ()=> openPageModal("Ressources utiles", contentRessources()));
    document.getElementById("btn-open-mentions") ?.addEventListener("click", ()=> openPageModal("Mentions légales", contentMentions()));
    document.getElementById("btn-open-cgv")      ?.addEventListener("click", ()=> openPageModal("Conditions d'utilisation", contentCgvCgu()));

    document.getElementById("btn-trigger-export")?.addEventListener("click", ()=> {
      try { window.dispatchEvent(new CustomEvent("sa:export")); } catch(e){ console.error(e); }
    });
    document.getElementById("btn-trigger-import")?.addEventListener("click", ()=> {
      try { window.dispatchEvent(new CustomEvent("sa:import")); } catch(e){ console.error(e); }
    });
  } catch (e) {
    console.error("[settings.openSettingsMenu] error:", e);
  }
}

// Lien “Ressources” depuis la modale 18+
function wireWarnShortcut() {
  try {
    const link = document.getElementById("open-ressources-from-warn");
    if (!link) return;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openPageModal("Ressources utiles", contentRessources());
    });
  } catch (e) {
    console.error("[settings.wireWarnShortcut] error:", e);
  }
}

// Bus d’événements (ouverture du menu Réglages)
function wireEventBus() {
  try {
    window.addEventListener("sa:openSettingsMenu", () => openSettingsMenu());
  } catch (e) {
    console.error("[settings.wireEventBus] error:", e);
  }
}

// ============================================================
// AVERTISSEMENT 18+ — câblage complet (validation/fermeture)
// ============================================================
function setupWarnModal(){
  try{
    const $ = (id)=>document.getElementById(id);
    const modal   = $("modal-warn");
    const chk18   = $("chk-warn-18");
    const chkHide = $("chk-warn-hide");
    const btnOK   = $("btn-warn-accept");
    const btnQuit = $("btn-warn-quit");
    const btnCanc = $("btn-warn-cancel");

    if (!modal) return;

    // État initial du bouton
    if (btnOK) btnOK.disabled = !(chk18 && chk18.checked);

    // Activation/désactivation au tick
    chk18?.addEventListener("change", ()=>{ if(btnOK) btnOK.disabled = !chk18.checked; });

    // Valider → enregistrer + fermer
    btnOK?.addEventListener("click", ()=>{
      try {
        const payload = { accepted:true, hide: !!chkHide?.checked, ts: Date.now() };
        localStorage.setItem("app_warn_v23", JSON.stringify(payload));
      } catch(e) {
        console.warn("[settings.setupWarnModal] persist warn error:", e);
      }
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
    });

    // Annuler → réinitialiser cases + désactiver bouton
    btnCanc?.addEventListener("click", ()=>{
      if (chk18) chk18.checked = false;
      if (chkHide) chkHide.checked = false;
      if (btnOK) btnOK.disabled = true;
    });

    // Quitter → info
    btnQuit?.addEventListener("click", ()=>{
      alert("Vous pouvez fermer l’application maintenant.");
    });
  }catch(e){
    console.error("[settings.setupWarnModal] error:", e);
  }
}

// ============================================================
// INIT PUBLIC
// ============================================================
export function initSettings() {
  try {
    startClock();
    wireHomeToggles();
    wireWarnShortcut();
    setupWarnModal();
    wireEventBus();

    // Helpers exposés
    window.SA = window.SA || {};
    window.SA.pages = { open: openPageModal, close: closePageModal, openSettings: openSettingsMenu };

    // Re-appliquer l’affichage des modules au changement de settings
    window.addEventListener("sa:settings:changed", applyModuleToggles);
  } catch (e) {
    console.error("[settings.init] CRITICAL:", e);
  }
}
