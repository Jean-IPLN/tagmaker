# Feature Specification: Orientation d'impression du papier

**Feature Branch**: `012-orientation-papier`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "dans les paramettre on ajoute un switch pour changer l'orientation du papier, en gros ils faut que quand ce switch est true, ca imprimer dans l'autre orientation de la feuille (il faut que ducoup l'impression s'adapte à cette nouvelle orientation"

## Clarifications

### Session 2026-10-05

- Q: Le support reste-t-il chargé et tourné dans l'imprimante, ou seul le
  contenu imprimé change-t-il d'orientation ? → A: Le support n'est ni
  rechargé ni tourné : seul le contenu est pivoté d'un quart de tour, la
  zone d'impression reste celle du format sélectionné et la mise en page
  s'adapte.
- Q: Dans quel sens le contenu pivoté doit-il tourner (haut du contenu à
  gauche, ou à droite) ? → A: Le haut du contenu imprimé doit se situer à
  gauche de l'étiquette et le bas à droite, soit un quart de tour dans le
  sens antihoraire.
- Q: Que faire lorsque le format de papier sélectionné ne permet pas
  l'orientation pivotée ? → A: Le switch Orientation est désactivé et
  l'impression utilise l'orientation par défaut.
- Q: Quand l'orientation pivotée est impossible puis devient de nouveau
  possible (retour à un format compatible), le switch repart-il sur
  désactivé ou sur activé ? → A: Il repart sur **désactivé** (valeur par
  défaut) : l'utilisateur doit le réactiver à la main, aucune impression
  ne bascule seule en orientation pivotée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimer dans l'orientation inverse du support (Priority: P1)

L'utilisateur laisse ses étiquettes chargées dans l'imprimante comme
d'habitude : le support n'est pas rechargé, la zone d'impression reste
identique. Il ouvre la section **Paramètres** en bas de la barre
latérale et active le switch **Orientation**. Le contenu imprimé est alors
produit **pivoté d'un quart de tour** sur la feuille, et sa mise en page
se recalcule pour tenir entièrement dans cette zone : le code-barres
s'allonge le long du plus petit côté de l'étiquette au lieu du plus
grand, ce qui le rend plus fin mais toujours lisible. L'étiquette
imprimée contient les mêmes données, simplement dans l'autre orientation
de lecture. Le réglage reste mémorisé au rechargement de l'application.

**Why this priority**: C'est le besoin exprimé et la valeur de la
fonctionnalité. Sans lui, l'utilisateur ne peut pas imprimer ses
étiquettes dans l'orientation opposée à celle utilisée par défaut.

**Independent Test**: Activer le switch dans Paramètres, choisir un
format de papier rectangulaire et imprimer une étiquette de chaque
module (EAN-13 et Emplacement). Vérifier que l'étiquette sort dans
l'orientation inverse, que le contenu est lisible, entièrement contenu
dans la zone, et que le réglage est retrouvé après rechargement.

**Acceptance Scenarios**:

1. **Given** l'orientation inverse désactivée et un format rectangulaire
   sélectionné, **When** l'utilisateur imprime une étiquette, **Then**
   l'impression est exactement identique au comportement actuel.
2. **Given** l'orientation inverse désactivée, **When** l'utilisateur
   active le switch puis imprime une étiquette, **Then** le support est
   resté chargé de la même façon, la zone d'impression est inchangée, et le
   contenu est imprimé pivoté d'un quart de tour, lisible et entièrement
   contenu dans la zone.
3. **Given** l'orientation inverse activée, **When** l'utilisateur
   recharge la page, **Then** le switch est toujours activé et
   l'impression suivante se fait dans l'orientation inverse.

---

### User Story 2 - Un réglage unique valable pour tous les types d'étiquettes (Priority: P2)

L'utilisateur active l'orientation inverse une seule fois dans les
Paramètres. Toutes ses impressions, quel que soit le module utilisé
(code EAN-13 ou Emplacement avec code Code 128), sortent ensuite dans
cette orientation. Il n'a rien à régler en plus par module.

**Why this priority**: Un réglage par module obligerait l'utilisateur à
maintenir deux états cohérents et créerait des impressions incohérentes
entre deux lots d'étiquettes.

**Independent Test**: Activer le switch une fois, puis imprimer une
étiquette EAN-13 et une étiquette Emplacement sans modifier le réglage
entre les deux ; les deux sorties doivent être dans l'orientation inverse.

**Acceptance Scenarios**:

1. **Given** l'orientation inverse activée, **When** l'utilisateur imprime
   une étiquette EAN-13 puis une étiquette Emplacement, **Then** les deux
   impressions utilisent l'orientation inverse.
2. **Given** l'orientation inverse activée, **When** l'utilisateur imprime
   un lot de plusieurs étiquettes d'un même module, **Then** toutes les
   étiquettes du lot sont dans l'orientation inverse.

---

### User Story 3 - Revenir à l'orientation normale (Priority: P3)

L'utilisateur désactive le switch **Orientation**. Les impressions
suivantes reviennent immédiatement dans l'orientation par défaut. Les
autres réglages (format de papier, imprimante) ne sont pas affectés par
cette manipulation.

**Why this priority**: Le réglage doit être réversible sans
conséquence collatérale, sinon l'utilisateur est bloqué sur un support
mal chargé.

**Independent Test**: Activer puis désactiver le switch, imprimer dans
les deux états et comparer avec les impressions obtenues avant la
fonctionnalité ; le format et l'imprimante sélectionnels restent
inchangés.

**Acceptance Scenarios**:

1. **Given** l'orientation inverse activée, **When** l'utilisateur
   désactive le switch puis imprime, **Then** l'impression revient dans
   l'orientation par défaut.
2. **Given** un format de papier et une imprimante sélectionnés,
   **When** l'utilisateur active puis désactive l'orientation, **Then**
   le format de papier et l'imprimante sélectionnés sont inchangés.
3. **Given** un format de papier trop étroit pour l'orientation pivotée,
   **When** l'utilisateur sélectionne ce format, **Then** le switch
   Orientation devient désactivé et l'impression se fait dans
   l'orientation par défaut.

---

### Edge Cases

- **Format carré** (largeur égale à la longueur) : activer ou désactiver
  l'orientation ne produit aucune différence visible, l'impression reste
  correcte.
- **Format trop étroit pour l'orientation pivotée** : sur une étiquette
  dont le plus petit côté est trop court pour accueillir un symbole lisible
  une fois pivoté, le switch **Orientation** est **désactivé** (non
  actionnable) et l'impression se fait dans l'orientation par défaut.
- **Changement de format de papier** après avoir activé l'orientation :
  sur un format compatible le réglage reste actif et s'applique
  immédiatement ; sur un format incompatible il est réinitialisé sur
  désactivé, et le switch redevient actionnable mais reste désactivé au
  retour sur un format compatible (activation manuelle nécessaire).
- **Impression déjà lancée** lorsque l'utilisateur bascule le switch :
  l'impression en cours est produite dans l'orientation déjà engagée,
  seule l'impression suivante prend la nouvelle orientation.
- **Format par défaut** (aucun format mémorisé, premier format de la
  liste) : l'orientation s'y applique comme à tout autre format.
- **Support partagé entre deux opérateurs** : le réglage est propre à
  chaque navigateur et ne modifie pas la configuration du serveur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Les Paramètres MUST présenter un switch **Orientation**,
  activable et désactivable, dont l'état par défaut est désactivé
  (orientation normale).
- **FR-002**: Quand le switch est activé, le contenu imprimé MUST être pivoté
  d'un quart de tour sur la feuille, et la zone d'impression MUST rester
  identique à celle du format sélectionné (aucun rechargement, aucune
  rotation du support).
- **FR-003**: Quand le switch est activé, la mise en page MUST s'adapter à
  l'orientation pivotée : les deux côtés du support MUST servir
  respectivement de contrainte de longueur et de hauteur du contenu pivoté,
  afin que celui-ci tienne entièrement dans la zone d'impression. Le pivotage
  MUST se faire d'un quart de tour dans le sens **antihoraire** : le haut du
  contenu imprimé se situe à gauche de l'étiquette et le bas à droite.
- **FR-004**: Quand le switch est désactivé, l'impression MUST être
  strictement identique au comportement actuel (aucune modification de la
  sortie imprimée).
- **FR-005**: Le réglage d'orientation MUST s'appliquer à tous les modules
  d'impression de l'application, sans réglage supplémentaire.
- **FR-006**: Le réglage d'orientation MUST être transmis à chaque demande
  d'impression, pour tous les modules.
- **FR-007**: Le réglage d'orientation MUST être mémorisé avec les autres
  réglages d'impression et restauré au rechargement, avec la même durée de
  vie.
- **FR-008**: Un changement de format de papier MUST conserver le réglage
  d'orientation choisi et l'appliquer immédiatement au nouveau format.
- **FR-009**: Pour un format dont les deux côtés sont égaux, l'activation du
  switch MUST produire une impression identique à celle du mode désactivé.
- **FR-010**: L'étiquette imprimée en orientation inverse MUST être
  entièrement contenue dans la zone d'impression, sans rognage ni
  débordement, et MUST rester lisible (texte non inversé, non tronqué).
- **FR-011**: Le switch MUST être utilisable au clavier et MUST exposer son
  état (activé/désactivé) de manière identifiable, comme les autres
  interrupteurs de l'application.
- **FR-012**: Le réglage MUST rester propre au navigateur de l'utilisateur
  et MUST NOT modifier la configuration du serveur ni celle des autres
  postes.
- **FR-013**: Lorsque le format de papier sélectionné ne permet pas
  l'orientation pivotée, le switch **Orientation** MUST être désactivé et non
  actionnable, et l'impression MUST se faire dans l'orientation par défaut.
- **FR-014**: Le désactivement du switch lié au format MUST être immédiat :
  il s'applique dès la sélection d'un format incompatible et disparaît
  dès le retour à un format compatible.
- **FR-015**: Le passage à un format incompatible MUST réinitialiser le
  réglage mémorisé sur l'état désactivé (orientation par défaut) ;
  l'orientation pivotée MUST être réactivée manuellement par l'utilisateur
  après un tel changement. Aucune impression MUST ne basculer
  automatiquement en orientation pivotée.

### Key Entities

- **Réglage d'impression** : ensemble des préférences d'impression d'un
  utilisateur — format de papier, adresse d'imprimante, orientation
  inverse (oui/non). Mémorisé pour l'utilisateur, restauré au
  rechargement.
- **Format de papier** : dimensions du support exprimées en millimètres
  (côté court, côté long) et libellé affiché dans les Paramètres.
- **Étiquette imprimée** : zone d'impression (largeur, longueur) et
  contenu (symbole + texte), dont l'orientation suit le réglage.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pour tout format pour lequel l'orientation pivotée est possible,
  l'impression est entièrement contenue dans la zone d'impression, sans
  rognage ni débordement.
- **SC-002**: 100 % des étiquettes imprimées en orientation inverse sont
  lisibles (symbole et texte dans le bon sens) sur les deux modules
  d'impression.
- **SC-003**: Le réglage est retrouvé dans 100 % des cas après un
  rechargement de la page, au même titre que les réglages d'impression
  existants.
- **SC-004**: Un utilisateur peut ouvrir les Paramètres et activer ou
  désactiver l'orientation en moins de 30 secondes, sans quitter la page
  ni redémarrer l'application.
- **SC-005**: Aucune régression : avec l'orientation désactivée, la
  sortie imprimée est identique à celle d'avant la fonctionnalité, et
  l'ensemble de la suite de tests reste verte.
- **SC-006**: Un utilisateur qui active l'orientation une fois obtient
  des impressions dans cette orientation sur tous ses modules, sans
  action supplémentaire.
- **SC-007**: Le switch Orientation est désactivé à chaque fois que le
  format sélectionné interdit l'orientation pivotée, et l'impression
  obtenue est alors strictement identique à celle de l'orientation par
  défaut.

## Assumptions

- Le réglage est **global et unique** pour tous les modules d'impression
  (il n'existe pas de réglage d'orientation par module).
- Le support **n'est ni rechargé ni tourné** : l'orientation inverse ne
  concerne que l'orientation du contenu imprimé dans la zone
  d'impression existante. L'opérateur ne change rien au chargement des
  étiquettes.
- La conséquence attendue d'une orientation pivotée : le contenu tire
  maintenant sa dimension la plus longue sur le **plus petit côté** de
  l'étiquette, et sa hauteur sur le plus grand côté ; le symbole sort donc
  plus fin qu'en orientation normale.
- La durée de vie du réglage suit celle des autres réglages d'impression
  déjà en place dans l'application.
- Les formats de papier disponibles et la résolution d'impression restent
  définis par la configuration du serveur : cette fonctionnalité n'ajoute
  aucun format et n'ouvre aucun réglage de résolution.
- Aucun réglage d'orientation par format, aucune mémorisation par
  imprimante et aucune auto-détection de l'orientation chargée.
- L'application reste utilisée par un seul opérateur à la fois sur un
  poste ; aucune gestion du conflit de réglages n'est nécessaire.