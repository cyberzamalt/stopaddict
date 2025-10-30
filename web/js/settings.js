// web/js/settings.js
// STOPADDICT — Écran Réglages (zéro par défaut)
// But : afficher/renseigner les options (modules, sous-modules alcool, prix, baselines) et les persister.
// Dépendances : ./state.js (source de vérité)

import {
  getSettings,
  setSettings,
} from './state.js';

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function toNumber(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function templateHTML() {
  return `
    <div class="sa-settings space-y-6">
      <!-- Modules -->
      <section class="card">
        <h3>Modules</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
          <label class="flex items-center gap-8">
            <input id="chk-enable-cigs" type="checkbox" />
            <span>Cigarettes</span>
          </label>
          <label class="flex items-center gap-8">
            <input id="chk-enable-weed" type="checkbox" />
            <span>Joints</span>
          </label>
          <label class="flex items-center gap-8">
            <input id="chk-enable-alcohol" type="checkbox" />
            <span>Alcool (global)</span>
          </label>
        </div>

        <div id="block-sub-alcohol" class="mt-16 pl-8 border-l">
          <div class="text-sm opacity-80 mb-8">Sous-modules alcool (activables depuis Réglages et Accueil)</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
            <label class="flex items-center gap-8">
              <input id="chk-enable-beer" type="checkbox" />
              <span>Bière</span>
            </label>
            <label class="flex items-center gap-8">
              <input id="chk-enable-strong" type="checkbox" />
              <span>Alcool fort</span>
            </label>
            <label class="flex items-center gap-8">
              <input id="chk-enable-liquor" type="checkbox" />
              <span>Liqueur</span>
            </label>
          </div>
        </div>
      </section>

      <!-- Prix unitaires -->
      <section class="card">
        <h3>Prix unitaires (€)</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-12">
          <label class="flex items-center gap-8">
            <span class="w-40">Cigarette</span>
            <input id="price-cigs" type="number" step="0.01" inputmode="decimal" class="input" placeholder="0,00" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Joint</span>
            <input id="price-weed" type="number" step="0.01" inputmode="decimal" class="input" placeholder="0,00" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Bière</span>
            <input id="price-beer" type="number" step="0.01" inputmode="decimal" class="input" placeholder="0,00" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Alcool fort</span>
            <input id="price-strong" type="number" step="0.01" inputmode="decimal" class="input" placeholder="0,00" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Liqueur</span>
            <input id="price-liquor" type="number" step="0.01" inputmode="decimal" class="input" placeholder="0,00" />
          </label>
        </div>
      </section>

      <!-- Baselines / Objectifs par jour -->
      <section class="card">
        <h3>Objectifs / Baselines (par jour)</h3>
        <div class="grid grid-cols-1 md:grid-cols-5 gap-12">
          <label class="flex items-center gap-8">
            <span class="w-40">Cigarette</span>
            <input id="base-cigs" type="number" step="1" inputmode="numeric" class="input" placeholder="0" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Joint</span>
            <input id="base-weed" type="number" step="1" inputmode="numeric" class="input" placeholder="0" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Bière</span>
            <input id="base-beer" type="number" step="1" inputmode="numeric" class="input" placeholder="0" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Alcool fort</span>
            <input id="base-strong" type="number" step="1" inputmode="numeric" class="input" placeholder="0" />
          </label>
          <label class="flex items-center gap-8">
            <span class="w-40">Liqueur</span>
            <input id="base-liquor" type="number" step="1" inputmode="numeric" class="input" placeholder="0" />
          </label>
        </div>
        <div class="text-xs opacity-70 mt-8">
          Astuce : Les économies affichées comparent ces objectifs à vos consommations réelles, et uniquement pour les catégories actives.
        </div>
      </section>
    </div>
  `;
}

function refreshUI(root) {
  const s = getSettings();

  // Modules
  $('#chk-enable-cigs', root).checked = !!s.enable_cigs;
  $('#chk-enable-weed', root).checked = !!s.enable_weed;
  $('#chk-enable-alcohol', root).checked = !!s.enable_alcohol;

  // Sous-modules alcool
  $('#chk-enable-beer', root).checked = !!s.enable_beer;
  $('#chk-enable-strong', root).checked = !!s.enable_strong;
  $('#chk-enable-liquor', root).checked = !!s.enable_liquor;

  // Prix
  $('#price-cigs', root).value   = s.prices?.cig ?? 0;
  $('#price-weed', root).value   = s.prices?.weed ?? 0;
  $('#price-beer', root).value   = s.prices?.beer ?? 0;
  $('#price-strong', root).value = s.prices?.strong ?? 0;
  $('#price-liquor', root).value = s.prices?.liquor ?? 0;

  // Baselines
  $('#base-cigs', root).value   = s.baselines?.cig ?? 0;
  $('#base-weed', root).value   = s.baselines?.weed ?? 0;
  $('#base-beer', root).value   = s.baselines?.beer ?? 0;
  $('#base-strong', root).value = s.baselines?.strong ?? 0;
  $('#base-liquor', root).value = s.baselines?.liquor ?? 0;

  // Accessibilité des sous-modules alcool
  enableAlcoholSubsection(root, !!s.enable_alcohol);
}

function enableAlcoholSubsection(root, enabled) {
  const sub = $('#block-sub-alcohol', root);
  sub.style.opacity = enabled ? '1' : '0.5';

  const toggles = [
    '#chk-enable-beer',
    '#chk-enable-strong',
    '#chk-enable-liquor',
  ];

  toggles.forEach(id => {
    const el = $(id, root);
    el.disabled = !enabled;
  });
}

function bindEvents(root) {
  // Modules
  $('#chk-enable-cigs', root).addEventListener('change', (e) => {
    setSettings({ enable_cigs: !!e.target.checked });
  });

  $('#chk-enable-weed', root).addEventListener('change', (e) => {
    setSettings({ enable_weed: !!e.target.checked });
  });

  $('#chk-enable-alcohol', root).addEventListener('change', (e) => {
    const val = !!e.target.checked;
    setSettings({ enable_alcohol: val });
    // Activer/désactiver visuel sous-modules
    enableAlcoholSubsection(root, val);
    // Si OFF, state.setSettings() remettra aussi beer/strong/liquor à false (cohérence)
    refreshUI(root);
  });

  // Sous-modules alcool
  $('#chk-enable-beer', root).addEventListener('change', (e) => {
    setSettings({ enable_beer: !!e.target.checked });
  });
  $('#chk-enable-strong', root).addEventListener('change', (e) => {
    setSettings({ enable_strong: !!e.target.checked });
  });
  $('#chk-enable-liquor', root).addEventListener('change', (e) => {
    setSettings({ enable_liquor: !!e.target.checked });
  });

  // Prix
  $('#price-cigs', root).addEventListener('input', (e) => {
    setSettings({ prices: { cig: toNumber(e.target.value) } });
  });
  $('#price-weed', root).addEventListener('input', (e) => {
    setSettings({ prices: { weed: toNumber(e.target.value) } });
  });
  $('#price-beer', root).addEventListener('input', (e) => {
    setSettings({ prices: { beer: toNumber(e.target.value) } });
  });
  $('#price-strong', root).addEventListener('input', (e) => {
    setSettings({ prices: { strong: toNumber(e.target.value) } });
  });
  $('#price-liquor', root).addEventListener('input', (e) => {
    setSettings({ prices: { liquor: toNumber(e.target.value) } });
  });

  // Baselines
  $('#base-cigs', root).addEventListener('input', (e) => {
    setSettings({ baselines: { cig: Math.max(0, Math.trunc(toNumber(e.target.value))) } });
  });
  $('#base-weed', root).addEventListener('input', (e) => {
    setSettings({ baselines: { weed: Math.max(0, Math.trunc(toNumber(e.target.value))) } });
  });
  $('#base-beer', root).addEventListener('input', (e) => {
    setSettings({ baselines: { beer: Math.max(0, Math.trunc(toNumber(e.target.value))) } });
  });
  $('#base-strong', root).addEventListener('input', (e) => {
    setSettings({ baselines: { strong: Math.max(0, Math.trunc(toNumber(e.target.value))) } });
  });
  $('#base-liquor', root).addEventListener('input', (e) => {
    setSettings({ baselines: { liquor: Math.max(0, Math.trunc(toNumber(e.target.value))) } });
  });
}

// -------- API publique --------
export function initSettings() {
  const root = document.getElementById('ecran-params');
  if (!root) {
    console.error('[settings.init] #ecran-params introuvable');
    return;
  }
  // Injecter le template si vide
  if (!root.firstElementChild) {
    root.innerHTML = templateHTML();
  }
  refreshUI(root);
  bindEvents(root);
}

// Optionnel : exposer pour debug
try { window.SA_SETTINGS = { initSettings }; } catch {}
