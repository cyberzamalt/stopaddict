// web/js/settings.js
//
// Rôle :
// 1) Navigation bas d’écran (Accueil / Stats / Calendrier / Habitudes / Réglages)
// 2) Toggles modules “je fume / je bois / je consomme” (ré-activables depuis l’accueil)
// 3) Modale 18+ : ouverture au premier lancement + validation persistée (localStorage app_warn_v23)
// 4) Conseil du jour (affiché dans le bandeau orange à l’accueil)
// 5) Signalement propre via le bus (emit("state:settings")) pour que le reste se rafraîchisse
//
// Dépendances : state.js (getSettings, saveSettings, on, emit)

import { getSettings, saveSettings, on, emit } from "./state.js";

// ---------- Helpers DOM ----------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---------- Navigation bas d’écran ----------
function showScreen(id) {
  $$(".ecran").forEach(e => e.classList.remove("show"));
  const el = document.getElementById(id);
  if (el) el.classList.add("show");

  $$(".nav button").forEach(b => b.classList.remove("actif"));
  const map = {
    "ecran-principal":   "nav-principal",
    "ecran-stats":       "nav-stats",
    "ecran-calendrier":  "nav-calendrier",
    "ecran-habitudes":   "nav-habitudes",
  };
  const btnId = map[id] || "nav-params"; // au cas où
  document.getElementById(btnId)?.classList.add("actif");
}

function wireNavigation() {
  $("#nav-principal")  ?.addEventListener("click", () => showScreen("ecran-principal"));
  $("#nav-stats")      ?.addEventListener("click", () => showScreen("ecran-stats"));
  $("#nav-calendrier") ?.addEventListener("click", () => showScreen("ecran-calendrier"));
  $("#nav-habitudes")  ?.addEventListener("click", () => showScreen("ecran-habitudes"));
  $("#nav-params")     ?.addEventListener("click", () => {
    // selon ta structure, “Réglages” est contenu dans “Habitudes” ou une page ; on affiche Habitudes par défaut
    showScreen("ecran-habitudes");
  });
}

// ---------- Modale 18+ ----------
const WARN_KEY = "app_warn_v23";

function getWarnState() {
  try {
    return JSON.parse(localStorage.getItem(WARN_KEY) || "null") || { accepted:false, hide:false, t:0 };
  } catch { return { accepted:false, hide:false, t:0 }; }
}
function setWarnState(s) {
  try { localStorage.setItem(WARN_KEY, JSON.stringify(s)); } catch {}
}
function isWarnAccepted() {
  const s = getWarnState();
  return !!s.accepted;
}
function openWarnModal() {
  const m = $("#modal-warn");
  if (!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
}
function closeWarnModal() {
  const m = $("#modal-warn");
  if (!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
}

function wireWarnModal() {
  const chk18   = $("#chk-warn-18");
  const chkHide = $("#chk-warn-hide");
  const btnAcc  = $("#btn-warn-accept");
  const btnCancel = $("#btn-warn-cancel");
  const btnQuit = $("#btn-warn-quit");

  // Activer/désactiver le bouton “J’accepte” suivant la case 18+
  function refreshBtn() {
    if (btnAcc) btnAcc.disabled = !(chk18 && chk18.checked === true);
  }
  chk18?.addEventListener("change", refreshBtn);
  refreshBtn();

  btnAcc?.addEventListener("click", () => {
    const cur = getWarnState();
    setWarnState({
      accepted: true,
      hide: !!(chkHide?.checked),
      t: Date.now()
    });
    closeWarnModal();
    emit("state:settings", { source: "warn-accept" });
  });

  btnCancel?.addEventListener("click", () => {
    closeWarnModal();
  });

  btnQuit?.addEventListener("click", () => {
    // Sur le web on ne peut pas “fermer” l’app. On se contente de masquer le contenu principal.
    // Si besoin, on pourrait rediriger vers une page neutre.
    closeWarnModal();
  });

  // Lien “Ressources et numéros utiles” déjà géré côté app.js pour réouverture si besoin.
}

// ---------- Toggles modules Accueil (ré-activables) ----------
function applyModuleVisibilityFromSettings() {
  const s = getSettings() || {};
  const modules = s.modules || { cigs:true, weed:true, alcohol:true };

  // Cartes de l’accueil
  const cardC = $("#ecran-principal .card.bar-left"); // 1ère carte = cigs
  const cardW = $("#ecran-principal .card.bar-left.green");
  const cardA = $("#ecran-principal .card.bar-left.orange");

  if (cardC) cardC.style.display = modules.cigs    ? "" : "none";
  if (cardW) cardW.style.display = modules.weed    ? "" : "none";
  if (cardA) cardA.style.display = modules.alcohol ? "" : "none";

  // Bandeau accueil : lignes conditionnelles
  const lineA = $("#bandeau-alcool-line");
  if (lineA) lineA.style.display = modules.alcohol ? "" : "none";

  // État visuel des cases à cocher (accueil)
  $("#toggle-cigs")   && ($("#toggle-cigs").checked   = !!modules.cigs);
  $("#toggle-weed")   && ($("#toggle-weed").checked   = !!modules.weed);
  $("#toggle-alcool") && ($("#toggle-alcool").checked = !!modules.alcohol);
}

function saveModuleToggle(partial) {
  const s = getSettings() || {};
  const old = s.modules || { cigs:true, weed:true, alcohol:true };
  const next = { ...old, ...partial };
  saveSettings({ ...s, modules: next });
  applyModuleVisibilityFromSettings();
  emit("state:settings", { source: "module-toggle", modules: next });
}

function wireHomeModuleToggles() {
  $("#toggle-cigs")?.addEventListener("change", (e) => saveModuleToggle({ cigs: !!e.target.checked }));
  $("#toggle-weed")?.addEventListener("change", (e) => saveModuleToggle({ weed: !!e.target.checked }));
  $("#toggle-alcool")?.addEventListener("change", (e) => saveModuleToggle({ alcohol: !!e.target.checked }));
}

// ---------- Conseil du jour ----------
const DEFAULT_TIPS = [
  "Boire un grand verre d’eau quand l’envie monte : ça passe souvent en 2 minutes.",
  "Sors prendre l’air 3 minutes — marcher aide à casser l’automatisme.",
  "Note ton envie sur 10 — et re-note 5 minutes après. Tu verras la baisse.",
  "Respiration 4-2-6 (4s inspire, 2s pause, 6s expire) × 5 cycles.",
  "Souviens-toi : réduire, c’est déjà gagner. Même une unité en moins compte."
];

function pickTip() {
  try {
    // Si tu as un système de tips dans les settings, branche-le ici
    const s = getSettings() || {};
    const tips = (s.tips && Array.isArray(s.tips) && s.tips.length) ? s.tips : DEFAULT_TIPS;
    // Tip pseudo-quotidien
    const d = new Date();
    const seed = Number(String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0"));
    return tips[seed % tips.length];
  } catch {
    return DEFAULT_TIPS[0];
  }
}

function renderTip() {
  const box = $("#conseil-texte");
  if (!box) return;
  box.textContent = pickTip();
}

function wireTipControls() {
  // Boutons ◀ ⏸ (optionnels)
  $("#adv-prev") ?.addEventListener("click", renderTip);
  $("#adv-pause")?.addEventListener("click", () => {
    // ici on pourrait stopper un carrousel auto ; par défaut on regénère un tip unique
    renderTip();
  });
}

// ---------- Init principal ----------
export function initSettings() {
  // 1) Navigation
  wireNavigation();

  // 2) Modale 18+ au premier lancement
  //    (n’ouvre que si non accepté ; sinon on laisse l’app démarrer normalement)
  try {
    if (!isWarnAccepted()) openWarnModal();
    wireWarnModal();
  } catch(e) {
    console.warn("[settings] warn modal wiring error:", e);
  }

  // 3) Toggles modules (accueil)
  try {
    wireHomeModuleToggles();
    applyModuleVisibilityFromSettings();
  } catch(e) {
    console.warn("[settings] module toggles wiring error:", e);
  }

  // 4) Conseil
  try {
    renderTip();
    wireTipControls();
  } catch(e) {
    console.warn("[settings] tip error:", e);
  }

  // 5) Quand les settings changent ailleurs → on se resynchronise
  on("state:settings", applyModuleVisibilityFromSettings);

  // 6) Au chargement initial, afficher l’accueil
  showScreen("ecran-principal");
}
