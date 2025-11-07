/* web/js/calendar.js — Calendrier V2 (jour/semaine/mois) */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => r.querySelectorAll(s);

function iso(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const da=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function clone(d){ return new Date(d.getTime()); }
function startOfWeek(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x; }
function startOfMonth(d){ const x=new Date(d.getFullYear(), d.getMonth(), 1); x.setHours(0,0,0,0); return x; }
function endOfMonth(d){ const x=new Date(d.getFullYear(), d.getMonth()+1, 0); x.setHours(0,0,0,0); return x; }

function sumForDay(S, dateIso, filters){
  const todayIso = iso(new Date());
  const d = (dateIso===todayIso ? { ...S.history?.[dateIso], ...S.today?.counters } : S.history?.[dateIso]) || {};
  const keys = ['cigs','joints','beer','hard','liqueur'];
  const out  = { cigs:0,joints:0,beer:0,hard:0,liqueur:0, cost: Number(d.cost||0), saved: Number(d.saved||0) };
  for (const k of keys){
    if (!filters[k]) continue;
    out[k] = Number(d[k]||0);
  }
  return out;
}

function fmtMoney(n, cur='€'){
  const x = Math.round(Number(n||0)*100)/100;
  return x.toFixed(2).replace('.', ',') + cur;
}

export function mountCalendar({ S, getState=()=>S, showTab } = {}){
  let state = S;
  const cur = { mode:'month', ref: new Date(), filters:{ cigs:true,joints:true,beer:true,hard:true,liqueur:true } };

  const elTitle   = $('#cal-title');
  const btnPrev   = $('#cal-prev');
  const btnNext   = $('#cal-next');
  const grid      = $('#calendar-grid');
  const details   = $('#calendar-details');

  // Mode buttons
  $$('.toolbar-center [data-cal-mode]').forEach(b=>{
    b.addEventListener('click', ()=>{
      $$('.toolbar-center [data-cal-mode]').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      cur.mode = b.dataset.calMode;
      render();
    });
  });

  // Filters
  $$('.cal-filters [data-cal-filter]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      cur.filters[cb.dataset.calFilter] = cb.checked;
      render();
    });
  });

  // Prev/Next
  btnPrev?.addEventListener('click', ()=>{
    if (cur.mode==='day'){ cur.ref.setDate(cur.ref.getDate()-1); }
    else if (cur.mode==='week'){ cur.ref.setDate(cur.ref.getDate()-7); }
    else { cur.ref.setMonth(cur.ref.getMonth()-1); }
    render();
  });
  btnNext?.addEventListener('click', ()=>{
    if (cur.mode==='day'){ cur.ref.setDate(cur.ref.getDate()+1); }
    else if (cur.mode==='week'){ cur.ref.setDate(cur.ref.getDate()+7); }
    else { cur.ref.setMonth(cur.ref.getMonth()+1); }
    render();
  });

  function renderHeader(){
    const d = cur.ref;
    const t = (cur.mode==='day')
      ? d.toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
      : (cur.mode==='week')
        ? `Semaine du ${startOfWeek(d).toLocaleDateString('fr-FR')}`
        : d.toLocaleDateString('fr-FR', { year:'numeric', month:'long' });
    if (elTitle) elTitle.textContent = t;
  }

  function renderDay(){
    if (!grid || !details) return;
    grid.replaceChildren();
    details.replaceChildren();

    const S = getState();
    const i = iso(cur.ref);
    const totals = sumForDay(S,i,cur.filters);
    const curSym = S.currency || '€';

    const box = document.createElement('div');
    box.className = 'cal-box cal-dayview';
    const h4 = document.createElement('h4');
    h4.textContent = `Détail — ${cur.ref.toLocaleDateString('fr-FR')}`;
    box.appendChild(h4);

    const sum = document.createElement('div');
    sum.className = 'cal-summary';
    const pairs = [
      ['Cigarettes', totals.cigs],
      ['Joints',     totals.joints],
      ['Bière',      totals.beer],
      ['Alcool fort',totals.hard],
      ['Liqueur',    totals.liqueur],
      ['Coût',       fmtMoney(totals.cost, curSym)],
      ['Économies',  fmtMoney(totals.saved, curSym)],
    ];
    for (const [k,v] of pairs){
      const c = document.createElement('div');
      c.innerHTML = `<strong>${k}</strong><br>${v}`;
      sum.appendChild(c);
    }
    box.appendChild(sum);
    details.appendChild(box);
  }

  function dayCell(d, otherMonth=false){
    const S = getState();
    const i = iso(d);
    const t = sumForDay(S, i, cur.filters);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (otherMonth) cell.classList.add('cal-other');
    if (i === iso(new Date())) cell.classList.add('cal-today');

    const day = document.createElement('div');
    day.className = 'cal-day';
    day.textContent = String(d.getDate());
    cell.appendChild(day);

    const mini = document.createElement('div');
    mini.className = 'cal-mini';
    const dot = (txt) => { const s=document.createElement('span'); s.className='mini-dot'; s.textContent=txt; return s; };
    const eur = (val) => { const s=document.createElement('span'); s.className='mini-euro'; s.textContent=fmtMoney(val, (S.currency||'€')); return s; };

    const sumCount = (t.cigs + t.joints + t.beer + t.hard + t.liqueur);
    if (sumCount > 0) mini.appendChild(dot(sumCount));
    if (t.cost > 0)   mini.appendChild(eur(t.cost));

    cell.appendChild(mini);

    cell.addEventListener('click', ()=>{
      cur.mode = 'day';
      $$('.toolbar-center [data-cal-mode]').forEach(x=>x.classList.remove('active'));
      $$('.toolbar-center [data-cal-mode][data-cal-mode="day"]')[0]?.classList.add('active');
      cur.ref = new Date(d);
      render();
    });

    return cell;
  }

  function renderMonth(){
    if (!grid || !details) return;
    grid.replaceChildren();
    details.replaceChildren();

    const d0   = startOfMonth(cur.ref);
    const dEnd = endOfMonth(cur.ref);

    // Head (jours)
    const head = document.createElement('div');
    head.className = 'cal-head';
    const days = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    for (const w of days){ const c=document.createElement('div'); c.textContent = w; head.appendChild(c); }
    grid.appendChild(head);

    // Body
    const body = document.createElement('div');
    body.className = 'cal-body';

    // Commencer au lundi de la 1ère semaine affichée
    let curDay = startOfWeek(d0);
    while (curDay <= dEnd || (curDay.getDay()+6)%7 !== 0) {
      body.appendChild(dayCell(new Date(curDay), curDay.getMonth() !== d0.getMonth()));
      curDay.setDate(curDay.getDate()+1);
    }

    grid.appendChild(body);

    // Bas de page : liens rapides
    const links = document.createElement('div');
    links.className = 'cal-links';
    const b1 = Object.assign(document.createElement('button'), { className:'btn small', id:'cal-open-stats', textContent:'Ouvrir Stats' });
    const b2 = Object.assign(document.createElement('button'), { className:'btn small', id:'cal-open-habits', textContent:'Ouvrir Habitudes' });
    b1.addEventListener('click', ()=> showTab?.('stats'));
    b2.addEventListener('click', ()=> showTab?.('habits'));
    links.appendChild(b1); links.appendChild(b2);
    details.appendChild(links);
  }

  function renderWeek(){
    if (!grid || !details) return;
    grid.replaceChildren();
    details.replaceChildren();

    const S = getState();
    const start = startOfWeek(cur.ref);
    const cont = document.createElement('div');
    cont.className = 'cal-row';

    for (let i=0;i<7;i++){
      const d = new Date(start); d.setDate(start.getDate()+i);
      cont.appendChild(dayCell(d, false));
    }
    grid.appendChild(cont);

    // Résumé semaine
    const sumBox = document.createElement('div');
    sumBox.className = 'cal-box';
    const h4 = document.createElement('h4'); h4.textContent = 'Résumé semaine';
    sumBox.appendChild(h4);

    const totals = { cigs:0,joints:0,beer:0,hard:0,liqueur:0,cost:0,saved:0 };
    for (let i=0;i<7;i++){
      const d=new Date(start); d.setDate(start.getDate()+i);
      const t=sumForDay(S, iso(d), cur.filters);
      totals.cigs+=t.cigs; totals.joints+=t.joints; totals.beer+=t.beer; totals.hard+=t.hard; totals.liqueur+=t.liqueur; totals.cost+=t.cost; totals.saved+=t.saved;
    }
    const curSym = S.currency || '€';
    const list = [
      ['Cigarettes', totals.cigs],
      ['Joints', totals.joints],
      ['Bière', totals.beer],
      ['Alcool fort', totals.hard],
      ['Liqueur', totals.liqueur],
      ['Coût', fmtMoney(totals.cost, curSym)],
      ['Économies', fmtMoney(totals.saved, curSym)],
    ];
    for (const [k,v] of list){
      const p = document.createElement('div');
      p.textContent = `${k}: ${v}`;
      sumBox.appendChild(p);
    }
    details.appendChild(sumBox);
  }

  function render(){
    state = getState();
    renderHeader();
    if (cur.mode==='day') renderDay();
    else if (cur.mode==='week') renderWeek();
    else renderMonth();
  }

  // premier rendu
  render();

  return {
    update: (Snext)=>{ state = Snext || getState(); render(); }
  };
}
