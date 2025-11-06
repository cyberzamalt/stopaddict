/* web/js/habits.js — module optionnel (non requis si app.js gère déjà Habitudes) */
export function mountHabits(ctx) {
  const { S, DefaultState, saveState, persistTodayIntoHistory, updateHeader, renderChart, dbg } = ctx || {};
  const $ = (s) => document.querySelector(s);
  if (!S) return;

  const setVal = (sel, val) => { const el = $(sel); if (el) el.value = Number(val ?? 0); };
  setVal("#goal-cigs",    S.goals.cigs);
  setVal("#goal-joints",  S.goals.joints);
  setVal("#goal-beer",    S.goals.beer);
  setVal("#goal-hard",    S.goals.hard);
  setVal("#goal-liqueur", S.goals.liqueur);

  $("#btn-habits-save")?.addEventListener("click", () => {
    S.goals.cigs    = Number($("#goal-cigs").value||0);
    S.goals.joints  = Number($("#goal-joints").value||0);
    S.goals.beer    = Number($("#goal-beer").value||0);
    S.goals.hard    = Number($("#goal-hard").value||0);
    S.goals.liqueur = Number($("#goal-liqueur").value||0);
    persistTodayIntoHistory?.(); updateHeader?.(); renderChart?.(); saveState?.(S);
    dbg?.push?.("Objectifs quotidiens enregistrés (habits.js)", "ok");
  });

  $("#btn-habits-reset")?.addEventListener("click", () => {
    S.goals = { ...DefaultState().goals };
    ["#goal-cigs","#goal-joints","#goal-beer","#goal-hard","#goal-liqueur"].forEach(sel => { const el = $(sel); if (el) el.value = 0; });
    persistTodayIntoHistory?.(); updateHeader?.(); renderChart?.(); saveState?.(S);
    dbg?.push?.("Objectifs réinitialisés (habits.js)", "ok");
  });

  const map = [
    ["#date-stop-global","stopGlobal"],["#date-stop-alcohol","stopAlcohol"],
    ["#date-stop-cigs","stopCigs"],["#date-stop-joints","stopJoints"],
    ["#date-reduce-cigs","reduceCigs"],["#date-quit-cigs-obj","quitCigsObj"],["#date-nomore-cigs","noMoreCigs"],
    ["#date-reduce-joints","reduceJoints"],["#date-quit-joints-obj","quitJointsObj"],["#date-nomore-joints","noMoreJoints"],
    ["#date-reduce-alcohol","reduceAlcohol"],["#date-quit-alcohol-obj","quitAlcoholObj"],["#date-nomore-alcohol","noMoreAlcohol"]
  ];
  map.forEach(([sel,key]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.value = S.dates[key] || "";
    el.addEventListener("change", (e) => { S.dates[key] = e.target.value || ""; saveState?.(S); });
  });
}
