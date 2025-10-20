# 📝 MEMO PERSONNEL - StopAddict v2.4.0
## Comprendre sa propre architecture (pour soi-même!)

---

## 🎯 QU'EST-CE QUE STOPADDICT ?

**StopAddict** = Application Android pour tracker sa consommation (clopes, joints, alcool)
- Aucun compte, aucun login
- Tout est stocké **localement** sur le téléphone
- Convertie en `.apk` via Capacitor/GitHub

**Version actuelle :** 2.4.0 - Modulaire (fichiers JS séparés)  
**Alternative :** stopaddict_release_sans_patch.html (monolithe - tout en 1 fichier)

---

## 📁 STRUCTURE DES FICHIERS CLÉS

### **web/index.html** (LA page principale)
- C'est un shell HTML vide qui contient toute la structure
- Import un seul script : `<script type="module" src="./js/app.js"></script>`
- Contient les **IDs critiques** pour tout le reste :
  - `#ecran-principal` = Écran d'accueil
  - `#ecran-stats` = Statistiques
  - `#ecran-addAction` = Ajouter une action
  - `#ecran-liste` = Liste complète
  - `#ecran-params` = Paramètres
  - `#banner-*` = Bannières de données (cigs, weed, alcool, stats, etc.)
  - `#chart-*` = Canvas pour les graphiques
  - `#modal-*` = Modales (warn, page, etc.)

**⚠️ IMPORTANT:** Les IDs doivent être en **kebab-case** (avec tirets), pas camelCase !

---

### **web/js/app.js** (Le gestionnaire principal)
**Rôle :** Lance tout, synchronise les modules, gère les erreurs

**Ce qu'il fait :**
1. Import tous les modules (state, settings, counters, stats, etc.)
2. Initialise chaque module (initSettings, initCounters, etc.)
3. Écoute les événements globaux (`state:changed`, `ui:clicked`)
4. Gère les erreurs et affiche des logs

**À retenir :** C'est le "maestro d'orchestre" - si un module ne charge pas, app.js l'indique en console.

---

### **web/js/state.js** (La SOURCE DE VÉRITÉ)
**Rôle :** Contient TOUTES les données et fournit les fonctions pour les lire/modifier

**Données stockées dans localStorage :**
```javascript
{
  entries: [ /* tableau d'actions */ ],
  settings: {
    modules: { cigs: true, weed: true, alcohol: true },
    limits: { day: { cigs: 0, weed: 0, alcohol: 0 } },
    price: { /* prix */ },
    enabled: { /* compat ancienne version */ }
  }
}
```

**Fonctions clés à connaître :**
- `addEntry(type, qty)` → Ajouter une clope/joint/alcool
- `removeOneToday(type)` → Enlever 1 d'un type
- `getSettings()` → Lire les settings
- `setSetting(key, value)` → Changer un setting
- `totalsHeader(date)` → Calcul les totaux pour un jour
- `on(eventName, callback)` → Écouter un événement
- `emit(eventName, data)` → Émettre un événement

**À retenir :** Si tu veux modifier des données, tu DOIS passer par state.js. Jamais directement localStorage.

---

### **web/js/settings.js** (L'horloge et les toggles)
**Rôle :** 
- Affiche la date/heure en haut
- Gère les toggles "Je fume / Je bois / Je consomme de l'alcool"
- Setup la modale 18+

**Fonctions clés :**
- `startClock()` → Lance la mise à jour date/heure
- `applyModuleToggles()` → Montre/masque les 3 cartes d'accueil
- `setupWarnModal()` → Câble la modale d'avertissement
- `readSettings() / writeSettings()` → Lecture/écriture localStorage

**À retenir :** Les toggles changent les **settings**, qui eux-mêmes masquent/affichent les cartes.

---

### **web/js/counters.js** (Les +/- et le bandeau haut)
**Rôle :** 
- Affiche le bandeau du haut (compteurs rapides)
- Câble les boutons +/- pour ajouter/enlever

**Structure du bandeau :**
```
┌─────────────────────────────────────┐
│ 🚬 Clopes: 5  |  🌿 Joints: 0  | 🍺 Alcool: 1 │
│ +  −  sélection segment             │
└─────────────────────────────────────┘
```

**Fonctions clés :**
- `refreshHeaderCounters()` → Remet à jour le bandeau
- `wirePlusMinus()` → Câble tous les boutons +/−
- `applyModuleTogglesToHome()` → Masque/affiche les cartes

**À retenir :** Quand tu appuies sur "+", c'est counters.js qui appelle state.js → addEntry().

---

### **web/js/stats.js** (La bannière Stats)
**Rôle :** Met à jour la bannière Stats quand tu regardes Jour/Semaine/Mois/Année

**Ce qu'il affiche :**
```
Statistiques — Aujourd'hui
🚬 Clopes: 5     🌿 Joints: 0     🍺 Alcool: 1
```

**À retenir :** C'est un lecteur passif - il ne fait que rendre compte de ce que state.js retourne.

---

### **web/js/charts.js** (Graphiques Chart.js)
**Rôle :** Dessine les 3 graphiques (24h, semaine, mois)

**À retenir :** 
- Lourd (~200KB), donc chargé en "lazy" (seulement si tu vas sur Stats)
- Besoin du canvas `#chart-consommations` dans index.html
- Utilise Chart.js v3 depuis CDN

---

### **web/js/calendar.js** (Calendrier mensuel)
**Rôle :** Affiche un calendrier avec les jours cliquables pour éditer

**À retenir :**
- Aussi lazy-loading
- Génération DOM intensive

---

### **web/js/export.js** (Import/Export)
**Rôle :** Permet d'importer JSON ou exporter en CSV/JSON

**À retenir :** Peut récupérer les données via state.js.

---

## 🔄 CYCLE DE VIE COMPLET

### Quand tu appuies sur "+" (Clopes) :

1. **counters.js** détecte le clic sur `#btn-clopes-plus`
2. Appelle `addEntry('cigs', 1)` de **state.js**
3. **state.js** ajoute une entrée à `localStorage`
4. **state.js** émet l'événement `"state:changed"`
5. **counters.js** reçoit l'événement → appelle `refreshHeaderCounters()`
6. **stats.js** reçoit l'événement → met à jour la bannière Stats
7. Les **charts** recalculent (si visibles)

### En résumé :
```
🖱️ Clic → counters.js → state.js → 📤 emit() → 🔄 counters/stats/charts rafraîchissent
```

---

## 🛠️ COMMENT AJOUTER QUELQUE CHOSE

### Exemple : Ajouter un nouveau type de substance

1. **state.js** → Ajoute `heroine` aux calculs
2. **index.html** → Ajoute une bannière `#card-heroine`
3. **counters.js** → Ajoute les boutons +/−
4. **settings.js** → Ajoute un toggle "Héroine"
5. **charts.js** → Ajoute une courbe aux graphiques

**À retenir :** Toujours faire passer les données par **state.js**.

---

## ⚠️ ERREURS COMMUNES À ÉVITER

### ❌ Accéder directement à localStorage
```javascript
// ❌ MAUVAIS
const data = JSON.parse(localStorage.getItem('app_data'));

// ✅ BON
const data = getSettings();  // via state.js
```

### ❌ Oublier les IDs en kebab-case
```javascript
<!-- ❌ MAUVAIS -->
<div id="ecranPrincipal">

<!-- ✅ BON -->
<div id="ecran-principal">
```

### ❌ Modifier un input sans emit()
```javascript
// ❌ MAUVAIS - Personne ne saura que ça a changé
localStorage.setItem('limit', 10);

// ✅ BON
setSetting('limit', 10);  // Via state.js qui va emit()
```

### ❌ Initialiser avant que state.js soit prêt
```javascript
// app.js DOIT importer state.js EN PREMIER
import { getSettings } from './state.js';  // ← avant les autres
import { initCounters } from './counters.js';
```

---

## 🐛 DÉBOGUER EN PRATIQUE

### Sur navigateur (F12) :
```javascript
// Console
getSettings()  // Si state.js est importé, ça marche
getEntries()   // Voir toutes les entrées
emit('test', {foo: 'bar'})  // Tester les événements
```

### Sur le téléphone (APK) :
- Pas de F12, mais **app.js** affiche les logs sur l'écran lui-même
- Recharge l'app pour voir les logs de boot

---

## 📊 CHECKLIST DE RELEASE

Avant de compiler en APK :

- [ ] Tous les IDs d'index.html sont en **kebab-case** (avec tirets)
- [ ] app.js importe state.js EN PREMIER
- [ ] Tous les `initXxx()` sont appelés dans app.js
- [ ] localStorage ne s'appelle que depuis state.js
- [ ] Les événements `emit()` sont lancés quand les données changent
- [ ] Les logs de console aident au débogage

---

## 📅 Version et Maintien

- **Créé :** Oct 2025
- **Version :** 2.4.0
- **Dernière maj :** 20 oct 2025
- **Mainteneur :** Toi (+ Claude parfois)

---

## 🎓 RESSOURCES PERSO

- **Monolithe :** stopaddict_release_sans_patch.html (référence visuelle)
- **GitHub :** À documenter dans ARCHITECTURE.md
- **Logs :** Console (navigateur) ou écran de l'app (téléphone)

---

**💡 Astuce finale :** Quand quelque chose ne marche pas, commence par la **console**. Presque toujours, tu verras l'erreur affichée.

Bonne chance ! 🚀
