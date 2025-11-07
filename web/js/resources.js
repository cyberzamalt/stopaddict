/* web/js/resources.js — Ressources & numéros utiles (FR) */
const RESOURCES_FR = [
  {
    cat: "Urgences",
    items: [
      { label: "Urgences (UE)", tel: "112" },
      { label: "SAMU", tel: "15" },
      { label: "Police / Gendarmerie", tel: "17" },
      { label: "Pompiers", tel: "18" },
      { label: "Urgence par SMS (personnes sourdes/malentendantes)", tel: "114" }
    ]
  },
  {
    cat: "Santé mentale",
    items: [
      { label: "Prévention suicide", tel: "3114", url: "https://3114.fr" }
    ]
  },
  {
    cat: "Violences / Victimes",
    items: [
      { label: "Violences femmes info", tel: "3919" },
      { label: "Aide aux victimes", tel: "116 006" },
      { label: "Enfance en danger", tel: "119" }
    ]
  },
  {
    cat: "Hébergement / Aide sociale",
    items: [
      { label: "SAMU social (hébergement d’urgence)", tel: "115" }
    ]
  },
  {
    cat: "Addictions",
    items: [
      { label: "Tabac Info Service", tel: "3989", url: "https://www.tabac-info-service.fr" },
      { label: "Alcool Info Service", tel: "09 80 98 09 30", url: "https://www.alcool-info-service.fr" },
      { label: "Drogues Info Service", tel: "0 800 23 13 13", url: "https://www.drogues-info-service.fr" },
      { label: "Joueurs Info Service", tel: "09 74 75 13 13", url: "https://www.joueurs-info-service.fr" }
    ]
  },
  {
    cat: "Jeunes / Numérique",
    items: [
      { label: "Harcèlement scolaire", tel: "3020" },
      { label: "Cyberharcèlement (Jeunes)", tel: "3018", url: "https://3018.fr" }
    ]
  }
];

function ensureDialog() {
  let dlg = document.querySelector("#resources-dialog");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "resources-dialog";
  dlg.innerHTML = `
    <form method="dialog" class="agegate" style="min-width:320px;max-width:640px">
      <h3>Ressources & numéros utiles</h3>
      <div id="resources-body" style="display:grid;gap:.5rem;max-height:55vh;overflow:auto"></div>
      <p style="font-size:.9rem;opacity:.8">
        Ces ressources ne remplacent pas un avis médical/professionnel. En cas d'urgence, composez le <strong>112</strong>.
      </p>
      <div class="actions" style="justify-content:flex-end">
        <button class="btn">Fermer</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  return dlg;
}

function renderResources(list = RESOURCES_FR) {
  const body = document.querySelector("#resources-body");
  if (!body) return;
  body.replaceChildren();

  for (const section of list) {
    const wrap = document.createElement("div");
    wrap.style.border = "1px solid #233355";
    wrap.style.background = "#0c1222";
    wrap.style.borderRadius = ".6rem";
    wrap.style.padding = ".6rem .7rem";

    const h = document.createElement("h4");
    h.textContent = section.cat;
    h.style.margin = "0 0 .4rem 0";
    body.appendChild(wrap);
    wrap.appendChild(h);

    for (const it of section.items) {
      const line = document.createElement("div");
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.justifyContent = "space-between";
      line.style.gap = ".6rem";
      line.style.padding = ".35rem .45rem";
      line.style.border = "1px dashed #24365f";
      line.style.borderRadius = ".5rem";
      line.style.marginBottom = ".35rem";

      const left = document.createElement("div");
      left.textContent = it.label;

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = ".4rem";

      if (it.url) {
        const a = document.createElement("a");
        a.href = it.url;
        a.textContent = "Site";
        a.target = "_blank";
        a.rel = "noopener";
        right.appendChild(a);
      }
      if (it.tel) {
        const a = document.createElement("a");
        a.href = "tel:" + it.tel.replace(/\s+/g, "");
        a.textContent = it.tel;
        right.appendChild(a);
      }

      line.appendChild(left);
      line.appendChild(right);
      wrap.appendChild(line);
    }
  }
}

export function openResources() {
  const dlg = ensureDialog();
  renderResources(RESOURCES_FR);
  try { dlg.showModal(); } catch { dlg.show(); }
}

export function mountResources() {
  // Bouton dans Réglages
  const btn = document.querySelector("#btn-resources");
  btn?.addEventListener("click", openResources);

  // Lien dans l’Age Gate (on l’ajoute si absent)
  const age = document.querySelector("#agegate form.agegate");
  if (age && !age.querySelector("#age-resources-link")) {
    const p = document.createElement("p");
    p.style.marginTop = ".2rem";
    p.innerHTML = `Besoin d'aide ? <a id="age-resources-link" href="#">Ressources et numéros utiles</a>`;
    age.insertBefore(p, age.querySelector(".actions"));
  }
  age?.querySelector("#age-resources-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    openResources();
  });
}

/* auto-mount si le script est chargé directement dans index.html */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountResources, { once: true });
} else {
  mountResources();
}
