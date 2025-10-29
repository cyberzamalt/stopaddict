// web/js/pages.js
// Pages modales : Manuel / CGV / Mentions / Ressources (data/resources.json).
// Exporte initPages() + openPage(id).

import { $ } from "./utils.js";

const MODAL_ID = "modal-page";
const TITLE_ID = "page-title";
const CONTENT_ID = "page-content";
const BTN_CLOSE_ID = "btn-page-close";

const FALLBACKS = {
  manual: `
    <h4>Manuel d’utilisation</h4>
    <p>• Accueil : ajoute/retire tes consommations du jour.<br>
       • Statistiques : change l’échelle (Jour/Semaine/Mois/Année).<br>
       • Calendrier : appuie sur un jour pour ajuster manuellement.<br>
       • Habitudes : renseigne tes limites et habitudes de base.<br>
       • Réglages : active/désactive les modules, définis prix & dates.</p>
  `,
  cgv: `
    <h4>Conditions Générales</h4>
    <p>Application fournie « en l’état ». Pas de garantie de résultat. 
       Aucune promotion de produits nocifs. Utilisation responsable requise.</p>
  `,
  legal: `
    <h4>Mentions légales</h4>
    <p>StopAddict est une application personnelle d’auto-suivi. 
       En cas de difficulté, rapprochez-vous d’un professionnel.</p>
  `,
  resources: `
    <h4>Ressources & Numéros utiles</h4>
    <p>Chargement…</p>
  `
};

async function fetchJSON(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP "+r.status);
    return await r.json();
  } catch (e) {
    console.warn("[pages] fetch fail", url, e);
    return null;
  }
}

function renderResources(list) {
  if (!Array.isArray(list) || !list.length) {
    return `<p>Aucune ressource locale. Ajoute/complète <code>web/data/resources.json</code>.</p>`;
  }
  return `
    <div class="resources">
      ${list.map(it => `
        <div class="card" style="margin:8px 0;padding:10px">
          <div style="font-weight:800">${it.title || "Ressource"}</div>
          <div style="font-size:13px;color:#555">${it.desc || ""}</div>
          ${it.phone ? `<div style="margin-top:6px"><a href="tel:${it.phone}" class="btn small">📞 ${it.phone}</a></div>` : ""}
          ${it.url ? `<div style="margin-top:6px"><a href="${it.url}" target="_blank" rel="noopener" class="btn small alt">🌐 Site</a></div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

async function buildContent(id) {
  if (id === "resources") {
    const data = await fetchJSON("./data/resources.json");
    return renderResources(data || []);
  }
  if (id === "manual") return FALLBACKS.manual;
  if (id === "cgv")    return FALLBACKS.cgv;
  if (id === "legal")  return FALLBACKS.legal;
  return `<p>Page inconnue.</p>`;
}

function setModalVisible(show) {
  const modal = document.getElementById(MODAL_ID);
  if (!modal) return;
  modal.classList[show ? "add" : "remove"]("show");
  modal.setAttribute("aria-hidden", show ? "false" : "true");
}

export async function openPage(id) {
  try {
    const modal = document.getElementById(MODAL_ID);
    const title = document.getElementById(TITLE_ID);
    const content = document.getElementById(CONTENT_ID);
    if (!modal || !title || !content) return;

    const labels = {
      manual: "Manuel",
      cgv: "Conditions Générales",
      legal: "Mentions légales",
      resources: "Ressources & numéros utiles",
    };

    title.textContent = labels[id] || "Page";
    content.innerHTML = FALLBACKS[id] || "<p>…</p>";
    setModalVisible(true);

    // Async enrich (ex: resources)
    const html = await buildContent(id);
    content.innerHTML = html;
  } catch (e) {
    console.warn("[pages.openPage] error:", e);
  }
}

function wireClose() {
  const btn = document.getElementById(BTN_CLOSE_ID);
  const modal = document.getElementById(MODAL_ID);
  if (btn && !btn.__wired) {
    btn.__wired = true;
    btn.addEventListener("click", () => setModalVisible(false));
  }
  if (modal && !modal.__wiredBackdrop) {
    modal.__wiredBackdrop = true;
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal) setModalVisible(false);
    });
  }
  window.addEventListener("keydown", (e)=> {
    if (e.key === "Escape") setModalVisible(false);
  });
}

function wireKnownOpeners() {
  // Lien depuis la modale 18+
  const a = $("#open-ressources-from-warn");
  if (a && !a.__wired) {
    a.__wired = true;
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      openPage("resources");
    });
  }

  // Tout élément portant data-open-page="xxx"
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-open-page]");
    if (!t) return;
    ev.preventDefault();
    const id = t.getAttribute("data-open-page");
    if (id) openPage(id);
  });
}

export function initPages() {
  try {
    wireClose();
    wireKnownOpeners();
    console.log("[pages] ✓ ready");
  } catch (e) {
    console.warn("[pages.init] error:", e);
  }
}
