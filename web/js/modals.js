// ============================================================
// modals.js — Gestion modale 18+ et overlay
// PHASE 1 — Handlers bandeau avertissement, neutraliser overlay
// ============================================================

console.log("[modals.js] Module loaded");

// ------------------------------------------------------------
// Constantes de stockage
// ------------------------------------------------------------
const STORAGE_KEY = "app_warn_v23";

// ------------------------------------------------------------
// Helpers stockage
// ------------------------------------------------------------
function getWarnState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("[modals] getWarnState error:", e);
    return {};
  }
}

function setWarnState(patch) {
  try {
    const prev = getWarnState();
    const next = { ...prev, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (e) {
    console.error("[modals] setWarnState error:", e);
    return patch;
  }
}

// ============================================================
// Utilitaires — Ouverture / Fermeture modales
// ============================================================
function openModal(modalId) {
  try {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.setAttribute("aria-hidden", "false");
      modal.style.display = "flex";
      console.log(`[modals] Modale ouverte: ${modalId}`);
    } else {
      console.warn(`[modals] Modale introuvable: ${modalId}`);
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
      console.log(`[modals] Modale fermée: ${modalId}`);
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
      console.log(`[modals] Toast: ${message}`);
      setTimeout(() => snackbar.classList.remove("show"), duration);
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
    const chkWarn18     = document.getElementById("chk-warn-18");
    const chkWarnHide   = document.getElementById("chk-warn-hide");
    const btnWarnAccept = document.getElementById("btn-warn-accept");
    const btnWarnCancel = document.getElementById("btn-warn-cancel");
    const btnWarnQuit   = document.getElementById("btn-warn-quit");
    const linkResources = document.getElementById("open-ressources-from-warn");

    // --- Hydrater l'état depuis localStorage
    const st = getWarnState();
    if (chkWarnHide && typeof st.hide === "boolean") {
      chkWarnHide.checked = !!st.hide;
    }

    // --- Activer/désactiver le bouton Accept en fonction de "J'ai 18 ans"
    if (chkWarn18 && btnWarnAccept) {
      const syncAccept = () => { btnWarnAccept.disabled = !chkWarn18.checked; };
      chkWarn18.addEventListener("change", syncAccept);
      // Initialiser l'état au chargement (BUGFIX)
      syncAccept();
    }

    // --- Persister "Ne plus réafficher" indépendamment
    if (chkWarnHide) {
      chkWarnHide.addEventListener("change", () => {
        setWarnState({ hide: chkWarnHide.checked });
        console.log(`[modals] Pref hide=${chkWarnHide.checked ? "1" : "0"} enregistrée`);
      });
    }

    // --- Bouton "J'accepte et continuer"
    if (btnWarnAccept) {
      btnWarnAccept.addEventListener("click", () => {
        try {
          const state = setWarnState({
            accepted: true,
            hide: chkWarnHide ? !!chkWarnHide.checked : getWarnState().hide === true,
            timestamp: new Date().toISOString()
          });
          console.log("[modals] Acceptation sauvegardée:", state);
          closeModal("modal-warn");
          neutralizeOverlay18();
          showToast("Avertissement accepté ✓");
        } catch (e) {
          console.error("[modals] btnWarnAccept error:", e);
        }
      });
    }

    // --- Bouton "Annuler"
    if (btnWarnCancel) {
      btnWarnCancel.addEventListener("click", () => {
        closeModal("modal-warn");
        console.log("[modals] Modale annulée");
      });
    }

    // --- Bouton "Quitter"
    if (btnWarnQuit) {
      btnWarnQuit.addEventListener("click", () => {
        console.log("[modals] Quitter (no-op PHASE 1)");
        showToast("Quitter : à implémenter plus tard");
      });
    }

    // --- Lien "Ressources et numéros utiles" (toast Phase 1)
    if (linkResources) {
      linkResources.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("[modals] Ressources cliqué (PHASE 1 → toast)");
        showToast("📖 Cette section sera disponible prochainement (PHASE 3)");
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
    const st = getWarnState();
    const warnAccepted = !!st.accepted;
    const warnHide     = !!st.hide;

    console.log(`[modals] accepted=${warnAccepted} hide=${warnHide}`);

    if (!warnAccepted && !warnHide) {
      openModal("modal-warn");
      console.log("[modals] Modale 18+ affichée au boot");
    } else if (warnAccepted) {
      neutralizeOverlay18();
      console.log("[modals] Acceptation valide, overlay neutralisé");
    }
  } catch (e) {
    console.error("[modals] checkAndShowWarn error:", e);
    openModal("modal-warn"); // fallback
  }
}

// ============================================================
// Export
// ============================================================
export function initModals() {
  console.log("[modals.initModals] Initialisation…");
  try {
    setupWarnModal();
    checkAndShowWarn();
    console.log("[modals.initModals] ✓ Prêt");
  } catch (e) {
    console.error("[modals.initModals] error:", e);
  }
}
