/* web/js/habits.js — Objectifs & Dates (save/reset) + notifications */

export function mountHabits({
  S,                        // état courant (objet mutable)
  getState = null,          // () => S (optionnel)
  DefaultState,             // fonction qui retourne l'état par défaut
  saveState,                // (S) => void
  updateHeader = null,      // () => void
  refreshStats = null,      // () => void  (rafraîchir les 2 graphes)
  Tips = null,              // module tips (avec .updateTips)
  Cal = null,               // instance calendrier (avec .update)
  dbg = null                // { push(msg, type) }
} = {}) {

  const $  = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const _S = () => (typeof getState === "function" ? getState() : S);

  // --- Utilitaires ---
  const n = (v) => Math.max(0, Number(v || 0));
  const setVal = (sel, val) => { const el=$(sel); if (el) el.value = val ?? ""; };
  const on = (sel, evt, fn) => { const el=$(sel); if (el) el.addEventListener(evt, fn); };

  function log(msg, type="info"){ try{ dbg?.push?.(msg, type);}catch{} }

  // --- Champs objectifs ---
  const GOAL_IDS = {
    cigs:     "#goal-cigs",
    joints:   "#goal-joints",
    beer:     "#goal-beer",
    hard:     "#goal-hard",
    liqueur:  "#goal-liqueur",
  };

  // --- Champs dates (mapping logique -> id input) ---
  const DATE_IDS = {
    stopGlobal:        "#date-stop-global",
    stopAlcohol:       "#date-stop-alcohol",

    reduceCigs:        "#date-reduce-cigs",
    quitCigsObj:       "#date-quit-cigs-obj",
    noMoreCigs:        "#date-nomore-cigs",

    reduceJoints:      "#date-reduce-joints",
    quitJointsObj:     "#date-quit-joints-obj",
    noMoreJoints:      "#date-nomore-joints",

    reduceAlcohol:     "#date-reduce-alcohol",
    quitAlcoholObj:    "#date-quit-alcohol-obj",
    noMoreAlcohol:     "#date-nomore-alcohol",
  };

  // --- Hydratation initiale ---
  function hydrateGoals(){
    const s=_S();
    setVal(GOAL_IDS.cigs,    s.goals.cigs);
    setVal(GOAL_IDS.joints,  s.goals.joints);
    setVal(GOAL_IDS.beer,    s.goals.beer);
    setVal(GOAL_IDS.hard,    s.goals.hard);
    setVal(GOAL_IDS.liqueur, s.goals.liqueur);
  }

  function hydrateDates(){
    const d=_S().dates || {};
    for (const [k, sel] of Object.entries(DATE_IDS)){
      setVal(sel, d[k] || "");
    }
  }

  // --- Sauvegardes ---
  function saveGoals(){
    const s=_S();
    s.goals.cigs    = n($(GOAL_IDS.cigs)?.value);
    s.goals.joints  = n($(GOAL_IDS.joints)?.value);
    s.goals.beer    = n($(GOAL_IDS.beer)?.value);
    s.goals.hard    = n($(GOAL_IDS.hard)?.value);
    s.goals.liqueur = n($(GOAL_IDS.liqueur)?.value);

    saveState(s);
    updateAll("Objectifs enregistrés","ok");
  }

  function resetGoals(){
    const s=_S();
    s.goals = { ...DefaultState().goals };
    saveState(s);
    hydrateGoals();
    updateAll("Objectifs réinitialisés","ok");
  }

  function wireDateChanges(){
    for (const [key, sel] of Object.entries(DATE_IDS)){
      on(sel, "change", (e)=>{
        const s=_S();
        s.dates = s.dates || {};
        s.dates[key] = e.target.value || "";
        saveState(s);
        updateAll(`Date mise à jour: ${key}`, "event");
      });
    }
  }

  // --- Notifications globales ---
  function updateAll(msg, type){
    try { updateHeader?.(); } catch {}
    try { refreshStats?.(); } catch {}
    try { Tips?.updateTips?.(_S()); } catch {}
    try { Cal?.update?.(_S()); } catch {}
    log(msg, type);
  }

  // --- Câblage boutons ---
  on("#btn-habits-save",  "click", saveGoals);
  on("#btn-habits-reset", "click", resetGoals);

  // --- Init ---
  hydrateGoals();
  hydrateDates();
  wireDateChanges();

  log("Habits prêt", "ok");

  // API minimale si besoin
  return {
    refresh(){
      hydrateGoals();
      hydrateDates();
    }
  };
}
