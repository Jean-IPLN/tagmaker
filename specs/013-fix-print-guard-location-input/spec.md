# Feature Specification: Correction d'UX — blocage d'impression et saisie du code emplacement

**Feature Branch**: `013-fix-print-guard-location-input`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "on vas patch certain defaut d'ux : quand auccune imprimante n'est selectionner il faut empecher d'imprimer et push un toast pour signalé le probleme ; dans le module emplacement quand j'ecris je commence a ecrire par le 2em charactere ca modifie le 1er (au passage le 1er est focement par defaut "1")"

## Clarifications

### Session 2026-10-06

- Q: Que devient le 1er caractère (la zone) du code emplacement pendant la
  saisie ? → A: le 1er caractère (zone 1/2) reste **sélectionnable** et sa
  valeur par défaut est « 1 » ; seul le comportement de frappe est à corriger
  : taper un caractère doit modifier le caractère attendu (2e, 3e ou 4e), pas
  le 1er.
- Q: Comment gérer le bouton Imprimer quand aucune imprimante n'est
  sélectionnée ? → A: le bouton **reste cliquable** : le clic est bloqué,
  aucun envoi n'a lieu, et un **toast** signale qu'aucune imprimante n'est
  choisie.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - L'impression est bloquée sans imprimante sélectionnée (Priority: P1)

L'utilisateur ouvre un module d'impression (EAN-13 ou Emplacement) sans avoir
choisi d'imprimante dans les paramètres (l'entrée Imprimante reste sur
« Non défini »). Il saisit un code valide, choisit sa quantité et clique sur
**Imprimer** : aucune étiquette n'est envoyée à l'imprimante. Un toast
l'informe immédiatement qu'aucune imprimante n'est sélectionnée et qu'il doit
en choisir une dans les paramètres pour pouvoir imprimer. Une fois une
imprimante sélectionnée, l'impression fonctionne normalement, y compris avec
une grande quantité (via la confirmation) et en mode plage d'emplacements.

**Why this priority**: C'est le besoin explicite de l'utilisateur et un
garde-fou important : sans ce blocage, l'impression part vers une imprimante
de secours non choisie (ou échoue en silence), ce qui gaspille des étiquettes
et brouille l'utilisateur.

**Independent Test**: Sans imprimante sélectionnée, cliquer Imprimer dans le
module EAN-13 (quantité 1) : vérifier qu'un toast s'affiche et qu'aucune
étiquette n'est imprimée. Répéter pour le module Emplacement (mode simple
puis plage) et pour une quantité demandant la confirmation.

**Acceptance Scenarios**:

1. **Given** aucune imprimante sélectionnée, **When** l'utilisateur clique
   Imprimer dans le module EAN-13, **Then** un toast signale l'absence
   d'imprimante et aucune étiquette n'est envoyée
2. **Given** aucune imprimante sélectionnée, **When** l'utilisateur clique
   Imprimer dans le module Emplacement (mode simple), **Then** un toast
   signale l'absence d'imprimante et aucune étiquette n'est envoyée
3. **Given** aucune imprimante sélectionnée, **When** l'utilisateur clique
   Imprimer dans le module Emplacement (mode plage), **Then** un toast
   signale l'absence d'imprimante et aucune étiquette n'est envoyée
4. **Given** aucune imprimante sélectionnée et une quantité supérieure à 2,
   **When** l'utilisateur confirme l'impression, **Then** un toast signale
   l'absence d'imprimante et aucune étiquette n'est envoyée
5. **Given** aucune imprimante sélectionnée, **When** l'utilisateur clique
   Imprimer, **Then** l'application n'envoie jamais vers une imprimante de
   secours ou par défaut non choisie
6. **Given** une imprimante sélectionnée, **When** l'utilisateur clique
   Imprimer avec une saisie valide, **Then** l'impression part normalement
   (comportement inchangé)

---

### User Story 2 - La frappe du code emplacement reste alignée sur chaque caractère (Priority: P1)

Dans le module Emplacement, le premier caractère (la zone) du code est
affiché avec la valeur par défaut « 1 » et reste modifiable en « 2 » via son
sélecteur. L'utilisateur saisit le code caractère par caractère : chaque
caractère tapé remplit **la position prévue** (2e, 3e, 4e) sans jamais
modifier les autres positions — et en particulier sans toucher au 1er
caractère. En type dynamique (`#D`), les 2e et 3e caractères sont imposés
(`#` et `D`) : seule la 4e position est à saisir, et elle reste alignée sur
la zone choisie.

**Why this priority**: Le code produit doit correspondre à ce que l'utilisateur
tape. Un décalage (taper le 2e et voir le 1er modifié) fabrique des codes
faux qui seront soit refusés, soit imprimés à tort — c'est le défaut signalé.

**Independent Test**: Dans le module Emplacement (type classique), taper
« 5 » en 2e position, « B » en 3e et « 2 » en 4e : le code affiché est
`15B2`, la zone restant à « 1 ». Changer la zone en « 2 » : les positions
2-4 restent intactes.

**Acceptance Scenarios**:

1. **Given** le module Emplacement en type Classique et une zone par défaut
   « 1 », **When** l'utilisateur tape un caractère dans la 2e position,
   **Then** ce caractère occupe la 2e position et la zone reste « 1 »
2. **Given** le même contexte, **When** l'utilisateur tape successivement les
   caractères en positions 2, 3 et 4, **Then** le code final correspond
   exactement à la séquence tapée, aligné sur la zone
3. **Given** une zone changée en « 2 », **When** l'utilisateur tape les
   positions suivantes, **Then** la zone reste « 2 » et les caractères se
   placent aux positions attendues
4. **Given** le type Dynamique (`#D` imposé en 2e et 3e), **When** l'utilisateur
   tape le 4e caractère, **Then** seule la 4e position change ; `#` et `D`
   restent en place et la zone reste inchangée
5. **Given** une saisie déjà complète, **When** l'utilisateur corrige un
   caractère du milieu, **Then** seuls ce caractère et sa position changent,
   sans décalage des autres

---

### Edge Cases

- Quelle est la valeur du code lorsque l'utilisateur tape le 2e caractère
  alors que la zone n'a pas encore été choisie explicitement ? → la zone
  vaut « 1 » par défaut ; le code reste un vrai code de 4 positions et ne
  devient pas un code décalé/plus court.
- Comment se comporte la frappe si l'utilisateur colle ou insère un texte en
  une seule fois ? → chaque caractère rejoint sa position correcte sans
  décalage résiduel.
- Que se passe-t-il si l'utilisateur efface (Retour arrière) un caractère du
  milieu ? → les autres caractères ne se décalent pas d'une position.
- Que se passe-t-il si une imprimante est sélectionnée puis l'application est
  rechargée ? → la sélection reste mémorisée et l'impression est autorisée ;
  si aucune imprimante n'est reconnue à l'ouverture, l'impression est de
  nouveau bloquée avec toast.
- Que se passe-t-il pour la plage d'emplacements si une borne est modifiée ?
  → la synchronisation de la zone entre début et fin de plage existante est
  conservée (le 1er caractère reste cohérent sur toute la plage).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'application DOIT empêcher toute impression (EAN-13 et
  Emplacement, simple et plage, y compris après confirmation de quantité)
  lorsqu'aucune imprimante n'est sélectionnée ; aucun envoi vers une
  imprimante de secours ou par défaut n'est autorisé dans ce cas.
- **FR-002**: L'application DOIT afficher un toast clair signalant qu'aucune
  imprimante n'est sélectionnée à chaque tentative d'impression bloquée.
- **FR-003**: Dès qu'une imprimante est sélectionnée, les impressions DOIVENT
  se dérouler exactement comme avant (aucune régression du flux d'impression).
- **FR-004**: Le premier caractère du code emplacement DOIT être la zone
  (choix 1 ou 2), sa valeur par défaut étant « 1 », et cette zone DOIT rester
  modifiable par l'utilisateur.
- **FR-005**: La saisie du code emplacement DOIT écrire chaque caractère tapé
  à la position prévue (2e, 3e ou 4e) sans modifier les autres positions ni
  les décaler, y compris lors d'une correction ou d'un effacement.
- **FR-006**: En type Dynamique, les 2e et 3e caractères (imposés `#` et `D`)
  DOIVENT rester verrouillés pendant la saisie ; seul le 4e caractère est
  éditable, aligné sur la zone choisie.
- **FR-007**: Le code emplacement produit DOIT toujours rester un code valide
  de 4 positions conforme à sa nomenclature (aucune valeur tronquée ou
  décalée n'est envoyée à la validation).
- **FR-008**: La synchronisation de la zone entre le début et la fin d'une
  plage d'emplacements DOIT être conservée.

### Key Entities *(include if feature involves data)*

- **Réglage d'imprimante**: l'imprimante choisie par l'utilisateur dans les
  paramètres (un état application, mémorisé entre les sessions). L'absence
  de choix (état « Non défini ») est la condition qui bloque l'impression.
- **Code emplacement**: une chaîne de 4 caractères (zone 1/2 + structure
  classique ou dynamique `#D`) ; la zone est sa première position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des clics sur Imprimer effectués sans imprimante
  sélectionnée (EAN-13 et Emplacement, tous modes) aboutissent à un toast et
  à zéro envoi d'impression.
- **SC-002**: Zéro impression est envoyée vers une imprimante de secours
  non choisie par l'utilisateur.
- **SC-003**: Après saisie caractère par caractère dans le module Emplacement
  (classique et dynamique), le code final reflète exactement la séquence
  tapée dans 100 % des cas, avec la zone par défaut « 1 » (modifiable en « 2 »).
- **SC-004**: Aucune régression : avec une imprimante sélectionnée, 100 % des
  cas d'impression existants (simple, plage, quantité avec confirmation)
  aboutissent à l'envoi normal des étiquettes, sans comportement nouveau
  observable.

## Assumptions

- Le blocage de l'impression est uniquement lié à l'absence d'imprimante
  sélectionnée ; il ne modifie pas les autres validations existantes
  (code invalide, format de papier, orientation, imprimante injoignable).
- Le bouton Imprimer reste cliquable même sans imprimante ; c'est au moment
  de la tentative que le blocage et le toast interviennent.
- La sélection de l'imprimante et sa mémorisation entre les sessions sont des
  comportements existants, réutilisés tels quels (hors périmètre).
- Un toast est une notification temporaire affichée à l'écran ; le style et
  le canal d'affichage ne sont pas imposés par cette spécification.
- Le 1er caractère du code emplacement reste un choix de zone (1 ou 2) ; la
  correction porte sur l'alignement de la frappe, pas sur le verrouillage de
  la zone.
- Les modes d'impression existants (simple, plage, confirmation de grande
  quantité) restent inchangés au-delà du garde-fou d'imprimante.