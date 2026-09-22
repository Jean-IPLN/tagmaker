# Feature Specification: Navigation modules via sidebar

**Feature Branch**: `002-module-sidebar`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "On va changer la manière d'afficher les modules : on va intégrer la sidebar de shadcn ; c'est dans cette sidebar que les modules sont listés, par défaut on affiche un SkeletonForm quand aucun module n'est encore affiché."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choix d'un module depuis la sidebar (Priority: P1)

L'utilisateur ouvre l'application. Au lieu d'une grille de cartes à l'accueil,
il voit une barre latérale listant tous les modules d'étiquettes disponibles.
Il clique sur l'entrée « EAN-13 » : le formulaire EAN-13 s'affiche dans la
zone de contenu principale, à droite de la sidebar.

**Why this priority**: C'est le cœur de la demande — remplacer la galerie par
une navigation par sidebar pour accéder aux modules.

**Independent Test**: Exécuter l'app, ouvrir la racine, cliquer sur le module
EAN-13 dans la sidebar, vérifier que le formulaire EAN-13 s'affiche dans la
zone principale (et non la grille de cartes).

**Acceptance Scenarios**:

1. **Given** l'application ouverte à la racine, **When** l'utilisateur clique sur
   l'entrée « EAN-13 » de la sidebar, **Then** le formulaire EAN-13 s'affiche
   dans la zone de contenu principale.
2. **Given** un formulaire de module affiché, **When** l'utilisateur revient à la
   vue racine, **Then** la vue racine affiche l'état par défaut (voir US2).
3. **Given** la sidebar affichée, **When** un module est ajouté au registre des
   modules, **Then** il apparaît aussi dans la sidebar.

---

### User Story 2 - État par défaut : SkeletonForm (Priority: P2)

Lorsque l'utilisateur ouvre l'application sans qu'aucun module ne soit encore
affiché (vue racine), la zone de contenu principale n'est pas vide : elle
affiche un SkeletonForm, un gabarit de formulaire en attente (placeholders
squelettiques), signalant qu'un module viendra s'y afficher au choix.

**Why this priority**: Il garantit qu'aucune zone vide n'apparaît à l'ouverture ;
la stratégie de création de module (P1) reste prioritaire.

**Independent Test**: Ouvrir l'application à la racine sans avoir sélectionné
de module ; vérifier que la zone principale affiche un gabarit de formulaire
squelettique (et non une page vierge).

**Acceptance Scenarios**:

1. **Given** l'application ouverte à la racine, **When** aucun module n'est
   sélectionné, **Then** la zone principale affiche un SkeletonForm (gabarit de
   formulaire en attente).
2. **Given** un module sélectionné, **When** l'utilisateur revient à la vue
   racine, **Then** le SkeletonForm réapparaît.

---

### User Story 3 - Navigation persistante et module actif (Priority: P3)

La sidebar reste visible sur toutes les vues de l'application (racine et
formulaires de modules). L'entrée correspondant au module affiché est mise en
évidence pour que l'utilisateur sache toujours où il se trouve.

**Why this priority**: Confort de navigation et repérage ; il s'appuie sur la
mise en place des US 1 et 2.

**Independent Test**: Naviguer entre la racine et plusieurs modules ; vérifier
que la sidebar reste visible à chaque étape et que l'entrée active est
distincte visuellement.

**Acceptance Scenarios**:

1. **Given** un formulaire de module affiché, **When** l'utilisateur regarde la
   sidebar, **Then** l'entrée de ce module est mise en évidence.
2. **Given** la navigation en cours, **When** l'utilisateur passe d'une vue à
   l'autre, **Then** la sidebar reste visible et fonctionnelle.

---

### Edge Cases

- Aucun module enregistré dans le registre : la sidebar affiche une liste vide ;
  la zone principale reste en état SkeletonForm (aucune erreur).
- Lien d'un module invalide (URL inconnue) : la page correspondante retourne
  l'erreur « introuvable » standard, la sidebar reste visible.
- Beaucoup de modules : la liste de la sidebar reste navigable (défilement
  interne si nécessaire).
- Écran étroit (mobile) : la sidebar se replie sans bloquer l'accès aux modules.
- Re-clic sur le module déjà actif : aucun changement d'affichage, pas d'erreur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'application MUST afficher une barre latérale (sidebar) de
  navigation regroupant tous les modules d'étiquettes enregistrés.
- **FR-002**: Chaque module MUST être listé dans la sidebar avec son nom et sa
  description.
- **FR-003**: La sélection d'un module dans la sidebar MUST afficher le
  formulaire de ce module dans la zone de contenu principale.
- **FR-004**: Quand aucun module n'est affiché (vue racine), la zone de contenu
  principale MUST afficher un SkeletonForm, gabarit de formulaire en attente
  (aucune zone vide).
- **FR-005**: La sidebar MUST être visible sur la vue racine et sur toutes les
  vues de module (navigation persistante).
- **FR-006**: L'entrée de la sidebar correspondant au module affiché MUST être
  mise en évidence visuellement.
- **FR-007**: La sidebar MUST rester accessible sur les écrans étroits
  (repliable sans perdre l'accès aux modules).
- **FR-008**: La liste des modules affichée dans la sidebar MUST rester
  cohérente avec la galerie actuelle (même source d'inscription).

### Key Entities *(include if feature involves data)*

- **Module d'étiquette** : responsable d'une famille d'étiquettes ; possède un
  identifiant, un nom, une description et une cible d'affichage.
- **Sélection courante** : module actuellement affiché dans la zone principale ;
  absente à la vue racine.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur accède au formulaire d'un module en au plus 1 clic
  depuis l'ouverture de l'application.
- **SC-002**: À l'ouverture sans sélection, la zone principale affiche un
  SkeletonForm dans 100 % des cas (aucune zone vide).
- **SC-003**: La sidebar est visible sur 100 % des vues de l'application.
- **SC-004**: Le module actif est identifiable visuellement dans la sidebar à
  tout moment.
- **SC-005**: Les accès directs hérités aux modules (ex. `/ean13`) continuent
  d'afficher leur formulaire avec la sidebar.

## Assumptions

- Chaque module conserve sa page dédiée ; la sidebar est le shell de navigation
  commun intégré à l'application.
- Le SkeletonForm est un placeholder visuel par défaut (gabarit squelettique),
  pas un état de chargement réseau.
- La liste affichée dans la sidebar provient du même registre que la galerie
  existante (aucune nouvelle source de données).
- La base visuelle retenue est la sidebar du preset shadcn sélectionné (choix
  utilisateur explicite) ; son comportement repliable sur écran étroit est
  conservé.
- La galerie de cartes actuelle est retirée de la racine ; son composant peut
  être supprimé une fois la sidebar en place.
- Les tests unitaires et la couverture > 80 % restent applicables (constitution
  du projet).