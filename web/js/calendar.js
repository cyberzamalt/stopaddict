// web/js/calendar.js
import { state, save } from "./state.js";
import { startOfDay } from "./utils.js";

const DAY_MS = 86400000;

function startOfMonth(d=new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d=new Date()) {
  return new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999);
}
function fmtYMD(d) {
  return d.toISOString().slice(0,10);
}

function getEnabledTypes() {
  const en = state.settings.enable || {};
  const types = [];
  if (en.cigs) types.push("cig");
  if (en.weed) types.push("weed");
  if (en.alcohol) types.push("beer","strong","liquor");
  return types.length ? types : ["cig","weed","beer","strong","liquor"];
}

function sumOnDate(types, date) {
  const a = startOfDay(date);
  const b = new Date(+a + DAY_MS - 1);
  let s = 0;
  for (const e of state.entries) {
    const t = new Date(e.ts);
    if (t >= a && t <= b && types.includes(e.type)) s += (e.qty || 1);
  }
  return s;
}

function addEntryAt(date, type, qty=1) {
  const iso = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(),
    12,0,0,0 // midi pour éviter les fuseaux qui “glissent”
  ).toISOString();
  state.entries.push({ ts: iso, type, qty });
  save(state);
  document.dispatchEvent(new CustomEvent("sa:changed"));
}

function removeOneAt(date, type) {
  const a = startOfDay(date);
  const b = new Date(+a + DAY_MS - 1);
  for (let i = state.entries.length - 1; i >= 0; i--) {
    const e = state.entries[i];
    const t = new Date(e.ts);
    if (e.type === type && t >= a && t <= b) {
      state.entries.splice(i,1);
      save(state);
      document.dispatchEvent(new CustomEvent("sa:changed"));
      break;
    }
  }
}

/* ---------- Rendu Calendrier ---------- */
const months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

export function initCalendar() {
  const title = document.getElementById("calTitle");
  const grid  = document.getElementById("calGrid");
  const prev  = document.getElementById("calPrev");
  const next  = document.getElementById("calNext");

  const editor = document.getElementById("calEditor");
  const editDateLabel = document.getElementById("calEditDate");
  const editButtons = document.getElementById("calEditButtons");
  const closeBtn = document.getElementById("calClose");

  let cursor = new Date(); // mois courant
  let selectedDate = null;

  function renderMonth() {
    // titre
    title.textContent = `${months[cursor.getMonth()]} ${cursor.getFullYear()}`;

    // calcul des cases : on commence lundi
    const first = startOfMonth(cursor);
    const firstDay = (first.getDay() || 7) - 1; // 0..6 (lundi=0)
    const start = new Date(first); start.setDate(first.getDate() - firstDay);

    grid.innerHTML = "";
    const todayYMD = fmtYMD(new Date());
    const types = getEnabledTypes();

    for (let i=0;i<42;i++) {
      const d = new Date(+start + i*DAY_MS);
      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (d.getMonth() !== cursor.getMonth()) cell.classList.add("out");
      if (fmtYMD(d) === todayYMD) cell.classList.add("today");

      const dayDiv = document.createElement("div");
      dayDiv.className = "d";
      dayDiv.textContent = String(d.getDate());
      cell.appendChild(dayDiv);

      const total = sumOnDate(types, d);
      const vDiv = document.createElement("div");
      vDiv.className = "v";
      vDiv.textContent = total ? String(total) : "0";
      cell.appendChild(vDiv);

      cell.addEventListener("click", ()=>{
        selectedDate = d;
        openEditor(d, types);
      });

      grid.appendChild(cell);
    }
  }

  function openEditor(d, types) {
    editDateLabel.textContent = d.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
    editButtons.innerHTML = "";
    const uniqueTypes = Array.from(new Set(types));

    uniqueTypes.forEach(type=>{
      const minus = document.createElement("button");
      minus.className = "btn minus";
      minus.textContent = `− ${labelOf(type)}`;
      minus.addEventListener("click", ()=>{
        removeOneAt(selectedDate, type);
        renderMonth(); // refresh
      });

      const plus = document.createElement("button");
      plus.className = "btn plus";
      plus.textContent = `+ ${labelOf(type)}`;
      plus.addEventListener("click", ()=>{
        addEntryAt(selectedDate, type, 1);
        renderMonth(); // refresh
      });

      editButtons.appendChild(minus);
      editButtons.appendChild(plus);
    });

    editor.classList.remove("hide");
  }

  function labelOf(type) {
    if (type === "cig") return "Clopes";
    if (type === "weed") return "Pétards";
    if (type === "beer") return "Bière";
    if (type === "strong") return "Alcool fort";
    if (type === "liquor") return "Liqueur";
    return type;
  }

  prev.addEventListener("click", ()=>{ cursor.setMonth(cursor.getMonth()-1); renderMonth(); });
  next.addEventListener("click", ()=>{ cursor.setMonth(cursor.getMonth()+1); renderMonth(); });
  closeBtn.addEventListener("click", ()=> editor.classList.add("hide"));

  // re-render si données changent (via import, +/- ailleurs, réglages…)
  document.addEventListener("sa:changed", renderMonth);
  document.addEventListener("sa:imported", renderMonth);
  document.addEventListener("sa:settingsSaved", renderMonth);

  renderMonth();
}
