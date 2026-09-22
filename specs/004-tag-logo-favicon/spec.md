# Feature Specification: Logo et favicon « tag »

**Feature Branch**: `004-tag-logo-favicon`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "utilise l'icon tag de phosphor icon pour faire le logo et le favicon"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Logo de marque « TagMaker » (Priority: P1)

L'utilisateur ouvre l'application : la barre latérale affiche, au-dessus des
modules, le logo de l'application — un pictogramme en forme d'étiquette (tag)
associé au nom « TagMaker ». Le logo est présent sur toutes les vues
(accueil, module, URL inconnue) et reste conforme à l'identité visuelle de
l'application.

**Why this priority**: Le logo est l'élément d'identité centrale demandé : il
distingue l'application et remplace la mention textuelle seule actuelle.

**Independent Test**: Rendu de la barre latérale seul : un pictogramme de logo
est rendu conjointement au nom « TagMaker », et ce sur les vues accueil,
module et URL inconnue.

**Acceptance Scenarios**:

1. **Given** l'utilisateur ouvre n'importe quelle vue de l'application, **When**
   la barre latérale est affichée, **Then** le logo (pictogramme d'étiquette +
   nom « TagMaker ») est visible dans l'entête de la barre latérale
2. **Given** un pictogramme d'étiquette (tag), **When** il est affiché à sa
   taille normale de logo, **Then** le symbole reste net et identifiable
3. **Given** le logo de l'application, **When** l'utilisateur navigue
   (accueil, module, URL inconnue), **Then** le logo est présent à chaque vue

---

### User Story 2 - Favicon d'onglet cohérent (Priority: P1)

L'utilisateur ouvre l'application dans son navigateur : l'onglet affiche un
pictogramme d'étiquette identique à celui du logo, au lieu de l'icône
générique par défaut du navigateur. Le pictogramme reste reconnaissable à la
petite taille d'un onglet, quelle que soit la page ouverte.

**Why this priority**: Le favicon complète l'identité visuelle demandée
(« pour le logo et le favicon ») ; sans lui, aucun changement n'est visible
dans l'onglet.

**Independent Test**: Chargement des vues accueil, module et URL inconnue : le
navigateur affiche le pictogramme de l'application dans l'onglet (aucune icône
générique par défaut) et le symbole est identique à celui du logo.

**Acceptance Scenarios**:

1. **Given** l'application ouverte dans un onglet, **When** une vue quelconque
   est affichée, **Then** l'onglet montre le pictogramme d'étiquette de
   l'application
2. **Given** le symbole du logo, **When** le favicon est affiché dans
   l'onglet, **Then** les deux symboles sont la même étiquette (cohérence
   visuelle)
3. **Given** une taille d'onglet réduite, **When** le favicon est affiché,
   **Then** le pictogramme reste identifiable malgré sa petite taille

---

### Edge Cases

- Petite taille de favicon : le pictogramme reste lisible, sans détail superflu.
- Thème sombre de l'application : le pictogramme conserve un contraste
  suffisant sur fond sombre, tant pour le logo que pour le favicon.
- Vue sans module (URL inconnue) : le logo et le favicon restent affichés,
  les parcours existants ne sont pas interrompus par l'ajout visuel.
- Navigateur sans icône explicite : aucun avertissement de ressource favicon
  manquante n'est émis pour les vues de l'application.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'application doit arborer un logo composé d'un pictogramme en
  forme d'étiquette (tag) associé au nom de marque « TagMaker », affiché dans
  l'entête de la barre latérale.
- **FR-002**: Le même pictogramme doit être utilisé pour l'icône d'onglet du
  navigateur (favicon).
- **FR-003**: Le pictogramme doit rester identifiable à petite taille
  (onglet) comme à taille normale (logo).
- **FR-004**: Le logo et le favicon doivent être visuellement cohérents entre
  eux (même symbole, même convention de style).
- **FR-005**: Le logo doit rester visible sur toutes les vues de
  l'application, y compris une URL inconnue.

### Key Entities *(include if feature involves data)*

*Aucune entité de données nouvelle : la modification est uniquement visuelle.*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur les vues accueil, module et URL inconnue, le logo
  (pictogramme + nom) est visible dans la barre latérale sans exception.
- **SC-002**: Sur ces mêmes vues, l'onglet du navigateur affiche le
  pictogramme de l'application (aucune icône générique par défaut).
- **SC-003**: Le pictogramme du logo et celui du favicon sont identiques,
  reconnaissables d'un seul coup d'œil.
- **SC-004**: Le pictogramme reste net à la taille d'un onglet (aucun
  dégradé évident, contours lisibles).
- **SC-005**: Aucune régression de navigation : les parcours existants
  (accueil, module, 404) fonctionnent à l'identique après l'ajout du logo et
  du favicon.

## Assumptions

- Le choix du pictogramme (« étiquette »/tag) et de la bibliothèque d'icônes
  « phosphor » est une directive exprimée par l'utilisateur ; la présente spec
  décrit l'effet attendu (logo + favicon cohérents), sans présumer de
  l'implémentation.
- Le logo remplace ou complète la mention textuelle « TagMaker » de l'entête
  existant sans en changer la place ni le rôle (lien de retour à l'accueil
  conservé).
- L'application est en thème sombre : le favicon et le logo doivent rester
  visibles (fond sombre, contraste suffisant).
- Le favicon concerne l'ensemble des vues (racine, modules, ainsi que la page
  404) ; aucune ressource de favicon manquante ne doit subsister.
- Aucune donnée métier ni logique de domaine n'est affectée.