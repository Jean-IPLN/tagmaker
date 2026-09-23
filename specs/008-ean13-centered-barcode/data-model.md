# Modèle de données — Layout EAN-13 centré (Feature 008)

Aucune entité persistante n'est ajoutée ni modifiée : le feature est un **pur
calcul de géométrie de rendu** dans `lib/zpl/build.ts`. Ce document décrit les
**constantes** et **invariants** du modèle.

## Entrée

`buildEan13Zpl({ ean13, quantity, widthDots, heightDots })` — signature
**inchangée** (les dimensions proviennent déjà de `ZPL_PAPER_SIZES` via
`resolveDimensions` dans `app/api/print/ean13/route.ts`).

## Constantes du module EAN-13 (GS1)

| Constante | Valeur | Sens |
|-----------|-------:|------|
| `DATA_MODULES` | 95 | modules du symbole (données + gardes) |
| `QUIET_LEFT_MODULES` | 11 | zone de silence minimale à gauche |
| `QUIET_RIGHT_MODULES` | 7 | zone de silence minimale à droite |
| `TOTAL_MODULES` | 113 | `95 + 11 + 7` |
| `MIN_MODULE_WIDTH` | 2 dots | X min arrondi 0.25 mm (on-demand thermique) |
| `MAX_MODULE_WIDTH` | 5 dots | X max GS1 0.66 mm @203 dpi |
| `TEXT_HEIGHT_DOTS` | 25 | bande chiffres lisibles (~3.08 mm) |
| `TARGET_HEIGHT_COVERAGE` | 0.9 | couverture cible : bloc = 90 % de la hauteur |
| `MIN_BAR_HEIGHT_DOTS` | 146 | plancher GS1 (18.28 mm @203 dpi) |

## Invariants de calcul (toujours vrais)

```
moduleWidth = clamp(floor(widthDots / TOTAL_MODULES), MIN_MODULE_WIDTH, MAX_MODULE_WIDTH)
barsWidth   = DATA_MODULES × moduleWidth
x           = round((widthDots − barsWidth) / 2)          // marge gauche = droite
blockHeight = round(TARGET_HEIGHT_COVERAGE × heightDots)  // = 90 % de la hauteur
barHeight   = max(blockHeight − TEXT_HEIGHT_DOTS, MIN_BAR_HEIGHT_DOTS)
y           = round((heightDots − blockHeight) / 2)       // marge haute = basse (= 5 %)
blocHeight  = barHeight + TEXT_HEIGHT_DOTS                // barres + chiffres
```

Invariants vérifiés sur les 4 formats de `ZPL_PAPER_SIZES` :

1. `widthDots ≥ 113 × moduleWidth` → zones de silence possibles ;
2. `x ≥ 11 × moduleWidth` **et** `x ≥ 7 × moduleWidth` → zones de silence
   latérales respectées, symbole jamais coupé ;
3. `barHeight ≥ 146` et `x + barsWidth ≤ widthDots` → aucun débordement ;
4. `blocHeight / heightDots = 0.9` → couverture exactement 90 % de la hauteur
   utile sur chaque format (SC-003), marges haut/bas égales à 5 % ;
5. `blocHeight ≤ heightDots` → bloc centré sans coupe des chiffres (FR-002).

## Contraintes transverses (inchangées)

- `^FD` = 12 premiers chiffres du `ean13` (`slice(0, 12)`) — la clé reste
  calculée par l'imprimante.
- `^PQ` = quantité (1 à 1000, borne métier partagée) — plusieurs copies
  identiques et centrées (FR-007).
- Validation EAN-13, choix du papier, réglage imprimante : hors périmètre
  (FR-008 / SC-006).

## Résolution serveur → flux

```text
route.ts  resolveDimensions(paperId)  →  widthDots, heightDots
      │
buildEan13Zpl({ ean13, quantity, widthDots, heightDots })
      │                                            (calcul PURE, sans I/O)
      ▼
flux ZPL ^XA … ^XZ  →  sendToPrinter(zpl, target)
```

Aucun stockage, aucune base de données, aucun changement de schéma `.env`.