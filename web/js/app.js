/* ============================================================
   app.css — v2.4.4 PHASE 2
   ============================================================
   Corrections :
   1. Console debug lisible (140px min, scrollable)
   2. Boutons export non superposés (flex wrap)
   3. Graphiques alignés (même largeur, padding identiques)
   4. CSS scopé Stats uniquement (pas d'impact Accueil/Habitudes)
   ============================================================ */

/* ============================================================
   1) Masquer zones anciennes (bandeau résumé bas)
   ============================================================ */
#bandeau-resume,
.footer-summary,
.summary-footer,
.calc-footer {
  display: none !important;
}

/* ============================================================
   2) CONSOLE DEBUG LISIBLE (Phase 2 - Fix)
   ============================================================ */
#debug-console {
  position: fixed;
  top: 64px; /* Sous le header */
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100vw;
  min-height: 140px;
  max-height: 50vh;
  background: rgba(0, 0, 0, 0.95);
  color: #0f0;
  font-family: "Courier New", monospace;
  font-size: 11px;
  line-height: 1.4;
  padding: 12px;
  z-index: 9999;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
  border-bottom: 2px solid #0f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

#debug-console.hidden {
  display: none;
}

/* Mobile : hauteur adaptée */
@media (max-width: 480px) {
  #debug-console {
    font-size: 10px;
    min-height: 120px;
    max-height: 40vh;
  }
}

/* ============================================================
   3) STATS - Conteneur principal avec padding-bottom
   ============================================================ */
#ecran-stats {
  padding-bottom: 120px; /* Espace pour les boutons export */
}

/* ============================================================
   4) STATS - Bloc KPI vert (3 lignes : Cigarettes/Joints/Alcool)
   ============================================================ */
.stats .kpi-block {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
}

.stats .kpi-block h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2e7d32;
}

.stats .kpi-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #c8e6c9;
}

.stats .kpi-line:last-child {
  border-bottom: none;
}

.stats .kpi-line.disabled {
  opacity: 0.4;
  color: #9e9e9e;
}

.stats .kpi-label {
  font-size: 13px;
  font-weight: 500;
}

.stats .kpi-value {
  font-size: 16px;
  font-weight: 700;
  color: #1b5e20;
}

.stats .kpi-line.disabled .kpi-value {
  color: #9e9e9e;
}

/* ============================================================
   5) STATS - Cartes agrégées (Total jour/semaine/mois)
   ============================================================ */
.stats .summary-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.stats .summary-card {
  flex: 1;
  min-width: 120px;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.stats .summary-card-label {
  font-size: 11px;
  color: #757575;
  margin-bottom: 4px;
}

.stats .summary-card-value {
  font-size: 20px;
  font-weight: 700;
  color: #1976d2;
}

@media (max-width: 480px) {
  .stats .summary-cards {
    flex-direction: column;
  }
  
  .stats .summary-card {
    min-width: unset;
  }
}

/* ============================================================
   6) STATS - Graphiques (alignement et hauteur fixes)
   ============================================================ */
.stats .chart-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stats .chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #424242;
  margin-bottom: 12px;
  text-align: center;
}

.stats .chart-wrapper {
  position: relative;
  width: 100%;
  height: 280px; /* Hauteur fixe identique pour les 2 graphes */
  margin: 0 auto;
}

/* Canvas des graphes */
.stats #chart-consommations,
.stats #chart-cout-eco {
  max-height: 280px !important;
  width: 100% !important;
  height: 280px !important;
}

/* Mobile : hauteur réduite */
@media (max-width: 480px) {
  .stats .chart-wrapper {
    height: 240px;
  }
  
  .stats #chart-consommations,
  .stats #chart-cout-eco {
    max-height: 240px !important;
    height: 240px !important;
  }
}

/* ============================================================
   7) STATS - Boutons d'export (non superposés, flex wrap)
   ============================================================ */
.stats .chart-actions,
.stats .stats-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
  margin-top: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.stats .chart-actions button,
.stats .stats-actions button {
  flex: 1 1 auto;
  min-width: 140px;
  padding: 11px 14px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stats .chart-actions button:hover,
.stats .stats-actions button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

/* Mobile : boutons empilés verticalement */
@media (max-width: 480px) {
  .stats .chart-actions,
  .stats .stats-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .stats .chart-actions button,
  .stats .stats-actions button {
    width: 100%;
    min-width: unset;
  }
}

/* ============================================================
   8) STATS - Onglets de période (Jour/Semaine/Mois/Année)
   ============================================================ */
.stats #chartRange {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.stats #chartRange .btn.pill {
  flex: 1 1 auto;
  min-width: 80px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.stats #chartRange .btn.pill.active {
  background: #1976d2;
  color: #fff;
  box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);
}

@media (max-width: 480px) {
  .stats #chartRange {
    gap: 6px;
  }
  
  .stats #chartRange .btn.pill {
    min-width: 70px;
    padding: 8px 12px;
    font-size: 12px;
  }
}

/* ============================================================
   9) Zones générales (non scopées Stats) - Inchangées
   ============================================================ */
/* Ces règles restent globales car elles ne concernent pas Stats */

/* Fin du fichier */
