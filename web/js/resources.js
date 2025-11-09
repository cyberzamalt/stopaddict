/* web/js/resources.js — Ressources & numéros utiles (FR) */
/* Objectif: un seul lien “Ressources…” (pas de doublon), ouverture sans gel
   même si l’AgeGate (dialog) est déjà ouvert. Auto-mount. */

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

/* -------------- UI -------------- */

function ensureDialog() {
  let dlg = document.getElementById("resources-dialog");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "resources-dialog";
  dlg.className = "agegate"; // réutilise style dialog
  dlg.innerHTML = `
    <h3>Ressources & numéros utiles</h3>
    <div id="resources-body" style="max-height:55vh;overflow:auto;margin:.5rem 0;"></div>
    <div class="actions"><button id="res-close" class="btn">Fermer</button></div>
  `;
  document.body.appendChild(dlg);

  const body = dlg.querySelector("#resources-body");
  RESOURCES.forEach(group => {
    const wrap = document.createElement("div");
    wrap.style.marginBottom = ".6rem";

    const h = document.createElement("h4");
    h.textContent = group.group;
    h.style.margin = "0 0 .35rem 0";
    wrap.appendChild(h);

    group.items.forEach(it => {
      const line = document.createElement("div");
      line.className = "tip-line";
      const tel = it.number ? `<a href="tel:${it.number.replace(/\s+/g,'')}" style="text-decoration:underline">${it.number}</a>` : "";
      const site = it.site ? ` — <a href="${it.site}" target="_blank" rel="noopener">site</a>` : "";
      line.innerHTML = `<strong>${it.label}</strong> — ${tel}${site}`;
      wrap.appendChild(line);
    });

    body.appendChild(wrap);
  });

  // Fermer
  dlg.querySelector("#res-close")?.addEventListener("click", () => dlg.close());
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); dlg.close(); });

  return dlg;
}

export function openResources() {
  const dlg = ensureDialog();

  // Évite l’erreur “already open modally” si l’AgeGate est ouvert
  const someOpenDialog = document.querySelector("dialog[open]");
  try {
    if (someOpenDialog && someOpenDialog !== dlg) {
      // Ouvre en non-modal pour éviter le gel
      dlg.show();                       // pas modal
      dlg.style.position = "fixed";
      dlg.style.top = "50%";
      dlg.style.left = "50%";
      dlg.style.transform = "translate(-50%,-50%)";
      dlg.style.zIndex = "2147483647";  // au-dessus
    } else {
      dlg.removeAttribute("style");
      dlg.showModal();                  // modal classique
    }
  } catch {
    // Fallback si showModal indisponible
    dlg.show();
    dlg.style.position = "fixed";
    dlg.style.top = "50%";
    dlg.style.left = "50%";
    dlg.style.transform = "translate(-50%,-50%)";
    dlg.style.zIndex = "2147483647";
  }

  // Focus sur le bouton pour accessibilité
  dlg.querySelector("#res-close")?.focus();
}

export function mountResources() {
  // Évite double-montage
  if (window.__RESOURCES_MOUNTED__) return;
  window.__RESOURCES_MOUNTED__ = true;

  // Bouton dans Réglages
  const btn = document.getElementById("btn-resources");
  if (btn && !btn.__bound) {
    btn.addEventListener("click", (e) => { e.preventDefault(); openResources(); });
    btn.__bound = true;
  }

  // Lien dans l’AgeGate : ajouter UNE seule fois
  const ageForm = document.querySelector("#agegate .agegate");
  if (ageForm && !ageForm.querySelector("[data-resources-link]")) {
    const p = document.createElement("p");
    p.style.margin = "0 0 .4rem 0";
    p.innerHTML = `Besoin d'aide ? <a href="#" data-resources-link>Ressources et numéros utiles</a>`;
    ageForm.insertBefore(p, ageForm.firstElementChild?.nextSibling || ageForm.firstChild);

    const link = ageForm.querySelector("[data-resources-link]");
    link?.addEventListener("click", (e) => {
      e.preventDefault();
      openResources();
    });
  }
}

/* Auto-mount au chargement du module */
try { mountResources(); } catch {}
