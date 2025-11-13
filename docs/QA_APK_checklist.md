# ✅ Check-list QA — StopAddict (APK / WebView)

> Objectif : valider la version APK finale (et la WebView de test) sans régression, en 100% offline.

---

## 1) Démarrage & Légal
- [ ] Au premier lancement, **popup majorité/CGU** s’affiche.
- [ ] Saisie **prénom + âge** ; si < 18 ou CGU non cochées → **blocage d’accès**.
- [ ] Après validation, l’app s’ouvre et **ne redemande pas** tant que validé.
- [ ] Liens légaux **accessibles** : CGU, CGV, Mentions, Manuel, Numéros utiles.

## 2) Modules & Activation bidirectionnelle
- [ ] Dans **Réglages**, cocher/décocher un module (Clopes/Joints/Alcool) → **répercussion immédiate** dans l’Accueil.
- [ ] Dans **Accueil**, (dé)activer “aujourd’hui” un module → **répercussion dans Réglages**.
- [ ] Règle **exclusivité alcool** OK : *Alcool (global)* ↔ *Bière/Fort/Liqueur* (jamais actifs simultanément).
- [ ] Désactivation d’un module côté Réglages **désactive** aussi l’activation “aujourd’hui”.

## 3) Compteurs & Sauvegarde
- [ ] Boutons +/− fonctionnent, pas de valeurs négatives.
- [ ] **Reset** des compteurs jour OK (demande de confirmation).
- [ ] **Sauvegarde automatique** effective (fermer/réouvrir l’app → valeurs intactes).
- [ ] Changement de jour : **rollover** → l’ancien “today” passe dans **history**.

## 4) Tarifs, Coûts & Économies
- [ ] Renseigner des **prix** (Réglages) → KPI “Coût du jour” reflète la somme.
- [ ] Graphe **Coûts & Économies** :  
  - [ ] Affiche des **Coûts** si des tarifs sont saisis.  
  - [ ] Affiche des **Économies** si des **habitudes** ou une **date d’arrêt** existent.
- [ ] Échelle Y **auto** (pas de plafonnement).
- [ ] Objectifs journaliers → **lignes de seuil** visibles dans le graphe **Jour**.

## 5) Calendrier enrichi
- [ ] Mois courant chargé, navigation **mois précédent/suivant** OK.
- [ ] **Badges “Arrêt”** (stopDate) et **“Suivi depuis”** (par module) visibles.
- [ ] **Jalons** 1/7/30 jours marqués.
- [ ] Cliquer un jour ouvre la **fiche jour** (consommations, coût, économie).
- [ ] Les **conseils** réagissent aux jalons (message spécial).

## 6) Conseils dynamiques
- [ ] Panneau bas **affiche un conseil** personnalisé (prénom/langue).
- [ ] Rotation **toutes les 20 s**.
- [ ] Conditions :  
  - [ ] Jour d’arrêt → message “liberté/bravo”.  
  - [ ] Habitudes + prix → conseils “économies”.  
  - [ ] Streak jalons → message adapté.

## 7) Réglages complets (monolith)
- [ ] **Profil** (prénom, âge, langue, devise, position symbole).
- [ ] **Modules** (avec rappel règle alcool exclusif).
- [ ] **Tarifs** unitaires (virgule/point gérés).
- [ ] **Suivi depuis** (par module).
- [ ] **Habitudes/Arrêt** (objectifs et date).
- [ ] **Données** : Export/Import TOUT (.json) → **restauration fidèle**.

## 8) Import / Export (compat ascendance)
- [ ] Export .json récent → réimport **sans erreur**.
- [ ] Import d’un **ancien export** (sans identity/legal/lang/currency) → champs **complétés par défaut** (lang=fr, EUR…).
- [ ] Après import, **graphes/calendrier/conseils** reflètent l’état importé.

## 9) i18n & devises
- [ ] Changer **langue** (FR/EN) → textes UI mis à jour (après refresh).
- [ ] **Devise** et **position symbole** respectées dans KPI & fiches.

## 10) Console & Logs
- [ ] Panneau **Console** s’ouvre/ferme sans “page blanche”.
- [ ] Boutons **Clear** et **Copy** OK.
- [ ] Niveaux **INFO/WARN/DEBUG** visibles selon choix.

## 11) Offline / APK
- [ ] En **mode avion** (APK/WebView), l’app reste **fonctionnelle** :  
  - [ ] Compteurs, réglages, graphiques locaux OK.  
  - [ ] Import/Export locaux OK.  
  - [ ] Liens externes (sites d’aide) ouvrent le navigateur si réseau dispo.

## 12) Perf & Robustesse
- [ ] Navigation **fluide** entre onglets (Accueil/Stats/Calendrier/Habitudes/Réglages/Console).  
- [ ] Aucune erreur JS dans la **console navigateur**.  
- [ ] Sauvegardes **rapides** (pas de lag sur +/−).  
- [ ] Aucune **régression visuelle** vs monolith (thème sombre/bleu cohérent).

---

### Notes techniques
- Schéma d’export : `docs/export_schema.json` (version `meta.version`).  
- Compat ascendance : `compatLoad()` complète les champs manquants (lang, currency, identity, legal…).  
- Données en localStorage (`StopAddictState`) → APK/WebView : persistance interne.  

**Validation finale :** cocher 100% des items ci-dessus avant publication APK.  
