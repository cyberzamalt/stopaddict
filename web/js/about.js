// web/js/about.js
// Auto-init (pas besoin de toucher app.js)
document.addEventListener("DOMContentLoaded", () => {
  const ageOk = document.getElementById("ageOk");
  const emergencyBtn = document.getElementById("btnEmergency");
  const clearHint = document.getElementById("btnShowEraseHint");

  if (ageOk) {
    ageOk.addEventListener("change", () => {
      localStorage.setItem("sa:ageOk", ageOk.checked ? "1" : "0");
    });
    // restaure l'état
    ageOk.checked = localStorage.getItem("sa:ageOk") === "1";
  }

  if (emergencyBtn) {
    emergencyBtn.addEventListener("click", () => {
      // simple rappel visuel/sonore côté UX (sans appel automatique)
      alert(
        "Numéros d'urgence (exemples France) :\n" +
        "• 15 — SAMU (urgence médicale)\n" +
        "• 17 — Police Secours\n" +
        "• 18 — Pompiers\n" +
        "• 112 — Numéro d'urgence européen\n\n" +
        "Appelle directement depuis ton téléphone."
      );
    });
  }

  if (clearHint) {
    clearHint.addEventListener("click", () => {
      // renvoie vers la section Import/Export où se trouve “Effacer toutes les données”
      const target = document.getElementById("btnClearAll");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("warn");
        setTimeout(() => target.classList.remove("warn"), 1500);
      }
    });
  }
});
