/* web/js/habits.js — Habitudes (objectifs + dates) */

export function mountHabits(opts){
  const {
    S,
    DefaultState,
    saveState,
    onGoalsChanged,   // () => void
    onDatesChanged,   // () => void
  } = opts || {};

  const $  = (s) => document.querySelector(s);

  /* ---------- IDs ---------- */
  const goalIds = {
    cigs:    "#goal-cigs",
    joints:  "#goal-joints",
    beer:    "#goal-beer",
    hard:    "#goal-hard",
    liqueur: "#goal-liqueur",
  };

  // mapping aligné sur le monolithe
  const dateMap = [
    ["#date-stop-global",     "stopGlobal"],
    ["#date-stop-alcohol",    "stopAlcohol"],

    ["#date-reduce-cigs",     "reduceCigs"],
    ["#date-quit-cigs-obj",   "quitCigsObj"],
    ["#date-nomore-cigs",     "noMoreCigs"],

    ["#date-reduce-joints",   "reduceJoints"],
    ["#date-quit-joints-obj", "quitJointsObj"],
    ["#date-nomore-joints",   "noMoreJoints"],

    ["#date-reduce-alcohol",  "reduceAlcohol"],
    ["#date-quit-alcohol-obj","quitAlcoholObj"],
    ["#date-nomore-alcohol",  "noMoreAlcohol"],
  ];

  /* ---------- Fill UI ---------- */
  function fillGoals(){
    Object.entries(goalIds).forEach(([k, sel])=>{
      const el = $(sel);
      if (!el) return;
      el.value = Number(S.goals?.[k] ?? 0);
    });
  }

  function fillDates(){
    dateMap.forEach(([sel, key])=>{
      const el = $(sel);
      if (!el) return;
      el.value = S.dates?.[key] || "";
    });
  }

  /* ---------- Save / Reset ---------- */
  function readGoalsFromUI(){
    Object.entries(goalIds).forEach(([k, sel])=>{
      const el = $(sel);
      const v  = Number(el?.value ?? 0);
      S.goals[k] = Number.isFinite(v) && v >= 0 ? v : 0;
    });
  }

  $("#btn-habits-save")?.addEventListener("click", ()=>{
    readGoalsFromUI();
    saveState(S);
    onGoalsChanged?.();
  });

  $("#btn-habits-reset")?.addEventListener("click", ()=>{
    const def = DefaultState ? DefaultState() : {};
    S.goals = { ...(def.goals || { cigs:0, joints:0, beer:0, hard:0, liqueur:0 }) };
    saveState(S);
    fillGoals();
    onGoalsChanged?.();
  });

  // Dates : save on change
  dateMap.forEach(([sel, key])=>{
    const el = $(sel);
    if (!el) return;
    el.addEventListener("change", (ev)=>{
      S.dates[key] = ev.target.value || "";
      saveState(S);
      onDatesChanged?.();
    });
  });

  /* ---------- Initial ---------- */
  fillGoals();
  fillDates();

  /* ---------- API légère ---------- */
  return {
    refresh(){
      fillGoals();
      fillDates();
    }
  };
}
