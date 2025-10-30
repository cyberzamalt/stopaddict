// web/js/export.js
// -----------------------------------------------------------------------------
// Import/Export (JSON & CSV) + export "vue actuelle" des stats.
// - Boutons attendus (déjà dans ton index) :
//     #btn-export-csv       -> export de tout l'historique en CSV
//     #btn-export-stats     -> export de la "vue actuelle" (CSV agrégé)
// - Ajoute un bouton d'import (menu Réglages -> "Importer")
// - Exporte aussi les limites, dates clés, et quelques réglages utiles.
// - Déclenche les events: "sa:history:changed" & "sa:data:changed" après import.
// - UTILISE calculateDayCost() de state.js pour cohérence
// -----------------------------------------------------------------------------

import { calculateDayCost, getSettings } from "./state.js";

const LS_KEYS = {
  HISTORY: "app_history_v23",
  LIMITS:  "app_limits_v23",
  DATES:   "app_keydates_v23",
  SETTINGS:"app_settings_v23",
  PRICES:  "app_prices_v23",     // si économie active ailleurs
  WARN:    "app_warn_v23"
};

// ---------- utils stockage partagé ----------
function getHistory() {
  console.log("[Export] Récupération historique...");
  try {
    if (window?.SA?.state?.history) {
      console.log("[Export] Historique depuis window.SA.state:", window.SA.state.history.length, "entrées");
      return window.SA.state.history;
    }
    const v = JSON.parse(localStorage.getItem(LS_KEYS.HISTORY) || "null");
    const result = Array.isArray(v) ? v : [];
    console.log("[Export] Historique depuis localStorage:", result.length, "entrées");
    return result;
  } catch (err) {
    console.error("[Export] Erreur getHistory:", err);
    return [];
  }
}

function setHistory(arr) {
  console.log("[Export] Sauvegarde historique:", arr.length, "entrées");
  try {
    if (window?.SA?.state) {
      window.SA.state.history = Array.isArray(arr) ? arr : [];
      console.log("[Export] Historique sauvegardé dans window.SA.state");
    }
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(arr));
    console.log("[Export] Historique sauvegardé dans localStorage");
    
    window.dispatchEvent(new Event("sa:history:changed"));
    window.dispatchEvent(new Event("sa:data:changed"));
    console.log("[Export] Événements émis");
  } catch (err) {
    console.error("[Export] Erreur setHistory:", err);
  }
}

function pick(key) {
  console.log("[Export] Récupération clé:", key);
  try {
    const result = JSON.parse(localStorage.getItem(key) || "null");
    console.log("[Export] Valeur récupérée pour", key, ":", result);
    return result;
  } catch (err) {
    console.error("[Export] Erreur pick", key, ":", err);
    return null;
  }
}

function put(key, val) {
  console.log("[Export] Sauvegarde clé:", key);
  try {
    localStorage.setItem(key, JSON.stringify(val));
    console.log("[Export] Valeur sauvegardée pour", key);
  } catch (err) {
    console.error("[Export] Erreur put", key, ":", err);
  }
}

// ---------- utils date ----------
function isoLocal(ts) {
  try {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch (err) {
    console.error("[Export] Erreur isoLocal:", err);
    return "";
  }
}

function startOfLocalDay(ts) {
  try {
    const d = new Date(typeof ts === "number" ? ts : Date.now());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  } catch (err) {
    console.error("[Export] Erreur startOfLocalDay:", err);
    return Date.now();
  }
}

// ---------- EXPORT JSON ----------
function exportAsJSON() {
  console.log("[Export] ========== Export JSON ==========");
  try {
    const payload = {
      meta: {
        app: "StopAddict",
        ver: "2.4.4",
        exported_at: new Date().toISOString()
      },
      data: {
        history: getHistory(),
        limits:  pick(LS_KEYS.LIMITS)   || {},
        keydates:pick(LS_KEYS.DATES)    || {},
        settings:pick(LS_KEYS.SETTINGS) || {},
        prices:  pick(LS_KEYS.PRICES)   || {}
      }
    };
    
    console.log("[Export] Payload créé:", payload);
    
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stopaddict_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    console.log("[Export] Fichier JSON téléchargé");
    showSnack("Export JSON réalisé.");
  } catch (err) {
    console.error("[Export] ========== ERREUR EXPORT JSON ==========", err);
    showSnack("Erreur lors de l'export JSON.");
  }
}

// ---------- EXPORT CSV (historique brut) ----------
function exportHistoryAsCSV() {
  console.log("[Export] ========== Export CSV historique ==========");
  try {
    const hist = getHistory().slice().sort((a, b) => a.ts - b.ts);
    console.log("[Export] Historique trié:", hist.length, "entrées");
    
    const head = ["date_local", "timestamp", "type", "qty", "cost_eur"];
    const rows = [head.join(",")];
    
    for (const e of hist) {
      try {
        // Calculer le coût pour cette entrée
        const day = {
          cigs: e.type === "cigs" ? (Number(e.qty) || 1) : 0,
          weed: e.type === "weed" ? (Number(e.qty) || 1) : 0,
          beer: e.type === "alcohol" ? (Number(e.qty) || 1) : 0,
          strong: 0,
          liquor: 0
        };
        const cost = calculateDayCost(day);
        
        const line = [
          `"${isoLocal(e.ts || 0)}"`,
          `${Number(e.ts || 0)}`,
          `${e.type || ""}`,
          `${Number(e.qty || 1)}`,
          `${cost.toFixed(2)}`
        ].join(",");
        rows.push(line);
      } catch (err) {
        console.error("[Export] Erreur traitement entrée:", e, err);
      }
    }
    
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stopaddict_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    console.log("[Export] Fichier CSV historique téléchargé,", rows.length - 1, "lignes");
    showSnack("Export CSV (historique) réalisé.");
  } catch (err) {
    console.error("[Export] ========== ERREUR EXPORT CSV HISTORIQUE ==========", err);
    showSnack("Erreur lors de l'export CSV.");
  }
}

// ---------- EXPORT "VUE ACTUELLE" (CSV agrégé) ----------
function exportCurrentViewCSV() {
  console.log("[Export] ========== Export CSV vue actuelle ==========");
  try {
    // On lit le range depuis les boutons #chartRange
    const activeBtn = document.querySelector("#chartRange .btn.pill.active");
    const range = activeBtn?.dataset?.range || "day"; // day|week|month
    console.log("[Export] Range sélectionné:", range);

    // filtre l'historique selon range (relative à aujourd'hui)
    const now = Date.now();
    const day0 = startOfLocalDay(now);
    let t0 = day0, t1 = day0 + 86400000;

    if (range === "week") {
      const d = new Date(now);
      const day = (d.getDay() || 7) - 1; // Lundi=0
      const monday = new Date(d); 
      monday.setDate(d.getDate() - day); 
      monday.setHours(0, 0, 0, 0);
      t0 = monday.getTime(); 
      t1 = t0 + 7 * 86400000;
    } else if (range === "month") {
      const d = new Date(now);
      const first = new Date(d.getFullYear(), d.getMonth(), 1); 
      first.setHours(0, 0, 0, 0);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1); 
      next.setHours(0, 0, 0, 0);
      t0 = first.getTime(); 
      t1 = next.getTime();
    }

    console.log("[Export] Période:", new Date(t0), "->", new Date(t1));

    const hist = getHistory().filter(e => {
      const t = Number(e?.ts || 0);
      return t >= t0 && t < t1;
    });
    console.log("[Export] Historique filtré:", hist.length, "entrées");

    // agrégation selon range : day -> par heure ; week/month -> par jour
    const map = new Map(); // key -> {cigs, weed, beer, strong, liquor}
    const add = (key, type, qty) => {
      const cur = map.get(key) || { cigs: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
      if (type === "alcohol") {
        cur.beer = (cur.beer || 0) + qty;
      } else {
        cur[type] = (cur[type] || 0) + qty;
      }
      map.set(key, cur);
    };

    if (range === "day") {
      for (const e of hist) {
        try {
          const d = new Date(e.ts);
          const key = `${d.getHours()}:00`; // heure locale
          add(key, e.type, Number(e.qty || 1));
        } catch (err) {
          console.error("[Export] Erreur traitement entrée jour:", e, err);
        }
      }
    } else {
      for (const e of hist) {
        try {
          const d = new Date(startOfLocalDay(e.ts));
          const key = d.toLocaleDateString();
          add(key, e.type, Number(e.qty || 1));
        } catch (err) {
          console.error("[Export] Erreur traitement entrée:", e, err);
        }
      }
    }

    console.log("[Export] Agrégation terminée:", map.size, "buckets");

    const head = ["bucket", "cigs", "weed", "beer", "strong", "liquor", "cost_eur"];
    const rows = [head.join(",")];
    
    // tri logique
    const keys = Array.from(map.keys());
    if (range === "day") {
      keys.sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]));
    } else {
      // reconstitue dates
      keys.sort((a, b) => new Date(a) - new Date(b));
    }
    
    for (const k of keys) {
      try {
        const v = map.get(k);
        const cost = calculateDayCost(v);
        rows.push([
          `"${k}"`, 
          v.cigs || 0, 
          v.weed || 0, 
          v.beer || 0, 
          v.strong || 0, 
          v.liquor || 0,
          cost.toFixed(2)
        ].join(","));
      } catch (err) {
        console.error("[Export] Erreur traitement bucket:", k, err);
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stopaddict_view_${range}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    
    console.log("[Export] Fichier CSV vue téléchargé,", rows.length - 1, "lignes");
    showSnack("Export CSV (vue actuelle) réalisé.");
  } catch (err) {
    console.error("[Export] ========== ERREUR EXPORT CSV VUE ==========", err);
    showSnack("Erreur lors de l'export CSV.");
  }
}

// ---------- IMPORT (.json ou .csv) ----------
function attachHiddenFileInput() {
  console.log("[Export] Création input fichier caché...");
  try {
    let input = document.getElementById("sa-hidden-import");
    if (!input) {
      input = document.createElement("input");
      input.type = "file";
      input.id = "sa-hidden-import";
      input.accept = ".json,.csv,text/csv,application/json";
      input.style.display = "none";
      document.body.appendChild(input);
      console.log("[Export] Input créé");
    } else {
      console.log("[Export] Input déjà existant");
    }
    
    input.onchange = async () => {
      console.log("[Export] Fichier sélectionné");
      try {
        const file = input.files?.[0];
        if (!file) {
          console.warn("[Export] Aucun fichier sélectionné");
          return;
        }
        
        const name = (file.name || "").toLowerCase();
        console.log("[Export] Nom fichier:", name);
        
        if (name.endsWith(".json")) {
          await importJSON(file);
        } else if (name.endsWith(".csv")) {
          await importCSV(file);
        } else {
          console.warn("[Export] Format non reconnu:", name);
          showSnack("Format non reconnu. Utilise un .json ou .csv");
        }
      } catch (e) {
        console.error("[Export] Erreur import:", e);
        showSnack("Échec de l'import.");
      } finally {
        input.value = "";
        console.log("[Export] Input réinitialisé");
      }
    };
    
    return input;
  } catch (err) {
    console.error("[Export] Erreur attachHiddenFileInput:", err);
    return null;
  }
}

async function importJSON(file) {
  console.log("[Export] ========== Import JSON ==========");
  try {
    const text = await file.text();
    console.log("[Export] Fichier lu, taille:", text.length, "caractères");
    
    const obj = JSON.parse(text);
    console.log("[Export] JSON parsé:", obj);
    
    // formats acceptés: {data:{history,...}} ou directement {history:[...]}
    const data = obj?.data || obj || {};
    const hist = Array.isArray(data.history) ? data.history : [];
    console.log("[Export] Historique extrait:", hist.length, "entrées");
    
    if (hist.length) {
      setHistory(hist);
      console.log("[Export] Historique restauré");
    }

    // on restaure quelques stores optionnels
    if (data.limits) {
      put(LS_KEYS.LIMITS, data.limits);
      console.log("[Export] Limites restaurées");
    }
    if (data.keydates) {
      put(LS_KEYS.DATES, data.keydates);
      console.log("[Export] Dates clés restaurées");
    }
    if (data.settings) {
      put(LS_KEYS.SETTINGS, data.settings);
      console.log("[Export] Réglages restaurés");
    }
    if (data.prices) {
      put(LS_KEYS.PRICES, data.prices);
      console.log("[Export] Prix restaurés");
    }

    window.dispatchEvent(new Event("sa:settings:changed"));
    console.log("[Export] Événement sa:settings:changed émis");
    
    showSnack("Import JSON terminé.");
    console.log("[Export] ========== Import JSON terminé ==========");
  } catch (err) {
    console.error("[Export] ========== ERREUR IMPORT JSON ==========", err);
    showSnack("Erreur lors de l'import JSON.");
  }
}

async function importCSV(file) {
  console.log("[Export] ========== Import CSV ==========");
  try {
    const text = await file.text();
    console.log("[Export] Fichier lu, taille:", text.length, "caractères");
    
    const lines = text.split(/\r?\n/).filter(Boolean);
    console.log("[Export] Lignes:", lines.length);
    
    if (!lines.length) { 
      console.warn("[Export] CSV vide");
      showSnack("CSV vide."); 
      return; 
    }
    
    // attend l'entête: date_local,timestamp,type,qty
    const body = lines.slice(1);
    const out = [];
    
    for (const L of body) {
      try {
        const cols = L.split(",");
        if (cols.length < 4) {
          console.warn("[Export] Ligne invalide (< 4 colonnes):", L);
          continue;
        }
        
        const ts = Number(cols[1]);
        const type = (cols[2] || "").trim();
        const qty = Number(cols[3]) || 1;
        
        if (!ts || !type) {
          console.warn("[Export] Ligne invalide (ts ou type manquant):", L);
          continue;
        }
        
        out.push({ ts, type, qty });
      } catch (err) {
        console.error("[Export] Erreur traitement ligne:", L, err);
      }
    }
    
    console.log("[Export] Entrées valides:", out.length);
    
    if (!out.length) { 
      console.warn("[Export] Aucune entrée valide");
      showSnack("Aucune entrée valide détectée."); 
      return; 
    }
    
    // fusion simple: on remplace l'historique actuel par celui importé (choix clair)
    setHistory(out.sort((a, b) => a.ts - b.ts));
    console.log("[Export] Historique remplacé et trié");
    
    showSnack("Import CSV terminé.");
    console.log("[Export] ========== Import CSV terminé ==========");
  } catch (err) {
    console.error("[Export] ========== ERREUR IMPORT CSV ==========", err);
    showSnack("Erreur lors de l'import CSV.");
  }
}

// ---------- snackbar ----------
function showSnack(msg) {
  console.log("[Export] Snackbar:", msg);
  try {
    const bar = document.getElementById("snackbar");
    if (!bar) { 
      console.warn("[Export] Snackbar non trouvée");
      alert(msg); 
      return; 
    }
    bar.firstChild && (bar.firstChild.textContent = msg + " — ");
    bar.classList.add("show");
    setTimeout(() => bar.classList.remove("show"), 2500);
  } catch (err) {
    console.error("[Export] Erreur snackbar:", err);
    alert(msg);
  }
}

// ---------- wiring boutons existants ----------
function wireExportButtons() {
  console.log("[Export] Configuration boutons export...");
  try {
    const btnCSV = document.getElementById("btn-export-csv");
    if (btnCSV) {
      btnCSV.addEventListener("click", exportHistoryAsCSV);
      console.log("[Export] Bouton export CSV configuré");
    } else {
      console.warn("[Export] Bouton #btn-export-csv non trouvé");
    }
    
    const btnStats = document.getElementById("btn-export-stats");
    if (btnStats) {
      btnStats.addEventListener("click", exportCurrentViewCSV);
      console.log("[Export] Bouton export stats configuré");
    } else {
      console.warn("[Export] Bouton #btn-export-stats non trouvé");
    }
  } catch (err) {
    console.error("[Export] Erreur wireExportButtons:", err);
  }
}

// ---------- entrée publique ----------
export function initImportExport() {
  console.log("[Export] ========== Initialisation module Export/Import ==========");
  try {
    wireExportButtons();
    attachHiddenFileInput();

    // Expose (menu Réglages s'en sert)
    window.SA = window.SA || {};
    window.SA.exporting = {
      exportJSON: exportAsJSON,
      exportCSV: exportHistoryAsCSV,
      exportView: exportCurrentViewCSV,
      triggerImport: () => {
        console.log("[Export] Déclenchement import...");
        document.getElementById("sa-hidden-import")?.click();
      }
    };
    
    console.log("[Export] API window.SA.exporting exposée");
    console.log("[Export] ========== Initialisation terminée ==========");
  } catch (err) {
    console.error("[Export] ========== ERREUR INITIALISATION ==========", err);
  }
}
