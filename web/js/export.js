// web/js/export.js
import { state, save } from "./state.js";
import { startOfDay } from "./utils.js";

const DAY_MS = 86400000;
const ALLOWED = new Set(["cig","weed","beer","strong","liquor"]);

const ui = {
  btnImport:  document.getElementById("btnImport"),
  fileJson:   document.getElementById("fileJson"),
  btnExport:  document.getElementById("btnExport"),      // CSV
  btnExportJson: document.getElementById("btnExportJson"), // JSON (nouveau)
  feedback:   document.getElementById("feedback"),
  preview:    document.getElementById("preview"),
};

function flash(msg, kind="info") {
  if (!ui.feedback) return;
  ui.feedback.className = "feedback " + kind;
  ui.feedback.textContent = msg;
  setTimeout(()=>{ ui.feedback.className = "feedback"; ui.feedback.textContent = ""; }, 3500);
}

/* -------------------- NORMALISATION IMPORT -------------------- */
function toISOorNull(v) {
  try {
    const d = new Date(v);
    if (isNaN(+d)) return null;
    return d.toISOString();
  } catch { return null; }
}

function normSettings(s0) {
  const s = s0 && typeof s0 === "object" ? s0 : {};
  const enable = s.enable || {};
  const price  = s.price  || {};
  const limits = (s.limits && s.limits.day) || {};

  return {
    enable: {
      cigs:    !!enable.cigs,
      weed:    !!enable.weed,
      alcohol: !!enable.alcohol,
    },
    price: {
      pricePerPack: Number.isFinite(+price.pricePerPack) ? +price.pricePerPack : 0,
      cigsPerPack:  Number.isFinite(+price.cigsPerPack)  ? +price.cigsPerPack  : 20,
      joint:        Number.isFinite(+price.joint)        ? +price.joint        : 0,
      beer:         Number.isFinite(+price.beer)         ? +price.beer         : 0,
      strong:       Number.isFinite(+price.strong)       ? +price.strong       : 0,
      liquor:       Number.isFinite(+price.liquor)       ? +price.liquor       : 0,
    },
    limits: {
      day: {
        cigs:    Number.isFinite(+limits.cigs)    ? +limits.cigs    : 0,
        weed:    Number.isFinite(+limits.weed)    ? +limits.weed    : 0,
        alcohol: Number.isFinite(+limits.alcohol) ? +limits.alcohol : 0,
      }
    }
  };
}

function normEntries(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const e of arr) {
    if (!e || typeof e !== "object") continue;
    const type = (e.type || "").trim();
    if (!ALLOWED.has(type)) continue;

    const qty = Math.max(1, Math.floor(+e.qty || 1));
    const iso = toISOorNull(e.ts);
    if (!iso) continue;

    out.push({ ts: iso, type, qty });
  }
  // tri croissant par date
  out.sort((a,b)=> +new Date(a.ts) - +new Date(b.ts));
  return out;
}

function validatePayload(json) {
  // Accepte soit {settings, entries}, soit juste {entries}, soit juste {settings}
  const res = { ok:false, reason:"", data:null };
  try {
    const settings = json.settings ? normSettings(json.settings) : null;
    const entries  = json.entries  ? normEntries(json.entries)   : null;

    if (!settings && !entries) {
      res.reason = "Aucune clé 'settings' ou 'entries' valide.";
      return res;
    }
    res.ok = true;
    res.data = { settings, entries };
    return res;
  } catch (e) {
    res.reason = "JSON invalide.";
    return res;
  }
}

/* -------------------- EXPORT -------------------- */
function costUnitOf(type, p) {
  if (type === "cig")   return (p.pricePerPack && p.cigsPerPack) ? (p.pricePerPack / p.cigsPerPack) : 0;
  if (type === "weed")  return p.joint || 0;
  if (type === "beer")  return p.beer  || 0;
  if (type === "strong")return p.strong|| 0;
  if (type === "liquor")return p.liquor|| 0;
  return 0;
}

function labelOf(type) {
  switch (type) {
    case "cig": return "Clopes";
    case "weed": return "Pétards";
    case "beer": return "Bière";
    case "strong": return "Alcool fort";
    case "liquor": return "Liqueur";
    default: return type;
  }
}

function exportCSV() {
  const p = state.settings.price;
  // pré-agrégat total/jour (tous types confondus activés OU sinon tous)
  const dayTotals = new Map(); // key=YYYY-MM-DD -> total qty
  for (const e of state.entries) {
    const d = new Date(e.ts);
    const ymd = d.toISOString().slice(0,10);
    dayTotals.set(ymd, (dayTotals.get(ymd) || 0) + (e.qty || 1));
  }

  const rows = [[
    "ts","date","heure","jour_semaine","semaine_iso","mois","annee",
    "type","type_label","qty","cout_eur","total_du_jour"
  ]];

  for (const e of state.entries) {
    const d = new Date(e.ts);
    const ymd = d.toISOString().slice(0,10);
    const hour = String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
    const wd = d.toLocaleDateString("fr-FR", { weekday:"short" });
    const month = d.getMonth()+1;
    const year = d.getFullYear();

    // semaine ISO
    const tmp = new Date(d);
    tmp.setHours(0,0,0,0);
    // jeudi de la semaine
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay()+6)%7));
    const week1 = new Date(tmp.getFullYear(),0,4);
    const week = 1 + Math.round(((tmp.getTime() - week1.getTime())/DAY_MS - 3 + ((week1.getDay()+6)%7))/7);

    const unit = costUnitOf(e.type, p);
    const cost = unit * (e.qty || 1);

    rows.push([
      e.ts, ymd, hour, wd, week, month, year,
      e.type, labelOf(e.type), (e.qty||1),
      cost.toFixed(2),
      dayTotals.get(ymd) || 0
    ]);
  }

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stopaddict_export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  flash("Export CSV prêt.", "ok");
}

function exportJSON() {
  const payload = {
    version: "sa-1",
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    entries:  state.entries
  };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], {type:"application/json;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stopaddict_backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
  flash("Export JSON prêt.", "ok");
}

/* -------------------- HANDLERS -------------------- */
export function initImportExport() {
  if (ui.btnImport && ui.fileJson) {
    ui.btnImport.onclick = () => ui.fileJson.click();
    ui.fileJson.onchange = async () => {
      const f = ui.fileJson.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        const json = JSON.parse(text);
        const res = validatePayload(json);
        if (!res.ok) {
          flash("Import invalide : " + res.reason, "error");
          return;
        }
        // Applique
        if (res.data.settings) {
          state.settings = { ...state.settings, ...res.data.settings };
        }
        if (res.data.entries) {
          state.entries = res.data.entries;
        }
        save(state);

        if (ui.preview) {
          ui.preview.hidden = false;
          ui.preview.textContent = JSON.stringify({imported:true, counts: state.entries.length}, null, 2);
        }

        document.dispatchEvent(new CustomEvent("sa:imported"));
        flash("Import réussi. Données enregistrées.", "ok");
      } catch {
        flash("Fichier JSON invalide.", "error");
      } finally {
        ui.fileJson.value = "";
      }
    };
  }

  if (ui.btnExport)      ui.btnExport.onclick = exportCSV;
  if (ui.btnExportJson)  ui.btnExportJson.onclick = exportJSON;
}
