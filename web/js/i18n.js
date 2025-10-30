// web/js/i18n.js
// -----------------------------------------------------------------------------
// Système d'internationalisation (i18n)
// - Gère le changement de langue (fr/en)
// - Remplace automatiquement {currency} par le symbole de devise
// - Applique les traductions sur tous les éléments [data-i18n]
// -----------------------------------------------------------------------------

const STORAGE_KEY = "sa:lang";
const SUPPORTED = ["fr", "en"];
let current = localStorage.getItem(STORAGE_KEY) || (navigator.language || "fr").slice(0, 2);
if (!SUPPORTED.includes(current)) current = "fr";

let dict = {};

function applyTexts(root = document) {
  console.log("[i18n] Application des textes sur le DOM...");
  try {
    // Remplace tout [data-i18n] par la clé dans le dictionnaire
    const elements = root.querySelectorAll("[data-i18n]");
    console.log("[i18n] Éléments [data-i18n] trouvés:", elements.length);
    
    elements.forEach(el => {
      try {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        
        const txt = key.split("|").map(k => {
          const translated = dict[k.trim()];
          return translated ?? "";
        }).filter(Boolean).join(" ");
        
        if (txt) {
          el.textContent = txt;
          console.log("[i18n] Texte appliqué:", key, "→", txt);
        }
      } catch (err) {
        console.error("[i18n] Erreur application texte élément:", el, err);
      }
    });

    // Placeholders sur inputs
    const phElements = root.querySelectorAll("[data-i18n-ph]");
    console.log("[i18n] Éléments [data-i18n-ph] trouvés:", phElements.length);
    
    phElements.forEach(el => {
      try {
        const k = el.getAttribute("data-i18n-ph");
        if (k && dict[k]) {
          el.setAttribute("placeholder", dict[k]);
          console.log("[i18n] Placeholder appliqué:", k, "→", dict[k]);
        }
      } catch (err) {
        console.error("[i18n] Erreur application placeholder:", el, err);
      }
    });

    // Titres (tooltips)
    const titleElements = root.querySelectorAll("[data-i18n-title]");
    console.log("[i18n] Éléments [data-i18n-title] trouvés:", titleElements.length);
    
    titleElements.forEach(el => {
      try {
        const k = el.getAttribute("data-i18n-title");
        if (k && dict[k]) {
          el.setAttribute("title", dict[k]);
          console.log("[i18n] Titre appliqué:", k, "→", dict[k]);
        }
      } catch (err) {
        console.error("[i18n] Erreur application titre:", el, err);
      }
    });

    console.log("[i18n] Application des textes terminée");
  } catch (err) {
    console.error("[i18n] Erreur globale applyTexts:", err);
  }
}

async function loadLang(lang) {
  console.log("[i18n] ========== Chargement langue:", lang, "==========");
  try {
    const url = `./i18n/${lang}.json`;
    console.log("[i18n] URL:", url);
    
    const res = await fetch(url, { cache: "no-store" });
    console.log("[i18n] Fetch réussi, status:", res.status);
    
    if (!res.ok) {
      throw new Error(`Erreur HTTP: ${res.status}`);
    }
    
    dict = await res.json();
    console.log("[i18n] Dictionnaire chargé:", Object.keys(dict).length, "clés");
    console.log("[i18n] Symbole devise:", dict["currency.symbol"]);
    
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    console.log("[i18n] Langue sauvegardée:", lang);
    
    applyTexts(document);
    
    document.dispatchEvent(new CustomEvent("sa:langChanged", { detail: { lang } }));
    console.log("[i18n] Événement sa:langChanged émis");
    console.log("[i18n] ========== Chargement terminé ==========");
  } catch (err) {
    console.error("[i18n] ========== ERREUR CHARGEMENT LANGUE ==========", err);
  }
}

export async function initI18n() {
  console.log("[i18n] ========== Initialisation module i18n ==========");
  console.log("[i18n] Langues supportées:", SUPPORTED);
  console.log("[i18n] Langue détectée:", current);
  
  try {
    // peupler le sélecteur s'il existe
    const select = document.getElementById("langSelect");
    if (select) {
      console.log("[i18n] Sélecteur de langue trouvé");
      // options fixes FR/EN
      select.innerHTML = `
        <option value="fr">Français</option>
        <option value="en">English</option>
      `;
      select.value = current;
      console.log("[i18n] Valeur sélecteur:", current);
      
      select.addEventListener("change", () => {
        console.log("[i18n] Changement de langue via sélecteur:", select.value);
        loadLang(select.value);
      });
      
      console.log("[i18n] Événement changement langue configuré");
    } else {
      console.warn("[i18n] Sélecteur de langue #langSelect non trouvé");
    }
    
    await loadLang(current);
    console.log("[i18n] ========== Initialisation terminée ==========");
  } catch (err) {
    console.error("[i18n] ========== ERREUR INITIALISATION ==========", err);
  }
}

/**
 * Traduit une clé et remplace les placeholders comme {currency}
 * @param {string} key - Clé de traduction
 * @returns {string} - Texte traduit avec remplacements
 */
export function t(key) {
  try {
    let text = dict[key] || key;
    
    // Remplacer {currency} par le symbole de devise
    if (text.includes('{currency}')) {
      const symbol = dict['currency.symbol'] || '€';
      text = text.replace(/{currency}/g, symbol);
      console.log("[i18n] Remplacement currency:", key, "→", text);
    }
    
    return text;
  } catch (err) {
    console.error("[i18n] Erreur traduction clé:", key, err);
    return key;
  }
}

/**
 * Obtient le symbole de devise actuel
 * @returns {string} - Symbole (€, £, etc.)
 */
export function getCurrencySymbol() {
  try {
    const symbol = dict['currency.symbol'] || '€';
    console.log("[i18n] Symbole devise:", symbol);
    return symbol;
  } catch (err) {
    console.error("[i18n] Erreur récupération symbole devise:", err);
    return '€';
  }
}

/**
 * Obtient la langue courante
 * @returns {string} - Code langue (fr, en)
 */
export function getCurrentLang() {
  return current;
}

/**
 * Change la langue
 * @param {string} lang - Code langue (fr, en)
 */
export async function setLang(lang) {
  console.log("[i18n] Changement de langue vers:", lang);
  try {
    if (SUPPORTED.includes(lang)) {
      await loadLang(lang);
    } else {
      console.warn("[i18n] Langue non supportée:", lang);
    }
  } catch (err) {
    console.error("[i18n] Erreur changement langue:", err);
  }
}
