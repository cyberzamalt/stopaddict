// web/js/pages.js
// Gestion des pages modales (manuel / mentions / CGV / ressources)
// ➜ Sans dépendance externe ; utilise utils seulement si présent.

let RES_CACHE = null;

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function openModal() {
  const m = $("#modal-page");
  if (!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden", "false");
}
function closeModal() {
  const m = $("#modal-page");
  if (!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden", "true");
}

function setPageContent(title, html) {
  const t = $("#page-title");
  const c = $("#page-content");
  if (t) t.textContent = title || "—";
  if (c) c.innerHTML = html || "<p style='color:#777'>Aucun contenu.</p>";
}

async function loadResourcesJSON() {
  if (RES_CACHE) return RES_CACHE;
  try {
    const res = await fetch("./data/resources.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    RES_CACHE = await res.json();
  } catch (e) {
    RES_CACHE = { title: "Ressources utiles", items: [] };
  }
  return RES_CACHE;
}

function makeResourcesHTML(data) {
  const items = (data && data.items) || [];
  if (!items.length) {
    return "<p style='color:#777'>Aucune ressource disponible pour le moment.</p>";
  }
  const rows = items.map((it) => {
    const lab = it.label || "Ressource";
    const phone = it.phone ? `<div><strong>☎</strong> <a href="tel:${it.phone}">${it.phone}</a></div>` : "";
    const web = it.url ? `<div><strong>🌐</strong> <a href="${it.url}" target="_blank" rel="noopener">${it.url}</a></div>` : "";
    const desc = it.desc ? `<div style="color:#555">${it.desc}</div>` : "";
    return `<div class="banner" style="margin:8px 0">
      <div class="banner-title">${lab}</div>
      ${desc}${phone}${web}
    </div>`;
  }).join("");
  return rows;
}

// Pages simples intégrées (fallback minimal)
const SIMPLE_PAGES = {
  manuel: {
    title: "Manuel d’utilisation",
    html: `
      <div class="banner"><div class="banner-title">Bienvenue dans StopAddict</div>
      <p>Ajoutez vos consommations via <strong>+1 / −1</strong>. Consultez vos <strong>stats</strong>, exportez/importez votre
      historique, et utilisez le <strong>calendrier</strong> pour corriger un jour.</p></div>`
  },
  mentions: {
    title: "Mentions légales",
    html: `<p style="color:#555">Application personnelle non médicale. Données stockées en local sur votre appareil.</p>`
  },
  cgv: {
    title: "CGV",
    html: `<p style="color:#555">Version gratuite ; aucune transaction intégrée ici. Les termes évolueront si une offre payante est proposée.</p>`
  }
};

function wireStaticButtons() {
  const closeBtn = $("#btn-page-close");
  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  // Ouvre "Ressources" depuis l’avertissement 18+
  const openResFromWarn = $("#open-ressources-from-warn");
  if (openResFromWarn) {
    openResFromWarn.addEventListener("click", async (e) => {
      e.preventDefault();
      try { const data = await loadResourcesJSON(); setPageContent(data.title || "Ressources", makeResourcesHTML(data)); }
      catch { setPageContent("Ressources", "<p>Impossible de charger les ressources.</p>"); }
      openModal();
    });
  }

  // Tout lien portant data-page="manuel|mentions|cgv|ressources"
  $$("[data-page]").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      const kind = a.getAttribute("data-page");
      if (kind === "ressources") {
        const data = await loadResourcesJSON();
        setPageContent(data.title || "Ressources", makeResourcesHTML(data));
        openModal();
        return;
      }
      const page = SIMPLE_PAGES[kind];
      setPageContent(page?.title || "—", page?.html || "");
      openModal();
    });
  });
}

export function initPages() {
  // Fermer sur clic fond
  const modal = $("#modal-page");
  if (modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  }
  wireStaticButtons();
}
