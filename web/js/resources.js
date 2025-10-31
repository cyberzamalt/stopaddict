// web/js/resources.js
// STOPADDICT — Ressources & numéros utiles (modale)
// - Ouvre via le bouton #open-ressources (Accueil) ou l’évènement global 'sa:open-resources' (ex: agegate.js)
// - Contenu par défaut FR (exemples) + fallback international minimal
// - Aucune dépendance externe. Crée/affiche une modale accessible, fermable (croix, ESC, clic backdrop).

const STYLE_ID = "sa-resources-style";
let modalRef = null;

// ---- Données (personnalisables plus tard via i18n / pays) ----
function getCountry() {
  try {
    const lang = (navigator.language || navigator.userLanguage || "en").toUpperCase();
    if (lang.includes("-FR") || lang.endsWith("FR") || lang.includes("FR-")) return "FR";
  } catch {}
  return "INTL";
}

const RESOURCE_DATA = {
  FR: {
    title: "Ressources & numéros utiles — France",
    sections: [
      {
        label: "Urgences (immédiat, danger)",
        items: [
          { name: "112 — Urgences (UE)", tel: "112" },
          { name: "15 — SAMU (urgence médicale)", tel: "15" },
          { name: "17 — Police Secours", tel: "17" },
          { name: "18 — Pompiers", tel: "18" },
          { name: "114 — Urgence par SMS (sourds/malentendants)", tel: "114" },
        ],
      },
      {
        label: "Addictions & soutien",
        items: [
          { name: "Tabac Info Service", tel: "3989" },
          { name: "Alcool Info Service", tel: "0980980930" },
          { name: "Drogues Info Service", tel: "0800231313" },
        ],
      },
      {
        label: "Prévention / écoute",
        items: [
          { name: "3114 — Prévention du suicide", tel: "3114" },
          { name: "3919 — Violences femmes", tel: "3919" },
        ],
      },
    ],
    disclaimer:
      "Ces numéros sont fournis à titre indicatif. En cas d’urgence vitale ou de danger immédiat, composez 112.",
  },

  INTL: {
    title: "Resources & helplines — International",
    sections: [
      {
        label: "Emergency",
        items: [{ name: "Emergency (many countries in EU): 112", tel: "112" }],
      },
      {
        label: "Note",
        items: [
          {
            name: "Please check your country’s official health and emergency websites for accurate local numbers.",
            tel: null,
          },
        ],
      },
    ],
    disclaimer:
      "Numbers vary by country. For immediate danger or medical emergency, call your local emergency services.",
  },
};

// ---- Styles injectés une fois ----
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
  .sa-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:saturate(120%) blur(2px);display:flex;align-items:center;justify-content:center;z-index:1000}
  .sa-modal{background:#0e172b;color:#e5e7eb;border:1px solid #22315a;border-radius:14px;max-width:720px;width:calc(100% - 2rem);max-height:85vh;overflow:auto;box-shadow:0 10px 30px rgba(0,0,0,.5)}
  .sa-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:1rem 1rem .5rem 1rem;border-bottom:1px solid #1d2a4a}
  .sa-title{font-size:1.1rem;font-weight:700;margin:0}
  .sa-close{background:#1a2647;color:#e5e7eb;border:1px solid #243463;border-radius:8px;padding:.35rem .6rem;cursor:pointer}
  .sa-body{padding:1rem;display:flex;flex-direction:column;gap:1rem}
  .sa-sec{border:1px solid #1d2a4a;border-radius:10px;padding:.75rem}
  .sa-sec h3{margin:.2rem 0 .6rem;font-size:1rem}
  .sa-list{display:grid;grid-template-columns:1fr;gap:.5rem}
  @media (min-width:600px){ .sa-list{grid-template-columns:1fr 1fr} }
  .sa-item{display:flex;justify-content:space-between;align-items:center;gap:.5rem;background:#0b1426;border:1px solid #1c2a4a;border-radius:8px;padding:.5rem .6rem}
  .sa-item b{font-weight:600}
  .sa-tel a{color:#8aa1ff;text-decoration:underline}
  .sa-note{color:#9ca3af;font-size:.9rem}
  .sa-foot{padding:0 1rem 1rem;color:#9ca3af;font-size:.85rem}
  body.sa-modal-open{overflow:hidden}
  `;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

// ---- Construction DOM ----
function buildModal() {
  injectStyles();

  const backdrop = document.createElement("div");
  backdrop.className = "sa-backdrop";
  backdrop.id = "sa-resources-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const modal = document.createElement("div");
  modal.className = "sa-modal";
  const head = document.createElement("div");
  head.className = "sa-head";

  const title = document.createElement("h2");
  title.className = "sa-title";

  const btnClose = document.createElement("button");
  btnClose.className = "sa-close";
  btnClose.type = "button";
  btnClose.textContent = "Fermer";

  head.appendChild(title);
  head.appendChild(btnClose);

  const body = document.createElement("div");
  body.className = "sa-body";

  const foot = document.createElement("div");
  foot.className = "sa-foot";

  modal.appendChild(head);
  modal.appendChild(body);
  modal.appendChild(foot);
  backdrop.appendChild(modal);

  // Remplissage
  const country = getCountry();
  const data = RESOURCE_DATA[country] || RESOURCE_DATA.INTL;

  title.textContent = data.title;

  data.sections.forEach((sec) => {
    const box = document.createElement("section");
    box.className = "sa-sec";

    const h3 = document.createElement("h3");
    h3.textContent = sec.label;
    box.appendChild(h3);

    const list = document.createElement("div");
    list.className = "sa-list";

    sec.items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "sa-item";

      const name = document.createElement("div");
      name.innerHTML = `<b>${it.name}</b>`;

      const tel = document.createElement("div");
      tel.className = "sa-tel";
      if (it.tel) {
        const a = document.createElement("a");
        a.href = `tel:${it.tel}`;
        a.textContent = it.tel;
        a.setAttribute("aria-label", `Appeler ${it.name}`);
        tel.appendChild(a);
      } else {
        const span = document.createElement("span");
        span.className = "sa-note";
        span.textContent = "—";
        tel.appendChild(span);
      }

      row.appendChild(name);
      row.appendChild(tel);
      list.appendChild(row);
    });

    box.appendChild(list);
    body.appendChild(box);
  });

  const disc = document.createElement("div");
  disc.className = "sa-note";
  disc.textContent = data.disclaimer || "";
  foot.appendChild(disc);

  // Fermeture
  function close() {
    document.removeEventListener("keydown", onKey, true);
    document.body.classList.remove("sa-modal-open");
    backdrop.removeAttribute("aria-hidden");
    backdrop.remove();
    modalRef = null;
  }
  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation(); close();
    }
  }
  btnClose.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.addEventListener("keydown", onKey, true);

  // Afficher
  document.body.appendChild(backdrop);
  document.body.classList.add("sa-modal-open");
  modalRef = backdrop;
}

function openResources() {
  if (modalRef) return; // déjà ouvert
  try { buildModal(); } catch (e) { console.warn("[resources] open failed:", e); }
}

// ---- API publique ----
export function initResources() {
  // Bouton Accueil
  const btn = document.getElementById("open-ressources");
  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); openResources(); });

  // Ouverture via l’age-gate
  document.addEventListener("sa:open-resources", openResources);
}

// Optionnel: permet d’ouvrir depuis la console
try { window.SA_RESOURCES = { openResources, initResources }; } catch {}

export default { initResources };
