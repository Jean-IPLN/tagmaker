# Feature Specification: Module Data Matrix — impression de codes 2D libres

**Feature Branch**: `015-data-matrix-module`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "on vas ajouter un modul data matrix"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimer une étiquette Data Matrix pour un contenu saisi (Priority: P1)

Un utilisateur ouvre le module **Data Matrix** depuis la galerie, saisit un
contenu libre (par exemple une référence `REF-2026-A17`, un numéro de série
`SN004512`, ou une chaîne plus longue telle qu'une URL interne), une légende
facultative (par exemple `Palette 42`), indique une quantité, puis imprime :
l'imprimante produit le nombre demandé d'étiquettes identiques, chacune
portant un **code Data Matrix scannable** du contenu exact, centré sur le
support et dimensionné selon le format de papier sélectionné, avec la
**légende en clair** sous le code (ou à côté en orientation pivotée).
Au-delà de 2 étiquettes, une confirmation explicite est demandée avant toute
impression. Sans imprimante sélectionnée, l'impression est bloquée avec un
message invitant à en choisir une.

**Why this priority**: C'est le cœur du module : produire une étiquette 2D
compacte et robuste pour des contenus d'usage courant (traçabilité, inventaire,
références internes), sans dépendre d'une nomenclature prédéfinie.

**Independent Test**: Imprimer `REF-2026-A17` avec la légende `Palette 42`
en quantité 1, puis scanner l'étiquette : le lecteur restitue exactement
`REF-2026-A17` et la légende est lisible sous le code. Recommencer avec un
contenu de 120 caractères et une quantité de 5 (confirmation acceptée) :
5 étiquettes identiques sont produites.

**Acceptance Scenarios**:

1. **Given** le module Data Matrix ouvert et une imprimante sélectionnée,
   **When** l'utilisateur saisit `REF-2026-A17`, une légende `Palette 42` et
   une quantité de 1 ou 2, puis valide, **Then** les étiquettes sont imprimées
   sans confirmation préalable, chaque code scanne exactement
   `REF-2026-A17` et la légende `Palette 42` est imprimée en clair
2. **Given** un contenu valide, une légende vide et une quantité de 1,
   **When** l'utilisateur valide, **Then** l'étiquette porte uniquement le
   code Data Matrix, sans texte
3. **Given** un contenu valide et une quantité supérieure à 2, **When**
   l'utilisateur valide, **Then** une confirmation explicite s'affiche et
   aucune impression n'a lieu tant qu'il n'a pas confirmé ; annuler ne produit
   aucune étiquette
4. **Given** un contenu validé, **When** l'impression a lieu, **Then**
   exactement le nombre d'étiquettes demandé est produit, toutes identiques
5. **Given** une étiquette imprimée, **When** on la regarde, **Then** le code
   Data Matrix est carré, centré sur le support, scannable, et la légende
   éventuelle est centrée et lisible
6. **Given** aucune imprimante sélectionnée, **When** l'utilisateur valide,
   **Then** aucun envoi n'est effectué et un message invite à choisir une
   imprimante

---

### User Story 2 - Rejeter un contenu non imprimable ou trop volumineux (Priority: P2)

L'utilisateur saisit un contenu vide, composé uniquement d'espaces, contenant
des caractères interdits (accents, emoji, caractères de contrôle) ou trop long
pour la norme ou pour le format de papier sélectionné, ou une légende
contenant des caractères interdits ou trop longue pour le support :
l'application refuse l'impression et affiche un message clair, sans rien
imprimer ni envoyer à l'imprimante.

**Why this priority**: Un code 2D illisible ou débordant du support est une
source d'erreur logistique. Le garde-fou est indispensable dès la v1, comme
pour les modules existants.

**Independent Test**: Saisir `café` (accent), puis 201 caractères, puis un
contenu trop long pour le plus petit format de papier, puis une légende de
61 caractères : chaque tentative est refusée avec un message explicatif et
aucune requête n'est envoyée à l'imprimante.

**Acceptance Scenarios**:

1. **Given** un contenu vide ou uniquement composé d'espaces, **When**
   l'utilisateur valide, **Then** l'impression est refusée avec un message
   indiquant que le contenu est requis
2. **Given** un contenu contenant un caractère non imprimable (accent, emoji,
   caractère de contrôle), **When** l'utilisateur valide, **Then**
   l'impression est refusée avec un message précisant les caractères acceptés
3. **Given** un contenu de plus de 200 caractères, **When** l'utilisateur
   valide, **Then** l'impression est refusée avec un message indiquant la
   longueur maximale
4. **Given** un contenu valide mais trop long pour tenir sur le format de
   papier sélectionné à une taille scannable, **When** l'utilisateur valide,
   **Then** l'impression est refusée avec un message invitant à raccourcir le
   contenu ou à changer de format
5. **Given** une quantité vide, nulle, négative ou non entière, **When**
   l'utilisateur valide, **Then** l'impression est refusée avec un message
   clair
6. **Given** une légende contenant un accent ou un emoji, **When**
   l'utilisateur valide, **Then** l'impression est refusée avec un message
   précisant les caractères acceptés
7. **Given** une légende de plus de 60 caractères ou trop longue pour le
   format sélectionné, **When** l'utilisateur valide, **Then** l'impression
   est refusée avec un message invitant à la raccourcir

---

### User Story 3 - Retrouver le module et réutiliser les réglages (Priority: P3)

L'utilisateur trouve le module **Data Matrix** dans la galerie d'accueil aux
côtés des modules existants, avec un nom et une description explicites ; après
usage, il apparaît dans les modules récents. Le module applique les réglages
partagés : format de papier, orientation (pivotée ou non) et imprimante
sélectionnés dans les Paramètres.

**Why this priority**: L'intégration à la galerie et aux réglages existants
rend le module découvrable et cohérent avec le reste de l'application, sans
dupliquer les mécanismes déjà en place.

**Independent Test**: Ouvrir l'accueil : le module Data Matrix est listé ;
l'utiliser puis revenir à l'accueil : il figure dans les modules récents ;
changer le format de papier et l'orientation dans les Paramètres puis
imprimer : les étiquettes respectent ces réglages.

**Acceptance Scenarios**:

1. **Given** l'application ouverte sur la galerie, **When** la page s'affiche,
   **Then** le module Data Matrix est visible avec sa description
2. **Given** le module Data Matrix utilisé au moins une fois, **When**
   l'utilisateur revient à la galerie, **Then** le module apparaît dans les
   modules récents
3. **Given** un format de papier et une orientation choisis dans les
   Paramètres, **When** une impression a lieu, **Then** les étiquettes
   utilisent ce format et cette orientation, et le code reste carré et
   scannable dans les deux orientations

---

### Edge Cases

- **Contenu vide ou uniquement espaces** : rejeté ; aucune impression.
- **Espaces de début/fin** : ignorés (le contenu imprimé est nettoyé) ; les
  espaces internes sont conservés.
- **Majuscules et minuscules** : conservées telles que saisies (le code est
  sensible à la casse).
- **Contenu exactement à 200 caractères** : accepté s'il tient sur le format
  sélectionné ; au-delà, rejeté.
- **Contenu pile à la limite de place du support** : imprimé si la taille
  minimale de module reste scannable.
- **Contenu très court** : le code reste carré et centré, sans étirement.
- **Légende vide ou uniquement espaces** : aucune légende imprimée ; le code
  reste centré sur le support.
- **Légende de 60 caractères** : acceptée si elle tient sur le support ;
  au-delà, rejetée.
- **Légende très longue pour le support** : rejetée plutôt que tronquée ou
  débordante.
- **Légende contenant des caractères spéciaux ASCII** (`^`, `~`, `_`) :
  imprimée littéralement, sans perte ni interprétation.
- **Quantité exactement 2** : aucune confirmation.
- **Quantité supérieure à 2** : confirmation obligatoire ; annulation sans
  impression.
- **Imprimante injoignable ou erreur serveur** : message explicite ; l'échec
  n'est jamais silencieux et le contenu saisi reste affiché.
- **Double validation rapide** : une seule impression est lancée ; la seconde
  est refusée avec un message indiquant qu'une impression est déjà en cours.
- **Changement de format entre deux impressions** : le code se redimensionne
  sans être tronqué ni déformé.
- **Aucun format papier configuré** : le format par défaut de l'application
  s'applique.
- **Orientation pivotée** : le code reste carré, centré et scannable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST proposer le module **Data Matrix** dans la galerie et
  la navigation de l'application, aux côtés des modules existants, avec un nom
  et une description clairs.
- **FR-002**: Le module MUST proposer un champ de saisie du **contenu**, un
  champ **légende** facultatif et un champ **quantité**.
- **FR-003**: System MUST accepter tout contenu de 1 à 200 caractères **ASCII
  imprimables** (espaces internes compris), la casse étant conservée ; les
  espaces de début et de fin sont ignorés.
- **FR-004**: System MUST refuser, avec un message explicite et sans aucune
  impression, un contenu vide, uniquement composé d'espaces, contenant des
  caractères non imprimables (accents, emoji, caractères de contrôle) ou
  dépassant 200 caractères.
- **FR-005**: System MUST refuser, avec un message invitant à raccourcir le
  contenu ou à changer de format, un contenu qui ne tient pas sur le format de
  papier sélectionné à une taille de module scannable.
- **FR-006**: System MUST accepter une légende facultative de 0 à 60
  caractères **ASCII imprimables** (espaces internes compris), la casse étant
  conservée ; les espaces de début et de fin sont ignorés et une légende vide
  n'imprime aucun texte.
- **FR-007**: System MUST refuser, avec un message explicite et sans aucune
  impression, une légende contenant des caractères non imprimables, dépassant
  60 caractères ou ne tenant pas sur le format sélectionné ; la légende n'est
  jamais tronquée silencieusement.
- **FR-008**: System MUST exiger une quantité entière comprise entre 1 et
  1000 et refuser toute autre valeur avec un message clair.
- **FR-009**: System MUST demander une confirmation explicite lorsque la
  quantité dépasse 2 étiquettes ; une annulation ne doit produire aucune
  impression.
- **FR-010**: System MUST imprimer exactement la quantité demandée
  d'étiquettes identiques, chacune portant un **code Data Matrix** carré,
  scannable, restituant exactement le contenu saisi, et la légende en clair
  lorsqu'elle est renseignée.
- **FR-011**: System MUST centrer le code Data Matrix sur le support, sans
  l'étirer (symbole carré, module scannable), et placer la légende de façon
  centrée et lisible sous le code, ou à côté en orientation pivotée.
- **FR-012**: System MUST appliquer le format de papier, l'orientation et
  l'imprimante choisis dans les Paramètres partagés.
- **FR-013**: System MUST bloquer l'impression, sans aucun envoi, lorsqu'aucune
  imprimante n'est sélectionnée, avec un message invitant à en choisir une.
- **FR-014**: System MUST signaler toute erreur d'impression (imprimante
  injoignable, erreur serveur) par un message explicite, sans échec silencieux.
- **FR-015**: System MUST n'autoriser qu'une seule impression en cours à la
  fois ; une soumission simultanée est refusée avec un message dédié.
- **FR-016**: System MUST référencer le module dans les modules récents après
  son utilisation, comme les modules existants.

### Key Entities *(include if data involved)*

- **Contenu d'étiquette** : chaîne de 1 à 200 caractères ASCII imprimables,
  casse conservée, espaces de début/fin ignorés.
- **Légende** : chaîne facultative de 0 à 60 caractères ASCII imprimables,
  casse conservée, espaces de début/fin ignorés ; vide = aucun texte.
- **Impression Data Matrix** : contenu nettoyé, légende nettoyée et quantité
  d'étiquettes demandée.
- **Réglages d'impression** (partagés, existants) : format de papier,
  orientation, imprimante sélectionnée.
- **Module** : identifiant, nom, description, chemin d'accès — enregistré dans
  la galerie et les modules récents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur un échantillon de contenus alphanumériques variés (courts,
  longs, avec espaces internes et caractères spéciaux ASCII), 100 % des codes
  Data Matrix imprimés sont scannés et restituent exactement le contenu saisi.
- **SC-002**: Une impression d'une étiquette aboutit en moins de 10 secondes
  sur le réseau local, sans manipulation supplémentaire.
- **SC-003**: 100 % des contenus ou légendes invalides (vide, accentué, plus
  de 200 ou 60 caractères, trop long pour le support) sont refusés sans
  qu'aucune étiquette ne soit produite.
- **SC-004**: Sur 10 impressions de quantités allant de 1 à 50, le nombre
  d'étiquettes produites est exactement la quantité confirmée.
- **SC-005**: Un utilisateur familier réalise une impression complète
  (ouverture du module, saisie, validation) en moins d'une minute, sans
  documentation.
- **SC-006**: Sur un échantillon de légendes courtes et longues, 100 % sont
  imprimées en entier, centrées et lisibles, dans les deux orientations.

## Assumptions

- Application web locale mono-utilisateur, imprimante thermique ZPL sur le
  réseau local : contexte et réglages existants réutilisés tels quels.
- Symbologie **Data Matrix ECC200**, norme standard des codes 2D industriels ;
  la taille du symbole (nombre de modules) est déterminée automatiquement par
  le contenu.
- Un seul contenu par impression : ni plage, ni séquence automatique, ni
  import de fichier (non demandés).
- Seuls les caractères ASCII imprimables sont pris en charge ; les accents et
  l'Unicode sont hors périmètre (cohérence avec le module Code 128 et limite
  d'encodage retenue pour la v1).
- La limite de 200 caractères couvre les usages courants tout en restant sous
  la capacité maximale d'un symbole ECC200 ; le contrôle de tenue sur le
  support reste la contrainte réelle pour les petits formats.
- La légende est **facultative** et limitée à 60 caractères : c'est un texte
  d'identification lisible, pas une seconde donnée encodée. Le contenu reste
  visible dans l'interface avant impression.
- La confirmation au-delà de 2 étiquettes, le garde-fou « aucune imprimante »
  et la gestion des réglages reprennent le comportement des modules existants.
- Le contrôle « tient sur le support » s'appuie sur les formats de papier et la
  résolution déjà configurés dans l'application.
- Le module est un ajout non destructif : les modules EAN-13, Emplacement et
  Code 128 restent inchangés dans leur comportement.
