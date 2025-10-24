// web/js/stats.js  — Phase 2 (KPIs & cartes agrégées branchés)
// Hypothèse : state.js expose state.getAggregates(range)
//   -> retourne { cigarettes: number, joints: number, alcohol: number } pour 'day' | 'week' | 'month' | 'year'

const Stats = (() => {
  // --- Sélecteurs UI (conformes à ton index.html) ---
  const els = {
    // Range et titre
    rangeRoot:   document.getElementById('chartRange'),
    titre:       document.getElementById('stats-titre'),

    // Bloc KPI vert (3 lignes)
    kpiCigs:     document.getElementById('kpi-cigarettes-value'),
    kpiJoints:   document.getElementById('kpi-joints-value'),
    kpiAlcohol:  document.getElementById('kpi-alcohol-value'),

    // Carte agrégée (Total période)
    sumLabel:    document.getElementById('summary-card-period-label'),
    sumValue:    document.getElementById('summary-card-period-value'),

    // Bannière “Bilan …”
    lineCigs:    document.getElementById('stats-clopes'),
    lineJoints:  document.getElementById('stats-joints'),
    lineAlcohol: document.getElementById('stats-alcool'),

    // Bandeau KPI (tuiles) en haut de l’écran Stats
    todayTotal:  document.getElementById('todayTotal'),
    weekTotal:   document.getElementById('weekTotal'),
    monthTotal:  document.getElementById('monthTotal'),
    todayCost:   document.getElementById('todayCost'),        // placeholder Phase 3
    economies:   document.getElementById('economies-amount'),  // placeholder Phase 3
  };

  const rangeLabel = {
    day:   { titre: 'Bilan Jour',   sum: 'Total jour'   },
    week:  { titre: 'Bilan Semaine',sum: 'Total semaine'},
    month: { titre: 'Bilan Mois',   sum: 'Total mois'   },
    year:  { titre: 'Bilan Année',  sum: 'Total année'  },
  };

  const getActiveRange = () => {
    // lit le bouton .btn.pill.active dans #chartRange (géré aussi par charts.js)
    const activeBtn = els.rangeRoot?.querySelector('.btn.pill.active');
    return activeBtn?.dataset?.range || 'day';
  };

  const sumAgg = (agg) => (agg.cigarettes|0) + (agg.joints|0) + (agg.alcohol|0);

  // --- Rendu du bloc KPI vert + carte + bannière ---
  const renderForRange = (range) => {
    try {
      const agg = state.getAggregates(range); // {cigarettes,joints,alcohol}
      const total = sumAgg(agg);

      // Titre & carte
      els.titre && (els.titre.textContent = `${rangeLabel[range].titre} — Total ${total}`);
      els.sumLabel && (els.sumLabel.textContent = rangeLabel[range].sum);
      els.sumValue && (els.sumValue.textContent = String(total));

      // Bloc KPI vert (3 lignes)
      if (els.kpiCigs)    els.kpiCigs.textContent    = String(agg.cigarettes|0);
      if (els.kpiJoints)  els.kpiJoints.textContent  = String(agg.joints|0);
      if (els.kpiAlcohol) els.kpiAlcohol.textContent = String(agg.alcohol|0);

      // Bannière détails
      if (els.lineCigs)    els.lineCigs.textContent    = String(agg.cigarettes|0);
      if (els.lineJoints)  els.lineJoints.textContent  = String(agg.joints|0);
      if (els.lineAlcohol) els.lineAlcohol.textContent = String(agg.alcohol|0);
    } catch (e) {
      // Si la console debug est visible, on logue proprement
      const dbg = document.getElementById('debug-console');
      if (dbg) {
        dbg.classList.remove('hidden');
        dbg.textContent += `\n[stats] renderForRange(${range}) error: ${e?.message || e}`;
      }
      console.error('[stats] renderForRange error', e);
    }
  };

  // --- Rendu des 3 tuiles (jour/semaine/mois) en haut de l’écran Stats ---
  const renderHeaderTiles = () => {
    try {
      const d = state.getAggregates('day');
      const w = state.getAggregates('week');
      const m = state.getAggregates('month');

      if (els.todayTotal) els.todayTotal.textContent = String(sumAgg(d));
      if (els.weekTotal)  els.weekTotal.textContent  = String(sumAgg(w));
      if (els.monthTotal) els.monthTotal.textContent = String(sumAgg(m));

      // Coût & économies = Phase 3 (on laisse 0 €)
      if (els.todayCost)  els.todayCost.textContent  = '0 €';
      if (els.economies)  els.economies.textContent  = '0 €';
    } catch (e) {
      console.error('[stats] renderHeaderTiles error', e);
    }
  };

  // --- Rafraîchissement complet (appelé à l’ouverture de l’onglet et sur changement) ---
  const refresh = () => {
    const range = getActiveRange();
    renderForRange(range);
    renderHeaderTiles();
  };

  const attachListeners = () => {
    // 1) Changement d’onglet Jour/Semaine/Mois/Année
    if (els.rangeRoot) {
      els.rangeRoot.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.btn.pill[data-range]');
        if (!btn) return;

        // Laisser charts.js gérer l’état .active ; on lit juste l’état après petit délai
        requestAnimationFrame(() => refresh());
      });
    }

    // 2) Évènements globaux (si app.js / counters dispatchent)
    // On écoute plusieurs noms possibles sans effet de bord.
    ['sa:counts-updated', 'sa:data-changed', 'sa:range-changed', 'sa:screen-stats']
      .forEach(evt =>
        document.addEventListener(evt, () => refresh(), { passive: true })
      );
  };

  const init = () => {
    attachListeners();
    refresh();
  };

  return { init, refresh };
})();

// Expose pour app.js (si app.js fait un lazy-init à l’ouverture de l’onglet Stats)
export default Stats;
