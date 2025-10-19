// web/js/counters.js
// COMPLET v2.4.0 - Gestion des compteurs accueil (+/-), toggles modules, horloge
// Dépendances: state.js (addEntry, removeOneToday, getSettings, saveSettings, etc.)

import {
  on, emit,
  getSettings, saveSettings,
  addEntry, removeOneToday,
  ymd, totalsHeader,
  getTodayTotals
} from "./state.js";

// --- Helpers DOM ---
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// Essaye d'inférer le type (cigs/weed/alcohol) à partir de l'id du bouton
function inferTypeFromId(id="") {
  const s = String(id).toLowerCase();
  if (s.startsWith("cl-") || s.includes("clope")) return "cigs";
  if (s.startsWith("j-")  || s.includes("joint")) return "weed";
  if (s.startsWith("a-")  || s.includes("alcool")) return "alcohol";
  return null;
}

function fmt(n) { return (n ?? 0).toString(); }

// --- Mise à jour header (stat rapides + bandeau résumé Accueil) ---
function refreshHeaderCounters() {
  try {
    const tdy = getTodayTotals(); // { cigs, weed, alcohol, cost }
    
    // Stats rapides (header)
    const statCigEl = $("#stat-clopes-jr");
    if (statCigEl) {
      statCigEl.textContent = fmt(tdy.cigs);
    }

    const statJointEl = $("#stat-joints-jr");
    if (statJointEl) {
      statJointEl.textContent = fmt(tdy.weed);
    }

    const statAlcEl = $("#stat-alcool-jr");
    if (statAlcEl) {
      statAlcEl.textContent = fmt(tdy.alcohol);
    }

    const statCostEl = $("#stat-cout-jr");
    if (statCostEl) {
      statCostEl.textContent = (tdy.cost ?? 0).toFixed(2) + "€";
    }

    // Cartes Accueil
    const valCigEl = $("#val-clopes");
    if (valCigEl) {
      valCigEl.textContent = fmt(tdy.cigs);
    }

    const valJointEl = $("#val-joints");
    if (valJointEl) {
      valJointEl.textContent = fmt(tdy.weed);
    }

    const valAlcEl = $("#val-alcool");
    if (valAlcEl) {
      valAlcEl.textContent = fmt(tdy.alcohol);
    }

    // Bandeau résumé
    const hdr = totalsHeader(new Date());
    const bandeauTitleEl = $("#bandeau-titre");
    if (bandeauTitleEl) {
      bandeauTitleEl.textContent = hdr.title || "Aujourd'hui";
    }

    const bandeauCigEl = $("#bandeau-clopes");
    if (bandeauCigEl) {
      bandeauCigEl.textContent = fmt(tdy.cigs);
    }

    const bandeauJointEl = $("#bandeau-joints");
    if (bandeauJointEl) {
      bandeauJointEl.textContent = fmt(tdy.weed);
    }

    const alcoolLine = $("#bandeau-alcool-line");
    if (alcoolLine) {
      if ((tdy.alcohol ?? 0) > 0) {
        alcoolLine.style.display = "";
        const bandeauAlcEl = $("#bandeau-alcool");
        if (bandeauAlcEl) {
          bandeauAlcEl.textContent = fmt(tdy.alcohol);
        }
      } else {
        alcoolLine.style.display = "none";
      }
    }

    console.log("[counters.refreshHeaderCounters] Updated - cigs:", tdy.cigs, "weed:", tdy.weed, "alcohol:", tdy.alcohol);
  } catch(e) {
    console.error("[counters] refreshHeaderCounters error:", e);
  }
}

// --- Horloge en-tête (maj chaque minute) + 5 taps debug ---
function wireClock() {
  try {
    refreshHeaderCounters();
    setInterval(refreshHeaderCounters, 60_000);
    console.log("[counters.wireClock] Clock wired (updates every 60s)");
  } catch (e) {
    console.error("[counters.wireClock] error:", e);
  }
}

// --- Boutons + / − (Accueil) ---
function wirePlusMinus() {
  try {
    // Sélecteur simplifié : tous les boutons ronds dans l'écran principal
    const buttons = $$("#ecran-principal .btn-round");
    
    if (buttons.length === 0) {
      console.warn("[counters.wirePlusMinus] No .btn-round buttons found in #ecran-principal");
      return;
    }

    console.log("[counters.wirePlusMinus] Found", buttons.length, "buttons");

    buttons.forEach((btn) => {
      // Vérifier que le bouton a un ID reconnaissable
      if (!btn.id) {
        console.warn("[counters.wirePlusMinus] Button has no id, skipping");
        return;
      }

      const btnId = btn.id.toLowerCase();
      
      // Vérifier que c'est bien un bouton +/- (cl-, j-, a-)
      if (!/(cl|j|a)-(plus|moins)/.test(btnId)) {
        console.warn("[counters.wirePlusMinus] Button id not recognized:", btn.id);
        return;
      }

      btn.addEventListener("click", () => {
        try {
          const isPlus  = btn.classList.contains("btn-plus");
          const isMinus = btn.classList.contains("btn-minus");
          const explicitType = btn.dataset?.type;
          const type = explicitType || inferTypeFromId(btn.id);

          if (!type) {
            console.warn("[counters.wirePlusMinus] Could not infer type from button:", btn.id);
            return;
          }

          console.log("[counters.wirePlusMinus] Click on", btn.id, '- type:', type, '- operation:', isPlus ? '+' : '-');

          if (isPlus) {
            const addResult = addEntry(type, 1);
            if (addResult) {
              console.log("[counters.wirePlusMinus] Added 1 to', type);
              emit("ui:clicked", { id: btn.id, type, op: "+" });
              refreshHeaderCounters();
            } else {
              console.error("[counters.wirePlusMinus] addEntry failed for type:', type);
            }
          }

          if (isMinus) {
            const removeResult = removeOneToday(type);
            if (removeResult) {
              console.log("[counters.wirePlusMinus] Removed 1 from', type);
              emit("ui:clicked", { id: btn.id, type, op: "-" });
              refreshHeaderCounters();
            } else {
              console.error("[counters.wirePlusMinus] removeOneToday failed or no entries for type:', type);
            }
          }
        } catch (e) {
          console.error("[counters.wirePlusMinus] Click handler error:", e);
        }
      });
    });

    console.log("[counters.wirePlusMinus] Wired", buttons.length, "buttons");
  } catch (e) {
    console.error("[counters.wirePlusMinus] setup error:", e);
  }
}

// --- Toggles "je fume / je bois" (Accueil) ---
function applyModuleTogglesToHome(s) {
  try {
    // On masque/affiche les cartes selon les toggles
    const cardC = $("#ecran-principal .card.bar-left");         // 1ère carte = cigs
    const cardJ = $("#ecran-principal .card.bar-left.green");   // 2ème = weed
    const cardA = $("#ecran-principal .card.bar-left.orange");  // 3ème = alcohol

    if (cardC) {
      cardC.style.display = (s?.modules?.cigs === false) ? "none" : "";
    }
    if (cardJ) {
      cardJ.style.display = (s?.modules?.weed === false) ? "none" : "";
    }
    if (cardA) {
      cardA.style.display = (s?.modules?.alcohol === false) ? "none" : "";
    }

    // Les checkbox de l'accueil reflètent l'état
    const tC = $("#toggle-cigs");
    const tW = $("#toggle-weed");
    const tA = $("#toggle-alcool");

    if (tC) {
      tC.checked = (s?.modules?.cigs !== false);
    }
    if (tW) {
      tW.checked = (s?.modules?.weed !== false);
    }
    if (tA) {
      tA.checked = (s?.modules?.alcohol !== false);
    }

    console.log("[counters.applyModuleTogglesToHome] Applied visibility");
  } catch (e) {
    console.error("[counters.applyModuleTogglesToHome] error:", e);
  }
}

function wireHomeToggles() {
  try {
    const tC = $("#toggle-cigs");
    const tW = $("#toggle-weed");
    const tA = $("#toggle-alcool");

    function updateSetting(key, checked) {
      try {
        const s = getSettings() || {};
        s.modules = s.modules || { cigs: true, weed: true, alcohol: true };
        s.modules[key] = !!checked;
        
        const saveResult = saveSettings(s);
        if (saveResult) {
          applyModuleTogglesToHome(s);
          emit("state:settings", { modules: s.modules });
          refreshHeaderCounters();
          console.log("[counters.wireHomeToggles] Setting updated:', key, '=', checked);
        } else {
          console.error("[counters.wireHomeToggles] saveSettings failed for key:', key);
        }
      } catch (e) {
        console.error("[counters.wireHomeToggles] updateSetting error for key:', key, e);
      }
    }

    if (tC) {
      tC.addEventListener("change", () => {
        updateSetting("cigs", tC.checked);
      });
    } else {
      console.warn("[counters.wireHomeToggles] toggle-cigs not found");
    }

    if (tW) {
      tW.addEventListener("change", () => {
        updateSetting("weed", tW.checked);
      });
    } else {
      console.warn("[counters.wireHomeToggles] toggle-weed not found");
    }

    if (tA) {
      tA.addEventListener("change", () => {
        updateSetting("alcohol", tA.checked);
      });
    } else {
      console.warn("[counters.wireHomeToggles] toggle-alcool not found");
    }

    console.log("[counters.wireHomeToggles] Wired");
  } catch (e) {
    console.error("[counters.wireHomeToggles] error:", e);
  }
}

// --- Conseil du jour (fallback simple si i18n pas prêt) ---
const FALLBACK_TIPS = [
  "Boire un grand verre d'eau quand l'envie monte.",
  "Marcher 2 minutes : l'envie chute après une courte activité.",
  "Respirer lentement 10 secondes, trois fois de suite.",
  "Écrire l'envie sur une note, puis la déchirer.",
  "Se rappeler pourquoi tu as commencé à réduire ✊"
];

function setAdvice(text) {
  try {
    const el = $("#conseil-texte");
    if (el) {
      el.textContent = text || "—";
    }
  } catch (e) {
    console.error("[counters.setAdvice] error:", e);
  }
}

function initAdviceCarousel() {
  try {
    let idx = 0, paused = false, timer = null;

    function next() {
      if (paused) return;
      idx = (idx + 1) % FALLBACK_TIPS.length;
      setAdvice(FALLBACK_TIPS[idx]);
    }

    function prev() {
      idx = (idx - 1 + FALLBACK_TIPS.length) % FALLBACK_TIPS.length;
      setAdvice(FALLBACK_TIPS[idx]);
    }

    function start() {
      stop();
      timer = setInterval(next, 8000);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    const advPrevBtn = $("#adv-prev");
    const advPauseBtn = $("#adv-pause");

    if (advPrevBtn) {
      advPrevBtn.addEventListener("click", () => {
        prev();
        start();
      });
    } else {
      console.warn("[counters.initAdviceCarousel] adv-prev not found");
    }

    if (advPauseBtn) {
      advPauseBtn.addEventListener("click", () => {
        paused = !paused;
        if (!paused) {
          start();
        } else {
          stop();
        }
      });
    } else {
      console.warn("[counters.initAdviceCarousel] adv-pause not found");
    }

    // Démarre avec un texte
    setAdvice(FALLBACK_TIPS[idx]);
    start();

    console.log("[counters.initAdviceCarousel] Initialized");
  } catch (e) {
    console.error("[counters.initAdviceCarousel] error:", e);
  }
}

// --- Entrée & Undo (Annuler) ---
let lastAction = null;

function rememberAction(type, delta) {
  lastAction = { type, delta, at: Date.now() };
}

function wireUndo() {
  try {
    const bar = $("#snackbar");
    const link = $("#undo-link");

    if (!bar || !link) {
      console.warn("[counters.wireUndo] snackbar or undo-link not found");
      return;
    }

    on("ui:clicked", ({ detail }) => {
      // On mémorise seulement les +/−
      if (!detail?.type || !detail?.op) return;
      const delta = detail.op === "+" ? +1 : -1;
      rememberAction(detail.type, delta);
      
      if (bar) {
        bar.classList.add("show");
        setTimeout(() => bar.classList.remove("show"), 4000);
      }
      
      console.log("[counters.wireUndo] Action remembered:', detail);
    });

    link.addEventListener("click", (e) => {
      e.preventDefault();
      
      if (!lastAction) {
        console.warn("[counters.wireUndo] No action to undo");
        return;
      }

      try {
        if (lastAction.delta > 0) {
          // On annule un +1 → on retire
          const removeResult = removeOneToday(lastAction.type);
          if (removeResult) {
            console.log("[counters.wireUndo] Undo: removed 1 from', lastAction.type);
          } else {
            console.error("[counters.wireUndo] removeOneToday failed');
          }
        } else if (lastAction.delta < 0) {
          // On annule un -1 → on remet +1
          const addResult = addEntry(lastAction.type, Math.abs(lastAction.delta));
          if (addResult) {
            console.log("[counters.wireUndo] Undo: added', Math.abs(lastAction.delta), 'to', lastAction.type);
          } else {
            console.error("[counters.wireUndo] addEntry failed');
          }
        }

        emit("ui:undo", { ...lastAction });
        refreshHeaderCounters();
      } catch (e) {
        console.error("[counters.wireUndo] undo error:", e);
      } finally {
        lastAction = null;
        if (bar) {
          bar.classList.remove("show");
        }
      }
    });

    console.log("[counters.wireUndo] Wired");
  } catch (e) {
    console.error("[counters.wireUndo] error:", e);
  }
}

// --- Initialisation publique ---
export function initCounters() {
  console.log("[counters.init] ============ STARTING ============");

  try {
    // Horloge + header
    wireClock();

    // Plus/Minus accueil (CRITIQUE)
    wirePlusMinus();

    // Toggles accueil (je fume / je bois)
    try {
      applyModuleTogglesToHome(getSettings() || {});
      wireHomeToggles();
    } catch(e) {
      console.warn("[counters.init] toggles home skipped:", e);
    }

    // Conseil (fallback)
    initAdviceCarousel();

    // Undo
    wireUndo();

    // Rafraîchissements sur changements d'état
    on("state:changed",  refreshHeaderCounters);
    on("state:daily",    refreshHeaderCounters);
    on("state:economy",  refreshHeaderCounters);
    on("state:settings", () => {
      try {
        applyModuleTogglesToHome(getSettings() || {});
      } catch (e) {
        console.error("[counters.init] state:settings handler error:', e);
      }
      refreshHeaderCounters();
    });

    // Réveil quand on revient en avant-plan
    window.addEventListener("storage", () => {
      refreshHeaderCounters();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshHeaderCounters();
      }
    });

    // Premier rendu
    refreshHeaderCounters();

    console.log("[counters.init] ============ DONE ✅ ============");
  } catch (e) {
    console.error("[counters.init] ============ CRITICAL ERROR ============:', e);
  }
}
