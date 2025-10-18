// web/js/limits.js
// -----------------------------------------------------------------------------
// Gestion des limites quotidiennes + mise en évidence quand on approche/dépasse.
// - Persistance dans localStorage ("app_limits_v23").
// - Lecture/écriture des inputs #limite-* de l'écran Habitudes.
// - Écoute l'historique du jour pour appliquer un style "avertissement" sur
//   les compteurs de l'écran principal (couleur orange/rouge).
// -----------------------------------------------------------------------------

const LS_KEY = "app_limits_v23";

// --- lecture / écriture limites ---
function loadLimits() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (v && typeof v === "object") return v;
  } catch {}
  // valeurs par défaut raisonnables
  return {
    cigs: 20,
    joints: 3,
    beer: 2,
    strong: 1,
    liquor: 1
  };
}
function saveLimits(lim) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(lim)); } catch {}
  // prévenir les autres modules (facultatif)
  window.dispatchEvent(new Event("sa:limits:changed"));
}

// --- accès best-effort à l'historique ---
function pickFirstLocalStorageKey(keys) {
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v) return JSON.parse(v);
    } catch {}
  }
  return null;
}
function getHistory() {
  if (window?.SA?.state?.history) return window.SA.state.history;
  return pickFirstLocalStorageKey(["app_history_v23","history","sa_history_v2"]) || [];
}

// --- util datation ---
function startOfLocalDayTS(t) {
  const d = new Date(typeof t === "number" ? t : Date.now());
  d.setHours(0,0,0,0);
  return d.getTime();
}

// --- total du jour par type (cigs/weed/alcohol) ---
function getTodayTotals() {
  const hist = getHistory();
  const d0 = startOfLocalDayTS(Date.now());
  const d1 = d0 + 24*3600*1000;
  let c=0, w=0, a=0;
  for (const e of hist) {
    const ts = Number(e?.ts||0);
    if (!ts || ts<d0 || ts>=d1) continue;
    const q = Number(e?.qty||1);
    if (e.type === "cigs") c += q;
    else if (e.type === "weed") w += q;
    else if (e.type === "alcohol") a += q;
  }
  return { cigs:c, weed:w, alcohol:a };
}

// --- applique les styles d'avertissement sur l'écran principal ---
function applyLimitStyles() {
  const lim = loadLimits();
  const tot = getTodayTotals();

  // helpers
  const colorFor = (val, limit) => {
    if (!limit || limit <= 0) return "";      // pas de limite => pas d'avertissement
    const ratio = val / limit;
    if (ratio >= 1) return "danger";          // rouge
    if (ratio >= 0.8) return "warn";          // orange (approche)
    return "";                                // normal
  };

  const styleByKey = {
    cigs:   { el: document.getElementById("val-clopes"),   limit: lim.cigs,   val: tot.cigs   },
    weed:   { el: document.getElementById("val-joints"),   limit: lim.joints, val: tot.weed   },
    alcohol:{ el: document.getElementById("val-alcool"),   limit: (lim.beer||0)+(lim.strong||0)+(lim.liquor||0), val: tot.alcohol }
  };

  for (const k of Object.keys(styleByKey)) {
    const { el, limit, val } = styleByKey[k];
    if (!el) continue;
    const lvl = colorFor(val, limit);
    // reset
    el.style.color = "var(--ink)";
    // appliquer
    if (lvl === "warn")   el.style.color = "var(--warn)";
    if (lvl === "danger") el.style.color = "var(--danger)";
  }
}

// --- synchronise inputs <-> stockage ---
function wireInputs() {
  const lim = loadLimits();
  const map = [
    ["limite-clopes","cigs"],
    ["limite-joints","joints"],
    ["limite-biere","beer"],
    ["limite-fort","strong"],
    ["limite-liqueur","liquor"],
  ];
  for (const [id,key] of map) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.value = Number(lim[key] ?? 0);
    input.addEventListener("change", () => {
      const v = Math.max(0, Number(input.value||0));
      lim[key] = v;
      saveLimits(lim);
      applyLimitStyles();
    });
  }
}

// --- init public ---
export function initLimits() {
  // charge valeurs dans les inputs
  wireInputs();
  // applique les styles au chargement
  applyLimitStyles();

  // Recalcule quand les données changent
  window.addEventListener("sa:history:changed", applyLimitStyles);
  window.addEventListener("sa:data:changed", applyLimitStyles);

  // expose un petit util de debug
  try {
    window.SA = window.SA || {};
    window.SA.limits = { get: loadLimits, set: (l)=>{ saveLimits({...loadLimits(), ...l}); applyLimitStyles(); } };
  } catch {}
}
