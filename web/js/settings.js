// web/js/settings.js
// STOPADDICT — Écran Réglages (modules, prix, langue, devise, profil)
// - Injecte un panneau complet dans #ecran-params
// - Sauvegarde via setSettings() et émet les évènements standards
// - Tolérant : fonctionne même si i18n/currency ne sont pas présents

"use strict";

import { getSettings, setSettings } from "./state.js";
import { getAvailable as i18nGetAvailable, setLang as i18nSetLang, getLang as i18nGetLang } from "./i18n.js";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function nz(n) {
  const v = Number.parseFloat(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function ensureShape(s) {
  s.enable_cigs   ??= true;
  s.enable_weed   ??= true;
  s.enable_alcohol??= true;
  s.enable_beer   ??= true;
  s.enable_strong ??= true;
  s.enable_liquor ??= true;
  s.prices   ??= { cig:0, weed:0, beer:0, strong:0, liquor:0 };
  s.baselines??= { cig:0, weed:0, beer:0, strong:0, liquor:0 };
  s.dates    ??= { quit_all:"", quit_cigs:"", quit_weed:"", quit_alcohol:"" };
  s.profile  ??= { name:"" };
  return s;
}

function currentCurrency() {
  try {
    if (window.SA_CURRENCY) {
      const g = window.SA_CURRENCY.get();
      return { symbol: g.symbol, position: g.position };
    }
  } catch {}
  return { symbol: "€", position: "after" };
}

function tpl(s, langs, curCurrency) {
  const langOptions = (langs || [{code:"fr",label:"Français"},{code:"en",label:"English"}])
    .map(({code,label}) => `<option value="${code}">${label || code}</option>`).join("");

  const alcoholDisabled = !s.enable_alcohol;
  const subDisabledAttr = alcoholDisabled ? "disabled" : "";

  return `
  <div class="card">
    <div class="title">Profil</div>
    <div class="grid-2" style="gap:.75rem">
      <label class="col">
        <span class="muted">Prénom (facultatif)</span>
        <input id="st-name" type="text" class="btn" placeholder="Ex. Nico" value="${s.profile?.name || ""}" />
      </label>
      <label class="col">
        <span class="muted">Langue</span>
        <select id="st-lang" class="btn">${langOptions}</select>
      </label>
    </div>
  </div>

  <div class="card">
    <div class="title">Devise (affichage)</div>
    <div class="grid-3" style="gap:.75rem">
      <label class="col">
        <span class="muted">Symbole</span>
        <input id="st-curr-symbol" type="text" class="btn" maxlength="6" value="${curCurrency.symbol}" />
      </label>
      <div class="col">
        <span class="muted">Position</span>
        <div class="row" style="gap:.5rem;align-items:center">
          <label><input type="radio" name="st-curr-pos" id="st-curr-before" ${curCurrency.position==="before"?"checked":""}/> Avant (ex: €12.00)</label>
          <label><input type="radio" name="st-curr-pos" id="st-curr-after"  ${curCurrency.position!=="before"?"checked":""}/> Après (ex: 12.00 €)</label>
        </div>
      </div>
      <div class="col">
        <span class="muted">Actions</span>
        <div class="row" style="gap:.5rem">
          <button id="btn-curr-apply" class="btn">Appliquer</button>
        </div>
      </div>
    </div>
    <p class="muted" style="margin-top:.5rem">Seul le <b>symbole</b> change. Les calculs restent identiques.</p>
  </div>

  <div class="card">
    <div class="title">Modules</div>
    <div class="grid-3" style="gap:.75rem">
      <label class="col"><input id="st-enable-cigs"   type="checkbox" ${s.enable_cigs? "checked":""}/> Cigarettes</label>
      <label class="col"><input id="st-enable-weed"   type="checkbox" ${s.enable_weed? "checked":""}/> Joints</label>
      <label class="col"><input id="st-enable-alcohol"type="checkbox" ${s.enable_alcohol? "checked":""}/> Alcool (global)</label>
    </div>
    <div class="grid-3" style="gap:.75rem; margin-top:.5rem">
      <label class="col"><input id="st-enable-beer"   type="checkbox" ${s.enable_beer? "checked":""} ${subDisabledAttr}/> Bière</label>
      <label class="col"><input id="st-enable-strong" type="checkbox" ${s.enable_strong? "checked":""} ${subDisabledAttr}/> Alcool fort</label>
      <label class="col"><input id="st-enable-liquor" type="checkbox" ${s.enable_liquor? "checked":""} ${subDisabledAttr}/> Liqueur</label>
    </div>
  </div>

  <div class="card">
    <div class="title">Prix unitaires</div>
    <div class="grid-5" style="gap:.75rem">
      <label class="col"><span class="muted">Cigarette</span>
        <input id="st-price-cig"    type="number" min="0" step="0.01" value="${nz(s.prices?.cig)}" class="btn"/>
      </label>
      <label class="col"><span class="muted">Joint</span>
        <input id="st-price-weed"   type="number" min="0" step="0.01" value="${nz(s.prices?.weed)}" class="btn"/>
      </label>
      <label class="col"><span class="muted">Bière</span>
        <input id="st-price-beer"   type="number" min="0" step="0.01" value="${nz(s.prices?.beer)}" class="btn" ${subDisabledAttr}/>
      </label>
      <label class="col"><span class="muted">Alcool fort</span>
        <input id="st-price-strong" type="number" min="0" step="0.01" value="${nz(s.prices?.strong)}" class="btn" ${subDisabledAttr}/>
      </label>
      <label class="col"><span class="muted">Liqueur</span>
        <input id="st-price-liquor" type="number" min="0" step="0.01" value="${nz(s.prices?.liquor)}" class="btn" ${subDisabledAttr}/>
      </label>
    </div>
    <div class="row" style="gap:.5rem; margin-top:.75rem">
      <button id="btn-save-settings" class="btn">Enregistrer</button>
      <button id="btn-reset-prices"  class="btn">Réinitialiser prix</button>
    </div>
    <p class="muted" style="margin-top:.5rem">Astuce : renseigner les prix permet des coûts/économies plus parlants.</p>
  </div>
  `;
}

async function render() {
  const host = document.getElementById("ecran-params");
  if (!host) return;

  const s = ensureShape({ ...getSettings() });
  let langs = [];
  try { langs = await i18nGetAvailable(); } catch { langs = []; }
  const curCurrency = currentCurrency();

  host.innerHTML = tpl(s, langs, curCurrency);

  // Sélection de langue : positionner la valeur
  const selLang = $("#st-lang", host);
  if (selLang) {
    const cur = (s.lang || i18nGetLang() || "fr");
    if ([...selLang.options].some(o => o.value === cur)) selLang.value = cur;
  }

  bind(host);
}

function bind(root) {
  // --- PROFIL / LANGUE ---
  const nameInp = $("#st-name", root);
  const langSel = $("#st-lang", root);
  if (langSel) {
    langSel.addEventListener("change", async () => {
      const code = langSel.value || "fr";
      setSettings({ lang: code });
      try { await i18nSetLang(code); } catch {}
    });
  }
  if (nameInp) {
    nameInp.addEventListener("change", () => {
      setSettings({ profile: { name: nameInp.value.trim() } });
    });
  }

  // --- CURRENCY ---
  const sym = $("#st-curr-symbol", root);
  const posBefore = $("#st-curr-before", root);
  const posAfter  = $("#st-curr-after", root);
  const btnCurr   = $("#btn-curr-apply", root);

  if (btnCurr) {
    btnCurr.addEventListener("click", () => {
      try {
        if (window.SA_CURRENCY) {
          const position = posBefore?.checked ? "before" : "after";
          window.SA_CURRENCY.set({ symbol: (sym?.value || "€").trim(), position });
        }
      } catch {}
    });
  }

  // --- MODULES ---
  const cbCigs   = $("#st-enable-cigs", root);
  const cbWeed   = $("#st-enable-weed", root);
  const cbAlc    = $("#st-enable-alcohol", root);
  const cbBeer   = $("#st-enable-beer", root);
  const cbStrong = $("#st-enable-strong", root);
  const cbLiquor = $("#st-enable-liquor", root);

  function syncSubAlcoholDisabled(disabled) {
    [cbBeer, cbStrong, cbLiquor].forEach(el => {
      if (!el) return;
      el.disabled = !!disabled;
    });
    ["#st-price-beer", "#st-price-strong", "#st-price-liquor"].forEach(sel => {
      const el = $(sel, root);
      if (el) el.disabled = !!disabled;
    });
  }

  if (cbAlc) {
    cbAlc.addEventListener("change", () => {
      const enable_alcohol = !!cbAlc.checked;
      setSettings({ enable_alcohol });
      syncSubAlcoholDisabled(!enable_alcohol);
    });
  }
  if (cbCigs) cbCigs.addEventListener("change", () => setSettings({ enable_cigs: !!cbCigs.checked }));
  if (cbWeed) cbWeed.addEventListener("change", () => setSettings({ enable_weed: !!cbWeed.checked }));
  if (cbBeer) cbBeer.addEventListener("change", () => setSettings({ enable_beer: !!cbBeer.checked }));
  if (cbStrong) cbStrong.addEventListener("change", () => setSettings({ enable_strong: !!cbStrong.checked }));
  if (cbLiquor) cbLiquor.addEventListener("change", () => setSettings({ enable_liquor: !!cbLiquor.checked }));

  // Init état disabled des sous-modules alcool
  syncSubAlcoholDisabled(!(cbAlc?.checked));

  // --- PRIX ---
  const pCig    = $("#st-price-cig", root);
  const pWeed   = $("#st-price-weed", root);
  const pBeer   = $("#st-price-beer", root);
  const pStrong = $("#st-price-strong", root);
  const pLiquor = $("#st-price-liquor", root);

  const btnSave = $("#btn-save-settings", root);
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      setSettings({
        prices: {
          cig:    nz(pCig?.value),
          weed:   nz(pWeed?.value),
          beer:   nz(pBeer?.value),
          strong: nz(pStrong?.value),
          liquor: nz(pLiquor?.value),
        }
      });
    });
  }

  const btnResetPrices = $("#btn-reset-prices", root);
  if (btnResetPrices) {
    btnResetPrices.addEventListener("click", () => {
      setSettings({ prices: { cig:0, weed:0, beer:0, strong:0, liquor:0 } });
      // rafraîchir visuel
      if (pCig)    pCig.value = "0";
      if (pWeed)   pWeed.value = "0";
      if (pBeer)   pBeer.value = "0";
      if (pStrong) pStrong.value = "0";
      if (pLiquor) pLiquor.value = "0";
    });
  }
}

/* ---------- API publique ---------- */
export function initSettings() {
  render();

  // Se re-rendre quand la langue change (libellés)
  document.addEventListener("sa:lang-changed", () => render());

  // Si d’autres modules modifient les réglages, refléter ici
  document.addEventListener("sa:state-changed", (e) => {
    const src = e?.detail?.source || "";
    // Éviter boucle : on rerend large (léger, c’est un écran)
    if (src !== "settings") render();
  });

  // Rafraîchir si on arrive sur l’onglet Réglages
  const nav = document.getElementById("nav-params");
  if (nav) nav.addEventListener("click", () => setTimeout(render, 0));
}

export default { initSettings };
