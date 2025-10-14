// web/js/app.js
(() => {
  const $ = (sel) => document.querySelector(sel);

  const btnImport  = $("#btnImport");
  const inputFile  = $("#fileJson");
  const feedbackEl = $("#feedback");
  const previewEl  = $("#preview");
  const ecoAmount  = $("#economies-amount");

  /** Utilitaires feedback */
  function clearFeedback() {
    feedbackEl.className = "feedback";
    feedbackEl.textContent = "";
  }
  function setFeedback(type, msg) {
    feedbackEl.className = `feedback ${type}`;
    feedbackEl.textContent = msg;
  }

  /** Affiche un extrait joli du JSON (limité) */
  function showPreview(obj) {
    const pretty = JSON.stringify(obj, null, 2) || "";
    const maxChars = 4000; // éviter de tout afficher si très gros
    previewEl.textContent = pretty.length > maxChars ? pretty.slice(0, maxChars) + "\n…(tronqué)" : pretty;
    previewEl.hidden = false;
  }

  /** Sanity-check très léger : on accepte large, mais on vérifie qu’on a un objet */
  function isPlausibleData(data) {
    // On tolère plusieurs structures, mais il faut au minimum un objet non null.
    if (data && typeof data === "object") {
      return true;
    }
    return false;
  }

  /** Sauvegarde le JSON pour les prochaines étapes (export CSV, graphiques…) */
  function saveData(data) {
    localStorage.setItem("stopaddict:data", JSON.stringify({
      importedAt: new Date().toISOString(),
      payload: data
    }));
  }

  /** Gestion import */
  btnImport?.addEventListener("click", () => {
    inputFile?.click();
  });

  inputFile?.addEventListener("change", async (e) => {
    clearFeedback();
    previewEl.hidden = true;

    const file = e.target.files?.[0];
    if (!file) {
      setFeedback("info", "Aucun fichier sélectionné.");
      return;
    }

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        setFeedback("error", "Le fichier n’est pas un JSON valide.");
        return;
      }

      if (!isPlausibleData(data)) {
        setFeedback("error", "Structure JSON non reconnue (attendu: un objet).");
        return;
      }

      // Ok : on prévisualise et on stocke
      saveData(data);
      setFeedback("ok", "Import réussi. Données enregistrées (local).");
      showPreview(data);

      // Optionnel : mettre quelque chose dans la carte “Économies estimées”
      if (ecoAmount) {
        ecoAmount.textContent = "—"; // Le calcul viendra dans une étape suivante
      }
    } catch (err) {
      console.error(err);
      setFeedback("error", "Une erreur est survenue pendant l’import.");
    } finally {
      // Réinitialise l’input pour pouvoir ré-importer le même fichier si besoin
      inputFile.value = "";
    }
  });
})();
