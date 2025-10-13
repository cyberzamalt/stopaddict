// web/js/app.js

const i18n = {
  fr: {
    import: "Importer JSON",
    pick_file: "Choisir un fichier JSON…",
    parsing: "Lecture du fichier…",
    import_success: "Import réussi ✔",
    invalid: "Fichier invalide ✖",
  },
};
const t = (k) => (i18n.fr[k] ?? k);
const $ = (s) => document.querySelector(s);

document.addEventListener("DOMContentLoaded", () => {
  const btn = $("#btnImport");
  const file = $("#fileJson");
  const feedback = $("#feedback");
  const preview = $("#preview");

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  const setFeedback = (msg, type = "info") => {
    feedback.className = `feedback ${type}`;
    feedback.textContent = msg;
  };

  btn.addEventListener("click", () => {
    setFeedback(t("pick_file"), "info");
    file.click();
  });

  file.addEventListener("change", async () => {
    if (!file.files?.[0]) return;
    setFeedback(t("parsing"), "info");
    try {
      const text = await file.files[0].text();
      const data = JSON.parse(text);
      window.__data = data;

      const sample = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
      preview.hidden = false;
      preview.textContent = sample.slice(0, 1000);

      setFeedback(t("import_success"), "ok");
    } catch {
      preview.hidden = true;
      preview.textContent = "";
      setFeedback(t("invalid"), "error");
    } finally {
      file.value = "";
    }
  });
});
