/* ============================================================
   StopAddict v3 — settings.js
   Écran Réglages (profil, modules, tarifs, suivi, légal, import/export)
   Fidèle au monolith d’exemple
   ============================================================ */
(function () {
  "use strict";

  const $root = () => document.getElementById("settings-root");

  /* ---------- RENDU UI ---------- */
  function render() {
    const S = window.S;
    if (!S) return;

    $root().innerHTML = `
      <div class="card panel">
        <h3>Profil & Région</h3>
        <div class="grid-2">
          <label>Prénom (facultatif)
            <input id="set-name" type="text" placeholder="Ex: Nico" value="${esc(S.profile.name)}">
          </label>
          <label>Âge
            <input id="set-age" type="number" min="10" max="99" value="${S.identity.age ?? ''}">
          </label>
          <label>Langue
            <select id="set-lang">
              <option value="fr" ${S.profile.lang === 'fr' ? 'selected' : ''}>Français</option>
              <option value="en" ${S.profile.lang === 'en' ? 'selected' : ''}>English</option>
            </select>
          </label>
          <label>Devise
            <select id="set-currency">
              ${currencyOptions(S.profile.currency)}
            </select>
          </label>
          <label>Position symbole
            <select id="set-currencyPos">
              <option value="before" ${S.profile.currencyPos === 'before' ? 'selected' : ''}>Avant</option>
              <option value="after" ${S.profile.currencyPos === 'after' ? 'selected' : ''}>Après</option>
            </select>
          </label>
        </div>
      </div>

      <div class="card panel">
        <h3>Modules disponibles</h3>
        <div class="grid-3">
          ${moduleCheck("cigs","Cigarettes", S.modules.cigs)}
          ${moduleCheck("joints","Joints", S.modules.joints)}
          ${moduleCheck("alcohol","Alcool (global)", S.modules.alcohol)}
          ${moduleCheck("beer","Bière", S.modules.beer)}
          ${moduleCheck("hard","Alcools forts", S.modules.hard)}
          ${moduleCheck("liqueur","Liqueur", S.modules.liqueur)}
        </div>
        <small>Règle monolith : Alcool (global) est exclusif avec Bière / Fort / Liqueur.</small>
      </div>

      <div class="card panel">
        <h3>Tarifs (unité)</h3>
        <div class="grid-3">
          ${priceInput("cigs","Cigarette", S.prices.cigs)}
          ${priceInput("joints","Joint", S.prices.joints)}
          ${priceInput("beer","Bière", S.prices.beer)}
          ${priceInput("hard","Fort", S.prices.hard)}
          ${priceInput("liqueur","Liqueur", S.prices.liqueur)}
          ${priceInput("alcohol","Alcool (glob.)", S.prices.alcohol)}
        </div>
        <small>Le graphe “Coûts & Économies” n’affiche des coûts que si des tarifs sont renseignés.</small>
      </div>

      <div class="card panel">
        <h3>Suivi depuis</h3>
        <div class="grid-3">
          ${sinceInput("cigs","Suivi clopes depuis", S.enabled_since.cigs)}
          ${sinceInput("joints","Suivi joints depuis", S.enabled_since.joints)}
          ${sinceInput("alcohol","Suivi alcool depuis", S.enabled_since.alcohol)}
        </div>
      </div>

      <div class="card panel">
        <h3>Habitudes / Objectifs & Arrêt</h3>
        <div class="grid-4">
          ${goalInput("cigs","Objectif clopes / jour", S.habits.goal.cigs)}
          ${goalInput("joints","Objectif joints / jour", S.habits.goal.joints)}
          ${goalInput("alcohol","Objectif alcool / jour", S.habits.goal.alcohol)}
          <label>Date d’arrêt (générale)
            <input id="set-stopDate" type="date" value="${S.habits.stopDate ?? ''}">
          </label>
        </div>
      </div>

      <div class="card panel">
        <h3>Santé • Majorité • Légal • Manuels • Numéros utiles</h3>
        <div class="grid-2">
          <label>
            <input id="set-isAdult" type="checkbox" ${S.identity.isAdult ? 'checked' : ''}>
            J’atteste avoir plus de 18 ans
          </label>
          <label>
            <input id="set-acceptCGU" type="checkbox" ${S.legal.acceptedCGU ? 'checked' : ''}>
            J’accepte les <a href="./docs/CGU.pdf" target="_blank">CGU</a>
          </label>
        </div>
        <div class="legal-links">
          <a href="./docs/CGU.pdf" target="_blank">CGU</a>
          <a href="./docs/CGV.pdf" target="_blank">CGV</a>
          <a href="./docs/Mentions.pdf" target="_blank">Mentions légales</a>
          <a href="./docs/Manuel.pdf" target="_blank">Manuel utilisateur</a>
          <a href="https://www.tabac-info-service.fr" target="_blank">Tabac Info Service</a>
          <a href="https://www.alcool-info-service.fr" target="_blank">Alcool Info Service</a>
          <a href="https://www.drogues-info-service.fr" target="_blank">Drogues Info Service</a>
          <a href="tel:112">Urgence 112</a>
        </div>
        <div style="margin-top:.6rem">
          <button id="btn-verify-identity">Vérifier identité / majorité</button>
        </div>
      </div>

      <div class="card panel">
        <h3>Données</h3>
        <div class="flex">
          <button id="btn-export">Exporter TOUT (.json)</button>
          <label class="file-btn">
            Importer TOUT (.json)
            <input id="file-import" type="file" accept="application/json" hidden>
          </label>
        </div>
      </div>
    `;

    bindEvents();
  }

  /* ---------- ÉVÉNEMENTS ---------- */
  function bindEvents() {
    const S = window.S;

    // Profil & région
    onInput("#set-name", v => update(s => s.profile.name = v));
    onInput("#set-age", v => update(s => s.identity.age = parseNumOrNull(v)));
    onChange("#set-lang", v => update(s => s.profile.lang = v));
    onChange("#set-currency", v => update(s => s.profile.currency = v));
    onChange("#set-currencyPos", v => update(s => s.profile.currencyPos = v));

    // Modules disponibles (règle monolith alcool exclusif gérée dans ensureCoherence)
    ["cigs","joints","alcohol","beer","hard","liqueur"].forEach(k => {
      onChange(`#mod-${k}`, checked => update(s => s.modules[k] = !!checked));
    });

    // Tarifs
    ["cigs","joints","beer","hard","liqueur","alcohol"].forEach(k => {
      onInput(`#price-${k}`, v => update(s => s.prices[k] = parseFloat(v || 0)));
    });

    // Suivi depuis
    onChange("#since-cigs", v => update(s => s.enabled_since.cigs = v || null));
    onChange("#since-joints", v => update(s => s.enabled_since.joints = v || null));
    onChange("#since-alcohol", v => update(s => s.enabled_since.alcohol = v || null));

    // Habitudes
    onInput("#goal-cigs", v => update(s => s.habits.goal.cigs = parseNumOrNull(v)));
    onInput("#goal-joints", v => update(s => s.habits.goal.joints = parseNumOrNull(v)));
    onInput("#goal-alcohol", v => update(s => s.habits.goal.alcohol = parseNumOrNull(v)));
    onChange("#set-stopDate", v => update(s => s.habits.stopDate = v || null));

    // Légal & majorité
    onChange("#set-isAdult", checked => update(s => s.identity.isAdult = !!checked));
    onChange("#set-acceptCGU", checked => update(s => s.legal.acceptedCGU = !!checked));
    onClick("#btn-verify-identity", () => {
      if (typeof window.showIdentityDialog === "function") window.showIdentityDialog();
    });

    // Import / Export
    onClick("#btn-export", () => window.StopAddictState.exportAll());
    const file = document.querySelector("#file-import");
    file.addEventListener("click", () => (file.value = "")); // reset for same-file reimport
    file.addEventListener("change", e => {
      const f = e.target.files?.[0];
      if (!f) return;
      window.StopAddictState.importAll(f, ok => {
        if (!ok) alert("Import invalide.");
      });
    });
  }

  /* ---------- HELPERS DOM ---------- */
  function onInput(sel, fn) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener("input", e => fn(e.target.value));
  }
  function onChange(sel, fn) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener("change", e => {
      const t = e.target;
      fn(t.type === "checkbox" ? t.checked : t.value);
    });
  }
  function onClick(sel, fn) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener("click", fn);
  }
  function update(mut) {
    window.StopAddictState.updateState(mut);
  }
  function parseNumOrNull(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  /* ---------- FRAGMENTS UI ---------- */
  function moduleCheck(key, label, checked) {
    return `
      <label><input id="mod-${key}" type="checkbox" ${checked ? "checked" : ""}> ${label}</label>
    `;
  }
  function priceInput(key, label, value) {
    return `
      <label>${label}
        <input id="price-${key}" type="number" step="0.01" min="0" value="${value ?? 0}">
      </label>
    `;
  }
  function sinceInput(key, label, value) {
    return `
      <label>${label}
        <input id="since-${key}" type="date" value="${value ?? ""}">
      </label>
    `;
  }
  function goalInput(key, label, value) {
    return `
      <label>${label}
        <input id="goal-${key}" type="number" min="0" value="${value ?? ""}">
      </label>
    `;
  }
  function currencyOptions(current) {
    const list = [
      ["EUR","Euro €"], ["USD","US $"], ["GBP","Pound £"], ["CHF","Swiss Fr"],
      ["CAD","Canadian $"], ["AUD","Australian $"]
    ];
    return list.map(([code, name]) =>
      `<option value="${code}" ${current === code ? "selected" : ""}>${name}</option>`
    ).join("");
  }

  /* ---------- API publique ---------- */
  window.Settings = { render };

  // Auto-render quand on arrive sur la page Réglages
  document.addEventListener("DOMContentLoaded", () => {
    const page = document.getElementById("page-settings");
    if (page && !page.hasAttribute("hidden")) render();
  });
  // Re-render à chaque rafraîchissement global (navigation / changements)
  window.addEventListener("sa:render-settings", render);
})();
