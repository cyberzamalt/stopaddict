/* web/js/resources.js — “Ressources & numéros utiles” (FR) */
const $ = (s,r=document)=>r.querySelector(s);

const LIST_FR = [
  { label:"Urgences (UE)",        num:"112",    desc:"Tous services" },
  { label:"Samu",                 num:"15",     desc:"Urgence médicale" },
  { label:"Pompiers",             num:"18",     desc:"Incendie / Secours" },
  { label:"Police / Gendarmerie", num:"17",     desc:"Urgence sécurité" },
  { label:"Urgence sourds/malentendants (SMS)", num:"114", desc:"Texte/visio" },
  { label:"3114",                 num:"3114",   desc:"Prévention suicide" },
  { label:"116 117",              num:"116117", desc:"Médecin de garde" },
  { label:"3919",                 num:"3919",   desc:"Violences femmes" },
  { label:"116 006",              num:"116006", desc:"Aide aux victimes" },
  // Infos addictions (généraux – orientation)
  { label:"Alcool info",          num:"0980980930", desc:"Écoute & conseils" },
  { label:"Tabac info",           num:"3989",   desc:"Aide à l’arrêt" },
  { label:"Drogues info",         num:"0800231313", desc:"Écoute & infos" },
];

function ensureDialog(){
  let dlg = $("#dlg-resources");
  if (dlg) return dlg;

  dlg = document.createElement("dialog");
  dlg.id = "dlg-resources";
  dlg.innerHTML = `
    <form method="dialog" class="agegate" style="min-width:320px">
      <h3>Ressources & numéros utiles</h3>
      <div class="resources-list"></div>
      <div class="actions"><button class="btn">Fermer</button></div>
    </form>`;
  document.body.appendChild(dlg);

  const list = $(".resources-list", dlg);
  LIST_FR.forEach(({label,num,desc})=>{
    const row = document.createElement("div");
    row.className = "resource-item";
    const left = document.createElement("div");
    left.innerHTML = `<strong>${label}</strong><br><small>${desc||""}</small>`;
    const right = document.createElement("div");
    const link = document.createElement("a");
    link.href = `tel:${num}`;
    link.textContent = num.replace(/(\d{2})(?=\d)/g,"$1 ");
    link.setAttribute("rel","noopener");
    right.appendChild(link);
    row.append(left,right);
    list.appendChild(row);
  });

  return dlg;
}

function wireButton(){
  const btn = $("#btn-resources");
  if (!btn) return;
  btn.addEventListener("click", ()=>{
    const dlg = ensureDialog();
    try { dlg.showModal(); } catch { dlg.show(); }
  }, { once:false });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireButton);
} else {
  wireButton();
}
