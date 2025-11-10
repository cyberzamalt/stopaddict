// web/js/resources.js — Modal “Ressources & numéros utiles” (ES module)

import { LS_AGE } from "./state.js";

/* ----------------- Données ----------------- */
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
    items: [{ label: "Prévention du suicide", number: "3114", site: "https://3114.fr" }]
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

/* ----------------- UI / Modal ----------------- */
function ensureDialog() {
  let dlg = document.getElementById("resources-dialog");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "resources-dialog";
  dlg.setAttribute("aria-label", "Ressources et numéros utiles");
  // (Style via CSS; contenu minimal ici)
  dlg.innerHTML = `
    <form method="dialog" class="agegate" style="min-width:280px;max-width:640px">
      <h3>Ressources & numéros utiles</h3>
      <div id="resources-body" style="max-height:55vh;overflow:auto;margin:.5rem 0;"></div>
      <div class="actions" style="display:flex;justify-content:flex-end;gap:.5rem">
        <button value="close" class="btn" id="res-close">Fermer</button>
      </div>
    </form>
  `;
  document.body.appendChild(dlg);

  // Remplir la liste (une seule fois)
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
      const tel = it.number ? `<a href="tel:${String(it.number).replace(/\s+/g,'')}" rel="noopener">${it.number}</a>` : "";
      const site = it.site ? ` — <a href="${it.site}" target="_blank" rel="noopener">site</a>` : "";
      line.innerHTML = `<strong>${it.label}</strong> — ${tel}${site}`;
      wrap.appendChild(line);
    });

    body.appendChild(wrap);
  });

  // ESC = fermer proprement
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    dlg.close();
  });

  // En fermeture, si l’AgeGate devait rester ouvert, on le rouvre
  dlg.addEventListener("close", () => {
    const age = document.getElementById("agegate");
    if (age?.dataset.reopen === "1") {
      delete age.dataset.reopen;
      if (localStorage.getItem(LS_AGE) !== "1") {
        try { age.showModal?.(); } catch { age.classList.remove("hide"); }
      }
    }
  });

  return dlg;
}

export function openResources() {
  const dlg = ensureDialog();

  // Si l’AgeGate est ouvert, on le ferme temporairement puis on le rouvrira après.
  const age = document.getElementById("agegate");
  const ageOpen = !!age?.open;
  if (ageOpen) {
    age.dataset.reopen = "1";
    try { age.close(); } catch {}
    age.classList.add("hide");
  }

  try { dlg.showModal(); }
  catch {
    // Fallback non-modal si showModal indisponible
    dlg.classList.remove("hide");
  }
}

export function mountResources() {
  // Bouton dans Réglages (ne pas lier plusieurs fois)
  const btn = document.getElementById("btn-resources");
  if (btn && !btn.dataset.resBound) {
    btn.addEventListener("click", (e) => { e.preventDefault(); openResources(); });
    btn.dataset.resBound = "1";
  }

  // Lien dans l’AgeGate : injecter UNE FOIS
  const ageForm = document.querySelector("#agegate .agegate");
  if (ageForm && !ageForm.querySelector("[data-resources-link]")) {
    const p = document.createElement("p");
    p.style.margin = "0 0 .4rem 0";
    p.innerHTML = `Besoin d'aide ? <a href="#" data-resources-link>Ressources et numéros utiles</a>`;
    // après le titre, avant le reste
    ageForm.insertBefore(p, ageForm.children[1] || ageForm.firstChild);
  }
  const a = ageForm?.querySelector("[data-resources-link]");
  if (a && !a.dataset.resBound) {
    a.addEventListener("click", (e) => { e.preventDefault(); openResources(); });
    a.dataset.resBound = "1";
  }
}
