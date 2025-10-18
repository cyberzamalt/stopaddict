// web/js/calendar.js
// -----------------------------------------------------------------------------
// Calendrier mensuel + modale "jour":
//  - Grille #cal-grid, titre #cal-titre, flèches #cal-prev/#cal-next
//  - Points de données (cigs/joints/alcool) et marquage "has-data"/"today"
//  - Lecture/écriture de l'historique (best-effort) + boutons +/- du jour
//  - Segments rapides #cal-jour-seg-cl / #cal-jour-seg-a (petits raccourcis)
//  - Affiche les "Dates Clés" (réduction/stop/objectifs) depuis les inputs,
//    persistées dans localStorage ("app_keydates_v23").
// -----------------------------------------------------------------------------

const LS_KEY_HISTORY = "app_history_v23";
const LS_KEY_DATES   = "app_keydates_v23";

// --- état local ---
let currentMonth = new Date(); // mois affiché
let openedDayTS = null;        // timestamp minuit du jour affiché dans la modale

// --- utils temps ---
function startOfLocalDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function startOfMonth(d){ const x=startOfLocalDay(d); x.setDate(1); return x; }
function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
function sameDay(tsA, tsB){ return tsA === tsB; }

// --- accès historique (best-effort) ---
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
  return pickFirstLocalStorageKey([LS_KEY_HISTORY,"history","sa_history_v2"]) || [];
}
function setHistory(arr) {
  // si une state globale existe, on la met à jour, sinon storage
  if (window?.SA?.state) window.SA.state.history = Array.isArray(arr) ? arr : [];
  try { localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(arr)); } catch {}
  window.dispatchEvent(new Event("sa:history:changed"));
}

// --- accès dates clés ---
function loadKeyDates() {
  // 1/ si des inputs existent, on lit leurs valeurs
  const ids = [
    "date-reduc-clopes","date-stop-clopes","date-no-clopes",
    "date-reduc-joints","date-stop-joints","date-no-joints",
    "date-reduc-alcool","date-stop-alcool","date-no-alcool"
  ];
  const fromInputs = {};
  let foundAny = false;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const v = (el.value || "").trim();
    if (v) { fromInputs[id] = v; foundAny = true; }
    el.addEventListener("change", ()=>{
      saveKeyDates(readInputsToObj());
      renderCalendar(); // rafraîchit marquages
    });
  }
  if (foundAny) {
    // on merged avec LS (inputs ont priorité)
    const older = loadKeyDatesFromLS();
    const merged = { ...older, ...fromInputs };
    saveKeyDatesToLS(merged);
    return merged;
  }
  // 2/ sinon, depuis LS
  return loadKeyDatesFromLS();
}
function readInputsToObj() {
  const ids = [
    "date-reduc-clopes","date-stop-clopes","date-no-clopes",
    "date-reduc-joints","date-stop-joints","date-no-joints",
    "date-reduc-alcool","date-stop-alcool","date-no-alcool"
  ];
  const out = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    const v = (el.value || "").trim();
    if (v) out[id] = v;
  }
  return out;
}
function loadKeyDatesFromLS() {
  try {
    const v = JSON.parse(localStorage.getItem(LS_KEY_DATES) || "null");
    if (v && typeof v === "object") return v;
  } catch {}
  return {};
}
function saveKeyDates(obj) {
  const cur = loadKeyDatesFromLS();
  const merged = { ...cur, ...obj };
  saveKeyDatesToLS(merged);
}
function saveKeyDatesToLS(obj) {
  try { localStorage.setItem(LS_KEY_DATES, JSON.stringify(obj)); } catch {}
}

// convertit "YYYY-MM-DD" en timestamp minuit local
function dateStrToTS(s) {
  const [y,m,d] = String(s).split("-").map(n=>Number(n));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m-1, d);
  dt.setHours(0,0,0,0);
  return dt.getTime();
}

// --- agrégation jour -> indicateurs pour la grille ---
function aggregateDay(tsMin) {
  const tsMax = tsMin + 86400000;
  const hist = getHistory();
  let c=0, w=0, a=0;
  for (const e of hist) {
    const t = Number(e?.ts||0); if (!t || t<tsMin || t>=tsMax) continue;
    const q = Number(e?.qty||1);
    if (e.type === "cigs") c += q;
    else if (e.type === "weed") w += q;
    else if (e.type === "alcohol") a += q;
  }
  return { c, w, a, any: (c||w||a) > 0 };
}

// --- rendu de la grille mois ---
function renderCalendar() {
  const grid = document.getElementById("cal-grid");
  const title = document.getElementById("cal-titre");
  if (!grid || !title) return;

  grid.innerHTML = "";
  const base = startOfMonth(currentMonth);
  const y = base.getFullYear(), m = base.getMonth();
  const dim = daysInMonth(y, m);
  title.textContent = base.toLocaleDateString(undefined, { month:"long", year:"numeric" });

  // dates clés chargées
  const kdates = loadKeyDates();
  const kmap = new Map(); // ts -> array of labels
  for (const [id, val] of Object.entries(kdates)) {
    const ts = dateStrToTS(val);
    if (!ts) continue;
    const label = id.replace("date-","").replaceAll("-"," ");
    if (!kmap.has(ts)) kmap.set(ts, []);
    kmap.get(ts).push(label);
  }

  // décalage premier jour (lundi=0)
  const first = new Date(y,m,1); const dW = (first.getDay()||7)-1;
  for (let i=0;i<dW;i++){
    const spacer = document.createElement("div");
    spacer.className = "cal-cell";
    spacer.style.visibility = "hidden";
    grid.appendChild(spacer);
  }

  const todayTS = startOfLocalDay(new Date()).getTime();

  for (let d=1; d<=dim; d++){
    const cell = document.createElement("div");
    cell.className = "cal-cell";
    const dt = new Date(y,m,d); dt.setHours(0,0,0,0);
    const ts = dt.getTime();

    // header (numéro)
    const n = document.createElement("div");
    n.className = "cal-num";
    n.textContent = String(d);
    cell.appendChild(n);

    // dots de data
    const agg = aggregateDay(ts);
    if (agg.any) cell.classList.add("has-data");
    if (agg.c) { const dot=document.createElement("span"); dot.className="dot c"; cell.appendChild(dot); }
    if (agg.w) { const dot=document.createElement("span"); dot.className="dot j"; cell.appendChild(dot); }
    if (agg.a) { const dot=document.createElement("span"); dot.className="dot a"; cell.appendChild(dot); }

    // marquage today
    if (sameDay(ts,todayTS)) cell.classList.add("today");

    // dates clés (petite étiquette)
    if (kmap.has(ts)) {
      const cap = document.createElement("div");
      cap.style.cssText = "font-size:10px; margin-top:4px; color:#0f766e; font-weight:800;";
      cap.textContent = kmap.get(ts).join(" · ");
      cell.appendChild(cap);
    }

    // click => modale jour
    cell.addEventListener("click", ()=> openDayModal(ts));

    grid.appendChild(cell);
  }
}

// --- ouverture de la modale d'un jour ---
function openDayModal(tsMin) {
  openedDayTS = tsMin;
  const modal = document.getElementById("cal-jour");
  if (!modal) return;

  // titre
  const h = document.getElementById("cal-jour-titre");
  if (h) h.textContent = new Date(tsMin).toLocaleDateString(undefined,{ weekday:"long", year:"numeric", month:"long", day:"numeric" });

  // valeurs et segments
  updateDayModalValues();
  buildQuickSegments();

  // boutons +/- (cigs)
  document.getElementById("cal-cl-plus")?.addEventListener("click", ()=>addEntry("cigs", +1));
  document.getElementById("cal-cl-moins")?.addEventListener("click", ()=>addEntry("cigs", -1));

  // boutons +/- (joints)
  document.getElementById("cal-j-plus")?.addEventListener("click", ()=>addEntry("weed", +1));
  document.getElementById("cal-j-moins")?.addEventListener("click", ()=>addEntry("weed", -1));

  // boutons +/- (alcool)
  document.getElementById("cal-a-plus")?.addEventListener("click", ()=>addEntry("alcohol", +1));
  document.getElementById("cal-a-moins")?.addEventListener("click", ()=>addEntry("alcohol", -1));

  // RAZ du jour
  document.getElementById("cal-jour-raz")?.addEventListener("click", ()=>resetDay());

  // fermer
  document.getElementById("cal-jour-fermer")?.addEventListener("click", ()=>closeDayModal());

  // afficher
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}

function closeDayModal() {
  const modal = document.getElementById("cal-jour");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
  openedDayTS = null;
}

// --- mise à jour des valeurs modale (lecture agrégée) ---
function updateDayModalValues() {
  if (openedDayTS == null) return;
  const { c, w, a } = aggregateDay(openedDayTS);
  const elC = document.getElementById("cal-jour-cl");
  const elJ = document.getElementById("cal-jour-j");
  const elA = document.getElementById("cal-jour-a");
  if (elC) elC.textContent = String(c);
  if (elJ) elJ.textContent = String(w);
  if (elA) elA.textContent = String(a);
}

// --- segments rapides (chips) ---
function buildQuickSegments() {
  const segC = document.getElementById("cal-jour-seg-cl");
  const segA = document.getElementById("cal-jour-seg-a");
  if (segC) {
    segC.innerHTML = "";
    for (const v of [1,2,5,10]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seg";
      b.textContent = `+${v}`;
      b.addEventListener("click", ()=>addEntry("cigs", +v));
      segC.appendChild(b);
    }
  }
  if (segA) {
    segA.innerHTML = "";
    for (const v of [1,2,3]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "seg";
      b.textContent = `+${v}`;
      b.addEventListener("click", ()=>addEntry("alcohol", +v));
      segA.appendChild(b);
    }
  }
}

// --- ajout / retrait d'entrée pour le jour ouvert ---
function addEntry(type, deltaQty) {
  if (openedDayTS == null || !deltaQty) return;
  const ts0 = openedDayTS;
  const ts1 = ts0 + 86400000;

  const hist = getHistory().slice();
  if (deltaQty > 0) {
    // on ajoute "deltaQty" entrées unitaires (simple et robuste)
    for (let i=0;i<deltaQty;i++){
      hist.push({ ts: ts0 + i*1000, type, qty: 1 });
    }
  } else {
    // on retire des entrées si dispo
    let need = Math.abs(deltaQty);
    for (let i=hist.length-1; i>=0 && need>0; i--) {
      const e = hist[i]; const t=Number(e?.ts||0);
      if (t>=ts0 && t<ts1 && e?.type===type) {
        hist.splice(i,1); need--;
      }
    }
  }
  setHistory(hist);
  updateDayModalValues();
  renderCalendar();
  // notifier le reste pour graphes & limites
  window.dispatchEvent(new Event("sa:data:changed"));
}

// --- RAZ du jour (supprime toutes les entrées de ce jour) ---
function resetDay() {
  if (openedDayTS == null) return;
  const ts0 = openedDayTS; const ts1 = ts0 + 86400000;
  const hist = getHistory().filter(e => {
    const t = Number(e?.ts||0);
    return !(t>=ts0 && t<ts1);
  });
  setHistory(hist);
  updateDayModalValues();
  renderCalendar();
  window.dispatchEvent(new Event("sa:data:changed"));
}

// --- navigation mois ---
function wireMonthNav() {
  document.getElementById("cal-prev")?.addEventListener("click", ()=>{
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth()-1);
    currentMonth = d;
    renderCalendar();
  });
  document.getElementById("cal-next")?.addEventListener("click", ()=>{
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth()+1);
    currentMonth = d;
    renderCalendar();
  });
}

// --- init public ---
export function initCalendar() {
  wireMonthNav();
  renderCalendar();

  // se rafraîchir si d'autres modules changent les données
  window.addEventListener("sa:history:changed", renderCalendar);
  window.addEventListener("sa:data:changed", renderCalendar);
  window.addEventListener("sa:settings:changed", renderCalendar);

  // expose quelques helpers
  try {
    window.SA = window.SA || {};
    window.SA.calendar = {
      goToday: ()=>{ currentMonth = new Date(); renderCalendar(); },
      open: (ts)=>openDayModal(ts)
    };
  } catch {}
}
