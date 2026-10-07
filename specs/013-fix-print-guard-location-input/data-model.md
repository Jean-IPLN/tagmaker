# Data Model — 013-fix-print-guard-location-input

**Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Aucune nouvelle donnée persistée : le modèle décrit les représentations en
mémoire et leurs règles. Les entités existantes sont inchangées au-delà du
périmètre indiqué.

## Entités

### PrintSettings (existant — inchangé, hors périmètre)

| Champ | Type | Règle |
|-------|------|-------|
| `paperId` | chaîne optionnelle | format de papier choisi |
| `printerAddress` | chaîne optionnelle | adresse de l'imprimante choisie ; **absente = état « Non défini » = condition de blocage** |
| `rotated` | booléen optionnel | orientation pivotée (feature 012) |

- Source de vérité : cookie `tagmaker_print_settings` (mémorisation existante,
  réutilisée tels quels).
- **Transition**: aucune modification du modèle ; seul son *usage* change :
  `printerAddress` absente → toute tentative d'impression est refusée (voir
  PrintGuard).

### LocationCode — représentation UI (état des champs, feature 013)

Représentation à **4 positions fixes** d'une longueur toujours égale à 4 :
chaque position contient un caractère ou l'espace `" "` (position vide =
sentinel hors charset des codes).

| Position | Rôle | Valeurs | Éditable |
|----------|------|---------|----------|
| 1 | Zone | `1` (défaut) ou `2` | oui, via sélecteur |
| 2 | Espace / `#` (dynamique) | `A`-`Z` ou `#` | oui (saisie) ; fixe en dynamique |
| 3 | Position / `D` (dynamique) | `1`-`9`/`A`-`Z` ou `D` | oui (saisie) ; fixe en dynamique |
| 4 | Position | `0`-`9`/`A`-`Z` | oui (saisie) |

- **Amorçage**: `"1   "` (zone par défaut « 1 » réellement engagée — FR-004).
- **Invariants**:
  - `length === 4` à tout instant (état, entrées/sorties du composant).
  - L'espace ne figure jamais dans un code compacté ; `pad`/`compact` sont
    des fonctions pures du module `lib/location/code.ts`.
  - La compaction n'a lieu qu'à la frontière de validation (FR-007).
- **Transitions**:
  1. *Saisie d'une position* : la position cible prend le caractère, les
     autres sont inchangées ; émission paddée (jamais de décalage — FR-005).
  2. *Effacement* (`Backspace`) : la position visée repasse à `" "` ;
     navigation vers la position précédente conservée ; aucun décalage.
  3. *Changement de zone* (sélecteur `1`/`2`) : position 1 remplacée ;
     positions 2-4 inchangées.
  4. *Collage* : texte assaini, réparti position par position depuis la
     position cible ; positions fixes (dynamique) conservées ; borné aux
     4 positions.
  5. *Changement de type* (classique ↔ dynamique) : l'état est conservé,
     les positions 2-3 fixes s'affichent avec leurs caractères imposés ;
     la prochaine édition force `#`/`D` dans l'état (comportement actuel
     conservé).

### LocationCode — représentation domaine / API

- Chaîne compactée de 4 caractères, conforme à
  `LOCATION_REGEX` = `/^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$/`
  (`lib/location/code.ts`).
- Obtenue **une seule fois** : transformation de `locationCodeField` dans
  `lib/location/validate.ts`, utilisée par `code` (mode simple) et
  `startCode`/`endCode` (mode plage).
- Règles dérivées des exigences :

| Règle | Origine |
|-------|---------|
| exactement 4 caractères, zone `1`/`2` en tête | FR-007 |
| type classique : position 2 lettre `A`-`Z`, position 3 `1`-`9`/`A`-`Z` | validation existante |
| type dynamique : positions 2-3 = `#D` | FR-006 |
| code compacté uniquement — jamais de `" "` en sortie | FR-007 |

### RangeRow (mode plage — structure inchangée)

| Champ | Type | Règle |
|-------|------|-------|
| `id` | entier | clé de ligne |
| `startCode` | chaîne paddée (4) | défaut `"1   "` |
| `endCode` | chaîne paddée (4) | défaut `"1   "` |

- **Transition — synchro de zone (FR-008)**: toute édition d'une borne
  réapplique la zone de cette borne sur l'autre borne de la même ligne
  (`withZoneSync`/`resyncZone`, comportement existant conservé). Avec
  l'amorçage commun « 1 », la synchro est idempotente sur les éditions de
  caractères et n'agit visiblement que sur un changement de zone
  (voir research R3).

### PrintGuard (machine à états — feature 013, implicite côté formulaire)

| État / événement | Condition | Effet |
|------------------|-----------|-------|
| Tentative d'impression (clic Imprimer ou confirmation) | `printerAddress` absente | toast « Aucune imprimante sélectionnée… », **aucun envoi**, aucun changement d'état d'envoi |
| Tentative d'impression | `printerAddress` présente | flux d'envoi inchangé (validations existantes puis envoi) |
| Parcours couverts | direct (quantité ≤ 2), confirmation (quantité > 2), modes simple et plage, EAN-13 et Emplacement | identique dans les deux formulaires |

- Ordre conservé : validation de la saisie **puis** garde-fou (le garde-fou
  vit dans la couche d'envoi, après validation — scénarios 1-4 de la spec).

## Aucune autre entité

Pas de nouvel élément persisté, pas de migration, pas de changement de
contrat API (voir [contracts/print-guard.md](./contracts/print-guard.md)).
