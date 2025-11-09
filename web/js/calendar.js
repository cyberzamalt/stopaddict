/* web/js/calendar.js — Vue Mois type monolithe (grille + mini-résumés + détail du jour) */
import { fmtMoney, todayKey } from "./state.js";

export function mountCalendar({ S, getState = () => S, showTab } = {}) {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const elTitle   = $("#cal-title");
  const elPrev    = $("#cal-prev");
  const elNext    = $("#cal-next");
  const elGrid    = $("#calendar-grid");
  const elDetails = $("#calendar-details");

  const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const WEEKDAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const KINDS = ["cigs","joints","beer","hard","liqueur"];
  const EMOJI = { cigs:"🚬", joints:"🌿", beer:"🍺", hard:"🥃", liqueur:"🍸" };

  let cur = new Date();

  function ymd(d){ return todayKey(d); }
  function daysInMonth(y,m){ return new Date(y, m+1, 0).getDate(); }
  function mondayIdx(d){ return (d.getDay()+6)%7; } // Lundi=0
  function filters(){
    const f = { cigs:true, joints:true, beer:true, hard:true, liqueur:true };
    $$('[data-cal-filter]').forEach(cb => { const k = cb.getAttribute('data-cal-filter'); if (k in f) f[k] = cb.checked; });
    return f;
  }
  function unitSumForDay(dayObj, f){
    let sum = 0;
    for (const k of KINDS){ if (f[k]) sum += Number(dayObj?.[k]||0); }
    return sum;
  }
  function costForDay(dayObj, f){
    // On affiche le coût stocké si présent ; sinon on approxime en sommant coûts filtrés si le monolithe les avait
    // Ici on utilise dayObj.cost si disponible (cohérent avec app/state)
    return Number(dayObj?.cost||0);
  }
  function savedForDay(dayObj){ return Number(dayObj?.saved||0); }

  function monthMatrix(date){
    const y = date.getFullYear();
    const m = date.getMonth();
    const first = new Date(y,m,1);
    const dmo = daysInMonth(y,m);
    const startPad = mondayIdx(first); // nb de cases avant le 1er
    const prevDays = daysInMonth(y, (m+11)%12); // jours du mois précédent (pour padding)
    const totalCells = Math.ceil((startPad + dmo) / 7) * 7;

    const cells = [];
    for (let i=0; i<totalCells; i++){
      const dayNum = i - startPad + 1;
      let cellDate, other=false;
      if (dayNum < 1){
        // Mois précédent
        const d = prevDays + dayNum;
        const pm = (m+11)%12;
        const py = m===0 ? y-1 : y;
        cellDate = new Date(py, pm, d); other = true;
      } else if (dayNum > dmo){
        // Mois suivant
        const d = dayNum - dmo;
        const nm = (m+1)%12;
        const ny = m===11 ? y+1 : y;
        cellDate = new Date(ny, nm, d); other = true;
      } else {
        cellDate = new Date(y, m, dayNum);
      }
      cells.push({ date: cellDate, other, iso: ymd(cellDate) });
    }
    return cells;
  }

  function renderHead(){
    // En-tête des jours
    const head = document.createElement("div");
    head.className = "cal-head";
    WEEKDAYS.forEach(lbl=>{
      const d = document.createElement("div");
      d.textContent = lbl;
      head.appendChild(d);
    });
    return head;
  }

  function renderMonth(){
    const Scur = getState();
    const f = filters();
    const nowIso = todayKey(new Date());

    if (elTitle) elTitle.textContent = `${MONTHS[cur.getMonth()]} ${cur.getFullYear()}`;

    // Reset grid
    elGrid.replaceChildren();

    // Head
    elGrid.appendChild(renderHead());

    // Body
    const body = document.createElement("div");
    body.className = "cal-body";

    const cells = monthMatrix(cur);
    cells.forEach(({date, other, iso})=>{
      const dayObj = Scur.history?.[iso] || {};
      const sumUnits = unitSumForDay(dayObj, f);
      const cost = costForDay(dayObj, f);

      const cell = document.createElement("div");
      cell.className = "cal-cell";
      if (other) cell.classList.add("cal-other");
      if (iso === nowIso) cell.classList.add("cal-today");
      cell.dataset.iso = iso;

      // Jour
      const dayTop = document.createElement("div");
      dayTop.className = "cal-day";
      dayTop.textContent = String(date.getDate());
      cell.appendChild(dayTop);

      // Mini résumé (emoji présents + €)
      const mini = document.createElement("div");
      mini.className = "cal-mini";
      // icônes actives
      for (const k of KINDS){
        if (!f[k]) continue;
        const v = Number(dayObj?.[k]||0);
        if (v>0){
          const dot = document.createElement("span");
          dot.className = "mini-dot";
          dot.title = `${EMOJI[k]} × ${v}`;
          dot.textContent = EMOJI[k];
          mini.appendChild(dot);
        }
      }
      if (cost>0){
        const eur = document.createElement("span");
        eur.className = "mini-euro";
        eur.title = `Coût: ${fmtMoney(cost, Scur.currency)}`;
        eur.textContent = "€";
        mini.appendChild(eur);
      }
      cell.appendChild(mini);

      // Click => détail
      cell.addEventListener("click", ()=> selectDay(iso));

      body.appendChild(cell);
    });

    elGrid.appendChild(body);

    // Détail: par défaut, aujourd'hui si visible sinon 1er du mois
    const firstIso = ymd(new Date(cur.getFullYear(),cur.getMonth(),1));
    selectDay(cells.some(c=>c.iso===nowIso && !c.other) ? nowIso : firstIso);
  }

  function selectDay(iso){
    const Scur = getState();
    const f = filters();
    const d = Scur.history?.[iso] || {};
    const dateObj = new Date(iso);
    elDetails.replaceChildren();

    const box = document.createElement("div");
    box.className = "cal-box";
    const h4 = document.createElement("h4");
    h4.textContent = dateObj.toLocaleDateString("fr-FR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" });
    box.appendChild(h4);

    // Summary 4 colonnes
    const sum = document.createElement("div");
    sum.className = "cal-summary";
    const addSum = (label, value) => {
      const dv = document.createElement("div");
      dv.innerHTML = `<strong>${label}</strong><br>${value}`;
      sum.appendChild(dv);
    };
    const qTotal = unitSumForDay(d, f);
    addSum("Total unités", qTotal);
    addSum("Coût", fmtMoney(Number(d.cost||0), Scur.currency));
    addSum("Économies", fmtMoney(Number(d.saved||0), Scur.currency));
    addSum("Modules actifs", Object.keys(filters()).filter(k=>filters()[k]).length);
    box.appendChild(sum);

    // Breakdown par type
    const details = document.createElement("div");
    details.className = "cal-breakdown";
    for (const k of KINDS){
      if (!f[k]) continue;
      const v = Number(d[k]||0);
      const chip = document.createElement("div");
      chip.className = "mini-dot";
      chip.style.display = "inline-block";
      chip.style.padding = ".15rem .45rem";
      chip.textContent = `${EMOJI[k]} ${v}`;
      details.appendChild(chip);
    }
    box.appendChild(details);

    // Liens rapides
    const links = document.createElement("div");
    links.className = "cal-links";
    const bStats = document.createElement("button");
    bStats.className="btn small"; bStats.textContent="Ouvrir Stats";
    bStats.addEventListener("click", ()=> showTab?.("stats"));
    const bHab = document.createElement("button");
    bHab.className="btn small"; bHab.textContent="Ouvrir Habitudes";
    bHab.addEventListener("click", ()=> showTab?.("habits"));
    links.appendChild(bStats); links.appendChild(bHab);
    box.appendChild(links);

    elDetails.appendChild(box);

    // Marque la sélection visuelle
    $$(".cal-cell").forEach(c=> c.classList.toggle("active", c.dataset.iso===iso));
  }

  function onNav(delta){
    cur = new Date(cur.getFullYear(), cur.getMonth()+delta, 1);
    renderMonth();
  }

  // Events
  elPrev?.addEventListener("click", ()=> onNav(-1));
  elNext?.addEventListener("click", ()=> onNav(1));
  $$('[data-cal-filter]').forEach(cb=> cb.addEventListener("change", ()=> renderMonth()));
  $("#cal-open-stats")?.addEventListener("click", ()=> showTab?.("stats"));
  $("#cal-open-habits")?.addEventListener("click", ()=> showTab?.("habits"));

  // First render
  renderMonth();

  return {
    update(Snew){ /* on re-render sans casser la navigation en cours */
      renderMonth();
    }
  };
}
