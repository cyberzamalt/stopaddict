// web/js/debug.js
// Overlay console activable (+ réutilise #debug-console s'il existe)
// – Activer via ?debug=1, #debug, localStorage['sa:debug']="1" ou Alt+D
// – API: enableDebugOverlay(), disableDebugOverlay(), toggleDebugOverlay(),
//        installGlobalErrorHooks(), setPersist(true|false), logDebug(msg, type)

let _enabled = false;
let _installed = false;
let _orig = null;

function getPane() {
  let el = document.getElementById("debug-console");
  if (!el) {
    el = document.createElement("div");
    el.id = "debug-console";
    el.style.cssText = "position:fixed;left:0;right:0;bottom:0;max-height:40vh;overflow:auto;background:#111;color:#0f0;padding:8px;font:12px/1.4 monospace;z-index:99999;white-space:pre-wrap;display:none";
    document.body.appendChild(el);
  }
  return el;
}

function ts() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `[${hh}:${mm}:${ss}]`;
}

function append(line, type = "log") {
  try {
    const el = getPane();
    el.style.display = "block";
    el.classList.add("show");
    el.textContent += `\n${ts()} [${type}] ${line}`;
    el.scrollTop = el.scrollHeight;
    // Trim basique si trop long
    if (el.textContent.length > 200_000) {
      el.textContent = el.textContent.slice(-150_000);
    }
  } catch { /* noop */ }
}

export function logDebug(msg, type = "log") {
  append(typeof msg === "string" ? msg : JSON.stringify(msg), type);
}

function wrapConsole() {
  if (_orig) return;
  _orig = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...a) => { try { _orig.log(...a); } finally { append(a.map(String).join(" "), "log"); } };
  console.info = (...a) => { try { _orig.info(...a); } finally { append(a.map(String).join(" "), "info"); } };
  console.warn = (...a) => { try { _orig.warn(...a); } finally { append(a.map(String).join(" "), "warn"); } };
  console.error = (...a) => { try { _orig.error(...a); } finally { append(a.map(String).join(" "), "error"); } };
}

function unwrapConsole() {
  if (!_orig) return;
  console.log = _orig.log;
  console.info = _orig.info;
  console.warn = _orig.warn;
  console.error = _orig.error;
  _orig = null;
}

export function installGlobalErrorHooks() {
  if (_installed) return;
  _installed = true;

  // Évite double-install
  if (window.__sa_err_hooks_installed) return;
  window.__sa_err_hooks_installed = true;

  window.addEventListener("error", (e) => {
    const msg = (e && e.message) || "error";
    const file = (e && e.filename) || "";
    const line = (e && e.lineno) || "";
    append(`${msg} @ ${file}:${line}`, "error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    const msg = (r && (r.message || r.stack)) || String(r);
    append(`UnhandledRejection: ${msg}`, "error");
  });

  // Raccourci clavier Alt+D
  window.addEventListener("keydown", (ev) => {
    if (ev.altKey && (ev.key === "d" || ev.key === "D")) {
      toggleDebugOverlay();
    }
  });
}

export function enableDebugOverlay({ captureConsole = true } = {}) {
  _enabled = true;
  const el = getPane();
  el.style.display = "block";
  el.classList.add("show");
  if (captureConsole) wrapConsole();
  append("✅ Debug overlay ON");
}

export function disableDebugOverlay() {
  _enabled = false;
  const el = getPane();
  el.classList.remove("show");
  el.style.display = "none";
  unwrapConsole();
  append("⛔ Debug overlay OFF");
}

export function toggleDebugOverlay() {
  if (_enabled) disableDebugOverlay(); else enableDebugOverlay();
}

export function isEnabled() { return _enabled; }

export function setPersist(flag) {
  try {
    if (flag) localStorage.setItem("sa:debug", "1");
    else localStorage.removeItem("sa:debug");
  } catch { /* noop */ }
}

// Auto-activation si demandé
export function autoEnableIfRequested() {
  try {
    const qs = new URLSearchParams(location.search);
    const byQuery = qs.get("debug") && qs.get("debug") !== "0";
    const byHash = location.hash.toLowerCase().includes("debug");
    const byLS = localStorage.getItem("sa:debug") === "1";
    if (byQuery || byHash || byLS) enableDebugOverlay();
  } catch { /* noop */ }
}

// Expose minimal global pour tests manuels
// window.saDebug.enable(), .disable(), .toggle(), .persist(true)
if (!window.saDebug) {
  window.saDebug = {
    enable: enableDebugOverlay,
    disable: disableDebugOverlay,
    toggle: toggleDebugOverlay,
    persist: setPersist,
    log: logDebug,
    isEnabled
  };
}
