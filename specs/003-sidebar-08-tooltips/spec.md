# Feature Specification: Sidebar-08 et descriptions au survol

**Feature Branch**: `003-sidebar-08-tooltips`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "finalement on ne va pas utiliser la sidebar-04 mais la sidebar-08 de shadcn, aussi dans la liste des modules ne met pas la description des modules mais uniquement les titres, la description sera dans un tooltip right de shadcn"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Liste de modules épurée dans un encadré latéral (Priority: P1)

L'utilisateur ouvre l'application et voit la barre latérale de navigation, désormais présentée dans une variante « encastrée » : un panneau délimité qui se détache de la zone de contenu. Chaque module y apparaît **uniquement par son titre** ; aucune description n'est affichée dans la liste, ce qui rend la liste compacte et lisible d'un coup d'œil.

**Why this priority**: C'est le changement visuel central demandé : la liste ne doit montrer que les titres. Sans cette épuration, le résultat attendu n'est pas livré.

**Independent Test**: Rendu de la barre latérale seul : pour chaque module enregistré, le titre est visible et le texte de description est absent du document.

**Acceptance Scenarios**:

1. **Given** la barre latérale affiche la liste des modules, **When** l'utilisateur la consulte, **Then** chaque module est visible par son titre seulement, sans description en dessous
2. **Given** un module enregistré avec son titre et sa description, **When** la liste est rendue, **Then** le titre est affiché et la description n'apparaît nulle part dans la liste
3. **Given** la présentation encastrée, **When** la page est ouverte, **Then** le panneau latéral est visuellement séparé de la zone de contenu (style encastré, sans bordure flottante)

---

### User Story 2 - Description disponible au survol à droite de l'entrée (Priority: P1)

L'utilisateur passe le pointeur sur le titre d'un module. Une infobulle apparaît **à droite de l'entrée** et affiche la description du module. Lorsque le pointeur quitte l'entrée, l'infobulle disparaît. La description reste donc accessible sans désordre visuel permanent.

**Why this priority**: Le report de la description dans une infobulle est le deuxième changement explicite ; il préserve l'information utile du module tout en épurant la liste.

**Independent Test**: Rendu de la barre latérale seule, interactions simulées : initialement aucune infobulle présente ; après survol d'un module, son infobulle apparaît contenant la description ; après sortie du survol, l'infobulle disparaît.

**Acceptance Scenarios**:

1. **Given** la liste des modules en titres uniquement, **When** le pointeur survole le titre d'un module, **Then** une infobulle apparaît à droite de l'entrée affichant la description de ce module
2. **Given** une infobulle ouverte sur un module, **When** le pointeur quitte l'entrée, **Then** l'infobulle se ferme sans action supplémentaire
3. **Given** la description d'un module, **When** aucune entrée n'est survolée, **Then** aucune description n'est visible à l'écran

---

### User Story 3 - Navigation conservée (Priority: P2)

L'utilisateur continue de naviguer comme avant : le module affiché reste mis en évidence dans la liste, la barre latérale et l'en-tête (fil d'Ariane) restent présents sur toutes les vues, et la liste reste utilisable sur écran étroit. Le changement de présentation ne casse aucun parcours existant.

**Why this priority**: Ces comportements sont hérités de la navigation existante (002). Ils garantissent qu'aucune régression ne contredit l'épuration demandée.

**Independent Test**: Parcours complet existant (« Accueil → squelette », « navigation vers EAN-13 », « accès direct », « URL inconnue avec barre persistante », « repli mobile ») exécuté après la refonte : tous restent valides.

**Acceptance Scenarios**:

1. **Given** l'utilisateur navigue sur une vue module, **When** la liste est affichée, **Then** l'entrée du module courant reste mise en évidence
2. **Given** une URL inconnue, **When** la page s'affiche, **Then** la barre latérale et l'en-tête restent visibles
3. **Given** un écran étroit, **When** l'utilisateur réduit l'espace, **Then** la barre latérale se replie ou se masque sans perdre l'accès aux modules

---

### Edge Cases

- Le pointeur reste sur l'entrée : l'infobulle reste ouverte le temps du survol sans clignotement.
- Le déplacement du pointeur entre deux entrées voisines : seule la description du module survolé est visible à tout instant.
- Une description très longue : l'infobulle reste lisible (pas de coupure illisible), sans déborder du cadre d'application.
- Liste repliée en icônes (espace réduit) : le survol reste disponible et affiche la description à droite.
- Accès clavier : le module reste accessible et identifié (le titre demeure un libellé de lien), l'infobulle ne bloquant pas l'activation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La barre latérale doit adopter la présentation encastrée (« inset ») du jeu d'interfaces (variante désignée « sidebar-08 »), en lieu et place de la présentation flottante (« sidebar-04 ») actuelle.
- **FR-002**: La liste des modules doit afficher le titre de chaque module sans sa description.
- **FR-003**: Le survol d'une entrée de module doit afficher sa description dans une infobulle positionnée à droite de l'entrée.
- **FR-004**: L'infobulle doit se fermer lorsque le pointeur quitte l'entrée.
- **FR-005**: Une seule description doit être visible à la fois (jamais deux infobulles simultanées).
- **FR-006**: La description doit rester accessible au survol même lorsque la liste est repliée en icônes.
- **FR-007**: L'entrée du module courant doit rester mise en évidence dans la liste.
- **FR-008**: La barre latérale et l'en-tête doivent rester visibles sur toutes les vues, y compris une URL inconnue.

### Key Entities *(include if feature involves data)*

- **LabelModule**: Entité de référence d'un module (titre, description, destination). La description continue d'exister dans les données mais n'est plus rendue dans la liste ; elle alimente exclusivement l'infobulle de survol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La liste des modules affiche uniquement les titres : aucun texte de description présent à l'écran sans survol (vérifiable par inspection de la page et des tests de rendu).
- **SC-002**: Le survol d'un module fait apparaître son infobulle à droite en moins de 300 ms après l'entrée du pointeur.
- **SC-003**: La description disparaît au retrait du pointeur dans moins de 500 ms (aucune description persistante).
- **SC-004**: Aucun parcours existant ne régresse : accueil (squelette), navigation vers EAN-13, accès direct, URL inconnue avec barre persistante, repli mobile, tous vérifiés après la refonte.
- **SC-005**: Le module courant reste identifiable dans la liste à tout instant (mise en évidence inchangée).

## Assumptions

- La variante « sidebar-08 » du jeu d'interfaces shadcn correspond à « An inset sidebar with secondary navigation » (vérifié sur la documentation officielle des blocs : ui.shadcn.com/blocks/sidebar). La « sidebar-04 » correspond à « A floating sidebar with submenus ».
- L'infobulle sur la droite est le composant standard « tooltip » du jeu, déclenché au survol et à l'ouverture au clavier, avec positionnement à droite de l'entrée.
- Le report de la description dans l'infobulle ne modifie ni le registre des modules ni les destinations de navigation (aucun changement de routage).
- Le libellé de lien reste le titre du module : l'accès au module n'est pas conditionné au survol.
- La présentation encastrée conserve les fonctions existantes du panneau : repli en icônes et gestion écran étroit.
- Le terme technique « sidebar-08/sidebar-04 » est une référence utilisateur ; la présente spec décrit un comportement (liste en titres + infobulle droite) indépendant de l'implémentation.
- Les comportements hérités (mise en évidence, persistance, fil d'Ariane) font l'objet de vérifications de non-régression dans la présente spec.