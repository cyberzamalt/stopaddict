// web/js/habits.js
// STOPADDICT — Habitudes (objectifs & dates clés)
// - Injecte un petit formulaire dans #ecran-habitudes
// - Objectifs/jour (baselines) pour chaque catégorie
// - Dates clés (ex. date d’arrêt par catégorie ou globale)
// - Sauvegarde via setSettings() + évènement 'sa:state-changed'
// Dépendances : ./state.js

import { getSettings, setSettings } from "./state.js";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function z(n) { const v = Number.parseInt(n, 10); return Number.isFinite(v) && v >= 0 ? v : 0; }

function ensureSettingsShape(s) {
  s.baselines ??= { cig: 0, weed: 0, beer: 0, strong: 0, liquor: 0 };
  s.dates ??= { quit_all: "", quit_cigs: "", quit_weed: "", quit_alcohol: "" };
  return s;
}

function tpl(s) {
  const base = s.baselines || {};
  const dates = s.dates || {};
  return `
    <div class="card">
      <div class="title">Objectifs quotidiens</div>
      <div class="grid-5" style="gap:.75rem">
        <label class="col"><span class="muted">Cigarettes / jour</span>
          <input id="base-cigs" type="number" min="0" step="1" value="${z(base.cig)}" class="btn" />
        </label>
        <label class="col"><span class="muted">Joints / jour</span>
          <input id="base-weed" type="number" min="0" step="1" value="${z(base.weed)}" class="btn" />
        </label>
        <label class="col"><span class="muted">Bière / jour</span>
          <input id="base-beer" type="number" min="0" step="1" value="${z(base.beer)}" class="btn" />
        </label>
        <label class="col"><span class="muted">Alcool fort / jour</span>
          <input id="base-strong" type="number" min="0" step="1" value="${z(base.strong)}" class="btn" />
        </label>
        <label class="col"><span class="muted">Liqueur / jour</span>
          <input id="base-liquor" type="number" min="0" step="1" value="${z(base.liquor)}" class="btn" />
        </label>
      </div>
      <div class="row" style="gap:.5rem; margin-top:.75rem">
        <button id="btn-save-baselines" class="btn">Enregistrer</button>
        <button id="btn-reset-baselines" class="btn">Réinitialiser</button>
      </div>
    </div>

    <div class="card">
      <div class="title">Dates clés</div>
      <div class="grid-2">
        <label class="col"><span class="muted">Arrêt global (toutes catégories)</span>
          <input id="date-quit-all" type="date" value="${dates.quit_all || ""}" class="btn" />
        </label>
        <label class="col"><span class="muted">Arrêt cigarettes</span>
          <input id="date-quit-cigs" type="date" value="${dates.quit_cigs || ""}" class="btn" />
        </label>
        <label class="col"><span class="muted">Arrêt joints</span>
          <input id="date-quit-weed" type="date" value="${dates.quit_weed || ""}" class="btn" />
        </label>
        <label class="col"><span class="muted">Arrêt alcool (global)</span>
          <input id="date-quit-alcohol" type="date" value="${dates.quit_alcohol || ""}" class="btn" />
        </label>
      </div>
      <div class="row" style="gap:.5rem; margin-top:.75rem">
        <button id="btn-save-dates" class="btn">Enregistrer</button>
        <button id="btn-reset-dates" class="btn">Effacer</button>
      </div>
      <p class="muted" style="margin-top:.5rem">
        Astuce : tu peux renseigner soit une date globale (toutes catégories), soit des dates spécifiques.
      </p>
    </div>
  `;
}

function bindBaselines(root) {
  const save = $("#btn-save-baselines", root);
  const reset = $("#btn-reset-baselines", root);
  if (save) {
    save.addEventListener("click", () => {
      const s = ensureSettingsShape(getSettings());
      const next = {
        baselines: {
          cig:    z($("#base-cigs", root)?.value),
          weed:   z($("#base-weed", root)?.value),
          beer:   z($("#base-beer", root)?.value),
          strong: z($("#base-strong", root)?.value),
          liquor: z($("#base-liquor", root)?.value),
        }
      };
      setSettings(next);
      try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "habits.baselines" } })); } catch {}
    });
  }
  if (reset) {
    reset.addEventListener("click", () => {
      const next = { baselines: { cig:0, weed:0, beer:0, strong:0, liquor:0 } };
      setSettings(next);
      try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "habits.reset-baselines" } })); } catch {}
      // rafraîchir l’UI
      render();
    });
  }
}

function bindDates(root) {
  const save = $("#btn-save-dates", root);
  const reset = $("#btn-reset-dates", root);
  if (save) {
    save.addEventListener("click", () => {
      const prev = ensureSettingsShape(getSettings());
      const dates = {
        ...prev.dates,
        quit_all:      $("#date-quit-all", root)?.value || "",
        quit_cigs:     $("#date-quit-cigs", root)?.value || "",
        quit_weed:     $("#date-quit-weed", root)?.value || "",
        quit_alcohol:  $("#date-quit-alcohol", root)?.value || "",
      };
      setSettings({ dates });
      try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "habits.dates" } })); } catch {}
    });
  }
  if (reset) {
    reset.addEventListener("click", () => {
      setSettings({ dates: { quit_all:"", quit_cigs:"", quit_weed:"", quit_alcohol:"" } });
      try { document.dispatchEvent(new CustomEvent("sa:state-changed", { detail: { source: "habits.reset-dates" } })); } catch {}
      render();
    });
  }
}

function render() {
  const screen = document.getElementById("ecran-habitudes");
  if (!screen) return;

  const s = ensureSettingsShape(getSettings());
  screen.innerHTML = tpl(s);

  bindBaselines(screen);
  bindDates(screen);
}

/* ---------------- API publique ---------------- */
export function initHabits() {
  render();

  // Si les réglages changent ailleurs → répliquer dans l’UI
  document.addEventListener("sa:state-changed", (e) => {
    // éviter boucle : on rerend seulement si source ≠ habits.* ou si inconnu
    const src = e?.detail?.source || "";
    if (!src.startsWith("habits.")) render();
  });

  // Rafraîchir quand on revient sur l’onglet Habitudes
  const nav = document.getElementById("nav-habitudes");
  if (nav) nav.addEventListener("click", () => setTimeout(render, 0));
}

export default { initHabits };
