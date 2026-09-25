# Modèle de données — Module Emplacement, Code 128 (Feature 009)

Aucune entité persistante : le module est un **calcul à la volée**
(validation → flux ZPL → envoi), sans base de données. Ce document décrit les
**types**, **contraintes** et **invariants** manipulés, ainsi que les const
antes du layout Code 128.

## Types métier

| Type | Définition | Rôle |
|------|------------|------|
| `CodeEmplacement` | chaîne de **4 caractères** conforme à la nomenclature | étiquette à imprimer |
| `TypeEmplacement` | `"classic"` \| `"dynamic"` | type lettre ou `#D` |
| `ModeImpression` | `"single"` \| `"range"` | une étiquette ×N ou une étiquette par code |
| `LocationRequest` | union discriminée sur `mode` (voir contrat API) | requête validée de la route |
| `LocationCodes` | `string[]` de codes calculés (expansion de plage ou `[code]`) | entrée du build ZPL |

## Contraintes de la nomenclature (source de vérité)

Regex combinée : `^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$` — **exactement 4 caractères**.

| Contrainte | Règle | Exemples |
|------------|-------|----------|
| `code[0]` | ∈ `{1, 2}` | `1A5B`, `2B9C`, `1#D7` |
| type **Classique** | `^[12][A-Z][1-9A-Z][0-9A-Z]$` — le `0` est **interdit** en position 2-3 du groupe lettre | `1A10` valide ; `1A05` invalide |
| type **Dynamique** | `^[12]#D[0-9A-Z]$` | `1#D7`, `2#DZ` |
| dernier caractère | ∈ `{0-9, A-Z}` (`0` final autorisé) | `1A90` valide |

Un code valide au sens global mais **incohérent avec le type sélectionné** est
refusé (message orientant vers l'autre type) — règles FR-005 / FR-007.

## Ordre de variation des axes

```
ORDRE_LAST   = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"   // sous-position, rang 0..35
POSITION_IDS = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"    // position, rang 0..34
ESPACE_IDS   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"             // espace, rang 0..25
```

La plage génère la **boîte** bornée par ses extrêmes : sur chaque axe (espace,
position, sous-position), les caractères parcourent leur ordre entre le début
et la fin (ASCII croissant), tous les axes étant combinés (espace → position →
sous-position).

## Plage — règles

- Les bornes partagent la **même zone** (`1`/`2`, premier caractère) ; sinon
  rejet (FR-006, message explicite).
- Les bornes doivent être valides pour le **type sélectionné** (Classique :
  trois axes variables ; Dynamique : seuls l'espace `#` et la position `D`
  sont fixes, la variation porte sur la sous-position).
- Sur **chaque axe**, `rang(début) ≤ rang(fin)` ; sinon ordre inversé → rejet
  (ex. `1A19` → `1A21` : sous-position `9` > `1` → rejet).
- Taille = produit des `rang(fin) − rang(début) + 1` par axe, **bornée à 1000** ;
  sinon rejet.

- **Expansion** (fonction pure) : combinaison des caractères de chaque axe
  entre les extrêmes, dans l'ordre espace → position → sous-position (ex.
  `1A10` → `1A21` = `1A10`, `1A11`, `1A20`, `1A21`).
- La **quantité** n'existe qu'en mode **Un seul** (1 … 1000) ; en mode Plage,
  le nombre d'étiquettes = taille de la plage (la quantité reste masquée à
  l'affichage).

Exemples :
- `1A10` → `1A1B` : espace `A` (×1), position `1` (×1), sous-positions `0..B`
  → 12 codes générés ;
- `1A10` → `1A21` : position `1..2` (×2) × sous-positions `0..1` (×2) →
  **4 codes** (`1A10`, `1A11`, `1A20`, `1A21`) ;
- `1B10` → `1D45` : espaces `B..D` (×3) × positions `1..4` (×4) ×
  sous-positions `0..5` (×6) → 72 codes (sur chaque groupe, les
  sous-positions `0..5`, ex. `1B10–1B15`, `1B20–1B25`… puis `1C…`, `1D…45`) ;
- `1A19` → `1A21` : sous-position `9` > `1` → **rejet** (ordre par axe).

## Constantes du layout Code 128 (ZPL, 203 dpi)

| Constante | Valeur | Sens |
|-----------|-------:|------|
| `CHAR_MODULES` | 11 | largeur d'un caractère de données (3 barres + 3 espaces) |
| `CODE_128_BASE_MODULES` | 35 | départ (11) + clé mod 103 (11) + arrêt (13) |
| `SYMBOL_MODULES` | `11×len + 35` (= 79 pour 4 caractères) | largeur du symbole |
| `QUIET_MODULES` | 20 | zones de silence (10 + 10) |
| `TOTAL_MODULES` | `SYMBOL_MODULES + 20` (= 99) | largeur de référence pixel |
| `MIN_MODULE_WIDTH` | 2 dots | X min Code 128 (0.25 mm @203 dpi) |
| `MAX_MODULE_WIDTH` | 8 dots | X max Code 128 (1.0 mm) |
| `TEXT_HEIGHT_DOTS` | 25 | bande ligne lisible (~3.08 mm) |
| `TARGET_HEIGHT_COVERAGE` | 0.9 | bloc = 90 % de la hauteur (convention 008) |
| `MIN_BAR_HEIGHT_DOTS` | 51 | plancher scannabilité code-barres (0.25″) |

## Invariants de calcul (vérifiés par test sur les 4 formats)

```
moduleWidth = clamp(floor(widthDots / TOTAL_MODULES), MIN, MAX)
barsWidth   = SYMBOL_MODULES × moduleWidth
x           = round((widthDots − barsWidth) / 2)
blockHeight = round(0.9 × heightDots)
barHeight   = max(blockHeight − TEXT_HEIGHT_DOTS, MIN_BAR_HEIGHT_DOTS)
y           = round((heightDots − blockHeight) / 2)
```

1. `x ≥ 10 × moduleWidth` **et** `widthDots − x − barsWidth ≥ 10 × moduleWidth`
   → zones de silence honorées (garanties par `TOTAL_MODULES`) ;
2. `x + barsWidth ≤ widthDots` → symbole jamais coupé ;
3. `barHeight ≥ 51` → scannable ;
4. `blockHeight / heightDots = 0.9` → pleine échelle, marges haut/bas = 5 % ;
5. `blockHeight ≤ heightDots` → texte lisible jamais coupé.

## Flux de données (résolution serveur → ZPL)

```text
request (single)          request (range)
   │  code + quantity         │  startCode + endCode
   ▼                          ▼
validation Zod (union)  →  expansion de plage (pure) → LocationCodes
   │
buildLocationZpl({ codes, quantity?, widthDots, heightDots })   // pure
   │
flux ZPL ^XA…^XZ (1 bloc/code ; mode single : ^PQ quantité)  →  sendToPrinter(zpl, target)
```

Chaque code distinct = **un bloc `^XA…^XZ`** (la répétition `^PQ` ne servant
qu'à dupliquer un code unique). Aucun stockage, aucun changement `.env`.