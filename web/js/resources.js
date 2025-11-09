/* web/js/resources.js — Dialog Ressources & numéros utiles (unique, non gélant) */

/* --------- Données FR par défaut --------- */
const RESOURCES = [
  {
    group: "Urgences",
    items: [
      { label: "SAMU (urgence vitale)", number: "15" },
      { label: "Police / Gendarmerie", number: "17" },
      { label: "Pompiers", number: "18" },
      { label: "Numéro d’urgence européen", number: "112" },
      { label: "Urgence sourds/malentendants (SMS/visio)", number: "114", site: "https://www.info.urgence114.fr" }
    ]
  },
  {
    group: "Addictions",
    items: [
      { label: "Drogues Info Service", number: "0 800 23 13 13", site: "https://www.drogues-info-service.fr" },
      { label: "Alcool Info Service", number: "0 980 980 930", site: "https://www.alcool-info-service.fr" },
      { label: "Tabac Info Service", number: "39 89", site: "https://www.tabac-info-service.fr" }
    ]
  },
  {
    group: "Soutien psychologique",
    items: [
      { label: "Prévention du suicide", number: "3114", site: "https://3114.fr" }
    ]
  },
  {
    group: "Violences et protection",
    items: [
      { label: "Violences femmes info", number: "3919" },
      { label: "Enfants en danger – Allô", number: "119" }
    ]
  },
  {
    group: "Aide sociale / santé",
    items: [
      { label: "Hébergement d’urgence (Samu social)", number: "115" },
      { label: "Médecin de garde (soins non programmés)", number: "116 117" }
    ]
  }
];

/* --------- UI --------- */
function buildDialogContent(dlg) {
  dlg.innerHTML = `
    <form method="dialog" class="agegate" style="min-width:280px">
      <h3>Ressources & numéros utiles</h3>
      <div id="resources-body" style="max-height:55vh;overflow:auto;margin:.5rem 0;"></div>
      <div class="actions" style="justify-content:flex-end"><button id="res-close" class="btn">Fermer</button></div>
    </form>
  `;

  const body = dlg.querySelector("#resources-body");
  RESOURCES.forEach(group => {
    const block = document.createElement("div");
    block.style.marginBottom = ".6rem";

    const h = document.createElement("h4");
    h.textContent = group.group;
    h.style.margin = "0 0 .35rem 0";
    block.appendChild(h);

    group.items.forEach(it => {
      const line = document.createElement("div");
      line.className = "tip-line";
      const tel = it.number ? `<a href="tel:${it.number.replace(/\s+/g,'')}" rel="nofollow">${it.number}</a>` : "";
      const site = it.site ? ` — <a href="${it.site}" target="_blank" rel="noopener">site</a>` : "";
      line.innerHTML = `<strong>${it.label}</strong> — ${tel}${site}`;
      block.appendChild(line);
    });

    body.appendChild(block);
  });

  dlg.querySelector("#res-close")?.addEventListener("click", () => {
    try { dlg.close(); } catch {}
  });

  // ESC pour fermer, utile si ouvert en non-modal (show())
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      try { dlg.close(); } catch {}
    }
  });
}

function ensureDialog() {
  let dlg = document.getElementById("resources-dialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "resources-dialog";
    dlg.setAttribute("aria-label", "Ressources et numéros utiles");
    document.body.appendChild(dlg);
    buildDialogContent(dlg);
  }
  return dlg;
}

export function openResources() {
  const dlg = ensureDialog();
  const age = document.getElementById("agegate");
  const ageOpen = !!(age && age.open);

  // Évite le gel / la superposition bloquante : si AgeGate est ouvert, on ouvre en non-modal
  try {
    if (ageOpen) {
      dlg.show(); // non-modal au-dessus via CSS (z-index)
      dlg.style.zIndex = 1002;
    } else {
      dlg.showModal();
      dlg.style.removeProperty("z-index");
    }
  } catch {
    dlg.show(); // fallback
    dlg.style.zIndex = 1002;
  }
}

function injectAgeGateLink() {
  const ageForm = document.querySelector("#agegate .agegate");
  if (!ageForm) return;

  // Empêche les doublons : on vérifie l'existence par un sélecteur unique
  if (!ageForm.querySelector("[data-resources-link='1']")) {
    const p = document.createElement("p");
    p.style.margin = "0 0 .4rem 0";
    p.innerHTML = `Besoin d'aide ? <a href="#" data-resources-link="1">Ressources et numéros utiles</a>`;
    // Après le titre si présent, sinon au début
    ageForm.insertBefore(p, ageForm.children[1] || ageForm.firstChild);
  }

  const link = ageForm.querySelector("[data-resources-link='1']");
  if (link && !link.dataset.bound) {
    link.dataset.bound = "1";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openResources();
    });
  }
}

function bindSettingsButton() {
  const btn = document.getElementById("btn-resources");
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = "1";
    btn.addEventListener("click", openResources);
  }
}

export function mountResources() {
  // Monte le bouton (Réglages) + lien unique dans l’AgeGate
  bindSettingsButton();
  injectAgeGateLink();

  // Si le dialog existe déjà (hot reload), s’assurer qu’il est correctement construit
  ensureDialog();
}

/* Auto-mount à l’import du module */
try { mountResources(); } catch {}
