/* ============================================================
   StopAddict v3 — app.js
   Cœur applicatif : navigation, rafraîchissement global, console,
   identité/majorité, synchro Accueil <-> Réglages, compteurs, KPI.
   ============================================================ */
(function () {
  "use strict";

  // ======== Sélecteurs utiles
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ======== Console interne (page "Console")
  const Logger = {
    level: "INFO", // INFO | WARN | DEBUG
    log(level, msg, data) {
      const levels = { DEBUG: 0, INFO: 1, WARN: 2 };
      if (levels[level] < levels[this.level]) return;
      const out = `[${new Date().toLocaleTimeString()}] [${level}] ${msg}` + (data ? ` ${safeJSON(data)}` : "");
      const pane = $("#console-content");
      if (pane) {
        pane.textContent += out + "\n";
        pane.scrollTop = pane.scrollHeight;
      }
      // Dev console (optionnel)
      if (level === "WARN") console.warn(msg, data ?? "");
      else if (level === "DEBUG") console.debug(msg, data ?? "");
      else console.info(msg, data ?? "");
    },
    info(msg, data) { this.log("INFO", msg, data); },
    warn(msg, data) { this.log("WARN", msg, data); },
    debug(msg, data) { this.log("DEBUG", msg, data); },
    setLevel(lvl) { this.level = lvl; this.info("Niveau log défini", { level: lvl }); }
  };

  function safeJSON(x) {
    try { return JSON.stringify(x); } catch { return ""; }
  }

  // ======== Navigation
  const pages = {
    home:  $("#page-home"),
    stats: $("#page-stats"),
    cal:   $("#page-calendar"),
    habits:$("#page-habits"),
    settings: $("#page-settings"),
    console: $("#debug-section")
  };

  function showPage(id) {
    Object.values(pages).forEach(p => p && p.setAttribute("hidden", "hidden"));
    if (pages[id]) {
      pages[id].removeAttribute("hidden");
      Logger.debug("showPage", { id });
    }
    // Rafraîchir le contenu de la page affichée
    window.onRefresh();
    // Si réglages visibles, (re)render
    if (id === "settings") {
      window.dispatchEvent(new CustomEvent("sa:render-settings"));
    }
  }

  function bindNav() {
    $("#nav-home")?.addEventListener("click", () => showPage("home"));
    $("#nav-stats")?.addEventListener("click", () => showPage("stats"));
    $("#nav-calendar")?.addEventListener("click", () => showPage("cal"));
    $("#nav-habits")?.addEventListener("click", () => showPage("habits"));
    $("#nav-settings")?.addEventListener("click", () => showPage("settings"));
    $("#nav-console")?.addEventListener("click", () => showPage("console"));
  }

  // ======== Identité / majorité (dialog)
  function wireIdentityDialog() {
    const dlg = $("#identity-dialog");
    const btn = $("#identity-confirm");
    if (!dlg || !btn) return;

    // Exposé global demandé par settings.js
    window.showIdentityDialog = () => {
      try { dlg.showModal(); } catch { dlg.setAttribute("open", "open"); }
    };

    btn.addEventListener("click", () => {
      const name = $("#identity-name")?.value?.trim() ?? "";
      const age = parseInt($("#identity-age")?.value ?? "0", 10);
      const major = $("#identity-major")?.checked ?? false;

      if (!major || !Number.isFinite(age) || age < 18) {
        alert("Tu dois attester être majeur (18+) et accepter les CGU pour continuer.");
        return;
      }
      window.StopAddictState.updateState(S => {
        S.profile.name = name;
        S.identity.age = age;
        S.identity.isAdult = true;
        S.legal.acceptedCGU = true;
      });
      try { dlg.close(); } catch { dlg.removeAttribute("open"); }
      Logger.info("Identité validée");
    });
  }

  function guardIdentity() {
    const S = window.S;
    if (!S) return;
    if (!S.identity?.isAdult || !S.legal?.acceptedCGU) {
      Logger.warn("Accès bloqué: majorité/CGU non validées");
      window.showIdentityDialog?.();
    }
  }

  // ======== Accueil : compteurs + KPI + toggles activation (injection)
  function ensureActivationToggles() {
    // On n'a pas modifié index.html : on injecte de petits toggles sous le titre
    const host = $("#home-counters");
    if (!host || host.querySelector(".activation-row")) return;
    const row = document.createElement("div");
    row.className = "activation-row";
    row.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem;margin:.4rem 0;";
    row.innerHTML = `
      ${toggleChip("cigs","Clopes")}
      ${toggleChip("joints","Joints")}
      ${toggleChip("alcohol","Alcool")}
      ${toggleChip("beer","Bière")}
      ${toggleChip("hard","Fort")}
      ${toggleChip("liqueur","Liqueur")}
    `;
    host.prepend(row);

    // Bind
    ["cigs","joints","alcohol","beer","hard","liqueur"].forEach(k => {
      const el = $(`#act-${k}`);
      el?.addEventListener("click", () => {
        window.StopAddictState.updateState(S => {
          // Toggle "active aujourd'hui"
          S.today.active[k] = !S.today.active[k];
        });
        Logger.info("Activation togglée (Accueil)", { key: k, active: window.S.today.active[k] });
      });
    });
  }

  function toggleChip(key, label) {
    return `
      <button id="act-${key}" data-key="${key}" style="
        border:1px solid var(--border);border-radius:12px; padding:.2rem .6rem;
        background:var(--panel);color:var(--text);cursor:pointer;
      ">${label}</button>
    `;
  }

  function bindHomeCounters() {
    // Inc/Dec buttons
    const map = [
      ["cigs",   "#ctr-cigs-dec",   "#ctr-cigs-inc"],
      ["joints", "#ctr-weed-dec",   "#ctr-weed-inc"], // index.html utilise weed* pour les IDs, mais la clé est 'joints'
      ["alcohol","#ctr-alcohol-dec","#ctr-alcohol-inc"],
      ["beer",   "#ctr-beer-dec",   "#ctr-beer-inc"],
      ["hard",   "#ctr-hard-dec",   "#ctr-hard-inc"],
      ["liqueur","#ctr-liqueur-dec","#ctr-liqueur-inc"]
    ];
    map.forEach(([key, decSel, incSel]) => {
      $(decSel)?.addEventListener("click", () => changeCounter(key, -1));
      $(incSel)?.addEventListener("click", () => changeCounter(key, +1));
    });

    $("#btn-reset-today")?.addEventListener("click", () => {
      if (!confirm("Remettre à zéro les compteurs d’aujourd’hui ?")) return;
      window.StopAddictState.updateState(S => {
        Object.keys(S.today.counters).forEach(k => S.today.counters[k] = 0);
      });
      Logger.warn("Remise à zéro des compteurs (jour)");
    });
  }

  function changeCounter(key, delta) {
    window.StopAddictState.updateState(S => {
      if (!S.today.active[key]) return; // bloqué si inactif
      const v = (S.today.counters[key] ?? 0) + delta;
      S.today.counters[key] = Math.max(0, v);
    });
    Logger.debug("Counter change", { key, delta, val: window.S.today.counters[key] });
  }

  // ======== Rollover simple (jour -> history) si date a changé
  function performRolloverIfNeeded() {
    window.StopAddictState.updateState(S => {
      const today = localISO();
      if (S.today.date === today) return;
      // Archiver l'ancien "today"
      S.history[S.today.date] = {
        counters: { ...S.today.counters },
        active: { ...S.today.active },
        cost: window.StopAddictState.calculateDayCost(S)
      };
      // Nouveau jour
      S.today.date = today;
      Object.keys(S.today.counters).forEach(k => S.today.counters[k] = 0);
      // Par défaut, on réactive selon S.modules
      Object.keys(S.today.active).forEach(k => S.today.active[k] = !!S.modules[k]);
      Logger.info("Rollover effectué", { date: today });
    });
  }

  function localISO() {
    return new Date().toISOString().slice(0,10);
  }

  // ======== onRefresh : met à jour toute l’UI
  window.onRefresh = function onRefresh() {
    const S = window.S;
    if (!S) return;

    // 1) Rollover (si jour a changé)
    performRolloverIfNeeded();

    // 2) Accueil — greeting
    const greet = $("#greeting");
    if (greet) {
      const name = S.profile.name ? `, ${S.profile.name}` : " !";
      greet.textContent = S.profile.lang === "en" ? `Hi${name}` : `Salut${name}`;
    }

    // 3) Accueil — compteurs (affichage)
    setText("#val-cigs", S.today.counters.cigs);
    setText("#val-weed", S.today.counters.joints); // affiché "Joints" dans l'UI
    setText("#val-alcohol", S.today.counters.alcohol);
    setText("#val-beer", S.today.counters.beer);
    setText("#val-hard", S.today.counters.hard);
    setText("#val-liqueur", S.today.counters.liqueur);

    // 3b) Accueil — désactivation visuelle des compteurs
    setDisabledBlock(".counter:has(#ctr-cigs-inc)", !S.today.active.cigs);
    setDisabledBlock(".counter:has(#ctr-weed-inc)", !S.today.active.joints);
    setDisabledBlock(".counter:has(#ctr-alcohol-inc)", !S.today.active.alcohol);
    setDisabledBlock(".counter:has(#ctr-beer-inc)", !S.today.active.beer);
    setDisabledBlock(".counter:has(#ctr-hard-inc)", !S.today.active.hard);
    setDisabledBlock(".counter:has(#ctr-liqueur-inc)", !S.today.active.liqueur);

    // 3c) Accueil — reflection des toggles injectés
    ensureActivationToggles();
    ["cigs","joints","alcohol","beer","hard","liqueur"].forEach(k => {
      const b = $(`#act-${k}`);
      if (!b) return;
      const on = S.today.active[k];
      b.style.opacity = on ? "1" : ".45";
      b.style.borderColor = on ? "var(--accent)" : "var(--border)";
    });

    // 4) KPI coût
    const cost = window.StopAddictState.calculateDayCost(S);
    setText("#kpi-cost", formatMoney(cost, S.profile));

    // 5) Stats / Calendrier / Conseils
    try { window.Charts?.refresh?.(); } catch (e) { Logger.debug("Charts.refresh absent", e); }
    try { window.Calendar?.refresh?.(); } catch (e) { Logger.debug("Calendar.refresh absent", e); }
    try { window.Advices?.refresh?.(); } catch (e) { Logger.debug("Advices.refresh absent", e); }

    // 6) Réglages — re-render si l’onglet est affiché
    if (!pages.settings.hasAttribute("hidden")) {
      window.dispatchEvent(new CustomEvent("sa:render-settings"));
    }

    // 7) Garde majorité
    guardIdentity();

    Logger.debug("onRefresh done");
  };

  // ======== Utils UI
  function setText(sel, val) {
    const el = $(sel);
    if (el) el.textContent = String(val ?? "");
  }

  function setDisabledBlock(sel, disabled) {
    const el = $(sel);
    if (!el) return;
    if (disabled) el.classList.add("disabled");
    else el.classList.remove("disabled");
  }

  function formatMoney(n, profile) {
    const sym = currencySymbol(profile.currency);
    const s = (Number(n || 0)).toFixed(2);
    if (profile.currencyPos === "after") return `${s} ${sym}`;
    return `${sym} ${s}`;
  }

  function currencySymbol(code) {
    const map = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF", CAD: "$", AUD: "$" };
    return map[code] || code;
  }

  // ======== Console page buttons
  function bindConsoleButtons() {
    $("#console-clear")?.addEventListener("click", () => {
      const pane = $("#console-content");
      if (pane) pane.textContent = "";
    });
    $("#console-copy")?.addEventListener("click", async () => {
      const pane = $("#console-content");
      if (!pane) return;
      try {
        await navigator.clipboard.writeText(pane.textContent || "");
        alert("Console copiée dans le presse-papiers.");
      } catch {
        alert("Copie impossible (permissions navigateur).");
      }
    });
  }

  // ======== Démarrage
  document.addEventListener("DOMContentLoaded", () => {
    bindNav();
    bindHomeCounters();
    bindConsoleButtons();
    wireIdentityDialog();
    Logger.setLevel("INFO"); // Ajustable : "DEBUG" pour plus de détails
    // Page par défaut : Accueil
    showPage("home");
  });
})();
