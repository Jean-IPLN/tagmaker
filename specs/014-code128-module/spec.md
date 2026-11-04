# Feature Specification: Module Code 128 — impression de codes-barres libres

**Feature Branch**: `014-code128-module`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "on vas ajouter un module code128"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimer une étiquette Code 128 pour un contenu saisi (Priority: P1)

Un utilisateur ouvre le module **Code 128** depuis la galerie, saisit un
contenu libre (par exemple une référence `REF-2026-A17`, un numéro de série
`SN004512`, ou un code numérique `12345678`), indique une quantité, puis
imprime : l'imprimante produit le nombre demandé d'étiquettes identiques,
chacune portant un **code-barres Code 128 scannable** du contenu exact, avec le
contenu affiché en clair sous les barres et dimensionné selon le format de
papier sélectionné. Au-delà de 2 étiquettes, une confirmation explicite est
demandée avant toute impression. Sans imprimante sélectionnée, l'impression
est bloquée avec un message invitant à en choisir une.

**Why this priority**: C'est le cœur du module : produire une étiquette à
code-barres pour n'importe quelle référence d'usage courant (logistique,
inventaire, traçabilité) sans être limité aux nomenclatures EAN-13 ou
Emplacement.

**Independent Test**: Imprimer `REF-2026-A17` en quantité 1, puis scanner
l'étiquette : le lecteur restitue exactement `REF-2026-A17`. Recommencer avec
`12345678` et une quantité de 5 (confirmation acceptée) : 5 étiquettes
identiques sont produites.

**Acceptance Scenarios**:

1. **Given** le module Code 128 ouvert et une imprimante sélectionnée,
   **When** l'utilisateur saisit `REF-2026-A17` avec une quantité de 1 ou 2 et
   valide, **Then** les étiquettes sont imprimées sans confirmation préalable
   et chaque code-barres scanne exactement `REF-2026-A17`
2. **Given** un contenu valide et une quantité supérieure à 2, **When**
   l'utilisateur valide, **Then** une confirmation explicite s'affiche et
   aucune impression n'a lieu tant qu'il n'a pas confirmé ; annuler ne produit
   aucune étiquette
3. **Given** un contenu validé, **When** l'impression a lieu, **Then**
   exactement le nombre d'étiquettes demandé est produit, toutes identiques
4. **Given** une étiquette imprimée, **When** on la regarde, **Then** le
   contenu est affiché en clair sous les barres, centré et lisible
5. **Given** aucune imprimante sélectionnée, **When** l'utilisateur valide,
   **Then** aucun envoi n'est effectué et un message invite à choisir une
   imprimante

---

### User Story 2 - Rejeter un contenu non imprimable ou trop volumineux (Priority: P2)

L'utilisateur saisit un contenu vide, composé uniquement d'espaces, contenant
des caractères interdits (accents, emoji, caractères de contrôle) ou trop long
pour la norme Code 128 ou pour le format de papier sélectionné : l'application
refuse l'impression et affiche un message clair, sans rien imprimer ni envoyer
à l'imprimante.

**Why this priority**: Une étiquette illisible (contenu tronqué, caractères
non encodables, code-barres débordant du support) est une source d'erreur
logistique. Le garde-fou est indispensable dès la v1, comme les validations
des modules EAN-13 et Emplacement.

**Independent Test**: Saisir `café` (accent), puis 81 caractères, puis un
contenu trop long pour le plus petit format de papier : chaque tentative est
refusée avec un message explicatif et aucune requête n'est envoyée à
l'imprimante.

**Acceptance Scenarios**:

1. **Given** un contenu vide ou uniquement composé d'espaces, **When**
   l'utilisateur valide, **Then** l'impression est refusée avec un message
   indiquant que le contenu est requis
2. **Given** un contenu contenant un caractère non imprimable (accent, emoji,
   caractère de contrôle), **When** l'utilisateur valide, **Then**
   l'impression est refusée avec un message précise les caractères acceptés
3. **Given** un contenu de plus de 80 caractères, **When** l'utilisateur
   valide, **Then** l'impression est refusée avec un message indiquant la
   longueur maximale
4. **Given** un contenu valide mais trop long pour tenir sur le format de
   papier sélectionné à une taille scannable, **When** l'utilisateur valide,
   **Then** l'impression est refusée avec un message invitant à raccourcir le
   contenu ou à changer de format
5. **Given** une quantité vide, nulle, négative ou non entière, **When**
   l'utilisateur valide, **Then** l'impression est refusée avec un message
   clair

---

### User Story 3 - Retrouver le module et réutiliser les réglages (Priority: P3)

L'utilisateur trouve le module **Code 128** dans la galerie d'accueil aux
côtés des modules existants, avec un nom et une description explicites ; après
usage, il apparaît dans les modules récents. Le module applique les réglages
partagés : format de papier, orientation (pivotée ou non) et imprimante
sélectionnés dans les Paramètres.

**Why this priority**: L'intégration à la galerie et aux réglages existants
rend le module découvrable et cohérent avec le reste de l'application, sans
dupliquer les mécanismes déjà en place.

**Independent Test**: Ouvrir l'accueil : le module Code 128 est listé ;
l'utiliser puis revenir à l'accueil : il figure dans les modules récents ;
changer le format de papier et l'orientation dans les Paramètres puis
imprimer : les étiquettes respectent ces réglages.

**Acceptance Scenarios**:

1. **Given** l'application ouverte sur la galerie, **When** la page s'affiche,
   **Then** le module Code 128 est visible avec sa description
2. **Given** le module Code 128 utilisé au moins une fois, **When**
   l'utilisateur revient à la galerie, **Then** le module apparaît dans les
   modules récents
3. **Given** un format de papier et une orientation choisis dans les
   Paramètres, **When** une impression a lieu, **Then** les étiquettes
   utilisent ce format et cette orientation, et le code reste scannable avec
   son texte lisible dans les deux orientations

---

### Edge Cases

- **Contenu vide ou uniquement espaces** : rejeté ; aucune impression.
- **Espaces de début/fin** : ignorés (le contenu imprimé est nettoyé) ; les
  espaces internes sont conservés.
- **Majuscules et minuscules** : conservées telles que saisies (le code-barres
  est sensible à la casse).
- **Contenu exactement à 80 caractères** : accepté s'il tient sur le format
  sélectionné ; au-delà, rejeté.
- **Contenu pile à la limite de place du support** : imprimé si la largeur
  minimale de trait reste scannable.
- **Quantité exactement 2** : aucune confirmation.
- **Quantité supérieure à 2** : confirmation obligatoire ; annulation sans
  impression.
- **Imprimante injoignable ou erreur serveur** : message explicite ;
  l'échec n'est jamais silencieux et le contenu saisi reste affiché.
- **Double validation rapide** : une seule impression est lancée ; la seconde
  est refusée avec un message indiquant qu'une impression est déjà en cours.
- **Changement de format entre deux impressions** : le code-barres se
  redimensionne sans être tronqué.
- **Aucun format papier configuré** : le format par défaut de l'application
  s'applique.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST proposer le module **Code 128** dans la galerie et
  la navigation de l'application, aux côtés des modules EAN-13 et Emplacement,
  avec un nom et une description clairs.
- **FR-002**: Le module MUST proposer un champ de saisie du **contenu** de
  l'étiquette et un champ **quantité**.
- **FR-003**: System MUST accepter tout contenu de 1 à 80 caractères **ASCII
  imprimables** (espaces internes compris), la casse étant conservée ; les
  espaces de début et de fin sont ignorés.
- **FR-004**: System MUST refuser, avec un message explicite et sans aucune
  impression, un contenu vide, uniquement composé d'espaces, contenant des
  caractères non imprimables (accents, emoji, caractères de contrôle) ou
  dépassant 80 caractères.
- **FR-005**: System MUST refuser, avec un message invitant à raccourcir le
  contenu ou à changer de format, un contenu qui ne tient pas sur le format de
  papier sélectionné à une taille de code-barres scannable.
- **FR-006**: System MUST exiger une quantité entière comprise entre 1 et
  1000 et refuser toute autre valeur avec un message clair.
- **FR-007**: System MUST demander une confirmation explicite lorsque la
  quantité dépasse 2 étiquettes ; une annulation ne doit produire aucune
  impression.
- **FR-008**: System MUST imprimer exactement la quantité demandée
  d'étiquettes identiques, chacune portant un code-barres **Code 128**
  scannable restituant exactement le contenu saisi.
- **FR-009**: System MUST afficher le contenu en clair sous les barres,
  centré et lisible, pour les deux orientations.
- **FR-010**: System MUST appliquer le format de papier, l'orientation et
  l'imprimante choisis dans les Paramètres partagés.
- **FR-011**: System MUST bloquer l'impression, sans aucun envoi, lorsqu'aucune
  imprimante n'est sélectionnée, avec un message invitant à en choisir une.
- **FR-012**: System MUST signaler toute erreur d'impression (imprimante
  injoignable, erreur serveur) par un message explicite, sans échec silencieux.
- **FR-013**: System MUST n'autoriser qu'une seule impression en cours à la
  fois ; une soumission simultanée est refusée avec un message dédié.
- **FR-014**: System MUST référencer le module dans les modules récents après
  son utilisation, comme les modules existants.

### Key Entities *(include if data involved)*

- **Contenu d'étiquette** : chaîne de 1 à 80 caractères ASCII imprimables,
  casse conservée, espaces de début/fin ignorés.
- **Impression Code 128** : contenu nettoyé et quantité d'étiquettes
  demandée.
- **Réglages d'impression** (partagés, existants) : format de papier,
  orientation, imprimante sélectionnée.
- **Module** : identifiant, nom, description, chemin d'accès — enregistré dans
  la galerie et les modules récents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur un échantillon de contenus alphanumériques variés (lettres,
  chiffres, tirets, espaces internes), 100 % des codes-barres imprimés sont
  scannés et restituent exactement le contenu saisi.
- **SC-002**: Une impression d'une étiquette aboutit en moins de 10 secondes
  sur le réseau local, sans manipulation supplémentaire.
- **SC-003**: 100 % des contenus invalides (vide, accentué, plus de 80
  caractères, trop long pour le support) sont refusés sans qu'aucune étiquette
  ne soit produite.
- **SC-004**: Sur 10 impressions de quantités allant de 1 à 50, le nombre
  d'étiquettes produites est exactement la quantité confirmée.
- **SC-005**: Un utilisateur familier réalise une impression complète (ouverture
  du module, saisie, validation) en moins d'une minute, sans documentation.

## Assumptions

- Application web locale mono-utilisateur, imprimante thermique ZPL sur le
  réseau local : contexte et réglages existants réutilisés tels quels.
- Un seul contenu par impression : ni plage, ni séquence automatique, ni
  import de fichier (non demandés).
- Seuls les caractères ASCII imprimables sont pris en charge ; les accents et
  l'Unicode sont hors périmètre (limite de la norme Code 128).
- La limite de 80 caractères correspond à la limite standard du symbole
  Code 128.
- La confirmation au-delà de 2 étiquettes, le garde-fou « aucune imprimante »
  et la gestion des réglages reprennent le comportement des modules existants.
- Le contrôle « tient sur le support » s'appuie sur les formats de papier et la
  résolution déjà configurés dans l'application.
- Le module est un ajout non destructif : les modules EAN-13 et Emplacement
  restent inchangés dans leur comportement.
