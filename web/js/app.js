// web/js/app.js — Boot minimal (onglets + âge + montage ressources)
// Module unique : ne dépend PAS de globals externes.

const $  = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/* ------- State (optionnel, si présent) ------- */
let LS_AGE = "stopaddict:age_ack";
try {
  const st = await import("./state.js");
  if (st?.LS_AGE) LS_AGE = st.LS_AGE;
} catch { /* facultatif */ }

/* ------- Onglets ------- */
const PAGES = {
  home:     "#page-home",
  stats:    "#page-stats",
  calendar: "#page-calendar",
  habits:   "#page-habits",
  settings: "#page-settings",
};

function showTab(id) {
  // pages
  Object.values(PAGES).forEach(sel => $(sel)?.classList.add("hide"));
  $(PAGES[id])?.classList.remove("hide");

  // boutons
  $$("#tabs .tab").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
}

function initTabs() {
  $$("#tabs .tab").forEach(btn => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
  });
  showTab("home");
}

/* ------- Age Gate (+18) ------- */
function initAgeGate() {
  const dlg   = $("#agegate");
  const ok    = $("#btn-age-accept");
  const cb18  = $("#age-18plus");
  const cbHide= $("#age-hide");

  if (!dlg || !ok || !cb18) return;

  // Ne PAS pré-cocher
  cb18.checked = false;
  cbHide.checked = false;
  ok.disabled = true;

  // Déjà accepté ?
  const ack = localStorage.getItem(LS_AGE);
  if (ack === "1") {
    dlg.classList.add("hide");
  } else {
    try { dlg.showModal?.(); } catch {}
    dlg.classList.remove("hide");
  }

  cb18.addEventListener("change", () => { ok.disabled = !cb18.checked; });

  ok.addEventListener("click", (e) => {
    e.preventDefault();
    if (!cb18.checked) return;
    if (cbHide.checked) localStorage.setItem(LS_AGE, "1");
    try { dlg.close?.(); } catch {}
    dlg.classList.add("hide");
  });
}

/* ------- Ressources (dialog) ------- */
async function mountResources() {
  try {
    const R = await import("./resources.js");
    R?.mountResources?.();
  } catch {
    // Silencieux si le module n’est pas encore là
  }
}

/* ------- Boot ------- */
(function boot() {
  initTabs();
  initAgeGate();
  mountResources();

  // Optionnel : si la console debug existe et qu’un checkbox l’active, la (dé)plier
  const cb = $("#cb-debug-overlay");
  const box = $("#debug-console");
  if (cb && box) {
    cb.addEventListener("change", () => {
      box.classList.toggle("hide", !cb.checked);
    });
  }
})();
