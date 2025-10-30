// web/js/export.js
// STOPADDICT — Export / Import
// 3 actions cibles :
//   1) Exporter TOUT (JSON complet)  → #btn-export-json  (fallback: #btn-export-stats)
//   2) Importer TOUT (JSON)          → #btn-import       (utilise #file-import si présent, sinon input éphémère)
//   3) Exporter CSV (historique/jours, filtré par modules actifs) → #btn-export-csv
//
// Remarques :
// - Le CSV contient : Date ; Cigarettes ; Joints ; Bière ; Alcool_Fort ; Liqueur ; Cout_Total_EUR ; Economies_EUR
// - “OFF = exclu partout” : les catégories désactivées sont exportées à 0 et non comptées dans coût/économies.
// - L’export JSON peut embarquer des images des graphiques si une case est cochée (#chk-export-images ou #chk-export-charts).

import {
  load,
  getSettings,
  calculateDayCost,
  getEconomy,
} from "./state.js";

const $ = (sel, root = document) => root.querySelector(sel);

// ---------- Utils téléchargement ----------
function downloadBlob(filename, mime, data) {
  try {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  } catch (e) {
    console.error("[export] downloadBlob failed:", e);
    alert("Téléchargement impossible dans cet environnement.");
  }
}

function todayStamp() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}

// ---------- CSV (historique par jour) ----------
function buildCSVFromHistory() {
  const st = load();
  const settings = getSettings();
  const sep = ";"; // séparateur CSV adapté aux locales FR

  const header = [
    "Date",
    "Cigarettes",
    "Joints",
    "Biere",
    "Alcool_Fort",
    "Liqueur",
    "Cout_Total_EUR",
    "Economies_EUR",
  ].join(sep);

  const keys = Object.keys(st.history || {}).sort(); // YYYY-MM-DD asc
  const lines = [header];

  for (const key of keys) {
    const rec = st.history[key] || { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };

    // OFF = exclu → on met 0 pour la catégorie (ne sort pas dans le coût)
    const vals = {
      cigs:   settings.enable_cigs                     ? (+rec.cigs   || 0) : 0,
      weed:   settings.enable_weed                     ? (+rec.weed   || 0) : 0,
      beer:   (settings.enable_alcohol && settings.enable_beer)   ? (+rec.beer   || 0) : 0,
      strong: (settings.enable_alcohol && settings.enable_strong) ? (+rec.strong || 0) : 0,
      liquor: (settings.enable_alcohol && settings.enable_liquor) ? (+rec.liquor || 0) : 0,
    };

    // Calculs (respectent déjà OFF = exclu)
    const dayCost = calculateDayCost(rec, settings);
    const dayEco  = getEconomy(rec, settings);

    const row = [
      key,
      vals.cigs,
      vals.weed,
      vals.beer,
      vals.strong,
      vals.liquor,
      dayCost.toFixed(2),
      dayEco.toFixed(2),
    ].join(sep);

    lines.push(row);
  }

  return lines.join("\n");
}

function doExportCSV() {
  const csv = buildCSVFromHistory();
  const name = `stopaddict_history_${todayStamp()}.csv`;
  downloadBlob(name, "text/csv;charset=utf-8", csv);
}

// ---------- JSON (snapshot complet) ----------
function canvasToDataURLIfAny(selCandidates = []) {
  for (const sel of selCandidates) {
    const c = $(sel);
    if (c && c.toDataURL) {
      try { return c.toDataURL("image/png"); } catch { /* ignore */ }
    }
  }
  return null;
}

function shouldIncludeCharts() {
  const chk1 = $("#chk-export-images");
  const chk2 = $("#chk-export-charts");
  return (!!chk1 && chk1.checked) || (!!chk2 && chk2.checked);
}

function buildJSONSnapshot() {
  const st = load();
  const includeCharts = shouldIncludeCharts();

  const payload = {
    exported_at: new Date().toISOString(),
    schema_version: st?.schema_version ?? 1,
    app: {
      name: "StopAddict",
      source: "web",
    },
    state: st, // settings, view, ui, history
  };

  if (includeCharts) {
    payload.chart_images = {
      consos: canvasToDataURLIfAny(["#chart-consos", "#chart1"]),
      cost:   canvasToDataURLIfAny(["#chart-cost",   "#chart2"]),
    };
  }

  return JSON.stringify(payload, null, 2);
}

function doExportJSON() {
  const json = buildJSONSnapshot();
  const name = `stopaddict_full_${todayStamp()}.json`;
  downloadBlob(name, "application/json;charset=utf-8", json);
}

// ---------- IMPORT (JSON complet) ----------
function pickFileAnd(fn) {
  const existing = $("#file-import");
  if (existing) {
    existing.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) fn(file);
      // reset pour pouvoir ré-importer le même fichier plus tard
      e.target.value = "";
    };
    existing.click();
    return;
  }

  // Input éphémère si #file-import absent
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.style.display = "none";
  input.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) fn(file);
    document.body.removeChild(input);
  });
  document.body.appendChild(input);
  input.click();
}

function validateImportedState(obj) {
  // Tolérant : on accepte {state:{...}} ou directement le state
  const st = obj?.state && typeof obj.state === "object" ? obj.state : obj;

  if (!st || typeof st !== "object") return { ok: false, reason: "Structure inconnue (pas d'objet state)." };
  if (!("history" in st))           return { ok: false, reason: "State incomplet (history manquant)." };
  if (!("settings" in st))          return { ok: false, reason: "State incomplet (settings manquant)." };

  // Normalisations minimales
  st.schema_version ??= 1;
  st.view ??= { range: "day" };
  st.ui ??= { activeSegments: { cigs: true, weed: true, beer: true, strong: true, liquor: true } };
  st.settings.prices ??= { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
  st.settings.baselines ??= { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };

  return { ok: true, state: st };
}

function doImportJSON() {
  pickFileAnd((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || "");
        const obj = JSON.parse(txt);
        const { ok, state, reason } = validateImportedState(obj);
        if (!ok) {
          alert("Import impossible : " + (reason || "format invalide"));
          return;
        }

        // Remplacer l'état persistant puis rafraîchir
        try {
          localStorage.setItem("stopaddict_state_v1", JSON.stringify(state));
        } catch (e) {
          console.error("[import] write localStorage failed:", e);
          alert("Écriture impossible (stockage local indisponible).");
          return;
        }

        // On rafraîchit la page pour repartir proprement
        location.reload();

      } catch (e) {
        console.error("[import] parse failed:", e);
        alert("Fichier JSON invalide.");
      }
    };
    reader.onerror = () => {
      console.error("[import] read failed");
      alert("Lecture du fichier impossible.");
    };
    reader.readAsText(file, "utf-8");
  });
}

// ---------- Bind UI ----------
export function initExport() {
  // Export CSV
  const btnCSV = $("#btn-export-csv");
  if (btnCSV) {
    btnCSV.addEventListener("click", (e) => {
      e.preventDefault();
      doExportCSV();
    });
  }

  // Export JSON (nom historique #btn-export-stats accepté en fallback)
  const btnJSON = $("#btn-export-json") || $("#btn-export-stats");
  if (btnJSON) {
    btnJSON.addEventListener("click", (e) => {
      e.preventDefault();
      doExportJSON();
    });
  }

  // Import JSON
  const btnImport = $("#btn-import");
  if (btnImport) {
    btnImport.addEventListener("click", (e) => {
      e.preventDefault();
      doImportJSON();
    });
  }
}

export default { initExport };
