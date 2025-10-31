// web/js/debug.js
// STOPADDICT — Console debug intégrée (toggle + capture console.*)
// - Capture console.log/info/warn/error/debug et les affiche dans #debug-console
// - Toggle :
//     * Bouton avec id="toggle-debug" (si présent) OU
//     * Raccourci clavier: Ctrl+Shift+D
// - Persistance de l’état d’ouverture (localStorage)
// - API: window.SA_DEBUG.show()/hide()/clear()/log()

const STORE_KEY = "stopaddict_debug_open";
const MAX_LINES = 500;

let original = {};
let buffer = [];
let opened = false;
let consoleBox = null;
let listEl = null;
let inited = false;

function nowTime() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function safeToString(arg) {
  try {
    if (arg == null) return String(arg);
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return (arg.stack || arg.message || String(arg));
    if (typeof arg === "object") return JSON.stringify(arg, null, 2);
    return String(arg);
  } catch {
    try { return String(arg); } catch { return "[unprintable]"; }
  }
}

function injectMinimalStyle() {
  // Si le style existe déjà via index.html, on ne touche à rien
  if (document.getElementById("sa-debug-style")) return;
  const style = document.createElement("style");
  style.id = "sa-debug-style";
  style.textContent = `
    #debug-console { display:none; position:fixed; left:0; right:0; bottom:0; max-height:30vh; overflow:auto;
      background:#000; color:#0f0; font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; padding:.5rem; border-top:2px solid #222; z-index:50; }
    .sa-debug-head { display:flex; align-items:center; justify-content:space-between; gap:.5rem; margin-bottom:.35rem; }
    .sa-debug-head b { color:#8aa1ff; }
    .sa-debug-actions { display:flex; gap:.35rem; }
    .sa-debug-btn { background:#111; color:#9cf; border:1px solid #2a2a2a; border-radius:6px; padding:.15rem .4rem; cursor:pointer; }
    .sa-debug-line { white-space:pre-wrap; margin:0; }
    .sa-debug-info  { color:#9cdcfe; }
    .sa-debug-warn  { color:#ffd166; }
    .sa-debug-error { color:#ff6b6b; }
    .sa-debug-debug { color:#9cf; opacity:.9; }
    .sa-debug-time  { color:#7f7; margin-right:.35rem; }
  `;
  document.head.appendChild(style);
}

function ensureConsoleEl() {
  if (consoleBox && listEl) return;
  injectMinimalStyle();

  consoleBox = document.getElementById("debug-console");
  if (!consoleBox) {
    consoleBox = document.createElement("div");
    consoleBox.id = "debug-console";
    document.body.appendChild(consoleBox);
  }

  // En-tête (créé une seule fois)
  if (!consoleBox.querySelector(".sa-debug-head")) {
    const head = document.createElement("div");
    head.className = "sa-debug-head";
    head.innerHTML = `<b>Console StopAddict</b><div class="sa-debug-actions">
      <button class="sa-debug-btn" id="sa-debug-clear" type="button">Effacer</button>
      <button class="sa-debug-btn" id="sa-debug-hide" type="button">Fermer</button>
    </div>`;
    consoleBox.appendChild(head);

    const clearBtn = head.querySelector("#sa-debug-clear");
    const hideBtn  = head.querySelector("#sa-debug-hide");
    clearBtn.addEventListener("click", clear);
    hideBtn.addEventListener("click", hide);
  }

  // Liste
  listEl = consoleBox.querySelector("div.sa-debug-list");
  if (!listEl) {
    listEl = document.createElement("div");
    listEl.className = "sa-debug-list";
    consoleBox.appendChild(listEl);
  }
}

function renderLine(type, args) {
  ensureConsoleEl();
  const p = document.createElement("div");
  p.className = `sa-debug-line sa-debug-${type}`;
  const time = document.createElement("span");
  time.className = "sa-debug-time";
  time.textContent = `[${nowTime()}]`;
  p.appendChild(time);

  const msg = args.map(safeToString).join(" ");
  p.appendChild(document.createTextNode(msg));

  listEl.appendChild(p);
  // Cap buffer visuel
  while (listEl.childNodes.length > MAX_LINES) {
    listEl.removeChild(listEl.firstChild);
  }
  // Auto-scroll
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function storeOpenState(v) {
  opened = !!v;
  try { localStorage.setItem(STORE_KEY, opened ? "1" : "0"); } catch {}
}

function show() {
  ensureConsoleEl();
  consoleBox.style.display = "block";
  storeOpenState(true);
}

function hide() {
  if (!consoleBox) return;
  consoleBox.style.display = "none";
  storeOpenState(false);
}

function toggle() {
  if (!consoleBox || consoleBox.style.display === "none") show();
  else hide();
}

function clear() {
  if (listEl) listEl.innerHTML = "";
  buffer = [];
}

function hookConsole() {
  if (inited) return;
  inited = true;
  original.log   = console.log.bind(console);
  original.info  = console.info?.bind(console)  || original.log;
  original.warn  = console.warn?.bind(console)  || original.log;
  original.error = console.error?.bind(console) || original.log;
  original.debug = console.debug?.bind(console) || original.log;

  console.log = (...args) => {
    try { buffer.push(["info", args]); renderLine("info", args); } catch {}
    original.log(...args);
  };
  console.info = (...args) => {
    try { buffer.push(["info", args]); renderLine("info", args); } catch {}
    original.info(...args);
  };
  console.warn = (...args) => {
    try { buffer.push(["warn", args]); renderLine("warn", args); } catch {}
    original.warn(...args);
  };
  console.error = (...args) => {
    try { buffer.push(["error", args]); renderLine("error", args); } catch {}
    original.error(...args);
  };
  console.debug = (...args) => {
    try { buffer.push(["debug", args]); renderLine("debug", args); } catch {}
    original.debug(...args);
  };
}

function bindGlobalToggle() {
  // Bouton optionnel dans la page
  const btn = document.getElementById("toggle-debug");
  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); toggle(); });

  // Raccourci clavier
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
      e.preventDefault();
      toggle();
    }
  });
}

// ---------- API publique ----------
export function initDebug() {
  ensureConsoleEl();
  hookConsole();
  bindGlobalToggle();

  // Restaurer l’état
  let openPref = false;
  try { openPref = localStorage.getItem(STORE_KEY) === "1"; } catch {}
  if (openPref) show();

  // Exposer une API simple
  try {
    window.SA_DEBUG = {
      show, hide, toggle, clear,
      log: (...args) => { console.log("[SA]", ...args); },
    };
  } catch {}
}

export default { initDebug };
