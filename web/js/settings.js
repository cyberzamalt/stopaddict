// web/js/settings.js
// COMPLET v2.4.2 - Réglages, Modales Pages, Toggles Modules
// NOTE: La NAVIGATION (routing, showScreen) est entièrement gérée par app.js
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
    } else {
      console.warn("[settings.wireHomeToggles] toggle-cigs not found");
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
    } else {
      console.warn("[settings.wireHomeToggles] toggle-weed not found");
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
    } else {
      console.warn("[settings.wireHomeToggles] toggle-alcool not found");
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
      <p>Besoin d'aide ? Voici quelques ressources utiles en France :</p>
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
      <p><strong>Conditions d'utilisation</strong> : cette application fournit un auto-suivi à visée d'aide
      à la réduction/arrêt. Elle ne remplace pas un suivi médical. Vous devez être majeur(e).</p>
      <p>En utilisant l'application, vous acceptez que les données soient stockées localement sur votre appareil.</p>
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
// MODALE 18+ - CÂBLAGE COMPLET (NOUVEAU)
// ============================================================
function setupWarnModal() {
  try {
    console.log("[settings.setupWarnModal] Starting...");
    
    const modal = document.getElementById("modal-warn");
    const chk18 = document.getElementById("chk-warn-18");
    const chkHide = document.getElementById("chk-warn-hide");
    const btnAccept = document.getElementById("btn-warn-accept");
    const btnCancel = document.getElementById("btn-warn-cancel");
    const btnQuit = document.getElementById("btn-warn-quit");

    // Vérifications d'existence
    if (!modal) {
      console.error("[settings.setupWarnModal] modal-warn NOT FOUND");
      return;
    }
    if (!chk18) {
      console.error("[settings.setupWarnModal] chk-warn-18 NOT FOUND");
      return;
    }
    if (!btnAccept) {
      console.error("[settings.setupWarnModal] btn-warn-accept NOT FOUND");
      return;
    }

    console.log("[settings.setupWarnModal] All elements found, wiring events...");

    // État initial du bouton (désactivé si checkbox non cochée)
    btnAccept.disabled = !chk18.checked;
    console.log("[settings.setupWarnModal] Initial button state:", btnAccept.disabled ? "DISABLED" : "ENABLED");

    // EVENT 1: Checkbox "J'ai 18 ans" - Active/désactive le bouton
    chk18.addEventListener("change", () => {
      try {
        const isChecked = chk18.checked;
        btnAccept.disabled = !isChecked;
        console.log("[settings.setupWarnModal] Checkbox changed:", isChecked ? "CHECKED" : "UNCHECKED", "→ Button:", btnAccept.disabled ? "DISABLED" : "ENABLED");
      } catch (e) {
        console.error("[settings.setupWarnModal] checkbox change error:", e);
      }
    });

    // EVENT 2: Bouton "J'accepte et continuer" - Sauvegarde + fermeture
    btnAccept.addEventListener("click", () => {
      try {
        console.log("[settings.setupWarnModal] Accept button clicked");
        
        // Préparer les données à sauvegarder
        const hideForever = chkHide ? chkHide.checked : false;
        const payload = {
          accepted: true,
          hide: hideForever,
          ts: Date.now()
        };
        
        console.log("[settings.setupWarnModal] Saving to localStorage:", payload);
        
        // Sauvegarder dans localStorage
        try {
          localStorage.setItem("app_warn_v23", JSON.stringify(payload));
          console.log("[settings.setupWarnModal] ✅ Saved to localStorage successfully");
        } catch (storageError) {
          console.error("[settings.setupWarnModal] ❌ localStorage save FAILED:", storageError);
        }
        
        // Fermer la modale
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
        console.log("[settings.setupWarnModal] ✅ Modal closed");
        
      } catch (e) {
        console.error("[settings.setupWarnModal] accept button error:", e);
      }
    });

    // EVENT 3: Bouton "Annuler" - Décoche tout et désactive le bouton
    if (btnCancel) {
      btnCancel.addEventListener("click", () => {
        try {
          console.log("[settings.setupWarnModal] Cancel button clicked");
          
          if (chk18) chk18.checked = false;
          if (chkHide) chkHide.checked = false;
          btnAccept.disabled = true;
          
          console.log("[settings.setupWarnModal] ✅ Checkboxes unchecked, button disabled");
        } catch (e) {
          console.error("[settings.setupWarnModal] cancel button error:", e);
        }
      });
    } else {
      console.warn("[settings.setupWarnModal] btn-warn-cancel not found");
    }

    // EVENT 4: Bouton "Quitter" - Message d'information
    if (btnQuit) {
      btnQuit.addEventListener("click", () => {
        try {
          console.log("[settings.setupWarnModal] Quit button clicked");
          alert("Vous pouvez fermer l'application maintenant.");
        } catch (e) {
          console.error("[settings.setupWarnModal] quit button error:", e);
        }
      });
    } else {
      console.warn("[settings.setupWarnModal] btn-warn-quit not found");
    }

    console.log("[settings.setupWarnModal] ✅ All event listeners attached successfully");
    
  } catch (e) {
    console.error("[settings.setupWarnModal] CRITICAL ERROR:", e);
  }
}

// ============================================================
// EVENT BUS: Écouter l'événement openSettingsMenu depuis app.js
// ============================================================
function wireEventBus() {
  try {
    window.addEventListener("sa:openSettingsMenu", () => {
      openSettingsMenu();
      console.log("[settings.wireEventBus] openSettingsMenu called");
    });

    console.log("[settings.wireEventBus] Event listener attached for sa:openSettingsMenu");
  } catch (e) {
    console.error("[settings.wireEventBus] error:", e);
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
    setupWarnModal();  // ← NOUVEAU : Câblage de la modale 18+
    wireEventBus();

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
