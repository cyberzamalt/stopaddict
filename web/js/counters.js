// web/js/counters.js
// ------------------------------------------------------------
// Gestion des compteurs + / - (Accueil & Cal Jour)
// - Pas besoin de data-type: fallback par ID des boutons
// - Utilise state.addEntry / state.removeOneToday
// - Undo strict de la dernière action
// - Écoute le bus d’événements via state.on(...)
// - Met à jour l’entête (stats rapides + bandeau)
// ------------------------------------------------------------
import {
  addEntry,
  removeOneToday,
  setActiveSegment,
  getActiveSegments,
  totalsHeader,
  ymd,
  emit,
  on, // <-- écoute le bus d’événements interne de state.js
} from "./state.js";

// --- Mémoire de la dernière action pour Undo ---
let lastAction = null; // { type, delta, dateKey }

// --- Déduction du type depuis l'ID du bouton (fallback sans data-type) ---
function inferTypeFromButtonId(id) {
  // Accueil
  if (id === "c-plus" || id === "c-moins") return "cigs";
  if (id === "j-plus" || id === "j-moins") return "weed";
  if (id === "a-plus" || id === "a-moins") return "alcohol";
  // Cal jour
  if (id === "cal-cl-plus" || id === "cal-cl-moins") return "cigs";
  if (id === "cal-j-plus"  || id === "cal-j-moins")  return "weed";
  if (id === "cal-a-plus"  || id === "cal-a-moins")  return "alcohol";
  return null;
}

// Branche les segments (si présents) pour Cigarettes & Alcool
function wireSegments() {
  const segC = document.getElementById("seg-clopes");
  const segA = document.getElementById("seg-alcool");
  const uiSeg = getActiveSegments();

  if (segC) {
    segC.querySelectorAll(".seg").forEach(btn => {
      btn.addEventListener("click", () => {
        const sub = btn.dataset.subtype || "classic";
        setActiveSegment("cigs", sub);
        segC.querySelectorAll(".seg").forEach(b => b.classList.toggle("actif", b === btn));
      });
    });
    // État visuel initial
    segC.querySelectorAll(".seg").forEach(b => {
      const sub = b.dataset.subtype || "classic";
      b.classList.toggle("actif", sub === uiSeg.cigs);
    });
  }

  if (segA) {
    segA.querySelectorAll(".seg").forEach(btn => {
      btn.addEventListener("click", () => {
        const sub = btn.dataset.subtype || "beer";
        setActiveSegment("alcohol", sub);
        segA.querySelectorAll(".seg").forEach(b => b.classList.toggle("actif", b === btn));
      });
    });
    segA.querySelectorAll(".seg").forEach(b => {
      const sub = b.dataset.subtype || "beer";
      b.classList.toggle("actif", sub === uiSeg.alcohol);
    });
  }
}

// Met à jour le header (stats rapides & bandeau)
function refreshHeaderCounters() {
  const today = totalsHeader(new Date());
  const map = [
    ["stat-clopes-jr", today.cigs],
    ["stat-joints-jr", today.weed],
    ["stat-alcool-jr", today.alcohol],
    ["stat-cout-jr",   (today.cost || 0).toFixed(2) + "€"],
    ["bandeau-clopes", today.cigs],
    ["bandeau-joints", today.weed],
    ["bandeau-alcool", today.alcohol],
  ];
  for (const [id, val] of map) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  }
  const line = document.getElementById("bandeau-alcool-line");
  if (line) line.style.display = today.alcohol > 0 ? "" : "none";
}

// Snackbar simple
function showSnack(msg, withUndo = true) {
  const sb = document.getElementById("snackbar");
  if (!sb) return;
  // On garde la structure “Action enregistrée — [Annuler]”
  // Le premier nœud texte avant le lien est mis à jour
  const undo = document.getElementById("undo-link");
  if (undo) undo.style.display = withUndo ? "" : "none";

  // Remet la phrase complète AVANT le lien
  // (si tu as modifié la structure HTML de la snackbar, tu peux adapter)
  sb.innerHTML = `${msg} — <a href="#" id="undo-link">Annuler</a>`;

  // rebranche le lien après avoir réécrit le HTML
  const link = document.getElementById("undo-link");
  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      handleUndo();
    }, { once: true });
  }

  sb.classList.add("show");
  setTimeout(() => sb.classList.remove("show"), 2500);
}

// Applique l’action et mémorise pour Undo
function apply(type, delta) {
  const now = new Date();
  const key = ymd(now);

  if (delta > 0) {
    addEntry(type, +delta);
  } else {
    removeOneToday(type);
  }

  lastAction = { type, delta, dateKey: key };
  refreshHeaderCounters();
  emit("ui:counter-applied", { type, delta, dateKey: key });
}

// Undo strict de la dernière action
function handleUndo() {
  if (!lastAction) return;
  const { type, delta } = lastAction;

  if (delta > 0) {
    // Annule un +1 par un -1
    removeOneToday(type);
  } else if (delta < 0) {
    // Annule un -1 par un +1
    addEntry(type, Math.abs(delta));
  }

  lastAction = null;
  refreshHeaderCounters();
  showSnack("Annulé", false);
}

// Branche tous les boutons +/- (Accueil + Calendrier jour)
function wirePlusMinus() {
  const ids = [
    "c-plus","c-moins","j-plus","j-moins","a-plus","a-moins",
    "cal-cl-plus","cal-cl-moins","cal-j-plus","cal-j-moins","cal-a-plus","cal-a-moins",
  ];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener("click", () => {
      // 1) data-type prioritaire si jamais présent
      let type = btn.dataset.type || null;
      // 2) fallback par ID
      if (!type) type = inferTypeFromButtonId(btn.id);
      if (!type) {
        console.warn("[counters] Bouton non relié (type introuvable)", btn.id);
        return;
      }

      const isPlus = btn.classList.contains("btn-plus") || btn.id.includes("plus");
      const delta = isPlus ? +1 : -1;

      apply(type, delta);
      showSnack("Action enregistrée");
    });
  });
}

// Horloge (date/heure du header)
function wireClock() {
  const elDate = document.getElementById("date-actuelle");
  const elHeure = document.getElementById("heure-actuelle");

  function fmtDate(d) {
    return d.toLocaleDateString("fr-FR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
  }
  function fmtTime(d) {
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function tick() {
    const d = new Date();
    if (elDate)  elDate.textContent  = fmtDate(d);
    if (elHeure) elHeure.textContent = fmtTime(d);
  }
  tick();
  setInterval(tick, 30_000);
}

// --- Public API ---
export function initCounters() {
  wireClock();
  wireSegments();
  wirePlusMinus();
  refreshHeaderCounters();

  // Écoute du BUS interne de state.js (et non document)
  on("state:changed",  refreshHeaderCounters);
  on("state:daily",    refreshHeaderCounters);
  on("state:economy",  refreshHeaderCounters);
  on("state:settings", refreshHeaderCounters);

  // Rafraîchit aussi quand on revient sur l’onglet / autre fenêtre modifie le LS
  window.addEventListener("storage", () => refreshHeaderCounters());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshHeaderCounters();
  });
}
