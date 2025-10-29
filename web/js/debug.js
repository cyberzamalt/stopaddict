// web/js/debug.js
// Overlay console : toggle par 5 clics rapides sur le header, persistance, safe avec ton hook existant.
// Exporte initDebug(); n'affecte rien si #debug-console n'est pas présent.

const LS_KEY = "sa.debug.shown";
let clickCount = 0;
let clickTimer = null;

function ensureConsoleEl() {
  let el = document.getElementById("debug-console");
  if (!el) {
    el = document.createElement("div");
    el.id = "debug-console";
    el.style.cssText = "position:fixed;left:0;right:0;bottom:0;max-height:40vh;overflow:auto;background:#111;color:#0f0;padding:8px;font:12px/1.4 monospace;z-index:99999;white-space:pre-wrap;display:none";
    document.body.appendChild(el);
  }
  return el;
}

function showConsole(show) {
  const el = ensureConsoleEl();
  el.classList[show ? "add" : "remove"]("show");
  el.style.display = show ? "block" : "none";
  try { localStorage.setItem(LS_KEY, show ? "1" : "0"); } catch {}
}

function toggleConsole() {
  const el = ensureConsoleEl();
  const visible = el.classList.contains("show");
  showConsole(!visible);
}

function bindSecretTap() {
  const header = document.querySelector(".header") || document.body;
  header.addEventListener("click", () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 1200);
    if (clickCount >= 5) {
      clickCount = 0;
      toggleConsole();
      try { console.log("[debug] overlay toggled"); } catch {}
    }
  });
}

function restorePersisted() {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === "1") showConsole(true);
  } catch {}
}

export function initDebug() {
  try {
    ensureConsoleEl();
    restorePersisted();
    bindSecretTap();

    // petite API globale optionnelle
    window.SA_DEBUG = function(msg, type = "info") {
      try {
        const el = ensureConsoleEl();
        el.classList.add("show");
        el.style.display = "block";
        const t = new Date().toTimeString().slice(0,8);
        el.textContent += `\n[${t}] [${type}] ${String(msg)}`;
        el.scrollTop = el.scrollHeight;
      } catch {}
    };

    // Events externes pour forcer l’affichage/masquage au besoin
    window.addEventListener("sa:debug:show", () => showConsole(true));
    window.addEventListener("sa:debug:hide", () => showConsole(false));

    console.log("[debug] ✓ ready");
  } catch (e) {
    console.warn("[debug.init] error:", e);
  }
}
