// ============================================================
// modals.js — Gestion modale 18+ et overlay
// PHASE 1 — Handlers bandeau avertissement, neutraliser overlay
// ============================================================

console.log("[modals.js] Module loaded");

// ============================================================
// Utilitaires — Ouverture / Fermeture modales
// ============================================================

function openModal(modalId) {
  try {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.setAttribute("aria-hidden", "false");
      modal.style.display = "flex";
      console.log(`[modals] Modale ouvert: ${modalId}`);
    } else {
      console.warn(`[modals] Modale intro trouvé: ${modalId}`);
    }
  } catch (e) {
    console.error("[modals] openModal error:", e);
  }
}

function closeModal(modalId) {
  try {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.setAttribute("aria-hidden", "true");
      modal.style.display = "none";
      console.log(`[modals] Modale fermé: ${modalId}`);
    }
  } catch (e) {
    console.error("[modals] closeModal error:", e);
  }
}

function neutralizeOverlay18() {
  try {
    const modal = document.getElementById("modal-warn");
    if (modal) {
      modal.style.pointerEvents = "none";
      modal.style.backgroundColor = "transparent";
      console.log("[modals] Overlay 18+ neutralisé");
    }
  } catch (e) {
    console.error("[modals] neutralizeOverlay18 error:", e);
  }
}

// ============================================================
// Toast (feedback utilisateur)
// ============================================================

function showToast(message, duration = 3000) {
  try {
    const snackbar = document.getElementById("snackbar");
    if (snackbar) {
      snackbar.textContent = message;
      snackbar.classList.add("show");
      console.log(`[modals] Toast affiché: ${message}`);
      
      setTimeout(() => {
        snackbar.classList.remove("show");
      }, duration);
    }
  } catch (e) {
    console.error("[modals] showToast error:", e);
  }
}

// ============================================================
// Handlers modale 18+
// ============================================================

function setupWarnModal() {
  try {
    const chkWarn18 = document.getElementById("chk-warn-18");
    const chkWarnHide = document.getElementById("chk-warn-hide");
    const btnWarnAccept = document.getElementById("btn-warn-accept");
    const btnWarnCancel = document.getElementById("btn-warn-cancel");
    const btnWarnQuit = document.getElementById("btn-warn-quit");
    const linkRessources = document.getElementById("open-ressources-from-warn");

    // Checkbox "J'ai 18 ans" → active bouton Accept
    if (chkWarn18) {
      chkWarn18.addEventListener("change", () => {
        const checked = chkWarn18.checked && (chkWarnHide ? chkWarnHide.checked : false);
        if (btnWarnAccept) {
          btnWarnAccept.disabled = !checked;
          console.log(`[modals] Bouton Accept: ${checked ? "activé" : "désactivé"}`);
        }
      });
    }

    // Bouton "J'accepte et continuer"
    if (btnWarnAccept) {
      btnWarnAccept.addEventListener("click", () => {
        try {
          localStorage.setItem("app_warn_v23", JSON.stringify({
            accepted: true,
            hide: chkWarnHide ? chkWarnHide.checked : false,
            timestamp: new Date().toISOString()
          }));
          console.log("[modals] Acceptation sauvegardée");
          
          closeModal("modal-warn");
          neutralizeOverlay18();
          showToast("Avertissement accepté ✓");
        } catch (e) {
          console.error("[modals] btnWarnAccept error:", e);
        }
      });
    }

    // Bouton "Annuler"
    if (btnWarnCancel) {
      btnWarnCancel.addEventListener("click", () => {
        closeModal("modal-warn");
        console.log("[modals] Modale annulée");
      });
    }

    // Bouton "Quitter"
    if (btnWarnQuit) {
      btnWarnQuit.addEventListener("click", () => {
        console.log("[modals] Quitter demandé (no-op pour PHASE 1)");
        showToast("Quitter: à implémenter en PHASE 2");
      });
    }

    // Lien "Ressources utiles" — NO-OP pour PHASE 1
    if (linkRessources) {
      linkRessources.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[modals] Ressources cliqué (no-op PHASE 1)");
        showToast("📖 Cette section sera disponible bientôt (PHASE 3)");
      });
    }

    console.log("[modals] Modale 18+ câblée");
  } catch (e) {
    console.error("[modals] setupWarnModal error:", e);
  }
}

// ============================================================
// Check & affichage modale 18+ au boot
// ============================================================

function checkAndShowWarn() {
  try {
    const raw = localStorage.getItem("app_warn_v23");
    const parsed = raw ? JSON.parse(raw) : null;
    
    const warnAccepted = parsed && parsed.accepted;
    const warnHide = parsed && parsed.hide;

    console.log(`[modals] Avertissement accepté: ${warnAccepted}, masquer: ${warnHide}`);

    if (!warnAccepted && !warnHide) {
      openModal("modal-warn");
      console.log("[modals] Modale 18+ affichée au boot");
    } else if (warnAccepted) {
      neutralizeOverlay18();
      console.log("[modals] Acceptation valide, overlay neutralisé");
    }
  } catch (e) {
    console.error("[modals] checkAndShowWarn error:", e);
    openModal("modal-warn"); // Fallback: afficher si erreur
  }
}

// ============================================================
// Export
// ============================================================

export function initModals() {
  console.log("[modals.initModals] Initialisation...");
  try {
    setupWarnModal();
    checkAndShowWarn();
    console.log("[modals.initModals] ✓ Prêt");
  } catch (e) {
    console.error("[modals.initModals] error:", e);
  }
}
