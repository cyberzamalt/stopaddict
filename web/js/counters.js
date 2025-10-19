// web/js/counters.js
// -------------------------------------------------------------------
// Accueil : +/- par type, segments (cigarettes & alcool), horloge,
// bandeau récap, "Stats rapides" header, Undo.
// Écoute le bus d'état via on(...) et n'utilise PAS document.addEventListener
// pour les events internes (évite le bug "bus vs document").
// -------------------------------------------------------------------
import {
  getDaily,
  addEntry,
  removeOneToday,
  getActiveSegments,
  setActiveSegment,
  totalsHeader,
  ymd,
  on,           // écoute propre sur le bus interne
  emit,         // si besoin pour signaler une action UI
} from "./state.js";

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function fmtEuros(x) {
  try {
    return (Number(x) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  } catch {
    return `${Number(x) || 0} €`;
  }
}

// Détecte le type par data-type, sinon par l'id (#cl-plus → cigs, #j-plus → weed, #a-plus → alcohol)
function inferType(btn) {
  const t = btn?.dataset?.type;
  if (t) return t;
  const id = btn?.id || "";
  if (id.startsWith("cl-")) return "cigs";
  if (id.startsWith("j-"))  return "weed";
  if (id.startsWith("a-"))  return "alcohol";
  return null;
}

// ---------- horloge (header) ----------
let _clockTimer = null;
function wireClock() {
  const elDate  = $("#date-actuelle");
  const elHeure = $("#heure-actuelle");

  const tick = () => {
    const now = new Date();
    if (elDate)  elDate.textContent  = now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" });
    if (elHeure) elHeure.textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  tick();
  clearInterval(_clockTimer);
  _clockTimer = setInterval(tick, 1000);
}

// ---------- segments (accueil) ----------
function buildSegment(container, items, currentValue, onChange) {
  container.innerHTML = "";
  items.forEach(({ key, label }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg" + (key === currentValue ? " actif" : "");
    b.dataset.subtype = key;
    b.textContent = label;
    b.addEventListener("click", () => {
      onChange(key);
      // MAJ visuelle
      container.querySelectorAll(".seg").forEach(el => el.classList.toggle("actif", el === b));
    });
    container.appendChild(b);
  });
}

function wireSegments() {
  const { cigs, alcohol } = getActiveSegments();

  const segCl = $("#seg-clopes");
  if (segCl) {
    buildSegment(segCl,
      [
        { key: "classic", label: "Classiques" },
        { key: "rolled",  label: "Roulées"   },
        { key: "tube",    label: "Tubes"     },
      ],
      cigs,
      (val) => setActiveSegment("cigs", val)
    );
  }

  const segA = $("#seg-alcool");
  if (segA) {
    buildSegment(segA,
      [
        { key: "beer",  label: "Bière"      },
        { key: "fort",  label: "Fort"       },
        { key: "liqueur", label: "Liqueur"  },
      ],
      alcohol,
      (val) => setActiveSegment("alcohol", val)
    );
  }
}

// ---------- +/- (accueil) + Undo ----------
let lastAction = null;

function showSnackUndo() {
  const bar = $("#snackbar");
  const link = $("#undo-link");
  if (!bar || !link) return;

  bar.classList.add("show");
  const hide = () => bar.classList.remove("show");
  const t = setTimeout(hide, 2500);

  link.onclick = (e) => {
    e.preventDefault();
    clearTimeout(t);
    bar.classList.remove("show");
    if (!lastAction) return;
    const { type, delta } = lastAction;
    if (delta > 0) {
      // on annule un +1 en faisant -1
      removeOneToday(type);
    } else if (delta < 0) {
      // on annule un -1 en faisant +1
      addEntry(type, Math.abs(delta));
    }
    lastAction = null;
  };
}

function wirePlusMinus() {
  // Tous les boutons +/- de l’accueil
  $$(".ecran#ecran-principal .btn-round").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = inferType(btn);
      if (!type) return;

      if (btn.classList.contains("btn-plus")) {
        addEntry(type, +1);
        lastAction = { type, delta: +1 };
      } else if (btn.classList.contains("btn-minus")) {
        removeOneToday(type);
        lastAction = { type, delta: -1 };
      }
      showSnackUndo();
    });
  });
}

// ---------- Stats rapides (header) + Bandeau résumé (accueil) ----------
function refreshHeaderCounters() {
  // Stats rapides du jour (4 cases en haut)
  try {
    const todayKey = ymd(new Date());
    const d = getDaily(todayKey) || {};
    const cl = Number(d.cigs || 0);
    const j  = Number(d.weed || 0);
    const a  = Number(d.alcohol || 0);

    const cost = (totalsHeader()?.todayCost) ?? 0;

    $("#stat-clopes-jr") && ($("#stat-clopes-jr").textContent = String(cl));
    $("#stat-joints-jr") && ($("#stat-joints-jr").textContent = String(j));
    $("#stat-alcool-jr") && ($("#stat-alcool-jr").textContent = String(a));
    $("#stat-cout-jr")   && ($("#stat-cout-jr").textContent   = fmtEuros(cost));
  } catch (e) {
    console.warn("[counters] refreshHeaderCounters (quick) :", e);
  }

  // Bandeau résumé (dans accueil)
  try {
    const title = $("#bandeau-titre");
    const vCl   = $("#bandeau-clopes");
    const vJ    = $("#bandeau-joints");
    const vAL   = $("#bandeau-alcool");
    const alLine= $("#bandeau-alcool-line");

    const todayKey = ymd(new Date());
    const d = getDaily(todayKey) || {};
    const cl = Number(d.cigs || 0);
    const j  = Number(d.weed || 0);
    const a  = Number(d.alcohol || 0);

    if (title) title.textContent = "Aujourd’hui";
    if (vCl)   vCl.textContent   = String(cl);
    if (vJ)    vJ.textContent    = String(j);
    if (vAL)   vAL.textContent   = String(a);

    if (alLine) alLine.style.display = a > 0 ? "" : "none";
  } catch (e) {
    console.warn("[counters] refreshHeaderCounters (banner) :", e);
  }

  // KPIs header (si présents)
  try {
    const th = totalsHeader();
    if (th) {
      $("#todayTotal")   && ($("#todayTotal").textContent   = String(th.todayTotal ?? 0));
      $("#weekTotal")    && ($("#weekTotal").textContent    = String(th.weekTotal ?? 0));
      $("#monthTotal")   && ($("#monthTotal").textContent   = String(th.monthTotal ?? 0));
      $("#todayCost")    && ($("#todayCost").textContent    = fmtEuros(th.todayCost ?? 0));
      $("#economies-amount") && ($("#economies-amount").textContent = fmtEuros(th.economiesAmount ?? 0));
    }
  } catch (e) {
    console.warn("[counters] refreshHeaderCounters (kpis) :", e);
  }
}

// ---------- init ----------
export function initCounters() {
  wireClock();
  wireSegments();
  wirePlusMinus();
  refreshHeaderCounters();

  // Écoute le BUS interne (pas document)
  on("state:changed",  refreshHeaderCounters);
  on("state:daily",    refreshHeaderCounters);
  on("state:economy",  refreshHeaderCounters);
  on("state:settings", refreshHeaderCounters);

  // Et quelques sources système usuelles
  window.addEventListener("storage", () => refreshHeaderCounters());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshHeaderCounters();
  });
}
