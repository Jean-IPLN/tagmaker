# Feature Specification: Module Emplacement — code-barres Code 128

**Feature Branch**: `009-module-emplacement`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "nouveau modules : module emplacement il sert à créé le code bare d'un emplacement le code-bare est en code-128 et nos emplacement remplissent toujour cette nomenclature : /^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$/ dans le module il faudra pouvoir selectionner si on veut imprimer 1 emplacement ou si on veut imprimer une plage d'emplacement on utilise un Switch de shadcn pour passer d'un mode à l'autre ; et un autre switch pour passer du type emplacement classique ou dynamique (emplacement dynamique avec #D)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Imprimer le code-barres d'un seul emplacement (Priority: P1)

Un utilisateur du module **Emplacement** choisit le type d'emplacement avec un
interrupteur (**Classique** ou **Dynamique `#D`**), saisit un code conforme à
ce type (par exemple `1A5B` en classique, ou `1#D7` en dynamique), choisit une
quantité et imprime : l'imprimante produit des étiquettes portant un
**code-barres Code 128** scannable du code, avec le code affiché en clair sous
les barres, centré et dimensionné selon le format de papier sélectionné,
exactement comme pour le module EAN-13.

**Why this priority**: C'est le cœur du module — imprimer le code-barres d'un
emplacement concret. Le type dynamique couvre les emplacements volants/à
affectation secondaire (notés `#D`), une réalité logistique courante.

**Independent Test**: Imprimer `2A1Z` en mode Classique puis `1#D7` en mode
Dynamique sur un format de papier quelconque, puis scanner chaque étiquette :
chaque code est reconnu et correspond à l'emplacement saisi.

**Acceptance Scenarios**:

1. **Given** le type Classique sélectionné, **When** l'utilisateur imprime
   `1A5B`, **Then** une étiquette porte un code-barres Code 128 scannable
   contenant exactement `1A5B`
2. **Given** le type Dynamique sélectionné, **When** l'utilisateur imprime
   `2#D3`, **Then** une étiquette porte un code-barres scannable contenant
   exactement `2#D3`
3. **Given** le type Classique sélectionné et un code dynamique saisi (ex.
   `1#D5`), **When** l'utilisateur tente d'imprimer, **Then** l'impression est
   refusée (type incohérent)
4. **Given** une quantité choisie, **When** l'impression a lieu, **Then** le
   nombre d'étiquettes demandé est produit, chaque étiquette portant le même
   code-barres centré
5. **Given** une étiquette imprimée, **When** on regarde le code-barres,
   **Then** le code de l'emplacement est affiché en clair sous les barres

---

### User Story 2 - Imprimer une plage d'emplacements (Priority: P1)

L'utilisateur bascule sur le mode **Plage** avec un interrupteur, saisit un
emplacement de début et un emplacement de fin de même type (ex. `1A10` → `1A15`
en classique, ou `2#D0` → `2#D9` en dynamique) et imprime : l'imprimante
produit **une étiquette par emplacement** de la plage, chaque étiquette portant
le code-barres de son propre emplacement.

**Why this priority**: Équiper une zone entière (un couloir, un module de
racks, un quai) en une seule opération est un besoin à fort gain de temps ;
sans plage, il faudrait relancer une impression par emplacement.

**Independent Test**: Imprimer la plage `1A10` → `1A12` : exactement 3
étiquettes sont produites (`1A10`, `1A11`, `1A12`), chacune scannable avec son
propre code.

**Acceptance Scenarios**:

1. **Given** le mode Plage et le type Classique, **When** l'utilisateur imprime
   la plage `1A10` → `1A12`, **Then** 3 étiquettes sont produits avec les
   codes-barres `1A10`, `1A11` et `1A12`
2. **Given** le mode Plage et le type Dynamique, **When** l'utilisateur imprime
   la plage `1#D0` → `1#D9`, **Then** 10 étiquettes sont produites, une par
   code de la plage
3. **Given** une plage dont le début est après la fin (ex. `1A15` → `1A10`),
   **When** l'utilisateur tente d'imprimer, **Then** l'impression est refusée
   avec un message clair
4. **Given** une plage dont les bornes sont de zones ou de types différents
   (ex. `1A10` → `2A10`, ou `1A10` → `1#D5`), **When** l'utilisateur tente
   d'imprimer, **Then** l'impression est refusée avec un message clair
5. **Given** une plage générant plus de 1000 étiquettes, **When** l'utilisateur
   tente d'imprimer, **Then** l'impression est refusée (borne partagée avec la
   quantité)
6. **Given** une plage validée, **When** l'impression a lieu, **Then** chaque
   étiquette est centrée et dimensionnée selon le format de papier sélectionné

---

### User Story 3 - Rejet des emplacements non conformes (Priority: P2)

L'utilisateur saisit un code qui ne respecte pas la nomenclature (par exemple
`X1` trop court, `1a5b` en minuscules, `0A12` commençant par 0, `1A00` avec 0
en deuxième position du groupe lettre) ou incohérent avec le type sélectionné :
l'application refuse l'impression et affiche un message d'erreur clair, sans
rien imprimer ni soumettre à l'imprimante.

**Why this priority**: Les emplacements suivent **toujours** la nomenclature —
un code hors norme ne doit jamais produire d'étiquette (une étiquette erronée
posée en rayon serait source d'erreurs logistiques). Garde-fou indispensable
dès la v1.

**Independent Test**: Saisir `1a5b` ou `0B25`, ou un code dynamique en mode
Classique, puis lancer l'impression : refus avec message explicatif et aucune
requête vers l'imprimante.

**Acceptance Scenarios**:

1. **Given** un code hors nomenclature (ex. `X1` trop court), **When**
   l'utilisateur tente d'imprimer, **Then** l'impression est refusée avec un
   message clair et aucune étiquette n'est produite
2. **Given** un code avec caractères interdits (minuscules, symboles hors `#`,
   espace), **When** l'utilisateur tente d'imprimer, **Then** le code est
   rejeté avec le même message de format attendu
3. **Given** un code à la structure invalide (mauvais premier caractère,
   combinaison interdite), **When** l'utilisateur tente d'imprimer, **Then** le
   code est rejeté et aucune impression n'est déclenchée
4. **Given** un code valide mais incohérent avec le type sélectionné (ex. code
   contenant `#D` en mode Classique), **When** l'utilisateur tente d'imprimer,
   **Then** l'impression est refusée avec un message orientant vers le bon type

---

### User Story 4 - Réglages partagés et confort de saisie (Priority: P3)

L'utilisateur retrouve dans le module Emplacement les mêmes réglages que
partout ailleurs : format de papier et imprimante issus des Paramètres,
confirmation explicite en cas de grande quantité (mode Un seul), et bascule
entre les modes et types par des interrupteurs clairs.

**Why this priority**: La cohérence avec le module EAN-13 et la réutilisation
des réglages existants garantissent une expérience homogène sans duplication.

**Independent Test**: Changer le format de papier dans les Paramètres puis
imprimer une plage : les étiquettes utilisent le nouveau format et partent vers
l'imprimante sélectionnée.

**Acceptance Scenarios**:

1. **Given** un format de papier sélectionné dans les Paramètres, **When** un
   emplacement ou une plage est imprimé, **Then** les étiquettes utilisent ce
   format
2. **Given** une imprimante sélectionnée dans les Paramètres, **When**
   l'impression a lieu, **Then** l'impression part vers cette imprimante
3. **Given** le mode Un seul et une quantité > 1, **When** l'impression a lieu,
   **Then** autant d'étiquettes identiques sont produites, borné à 1000, avec
   la même confirmation que le module EAN-13
4. **Given** le mode Plage, **When** l'utilisateur voit le formulaire, **Then**
   le choix de quantité n'apparaît pas (le nombre d'étiquettes est
   déterminé par la plage)

---

### Edge Cases

- **Code vide** : rejeté avec un message explicitant que le code emplacement
  est requis ; aucune impression.
- **Code trop court ou trop long** (≠ 4 caractères) : rejeté (nomenclature
  exactement 4 caractères).
- **Premier caractère hors `1`/`2`** (ex. `3B25`, `0A50`) : rejeté.
- **Minuscules, accents, espaces, symboles hors `#`** : rejetés ; seul `#D`
  est toléré en 2ᵉ-3ᵉ position, et `0` n'est pas accepté en 2ᵉ position du
  groupe lettre.
- **Type incohérent** : code contenant `#D` saisi en mode Classique, ou code
  lettre-groupe saisi en mode Dynamique → rejeté avec message orientant vers
  le bon type.
- **Plage début > fin** (ex. `1A15` → `1A10`) : rejetée.
- **Plage de zones ou de types différents** (ex. `1A10` → `2A10`, ou `1A10` →
  `1#D5`) : rejetée.
- **Plage trop grande** (> 1000 étiquettes) : rejetée.
- **Borne haute de fin de plage** : sur chaque axe (espace `A-Z`, position
  `1-9` puis `A-Z`, sous-position `0-9` puis `A-Z`) le caractère de fin doit
  suivre celui du début — ex. `1A19` → `1A1B` (sous-position `B`) est valide et
  traverse `1A1A` ; `1A1B` → `1A21` est refusé (sous-position `B` > `1`). Une
  plage peut traverser les groupes : `1A10` → `1B10` génère 2 codes, `1A10` →
  `1A21` en génère 4 (la « boîte » bornée par les extrêmes : pour chaque groupe,
  les sous-positions du début à la fin).
- **Forme `#D`** : un emplacement type `1#D7` est valide et imprimable ; le
  caractère `#` fait partie de la nomenclature et du code-barres.
- **Emplacement `1A90`** : valide — le `0` final est autorisé.
- **Changement de format entre deux impressions** : le code-barres se
  redimensionne (plus grand sur un format plus grand, jamais tronqué).
- **Imprimante indisponible** : message d'erreur de l'application inchangé ;
  aucune étiquette n'est produite.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST proposer le module **Emplacement** dans la
  navigation de l'application, aux côtés du module EAN-13, avec un nom et une
  description clairs.
- **FR-002**: System MUST permettre de basculer entre deux modes d'édition —
  **Un seul** emplacement et **Plage** d'emplacements — via un interrupteur
  dédié et clairement libellé.
- **FR-003**: System MUST permettre de basculer entre deux types d'emplacement
  — **Classique** (groupe `lettre + 1-9/A-Z`) et **Dynamique `#D`** (littéral
  `#D`) — via un interrupteur dédié et clairement libellé.
- **FR-004**: En mode **Un seul**, Users MUST pouvoir saisir un code de 4
  caractères conforme à la nomenclature ; en mode **Plage**, users MUST pouvoir
  saisir un emplacement de **début** et un emplacement de **fin** de même type.
- **FR-005**: System MUST valider tout code saisi contre la nomenclature
  `^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$` — exactement 4 caractères, premier
  caractère `1` ou `2`, puis soit une lettre `A-Z` suivie d'un caractère
  `1-9`/`A-Z`, soit le littéral `#D`, et un dernier caractère `0-9`/`A-Z`.
- **FR-006**: En mode Plage, System MUST valider la cohérence des bornes via
  la **boîte** : même zone (premier caractère), ordre non décroissant sur
  chaque axe (espace, position, sous-position), taille de plage = produit des
  écarts + 1 ≤ 1000 étiquettes.
- **FR-007**: System MUST rejeter tout code ou plage non conforme avec un
  message d'erreur clair (nomenclature, type ou plage), et MUST NOT déclencher
  d'impression.
- **FR-008**: System MUST produire des étiquettes portant un **code-barres
  Code 128** représentant exactement le code de l'emplacement — un code par
  étiquette en mode Un seul (copies par quantité), un code différent par
  étiquette en mode Plage (un étiquette par emplacement de la plage).
- **FR-009**: System MUST afficher le code de l'emplacement en clair sous les
  barres (ligne lisible), comme pour le module EAN-13.
- **FR-010**: System MUST positionner chaque code-barres au centre de
  l'étiquette (marges égales à l'arrondi près) et le dimensionner au maximum
  scannable du format de papier sélectionné, de façon cohérente avec le module
  EAN-13.
- **FR-011**: En mode Un seul, System MUST appliquer la quantité (1 à 1000,
  confirmation explicite en cas de grande quantité) en produisant des
  étiquettes identiques et centrées ; en mode Plage, la quantité n'est pas
  proposée et le nombre d'étiquettes est déterminé par la plage.
- **FR-012**: System MUST utiliser le format de papier et l'adresse
  d'imprimante issus des réglages partagés de l'application (aucune
  configuration spécifique au module).
- **FR-013**: System MUST conserver le comportement et la validation du module
  EAN-13 et des autres modules inchangés (0 régression).

### Key Entities

- **Emplacement** : emplacement physique identifié par un code de 4 caractères
  conforme à la nomenclature (ex. `1A5B`, `2#D3`, `1B90`). Caractérisé par son
  **type** — Classique (`[A-Z][1-9A-Z]`) ou Dynamique (`#D`). Donnée saisie,
  validée et encodée dans le code-barres.
- **Mode d'édition** : **Un seul** (un code + quantité) ou **Plage** (borne
  début et fin de même type → une étiquette par code). Détermine l'ensemble
  des codes à imprimer.
- **Plage d'emplacements** : séquence de codes générée par la **boîte** bornée
  par les extrêmes — sur chaque axe (espace `A-Z`, position `1-9` puis `A-Z`,
  sous-position `0-9` puis `A-Z`), les caractères entre le début et la fin sont
  combinés dans l'ordre (ex. `1A10` → `1A21` = `1A10`, `1A11`, `1A20`, `1A21` ;
  `1#D0` → `1#D9` = les 10 sous-positions).
- **Étiquette Emplacement** : support imprimé portant le code-barres Code 128
  et la ligne lisible ; dimensions selon le format de papier sélectionné,
  code-barres centré et dimensionné selon l'espace utile.
- **Réglages d'impression** : format de papier, adresse d'imprimante —
  portés par l'application (features 006/007), réutilisés sans changement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des impressions (Un seul et Plage) produisent des
  étiquettes dont le code-barres Code 128 est reconnu au scanner et correspond
  exactement au code affiché.
- **SC-002**: 100 % des codes ou plages hors normes (nomenclature, type,
  cohérence de bornes, taille) sont rejetés avant toute action d'impression,
  avec un message expliquant le problème.
- **SC-003**: En mode Plage, le nombre d'étiquettes imprimées est exactement
  le nombre de codes de la plage, chaque étiquette portant son propre code
  (aucune duplication ni omission).
- **SC-004**: Pour chaque format de papier de la liste, chaque étiquette est
  imprimée avec un code-barres centré (marges égales à l'arrondi près)
  occupant l'essentiel de l'espace scannable — sans troncature ni bord
  illisible.
- **SC-005**: Les deux types (Classique et `#D`) sont imprimables et scannables
  dans les deux modes (Un seul et Plage).
- **SC-006**: Le module EAN-13 et les réglages existants fonctionnent sans
  régression (suite de tests inchangée et verte), et aucun réglage spécifique
  n'a été ajouté au module.

## Assumptions

- Le module Emplacement suit les **mêmes conventions d'architecture que le
  module EAN-13** : validation partagée client et serveur, génération du flux
  d'impression en fonction pure testée, point d'entrée serveur dédié,
  formulaire dédié, entrée enregistrée dans la navigation. Évolution par
  **addition non destructive** (constitution, VI).
- « **Code 128** » désigne la symbologie code-barres Code 128 standard, capable
  de porter l'ensemble des caractères de la nomenclature (chiffres, lettres
  majuscules, `#`) ; la ligne lisible est incluse (comportement d'impression
  par défaut).
- **Sémantique de plage** : borne début et fin de même type et de **même zone**,
  la plage générant la **boîte** bornée par les extrêmes (chaque axe parcourt
  son ordre : espace `A-Z`, position `1-9` puis `A-Z`, sous-position `0-9` puis
  `A-Z`). Un début après la fin sur l'un des axes, ou des bornes de zones ou de
  types différents, est une plage invalide.
- En mode **Plage**, la quantité est absente : le nombre d'étiquettes EST le
  nombre de codes de la plage, borné à 1000 (limite partagée avec la quantité).
- Le **centrage et le dimensionnement** suivent la convention du feature 008
  (centré, pleine échelle scannable) — comportement cohérent entre modules.
- Les interrupteurs de mode et de type sont rendus avec le composant
  d'interface standard du projet (Switch), chacun libellé clairement ;
  le réglage choisi n'est pas mémorisé au-delà de la session de formulaire
  (défaut : mode Un seul, type Classique à l'ouverture).
- **Aucune prévisualisation écran** n'est ajoutée (YAGNI), comme pour le
  module EAN-13.
- Les **réglages papier/imprimante** réutilisent les mécanismes existants
  (features 006/007) ; aucun nouveau réglage.
- La nomenclature fournie est la **source de vérité** : aucune tolérance
  d'assouplissement (majuscules obligatoires, longueur de 4 exacte, caractères
  exacts).