/* web/js/state.js
   État centralisé compatible avec app.js ZIP #12/15
   Exports: LS_KEY, LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney
*/

// -------------------- Clés localStorage --------------------
export const LS_KEY = 'sa_app_state';
export const LS_AGE = 'sa_age_verified';

// -------------------- État par défaut --------------------
export const DefaultState = {
  // Devise
  currency: '€',
  
  // Modules activés
  modules: {
    cigs: false,
    weed: false,
    alcohol: false,
    beer: false,
    strong: false,
    liquor: false
  },
  
  // Prix unitaires (tout à 0 par défaut)
  prices: {
    cigs: 0,
    weed: 0,
    beer: 0,
    strong: 0,
    liquor: 0
  },
  
  // Données de consommation par jour
  data: {}, // Format: { "2024-11-05": { cigs: 5, weed: 2, beer: 1, strong: 0, liquor: 0 } }
  
  // Habitudes et objectifs
  habits: {
    goals: {
      cigs: { daily: 0, weekly: 0, monthly: 0 },
      weed: { daily: 0, weekly: 0, monthly: 0 },
      alcohol: { daily: 0, weekly: 0, monthly: 0 }
    },
    dates: {
      cigs: { reduce: '', stop: '', zero: '' },
      weed: { reduce: '', stop: '', zero: '' },
      alcohol: { reduce: '', stop: '', zero: '' }
    },
    triggers: [],
    replacements: [],
    progress: {}
  },
  
  // Limites quotidiennes
  limits: {
    cigs: 0,
    weed: 0,
    alcohol: 0
  },
  
  // Économies
  economy: {
    baseline: {},
    lastReset: null,
    cumulatedSavings: 0
  },
  
  // Langue
  lang: 'fr',
  
  // Statistiques
  stats: {
    startDate: null,
    totalDays: 0,
    achievements: []
  }
};

// -------------------- Chargement de l'état --------------------
export function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) {
      console.log('[state] Pas de données sauvegardées, utilisation des valeurs par défaut');
      return structuredClone(DefaultState);
    }
    
    const state = JSON.parse(saved);
    console.log('[state] État chargé depuis localStorage', state);
    
    // Migration si nécessaire
    const migrated = migrateState(state);
    return migrated;
  } catch (error) {
    console.error('[state] Erreur lors du chargement:', error);
    return structuredClone(DefaultState);
  }
}

// -------------------- Sauvegarde de l'état --------------------
export function saveState(state) {
  try {
    const toSave = structuredClone(state);
    localStorage.setItem(LS_KEY, JSON.stringify(toSave));
    console.log('[state] État sauvegardé dans localStorage');
    return true;
  } catch (error) {
    console.error('[state] Erreur lors de la sauvegarde:', error);
    return false;
  }
}

// -------------------- Migration de l'état --------------------
function migrateState(oldState) {
  const newState = structuredClone(DefaultState);
  
  // Copier les données existantes
  if (oldState.currency !== undefined) newState.currency = oldState.currency;
  if (oldState.lang !== undefined) newState.lang = oldState.lang;
  
  // Modules
  if (oldState.modules) {
    Object.assign(newState.modules, oldState.modules);
  }
  
  // Prix
  if (oldState.prices) {
    Object.assign(newState.prices, oldState.prices);
  }
  
  // Données de consommation
  if (oldState.data) {
    newState.data = oldState.data;
  }
  
  // Habitudes
  if (oldState.habits) {
    if (oldState.habits.goals) newState.habits.goals = oldState.habits.goals;
    if (oldState.habits.dates) newState.habits.dates = oldState.habits.dates;
    if (oldState.habits.triggers) newState.habits.triggers = oldState.habits.triggers;
    if (oldState.habits.replacements) newState.habits.replacements = oldState.habits.replacements;
    if (oldState.habits.progress) newState.habits.progress = oldState.habits.progress;
  }
  
  // Limites
  if (oldState.limits) {
    Object.assign(newState.limits, oldState.limits);
  }
  
  // Économies
  if (oldState.economy) {
    Object.assign(newState.economy, oldState.economy);
  }
  
  // Stats
  if (oldState.stats) {
    Object.assign(newState.stats, oldState.stats);
  }
  
  console.log('[state] Migration effectuée');
  return newState;
}

// -------------------- Utilitaires --------------------

// Obtenir la clé de date du jour (format YYYY-MM-DD)
export function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formater un montant avec la devise
export function fmtMoney(amount, currency = '€') {
  if (amount === 0) return `0,00${currency}`;
  
  // Arrondir à 2 décimales
  const rounded = Math.round(amount * 100) / 100;
  
  // Formater avec virgule comme séparateur décimal (format français)
  const formatted = rounded.toFixed(2).replace('.', ',');
  
  return `${formatted}${currency}`;
}

// -------------------- Fonction de calcul des coûts --------------------
export function calculateDayCost(dayData, prices) {
  if (!dayData || !prices) return 0;
  
  let total = 0;
  
  // Cigarettes
  if (dayData.cigs) {
    total += (dayData.cigs || 0) * (prices.cigs || 0);
  }
  
  // Joints
  if (dayData.weed) {
    total += (dayData.weed || 0) * (prices.weed || 0);
  }
  
  // Alcool
  if (dayData.beer) {
    total += (dayData.beer || 0) * (prices.beer || 0);
  }
  if (dayData.strong) {
    total += (dayData.strong || 0) * (prices.strong || 0);
  }
  if (dayData.liquor) {
    total += (dayData.liquor || 0) * (prices.liquor || 0);
  }
  
  return total;
}

// -------------------- Export pour compatibilité --------------------
console.log('[state.js] Module chargé avec exports: LS_KEY, LS_AGE, DefaultState, loadState, saveState, todayKey, fmtMoney, calculateDayCost');
