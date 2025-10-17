// web/js/i18n.js
const STORAGE_KEY = "sa:lang";
const SUPPORTED = ["fr", "en"];
let current = localStorage.getItem(STORAGE_KEY) || (navigator.language || "fr").slice(0,2);
if (!SUPPORTED.includes(current)) current = "fr";

let dict = {};

function applyTexts(root = document){
  // Remplace tout [data-i18n] par la clé dans le dictionnaire
  root.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const txt = key.split("|").map(k => dict[k.trim()] ?? "").filter(Boolean).join(" ");
    if (txt) el.textContent = txt;
  });

  // Placeholders sur inputs
  root.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    const k = el.getAttribute("data-i18n-ph");
    if (k && dict[k]) el.setAttribute("placeholder", dict[k]);
  });

  // Titres (tooltips)
  root.querySelectorAll("[data-i18n-title]").forEach(el=>{
    const k = el.getAttribute("data-i18n-title");
    if (k && dict[k]) el.setAttribute("title", dict[k]);
  });
}

async function loadLang(lang){
  const url = `./i18n/${lang}.json`;
  const res = await fetch(url, { cache:"no-store" });
  dict = await res.json();
  current = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTexts(document);
  document.dispatchEvent(new CustomEvent("sa:langChanged", { detail:{ lang } }));
}

export async function initI18n(){
  // peupler le sélecteur s’il existe
  const select = document.getElementById("langSelect");
  if (select){
    // options fixes FR/EN
    select.innerHTML = `
      <option value="fr">Français</option>
      <option value="en">English</option>
    `;
    select.value = current;
    select.addEventListener("change", ()=> loadLang(select.value));
  }
  await loadLang(current);
}

export function t(key){ return dict[key] ?? key; } // util si besoin
