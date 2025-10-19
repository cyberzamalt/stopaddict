// web/js/settings.js
// CORRIGÉ v2.4.1 - Suppression des doublons (wireNav, showScreen, wireDebugConsole)
// Rôle: Réglages & gestion des modales pages
//   - Met à jour l'heure/la date en header
//   - Ouvre la modale "Pages" (Manuel, CGU/CGV, Mentions, Ressources & numéros utiles)
//   - Gère les toggles modules (cigs/weed/alcool) présents sur l'accueil
//   - Pont "Importer/Exporter" via le menu Réglages (utilise window.SA.exporting)
//   - Relaye l'ouverture "Ressources" depuis la modale 18+ (#open-ressources-from-warn)
// 
// NOTE: La NAVIGATION (routing, switchscreen) est entièrement gérée par app.js
// NOTE: Le DEBUG TOGGLE (5 taps) est entièrement géré par app.js

const LS_SETTINGS = "app_settings_v23";

// ============================================================
// HORLOGE (date/heure header)
// ============================================================
function startClock() {
  try {
    const elDate = document.getElementById("date-actuelle");
    const elHeure = document.getElementById("heure-actuelle");
    
    function tick() {
      if (elDate) {
        try {
          elDate.textContent = new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
          });
        } catch (e) {
          console.warn("[settings.clock] date format error:", e);
        }
      }
      if (elHeure) {
        try {
          elHeure.textContent = new Date().toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
          });
        } catch (e) {
          console.warn("[settings.clock] time format error:", e);
        }
      }
    }
    
    tick();
    setInterval(tick, 1000);
    console.log("[settings.clock] Started");
  } catch (e) {
    console.error("[settings.clock] init error:", e);
  }
}

// ============================================================
// TOGGLES MODULES (cigs/weed/alcool) SUR L'ACCUEIL
// ============================================================
function loadSettings() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_SETTINGS) || "null");
    if (v && typeof v === "object") return v;
  } catch (e) {
    console.warn("[settings.loadSettings] parse error:", e);
  }
  return {
    enabled: { cigs: true, weed: true, alcohol: true }
  };
}

function saveSettings(s) {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
    window.dispatchEvent(new Event("sa:settings:changed"));
    console.log("[settings.saveSettings] Saved");
    return true;
  } catch (e) {
    console.error("[settings.saveSettings] error:", e);
    return false;
  }
}

function applyModuleToggles() {
  try {
    const st = loadSettings();
    
    // Cherche les cartes de l'accueil (3 cartes pour cigs/weed/alcohol)
    const cards = document.querySelectorAll("#ecran-principal .card");
    if (cards.length === 0) {
      console.warn("[settings.applyModuleToggles] no cards found");
      return;
    }
    
    let cardIdx = 0;
    if (cardIdx < cards.length) {
      cards[cardIdx].style.display = st.enabled.cigs ? "" : "none";
      cardIdx++;
    }
    if (cardIdx < cards.length) {
      cards[cardIdx].style.display = st.enabled.weed ? "" : "none";
      cardIdx++;
    }
    if (cardIdx < cards.length) {
      cards[cardIdx].style.display = st.enabled.alcohol ? "" : "none";
      cardIdx++;
    }
    
    console.log("[settings.applyModuleToggles] Applied:", st.enabled);
  } catch (e) {
    console.error("[settings.applyModuleToggles] error:", e);
  }
}

function wireHomeToggles() {
  try {
    const st = loadSettings();

    const cC = document.getElementById("toggle-cigs");
    const cW = document.getElementById("toggle-weed");
    const cA = document.getElementById("toggle-alcool");

    if (cC) {
      cC.checked = !!st.enabled.cigs;
      cC.addEventListener("change", () => {
        try {
          st.enabled.cigs = !!cC.checked;
          saveSettings(st);
          applyModuleToggles();
          console.log("[settings.wireHomeToggles] cigs toggled:", st.enabled.cigs);
        } catch (e) {
          console.error("[settings.wireHomeToggles] cigs error:", e);
        }
      });
    }

    if (cW) {
      cW.checked = !!st.enabled.weed;
      cW.addEventListener("change", () => {
        try {
          st.enabled.weed = !!cW.checked;
          saveSettings(st);
          applyModuleToggles();
          console.log("[settings.wireHomeToggles] weed toggled:", st.enabled.weed);
        } catch (e) {
          console.error("[settings.wireHomeToggles] weed error:", e);
        }
      });
    }

    if (cA) {
      cA.checked = !!st.enabled.alcohol;
      cA.addEventListener("change", () => {
        try {
          st.enabled.alcohol = !!cA.checked;
          saveSettings(st);
          applyModuleToggles();
          console.log("[settings.wireHomeToggles] alcohol toggled:", st.enabled.alcohol);
        } catch (e) {
          console.error("[settings.wireHomeToggles] alcohol error:", e);
        }
      });
    }

    applyModuleToggles();
    console.log("[settings.wireHomeToggles] Wired");
  } catch (e) {
    console.error("[settings.wireHomeToggles] error:", e);
  }
}

// ============================================================
// MODALE PAGES (Manuel, CGU, Mentions, Ressources)
// ============================================================
function openPageModal(title, html) {
  try {
    const modal = document.getElementById("modal-page");
    const ttl = document.getElementById("page-title");
    const body = document.getElementById("page-content");
    
    if (!modal || !ttl || !body) {
      console.warn("[settings.openPageModal] modal elements not found");
      return;
    }
    
    ttl.textContent = title;
    body.innerHTML = html;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    
    console.log("[settings.openPageModal] Opened:", title);
  } catch (e) {
    console.error("[settings.openPageModal] error:", e);
  }
}

function closePageModal() {
  try {
    const modal = document.getElementById("modal-page");
    if (!modal) {
      console.warn("[settings.closePageModal] modal not found");
      return;
    }
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    console.log("[settings.closePageModal] Closed");
  } catch (e) {
    console.error("[settings.closePageModal] error:", e);
  }
}

// ============================================================
// CONTENUS PAGES
// ============================================================
function contentRessources() {
  return `
    <div>
      <p>Besoin d'aide&nbsp;? Voici quelques ressources utiles en France&nbsp;:</p>
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
      <p><strong>Conditions d'utilisation</strong>&nbsp;: cette application fournit un auto-suivi à visée d'aide
      à la réduction/arrêt. Elle ne remplace pas un suivi médical. Vous devez être majeur(e).</p>
      <p>En utilisant l'application, vous acceptez que les données soient stockées localement sur votre appareil.</p>
    </div>
  `;
}

function contentMentions() {
  return `
    <div>
      <p><strong>Mentions légales</strong>&nbsp;: Application locale, sans envoi de données vers des serveurs tiers.
      Les données restent sur votre appareil (localStorage).</p>
    </div>
  `;
}

// ============================================================
// MENU RÉGLAGES (modale pages)
// ============================================================
function openSettingsMenu() {
  try {
    const hasExport = !!window?.SA?.exporting;
    const html = `
      <div>
        <div class="section-title">Réglages</div>
        <div class="grid-2">
          <button class="btn" id="set-open-manuel" type="button">📘 Manuel</button>
          <button class="btn" id="set-open-ress" type="button">🆘 Ressources utiles</button>
          <button class="btn" id="set-open-cgv" type="button">📄 CGU/CGV</button>
          <button class="btn" id="set-open-mentions" type="button">ℹ️ Mentions</button>
          ${hasExport ? `
            <button class="btn" id="set-export-json" type="button">💾 Export JSON</button>
            <button class="btn" id="set-export-csv" type="button">💾 Export CSV</button>
            <button class="btn" id="set-export-view" type="button">💾 Export vue Stats</button>
            <button class="btn" id="set-import" type="button">📥 Importer (JSON/CSV)</button>
          ` : ``}
        </div>
      </div>
    `;
    openPageModal("Réglages", html);

    // Sous-pages
    document.getElementById("set-open-manuel")?.addEventListener("click", () => {
      openPageModal("Manuel", contentManuel());
    });
    document.getElementById("set-open-ress")?.addEventListener("click", () => {
      openPageModal("Ressources utiles", contentRessources());
    });
    document.getElementById("set-open-cgv")?.addEventListener("click", () => {
      openPageModal("CGU / CGV", contentCgvCgu());
    });
    document.getElementById("set-open-mentions")?.addEventListener("click", () => {
      openPageModal("Mentions légales", contentMentions());
    });

    // Import/Export
    if (window?.SA?.exporting) {
      document.getElementById("set-export-json")?.addEventListener("click", () => {
        try {
          window.SA.exporting.exportJSON();
          console.log("[settings.openSettingsMenu] Export JSON triggered");
        } catch (e) {
          console.error("[settings.openSettingsMenu] exportJSON error:", e);
        }
      });
      document.getElementById("set-export-csv")?.addEventListener("click", () => {
        try {
          window.SA.exporting.exportCSV();
          console.log("[settings.openSettingsMenu] Export CSV triggered");
        } catch (e) {
          console.error("[settings.openSettingsMenu] exportCSV error:", e);
        }
      });
      document.getElementById("set-export-view")?.addEventListener("click", () => {
        try {
          window.SA.exporting.exportView();
          console.log("[settings.openSettingsMenu] Export View triggered");
        } catch (e) {
          console.error("[settings.openSettingsMenu] exportView error:", e);
        }
      });
      document.getElementById("set-import")?.addEventListener("click", () => {
        try {
          window.SA.exporting.triggerImport();
          console.log("[settings.openSettingsMenu] Import triggered");
        } catch (e) {
          console.error("[settings.openSettingsMenu] triggerImport error:", e);
        }
      });
    }

    console.log("[settings.openSettingsMenu] Menu opened");
  } catch (e) {
    console.error("[settings.openSettingsMenu] error:", e);
  }
}

// ============================================================
// RESSOURCES DEPUIS LA MODALE 18+ 
// ============================================================
function wireWarnShortcut() {
  try {
    const link = document.getElementById("open-ressources-from-warn");
    if (!link) {
      console.warn("[settings.wireWarnShortcut] link not found, skip");
      return;
    }

    link.addEventListener("click", (e) => {
      e.preventDefault();
      openPageModal("Ressources utiles", contentRessources());
      console.log("[settings.wireWarnShortcut] Resources opened from warn modal");
    });

    console.log("[settings.wireWarnShortcut] Wired");
  } catch (e) {
    console.error("[settings.wireWarnShortcut] error:", e);
  }
}

// ============================================================
// INITIALISATION PUBLIQUE
// ============================================================
export function initSettings() {
  console.log("[settings.init] Starting...");
  
  try {
    startClock();
    wireHomeToggles();
    wireWarnShortcut();

    // Expose helpers
    window.SA = window.SA || {};
    window.SA.pages = {
      open: openPageModal,
      close: closePageModal,
      openSettings: openSettingsMenu
    };

    // Écouter les changements de settings depuis state.js (si besoin de reappliquer toggles)
    try {
      window.addEventListener("sa:settings:changed", () => {
        applyModuleToggles();
        console.log("[settings.init] Settings changed, reapplying visibility");
      });
    } catch (e) {
      console.warn("[settings.init] event listener error:", e);
    }

    console.log("[settings.init] Done ✅");
  } catch (e) {
    console.error("[settings.init] CRITICAL ERROR:", e);
  }
}
