// web/js/counters.js
// COMPLET v2.4.0 - Gestion des compteurs accueil (+/-), toggles modules, horloge
// Corrections: setSetting->saveSettings, structure totalsHeader adaptée

import {
  addEntry,
  removeOneToday,
  setActiveSegment,
  getActiveSegments,
  totalsHeader,
  ymd,
  on,
  saveSettings,
  getSettings,
  emit,
  getTodayTotals,
} from "./state.js";

/**
 * Petite aide : conversion ID de bouton -> type de consommation
 * cl-... => "cigs", j-... => "weed", a-... => "alcohol"
 */
function inferTypeFromId(id) {
  if (!id || typeof id !== "string") return null;
  if (id.startsWith("cl-")) return "cigs";
  if (id.startsWith("j-"))  return "weed";
  if (id.startsWith("a-"))  return "alcohol";
  return null;
}

/**
 * Rafraîchit les compteurs rapides (barre du haut) + bandeau résumé
 */
function refreshHeaderCounters() {
  try {
    const t = totalsHeader(new Date()) || {};

    // Totaux jour - CORRIGÉ: utiliser la vraie structure retournée par totalsHeader
    // totalsHeader retourne: { day: { total: X, cigs: Y, weed: Z, alcohol: W }, week: {...}, month: {...} }
    const day = t.day || {};
    const cigs = Number(day.cigs ?? 0) || 0;
    const weed = Number(day.weed ?? 0) || 0;
    const alcohol = Number(day.alcohol ?? 0) || 0;

    // Coût jour
    const cost = Number(day.cost ?? 0) || 0;

    // Header "stats rapides"
    const elCigs = document.getElementById("stat-clopes-jr");
    const elWeed = document.getElementById("stat-joints-jr");
    const elAlc = document.getElementById("stat-alcool-jr");
    const elCost = document.getElementById("stat-cout-jr");
    if (elCigs) elCigs.textContent = String(cigs);
    if (elWeed) elWeed.textContent = String(weed);
    if (elAlc) elAlc.textContent = String(alcohol);
    if (elCost) elCost.textContent = `${cost.toFixed(2)}€`;

    // Bandeau résumé Accueil
    const bTitle = document.getElementById("bandeau-titre");
    const bCigs  = document.getElementById("bandeau-clopes");
    const bWeed  = document.getElementById("bandeau-joints");
    const bAlc   = document.getElementById("bandeau-alcool");
    const bAlcLine = document.getElementById("bandeau-alcool-line");

    if (bTitle) {
      const d = new Date();
      bTitle.textContent = `Aujourd'hui — ${d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" })}`;
    }
    if (bCigs) bCigs.textContent = String(cigs);
    if (bWeed) bWeed.textContent = String(weed);
    if (bAlc)  bAlc.textContent  = String(alcohol);
    if (bAlcLine) bAlcLine.style.display = alcohol > 0 ? "flex" : "none";

    console.log("[counters.refreshHeaderCounters] Updated counters: cigs=" + cigs + " weed=" + weed + " alcohol=" + alcohol);
  } catch (e) {
    console.error("[counters.refreshHeaderCounters] error:", e);
  }
}

/**
 * Horloge en-tête (date/heure)
 */
function wireClock() {
  try {
    const elDate = document.getElementById("date-actuelle");
    const elTime = document.getElementById("heure-actuelle");
    const update = () => {
      const now = new Date();
      if (elDate) elDate.textContent = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
      if (elTime) elTime.textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    };
    update();
    setInterval(update, 30 * 1000);
    console.log("[counters.wireClock] Clock started");
  } catch (e) {
    console.error("[counters.wireClock] error:", e);
  }
}

/**
 * Boutons +/- (Accueil)
 * Supporte data-type="cigs|weed|alcohol" OU inférence à partir des IDs (cl-plus, j-moins, etc.)
 */
function wirePlusMinus() {
  const last = { action: null }; // { type, delta }

  const showSnack = (msg) => {
    const bar = document.getElementById("snackbar");
    const undo = document.getElementById("undo-link");
    if (!bar || !undo) return;
    bar.firstChild && (bar.firstChild.textContent = msg + " — ");
    bar.classList.add("show");
    const hide = () => bar.classList.remove("show");
    setTimeout(hide, 2500);
    undo.onclick = (ev) => {
      ev.preventDefault();
      try {
        if (!last.action) return;
        if (last.action.delta > 0) {
          removeOneToday(last.action.type);
        } else if (last.action.delta < 0) {
          addEntry(last.action.type, Math.abs(last.action.delta));
        }
      } catch (e) {
        console.error("[counters.undo] error:", e);
      } finally {
        hide();
        last.action = null;
      }
    };
  };

  const apply = (type, delta) => {
    try {
      if (!type) return;
      if (delta > 0) addEntry(type, delta);
      else if (delta < 0) removeOneToday(type);
      last.action = { type, delta };
      emit("ui:snack", { type, delta });
      refreshHeaderCounters();
      showSnack("Action enregistrée");
      console.log("[counters.apply] " + type + " " + (delta > 0 ? "+" : "") + delta);
    } catch (e) {
      console.error("[counters.wirePlusMinus] apply error:", e);
    }
  };

  // Attacher sur tous les boutons .btn-round de l'accueil
  const root = document.getElementById("ecran-principal") || document;
  const btns = root.querySelectorAll(".btn-round");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // 1) data-type prioritaire
      let type = btn.dataset?.type || null;
      // 2) sinon inférer par l'ID
      if (!type) type = inferTypeFromId(btn.id);

      const isPlus  = btn.classList.contains("btn-plus");
      const isMinus = btn.classList.contains("btn-minus");
      if (isPlus)  apply(type, +1);
      if (isMinus) apply(type, -1);
    });
  });

  console.log("[counters.wirePlusMinus] Wired " + btns.length + " buttons");
}

/**
 * Segments (clopes & alcool) — 3 boutons par groupe.
 * Sauvegarde la sélection via setActiveSegment(type, key).
 */
function wireSegments() {
  try {
    // CLopes
    const segCl = document.getElementById("seg-clopes");
    if (segCl) {
      segCl.innerHTML = "";
      const g = document.createDocumentFragment();
      [
        { k: "classic", label: "Classiques" },
        { k: "rolled",  label: "Roulées" },
        { k: "tube",    label: "Tubes" }
      ].forEach(({ k, label }) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "seg";
        b.textContent = label;
        b.addEventListener("click", () => {
          setActiveSegment("cigs", k);
          updateSegmentsUI();
        });
        g.appendChild(b);
      });
      segCl.appendChild(g);
    }

    // Alcool
    const segAl = document.getElementById("seg-alcool");
    if (segAl) {
      segAl.innerHTML = "";
      const g = document.createDocumentFragment();
      [
        { k: "beer",  label: "Bière" },
        { k: "fort",  label: "Fort" },
        { k: "liqueur", label: "Liqueur" }
      ].forEach(({ k, label }) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "seg";
        b.textContent = label;
        b.addEventListener("click", () => {
          setActiveSegment("alcohol", k);
          updateSegmentsUI();
        });
        g.appendChild(b);
      });
      segAl.appendChild(g);
    }

    // Appliquer l'état actif visuel
    const updateSegmentsUI = () => {
      try {
        const active = getActiveSegments ? (getActiveSegments() || {}) : {};
        const activeC = active.cigs || "classic";
        const activeA = active.alcohol || "beer";

        if (segCl) {
          const items = segCl.querySelectorAll(".seg");
          const keys = ["classic", "rolled", "tube"];
          items.forEach((el, idx) => {
            el.classList.toggle("actif", keys[idx] === activeC);
          });
        }
        if (segAl) {
          const items = segAl.querySelectorAll(".seg");
          const keys = ["beer", "fort", "liqueur"];
          items.forEach((el, idx) => {
            el.classList.toggle("actif", keys[idx] === activeA);
          });
        }
      } catch (e) {
        console.error("[counters.updateSegmentsUI] error:", e);
      }
    };

    updateSegmentsUI();
    on("state:settings", updateSegmentsUI);
    console.log("[counters.wireSegments] Segments wired");
  } catch (e) {
    console.error("[counters.wireSegments] error:", e);
  }
}

/**
 * Toggles "je fume/je bois" sur l'accueil
 */
function wireHomeToggles() {
  try {
    const s = (getSettings && getSettings()) || {};
    const map = [
      { id: "toggle-cigs",   key: "modules.cigs",      card: closestCard("val-clopes") },
      { id: "toggle-weed",   key: "modules.weed",      card: closestCard("val-joints") },
      { id: "toggle-alcool", key: "modules.alcohol",   card: closestCard("val-alcool") },
    ];

    // Appliquer l'état au chargement
    map.forEach(({ id, key, card }) => {
      const el = document.getElementById(id);
      const enabled = Boolean(pathGet(s, key, true));
      if (el) el.checked = enabled;
      if (card) card.style.display = enabled ? "" : "none";
    });

    // Listeners
    map.forEach(({ id, key, card }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", () => {
        try {
          const enabled = !!el.checked;
          saveSettings(s); // CORRIGÉ: utiliser saveSettings au lieu de setSetting
          if (card) card.style.display = enabled ? "" : "none";
          emit("state:settings", { [key]: enabled });
          console.log("[counters.wireHomeToggles] " + key + " = " + enabled);
        } catch (e) {
          console.error("[counters.wireHomeToggles] change error:", e);
        }
      });
    });

    console.log("[counters.wireHomeToggles] Home toggles wired");
  } catch (e) {
    console.error("[counters.wireHomeToggles] error:", e);
  }
}

function pathGet(obj, path, defVal) {
  try {
    return path.split(".").reduce((o, k) => (o && k in o ? o[k] : undefined), obj) ?? defVal;
  } catch {
    return defVal;
  }
}

function closestCard(valId) {
  const el = document.getElementById(valId);
  return el ? el.closest(".card") : null;
}

/**
 * Conseil du jour (simple fallback pour éviter le "—")
 */
function wireAdvice() {
  try {
    const el = document.getElementById("conseil-texte");
    if (!el) return;
    const now = new Date();
    const h = now.getHours();
    let advice = "Pense à respirer profondément 3 fois et boire un verre d'eau. ♥";

    if (h < 12) advice = "Matin zen : une marche de 5 minutes réduit souvent l'envie immédiate.";
    else if (h < 18) advice = "Après-midi : hydrate-toi, et note ton envie sur 10 (ça aide à la faire passer).";
    else advice = "Soir : une tisane ou une douche chaude = bons alliés. Tu avances, un pas après l'autre.";

    el.textContent = advice;
    console.log("[counters.wireAdvice] Advice displayed");
  } catch (e) {
    console.error("[counters.wireAdvice] error:", e);
  }
}

/**
 * Navigation basique (accueil/stats/calendrier/habitudes)
 * — au cas où app.js ne l'a pas déjà fait, on garde ça ultra-light
 */
function wireBottomNavFallback() {
  const byId = (id) => document.getElementById(id);
  const screens = [
    { btn: "nav-principal",   scr: "ecran-principal"   },
    { btn: "nav-stats",       scr: "ecran-stats"       },
    { btn: "nav-calendrier",  scr: "ecran-calendrier"  },
    { btn: "nav-habitudes",   scr: "ecran-habitudes"   },
    { btn: "nav-params",      scr: "ecran-habitudes"   },
  ];

  const show = (id) => {
    document.querySelectorAll(".ecran").forEach(el => el.classList.remove("show"));
    const el = byId(id);
    if (el) el.classList.add("show");
  };

  screens.forEach(({ btn, scr }) => {
    const b = byId(btn);
    if (!b) return;
    b.addEventListener("click", () => {
      document.querySelectorAll(".nav button").forEach(x => x.classList.remove("actif"));
      b.classList.add("actif");
      show(scr);
    });
  });

  console.log("[counters.wireBottomNavFallback] Fallback nav wired");
}

/**
 * Initialisation publique
 */
export function initCounters() {
  try {
    console.log("[counters.initCounters] ============ STARTING ============");

    wireClock();
    wireSegments();
    wireHomeToggles();
    wireAdvice();
    wirePlusMinus();
    wireBottomNavFallback();

    // Réagir aux changements d'état (bus interne)
    on("state:changed",  refreshHeaderCounters);
    on("state:daily",    refreshHeaderCounters);
    on("state:economy",  refreshHeaderCounters);
    on("state:settings", refreshHeaderCounters);

    // Maj initiale
    refreshHeaderCounters();

    // Visibilité / storage
    window.addEventListener("storage", () => {
      console.log("[counters] Storage changed, refreshing");
      refreshHeaderCounters();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log("[counters] App visible, refreshing");
        refreshHeaderCounters();
      }
    });

    console.log("[counters.initCounters] ============ DONE ✅ ============");
  } catch (e) {
    console.error("[counters.initCounters] ============ CRITICAL ERROR ============:", e);
  }
}
