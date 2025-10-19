// web/js/counters.js
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

// Essaye d’inférer le type (cigs/weed/alcohol) à partir de l’id du bouton
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
    $("#stat-clopes-jr") && ($("#stat-clopes-jr").textContent = fmt(tdy.cigs));
    $("#stat-joints-jr") && ($("#stat-joints-jr").textContent = fmt(tdy.weed));
    $("#stat-alcool-jr") && ($("#stat-alcool-jr").textContent = fmt(tdy.alcohol));
    $("#stat-cout-jr")   && ($("#stat-cout-jr").textContent   = (tdy.cost ?? 0).toFixed(2)+"€");

    // Cartes Accueil
    $("#val-clopes") && ($("#val-clopes").textContent = fmt(tdy.cigs));
    $("#val-joints") && ($("#val-joints").textContent = fmt(tdy.weed));
    $("#val-alcool") && ($("#val-alcool").textContent = fmt(tdy.alcohol));

    // Bandeau
    const hdr = totalsHeader(new Date());
    $("#bandeau-titre") && ($("#bandeau-titre").textContent = hdr.title || "Aujourd’hui");
    $("#bandeau-clopes") && ($("#bandeau-clopes").textContent = fmt(tdy.cigs));
    $("#bandeau-joints") && ($("#bandeau-joints").textContent = fmt(tdy.weed));

    const alcoolLine = $("#bandeau-alcool-line");
    if (alcoolLine) {
      if ((tdy.alcohol ?? 0) > 0) {
        alcoolLine.style.display = "";
        $("#bandeau-alcool").textContent = fmt(tdy.alcohol);
      } else {
        alcoolLine.style.display = "none";
      }
    }

    // Date/Heure en haut
    const now = new Date();
    const dateTxt = now.toLocaleDateString(undefined, { weekday:"long", day:"2-digit", month:"long" });
    const timeTxt = now.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
    $("#date-actuelle") && ($("#date-actuelle").textContent = dateTxt);
    $("#heure-actuelle") && ($("#heure-actuelle").textContent = timeTxt);
  } catch(e) {
    console.error("[counters] refreshHeaderCounters error:", e);
  }
}

// --- Horloge en-tête (maj chaque minute) ---
function wireClock() {
  refreshHeaderCounters();
  setInterval(refreshHeaderCounters, 60_000);
  // Tap-tap-tap pour console debug
  let taps = 0, lastTap = 0;
  $("#date-actuelle")?.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 500) { taps++; } else { taps = 1; }
    lastTap = now;
    if (taps >= 5) {
      const dc = $("#debug-console");
      if (dc) dc.classList.toggle("show");
      taps = 0;
    }
  });
}

// --- Boutons + / − (Accueil) ---
function wirePlusMinus() {
  // Tous les boutons ronds de l’accueil
  $$(".ecran.show, #ecran-principal .pm .btn-round, #ecran-principal .btn-round, .btn-round").forEach(btn => {
    // On ne garde que ceux avec id connu
    if (!btn.id) return;
    if (!/(cl|j|a)-(plus|moins)/i.test(btn.id)) return;

    btn.addEventListener("click", () => {
      const isPlus  = btn.classList.contains("btn-plus");
      const isMinus = btn.classList.contains("btn-minus");
      const explicitType = btn.dataset?.type;
      const type = explicitType || inferTypeFromId(btn.id);
      if (!type) return;

      try {
        if (isPlus)  addEntry(type, 1);
        if (isMinus) removeOneToday(type);
        emit("ui:clicked", { id: btn.id, type, op: isPlus?"+":"-" });
      } catch (e) {
        console.error("[counters] plus/minus error:", e);
      }
    });
  });
}

// --- Toggles “je fume / je bois” (Accueil) ---
function applyModuleTogglesToHome(s) {
  // On masque/affiche les cartes selon les toggles
  const cardC = $("#ecran-principal .card.bar-left");         // 1ère carte = cigs
  const cardJ = $("#ecran-principal .card.bar-left.green");   // 2ème = weed
  const cardA = $("#ecran-principal .card.bar-left.orange");  // 3ème = alcohol

  if (cardC) cardC.style.display = (s?.modules?.cigs === false)    ? "none" : "";
  if (cardJ) cardJ.style.display = (s?.modules?.weed === false)    ? "none" : "";
  if (cardA) cardA.style.display = (s?.modules?.alcohol === false) ? "none" : "";

  // Les checkbox de l’accueil reflètent l’état
  const tC = $("#toggle-cigs");
  const tW = $("#toggle-weed");
  const tA = $("#toggle-alcool");
  if (tC) tC.checked = (s?.modules?.cigs !== false);
  if (tW) tW.checked = (s?.modules?.weed !== false);
  if (tA) tA.checked = (s?.modules?.alcohol !== false);
}

function wireHomeToggles() {
  const tC = $("#toggle-cigs");
  const tW = $("#toggle-weed");
  const tA = $("#toggle-alcool");

  function updateSetting(key, checked) {
    const s = getSettings() || {};
    s.modules = s.modules || { cigs:true, weed:true, alcohol:true };
    s.modules[key] = !!checked;
    saveSettings(s);
    applyModuleTogglesToHome(s);
    emit("state:settings", { modules: s.modules });
    // On rafraîchit le header au cas où
    refreshHeaderCounters();
  }

  tC?.addEventListener("change", () => updateSetting("cigs", tC.checked));
  tW?.addEventListener("change", () => updateSetting("weed", tW.checked));
  tA?.addEventListener("change", () => updateSetting("alcohol", tA.checked));
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
  const el = $("#conseil-texte");
  if (el) el.textContent = text || "—";
}
function initAdviceCarousel() {
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

  $("#adv-prev")?.addEventListener("click", () => { prev(); start(); });
  $("#adv-pause")?.addEventListener("click", () => {
    paused = !paused;
    if (!paused) start(); else stop();
  });

  // Démarre avec un texte
  setAdvice(FALLBACK_TIPS[idx]);
  start();
}

// --- Entrée & Undo (Annuler) ---
let lastAction = null;
function rememberAction(type, delta) {
  lastAction = { type, delta, at: Date.now() };
}
function wireUndo() {
  const bar = $("#snackbar");
  const link = $("#undo-link");
  if (!bar || !link) return;

  on("ui:clicked", ({ detail }) => {
    // On mémorise seulement les +/−
    if (!detail?.type || !detail?.op) return;
    const delta = detail.op === "+" ? +1 : -1;
    rememberAction(detail.type, delta);
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 4000);
  });

  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (!lastAction) return;
    try {
      if (lastAction.delta > 0) {
        // On annule un +1 → on retire
        removeOneToday(lastAction.type);
      } else if (lastAction.delta < 0) {
        // On annule un -1 → on remet +1
        addEntry(lastAction.type, Math.abs(lastAction.delta));
      }
      emit("ui:undo", { ...lastAction });
    } catch (e) {
      console.error("[counters] undo error:", e);
    } finally {
      lastAction = null;
      $("#snackbar")?.classList.remove("show");
    }
  });
}

// --- Initialisation publique ---
export function initCounters() {
  // Horloge + header
  wireClock();

  // Plus/Minus accueil
  wirePlusMinus();

  // Toggles accueil (je fume / je bois)
  try {
    applyModuleTogglesToHome(getSettings() || {});
    wireHomeToggles();
  } catch(e) {
    console.warn("[counters] toggles home skipped:", e);
  }

  // Conseil (fallback)
  initAdviceCarousel();

  // Undo
  wireUndo();

  // Rafraîchissements sur changements d’état
  on("state:changed",  refreshHeaderCounters);
  on("state:daily",    refreshHeaderCounters);
  on("state:economy",  refreshHeaderCounters);
  on("state:settings", () => {
    try { applyModuleTogglesToHome(getSettings() || {}); } catch {}
    refreshHeaderCounters();
  });

  // Réveil quand on revient en avant-plan
  window.addEventListener("storage", () => refreshHeaderCounters());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshHeaderCounters();
  });

  // Premier rendu
  refreshHeaderCounters();
}
