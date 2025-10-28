// web/js/habits.js
// Écran Habitudes (limites, baseline, dates clés) avec persistance locale.
// - Par défaut : TOUT à 0 si rien de sauvegardé (écrase les valeurs HTML) — demandé.
// - Enregistrement sur clic "Enregistrer" + évènement 'sa:habits-updated'.

import { $, $$, loadJSON, saveJSON, parseYMD, formatYMD } from './utils.js';

const LS_KEY = 'sa:habits'; // { limits:{...}, baseline:{...}, dates:{...} }

function readHabits() {
  const h = loadJSON(LS_KEY, null);
  if (h) return h;
  // défaut demandé: 0 partout
  return {
    limits: { clopes:0, joints:0, biere:0, fort:0, liqueur:0 },
    baseline: {
      cl_class_min:0, cl_class_max:0,
      cl_roul_min:0,  cl_roul_max:0,
      cl_tube_min:0,  cl_tube_max:0,
      joint_min:0,    joint_max:0,
      biere_min:0,    biere_max:0,
      fort_min:0,     fort_max:0,
      liqueur_min:0,  liqueur_max:0,
    },
    dates: {
      reduc_clopes:null, stop_clopes:null, objectif0_clopes:null,
      reduc_joints:null, stop_joints:null, objectif0_joints:null,
      reduc_alcool:null, stop_alcool:null, objectif0_alcool:null
    }
  };
}

function writeHabits(h) {
  saveJSON(LS_KEY, h);
  try { window.dispatchEvent(new CustomEvent('sa:habits-updated', { detail: h })); } catch {}
}

function valNum(id, def=0) {
  const el = document.getElementById(id);
  if (!el) return def;
  const n = Number(el.value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : def;
}
function setNum(id, v=0) {
  const el = document.getElementById(id);
  if (el) el.value = String(v ?? 0);
}
function valDate(id) {
  const el = document.getElementById(id);
  if (!el || !el.value) return null;
  const d = parseYMD(el.value);
  return d ? formatYMD(d) : null;
}
function setDate(id, ymdOrNull) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = ymdOrNull ?? '';
}

function loadIntoForm() {
  const h = readHabits();
  // Limites
  setNum('limite-clopes', h.limits.clopes);
  setNum('limite-joints', h.limits.joints);
  setNum('limite-biere',  h.limits.biere);
  setNum('limite-fort',   h.limits.fort);
  setNum('limite-liqueur',h.limits.liqueur);

  // Baseline
  setNum('hab-min-cl-class', h.baseline.cl_class_min);
  setNum('hab-max-cl-class', h.baseline.cl_class_max);
  setNum('hab-min-cl-roul',  h.baseline.cl_roul_min);
  setNum('hab-max-cl-roul',  h.baseline.cl_roul_max);
  setNum('hab-min-cl-tube',  h.baseline.cl_tube_min);
  setNum('hab-max-cl-tube',  h.baseline.cl_tube_max);
  setNum('hab-min-joint',    h.baseline.joint_min);
  setNum('hab-max-joint',    h.baseline.joint_max);
  setNum('hab-min-biere',    h.baseline.biere_min);
  setNum('hab-max-biere',    h.baseline.biere_max);
  setNum('hab-min-fort',     h.baseline.fort_min);
  setNum('hab-max-fort',     h.baseline.fort_max);
  setNum('hab-min-liqueur',  h.baseline.liqueur_min);
  setNum('hab-max-liqueur',  h.baseline.liqueur_max);

  // Dates clés
  setDate('date-reduc-clopes', h.dates.reduc_clopes);
  setDate('date-stop-clopes',  h.dates.stop_clopes);
  setDate('date-no-clopes',    h.dates.objectif0_clopes);

  setDate('date-reduc-joints', h.dates.reduc_joints);
  setDate('date-stop-joints',  h.dates.stop_joints);
  setDate('date-no-joints',    h.dates.objectif0_joints);

  setDate('date-reduc-alcool', h.dates.reduc_alcool);
  setDate('date-stop-alcool',  h.dates.stop_alcool);
  setDate('date-no-alcool',    h.dates.objectif0_alcool);
}

function readFromFormAndSave() {
  const h = {
    limits: {
      clopes:  valNum('limite-clopes', 0),
      joints:  valNum('limite-joints', 0),
      biere:   valNum('limite-biere', 0),
      fort:    valNum('limite-fort', 0),
      liqueur: valNum('limite-liqueur', 0),
    },
    baseline: {
      cl_class_min: valNum('hab-min-cl-class', 0),
      cl_class_max: valNum('hab-max-cl-class', 0),
      cl_roul_min:  valNum('hab-min-cl-roul', 0),
      cl_roul_max:  valNum('hab-max-cl-roul', 0),
      cl_tube_min:  valNum('hab-min-cl-tube', 0),
      cl_tube_max:  valNum('hab-max-cl-tube', 0),
      joint_min:    valNum('hab-min-joint', 0),
      joint_max:    valNum('hab-max-joint', 0),
      biere_min:    valNum('hab-min-biere', 0),
      biere_max:    valNum('hab-max-biere', 0),
      fort_min:     valNum('hab-min-fort', 0),
      fort_max:     valNum('hab-max-fort', 0),
      liqueur_min:  valNum('hab-min-liqueur', 0),
      liqueur_max:  valNum('hab-max-liqueur', 0),
    },
    dates: {
      reduc_clopes:     valDate('date-reduc-clopes'),
      stop_clopes:      valDate('date-stop-clopes'),
      objectif0_clopes: valDate('date-no-clopes'),
      reduc_joints:     valDate('date-reduc-joints'),
      stop_joints:      valDate('date-stop-joints'),
      objectif0_joints: valDate('date-no-joints'),
      reduc_alcool:     valDate('date-reduc-alcool'),
      stop_alcool:      valDate('date-stop-alcool'),
      objectif0_alcool: valDate('date-no-alcool'),
    }
  };

  writeHabits(h);

  // Option: informer le Calendrier que des dates peuvent changer l’affichage
  try { window.dispatchEvent(new Event('sa:habits-saved')); } catch {}
}

function bindUI() {
  const btn = $('#btn-save-hab');
  if (btn) btn.addEventListener('click', readFromFormAndSave);
}

export function initHabits() {
  try {
    // par défaut tout à 0 si rien
    loadIntoForm();
    bindUI();
  } catch (e) {
    console.warn('[habits.init] ', e);
  }
}
