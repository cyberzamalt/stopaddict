// web/js/ads.js
// STOPADDICT — Bandeau pub (version gratuite)
// - Renseigne et fait tourner quelques messages publicitaires/infos en bas de page (#ad-banner).
// - Respecte un éventuel mode “payant” (désactive les pubs si localStorage stopaddict_no_ads = "1"
//   ou si un évènement 'sa:ads-disable' / 'sa:paid-activated' est reçu).
// - Rotation automatique, pause quand l’onglet est masqué, reprise au retour.
// - API: window.SA_ADS.enable()/disable()/next()/prev()/setMessages(list)/setInterval(ms)

const DISABLE_KEY = "stopaddict_no_ads";
const STATE_KEY   = "stopaddict_ads_state_v1";

let bannerEl = null;
let timer = null;
let intervalMs = 20000; // 20s par défaut
let idx = 0;
let disabled = false;

function detectLang() {
  try { return (localStorage.getItem("stopaddict_lang") || navigator.language || "fr").toLowerCase(); }
  catch { return "fr"; }
}
const isFR = detectLang().startsWith("fr");

// Messages par défaut (propres, non-trackés)
let messages = isFR ? [
  { text: "Version Premium : application sans publicité", href: "#" },
  { text: "Exportez vos données : CSV & JSON complets", href: "#" },
  { text: "Fixez vos objectifs quotidiens dans Habitudes", href: "#" },
] : [
  { text: "Premium version: ad-free experience", href: "#" },
  { text: "Export your data: full CSV & JSON", href: "#" },
  { text: "Set your daily goals in Habits", href: "#" },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (Number.isFinite(+obj.idx)) idx = +obj.idx;
      if (Number.isFinite(+obj.intervalMs)) intervalMs = +obj.intervalMs;
    }
  } catch {}
  try { disabled = localStorage.getItem(DISABLE_KEY) === "1"; } catch {}
}

function persistState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ idx, intervalMs }));
  } catch {}
}

function ensureBanner() {
  if (bannerEl) return bannerEl;
  bannerEl = document.getElementById("ad-banner");
  if (!bannerEl) {
    // Crée un conteneur minimal si absent (sécurité)
    bannerEl = document.createElement("div");
    bannerEl.id = "ad-banner";
    bannerEl.style.position = "fixed";
    bannerEl.style.left = "0";
    bannerEl.style.right = "0";
    bannerEl.style.bottom = "0";
    bannerEl.style.background = "#0d1526";
    bannerEl.style.borderTop = "1px solid #1f2a44";
    bannerEl.style.padding = ".5rem .75rem";
    bannerEl.style.textAlign = "center";
    bannerEl.style.color = "#8aa1ff";
    bannerEl.style.zIndex = "40";
    document.body.appendChild(bannerEl);
  }
  return bannerEl;
}

function render() {
  const el = ensureBanner();
  if (!el) return;

  if (disabled || !messages.length) {
    el.style.display = "none";
    return;
  }
  el.style.display = "block";

  // Clamp index
  if (idx < 0) idx = 0;
  if (idx >= messages.length) idx = 0;

  const { text, href } = messages[idx] || {};
  const a11y = isFR ? "Lien sponsorisé" : "Sponsored link";

  // Contenu simple, sans tracking
  el.innerHTML = "";
  const link = document.createElement("a");
  link.href = href || "#";
  link.target = "_self";
  link.rel = "nofollow noopener";
  link.textContent = text || (isFR ? "Publicité" : "Ad");
  link.setAttribute("aria-label", a11y);
  link.style.color = "inherit";
  link.style.textDecoration = "underline";

  el.appendChild(link);

  // Petite pagination discrète (• ○ ○)
  if (messages.length > 1) {
    const dots = document.createElement("span");
    dots.style.marginLeft = "0.75rem";
    dots.setAttribute("aria-hidden", "true");
    dots.textContent = " " + messages.map((_, i) => (i === idx ? "●" : "○")).join(" ");
    el.appendChild(dots);
  }
}

function startTimer() {
  stopTimer();
  if (disabled || messages.length <= 1) return;
  timer = setInterval(() => { next(); }, intervalMs);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function onVisibility() {
  if (document.hidden) stopTimer();
  else startTimer();
}

// -------- API publique --------
function enable() {
  disabled = false;
  try { localStorage.setItem(DISABLE_KEY, "0"); } catch {}
  render();
  startTimer();
}
function disable() {
  disabled = true;
  try { localStorage.setItem(DISABLE_KEY, "1"); } catch {}
  stopTimer();
  render();
}
function next() {
  if (!messages.length) return;
  idx = (idx + 1) % messages.length;
  persistState();
  render();
}
function prev() {
  if (!messages.length) return;
  idx = (idx - 1 + messages.length) % messages.length;
  persistState();
  render();
}
function setMessages(list) {
  if (Array.isArray(list)) {
    messages = list.filter(m => m && typeof m.text === "string");
    idx = 0;
    persistState();
    render();
    startTimer();
  }
}
function setIntervalMs(ms) {
  if (Number.isFinite(+ms) && +ms >= 5000) {
    intervalMs = +ms;
    persistState();
    startTimer();
  }
}

export function initAds() {
  loadState();
  ensureBanner();
  render();
  startTimer();

  document.addEventListener("visibilitychange", onVisibility);

  // Désactivation via évènements (ex. passage en version payante)
  document.addEventListener("sa:ads-disable", disable);
  document.addEventListener("sa:paid-activated", disable);

  // Exposer l’API globale pour réglages avancés
  try {
    window.SA_ADS = {
      enable, disable, next, prev,
      setMessages, setInterval: setIntervalMs,
      get state() { return { disabled, idx, intervalMs, total: messages.length }; },
    };
  } catch {}
}

export default { initAds, enable, disable, next, prev, setMessages, setInterval: setIntervalMs };
