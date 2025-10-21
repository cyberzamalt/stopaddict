// ============================================================
// counters.js — Compteurs Accueil (PHASE 2)
// - Persistance localStorage (par jour)
// - Boutons +/- (clopes / joints / alcool)
// - Refresh barres haut + cartes droites
// - Broadcast événement 'sa:counts-updated'
// ============================================================

console.log("[counters.js] Module loaded");

// ------------------------------
// Storage helpers
// ------------------------------
const LS_PREFIX = "sa:counts:";

function dateKey(d = new Date()) {
  return `${LS_PREFIX}${d.toISOString().slice(0, 10)}`; // "YYYY-MM-DD"
}

function readDay(key = dateKey()) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { c: 0, j: 0, a: 0 }; // clopes, joints, alcool
    const parsed = JSON.parse(raw);
    return {
      c: Number(parsed.c) || 0,
      j: Number(parsed.j) || 0,
      a: Number(parsed.a) || 0,
    };
  } catch (e) {
    console.error("[counters] readDay error:", e);
    return { c: 0, j: 0, a: 0 };
  }
}

function writeDay(val, key = dateKey()) {
  try {
    const safe = { c: Math.max(0, val.c|0), j: Math.max(0, val.j|0), a: Math.max(0, val.a|0) };
    localStorage.setItem(key, JSON.stringify(safe));
  } catch (e) {
    console.error("[counters] writeDay error:", e);
  }
}

// ------------------------------
// UI refresh
// ------------------------------
function refreshBars(counts) {
  const elC = document.getElementById("bar-clopes");
  const elJ = document.getElementById("bar-joints");
  const elA = document.getElementById("bar-alcool");
  if (elC) elC.textContent = String(counts.c);
  if (elJ) elJ.textContent = String(counts.j);
  if (elA) elA.textContent = String(counts.a);
}

function refreshCards(counts) {
  // Cigarettes
  const cardC = document.getElementById("card-cigs");
  if (cardC) {
    const v = cardC.querySelector(".val");
    if (v) v.textContent = String(counts.c);
  }
  // Joints
  const cardJ = document.getElementById("card-weed");
  if (cardJ) {
    const v = cardJ.querySelector(".val");
    if (v) v.textContent = String(counts.j);
  }
  // Alcool
  const cardA = document.getElementById("card-alcool");
  if (cardA) {
    const v = cardA.querySelector(".val");
    if (v) v.textContent = String(counts.a);
  }
}

function broadcast(counts) {
  window.dispatchEvent(new CustomEvent("sa:counts-updated", { detail: { date: new Date(), counts } }));
}

// ------------------------------
// Actions +/-
// ------------------------------
function clamp(n) { return n < 0 ? 0 : n; }

function setupButtons() {
  const key = dateKey();
  let counts = readDay(key);

  const apply = () => {
    writeDay(counts, key);
    refreshBars(counts);
    refreshCards(counts);
    broadcast(counts);
  };

  const btns = [
    ["cl-moins",  () => counts.c = clamp(counts.c - 1)],
    ["cl-plus",   () => counts.c = clamp(counts.c + 1)],
    ["j-moins",   () => counts.j = clamp(counts.j - 1)],
    ["j-plus",    () => counts.j = clamp(counts.j + 1)],
    ["a-moins",   () => counts.a = clamp(counts.a - 1)],
    ["a-plus",    () => counts.a = clamp(counts.a + 1)],
  ];

  btns.forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("click", () => {
      fn();
      apply();
    });
  });

  // Premier rendu UI
  apply();
}

// ------------------------------
// API
// ------------------------------
export function getTodayCounts() {
  return readDay(dateKey());
}

export function initCounters() {
  console.log("[counters] init…");
  try {
    setupButtons();
    console.log("[counters] ✓ prêt");
  } catch (e) {
    console.error("[counters] init error:", e);
  }
}
