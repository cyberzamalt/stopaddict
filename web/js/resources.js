/* web/js/resources.js — Ressources & numéros utiles (FR) */
/* Objectif: vrai modal (showModal), 1 seule instance, bouton Fermer, un seul lien injecté dans l’AgeGate, pas de “gel”. */

export const RESOURCES = [
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

let _dlg = null;

/* ---------- Construction dialog (1 seule instance) ---------- */
function buildDialog() {
  // Si déjà présent dans le DOM, réutiliser
  const existing = document.getElementById("resources-dialog");
  if (existing) {
    _dlg = existing;
    if (!_dlg.dataset.wired) wireDialogOnce(_dlg);
    return _dlg;
  }

  // Créer le <dialog>
  _dlg = document.createElement("dialog");
  _dlg.id = "resources-dialog";
  _dlg.setAttribute("aria-label", "Ressources et numéros utiles");
  // Laisse le style aux CSS (z-index/backdrop), ici structure simple
  _dlg.innerHTML = `
    <form method="dialog" class="agegate" style="min-width:280px;max-width:640px">
      <h3 style="margin:0 0 .25rem 0">Ressources & numéros utiles</h3>
      <div id="resources-body" style="max-height:55vh;overflow:auto;margin:.5rem 0;"></div>
      <div class="actions" style="justify-content:flex-end">
        <button id="res-close" class="btn">Fermer</button>
      </div>
    </form>
  `;
  document.body.appendChild(_dlg);

  // Remplir la liste
  const body = _dlg.querySelector("#resources-body");
  body.textContent = ""; // reset
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
      const tel = it.number
        ? `<a href="tel:${String(it.number).replace(/\s+/g,'')}" style="text-decoration:underline">${it.number}</a>`
        : "";
      const site = it.site
        ? ` — <a href="${it.site}" target="_blank" rel="noopener">site</a>`
        : "";
      line.innerHTML = `<strong>${it.label}</strong> — ${tel}${site}`;
      wrap.appendChild(line);
    });

    body.appendChild(wrap);
  });

  wireDialogOnce(_dlg);
  return _dlg;
}

/* ---------- Wiring dialog (une seule fois) ---------- */
function wireDialogOnce(dlg) {
  if (dlg.dataset.wired === "1") return;
  dlg.dataset.wired = "1";

  const btnClose = dlg.querySelector("#res-close");
  if (btnClose) {
    btnClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeResources();
    }, { once: false });
  }

  // ESC ferme (événement cancel sur <dialog>)
  dlg.addEventListener("cancel", (e) => {
    // laisser le comportement par défaut, puis garantir l’état propre
    setTimeout(closeResources, 0);
  });

  // Double sécurité: si l’API dialog n’est pas dispo, on simule l’ouverture/fermeture par classe.
  if (typeof dlg.showModal !== "function") {
    dlg.classList.add("hide");
  }
}

/* ---------- API ---------- */
export function openResources() {
  const dlg = buildDialog();
  try {
    if (typeof dlg.showModal === "function") {
      if (!dlg.open) dlg.showModal();
    } else {
      dlg.classList.remove("hide");
      dlg.setAttribute("open", "");
    }
  } catch {
    // Fallback dur
    dlg.classList.remove("hide");
    dlg.setAttribute("open", "");
  }
  // Mettre le focus dans le dialog (évite “gel” perçu)
  const firstBtn = dlg.querySelector("#res-close");
  firstBtn?.focus({ preventScroll: true });
}

export function closeResources() {
  if (!_dlg) return;
  try {
    if (_dlg.open && typeof _dlg.close === "function") _dlg.close();
    _dlg.classList.add("hide");
    _dlg.removeAttribute("open");
  } catch {
    _dlg.classList.add("hide");
    _dlg.removeAttribute("open");
  }
}

/* ---------- Mount: bouton Réglages + lien injecté dans l’AgeGate (anti-doublon) ---------- */
export function mountResources() {
  // Bouton dans Réglages
  const btn = document.getElementById("btn-resources");
  if (btn && btn.dataset.wiredRes !== "1") {
    btn.addEventListener("click", (e) => { e.preventDefault(); openResources(); });
    btn.dataset.wiredRes = "1";
  }

  // Lien unique dans l’AgeGate
  const ageForm = document.querySelector("#agegate .agegate");
  if (ageForm && !ageForm.querySelector("[data-resources-link]")) {
    const p = document.createElement("p");
    p.style.margin = "0 0 .4rem 0";
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = "Ressources et numéros utiles";
    a.setAttribute("data-resources-link", "1");
    p.append("Besoin d'aide ? ", a);
    // Injection après le titre si possible
    const after = ageForm.firstElementChild?.nextSibling || ageForm.firstChild;
    ageForm.insertBefore(p, after);
  }
  const link = document.querySelector("#agegate .agegate [data-resources-link]");
  if (link && link.dataset.wiredRes !== "1") {
    link.addEventListener("click", (e) => { e.preventDefault(); openResources(); });
    link.dataset.wiredRes = "1";
  }
}

/* ---------- Auto-mount robuste (multi-passes sans doublons) ---------- */
function tryMountLater() { try { mountResources(); } catch {} }
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", tryMountLater, { once: true });
} else {
  tryMountLater();
}
// En cas de rendu tardif de l’AgeGate, observer le DOM et monter une seule fois.
const _mo = new MutationObserver(() => tryMountLater());
_mo.observe(document.documentElement, { childList: true, subtree: true });
