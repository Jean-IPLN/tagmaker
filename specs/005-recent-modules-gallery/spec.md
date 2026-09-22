# Feature Specification: Galerie des derniers modules utilisés

**Feature Branch**: `005-recent-modules-gallery`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "on modifie l'accueil, elle servira à afficher les dernier module utilisé : avec une affichage gallerie de carte ; si la gallerie est vide on affiche un squelette correspondent"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enregistrement des modules consultés (Priority: P1)

L'utilisateur navigue vers un module (par exemple EAN-13) depuis la barre
latérale : l'application mémorise que ce module vient d'être utilisé. S'il
ouvre à nouveau le même module, celui-ci est enregistré à nouveau, mais une
seule fois dans l'historique : chaque module n'y figure jamais en double et
remonte en tête de la liste à chaque consultation.

**Why this priority**: Sans cet enregistrement, l'accueil ne peut montrer
« les derniers modules utilisés » ; c'est la donnée qui alimente toute la
galerie.

**Independent Test**: Ouvrir successivement des modules, puis vérifier la
liste mémorisée : aucun doublon, ordre du plus récent au plus ancien, et
re-consultation d'un module qui le fait remonter en tête.

**Acceptance Scenarios**:

1. **Given** l'utilisateur n'a jamais utilisé de module, **When** il consulte
   un module pour la première fois, **Then** ce module est enregistré en tête
   de l'historique
2. **Given** un historique contenant plusieurs modules, **When** l'utilisateur
   re-consulte un module qui n'était pas en tête, **Then** ce module remonte
   en tête sans créer de doublon
3. **Given** un module déjà présent dans l'historique, **When** il est
   consulté plusieurs fois, **Then** il n'apparaît qu'une seule fois dans
   l'historique
4. **Given** un historique à pleine capacité, **When** un nouveau module est
   consulté, **Then** le module le plus ancien sort de l'historique

---

### User Story 2 - Accueil en galerie de cartes (Priority: P1)

L'utilisateur ouvre l'accueil de l'application : au lieu d'un simple message
d'invitation, il voit une **galerie de cartes** présentant les derniers
modules qu'il a utilisés, du plus récent au plus ancien. Chaque carte affiche
le titre et la description du module, et un clic sur une carte ouvre ce
module. Si l'utilisateur n'a encore jamais utilisé de module, la galerie est
vide et l'accueil affiche à la place un **squelette de la galerie** (des
formes de cartes de même allure) qui correspond visuellement à ce qui sera
affiché.

**Why this priority**: C'est l'objectif central demandé : rendre l'accueil
utile en donnant un accès direct aux derniers modules utilisés, avec un état
vide préparé.

**Independent Test**: Afficher l'accueil seul : avec un historique non vide,
des cartes de modules sont listées du plus récent au plus ancien et chacune
ouvre son module ; avec un historique vide, un squelette de galerie est rendu.

**Acceptance Scenarios**:

1. **Given** un historique non vide, **When** l'utilisateur ouvre l'accueil,
   **Then** une galerie de cartes présente les modules utilisés, ordonnés du
   plus récent au plus ancien
2. **Given** une carte de la galerie, **When** l'utilisateur clique dessus,
   **Then** le module correspondant est ouvert
3. **Given** une carte de la galerie, **When** elle est affichée, **Then** elle
   montre le titre et la description du module (cohérents avec la barre
   latérale)
4. **Given** un historique vide (aucun module utilisé), **When** l'utilisateur
   ouvre l'accueil, **Then** un squelette de galerie est affiché à la place
   des cartes
5. **Given** l'ancienne invitation « Choisissez un module dans la barre
   latérale », **When** l'accueil est modifié, **Then** elle est remplacée par
   la galerie (et son squelette), sans message d'invitation redondant

---

### Edge Cases

- **Historique vide au premier lancement** : la galerie n'a aucune carte → le
  squelette de galerie est affiché.
- **Re-consultation répétée du même module** : le module reste unique dans
  l'historique, toujours en tête, sans accumulation de doublons.
- **Historique plein** : l'arrivée d'un nouveau module évince le module le
  plus ancien ; la capacité maximale n'est jamais dépassée.
- **Module mentionné dans l'historique mais absent du catalogue** (historique
  obsolète, ex. module supprimé) : la carte correspondante n'est pas affichée
  dans la galerie et l'entrée est ignorée sans erreur.
- **Module non consulté depuis plus d'1 mois** : le module sort des récents
  automatiquement ; si c'était le dernier, la galerie redevient vide (squelette).
- **Rechargement / nouvelle ouverture de l'application** : l'historique
  conserve son état, la galerie reste cohérente avec les derniers modules
  utilisés.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La page d'accueil doit afficher une galerie de cartes des
  derniers modules utilisés, ordonnées de la plus récente à la plus ancienne.
- **FR-002**: Chaque carte de la galerie doit montrer le titre et la
  description de son module, conformes à ceux affichés dans la barre latérale.
- **FR-003**: Chaque carte de la galerie doit être un point d'entrée : activer
  une carte doit ouvrir le module correspondant.
- **FR-004**: La galerie doit afficher au maximum les 4 derniers modules
  utilisés (capacité de 4 entrées).
- **FR-005**: Consulter un module doit enregistrer ce module comme récemment
  utilisé, sans créer d'entrée en double dans l'historique.
- **FR-006**: La re-consultation d'un module déjà enregistré doit le replacer
  en tête de l'historique.
- **FR-007**: L'historique doit persister au-delà d'un rechargement de page ou
  d'une nouvelle ouverture de l'application, sur un même appareil.
- **FR-008**: Quand l'historique est vide, la page d'accueil doit afficher un
  squelette de galerie (formes de cartes) de même allure que la galerie
  réelle.
- **FR-009**: Une entrée d'historique qui ne correspond à aucun module
  existant du catalogue doit être ignorée (jamais affichée) sans provoquer
  d'erreur.
- **FR-010**: Tout module non consulté depuis plus d'un mois (30 jours) doit
  être retiré automatiquement des modules récents.

### Key Entities

- **Module utilisé (entrée d'historique)**: la référence d'un module du
  catalogue, associée à l'instant de sa dernière consultation ; l'ordre de
  l'historique est dérivé de cet instant, le plus récent en premier.
- **Galerie**: la vue d'accueil regroupant jusqu'à la capacité maximale
  d'entrées d'historique valides, présentées sous forme de cartes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: À l'ouverture de l'accueil, l'utilisateur voit ses derniers
  modules utilisés affichés instantanément (aucune attente perceptible).
- **SC-002**: Sur 100 % des ouvertures d'accueil avec un historique non vide,
  le module le plus récemment consulté est présenté en première position.
- **SC-003**: Aucun module ne peut apparaître en double dans la galerie
  (0 doublon observé).
- **SC-004**: Au premier lancement (historique vide), le squelette de galerie
  s'affiche immédiatement et son allure correspond à celle des cartes réelles.
- **SC-005**: Sur 100 % des rechargements, l'historique affiché après
  rechargement contient exactement les modules consultés avant celui-ci.
- **SC-006**: Tout module non consulté pendant plus de 30 jours disparaît de
  la galerie sur 100 % des ouvertures suivantes (aucune carte obsolète
  affichée).

## Assumptions

- **« Module utilisé »** signifie consulter (ouvrir) la page du module depuis
  la navigation ; l'enregistrement n'exige pas d'action supplémentaire
  (ex. impression) dans cette version.
- **Capacité de l'historique et de la galerie** : 4 entrées, confirmé par
  l'utilisateur.
- **Persistance locale sur l'appareil** : l'historique est conservé sur le
  navigateur de l'utilisateur ; il n'y a ni compte, ni synchronisation entre
  appareils (application locale à un seul utilisateur).
- **Directive utilisateur « cookies »** : le support de stockage demandé est
  un **cookie** du navigateur (enregistré comme choix de marque, cf. feature
  004) ; l'exigence FR-007 reste formulée en termes d'effet (persistance au
  rechargement). Contenu : entrées de l'historique non sensibles (ids de
  modules + instants), pas de secret.
- **Seuil d'expiration** : « plus de 1 mois » est retenu comme **30 jours**
  calendaires ; l'instant de référence est celui de la dernière consultation.
- **Un seul catalogue de modules** : les cartes reprennent les modules déjà
  exposés dans la barre latérale ; aucun nouveau module n'est ajouté.
- **Hors périmètre** : suppression manuelle de l'historique, statistiques
  d'usage, et tri ou filtrage autre que l'ordre du plus récent au plus
  ancien.
- **Dépendance** : le catalogue de modules existant (titres, descriptions,
  chemins) est réutilisé tel quel.