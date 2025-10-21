// ============================================================
// counters.js — Accueil: +/− & synchro bandeau / cartes (PHASE 2)
// ============================================================
console.log("[counters.js] Module loaded");

const LS_TODAY = "sa:today:v1";

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth()+1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readToday() {
  try {
    const raw = localStorage.getItem(LS_TODAY);
    const t = raw ? JSON.parse(raw) : null;
    if (!t || t.date !== todayKey()) {
      return { date: todayKey(), c: 0, j: 0, a: 0 };
    }
    return { date: t.date, c: t.c|0, j: t.j|0, a: t.a|0 };
  } catch {
    return { date: todayKey(), c: 0, j: 0, a: 0 };
  }
}

function writeToday(state) {
  localStorage.setItem(LS_TODAY, JSON.stringify(state));
}

function clamp(n) { return n < 0 ? 0 : n; }

// UI helpers (pas de dépendance à d'autres modules)
const $ = (sel, root = document) => root.querySelector(sel);

function updateBars(state) {
  const { c, j, a } = state;
  const barC = $("#bar-clopes");
  const barJ = $("#bar-joints");
  const barA = $("#bar-alcool");
  if (barC) barC.textContent = String(c);
  if (barJ) barJ.textContent = String(j);
  if (barA) barA.textContent = String(a);

  // Total jour dans le header KPIs (si présent)
  const todayTotal = $("#todayTotal");
  if (todayTotal) todayTotal.textContent = String(c + j + a);
}

function updateCards(state) {
  const { c, j, a } = state;
  const cardC = $("#card-cigs .val");
  const cardJ = $("#card-weed .val");
  const cardA = $("#card-alcool .val");
  if (cardC) cardC.textContent = String(c);
  if (cardJ) cardJ.textContent = String(j);
  if (cardA) cardA.textContent = String(a);
}

function broadcast(state) {
  document.dispatchEvent(new CustomEvent("sa:counts-updated", { detail: { today: state }}));
}

function bindButtons(state) {
  // Cigarettes
  const btnCm = $("#cl-moins");
  const btnCp = $("#cl-plus");
  if (btnCm) btnCm.addEventListener("click", () => {
    state.c = clamp(state.c - 1); writeToday(state); updateBars(state); updateCards(state); broadcast(state);
  });
  if (btnCp) btnCp.addEventListener("click", () => {
    state.c = clamp(state.c + 1); writeToday(state); updateBars(state); updateCards(state); broadcast(state);
  });

  // Joints
  const btnJm = $("#j-moins");
  const btnJp = $("#j-plus");
  if (btnJm) btnJm.addEventListener("click", () => {
    state.j = clamp(state.j - 1); writeToday(state); updateBars(state); updateCards(state); broadcast(state);
  });
  if (btnJp) btnJp.addEventListener("click", () => {
    state.j = clamp(state.j + 1); writeToday(state); updateBars(state); updateCards(state); broadcast(state);
  });

  // Alcool
  const btnAm = $("#a-moins");
  const btnAp = $("#a-plus");
  if (btnAm) btnAm.addEventListener("click", () => {
    state.a = clamp(state.a - 1); writeToday(state); updateBars(state); updateCards(state); broadcast(state);
  });
  if (btnAp) btnAp.addEventListener("click", () => {
    state.a = clamp(state.a + 1); writeToday(state); updateBars(state); updateCards(state); broadcast(state);
  });
}

export function initCounters() {
  const state = readToday();
  updateBars(state);
  updateCards(state);
  bindButtons(state);
  broadcast(state); // synchro initiale avec Stats
  console.log("[counters.init] ✓ prêt");
}
