// web/js/settings.js
// FICHIER COMPLET - Copier-coller direct dans GitHub
// Rôle: Toggles modules + Pages (modale) + Clock + Debug

import { getSettings, saveSettings, on, emit } from "./state.js";

// ============================================================
// HORLOGE HEADER
// ============================================================
function startClock() {
  try {
    const elDate = document.getElementById("date-actuelle");
    const elHeure = document.getElementById("heure-actuelle");

    function tick() {
      const d = new Date();
      if (elDate) {
        elDate.textContent = d.toLocaleDateString(undefined, {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
      }
      if (elHeure) {
        elHeure.textContent = d.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }

    tick();
    setInterval(tick, 1000);
    console.log("[settings.clock] Clock started");
  } catch (e) {
    console.error("[settings.clock] error:", e);
  }
}

// ============================================================
// TOGGLES MODULES (Accueil: Je fume / Je bois)
// ============================================================
function applyModuleVisibility() {
  try {
    const settings = getSettings() || {};
    const modules = settings.modules || { cigs: true, weed: true, alcohol: true };

    // Cibles: les 3 cartes de l'accueil
    const cardCigs = document.querySelector("#ecran-principal .card.bar-left");
    const cardWeed = document.querySelector("#ecran-principal .card.bar-left.green");
    const cardAlc = document.querySelector("#ecran-principal .card.bar-left.orange");

    if (cardCigs) cardCigs.style.display = modules.cigs ? "" : "none";
    if (cardWeed) cardWeed.style.display = modules.weed ? "" : "none";
    if (cardAlc) cardAlc.style.display = modules.alcohol ? "" : "none";

    // Ligne alcool du bandeau (aussi conditionnel)
    const lineAlc = document.getElementById("bandeau-alcool-line");
    if (lineAlc) lineAlc.style.display = modules.alcohol ? "" : "none";

    console.log("[settings.modules] Applied visibility:", modules);
  } catch (e) {
    console.error("[settings.applyModuleVisibility] error:", e);
  }
}

function wireModuleToggles() {
  try {
    const settings = getSettings() || {};
    const modules = settings.modules || { cigs: true, weed: true, alcohol: true };

    const chkCigs = document.getElementById("toggle-cigs");
    const chkWeed = document.getElementById("toggle-weed");
    const chkAlc = document.getElementById("toggle-alcool");

    // Initialiser l'état des checkboxes
    if (chkCigs) chkCigs.checked = !!modules.cigs;
    if (chkWeed) chkWeed.checked = !!modules.weed;
    if (chkAlc) chkAlc.checked = !!modules.alcohol;

    // Attach listeners
    chkCigs?.addEventListener("change", (e) => {
      modules.cigs = !!e.target.checked;
      saveSettings({ ...settings, modules });
      applyModuleVisibility();
      console.log("[settings] Cigs toggle:", modules.cigs);
    });

    chkWeed?.addEventListener("change", (e) => {
      modules.weed = !!e.target.checked;
      saveSettings({ ...settings, modules });
      applyModuleVisibility();
      console.log("[settings] Weed toggle:", modules.weed);
    });

    chkAlc?.addEventListener("change", (e) => {
      modules.alcohol = !!e.target.checked;
      saveSettings({ ...settings, modules });
      applyModuleVisibility();
      console.log("[settings] Alcohol toggle:", modules.alcohol);
    });

    // Appliquer la visibilité initiale
    applyModuleVisibility();
    console.log("[settings.toggles] Wired");
  } catch (e) {
    console.error("[settings.wireModuleToggles] error:", e);
  }
}

// ============================================================
// PAGES (MODALE): Contenu
// ============================================================
function getPageContent(pageKey) {
  const pages = {
    manuel: `
      <div style="font-size: 14px; line-height: 1.6;">
        <p><strong>StopAddict – Manuel rapide</strong></p>
        <ol>
          <li><strong>Accueil :</strong> Utilisez +/− pour enregistrer chaque consommation en temps réel.</li>
          <li><strong>Stats :</strong> Consultez vos totaux (Jour/Semaine/Mois) et les graphiques.</li>
          <li><strong>Calendrier :</strong> Visualisez l'historique jour par jour avec détail.</li>
          <li><strong>Habitudes :</strong> Suivez vos habitudes et définissez des limites.</li>
          <li><strong>Réglages :</strong> Importez/exportez vos données, accédez aux ressources.</li>
        </ol>
      </div>
    `,
    ressources: `
      <div style="font-size: 14px; line-height: 1.6;">
        <p><strong>Ressources & Numéros utiles en France</strong></p>
        <ul>
          <li><strong>Tabac Info Service</strong> – 39 89 (non surtaxé)</li>
          <li><strong>Alcool Info Service</strong> – 0 980 980 930</li>
          <li><strong>Drogues Info Service</strong> – 0 800 23 13 13</li>
          <li><strong>Urgence</strong> – 15 (SAMU) / 112</li>
        </ul>
        <p style="margin-top: 12px; color: #666;">
          Ces services offrent écoute, information et orientation vers des professionnels.
        </p>
      </div>
    `,
    cgv: `
      <div style="font-size: 14px; line-height: 1.6;">
        <p><strong>Conditions d'utilisation</strong></p>
        <p>
          StopAddict est une application d'auto-suivi pour l'aide à la réduction/arrêt des consommations
          (tabac, alcool, cannabis). Elle ne remplace pas un suivi médical professionnel.
        </p>
        <p>
          Vous devez être majeur(e) pour utiliser cette application. Les données sont stockées localement
          sur votre appareil (localStorage).
        </p>
      </div>
    `,
    mentions: `
      <div style="font-size: 14px; line-height: 1.6;">
        <p><strong>Mentions légales</strong></p>
        <p>
          Application locale, sans connexion serveur. Les données ne sont pas envoyées vers des serveurs tiers.
          Tout est conservé sur votre appareil (localStorage).
        </p>
        <p style="margin-top: 12px; color: #666; font-size: 12px;">
          StopAddict v2.4.0-clean
        </p>
      </div>
    `,
  };

  return pages[pageKey] || "";
}

// ============================================================
// MODALE PAGE (open/close)
// ============================================================
function openPageModal(title, content) {
  try {
    const modal = document.getElementById("modal-page");
    const titleEl = document.getElementById("page-title");
    const bodyEl = document.getElementById("page-content");

    if (!modal || !titleEl || !bodyEl) {
      console.warn("[settings.openPageModal] DOM elements missing");
      return;
    }

    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    console.log("[settings] Opened page modal:", title);
  } catch (e) {
    console.error("[settings.openPageModal] error:", e);
  }
}

// ============================================================
// MENU RÉGLAGES (boutons dans la modale)
// ============================================================
function openSettingsMenu() {
  try {
    const hasExport = !!window?.SA?.exporting;

    let html = `
      <div style="font-size: 13px;">
        <div style="font-weight: 900; font-size: 15px; margin-bottom: 12px;">Réglages</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button class="btn" id="set-btn-manuel" type="button">📘 Manuel</button>
          <button class="btn" id="set-btn-ress" type="button">🆘 Ressources</button>
          <button class="btn" id="set-btn-cgv" type="button">📄 CGU/CGV</button>
          <button class="btn" id="set-btn-mentions" type="button">ℹ️ Mentions</button>
    `;

    if (hasExport) {
      html += `
          <button class="btn" id="set-btn-exp-json" type="button">📥 JSON</button>
          <button class="btn" id="set-btn-exp-csv" type="button">📥 CSV</button>
          <button class="btn" id="set-btn-exp-view" type="button">📥 Vue Stats</button>
          <button class="btn" id="set-btn-import" type="button">📤 Importer</button>
      `;
    }

    html += `
        </div>
      </div>
    `;

    openPageModal("Réglages", html);

    // Attach page buttons
    document.getElementById("set-btn-manuel")?.addEventListener("click", () => {
      openPageModal("Manuel", getPageContent("manuel"));
    });

    document.getElementById("set-btn-ress")?.addEventListener("click", () => {
      openPageModal("Ressources utiles", getPageContent("ressources"));
    });

    document.getElementById("set-btn-cgv")?.addEventListener("click", () => {
      openPageModal("CGU / CGV", getPageContent("cgv"));
    });

    document.getElementById("set-btn-mentions")?.addEventListener("click", () => {
      openPageModal("Mentions légales", getPageContent("mentions"));
    });

    // Attach export buttons (si dispo)
    if (window?.SA?.exporting) {
      document.getElementById("set-btn-exp-json")?.addEventListener("click", () => {
        window.SA.exporting.exportJSON?.();
      });

      document.getElementById("set-btn-exp-csv")?.addEventListener("click", () => {
        window.SA.exporting.exportCSV?.();
      });

      document.getElementById("set-btn-exp-view")?.addEventListener("click", () => {
        window.SA.exporting.exportView?.();
      });

      document.getElementById("set-btn-import")?.addEventListener("click", () => {
        window.SA.exporting.triggerImport?.();
      });
    }

    console.log("[settings] Settings menu opened");
  } catch (e) {
    console.error("[settings.openSettingsMenu] error:", e);
  }
}

// ============================================================
// SHORTCUT "Ressources" DEPUIS MODALE 18+
// ============================================================
function wireWarnShortcut() {
  try {
    const link = document.getElementById("open-ressources-from-warn");
    if (!link) return;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      openPageModal("Ressources utiles", getPageContent("ressources"));
    });

    console.log("[settings] Warn shortcut wired");
  } catch (e) {
    console.error("[settings.wireWarnShortcut] error:", e);
  }
}

// ============================================================
// DEBUG CONSOLE TOGGLE (5 taps sur date - alternatif)
// ============================================================
function wireDebugToggle() {
  try {
    const dateEl = document.getElementById("date-actuelle");
    const dbgBox = document.getElementById("debug-console");
    if (!dateEl || !dbgBox) return;

    let taps = 0;
    let timer = null;

    dateEl.addEventListener("click", () => {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => { taps = 0; }, 600);

      if (taps >= 5) {
        taps = 0;
        dbgBox.classList.toggle("show");
        console.log("[settings.debug] Debug console toggled");
      }
    });
  } catch (e) {
    console.error("[settings.wireDebugToggle] error:", e);
  }
}

// ============================================================
// EVENT BUS: Écouter les événements app
// ============================================================
function wireEventBus() {
  try {
    window.addEventListener("sa:openSettingsMenu", () => {
      openSettingsMenu();
    });

    console.log("[settings] Event bus wired");
  } catch (e) {
    console.error("[settings.wireEventBus] error:", e);
  }
}

// ============================================================
// INIT PUBLIQUE
// ============================================================
export function initSettings() {
  console.log("[settings.init] Starting...");

  try {
    startClock();
    wireModuleToggles();
    wireWarnShortcut();
    wireDebugToggle();
    wireEventBus();

    // Écouter les changements de settings depuis state.js
    on("state:settings", () => {
      applyModuleVisibility();
      console.log("[settings] State changed, reapplying visibility");
    });

    // Expose helpers
    window.SA = window.SA || {};
    window.SA.pages = {
      open: openPageModal,
      openSettingsMenu,
      getContent: getPageContent,
    };

    console.log("[settings.init] Done");
  } catch (e) {
    console.error("[settings.init] CRITICAL ERROR:", e);
  }
}
