// web/js/settings.js
// FICHIER PROPRE - Copier-coller direct dans GitHub
// Rôle UNIQUE: Toggles modules + Pages (modale) + Clock + Debug
// LA NAVIGATION EST GÉRÉE UNIQUEMENT PAR app.js (PAS DE DOUBLE WIRING)

const LS_SETTINGS = "app_settings_v23";

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
    console.log("[settings.clock] Horloge démarrée");
  } catch (e) {
    console.error("[settings.clock] Erreur:", e);
  }
}

// ============================================================
// TOGGLES MODULES (Accueil: Je fume / Je bois / Je consomme)
// ============================================================
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
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  } catch {}
  window.dispatchEvent(new Event("sa:settings:changed"));
  console.log("[settings] Paramètres sauvegardés:", s);
}

function applyModuleVisibility() {
  try {
    const st = loadSettings();
    const enabled = st.enabled || { cigs: true, weed: true, alcohol: true };

    // Cibles: les 3 cartes de l'accueil
    const cardCigs = document.querySelector("#ecran-principal .card.bar-left");
    const cardWeed = document.querySelector("#ecran-principal .card.bar-left.green");
    const cardAlcohol = document.querySelector("#ecran-principal .card.bar-left.orange");

    if (cardCigs) cardCigs.style.display = enabled.cigs ? "" : "none";
    if (cardWeed) cardWeed.style.display = enabled.weed ? "" : "none";
    if (cardAlcohol) cardAlcohol.style.display = enabled.alcohol ? "" : "none";

    // Ligne alcool du bandeau (aussi conditionnel)
    const lineAlcohol = document.getElementById("bandeau-alcool-line");
    if (lineAlcohol) lineAlcohol.style.display = enabled.alcohol ? "" : "none";

    console.log("[settings.modules] Visibilité appliquée:", enabled);
  } catch (e) {
    console.error("[settings.applyModuleVisibility] Erreur:", e);
  }
}

function wireModuleToggles() {
  try {
    const st = loadSettings();
    const enabled = st.enabled || { cigs: true, weed: true, alcohol: true };

    const chkCigs = document.getElementById("toggle-cigs");
    const chkWeed = document.getElementById("toggle-weed");
    const chkAlcohol = document.getElementById("toggle-alcool");

    // Initialiser l'état des cases
    if (chkCigs) chkCigs.checked = !!enabled.cigs;
    if (chkWeed) chkWeed.checked = !!enabled.weed;
    if (chkAlcohol) chkAlcohol.checked = !!enabled.alcohol;

    // Listeners
    chkCigs?.addEventListener("change", (e) => {
      enabled.cigs = !!e.target.checked;
      saveSettings({ ...st, enabled });
      applyModuleVisibility();
      console.log("[settings] Toggle Cigarettes:", enabled.cigs);
    });

    chkWeed?.addEventListener("change", (e) => {
      enabled.weed = !!e.target.checked;
      saveSettings({ ...st, enabled });
      applyModuleVisibility();
      console.log("[settings] Toggle Joints:", enabled.weed);
    });

    chkAlcohol?.addEventListener("change", (e) => {
      enabled.alcohol = !!e.target.checked;
      saveSettings({ ...st, enabled });
      applyModuleVisibility();
      console.log("[settings] Toggle Alcool:", enabled.alcohol);
    });

    // Appliquer la visibilité initiale
    applyModuleVisibility();
    console.log("[settings.toggles] Wired");
  } catch (e) {
    console.error("[settings.wireModuleToggles] Erreur:", e);
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
      console.warn("[settings.openPageModal] Éléments DOM manquants");
      return;
    }

    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    console.log("[settings] Modale page ouverte:", title);
  } catch (e) {
    console.error("[settings.openPageModal] Erreur:", e);
  }
}

function closePageModal() {
  try {
    const modal = document.getElementById("modal-page");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  } catch (e) {
    console.error("[settings.closePageModal] Erreur:", e);
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

    console.log("[settings] Menu Réglages ouvert");
  } catch (e) {
    console.error("[settings.openSettingsMenu] Erreur:", e);
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

    console.log("[settings] Raccourci 18+ wired");
  } catch (e) {
    console.error("[settings.wireWarnShortcut] Erreur:", e);
  }
}

// ============================================================
// DEBUG CONSOLE TOGGLE (5 taps sur date)
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
      timer = setTimeout(() => {
        taps = 0;
      }, 600);

      if (taps >= 5) {
        taps = 0;
        dbgBox.classList.toggle("show");
        console.log("[settings.debug] Console debug basculée");
      }
    });

    console.log("[settings.debug] Debug toggle wired");
  } catch (e) {
    console.error("[settings.wireDebugToggle] Erreur:", e);
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
    console.error("[settings.wireEventBus] Erreur:", e);
  }
}

// ============================================================
// INIT PUBLIQUE
// ============================================================
export function initSettings() {
  console.log("[settings.init] Démarrage...");

  try {
    startClock();
    wireModuleToggles();
    wireWarnShortcut();
    wireDebugToggle();
    wireEventBus();

    // Expose helpers
    window.SA = window.SA || {};
    window.SA.pages = {
      open: openPageModal,
      close: closePageModal,
      openSettingsMenu,
      getContent: getPageContent,
    };

    console.log("[settings.init] OK");
  } catch (e) {
    console.error("[settings.init] ERREUR CRITIQUE:", e);
  }
}
