// web/js/calendar.js
// ------------------------------------------------------------
// Calendrier mensuel + Modale "jour"
// - Rend la grille du mois (dots par type s'il y a des données)
// - Ouvre une modale pour éditer un jour précis (+/−, RAZ)
// - Respecte les segments actifs (cigs: classic/rolled/tube, alcohol: beer/fort/liqueur)
// - Écoute le bus interne (on(...)) pour se rafraîchir après import/édition/etc.
// - UTILISE calculateDayCost() de state.js pour afficher les coûts
// ------------------------------------------------------------
import {
  getDaily,
  saveDaily,
  addEntry,
  removeOne,           // (dateKey, type) → retire 1 unité d'un type pour ce jour
  ymd,
  getActiveSegments,
  setActiveSegment,
  on,                  // écoute du bus interne
  emit,
  calculateDayCost,    // calcul centralisé des coûts
} from "./state.js";

let currentMonth = new Date();     // mois affiché
let selectedDate = null;           // jour courant dans la modale

// ----- Helpers de dates -----
function startOfMonth(d) {
  try {
    const x = new Date(d.getFullYear(), d.getMonth(), 1);
    x.setHours(0, 0, 0, 0);
    return x;
  } catch (err) {
    console.error("[Calendar] Erreur startOfMonth:", err);
    return new Date();
  }
}

function endOfMonth(d) {
  try {
    const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    x.setHours(23, 59, 59, 999);
    return x;
  } catch (err) {
    console.error("[Calendar] Erreur endOfMonth:", err);
    return new Date();
  }
}

function daysInMonth(d) {
  try {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  } catch (err) {
    console.error("[Calendar] Erreur daysInMonth:", err);
    return 30;
  }
}

function isSameDay(a, b) {
  try {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
  } catch (err) {
    console.error("[Calendar] Erreur isSameDay:", err);
    return false;
  }
}

function fmtMonthTitle(d) {
  try {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  } catch (err) {
    console.error("[Calendar] Erreur fmtMonthTitle:", err);
    return "Mois";
  }
}

function fmtDayLong(d) {
  try {
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  } catch (err) {
    console.error("[Calendar] Erreur fmtDayLong:", err);
    return "Jour";
  }
}

// ----- Rendu de la grille -----
function renderGrid() {
  console.log("[Calendar] ========== Rendu grille calendrier ==========");
  try {
    const grid = document.getElementById("cal-grid");
    const title = document.getElementById("cal-titre");
    if (!grid || !title) {
      console.warn("[Calendar] Éléments #cal-grid ou #cal-titre non trouvés");
      return;
    }

    title.textContent = fmtMonthTitle(currentMonth);
    console.log("[Calendar] Titre mois:", title.textContent);
    grid.innerHTML = "";

    const today = new Date();
    const totalDays = daysInMonth(currentMonth);
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    console.log("[Calendar] Rendu de", totalDays, "jours pour", year + "-" + (month + 1));

    for (let d = 1; d <= totalDays; d++) {
      try {
        const date = new Date(year, month, d);
        const key = ymd(date);
        const dayData = getDaily(key) || {};

        const cell = document.createElement("div");
        cell.className = "cal-cell";
        if (isSameDay(date, today)) {
          cell.classList.add("today");
          console.log("[Calendar] Jour actuel:", key);
        }

        // badge jour
        const num = document.createElement("div");
        num.className = "cal-num";
        num.textContent = String(d);
        cell.appendChild(num);

        // dots selon types existants
        let has = false;
        const c = Number(dayData.cigs || 0);
        const j = Number(dayData.weed || 0);
        const a = Number(dayData.alcohol || 0);
        
        if (c > 0) { 
          const dot = document.createElement("span"); 
          dot.className = "dot c"; 
          cell.appendChild(dot); 
          has = true; 
        }
        if (j > 0) { 
          const dot = document.createElement("span"); 
          dot.className = "dot j"; 
          cell.appendChild(dot); 
          has = true; 
        }
        if (a > 0) { 
          const dot = document.createElement("span"); 
          dot.className = "dot a"; 
          cell.appendChild(dot); 
          has = true; 
        }
        
        if (has) {
          cell.classList.add("has-data");
          
          // Ajouter coût du jour si données présentes
          const cost = calculateDayCost(dayData);
          if (cost > 0) {
            const costLabel = document.createElement("div");
            costLabel.className = "cal-cost";
            costLabel.textContent = cost.toFixed(2) + "€";
            cell.appendChild(costLabel);
            console.log("[Calendar] Coût pour", key, ":", cost, "€");
          }
        }

        // ouverture modale
        cell.addEventListener("click", () => openDayModal(date));

        grid.appendChild(cell);
      } catch (err) {
        console.error("[Calendar] Erreur rendu jour", d, ":", err);
      }
    }

    console.log("[Calendar] Grille rendue avec succès");
  } catch (err) {
    console.error("[Calendar] ========== ERREUR RENDU GRILLE ==========", err);
  }
}

// ----- Modale jour -----
function updateDayModalCounts() {
  console.log("[Calendar] Mise à jour compteurs modale jour");
  try {
    if (!selectedDate) {
      console.warn("[Calendar] Pas de date sélectionnée");
      return;
    }
    
    const key = ymd(selectedDate);
    const dayData = getDaily(key) || {};
    console.log("[Calendar] Données jour", key, ":", dayData);

    const elCl = document.getElementById("cal-jour-cl");
    const elJ  = document.getElementById("cal-jour-j");
    const elA  = document.getElementById("cal-jour-a");
    const elCost = document.getElementById("cal-jour-cost");

    if (elCl) elCl.textContent = String(Number(dayData.cigs || 0));
    if (elJ)  elJ.textContent  = String(Number(dayData.weed || 0));
    if (elA)  elA.textContent  = String(Number(dayData.alcohol || 0));

    // Afficher coût du jour
    if (elCost) {
      const cost = calculateDayCost(dayData);
      elCost.textContent = cost > 0 ? cost.toFixed(2) + "€" : "0€";
      console.log("[Calendar] Coût jour affiché:", cost, "€");
    }

    console.log("[Calendar] Compteurs mis à jour");
  } catch (err) {
    console.error("[Calendar] Erreur updateDayModalCounts:", err);
  }
}

function wireDayModalSegments() {
  console.log("[Calendar] Configuration segments modale");
  try {
    const uiSeg = getActiveSegments();
    console.log("[Calendar] Segments actifs:", uiSeg);
    
    // Segments cigs
    const segC = document.getElementById("cal-jour-seg-cl");
    if (segC) {
      segC.querySelectorAll(".seg").forEach(btn => {
        try {
          const sub = btn.dataset.subtype || "classic";
          btn.classList.toggle("actif", sub === uiSeg.cigs);
          btn.addEventListener("click", () => {
            console.log("[Calendar] Changement segment cigs:", sub);
            setActiveSegment("cigs", sub);
            segC.querySelectorAll(".seg").forEach(b => b.classList.toggle("actif", b === btn));
          });
        } catch (err) {
          console.error("[Calendar] Erreur wire segment cigs:", err);
        }
      });
      console.log("[Calendar] Segments cigs configurés");
    }
    
    // Segments alcool
    const segA = document.getElementById("cal-jour-seg-a");
    if (segA) {
      segA.querySelectorAll(".seg").forEach(btn => {
        try {
          const sub = btn.dataset.subtype || "beer";
          btn.classList.toggle("actif", sub === uiSeg.alcohol);
          btn.addEventListener("click", () => {
            console.log("[Calendar] Changement segment alcohol:", sub);
            setActiveSegment("alcohol", sub);
            segA.querySelectorAll(".seg").forEach(b => b.classList.toggle("actif", b === btn));
          });
        } catch (err) {
          console.error("[Calendar] Erreur wire segment alcohol:", err);
        }
      });
      console.log("[Calendar] Segments alcool configurés");
    }
  } catch (err) {
    console.error("[Calendar] Erreur wireDayModalSegments:", err);
  }
}

function wireDayModalButtons() {
  console.log("[Calendar] Configuration boutons modale");
  try {
    // +/− sur la date sélectionnée (pas aujourd'hui forcément)
    const map = [
      ["cal-cl-plus",  "cigs",    +1],
      ["cal-cl-moins", "cigs",    -1],
      ["cal-j-plus",   "weed",    +1],
      ["cal-j-moins",  "weed",    -1],
      ["cal-a-plus",   "alcohol", +1],
      ["cal-a-moins",  "alcohol", -1],
    ];
    
    map.forEach(([id, type, delta]) => {
      try {
        const btn = document.getElementById(id);
        if (!btn) {
          console.warn("[Calendar] Bouton", id, "non trouvé");
          return;
        }
        
        btn.onclick = () => {
          console.log("[Calendar] Clic bouton", id, "- Type:", type, "Delta:", delta);
          try {
            if (!selectedDate) {
              console.warn("[Calendar] Pas de date sélectionnée");
              return;
            }
            
            const key = ymd(selectedDate);
            if (delta > 0) {
              addEntry(type, +1, selectedDate);   // cible ce jour
              console.log("[Calendar] Ajout +1", type, "pour", key);
            } else {
              removeOne(key, type);                // retire 1 pour ce jour
              console.log("[Calendar] Retrait -1", type, "pour", key);
            }
            
            updateDayModalCounts();
            renderGrid();                          // met à jour la grille (dots)
            emit("ui:day-edited", { key, type, delta });
          } catch (err) {
            console.error("[Calendar] Erreur clic bouton", id, ":", err);
          }
        };
      } catch (err) {
        console.error("[Calendar] Erreur configuration bouton", id, ":", err);
      }
    });

    const raz = document.getElementById("cal-jour-raz");
    if (raz) {
      raz.onclick = () => {
        console.log("[Calendar] Clic RAZ jour");
        try {
          if (!selectedDate) {
            console.warn("[Calendar] Pas de date sélectionnée");
            return;
          }
          
          const key = ymd(selectedDate);
          console.log("[Calendar] RAZ données pour", key);
          saveDaily(key, {});              // RAZ
          updateDayModalCounts();
          renderGrid();
          emit("state:daily", { key });    // notifie le bus
          console.log("[Calendar] RAZ effectuée");
        } catch (err) {
          console.error("[Calendar] Erreur RAZ:", err);
        }
      };
    } else {
      console.warn("[Calendar] Bouton RAZ non trouvé");
    }

    const close = document.getElementById("cal-jour-fermer");
    if (close) {
      close.onclick = closeDayModal;
      console.log("[Calendar] Bouton fermer configuré");
    } else {
      console.warn("[Calendar] Bouton fermer non trouvé");
    }

    console.log("[Calendar] Boutons modale configurés");
  } catch (err) {
    console.error("[Calendar] Erreur wireDayModalButtons:", err);
  }
}

function openDayModal(date) {
  console.log("[Calendar] Ouverture modale jour:", ymd(date));
  try {
    selectedDate = new Date(date.getTime());
    selectedDate.setHours(12, 0, 0, 0); // évite soucis fuseau

    const modal = document.getElementById("cal-jour");
    const titre = document.getElementById("cal-jour-titre");
    if (!modal || !titre) {
      console.warn("[Calendar] Modale #cal-jour ou titre non trouvés");
      return;
    }

    titre.textContent = fmtDayLong(selectedDate);
    console.log("[Calendar] Titre modale:", titre.textContent);
    
    wireDayModalSegments();
    updateDayModalCounts();

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    console.log("[Calendar] Modale ouverte");
  } catch (err) {
    console.error("[Calendar] Erreur openDayModal:", err);
  }
}

function closeDayModal() {
  console.log("[Calendar] Fermeture modale jour");
  try {
    const modal = document.getElementById("cal-jour");
    if (!modal) {
      console.warn("[Calendar] Modale #cal-jour non trouvée");
      return;
    }
    
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    selectedDate = null;
    console.log("[Calendar] Modale fermée");
  } catch (err) {
    console.error("[Calendar] Erreur closeDayModal:", err);
  }
}

// ----- Navigation mois -----
function wireMonthNav() {
  console.log("[Calendar] Configuration navigation mois");
  try {
    const prev = document.getElementById("cal-prev");
    const next = document.getElementById("cal-next");
    
    if (prev) {
      prev.onclick = () => { 
        console.log("[Calendar] Navigation mois précédent");
        try {
          currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1); 
          renderGrid(); 
        } catch (err) {
          console.error("[Calendar] Erreur nav précédent:", err);
        }
      };
      console.log("[Calendar] Bouton précédent configuré");
    } else {
      console.warn("[Calendar] Bouton précédent non trouvé");
    }
    
    if (next) {
      next.onclick = () => { 
        console.log("[Calendar] Navigation mois suivant");
        try {
          currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1); 
          renderGrid(); 
        } catch (err) {
          console.error("[Calendar] Erreur nav suivant:", err);
        }
      };
      console.log("[Calendar] Bouton suivant configuré");
    } else {
      console.warn("[Calendar] Bouton suivant non trouvé");
    }
  } catch (err) {
    console.error("[Calendar] Erreur wireMonthNav:", err);
  }
}

// ----- Public API -----
export function initCalendar() {
  console.log("[Calendar] ========== Initialisation module Calendar ==========");
  try {
    wireMonthNav();
    wireDayModalButtons();
    renderGrid();

    // Écoute le bus (import, édition, économie, réglages…) → rafraîchir
    on("state:daily", () => {
      console.log("[Calendar] Événement state:daily reçu, rafraîchissement");
      renderGrid();
    });
    
    on("state:changed", () => {
      console.log("[Calendar] Événement state:changed reçu, rafraîchissement");
      renderGrid();
    });
    
    on("state:settings", () => {
      console.log("[Calendar] Événement state:settings reçu, rafraîchissement");
      renderGrid();
    });

    // Quand on revient sur l'onglet
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        console.log("[Calendar] Tab redevenu visible, rafraîchissement");
        renderGrid();
      }
    });

    // Si un autre onglet change le localStorage
    window.addEventListener("storage", () => {
      console.log("[Calendar] Storage modifié, rafraîchissement");
      renderGrid();
    });

    // Fermer la modale si Échap
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        console.log("[Calendar] Touche Échap détectée");
        closeDayModal();
      }
    });

    console.log("[Calendar] ========== Initialisation terminée ==========");
  } catch (err) {
    console.error("[Calendar] ========== ERREUR INITIALISATION ==========", err);
  }
}
