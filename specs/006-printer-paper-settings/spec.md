# Feature Specification: Paramétrage imprimante et taille de papier

**Feature Branch**: `006-printer-paper-settings`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "on vas ajouter le paramettrage de l'imprimante et de la taille des papier, dans le footer de la side bare on vas mettre une section paramettre dans le quel il y à deux Select de shadcn : Papier et Imprimante, qui permet de selectionner le taille de papier et l'ip de l'imprimante sur le reseau"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Réglage de la taille de papier (Priority: P1)

L'utilisateur ouvre la section **Paramètres** située en bas de la barre
latérale. Il y voit une liste déroulante **Papier** contenant plusieurs
formats (ex. les tailles d'étiquettes supportées). Il choisit le format qui
correspond à ses étiquettes : ce choix devient le format utilisé pour toutes
les impressions suivantes et reste mémorisé au rechargement de l'application.

**Why this priority**: La taille de papier détermine directement le rendu des
étiquettes imprimées ; sans ce réglage, l'utilisateur ne peut adapter
l'application qu'à un seul format fixe.

**Independent Test**: Ouvrir la section Paramètres, choisir un autre format
puis imprimer (module EAN-13) : l'étiquette émise correspond au format choisi.
Recharger la page : le format choisi est toujours celui sélectionné.

**Acceptance Scenarios**:

1. **Given** l'application affiche la barre latérale, **When** l'utilisateur
   regarde son pied de page, **Then** il y trouve une section Paramètres avec
   une liste déroulante « Papier »
2. **Given** la liste déroulante « Papier », **When** l'utilisateur sélectionne
   un format, **Then** ce format est appliqué aux impressions suivantes
3. **Given** un format sélectionné, **When** l'utilisateur recharge
   l'application, **Then** ce format est conservé (aucun re-réglage nécessaire)
4. **Given** aucun paramétrage effectué, **When** l'utilisateur ouvre la
   section Paramètres, **Then** la valeur affichée est la valeur par défaut
   (taille courante de l'application)

---

### User Story 2 - Réglage de l'imprimante (Priority: P1)

Dans la même section **Paramètres**, l'utilisateur voit une liste déroulante
**Imprimante** proposant les imprimantes du réseau (identifiées par leur
adresse). Il sélectionne l'imprimante sur laquelle il imprime : toutes les
impressions suivantes sont envoyées vers cette imprimante, et le choix est
mémorisé.

**Why this priority**: Le choix de l'imprimante (adresse réseau) est nécessaire
pour envoyer les étiquettes au bon appareil ; il complète le paramétrage
d'impression demandé.

**Independent Test**: Ouvrir la section Paramètres, sélectionner une
imprimante puis imprimer (module EAN-13) : l'impression est envoyée vers
l'adresse choisie. Recharger la page : l'imprimante choisie reste sélectionnée.

**Acceptance Scenarios**:

1. **Given** la section Paramètres, **When** l'utilisateur regarde le pied de la
   barre latérale, **Then** une liste déroulante « Imprimante » liste les
   imprimantes du réseau
2. **Given** une imprimante sélectionnée, **When** l'utilisateur lance une
   impression, **Then** cette impression est transmise à l'imprimante choisie
3. **Given** une imprimante sélectionnée, **When** l'utilisateur recharge
   l'application, **Then** l'imprimante choisie reste sélectionnée
4. **Given** aucun choix effectué, **When** la section Paramètres est ouverte,
   **Then** l'imprimante affichée est l'imprimante par défaut (actuellement
   configurée)

---

### Edge Cases

- **Première ouverture sans réglage** : aucune valeur choisie ; les valeurs
  proposées par défaut sont affichées et utilisées (la taille de papier et
  l'imprimante actuellement configurées).
- **Imprimante sélectionnée injoignable** : l'impression est lancée comme
  avant ; l'échec éventuel de connexion est signalé par le comportement
  existant du module d'impression, sans changement de l'interface Paramètres.
- **Changement de réglage avant impression** : le dernier choix effectué est
  celui appliqué à l'impression suivante.
- **Rechargement de l'application** : les deux réglages (papier et imprimante)
  sont conservés ensemble.
- **Imprimante non définie (donnée mémorisée)**: le sélecteur est affiché non
  sélectionné avec un avertissement ; l'ouverture déclenche la recherche réseau
  qui alimente la liste ; seul un choix explicite est mémorisé.
- **Imprimante définie (donnée mémorisée)**: le sélecteur affiche directement
  cette imprimante sans recherche réseau.
- **Imprimante sélectionnée injoignable** : l'impression est lancée comme
  avant ; l'échec éventuel de connexion est signalé par le comportement
  existant du module d'impression, sans changement de l'interface Paramètres.
- **Changement de réglage avant impression** : le dernier choix effectué est
  celui appliqué à l'impression suivante.
- **Rechargement de l'application** : les deux réglages (papier et imprimante)
  sont conservés ensemble.
- **Liste vide ou réduite d'imprimantes** : la liste déroulante reste
  fonctionnelle ; si elle ne contient qu'une entrée, celle-ci est la seule
  option proposée.
- **Aucune imprimante détectée** : le sélecteur indique qu'aucun appareil n'a
  été trouvé sur le réseau ; l'application reste utilisable et la configuration
  d'impression existante n'est pas perdue.
- **Réseau temporairement indisponible** : la recherche se termine sans
  résultat ; le sélecteur affiche l'état « aucune imprimante détectée » sans
  erreur bloquante.
- **Format de papier invalide dans la configuration** (désignation illisible,
  dimensions non numériques) : le format fautif n'est pas proposé dans la liste,
  sans empêcher l'application de fonctionner.
- **Réglages appliqués à tous les modules imprimables** : le même couple
  (papier, imprimante) s'applique à toute impression quel que soit le module
  (aujourd'hui : EAN-13).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La barre latérale doit comporter, dans son pied de page, une
  section « Paramètres » regroupant les réglages d'impression.
- **FR-002**: La section Paramètres doit présenter une liste déroulante
  « Papier » avec les formats proposés.
- **FR-003**: Sélectionner un format de papier doit le définir comme format
  utilisé par les impressions suivantes.
- **FR-004**: Le format de papier sélectionné doit être conservé après un
  rechargement de l'application.
- **FR-005**: La section Paramètres doit présenter une liste déroulante
  « Imprimante » listant les imprimantes du réseau identifiées par leur
  adresse.
- **FR-006**: Sélectionner une imprimante doit définir l'adresse de
  destination des impressions suivantes.
- **FR-007**: L'imprimante sélectionnée doit être conservée après un
  rechargement de l'application.
- **FR-008**: En l'absence de tout réglage, les valeurs par défaut affichées et
  utilisées doivent être la taille de papier et l'imprimante actuellement
  configurées (aucune impression bloquée).
- **FR-009**: Les réglages choisis (papier + imprimante) doivent être appliqués
  à toutes les impressions, quel que soit le module.
- **FR-010**: La liste des formats de papier proposés doit être reconfigurable
  via la configuration de l'application (variables d'environnement, fichier
  `.env`), au format humain « largeurxlongueur » (millimètres), sans
  modification du code ; le format actuellement utilisé doit rester la valeur
  par défaut.
- **FR-011**: La liste déroulante « Papier » doit présenter les formats triés
  par surface croissante (surface d'un format = largeur × longueur, calculée à
  partir de sa désignation).
- **FR-012**: L'imprimante d'impression doit être mémorisée dans un cookie du
  navigateur ; seul un choix explicite de l'utilisateur est enregistré.
- **FR-013**: Si une imprimante est déjà mémorisée, le sélecteur affiche
  directement cette imprimante, **sans** déclencher de recherche réseau.
- **FR-014**: Si aucune imprimante n'est encore mémorisée, le sélecteur
  affiche un état « non sélectionné » avec un avertissement ; à l'ouverture du
  sélecteur, l'application recherche les imprimantes présentes sur le réseau
  local et les propose dans la liste.
- **FR-015**: Quand aucune imprimante n'est détectée sur le réseau, le sélecteur
  doit l'indiquer clairement à l'utilisateur, sans bloquer l'application et
  sans perdre la configuration d'impression existante.

### Key Entities

- **Taille de papier**: le format d'étiquette courant (largeur × hauteur)
  utilisé pour générer et imprimer les étiquettes ; la liste des formats
  proposés est définie par la configuration ; son choix est mémorisé.
- **Imprimante**: un appareil d'impression présent sur le réseau local, repéré
  par son adresse, découvert automatiquement lors de l'ouverture des
  paramètres ; son choix est mémorisé et détermine où sont envoyées les
  impressions.
- **Configuration d'impression**: le couple (taille de papier, imprimante)
  résultant des réglages, appliqué à toute impression.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des impressions émises après sélection d'un format utilisent
  ce format (aucun écart entre le réglage affiché et l'impression produite).
- **SC-002**: 100 % des impressions émises après sélection d'une imprimante sont
  transmises à l'adresse choisie.
- **SC-003**: Sur 100 % des rechargements de l'application, les réglages de
  papier et d'imprimante affichés sont exactement ceux choisis avant le
  rechargement.
- **SC-004**: À tout moment, les deux réglages sont accessibles en une seule
  action depuis n'importe quelle vue de l'application (présence permanente de la
  section Paramètres).
- **SC-005**: Au premier lancement, aucune impression n'est bloquée : les
  réglages par défaut (taille et imprimante actuelles) s'appliquent sans action.
- **SC-006**: Chaque imprimante ZPL réellement présente et joignable sur le
  réseau local est proposée dans le sélecteur lors de l'ouverture de la section
  Paramètres.
- **SC-007**: Dès que la configuration des formats est modifiée, la liste
  déroulante « Papier » reflète cette configuration au prochain chargement de
  l'application.

## Assumptions

- **Réglages globaux** : la taille de papier et l'imprimante s'appliquent à
  toute l'application, pas par module.
- **Persistance locale** : les réglages sont mémorisés sur l'appareil entre les
  lancements (même mécanisme que la mémorisation existante des préférences
  locales) ; pas de compte ni de synchronisation.
- **Liste des formats via la configuration** : les formats de papier proposés
  sont définis dans la configuration de l'application (variables
  d'environnement, `.env`), au format humain « largeurxlongueur » (mm) ; la
  liste des formats est triée par surface croissante (calculée) ; le format
  actuellement utilisé (40 × 25 mm) en est la valeur par défaut et reste
  proposé.
- **Mémorisation par cookie** : l'imprimante sélectionnée est enregistrée dans
  un cookie du navigateur ; tant qu'aucune n'est définie, aucun choix
  automatique n'est appliqué (« premier de la liste » exclu).
- **Découverte des imprimantes** : une recherche réseau est déclenchée à
  l'ouverture du sélecteur uniquement si aucune imprimante n'est déjà
  mémorisée ; les appareils ZPL trouvés alimentent la liste des options.
- **Hors périmètre** : ajout, édition ou suppression manuelle d'imprimantes
  dans l'interface ; purge/rafraîchissement manuel de la découverte ;
  test de connectivité dédié ; réglages par impression unitaire.
- **Dépendance** : le pipeline d'impression existant (module EAN-13) est
  réutilisé tel quel et doit consommer les réglages choisis.

## Clarifications

### Session 2026-09-22

- Q: Formats de papier à proposer dans le sélecteur ? → A: Liste configurable
  via le `.env` (variables d'environnement), le format courant restant la valeur
  par défaut (FR-010).
- Q: Provenance des adresses d'imprimantes proposées ? → A: Découverte
  automatique des imprimantes sur le réseau (FR-014).
- Q: Détail des formats papier ? → A: formats au format humain
  « largeurxlongueur » en millimètres dans le `.env` ; la liste du sélecteur est
  triée par surface croissante (largeur × longueur calculée) (FR-011).
- Q: Mémorisation de l'imprimante ? → A: dans un cookie ; imprimante définie →
  sélection directe sans recherche ; imprimante non définie → sélecteur non
  sélectionné avec avertissement, recherche réseau à l'ouverture, choix
  explicite seul mémorisé (FR-012, FR-013, FR-014).
- Q: Imprimante par défaut quand aucune n'est définie ? → A: aucune sélection
  automatique (« premier de la liste » écarté) : état non sélectionné +
  avertissement jusqu'à un choix explicite de l'utilisateur (FR-014).