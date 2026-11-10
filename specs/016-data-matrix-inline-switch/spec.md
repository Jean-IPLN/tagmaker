# Feature Specification: Data Matrix — commutateur d'affichage in-line

**Feature Branch**: `016-data-matrix-inline-switch`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "on vas ajouter un switch dans la creation de data matrix pour passer du mode actuel à un affichage in-line"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choisir l'affichage de la légende à la création (Priority: P1)

L'utilisateur ouvre le module **Data Matrix**, saisit un contenu, une légende
facultative et une quantité. Un commutateur **« Affichage in-line »** lui
permet de conserver le mode actuel (légende sous le code) ou de placer la
légende à droite du code, sur la même ligne. Le choix s'applique immédiatement
à l'étiquette imprimée, sans modifier le contenu encodé, la quantité ni les
réglages partagés.

**Why this priority**: C'est le besoin principal : produire des étiquettes plus
compactes ou plus lisibles selon l'usage, tout en gardant le mode actuel comme
valeur par défaut.

**Independent Test**: Imprimer `REF-2026-A17` avec la légende `Palette 42` en
quantité 1, d'abord avec le commutateur désactivé, puis activé. Les deux
étiquettes scannent exactement `REF-2026-A17` ; la première affiche la légende
sous le code, la seconde à droite du code sur la même ligne.

**Acceptance Scenarios**:

1. **Given** le module Data Matrix ouvert, **When** l'utilisateur arrive sur le
   formulaire, **Then** le commutateur « Affichage in-line » est visible,
   désactivé et clairement associé au choix du placement de la légende
2. **Given** le commutateur désactivé et une légende renseignée, **When**
   l'utilisateur imprime, **Then** l'étiquette conserve exactement la
   disposition actuelle, avec la légende sous le code
3. **Given** le commutateur activé, une légende renseignée et une orientation
   normale, **When** l'utilisateur imprime, **Then** la légende est placée à
   droite du symbole sur la même ligne, le symbole reste carré et centré, sans
   chevauchement ni troncature
4. **Given** le commutateur activé et une légende vide, **When** l'utilisateur
   imprime, **Then** l'étiquette ne contient que le code, comme avec le
   commutateur désactivé
5. **Given** une étiquette in-line imprimée, **When** on la scanne, **Then** le
   lecteur restitue exactement le contenu saisi, sans la légende

---

### User Story 2 - Refuser une disposition in-line qui ne tient pas (Priority: P2)

L'utilisateur active l'affichage in-line avec une légende ou un contenu trop
volumineux pour le format de papier sélectionné. L'application refuse
l'impression avec un message explicite, sans tronquer la légende, sans déformer
le symbole et sans envoyer d'étiquette.

**Why this priority**: Une légende coupée ou un symbole écrasé rend
l'étiquette inutilisable. Le garde-fou doit couvrir la nouvelle disposition
comme il couvre déjà le mode actuel.

**Independent Test**: Activer l'in-line sur le plus petit format, saisir une
légende longue, puis valider : l'impression est refusée avec un message
invitant à raccourcir la légende ou à changer de format. Aucune requête
d'impression réussie n'est produite.

**Acceptance Scenarios**:

1. **Given** le commutateur activé et une légende qui ne tient pas à droite du
   code sur le format sélectionné, **When** l'utilisateur valide, **Then**
   l'impression est refusée avec un message clair et aucune étiquette n'est
   produite
2. **Given** le commutateur activé et une légende qui tient, **When**
   l'utilisateur valide, **Then** la légende est imprimée en entier, sans
   troncature
3. **Given** un contenu ou une légende invalide, **When** le commutateur est
   activé ou désactivé, **Then** les règles de validation existantes
   s'appliquent de la même manière dans les deux modes
4. **Given** le commutateur activé et une quantité supérieure à 2, **When**
   l'utilisateur valide, **Then** la confirmation explicite existante
   s'affiche avant toute impression

---

### User Story 3 - Conserver les impressions et réglages existants (Priority: P3)

L'utilisateur qui n'active pas le nouveau commutateur continue d'obtenir des
étiquettes identiques à la version actuelle. Les demandes d'impression
existantes qui ne précisent pas de disposition restent valides. Les réglages
partagés de papier, d'orientation et d'imprimante continuent de s'appliquer.

**Why this priority**: L'ajout ne doit pas casser les usages existants ni
imposer une migration aux clients déjà intégrés.

**Independent Test**: Imprimer une étiquette sans activer le commutateur et
sans préciser de disposition dans la demande : le résultat est identique à
celui de la version actuelle. Vérifier ensuite que les réglages de papier,
d'orientation et d'imprimante produisent toujours les mêmes effets.

**Acceptance Scenarios**:

1. **Given** une demande d'impression qui ne précise pas la disposition,
   **When** elle est traitée, **Then** l'étiquette utilise le mode actuel
2. **Given** le commutateur désactivé, **When** l'utilisateur imprime dans les
   deux orientations, **Then** le rendu reste celui de la version actuelle
3. **Given** le commutateur activé et l'orientation pivotée active, **When**
   l'utilisateur imprime, **Then** la disposition pivotée existante est
   conservée et l'impression reste valide
4. **Given** aucun format papier particulier ou aucun réglage modifié,
   **When** l'utilisateur imprime, **Then** les réglages partagés existants
   s'appliquent sans nouvelle configuration

---

### Edge Cases

- **Légende vide ou uniquement espaces** : le commutateur n'a aucun effet
  visible ; seule l'étiquette avec code est produite.
- **Légende exactement à la limite de tenue en in-line** : acceptée si elle
  reste entière, centrée et lisible.
- **Légende dépassant la place disponible en in-line** : refusée, jamais
  tronquée ; le contenu saisi reste affiché.
- **Contenu très court ou très long** : le symbole reste carré et scannable
  dans les deux dispositions.
- **Caractères spéciaux ASCII** (`^`, `~`, `_`) : imprimés littéralement dans
  le contenu et la légende, comme aujourd'hui.
- **Quantité exactement 2** : aucune confirmation ; **quantité supérieure à 2** :
  confirmation obligatoire, identique dans les deux modes.
- **Changement de format ou d'orientation entre deux impressions** : la
  disposition in-line se recalcule sans débordement ni déformation.
- **Aucune imprimante sélectionnée** : impression bloquée avec le message
  existant, quel que soit le mode choisi.
- **Double validation rapide** : une seule impression est lancée, comme
  aujourd'hui.
- **Orientation pivotée avec in-line activé** : la disposition pivotée actuelle
  reste la référence ; le commutateur ne produit ni chevauchement ni erreur.
- **Demande d'impression sans choix de disposition** : traitée comme le mode
  actuel, sans erreur.
- **Valeur de disposition inconnue** : la demande est refusée avec un message
  explicite, sans interprétation silencieuse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le module Data Matrix MUST afficher un commutateur nommé
  **« Affichage in-line »**, désactivé par défaut, avec une aide décrivant le
  placement de la légende.
- **FR-002**: Le commutateur MUST être utilisable au clavier et exposer son
  état activé/désactivé aux technologies d'assistance.
- **FR-003**: Lorsque le commutateur est désactivé, le système MUST produire
  exactement la disposition actuelle : légende sous le code en orientation
  normale, disposition pivotée existante sinon.
- **FR-004**: Lorsque le commutateur est activé et que l'orientation est
  normale, le système MUST placer la légende à droite du symbole sur la même
  ligne, en gardant le symbole carré, centré et scannable.
- **FR-005**: Lorsque la légende est vide, le système MUST produire la même
  étiquette avec le commutateur activé ou désactivé : code seul, sans texte.
- **FR-006**: Le système MUST refuser, avec un message explicite et sans
  impression, une disposition in-line dont le symbole ou la légende ne tient
  pas sur le format sélectionné ; la légende n'est jamais tronquée.
- **FR-007**: Le système MUST conserver les règles existantes de contenu
  (1–200 caractères ASCII imprimables) et de légende (0–60 caractères ASCII
  imprimables) dans les deux dispositions.
- **FR-008**: Le système MUST conserver la confirmation au-delà de 2 étiquettes,
  le blocage sans imprimante, le verrou d'impression et les messages d'erreur
  existants dans les deux dispositions.
- **FR-009**: Le système MUST appliquer les réglages partagés de format papier,
  d'orientation et d'imprimante dans les deux dispositions.
- **FR-010**: Le système MUST transmettre le choix de disposition lors de la
  demande d'impression et l'appliquer côté traitement, sans faire confiance
  uniquement à l'interface.
- **FR-011**: Une demande d'impression sans choix de disposition MUST être
  traitée comme le mode actuel ; une valeur inconnue MUST être refusée avec un
  message explicite.
- **FR-012**: Le contenu encodé MUST rester identique dans les deux
  dispositions ; la légende n'est jamais encodée dans le code.
- **FR-013**: Le choix de disposition MUST être propre à l'impression en cours
  et ne MUST pas modifier les réglages partagés persistés.
- **FR-014**: Le système MUST préserver la possibilité d'imprimer une quantité
  et une légende identiques avec le mode actuel sans aucune régression visible.

### Key Entities *(include if data involved)*

- **Demande d'impression Data Matrix** : contenu, légende facultative, quantité
  et choix de disposition.
- **Choix de disposition** : mode actuel (légende sous le code) ou in-line
  (légende à droite du code en orientation normale).
- **Étiquette Data Matrix** : symbole carré encodant le contenu, légende en
  clair éventuelle, placement déterminé par la disposition et le format.
- **Réglages d'impression partagés** : format de papier, orientation et
  imprimante sélectionnée, inchangés par cette fonctionnalité.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur un échantillon de contenus variés imprimés en in-line, 100 %
  des codes scannés restituent exactement le contenu saisi.
- **SC-002**: Sur 10 impressions avec le commutateur désactivé, 100 % des
  étiquettes conservent la disposition actuelle, sans régression visible.
- **SC-003**: 100 % des légendes qui ne tiennent pas en in-line sont refusées
  sans étiquette produite et sans troncature.
- **SC-004**: Un utilisateur familier active ou désactive la disposition et
  lance une impression en moins d'une minute, sans documentation.
- **SC-005**: Les impressions existantes qui ne précisent pas de disposition
  continuent de réussir dans 100 % des cas testés.
- **SC-006**: Les réglages de papier, d'orientation et d'imprimante produisent
  les mêmes résultats qu'avant la fonctionnalité dans 100 % des scénarios de
  non-régression.
- **SC-007**: Le commutateur est utilisable au clavier et son état est annoncé
  correctement par un lecteur d'écran lors des contrôles d'accessibilité.

## Assumptions

- **In-line** signifie : légende imprimée à droite du symbole, sur la même
  ligne, lorsque l'orientation normale est active.
- En orientation pivotée, la disposition actuelle de la légende le long du
  code est conservée ; le commutateur ne modifie pas ce rendu.
- Le commutateur est désactivé par défaut et son état n'est pas mémorisé entre
  deux visites : il s'applique à l'impression en cours.
- Aucun aperçu visuel temps réel n'est ajouté ; le besoin porte sur le choix de
  disposition et le rendu imprimé.
- Les limites de contenu et de légende, les formats papier, les règles de
  quantité et les garde-fous d'impression existants restent inchangés.
- Le choix de disposition est additif : les demandes existantes qui ne le
  précisent pas continuent de fonctionner sans modification.
- La fonctionnalité se limite au module Data Matrix ; les autres modules et
  leurs dispositions ne sont pas modifiés.
