// web/js/export.js
// Export CSV/JSON de l'historique + export de la vue active (Stats)
// Boutons supportés dans l'index: 
//  - #btn-export-csv (historique complet)
//  - #btn-export-stats (vue actuelle Jour/Semaine/Mois)
//  - #btn-export-json / #btn-import-json + #input-import-json
//
// Dépend de: state.entries (array {ts,type,qty}), state.settings (prix/enable)
// Utilise: un rebuild local de la série courante (comme charts.js)

import { state } from "./state.js";
import { startOfDay } from "./utils.js";

// ---------- helpers prix / modules (mêmes règles que economy.js) ----------
function getEnable() {
  const en = (state.settings && state.settings.enable) || {};
  return { cigs:(en.cigs!==false), weed:(en.weed!==false), alcohol:(en.alcohol!==false) };
}
function getPrices() {
  const s = state.settings || {};
  const p = s.prices || s.price || {};
  return {
    cl_class:  +((p.cl_class  ?? s.prix_cl_class)  ?? 0),
    cl_roul:   +((p.cl_roul   ?? s.prix_cl_roul)   ?? 0),
    cl_tube:   +((p.cl_tube   ?? s.prix_cl_tube)   ?? 0),
    joint:     +((p.joint     ?? s.prix_joint)     ?? 0),
    biere:     +((p.biere     ?? s.prix_biere)     ?? 0),
    fort:      +((p.fort      ?? s.prix_fort)      ?? 0),
    liqueur:   +((p.liqueur   ?? s.prix_liqueur)   ?? 0),
  };
}
function priceForType(type) {
  const pr = getPrices();
  if (type==="cig" || type==="cig_class") return pr.cl_class;
  if (type==="cig_roul")                  return pr.cl_roul;
  if (type==="cig_tube")                  return pr.cl_tube;
  if (type==="weed" || type==="joint" || type==="joints") return pr.joint;
  if (type==="beer" || type==="alc_biere")                 return pr.biere;
  if (type==="strong" || type==="alc_fort")                return pr.fort;
  if (type==="liquor" || type==="alc_liqueur" || type==="alcohol") return pr.liqueur;
  return 0;
}
function moduleGuards(type) {
  const en = getEnable();
  if (type.startsWith("cig")) return en.cigs;
  if (type==="weed" || type==="joint" || type==="joints") return en.weed;
  if (type==="beer" || type==="strong" || type==="liquor" || type.startsWith("alc") || type==="alcohol") return en.alcohol;
  return true;
}

// ---------- export CSV historique complet ----------
function exportCSVFull() {
  const rows = [["Date","Clopes classiques","Clopes roulées","Clopes tubes","Joints","Bière","Alcool fort","Liqueur","Coût (€)"]];
  // Regrouper par jour
  const byDay = new Map();
  for (const e of (state.entries||[])) {
    const key = startOfDay(new Date(e.ts)).toISOString().slice(0,10);
    if (!byDay.has(key)) byDay.set(key, {cl_class:0, cl_roul:0, cl_tube:0, joints:0, alc_biere:0, alc_fort:0, alc_liqueur:0, cost:0});
    const d = byDay.get(key);
    const qty = +e.qty || 1;
    const t = e.type;
    // cumuls
    if (t==="cig" || t==="cig_class") d.cl_class += qty;
    else if (t==="cig_roul")          d.cl_roul  += qty;
    else if (t==="cig_tube")          d.cl_tube  += qty;
    else if (t==="weed"||t==="joint"||t==="joints") d.joints += qty;
    else if (t==="beer"||t==="alc_biere")           d.alc_biere += qty;
    else if (t==="strong"||t==="alc_fort")          d.alc_fort  += qty;
    else if (t==="liquor"||t==="alc_liqueur"||t==="alcohol") d.alc_liqueur += qty;
    // coût (applique garde module)
    if (moduleGuards(t)) d.cost += qty * priceForType(t);
  }
  // lignes
  const keys = Array.from(byDay.keys()).sort();
  for (const k of keys) {
    const d = byDay.get(k);
    rows.push([k, d.cl_class, d.cl_roul, d.cl_tube, d.joints, d.alc_biere, d.alc_fort, d.alc_liqueur, d.cost.toFixed(2)]);
  }
  // export
  const csv = "\uFEFF" + rows.map(r=> r.join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "stopaddict_export.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ---------- reconstruire la "vue active" (Jour/Semaine/Mois) pour export ----------
function activeRange() {
  const btn = document.querySelector("#chartRange .btn.pill.active");
  if (!btn) return "day";
  const t = (btn.dataset.range || btn.textContent || "").toLowerCase();
  if (t.startsWith("sem")) return "week";
  if (t.startsWith("mois")) return "month";
  return "day";
}

function seriesForExport(range) {
  const DAY = 86400000;
  const types = ["cl_class","cl_roul","cl_tube","joints","alc_biere","alc_fort","alc_liqueur"];
  const today0 = startOfDay(new Date());

  if (range==="day") {
    // 4 tranches 6h
    const labels = ["00–06","06–12","12–18","18–24"];
    const bins   = [0,0,0,0];
    let cost     = [0,0,0,0];
    const a0 = today0, a1 = new Date(+a0 + DAY);
    for (const e of (state.entries||[])) {
      const t = new Date(e.ts);
      if (t < a0 || t >= a1) continue;
      const i = (t.getHours()<6)?0:(t.getHours()<12)?1:(t.getHours()<18)?2:3;
      const q = +e.qty||1;
      // total unités
      bins[i] += q;
      // coût
      if (moduleGuards(e.type)) cost[i] += q * priceForType(e.type);
    }
    return {labels, units: bins, cost: cost.map(v=>+v.toFixed(2))};
  }

  if (range==="week") {
    const dow = (today0.getDay()||7)-1;
    const wA  = new Date(+today0 - dow*DAY);
    const wB  = new Date(+wA + 7*DAY);
    const labels = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
    const units  = [0,0,0,0,0,0,0];
    const cost   = [0,0,0,0,0,0,0];
    for (const e of (state.entries||[])) {
      const t = new Date(e.ts);
      if (t < wA || t >= wB) continue;
      const i = Math.floor((+t - +wA)/DAY);
      const q = +e.qty||1;
      units[i] += q;
      if (moduleGuards(e.type)) cost[i] += q * priceForType(e.type);
    }
    return {labels, units, cost: cost.map(v=>+v.toFixed(2))};
  }

  // month
  const now   = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last  = new Date(now.getFullYear(), now.getMonth()+1, 0);
  const len   = last.getDate();
  const labels = Array.from({length:len}, (_,i)=> String(i+1));
  const units  = Array.from({length:len}, ()=>0);
  const cost   = Array.from({length:len}, ()=>0);
  for (const e of (state.entries||[])) {
    const t = new Date(e.ts);
    if (t < first || t > last) continue;
    const i = t.getDate()-1;
    const q = +e.qty||1;
    units[i] += q;
    if (moduleGuards(e.type)) cost[i] += q * priceForType(e.type);
  }
  return {labels, units, cost: cost.map(v=>+v.toFixed(2))};
}

function exportCurrentView() {
  const r = activeRange();
  const s = seriesForExport(r);
  const rows = [["Label","Unités","Coût (€)"]];
  for (let i=0;i<s.labels.length;i++){
    rows.push([s.labels[i], s.units[i], s.cost[i]]);
  }
  const name = (r==="day"?"jour":(r==="week"?"semaine":"mois"));
  const csv = "\uFEFF" + rows.map(r=> r.join(";")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `stopaddict_export_${name}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ---------- export JSON & import JSON ----------
function exportJSON() {
  const dump = {
    version: "2.4.0",
    date: new Date().toISOString(),
    entries: state.entries || [],
    settings: state.settings || {}
  };
  const json = JSON.stringify(dump, null, 2);
  const blob = new Blob([json], {type:"application/json"});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "stopaddict_backup.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const dump = JSON.parse(ev.target.result);
      if (typeof state.setAll === "function") {
        state.setAll({
          entries:  dump.entries  || state.entries,
          settings: {...state.settings, ...(dump.settings||{})}
        });
      } else {
        // fallback: remplacement direct
        state.entries  = dump.entries  || state.entries;
        state.settings = {...state.settings, ...(dump.settings||{})};
      }
      // avertir l'app
      document.dispatchEvent(new Event("sa:imported"));
      alert("Import JSON réussi.");
    }catch(err){
      alert("Erreur import JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ---------- init listeners ----------
export function initImportExport() {
  document.getElementById("btn-export-csv")?.addEventListener("click", exportCSVFull);
  document.getElementById("btn-export-stats")?.addEventListener("click", exportCurrentView);
  document.getElementById("btn-export-json")?.addEventListener("click", exportJSON);
  document.getElementById("btn-import-json")?.addEventListener("click", ()=> {
    document.getElementById("input-import-json")?.click();
  });
  document.getElementById("input-import-json")?.addEventListener("change", (e)=>{
    const f = e.target.files && e.target.files[0];
    if (f) importJSON(f);
    e.target.value = ""; // reset
  });
}
