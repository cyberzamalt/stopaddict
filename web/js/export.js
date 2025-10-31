// web/js/export.js
// STOPADDICT — Export / Import
// - CSV (toutes les journées, colonnes: date, cigs, weed, beer, strong, liquor, cost, economy)
// - JSON (état complet + méta)
// - Import JSON (remplace l’état, migration via state.js)
// - Optionnel: export des images de graphiques (PNG) si case cochée #export-include-charts
//
// Boutons (tolérant, si absents on ignore):
//   #btn-export-csv
//   #btn-export-json
//   #btn-import-json
//   #export-include-charts  (checkbox)
//
// Évènements émis :
//   'sa:state-changed' (propage via replaceState)

"use strict";

import {
  getState,
  replaceState,
  getSettings,
  calculateDayCost,
  getEconomy,
} from "./state.js";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// -------- Helpers téléchargement ---------------------------------------------

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function downloadText(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  downloadBlob(filename, blob);
}

function sortYmdAsc(a, b) {
  // 'YYYY-MM-DD' => compare lexicographiquement suffit
  return a < b ? -1 : (a > b ? 1 : 0);
}

// -------- CSV ----------------------------------------------------------------

function buildCSV(sep = ";") {
  const st = getState();
  const s  = getSettings();
  const header = [
    "date",
    "cigs",
    "weed",
    "beer",
    "strong",
    "liquor",
    "cost",
    "economy",
  ].join(sep);

  const rows = [header];

  const keys = Object.keys(st.days || {}).sort(sortYmdAsc);
  for (const k of keys) {
    const rec = st.days[k] || {};
    const line = [
      k,
      (rec.cigs   ?? 0),
      (rec.weed   ?? 0),
      (rec.beer   ?? 0),
      (rec.strong ?? 0),
      (rec.liquor ?? 0),
      // Coût/Éco calculés selon catégories actives & prix courants
      (calculateDayCost(rec, s)).toFixed(2),
      (getEconomy(rec, s)).toFixed(2),
    ].join(sep);
    rows.push(line);
  }

  // Petite note finale (commentaire compatible CSV)
  const symbol = (window.SA_CURRENCY?.get()?.symbol) || "€";
  rows.push(`# currency: ${symbol}`);
  rows.push(`# generated: ${new Date().toISOString()}`);

  return rows.join("\n");
}

function exportCSV() {
  const csv = buildCSV(";");
  downloadText(`stopaddict_export_${dateStamp()}.csv`, csv, "text/csv;charset=utf-8");
}

// -------- JSON ---------------------------------------------------------------

function buildJSON() {
  const st = getState();
  const cur = (window.SA_CURRENCY?.get?.() || { symbol: "€", position: "after" });

  const payload = {
    meta: {
      app: "StopAddict",
      version: st.version || 3,
      exported_at: new Date().toISOString(),
      currency: cur,
      lang: (st.settings?.lang) || null,
    },
    state: st, // état complet (settings + days)
  };
  return JSON.stringify(payload, null, 2);
}

function exportJSON() {
  const json = buildJSON();
  downloadText(`stopaddict_full_${dateStamp()}.json`, json, "application/json;charset=utf-8");
}

// -------- Import JSON --------------------------------------------------------

function importJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const newState = data?.state || data; // tolérant : certains exports pourraient être "nus"
      if (!newState || typeof newState !== "object" || !newState.days) {
        alert("Fichier JSON invalide : état manquant.");
        return;
      }
      replaceState(newState);

      // Appliquer une devise suggérée si présente dans meta
      const cur = data?.meta?.currency;
      if (cur && (cur.symbol || cur.position) && window.SA_CURRENCY?.set) {
        try { window.SA_CURRENCY.set(cur); } catch {}
      }

      // Appliquer la langue si présente
      const lang = data?.meta?.lang || newState?.settings?.lang;
      if (lang && window.SA_I18N?.setLang) {
        try { await window.SA_I18N.setLang(lang); } catch {}
      }

      alert("Import JSON terminé.");
    } catch (e) {
      console.error("[export.importJSON] parse error:", e);
      alert("Erreur lors de la lecture du JSON.");
    }
  }, { once: true });
  input.click();
}

// -------- Graphiques (PNG) ---------------------------------------------------

function collectChartCanvases() {
  // Priorité: canvases marqués exportables
  let canv = $$("canvas[data-exportable-chart]");
  if (canv.length) return canv;
  // Fallback: tous les canvas sous la zone Stats
  const stats = $("#ecran-stats");
  if (stats) canv = $$("canvas", stats);
  // Dernier recours: tous les canvas du doc (risque d’attraper le canvas debug si présent)
  if (!canv.length) canv = $$("canvas");
  return canv;
}

function exportChartsPNGs() {
  const canvases = collectChartCanvases();
  if (!canvases.length) {
    alert("Aucun graphique à exporter pour le moment.");
    return;
  }
  const stamp = dateStamp();
  canvases.forEach((cv, i) => {
    try {
      const dataUrl = cv.toDataURL("image/png");
      // Convert DataURL -> Blob
      const bin = atob(dataUrl.split(",")[1] || "");
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let j = 0; j < len; j++) bytes[j] = bin.charCodeAt(j);
      const blob = new Blob([bytes], { type: "image/png" });
      downloadBlob(`stopaddict_chart_${stamp}_${String(i + 1).padStart(2,"0")}.png`, blob);
    } catch (e) {
      console.warn("[export.exportChartsPNGs] skip canvas", e);
    }
  });
}

// -------- Utils --------------------------------------------------------------

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function enableIfExists(btn) {
  if (!btn) return;
  btn.removeAttribute("disabled");
  btn.classList.remove("disabled");
}

// -------- Init ---------------------------------------------------------------

export function initExport() {
  // Brancher boutons si présents
  const btnCSV   = $("#btn-export-csv");
  const btnJSON  = $("#btn-export-json");
  const btnIMPT  = $("#btn-import-json");
  const includeC = $("#export-include-charts");

  enableIfExists(btnCSV);
  enableIfExists(btnJSON);
  enableIfExists(btnIMPT);

  if (btnCSV)  btnCSV.addEventListener("click", () => {
    exportCSV();
    // Exports complémentaires d’images si la case existe & cochée
    if (includeC && includeC.checked) exportChartsPNGs();
  });

  if (btnJSON) btnJSON.addEventListener("click", () => {
    exportJSON();
    if (includeC && includeC.checked) exportChartsPNGs();
  });

  if (btnIMPT) btnIMPT.addEventListener("click", importJSON);

  // Bonus: si on passe sur l’onglet stats, on active l’option "inclure images" par défaut si présente
  const statsNav = $("#nav-stats");
  if (statsNav && includeC) {
    statsNav.addEventListener("click", () => {
      // laisser l’utilisateur décider; pas d’auto-toggle agressif
      // includeC.checked = true;
    });
  }
}

export default { initExport };
