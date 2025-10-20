# 🏗️ ARCHITECTURE - StopAddict v2.4.0

## Overview

StopAddict est une application de suivi de consommation (cigarettes, cannabis, alcool) basée sur une architecture **modulaire JavaScript** avec gestion d'état centralisée.

**Stack :**
- Frontend : HTML5 + Vanilla JavaScript (modules ES6)
- Storage : localStorage
- Mobile : Capacitor (compilation Android APK)
- Graphiques : Chart.js v3
- Pas de dépendances externes majeures

**État :** Production (v2.4.0)

---

## 📂 Structure des Fichiers

```
web/
├── index.html              # Shell HTML (contient structure DOM + IDs)
└── js/
    ├── app.js              # Orchestrateur principal (imports + init)
    ├── state.js            # Gestion d'état centralisée ⭐ SOURCE DE VÉRITÉ
    ├── settings.js         # Horloge + toggles modules + modale 18+
    ├── counters.js         # Bandeau haut + boutons +/−
    ├── stats.js            # Bannière stats (jour/semaine/mois)
    ├── charts.js           # Graphiques Chart.js (lazy-loaded)
    ├── calendar.js         # Calendrier (lazy-loaded)
    └── export.js           # Import JSON / Export CSV+JSON
```

---

## 🎯 Rôle de Chaque Module

### **state.js** (Source de Vérité Unique)
**Responsabilités :**
- Gestion complète du localStorage
- Export des fonctions CRUD pour les données
- Système d'événements custom (emit/on)
- Calculs de totaux

**Exports clés :**
```javascript
// Données
getSettings()           // Lecture settings
setSetting(key, val)    // Modifier setting
getEntries()            // Toutes les entrées
addEntry(type, qty)     // Ajouter une action
removeOneToday(type)    // Enlever 1 d'un type

// Calculs
totalsHeader(date)      // Totaux pour un jour {cigs, weed, alcohol}
getTotalsWeek(date)     // Totaux semaine
getTotalsMonth(date)    // Totaux mois

// Événements
on(eventName, callback)     // S'abonner
emit(eventName, data)       // Émettre
```

**Structure localStorage :**
```json
{
  "sa:entries": [
    {"ts":"2025-10-20T14:30:00Z", "type":"cigs", "qty":1},
    {"ts":"2025-10-20T16:45:00Z", "type":"beer", "qty":1}
  ],
  "sa:settings": {
    "modules": {"cigs":true, "weed":true, "alcohol":true},
    "limits": {"day":{"cigs":20, "weed":0, "alcohol":0}},
    "price": {"cigsPerPack":20, "pricePerPack":10, "joint":5, "beer":2.5}
  }
}
```

**Événements émis :**
- `state:changed` → Après modification données
- `state:loaded` → Au chargement initial
- `settings:changed` → Après modification settings

---

### **settings.js** (Configuration + Horloge)
**Responsabilités :**
- Affichage date/heure (mis à jour chaque minute)
- Toggles "Je fume / Je bois / etc." (avec sauvegarde settings)
- Câblage modale 18+ (acceptation + localStorage)

**Exports clés :**
```javascript
initSettings()              // Lance horloge + modale 18+
startClock()                // Boucle date/heure
setupWarnModal()            // Câble modale avertissement
applyModuleToggles()        // Montre/masque cartes accueil
readSettings()              // Lecture directe localStorage
writeSettings(s)            // Écriture + emit
```

**IDs HTML dépendants :**
- `#date-actuelle` → Affichage date
- `#heure-actuelle` → Affichage heure
- `#toggle-cigs`, `#toggle-weed`, `#toggle-alcool` → Checkboxes accueil
- `#modal-warn` → Modale 18+
- `#card-cigs`, `#card-weed`, `#card-alcool` → Cartes accueil (masquage)

**À noter :** Les toggles changent les **settings**, qui eux-mêmes masquent/affichent les cartes (via `applyModuleToggles()`).

---

### **counters.js** (Interactions Utilisateur Principales)
**Responsabilités :**
- Bandeau haut avec compteurs rapides
- Câblage boutons +/− pour ajouter/retrancher
- Synchronisation avec state.js

**Structure bandeau :**
```html
┌────────────────────────────────────────┐
│ 🚬 Clopes: 5    🌿 Joints: 0    🍺 Alcool: 1 │
│ Buttons +/− + Sélection segments       │
└────────────────────────────────────────┘
```

**Exports clés :**
```javascript
initCounters()                  // Lance tout
refreshHeaderCounters()         // Remet à jour bandeau
wirePlusMinus()                 // Câble boutons
applyModuleTogglesToHome()      // Masque/affiche cartes
```

**IDs HTML dépendants :**
- `#banner-counters` → Conteneur bandeau
- `#btn-cigs-plus`, `#btn-cigs-minus` → Boutons
- `#cigs-count`, `#weed-count`, `#alcool-count` → Affichages
- `#card-cigs`, `#card-weed`, `#card-alcool` → Masquage

**Flux d'événements :**
```
Clic bouton +  →  wirePlusMinus()  →  addEntry()  →  state:changed  →  refreshHeaderCounters()
```

---

### **stats.js** (Statistiques)
**Responsabilités :**
- Mise à jour bannière Stats lors du changement d'onglet (jour/semaine/mois)
- Affichage totaux + notes descriptives
- Masquage ligne alcool si module désactivé

**Exports clés :**
```javascript
initStatsHeader()               // Lance écoute état
updateBannerFromTotals(range, totals)  // Rafraîchit bannière
refreshTodayFallback()          // Fallback si aucun événement
toggleAlcoholRow(selector)      // Masque/affiche alcool
```

**IDs HTML dépendants :**
- `#banner-stats` → Conteneur bannière
- `#hello-stats` → Titre
- `#chips-stats` → Pastilles totaux
- `#bar-clopes-periode`, `#note-clopes-periode` → Barre + note clopes
- `#bar-joints-periode`, `#note-joints-periode` → Barre + note joints
- `#bar-alcool-periode`, `#note-alcool-periode` → Barre + note alcool

**À noter :** Passif - lit uniquement les totaux de state.js.

---

### **charts.js** (Graphiques)
**Responsabilités :**
- Dessine 3 graphiques (24h / semaine / mois)
- Lazy-loaded (chargé seulement si onglet Stats ouvert)
- Utilise Chart.js v3 du CDN

**Exports clés :**
```javascript
initCharts()                    // Crée instances Chart.js
drawCharts(range, data)         // Redessine pour une période
```

**Dépendances :**
- Chart.js v3 (CDN : `https://cdn.jsdelivr.net/npm/chart.js`)
- Canvas `#chart-consommations` dans index.html

**À noter :** Lourd (~200KB), donc lazy-loaded.

---

### **calendar.js** (Calendrier Mensuel)
**Responsabilités :**
- Affichage calendrier avec jours cliquables
- Édition consommation par jour (modal jour)
- Lazy-loaded

**À noter :** Génération DOM intensive.

---

### **export.js** (Import/Export)
**Responsabilités :**
- Import données JSON (fusion non destructive)
- Export données en CSV + JSON

**À retenir :** Utilise state.js pour récupérer/modifier données.

---

### **app.js** (Orchestrateur Principal)
**Responsabilités :**
- Import ALL modules en ordre correct
- Appel init() pour chaque module
- Gestion erreurs globales
- Logs de débogage

**Ordre d'initialisation CRITIQUE :**
```javascript
// 1. state.js doit être importé EN PREMIER (fourni implicitement par imports)
import { /* state exports */ } from './state.js';

// 2. Modules qui dépendent de state.js
import { initSettings } from './settings.js';
import { initCounters } from './counters.js';
import { initStats } from './stats.js';

// 3. Lazy-loading (optionnel au boot)
// import { initCharts } from './charts.js';  // Chargé dynamiquement

// 4. Initialisation
initSettings();
initCounters();
initStats();
// Charts chargé seulement si user va sur Stats
```

**À noter :** Les modules se découvrent via événements, pas via imports directs.

---

## 🔄 Flux de Données

### Scénario : Utilisateur appuie sur "+" (Clopes)

```
┌─ counters.js : Détecte clic sur #btn-cigs-plus
│
├─> appelle state.js : addEntry('cigs', 1)
│   │
│   └─> localStorage.setItem('sa:entries', [...])
│   └─> emit('state:changed')
│
├─> Événement 'state:changed' reçu par :
│   ├─ counters.js     → refreshHeaderCounters()
│   ├─ stats.js        → updateBannerFromTotals()
│   └─ charts.js (si visible) → redraw()
│
└─> ✅ UI mise à jour
```

### Scénario : Utilisateur désactive "Joints"

```
┌─ settings.js : Détecte changement checkbox #toggle-weed
│
├─> appelle state.js : setSetting('modules.weed', false)
│   │
│   └─> localStorage.setItem('sa:settings', {...})
│   └─> emit('settings:changed')
│
├─> Événement 'settings:changed' reçu par :
│   ├─ counters.js    → applyModuleTogglesToHome() (masque carte)
│   ├─ stats.js       → toggleAlcoholRow() (si alcool)
│   └─ charts.js      → redraw()
│
└─> ✅ Cartes masquées
```

---

## 🛡️ Gestion d'Erreurs

### Pattern utilisé dans chaque module :

```javascript
export function initModule() {
  try {
    console.log("[module] Starting...");
    
    // Logique d'init
    
    console.log("[module] Ready ✓");
  } catch (e) {
    console.error("[module] Init error:", e);
    // Fallback silencieux si possible
  }
}

function riskOperation() {
  try {
    // Opération qui pourrait échouer
  } catch (e) {
    console.warn("[module] Operation failed, using fallback:", e);
    // Fallback
  }
}
```

### Logs structurés :

Format : `[module-name] Message`

Exemples :
```
[app] Starting StopAddict v2.4.0
[state] Data loaded (5 entries)
[counters.init] Header wired
[charts.init] Charts drawn for day view
[settings.clock] Clock running
[ERROR] state.js initialization failed
```

---

## 🚀 Ordre d'Initialisation (CRITIQUE)

**Respecter cet ordre pour éviter les erreurs :**

1. **state.js** ← SOURCE DE VÉRITÉ (implicite via imports)
2. **settings.js** ← Configure interface de base (horloge, modale)
3. **counters.js** ← Affiche bandeau + câble boutons
4. **stats.js** ← Prépare bannière stats
5. **export.js** ← Prépare boutons import/export
6. **Navigation** ← Configure routing écrans
7. **charts.js** (lazy) ← Seulement si user va sur Stats
8. **calendar.js** (lazy) ← Seulement si user va sur Calendrier

---

## 🎨 IDs Critiques dans index.html

**Tous en kebab-case (avec tirets), JAMAIS camelCase :**

### Écrans (visibility: hidden/visible)
- `#ecran-principal` → Accueil
- `#ecran-addAction` → Ajouter action
- `#ecran-stats` → Stats + graphiques
- `#ecran-liste` → Liste complète
- `#ecran-params` → Paramètres

### Bannières de données
- `#banner-counters` → Haut (compteurs rapides)
- `#banner-stats` → Statistiques
- `#date-actuelle` → Affichage date
- `#heure-actuelle` → Affichage heure

### Cartes accueil
- `#card-cigs` → Carte clopes
- `#card-weed` → Carte joints
- `#card-alcool` → Carte alcool

### Graphiques
- `#chart-consommations` → Canvas principal
- `#chart-cout-eco` → Canvas coût/économies (si présent)

### Modales
- `#modal-warn` → Modale 18+
- `#modal-page` → Modale pages (manuel, CGV, etc.)
- `#modal-jour` → Modale édition jour

### Buttons
- `#btn-cigs-plus`, `#btn-cigs-minus` → +/− clopes
- `#btn-weed-plus`, `#btn-weed-minus` → +/− joints
- `#btn-alcool-plus`, `#btn-alcool-minus` → +/− alcool
- `#btn-warn-accept`, `#btn-warn-quit` → Modale 18+

---

## 🧪 Tests et Débogage

### Sur navigateur (F12) :
```javascript
// Tester l'import de state
getSettings()

// Voir toutes les entrées
getEntries()

// Tester événement
emit('state:changed')

// Voir logs
console.log()  // Tous les logs [module] apparaissent ici
```

### Sur téléphone (APK) :
- Pas de F12
- **app.js** affiche les logs directement sur l'écran
- Reload l'app pour revoir les logs de boot

---

## 📋 Checklist Avant Compilation APK

- [ ] Tous les IDs en kebab-case
- [ ] app.js importe state.js EN PREMIER
- [ ] Tous les `init*()` appelés dans app.js
- [ ] localStorage n'est modifié que par state.js
- [ ] Les événements `emit()` lancés après modifications
- [ ] Console tests OK (F12)
- [ ] Logs de débogage affichent "Ready ✓" pour chaque module

---

## 🔌 Ajouter une Nouvelle Fonctionnalité

### Exemple : Ajouter nouveau type de substance (Héroïne)

**Étapes :**

1. **state.js** → Modifier structures données + exports
   ```javascript
   const DEFAULT_ENTRIES = [..., heroin: 0];
   export addEntry(type, qty) { /* support heroin */ }
   export getTotalsWeek(date) { /* include heroin */ }
   ```

2. **index.html** → Ajouter ID + éléments
   ```html
   <div id="card-heroin">...</div>
   <button id="btn-heroin-plus">+</button>
   ```

3. **counters.js** → Câbler nouveaux boutons
   ```javascript
   wirePlusMinus();  // Scanne automatiquement #btn-*-plus/minus
   ```

4. **settings.js** → Ajouter toggle
   ```html
   <input type="checkbox" id="toggle-heroin">
   ```

5. **charts.js** → Ajouter courbe graphique

**À retenir :** Toujours commencer par **state.js**.

---

## 📚 Ressources

- **Référence visuelle :** `stopaddict_release_sans_patch.html` (version monolithe)
- **Logs :** Console navigateur (F12) ou écran app
- **Chart.js docs :** https://www.chartjs.org/docs/latest/
- **Capacitor docs :** https://capacitorjs.com/docs

---

## 👥 Contribution

Pour contribuer :

1. Lire ce fichier en entier
2. Respecter l'ordre d'initialisation
3. Tous les IDs en kebab-case
4. Passer les données via state.js
5. Ajouter logs `[module-name]` partout
6. Tester en console (F12) avant APK

---

**Version :** 2.4.0  
**Dernière mise à jour :** 20 octobre 2025  
**Mainteneur :** Équipe Dev + Claude  
**Licence :** À définir

