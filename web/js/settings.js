/* ============================================================
   StopAddict v3 — settings.js
   Panneau Réglages COMPLET (profil, modules, tarifs, légal, data)
   ============================================================ */

window.Settings = (function () {

  const root = document.getElementById("settings-root");
  if (!root) return { init(){}, refresh(){} };

  /* ---------- HELPERS ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }
  function label(key, content) {
    return `<label><span>${i18n(key)}</span>${content}</label>`;
  }
  function i18n(k) {
    return window.I18N?.get(k) || k;
  }

  /* ---------- SECTIONS ---------- */
  function renderProfile(S) {
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titleProfile")}</h3>
      <div class="settings-row">

        ${label("settings.name", `<input id="st-name" type="text" value="${S.profile.name||""}">`)}

        ${label("settings.age", `<input id="st-age" type="number" min="0" value="${S.identity.age||""}">`)}

        ${label("settings.lang", `
          <select id="st-lang">
            <option value="fr" ${S.profile.lang==="fr"?"selected":""}>Français</option>
            <option value="en" ${S.profile.lang==="en"?"selected":""}>English</option>
          </select>
        `)}

        ${label("settings.currency", `
          <input id="st-currency" type="text" value="${S.profile.currency}">
        `)}

        ${label("settings.currencyPos", `
          <select id="st-currencyPos">
            <option value="before" ${S.profile.currencyPos==="before"?"selected":""}>${i18n("settings.before")}</option>
            <option value="after"  ${S.profile.currencyPos==="after" ?"selected":""}>${i18n("settings.after")}</option>
          </select>
        `)}

      </div>
    `;
    return card;
  }

  function renderModules(S) {
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titleModules")}</h3>

      ${moduleCheckbox("cigs", S.modules.cigs)}
      ${moduleCheckbox("joints", S.modules.joints)}
      ${moduleCheckbox("alcohol", S.modules.alcohol)}
      ${moduleCheckbox("beer", S.modules.beer)}
      ${moduleCheckbox("hard", S.modules.hard)}
      ${moduleCheckbox("liqueur", S.modules.liqueur)}

      <div class="settings-note">${i18n("settings.noteAlcoholRule")}</div>
    `;
    return card;
  }

  function moduleCheckbox(key, value) {
    return `
      <div class="settings-module-toggle">
        <input type="checkbox" id="st-mod-${key}" ${value?"checked":""}>
        <label for="st-mod-${key}">${i18n("counters."+key)}</label>
      </div>
    `;
  }

  function renderPrices(S) {
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titlePrices")}</h3>
      <div class="settings-row">
        ${priceInput("cigs", S.prices.cigs)}
        ${priceInput("joints", S.prices.joints)}
        ${priceInput("beer", S.prices.beer)}
        ${priceInput("hard", S.prices.hard)}
        ${priceInput("liqueur", S.prices.liqueur)}
        ${priceInput("alcohol", S.prices.alcohol)}
      </div>
    `;
    return card;
  }
  function priceInput(key,val){
    return label("counters."+key, `<input id="st-price-${key}" type="number" step="0.01" value="${val||""}">`);
  }

  function renderSince(S) {
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titleSince")}</h3>
      <div class="settings-row">
        ${sinceInput("cigs", S.enabled_since.cigs)}
        ${sinceInput("joints", S.enabled_since.joints)}
        ${sinceInput("alcohol", S.enabled_since.alcohol)}
      </div>
    `;
    return card;
  }
  function sinceInput(key,val){
    return label("settings.sinceKey".replace("{key}",key),
      `<input id="st-since-${key}" type="date" value="${val||""}">`);
  }

  function renderHabits(S){
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titleHabits")}</h3>
      <div class="settings-row">
        ${goalInput("cigs", S.habits.goal.cigs)}
        ${goalInput("joints", S.habits.goal.joints)}
        ${goalInput("alcohol", S.habits.goal.alcohol)}
      </div>
      <label>${i18n("settings.stopDate")}
        <input id="st-stopDate" type="date" value="${S.habits.stopDate||""}">
      </label>
    `;
    return card;
  }
  function goalInput(key,val){
    return label("settings.goalPerDay".replace("{key}",key),
      `<input id="st-goal-${key}" type="number" min="0" value="${val||""}">`);
  }

  function renderLegal(S) {
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titleLegal")}</h3>

      <label>
        <input type="checkbox" id="st-adult" ${S.identity.isAdult?"checked":""}>
        ${i18n("settings.isAdult")}
      </label>

      <label>
        <input type="checkbox" id="st-cgu" ${S.legal.acceptedCGU?"checked":""}>
        ${i18n("settings.acceptCGU")}
      </label>

      <div class="settings-legal-links">
        <button onclick="window.open('./docs/CGU.pdf')">${i18n("legal.cgu")}</button>
        <button onclick="window.open('./docs/CGV.pdf')">${i18n("legal.cgv")}</button>
        <button onclick="window.open('./docs/Mentions.pdf')">${i18n("legal.mentions")}</button>
        <button onclick="window.open('./docs/Manuel.pdf')">${i18n("legal.manual")}</button>
        <button onclick="window.open('https://www.tabac-info-service.fr')">${i18n("legal.helpTabac")}</button>
        <button onclick="window.open('https://www.alcool-info-service.fr')">${i18n("legal.helpAlcool")}</button>
        <button onclick="window.open('https://www.drogues-info-service.fr')">${i18n("legal.helpDrugs")}</button>
        <button onclick="window.open('tel:112')">${i18n("legal.emergency")}</button>
      </div>

      <button id="st-verify">${i18n("settings.verifyIdentity")}</button>
    `;
    return card;
  }

  function renderData(S){
    const card = el("div","settings-card");
    card.innerHTML = `
      <h3>${i18n("settings.titleData")}</h3>
      <div class="settings-import-export">
        <button id="st-export">${i18n("settings.exportAll")}</button>
        <button id="st-import">${i18n("settings.importAll")}</button>
        <input id="st-import-file" type="file" accept=".json" style="display:none">
      </div>
    `;
    return card;
  }

  /* ---------- MONTAGE ---------- */
  function build(S) {
    root.innerHTML = "";
    root.append(
      renderProfile(S),
      renderModules(S),
      renderPrices(S),
      renderSince(S),
      renderHabits(S),
      renderLegal(S),
      renderData(S)
    );
    attachHandlers(S);
  }

  /* ---------- HANDLERS ---------- */
  function attachHandlers(S) {

    // PROFIL
    $("#st-name").addEventListener("input",e => { S.profile.name = e.target.value; save(S); });
    $("#st-age").addEventListener("input",e => { S.identity.age = parseInt(e.target.value||0); save(S); });
    $("#st-lang").addEventListener("change",e => { S.profile.lang=e.target.value; save(S); location.reload(); });
    $("#st-currency").addEventListener("input",e=>{ S.profile.currency=e.target.value; save(S); });
    $("#st-currencyPos").addEventListener("change",e=>{ S.profile.currencyPos=e.target.value; save(S); });

    // MODULES
    ["cigs","joints","alcohol","beer","hard","liqueur"].forEach(key=>{
      $(`#st-mod-${key}`).addEventListener("change",e=>{
        S.modules[key] = e.target.checked;
        window.StopAddictState.ensureCoherence(S);
        save(S);
        window.App.onRefresh();
      });
    });

    // TARIFS
    ["cigs","joints","beer","hard","liqueur","alcohol"].forEach(key=>{
      $(`#st-price-${key}`).addEventListener("input",e=>{
        S.prices[key] = parseFloat((e.target.value||"0").replace(",","."));
        save(S);
        window.App.onRefresh();
      });
    });

    // SUIVI DEPUIS
    ["cigs","joints","alcohol"].forEach(key=>{
      $(`#st-since-${key}`).addEventListener("change",e=>{
        S.enabled_since[key] = e.target.value || null;
        save(S);
        window.App.onRefresh();
      });
    });

    // HABITUDES & ARRÊT
    ["cigs","joints","alcohol"].forEach(key=>{
      $(`#st-goal-${key}`).addEventListener("input",e=>{
        S.habits.goal[key] = parseInt(e.target.value||0);
        save(S); window.App.onRefresh();
      });
    });
    $("#st-stopDate").addEventListener("change",e=>{
      S.habits.stopDate = e.target.value || null;
      save(S); window.App.onRefresh();
    });

    // LÉGAL
    $("#st-adult").addEventListener("change",e=>{
      S.identity.isAdult = e.target.checked;
      save(S); window.App.onRefresh();
    });

    $("#st-cgu").addEventListener("change",e=>{
      S.legal.acceptedCGU = e.target.checked;
      save(S); window.App.onRefresh();
    });

    $("#st-verify").addEventListener("click",()=>{
      window.App.showLegalDialog();
    });

    // IMPORT / EXPORT
    $("#st-export").addEventListener("click",()=>{
      window.StopAddictState.exportAll();
    });

    $("#st-import").addEventListener("click",()=>{
      $("#st-import-file").click();
    });

    $("#st-import-file").addEventListener("change",e=>{
      const file = e.target.files[0];
      if (!file) return;
      const fr = new FileReader();
      fr.onload = ev => {
        window.StopAddictState.importAll(ev.target.result);
        window.App.onRefresh();
      };
      fr.readAsText(file);
    });
  }

  /* ---------- SAVE ---------- */
  function save(S){
    window.StopAddictState.save(S);
  }

  /* ---------- API ---------- */
  function init(){
    refresh();
  }

  function refresh(){
    const S = window.StopAddictState.load();
    build(S);
  }

  return { init, refresh };

})();
