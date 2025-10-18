// web/js/settings.js
// -----------------------------------------------------------------------------
// Réglages & Navigation :
//  - Met à jour l'heure/la date en header
//  - Gère la NAV bas (écrans Accueil / Stats / Calendrier / Habitudes / Réglages)
//  - Ouvre la modale "Pages" (Manuel, CGU/CGV, Mentions, Ressources & numéros utiles)
//  - Gère les toggles modules (cigs/weed/alcool) présents sur l'accueil
//  - Pont "Importer/Exporter" via le menu Réglages (utilise window.SA.exporting)
//  - Relaye l'ouverture "Ressources" depuis la modale 18+ (#open-ressources-from-warn)
// -----------------------------------------------------------------------------

const SCREENS = {
  home:       "ecran-principal",
  stats:      "ecran-stats",
  calendar:   "ecran-calendrier",
  habits:     "ecran-habitudes"
  // pas d'"ecran-params" dans ton HTML: on ouvre une modale menu réglages.
};

const LS_SETTINGS = "app_settings_v23";

// ---------------- date/heure header ----------------
function startClock() {
  const elDate = document.getElementById("date-actuelle");
  const elHeure = document.getElementById("heure-actuelle");
  function tick() {
    const d = new Date();
    if (elDate)  elDate.textContent  = d.toLocaleDateString(undefined,{ weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    if (elHeure) elHeure.textContent = d.toLocaleTimeString(undefined,{ hour:"2-digit", minute:"2-digit" });
  }
  tick();
  setInterval(tick, 1000);
}

// ---------------- nav bas ----------------
function showScreen(id) {
  const all = document.querySelectorAll(".ecran");
  for (const n of all) n.classList.remove("show");
  const el = document.getElementById(id);
  if (el) el.classList.add("show");
  // prévenir les autres (charts lazy init, etc.)
  window.dispatchEvent(new Event("sa:settings:changed"));
}

function wireNav() {
  const map = [
    ["nav-principal",  SCREENS.home],
    ["nav-stats",      SCREENS.stats],
    ["nav-calendrier", SCREENS.calendar],
    ["nav-habitudes",  SCREENS.habits],
  ];
  for (const [btnId, scrId] of map) {
    const btn = document.getElementById(btnId);
    if (!btn) continue;
    btn.addEventListener("click", () => {
      // activer le bouton
      document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("actif"));
      btn.classList.add("actif");
      // afficher l'écran
      showScreen(scrId);
    });
  }

  // "Réglages" ouvre un menu (modale pages)
  const btnParams = document.getElementById("nav-params");
  if (btnParams) {
    btnParams.addEventListener("click", openSettingsMenu);
  }
}

// ---------------- toggles modules sur l'accueil ----------------
function loadSettings() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_SETTINGS) || "null");
    if (v && typeof v === "object") return v;
  } catch {}
  return {
    enabled: { cigs: true, weed: true, alcohol: true }
  };
}
function saveSettings(s) {
  try { localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); } catch {}
  window.dispatchEvent(new Event("sa:settings:changed"));
}
function applyModuleToggles() {
  const st = loadSettings();
  // cibles: les cartes de l'accueil
  const cardC = document.querySelector('#ecran-principal .card.bar-left');
  const cardW = document.querySelector('#ecran-principal .card.bar-left.green');
  const cardA = document.querySelector('#ecran-principal .card.bar-left.orange');

  if (cardC) cardC.style.display = st.enabled.cigs    ? "" : "none";
  if (cardW) cardW.style.display = st.enabled.weed    ? "" : "none";
  if (cardA) cardA.style.display = st.enabled.alcohol ? "" : "none";
}
function wireHomeToggles() {
  const st = loadSettings();

  const cC = document.getElementById("toggle-cigs");
  const cW = document.getElementById("toggle-weed");
  const cA = document.getElementById("toggle-alcool");

  if (cC) { cC.checked = !!st.enabled.cigs; cC.addEventListener("change", ()=>{ st.enabled.cigs = !!cC.checked; saveSettings(st); applyModuleToggles(); }); }
  if (cW) { cW.checked = !!st.enabled.weed; cW.addEventListener("change", ()=>{ st.enabled.weed = !!cW.checked; saveSettings(st); applyModuleToggles(); }); }
  if (cA) { cA.checked = !!st.enabled.alcohol; cA.addEventListener("change", ()=>{ st.enabled.alcohol = !!cA.checked; saveSettings(st); applyModuleToggles(); }); }

  applyModuleToggles();
}

// ---------------- Modale Pages (contenus légers inline) ----------------
function openPageModal(title, html) {
  const modal = document.getElementById("modal-page");
  const ttl   = document.getElementById("page-title");
  const body  = document.getElementById("page-content");
  if (!modal || !ttl || !body) return;
  ttl.textContent = title;
  body.innerHTML = html;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}
function closePageModal() {
  const modal = document.getElementById("modal-page");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

function contentRessources() {
  return `
    <div>
      <p>Besoin d'aide ? Voici quelques ressources utiles en France&nbsp;:</p>
      <ul>
        <li><strong>Tabac Info Service</strong> – 39 89 (appel non surtaxé)</li>
        <li><strong>Alcool Info Service</strong> – 0 980 980 930</li>
        <li><strong>Drogues Info Service</strong> – 0 800 23 13 13</li>
        <li>Urgence : <strong>15</strong> (SAMU) / <strong>112</strong></li>
      </ul>
      <p>Ces services offrent écoute, information et orientation vers des professionnels.</p>
    </div>
  `;
}
function contentManuel() {
  return `
    <div>
      <p><strong>StopAddict – Manuel rapide</strong></p>
      <ol>
        <li>Sur l'écran Accueil, utilisez +/− pour enregistrer vos consommations.</li>
        <li>Les onglets en bas permettent d'accéder aux Stats, au Calendrier et aux Habitudes.</li>
        <li>Dans <em>Habitudes</em>, définissez vos limites et dates clés (réduction/arrêt/objectif).</li>
        <li>Dans <em>Stats</em>, changez l'échelle (Jour/Semaine/Mois) et exportez vos données.</li>
        <li>Dans <em>Réglages</em>, importez/exportez vos données (changement de téléphone, sauvegarde).</li>
      </ol>
    </div>
  `;
}
function contentCgvCgu() {
  return `
    <div>
      <p><strong>Conditions d’utilisation</strong> : cette application fournit un auto-suivi à visée d’aide
      à la réduction/arrêt. Elle ne remplace pas un suivi médical. Vous devez être majeur(e).</p>
      <p>En utilisant l’application, vous acceptez que les données soient stockées localement sur votre appareil.</p>
    </div>
  `;
}
function contentMentions() {
  return `
    <div>
      <p><strong>Mentions légales</strong> : Application locale, sans envoi de données vers des serveurs tiers.
      Les données restent sur votre appareil (localStorage).</p>
    </div>
  `;
}

// ---------------- Menu Réglages (ouvre la modale pages) ----------------
function openSettingsMenu() {
  const hasExport = !!window?.SA?.exporting;
  const html = `
    <div>
      <div class="section-title">Réglages</div>
      <div class="grid-2">
        <button class="btn" id="set-open-manuel"   type="button">📘 Manuel</button>
        <button class="btn" id="set-open-ress"     type="button">🆘 Ressources utiles</button>
        <button class="btn" id="set-open-cgv"      type="button">📄 CGU/CGV</button>
        <button class="btn" id="set-open-mentions" type="button">ℹ️ Mentions</button>
        ${hasExport ? `
          <button class="btn" id="set-export-json" type="button">💾 Export JSON</button>
          <button class="btn" id="set-export-csv"  type="button">💾 Export CSV</button>
          <button class="btn" id="set-export-view" type="button">💾 Export vue Stats</button>
          <button class="btn" id="set-import"      type="button">📥 Importer (JSON/CSV)</button>
        ` : ``}
      </div>
    </div>
  `;
  openPageModal("Réglages", html);

  // sous-pages
  document.getElementById("set-open-manuel")?.addEventListener("click", ()=> openPageModal("Manuel", contentManuel()));
  document.getElementById("set-open-ress")?.addEventListener("click", ()=> openPageModal("Ressources utiles", contentRessources()));
  document.getElementById("set-open-cgv")?.addEventListener("click", ()=> openPageModal("CGU / CGV", contentCgvCgu()));
  document.getElementById("set-open-mentions")?.addEventListener("click", ()=> openPageModal("Mentions légales", contentMentions()));

  // import/export
  if (window?.SA?.exporting) {
    document.getElementById("set-export-json")?.addEventListener("click", ()=> window.SA.exporting.exportJSON());
    document.getElementById("set-export-csv") ?.addEventListener("click", ()=> window.SA.exporting.exportCSV());
    document.getElementById("set-export-view")?.addEventListener("click", ()=> window.SA.exporting.exportView());
    document.getElementById("set-import")     ?.addEventListener("click", ()=> window.SA.exporting.triggerImport());
  }
}

// ---------------- Ressources depuis la modale 18+ ----------------
function wireWarnShortcut() {
  document.getElementById("open-ressources-from-warn")?.addEventListener("click", (e)=>{
    e.preventDefault();
    openPageModal("Ressources utiles", contentRessources());
  });
}

// ---------------- Debug console (tap 5× sur la date) ----------------
function wireDebugConsole() {
  const target = document.getElementById("date-actuelle");
  const box = document.getElementById("debug-console");
  if (!target || !box) return;
  let taps = 0, last = 0;
  target.addEventListener("click", ()=>{
    const now = Date.now();
    if (now - last > 800) taps = 0;
    taps++; last = now;
    if (taps >= 5) {
      box.classList.toggle("show");
      taps = 0;
    }
  });
}

// ---------------- entrée publique ----------------
export function initSettings() {
  startClock();
  wireNav();
  wireHomeToggles();
  wireWarnShortcut();
  wireDebugConsole();

  // expose quelques helpers
  window.SA = window.SA || {};
  window.SA.pages = { open: openPageModal, close: closePageModal };
}
