// web/js/agegate.js
// STOPADDICT — Modale majorité (18+) avec mémorisation
// - Affiche une modale au 1er lancement.
// - Bouton "J’accepte" activé seulement si "J’ai 18 ans ou plus" est coché.
// - Case "Ne plus afficher" pour mémoriser la fermeture durable.
// - Lien "Ressources & numéros utiles" → émet l’évènement 'sa:open-resources' (resources.js peut l’écouter).
// Usage attendu : import et appel depuis app.js via safeInit("./agegate.js","initAgeGate").

const STORAGE_KEY = "stopaddict_agegate_v1";

function loadPref() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { accepted: false, hide: false };
    const obj = JSON.parse(raw);
    return {
      accepted: !!obj.accepted,
      hide: !!obj.hide,
      ts: obj.ts || null,
    };
  } catch {
    return { accepted: false, hide: false };
  }
}

function savePref(p) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accepted: !!p.accepted, hide: !!p.hide, ts: Date.now() })
    );
  } catch {}
}

function injectStylesOnce() {
  if (document.getElementById("sa-agegate-style")) return;
  const css = `
  .sa-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:saturate(120%) blur(2px);display:flex;align-items:center;justify-content:center;z-index:1000}
  .sa-modal{background:#0e172b;color:#e5e7eb;border:1px solid #22315a;border-radius:12px;max-width:560px;width:calc(100% - 2rem);padding:1rem;box-shadow:0 10px 30px rgba(0,0,0,.5)}
  .sa-modal h2{margin:.25rem 0 .75rem;font-size:1.25rem}
  .sa-modal p{margin:.5rem 0;color:#9ca3af}
  .sa-actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between;margin-top:1rem}
  .sa-row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
  .sa-btn{background:#1a2647;color:#e5e7eb;border:1px solid #243463;border-radius:8px;padding:.5rem .8rem;cursor:pointer}
  .sa-btn[disabled]{opacity:.5;cursor:not-allowed}
  .sa-link{color:#8aa1ff;text-decoration:underline;cursor:pointer}
  .sa-checkbox{display:flex;gap:.5rem;align-items:center;margin-top:.5rem}
  body.sa-modal-open{overflow:hidden}
  `;
  const style = document.createElement("style");
  style.id = "sa-agegate-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function createModal() {
  injectStylesOnce();

  const backdrop = document.createElement("div");
  backdrop.className = "sa-backdrop";
  backdrop.id = "sa-agegate-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const modal = document.createElement("div");
  modal.className = "sa-modal";
  modal.innerHTML = `
    <h2>Contenu réservé aux 18&nbsp;ans et plus</h2>
    <p>StopAddict contient des informations liées au tabac, au cannabis et à l’alcool.
    Merci de confirmer votre majorité.</p>

    <div class="sa-checkbox">
      <input id="chk-warn-18" type="checkbox" />
      <label for="chk-warn-18">J’ai 18 ans ou plus</label>
    </div>

    <div class="sa-checkbox">
      <input id="chk-warn-hide" type="checkbox" />
      <label for="chk-warn-hide">Ne plus afficher ce message</label>
    </div>

    <div class="sa-actions">
      <div class="sa-row">
        <button id="btn-warn-accept" class="sa-btn" disabled>J’accepte et je continue</button>
      </div>
      <div class="sa-row">
        <button id="open-ressources-from-warn" class="sa-btn" type="button">Ressources & numéros utiles</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  document.body.classList.add("sa-modal-open");

  // Focus management (simple)
  const chk18 = modal.querySelector("#chk-warn-18");
  const btnAccept = modal.querySelector("#btn-warn-accept");
  const btnRes = modal.querySelector("#open-ressources-from-warn");
  const chkHide = modal.querySelector("#chk-warn-hide");

  // Activer le bouton seulement si "18+" est coché
  chk18.addEventListener("change", () => {
    btnAccept.disabled = !chk18.checked;
  });

  // Accepter → mémoriser et fermer
  btnAccept.addEventListener("click", () => {
    const pref = { accepted: true, hide: !!chkHide.checked };
    savePref(pref);
    closeModal();
    // Notifier l’app que le gate a été accepté
    try { document.dispatchEvent(new CustomEvent("sa:agegate-accepted", { detail: pref })); } catch {}
  });

  // Lien ressources → évènement
  btnRes.addEventListener("click", () => {
    try { document.dispatchEvent(new CustomEvent("sa:open-resources")); } catch {}
  });

  // Empêcher la fermeture par clic backdrop si non coché (gate réel)
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop && chk18.checked) {
      btnAccept.click();
    }
  });

  // Éviter ESC tant que non coché
  document.addEventListener("keydown", onEscTrap, true);

  function onEscTrap(ev) {
    if (ev.key === "Escape") {
      if (chk18.checked) {
        btnAccept.click();
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  function closeModal() {
    document.removeEventListener("keydown", onEscTrap, true);
    document.body.classList.remove("sa-modal-open");
    backdrop.remove();
  }
}

export function initAgeGate() {
  const pref = loadPref();

  // Afficher si jamais accepté = false, ou si accepté mais hide = false (l’utilisateur ne veut pas masquer)
  const shouldShow = !pref.accepted || (pref.accepted && !pref.hide);
  if (!shouldShow) return;

  // Si la page est déjà interactive on crée tout de suite, sinon on attend le DOM prêt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createModal, { once: true });
  } else {
    createModal();
  }
}

export default { initAgeGate };
