// ============================================================
// state.js — Central state + event system (MINIMAL)
// ============================================================
// Fonctions minimales attendues par stats.js et charts.js

console.log("[state.js] Module loaded");

// ============================================================
// State storage
// ============================================================
const state = {
  daily: {
    cigs: 0,
    weed: 0,
    alcohol: 0,
  },
};

// ============================================================
// Event system (pub/sub)
// ============================================================
const listeners = new Map();

export function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, []);
  }
  listeners.get(event).push(callback);
  console.log(`[state] Listener attached: ${event}`);
}

export function emit(event, detail = {}) {
  console.log(`[state] Event emitted: ${event}`, detail);
  if (!listeners.has(event)) return;
  for (const callback of listeners.get(event)) {
    try {
      callback({ detail });
    } catch (e) {
      console.error(`[state] Error in listener for ${event}:`, e);
    }
  }
}

// ============================================================
// State getters
// ============================================================
export function getDaily() {
  return { ...state.daily };
}

export function getWeekly() {
  return { ...state.daily }; // Placeholder
}

export function getMonthly() {
  return { ...state.daily }; // Placeholder
}

export function getYearly() {
  return { ...state.daily }; // Placeholder
}

// ============================================================
// State setters
// ============================================================
export function setDaily(counts) {
  if (counts) {
    state.daily = { ...counts };
    emit("sa:counts-updated", { counts: state.daily });
  }
}

console.log("[state.js] ✓ Ready");
