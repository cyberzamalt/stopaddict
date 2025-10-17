// web/js/counters.js
import { state, save, emit } from "./state.js";
import { isToday, announce } from "./utils.js";

const LOCK_MS = 120; // petit anti-double clic

function addEntry(type, qty = 1){
  state.entries.push({ ts: new Date().toISOString(), type, qty });
  save(state);
  emit("sa:changed");
  announce("Ajout enregistré");
}
function removeOneToday(type){
  for (let i = state.entries.length - 1; i >= 0; i--){
    const e = state.entries[i];
    if (e.type === type && isToday(e.ts)) { state.entries.splice(i,1); break; }
  }
  save(state);
  emit("sa:changed");
  announce("Retrait effectué");
}

export function initCounters(){
  let lastClickAt = 0;

  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("button");
    if (!btn) return;

    // garde-fou anti spam touches
    const now = Date.now();
    if (now - lastClickAt < LOCK_MS) return;
    lastClickAt = now;

    if (btn.classList.contains("plus"))  { const t = btn.dataset.type; if (t) addEntry(t, 1); }
    if (btn.classList.contains("minus")) { const t = btn.dataset.type; if (t) removeOneToday(t); }
  }, { passive:true });
}
