// web/js/habits.js
// Écran "Habitudes" : limites & baselines.
// Source de vérité = settings.js. Fallback safe si settings indispo.
// Exporte initHabits().

import { $, clamp } from "./utils.js";
import { on } from "./state.js";

let getSettings = null;
let applySettings = null;

// Import défensif (permet de ne rien casser si settings.js n'est pas encore branché)
(async () => {
  try {
    const mod = await import("./settings.js");
    getSettings = mod.getSettings || null;
    applySettings = mod.applySettings || mod.saveSettings || null;
  } catch {/* noop */}
})();

const LIMIT_IDS = [
  ["limite-clopes", "cigs"],
  ["limite-joints", "joints"],
  ["limite-biere", "beer"],
  ["limite-fort",  "strong"],
  ["limite-liqueur","liquor"],
];

const BASE_IDS = [
  ["hab-min-cl-class","baseline.cl_class.min"],
  ["hab-max-cl-class","baseline.cl_class.max"],
  ["hab-min-cl-roul", "baseline.cl_roul.min"],
  ["hab-max-cl-roul", "baseline.cl_roul.max"],
  ["hab-min-cl-tube", "baseline.cl_tube.min"],
  ["hab-max-cl-tube", "baseline.cl_tube.max"],
  ["hab-min-joint",   "baseline.joint.min"],
  ["hab-max-joint",   "baseline.joint.max"],
  ["hab-min-biere",   "baseline.biere.min"],
  ["hab-max-biere",   "baseline.biere.max"],
  ["hab-min-fort",    "baseline.fort.min"],
  ["hab-max-fort",    "baseline.fort.max"],
  ["hab-min-liqueur", "baseline.liqueur.min"],
  ["hab-max-liqueur", "baseline.liqueur.max"],
];

function get(obj, path, def = 0) {
  try {
    return path.split(".").reduce((o,k)=> (o && k in o ? o[k] : undefined), obj) ?? def;
  } catch { return def; }
}

function set(obj, path, val) {
  const keys = path.split(".");
  let cur = obj;
  for (let i=0;i<keys.length-1;i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length-1]] = val;
}

function readInt(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseInt(el.value, 10);
  if (isNaN(v) || v < 0) return fallback;
  return v;
}

function hydrateFormFromSettings(cfg) {
  // Limites
  const limits = (cfg && cfg.limits) || {};
  for (const [id, key] of LIMIT_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const val = clamp(parseInt(limits[key] ?? el.value ?? 0,10) || 0, 0, 9999);
    el.value = String(val);
  }

  // Baseline
  for (const [id, path] of BASE_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const val = clamp(parseInt(get(cfg || {}, path, el.value ?? 0), 10) || 0, 0, 9999);
    el.value = String(val);
  }
}

function collectFormPatch() {
  const patch = { limits: {}, baseline: {
    cl_class:{}, cl_roul:{}, cl_tube:{}, joint:{}, biere:{}, fort:{}, liqueur:{}
  }};

  // limites
  for (const [id, key] of LIMIT_IDS) {
    patch.limits[key] = clamp(readInt(id, 0), 0, 9999);
  }

  // baseline
  for (const [id, path] of BASE_IDS) {
    const v = clamp(readInt(id, 0), 0, 9999);
    set(patch, path, v);
  }

  return patch;
}

function saveToSettings() {
  try {
    if (typeof applySettings === "function") {
      const patch = collectFormPatch();
      applySettings(patch); // doit émettre un event côté settings.js
      window.dispatchEvent(new CustomEvent("sa:habits-updated", { detail: patch }));
      console.log("[habits] ✓ saved", patch);
    } else {
      console.warn("[habits] settings.js non branché : aucune persistance");
    }
  } catch (e) {
    console.warn("[habits.save] error:", e);
  }
}

export function initHabits() {
  try {
    const root = document.getElementById("ecran-habitudes");
    if (!root) return;

    // Hydrate initial
    if (typeof getSettings === "function") {
      const cfg = getSettings();
      hydrateFormFromSettings(cfg);
    }

    // Bouton 'Enregistrer'
    const btn = $("#btn-save-hab");
    if (btn && !btn.__hab_wired) {
      btn.__hab_wired = true;
      btn.addEventListener("click", () => saveToSettings());
    }

    // Re-hydrate si les settings changent ailleurs (prix, devises, etc.)
    on && on("sa:settings-changed", () => {
      if (typeof getSettings === "function") {
        hydrateFormFromSettings(getSettings());
      }
    });

    console.log("[habits] ✓ ready");
  } catch (e) {
    console.warn("[habits.init] error:", e);
  }
}
