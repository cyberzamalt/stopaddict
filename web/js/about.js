// web/js/about.js
import { t } from "./i18n.js";

document.addEventListener("DOMContentLoaded", () => {
  const ageOk = document.getElementById("ageOk");
  const emergencyBtn = document.getElementById("btnEmergency");
  const clearHint = document.getElementById("btnShowEraseHint");

  if (ageOk) {
    ageOk.addEventListener("change", () => {
      localStorage.setItem("sa:ageOk", ageOk.checked ? "1" : "0");
    });
    ageOk.checked = localStorage.getItem("sa:ageOk") === "1";
  }

  if (emergencyBtn) {
    emergencyBtn.addEventListener("click", () => {
      alert(
        t("emergency.alert.title") + "\n" +
        "• " + t("emergency.num.samu")   + "\n" +
        "• " + t("emergency.num.police") + "\n" +
        "• " + t("emergency.num.fire")   + "\n" +
        "• " + t("emergency.num.eu")     + "\n\n" +
        t("emergency.alert.hint")
      );
    });
  }

  if (clearHint) {
    clearHint.addEventListener("click", () => {
      const target = document.getElementById("btnClearAll");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("warn");
        setTimeout(() => target.classList.remove("warn"), 1500);
      }
    });
  }
});
