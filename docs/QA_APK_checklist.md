# StopAddict – Checklist QA (Web → APK)

> Objectif : valider une version **en une seule passe** avant génération de l’APK.  
> Contexte : Firefox desktop (sans extensions), WebView Android (APK), pas d’install CLI.

---

## 1) Chargement & UI de base
- [ ] Page `index.html` s’ouvre sans erreur (F12 Console vide d’erreurs bloquantes).
- [ ] Section **Accueil** visible, compteurs (+/−) fonctionnels pour : cigs / weed / alcohol / beer / hard / liqueur.
- [ ] **Aucun Service Worker** enregistré (onglet Application → Service Workers vide).

## 2) Réglages complets
- [ ] Profil : prénom saisi → affiché dans l’entête (“Salut {prenom} !”).
- [ ] Langue FR/EN : bascule manuelle, textes de navigation et labels mis à jour.
- [ ] Devise (EUR/USD/GBP) & position du symbole (avant/après) reflétées sur les coûts.
- [ ] Tarifs : cigs, weed, beer, hard, liqueur, alcohol (global).
- [ ] Modules disponibles (cigs/weed/alcohol) : décocher un module le masque côté “Activation aujourd’hui”.
- [ ] Dates **enabled_since** (cigs/weed/alcohol) enregistrées et visibles dans le **Calendrier**.
- [ ] Import/Export :  
  - [ ] **Export TOUT (.json)** génère un fichier cohérent (valide via `export_schema.json`).  
  - [ ] **Import (.json)** restaure l’état (profil, réglages, historique…).  
  - [ ] **Export CSV** crée `stopaddict_history.csv` avec coûts/jour.

## 3) Règle d’exclusivité Alcool
- [ ] Activer **Alcool (global)** désactive visuellement **Bière/Fort/Liqueur** (grisés) et empêche leur saisie.
- [ ] Activer un sous-alcool (Bière, Fort, Liqueur) **désactive** “Alcool (global)”.
- [ ] Le coût du jour **ne double pas** (soit global, soit sous-types).

## 4) Stats (LOCAL TIME)
- [ ] **Jour** : 4 tranches fixes (0–6, 6–12, 12–18, 18–24).  
  - [ ] Ajouts tardifs “sans heure” répartis **uniformément** (24h → 4 buckets égales).  
- [ ] **Semaine** : 7 jours J-6 → J, agrégés.  
- [ ] **Mois** : cumuls par semaines (S1..S6) du mois courant.  
- [ ] **Année** : cumuls mensuels (Jan..Déc).  
- [ ] **Coûts** visibles uniquement si prix renseignés.  
- [ ] **Économies (estim.)** affichées si objectifs ou date d’arrêt définis.

## 5) Calendrier
- [ ] Mois courant, L→D, locale FR.  
- [ ] **StopDate** marquée (badge “Arrêt”).  
- [ ] **enabled_since** marqués (Déb. clopes / joints / alcool).  
- [ ] Clic jour → fiche synthèse (totaux jour + sous-alcools).

## 6) Conseils (personnalisation)
- [ ] Bandeau bas de page, rotation toutes les ~20s.  
- [ ] Prend la **langue** et le **prénom** si fournis.  
- [ ] État : `réduction` / `maintien` / `arrêt` cohérent avec la journée.

## 7) Données & persistance
- [ ] Données conservées sur refresh/tab fermé (localStorage).  
- [ ] Changement de jour → pas d’archivage auto non souhaité.  
- [ ] **Export** avant/after import : identique (diff minime autorisée: timestamps, ordre des clés).

## 8) Accessibilité / UX
- [ ] Focus visible sur boutons nav et actions.  
- [ ] Dialog (modale) : **scroll interne**, backdrop sombre, au-dessus du contenu (**z-index** OK).  
- [ ] Contrastes lisibles (header sombre / texte clair).

## 9) Performance
- [ ] Pas de freeze au clic rapide sur +/−.  
- [ ] Graphiques se rafraîchissent en < 200ms sur Android milieu de gamme.  
- [ ] Aucune boucle console verbeuse en production (logs contrôlés par “Console”).

## 10) APK (WebView)
- [ ] Affichage identique à Firefox (taille police, alignements principaux, canvases).  
- [ ] Import/Export JSON/CSV autorisé (permissions stockage si nécessaires via WebView).  
- [ ] Lang FR/EN commutable dans l’APK.  
- [ ] Aucune référence à SW, Node, ou API non dispo en WebView.

---

## Procédure de validation “one-shot”
1. **Réinitialiser** : Réglages → “Tout supprimer (réinitialiser)”.  
2. **Renseigner** profil, langue, devise, tarifs.  
3. **Activer** modules & today.active (tester les 2 modes alcool).  
4. **Saisir** quelques compteurs, vérifier **coût** et **stats Jour** (dispatch 24h).  
5. **Définir** stopDate + goals → vérifier **économies**.  
6. **Exporter TOUT**, **recharger la page**, **importer** → vérifier restauration 100%.  
7. **APK** : répéter les points 2→6 sur Android (WebView).

---

### Fichiers de référence
- `docs/export_schema.json` (validation de l’export)  
- `web/i18n/{fr,en}.json` (libellés)  
- `web/js/state.js` (structure, coûts, compat)  
- `web/js/charts.js` (vues & dispatch)  
- `web/js/settings.js` (import/export & exclusivité alcool)
