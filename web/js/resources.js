/* web/js/resources.js — Ressources & numéros utiles (FR, safe mount) */

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

/* ---------- UI ---------- */

function ensureDialog() {
  let dlg = document.getElementById("resources-dialog");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "resources-dialog";
  dlg.className = "agegate"; // réutilise le style du dialog (déjà présent)
  dlg.innerHTML = `
    <h3>Ressources & numéros utiles</h3>
    <div id="resources-body" style="max-height:55vh;overflow:auto;margin:.5rem 0;"></div>
    <div class="actions"><button id="res-close" class="btn">Fermer</button></div>
  `;
  document.body.appendChild(dlg);

  // Liste
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

  // Fermeture
  dlg.querySelector("#res-close")?.addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => {
    // rien de spécial, mais évite de laisser un état bloqué si besoin
  });

  return dlg;
}

export function openResources() {
  const dlg = ensureDialog();
  try { dlg.showModal(); } catch { dlg.classList.remove("hide"); }
}

export function mountResources() {
  if (window.__StopAddict_ResMounted) return; // anti double-montage
  window.__StopAddict_ResMounted = true;

  // Bouton dans Réglages
  const btn = document.getElementById("btn-resources");
  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); openResources(); });

  // Lien unique dans l’Age Gate
  const ageForm = document.querySelector("#agegate .agegate");
  if (ageForm && !ageForm.querySelector("[data-resources-link]")) {
    const p = document.createElement("p");
    p.style.margin = "0 0 .4rem 0";
    p.innerHTML = `Besoin d'aide ? <a href="#" data-resources-link>Ressources et numéros utiles</a>`;
    // place après le titre (2e enfant si possible)
    ageForm.insertBefore(p, ageForm.firstElementChild?.nextSibling || ageForm.firstChild);
  }
  ageForm?.querySelector("[data-resources-link]")?.addEventListener("click", (e) => {
    e.preventDefault();
    openResources();
  });
}

/* Auto-mount au chargement du module (safe) */
try { mountResources(); } catch {}
