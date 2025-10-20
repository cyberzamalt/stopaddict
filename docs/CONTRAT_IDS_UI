
# StopAddict — Contrat d’IDs UI (HTML)
> Document de référence pour garder **index.html** compatible avec les modules JS.
> À mettre dans le repo GitHub pour éviter les régressions.

## 🧭 Principe
Chaque module JS sélectionne des éléments via `document.querySelector('#ID')`.  
Si un ID ne correspond pas **exactement**, les écouteurs ne s’attachent pas et l’UI ne réagit pas.
Ce document liste les **IDs requis** (obligatoires) et **optionnels** (recommandés) par zone.

---

## 1) Navigation (barre du bas) — **obligatoire**
Boutons (5) :
- `#nav-principal`
- `#nav-stats`
- `#nav-calendrier`
- `#nav-habitudes`
- `#nav-params`

Écrans (conteneurs plein format) :
- `#ecran-principal`
- `#ecran-stats`
- `#ecran-calendrier`
- `#ecran-habitudes`
- `#ecran-params`

**Utilisé par :** `app.js` (routing, `showScreen()`), événements `sa:screen:changed`.

---

## 2) Accueil — Bandeau “chiffres du jour” — **obligatoire**
- `#bar-clopes`
- `#bar-joints`
- `#bar-alcool`

**Affichage :** chiffres bruts uniquement (ex. `5`, `2`, `1`)  
**Utilisé par :** `counters.js` (rafraîchi au boot + `state:changed`).

> **À ne pas utiliser** : `#val-clopes`, `#val-joints`, `#val-alcool` (héritage non supporté).

---

## 3) Stats — Bannière & Graphiques — **obligatoire**
Bannière (totaux selon période) :
- `#stats-titre`
- `#stats-clopes`
- `#stats-joints`
- `#stats-alcool`
- `#stats-alcool-line` *(optionnel : permet de masquer/afficher la ligne alcool selon réglages)*

Canvases (graphiques) :
- `#chart-consommations` *(obligatoire)*
- `#chart-cout-eco` *(optionnel : 2ᵉ graphe coûts/économies)*

**Utilisé par :**
- `stats.js` (mise à jour de la bannière + écoute `charts:totals`)
- `charts.js` (dessin des courbes sur les canvases)

> **À proscrire :** `#chartCanvas` (mauvais ID).

---

## 4) Calendrier — **obligatoire**
- `#cal-titre` *(titre mois/année)*
- `#cal-grid` *(grille des jours)*

*(Selon ta version, des IDs de navigation comme `#cal-prev` / `#cal-next` peuvent aussi être présents.)*

**Utilisé par :** `calendar.js` (rendu de la vue).

---

## 5) Modale majorité 18+ — **obligatoire**
Conteneur :
- `#modal-warn`

Éléments internes :
- `#chk-warn-18`
- `#chk-warn-hide`
- `#btn-warn-accept`
- `#btn-warn-cancel`
- `#btn-warn-quit`
- `#open-ressources-from-warn` *(optionnel)*

**Utilisé par :**  
- `app.js` → `checkAndShowWarnIfNeeded()` (affiche la modale si non acceptée)  
- `settings.js` → `setupWarnModal()` (câble checkbox/boutons)

**LocalStorage :** clé `app_warn_v23` (persistence de l’acceptation).

---

## 6) En-tête — Horloge — **obligatoire**
- `#date-actuelle`
- `#heure-actuelle`

**Utilisé par :** `settings.js` (mise à jour 1/s).

---

## 7) Accueil — Toggles modules — **optionnel mais recommandé**
- `#toggle-cigs`
- `#toggle-weed`
- `#toggle-alcool`

Cartes associées (pour afficher/masquer visuellement) — une des deux stratégies :
- **Stratégie A (recommandée) :** `#card-cigs`, `#card-weed`, `#card-alcool`
- **Stratégie B :** les 3 premières `.card` dans `#ecran-principal` (ordre clopes → weed → alcool)

**Utilisé par :** `settings.js` (application de visibilité selon préférences).

---

## 8) Carte “Conseil du jour” — **optionnel (phase 2)**
- `#conseil-card`
- `#conseil-texte`

**Utilisé par :** futur module “advice” (écoute `state:changed`, limites/objectifs/économie → message dynamique).

---

## 9) Éléments d’export/import (si présents) — **optionnel**
- `#btn-export-json`
- `#btn-export-csv`
- `#btn-export-view`
- `#btn-import`

**Utilisé par :** `export.js` (si activé).

---

## 10) Événements & clés (référence rapide)
- Événements dispatchés/écoutés :
  - `state:changed` — émis après action +/−, import, etc. (rafraîchit Accueil/Stats)
  - `charts:totals` — émis par `charts.js` avec `{range, totals}` (rafraîchit bannière Stats)
  - `sa:screen:changed` — émis à chaque navigation (`app.js`)
  - `sa:settings:changed` — émis après modif de réglages (visibilité modules, etc.)
- LocalStorage :
  - `app_warn_v23` — persistance de l’acceptation majorité (modale 18+)

---

## ✅ Check minimal après intégration (sans console)
1) Ouverture app → modale 18+ visible si jamais validée.  
2) Accueil → +/− met à jour immédiatement `#bar-clopes/#bar-joints/#bar-alcool`.  
3) Stats → bannière chiffres OK + graphe sur `#chart-consommations`.  
4) Calendrier → `#cal-grid` visible avec le mois courant.  
5) Réglages → écran plein `#ecran-params` (pas de petite modale).

---

## ❌ IDs à éviter (hérités / sources d’incompatibilité)
- `#bandeau-resume`
- `#chartCanvas`
- `#val-clopes`, `#val-joints`, `#val-alcool`
- `#modal-page` (si menu réglages en modale — ici on a un écran plein `#ecran-params`)

---

### Notes
- `app.js` doit être chargé via :  
  ```html
  <script type="module" src="./js/app.js"></script>
  ```
- Les modules optionnels (`economy.js`, `export.js`, `limits.js`, `i18n.js`) ne doivent être importés que s’ils existent réellement dans `web/js/`.
