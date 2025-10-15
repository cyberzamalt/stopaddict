/* ---------- stockage ---------- */
const KEY = "sa:data";
function load() {
  const def = {
    settings: {
      enable: { cigs: true, weed: false, alcohol: false },
      price: {
        pricePerPack: 10, cigsPerPack: 20,
        joint: 5, beer: 2.5, strong: 3, liquor: 4
      },
      limits: { day: { cigs: 0, weed: 0, alcohol: 0 } }
    },
    entries: [] // {ts: ISO, type:'cig'|'weed'|'beer'|'strong'|'liquor', qty:1}
  };
  try { return JSON.parse(localStorage.getItem(KEY)) ?? def; }
  catch { return def; }
}
function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

let state = load();

/* ---------- helpers temps ---------- */
const DAY_MS = 86400000;
function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function inRange(ts, a, b) { const t = +new Date(ts); return t >= +a && t <= +b; }
function isToday(ts) { const a = startOfDay(); const b = new Date(+a + DAY_MS - 1); return inRange(ts, a, b); }

function startOfWeek(d = new Date()) {
  const x = startOfDay(d); const day = x.getDay() || 7; // Lundi=1..Dim=7
  x.setDate(x.getDate() - (day - 1)); return x;
}
function startOfMonth(d = new Date()) { const x = startOfDay(d); x.setDate(1); return x; }

/* ---------- DOM ---------- */
const $ = s => document.querySelector(s);

const enableCigs = $("#enableCigs");
const enableWeed = $("#enableWeed");
const enableAlcohol = $("#enableAlcohol");

const cardCigs = $("#cardCigs");
const cardWeed = $("#cardWeed");
const cardAlcohol = $("#cardAlcohol");

const cigsToday = $("#cigsToday");
const weedToday = $("#weedToday");
const alcoToday = $("#alcoToday");

const todayTotal = $("#todayTotal");
const weekTotal = $("#weekTotal");
const monthTotal = $("#monthTotal");
const todayCost = $("#todayCost");

const limitCigs = $("#limitCigs");
const limitWeed = $("#limitWeed");
const limitAlcohol = $("#limitAlcohol");

const pricePack = $("#pricePack");
const cigsPerPack = $("#cigsPerPack");
const priceJoint = $("#priceJoint");
const priceBeer = $("#priceBeer");
const priceStrong = $("#priceStrong");
const priceLiquor = $("#priceLiquor");

const limitDayCigs = $("#limitDayCigs");
const limitDayWeed = $("#limitDayWeed");
const limitDayAlcohol = $("#limitDayAlcohol");

const btnSaveSettings = $("#btnSaveSettings");

const btnImport = $("#btnImport");
const fileJson = $("#fileJson");
const btnExport = $("#btnExport");
const feedback = $("#feedback");
const preview = $("#preview");

/* ---------- UI init ---------- */
function initToggles() {
  enableCigs.checked    = !!state.settings.enable.cigs;
  enableWeed.checked    = !!state.settings.enable.weed;
  enableAlcohol.checked = !!state.settings.enable.alcohol;

  renderActivation();
  enableCigs.onchange = () => { state.settings.enable.cigs = enableCigs.checked; save(state); renderActivation(); };
  enableWeed.onchange = () => { state.settings.enable.weed = enableWeed.checked; save(state); renderActivation(); };
  enableAlcohol.onchange = () => { state.settings.enable.alcohol = enableAlcohol.checked; save(state); renderActivation(); };
}
function renderActivation() {
  cardCigs.classList.toggle("hide", !state.settings.enable.cigs);
  cardWeed.classList.toggle("hide", !state.settings.enable.weed);
  cardAlcohol.classList.toggle("hide", !state.settings.enable.alcohol);
}

function initSettingsForm() {
  const p = state.settings.price;
  pricePack.value = p.pricePerPack;
  cigsPerPack.value = p.cigsPerPack;
  priceJoint.value = p.joint;
  priceBeer.value = p.beer;
  priceStrong.value = p.strong;
  priceLiquor.value = p.liquor;

  const L = state.settings.limits.day;
  limitDayCigs.value = L.cigs || 0;
  limitDayWeed.value = L.weed || 0;
  limitDayAlcohol.value = L.alcohol || 0;

  btnSaveSettings.onclick = () => {
    state.settings.price = {
      pricePerPack: +pricePack.value || 0,
      cigsPerPack: +cigsPerPack.value || 20,
      joint: +priceJoint.value || 0,
      beer: +priceBeer.value || 0,
      strong: +priceStrong.value || 0,
      liquor: +priceLiquor.value || 0
    };
    state.settings.limits.day = {
      cigs: +limitDayCigs.value || 0,
      weed: +limitDayWeed.value || 0,
      alcohol: +limitDayAlcohol.value || 0
    };
    save(state);
    flash("Réglages enregistrés.", "ok");
    renderAll();
  };
}

/* ---------- comptage ---------- */
function addEntry(type, qty = 1) {
  state.entries.push({ ts: new Date().toISOString(), type, qty });
  save(state);
  renderAll();
}
function removeOneToday(type) {
  // supprime la dernière entrée d’aujourd’hui pour ce type
  for (let i = state.entries.length - 1; i >= 0; i--) {
    const e = state.entries[i];
    if (e.type === type && isToday(e.ts)) { state.entries.splice(i,1); break; }
  }
  save(state); renderAll();
}
function sumToday(typeList) {
  return state.entries
    .filter(e => isToday(e.ts) && typeList.includes(e.type))
    .reduce((s,e)=> s + (e.qty||1), 0);
}
function sumRange(typeList, start, end) {
  return state.entries
    .filter(e => inRange(e.ts,start,end) && typeList.includes(e.type))
    .reduce((s,e)=> s + (e.qty||1), 0);
}

/* ---------- coûts / économies ---------- */
function costToday() {
  const p = state.settings.price;
  const cigs = sumToday(["cig"]);
  const weed = sumToday(["weed"]);
  const beer = sumToday(["beer"]);
  const strong = sumToday(["strong"]);
  const liquor = sumToday(["liquor"]);

  const cigCost = p.pricePerPack && p.cigsPerPack ? (cigs / p.cigsPerPack) * p.pricePerPack : 0;
  const weedCost = weed * p.joint;
  const alcoCost = beer * p.beer + strong * p.strong + liquor * p.liquor;
  return cigCost + weedCost + alcoCost;
}
function economiesHint() {
  // très simple pour l’instant : ce que tu n’as PAS consommé si une limite existe
  const L = state.settings.limits.day;
  const p = state.settings.price;
  let euros = 0;

  if (L.cigs) {
    const left = Math.max(0, L.cigs - sumToday(["cig"]));
    euros += p.pricePerPack && p.cigsPerPack ? (left / p.cigsPerPack) * p.pricePerPack : 0;
  }
  if (L.weed) {
    const left = Math.max(0, L.weed - sumToday(["weed"]));
    euros += left * p.joint;
  }
  if (L.alcohol) {
    const left = Math.max(0, L.alcohol - sumToday(["beer","strong","liquor"]));
    // pondération simple bière=1, fort=1, liqueur=1 -> on prend la moyenne des prix
    const avg = (p.beer + p.strong + p.liquor) / 3;
    euros += left * (avg || 0);
  }
  return euros;
}

/* ---------- rendu ---------- */
function renderCounters() {
  cigsToday.textContent = sumToday(["cig"]);
  weedToday.textContent = sumToday(["weed"]);
  alcoToday.textContent = sumToday(["beer","strong","liquor"]);

  // limites
  const L = state.settings.limits.day;
  limitCigs.textContent = L.cigs ? `Limite jour: ${L.cigs}` : "";
  limitWeed.textContent = L.weed ? `Limite jour: ${L.weed}` : "";
  limitAlcohol.textContent = L.alcohol ? `Limite jour: ${L.alcohol}` : "";
}
function renderHeaderStats() {
  const a = startOfDay();
  const b = new Date(+a + DAY_MS - 1);
  const wA = startOfWeek();
  const wB = new Date(+startOfWeek() + 7*DAY_MS - 1);
  const mA = startOfMonth();
  const mB = new Date(mA.getFullYear(), mA.getMonth()+1, 0, 23,59,59,999);

  const typesAll = ["cig","weed","beer","strong","liquor"];
  todayTotal.textContent = sumRange(typesAll, a, b);
  weekTotal.textContent  = sumRange(typesAll, wA, wB);
  monthTotal.textContent = sumRange(typesAll, mA, mB);

  todayCost.textContent = costToday().toFixed(2) + " €";
  $("#economies-amount").textContent = economiesHint().toFixed(2) + " €";
}
function renderAll() { renderCounters(); renderHeaderStats(); }

/* ---------- boutons +/- ---------- */
document.addEventListener("click", (e)=>{
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.classList.contains("plus")) {
    const type = btn.dataset.type;
    if (type) addEntry(type, 1);
  }
  if (btn.classList.contains("minus")) {
    const type = btn.dataset.type;
    if (type) removeOneToday(type);
  }
});

/* ---------- import / export ---------- */
btnImport.onclick = () => fileJson.click();
fileJson.onchange = async () => {
  const f = fileJson.files?.[0];
  if (!f) return;
  try {
    const text = await f.text();
    const json = JSON.parse(text);
    // attend structure {settings?, entries?}
    if (json.settings) state.settings = { ...state.settings, ...json.settings };
    if (Array.isArray(json.entries)) state.entries = json.entries;
    save(state);
    preview.hidden = false;
    preview.textContent = JSON.stringify(json, null, 2);
    flash("Import réussi. Données enregistrées.", "ok");
    initSettingsForm(); renderAll();
  } catch (err) {
    flash("Import invalide.", "error");
  } finally {
    fileJson.value = "";
  }
};

btnExport.onclick = () => {
  const rows = [["ts","type","qty"]];
  for (const e of state.entries) rows.push([e.ts, e.type, e.qty ?? 1]);
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "stopaddict_export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

function flash(msg, kind="info") {
  feedback.className = "feedback " + kind;
  feedback.textContent = msg;
  setTimeout(()=>{ feedback.className = "feedback"; feedback.textContent = ""; }, 3500);
}

/* ---------- boot ---------- */
initToggles();
initSettingsForm();
renderAll();
