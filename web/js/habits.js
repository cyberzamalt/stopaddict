/* web/js/habits.js — Module optionnel (non requis par app.js) */
export function mountHabits({ getState, onChange } = {}){
  const S = (typeof getState === 'function' ? getState() : null) || {};
  const $ = (s)=>document.querySelector(s);

  const mapGoals = {
    cigs:'#goal-cigs', joints:'#goal-joints', beer:'#goal-beer', hard:'#goal-hard', liqueur:'#goal-liqueur'
  };
  Object.entries(mapGoals).forEach(([k,sel])=>{
    const el=$(sel); if(!el) return;
    el.value = Number(S.goals?.[k]||0);
    el.addEventListener('input', ()=>{
      if (typeof onChange === 'function') onChange({ type:'goal', key:k, value:Number(el.value||0) });
    });
  });

  const datesMap = {
    stopGlobal:'#date-stop-global', stopAlcohol:'#date-stop-alcohol',
    stopCigs:'#date-stop-cigs', stopJoints:'#date-stop-joints',
    reduceCigs:'#date-reduce-cigs', quitCigsObj:'#date-quit-cigs-obj', noMoreCigs:'#date-nomore-cigs',
    reduceJoints:'#date-reduce-joints', quitJointsObj:'#date-quit-joints-obj', noMoreJoints:'#date-nomore-joints',
    reduceAlcohol:'#date-reduce-alcohol', quitAlcoholObj:'#date-quit-alcohol-obj', noMoreAlcohol:'#date-nomore-alcohol'
  };
  Object.entries(datesMap).forEach(([k,sel])=>{
    const el=$(sel); if(!el) return;
    el.value = S.dates?.[k] || '';
    el.addEventListener('change', ()=>{
      if (typeof onChange === 'function') onChange({ type:'date', key:k, value:el.value||'' });
    });
  });
}
