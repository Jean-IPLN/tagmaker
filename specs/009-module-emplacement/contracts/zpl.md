# Contrat ZPL — buildLocationZpl (Feature 009, évol. 012)

Révision 012 (2026-09-29) : **police OCR-B garantie** par désactivation de la
ligne lisible native (`f=N`) + champ texte dédié `^AEN` centré sous les barres.
Remplace l'approche `^CFE,25,12` (HRI native, firmware <= 10.x verrouille la
police de la ligne lisible : impossible d'en changer la police par `^CF`).

## Dimensions et résolution

- Étiquettes **203 dpi** (`1 dot = 0.125 mm`), formats du répertoire papier :
  `40x25`, `75x25`, `100x50`, `100x150` (millimètres).
- `widthDots`, `heightDots` proviennent de `resolveDimensions` (module 006) et
  sont transmis tels quels à la fonction pure.

## Constantes

| Constante | Valeur | Sens |
|-----------|-------:|------|
| `CHAR_MODULES` | 11 | largeur d'un caractère de données (3 barres + 3 espaces) |
| `SYMBOL_MODULES` | `11 × len(code) + 35` (= **79** pour 4 caractères) | largeur du symbole (départ 11 + clé mod 103 11 + arrêt 13) |
| `TOTAL_MODULES` | `SYMBOL_MODULES + 20` (= **99**) | + zones de silence (10 + 10) |
| `QUIET_MODULES` | 20 | zones de silence (10 + 10) |
| `MIN_MODULE_WIDTH` | 2 dots | X min Code 128 (0.25 mm @203 dpi) |
| `MAX_MODULE_WIDTH` | 8 dots | X max Code 128 (1.0 mm) |
| `TARGET_HEIGHT_COVERAGE` | `0.9` | bloc (barres + texte + gap) = 90 % de `heightDots` |
| `MIN_BAR_HEIGHT_DOTS` | 51 | plancher scannabilité (0.25″) |
| `TEXT_HEIGHT_RATIO` | `0.12` | hauteur texte = 12 % de `heightDots` |
| `TEXT_HEIGHT_MIN` | 25 dots | hauteur texte minimale (~3.08 mm) |
| `TEXT_HEIGHT_MAX` | 80 dots | hauteur texte maximale |
| `TEXT_GAP_RATIO` | `0.15` | gap barres→texte = 15 % de `textHeight` |
| `OCR_B_WIDTH_RATIO` | `0.48` | `wCell` (largeur de cellule ^AEN OCR-B, ratio l/h) |
| `CHAR_ADVANCE_RATIO` | `0.52` | resserrement inter-caractères (avance) OCR-B + hachures |

> Les constantes texte correspondent aux matrices OCR-B Zebra (28×15 dots ZD /
> 41×20 dots ZM/ZT, ratio l/h ≈ 0.46–0.49). Voir `research.md` § Validation
> terrain.

## Calculs de position (priorité identique au module EAN-13, feature 008)

```
moduleWidth = clamp(floor(widthDots / TOTAL_MODULES), MIN_MODULE_WIDTH, MAX_MODULE_WIDTH)
barsWidth   = SYMBOL_MODULES × moduleWidth
x           = round((widthDots − barsWidth) / 2)

textHeight  = clamp(round(heightDots × TEXT_HEIGHT_RATIO), TEXT_HEIGHT_MIN, TEXT_HEIGHT_MAX)
gap         = round(textHeight × TEXT_GAP_RATIO)
blockHeight = round(TARGET_HEIGHT_COVERAGE × heightDots)
barHeight   = max(blockHeight − textHeight − gap, MIN_BAR_HEIGHT_DOTS)
y           = round((heightDots − blockHeight) / 2)
yText       = y + barHeight + gap
wCell       = round(textHeight × OCR_B_WIDTH_RATIO)
advance     = round(textHeight × CHAR_ADVANCE_RATIO)
textWidth   = code.length × advance
xText       = x + round((barsWidth − textWidth) / 2)
```

## Flux ZPL — mode « Un seul » (quantity ≥ 1)

```
^XA
^CI28
^PW{widthDots}^LL{heightDots}
^LH0,0
^FO{x},{y}^BCN,{barHeight},N,N,N
^FD{code}^FS
^FO{xText},{yText}^AEN,{textHeight},{wCell}^FD{code}^FS
^PQ{quantity}
^XZ
```

- `^BCN,h,N,N,N` : Code 128, **ligne lisible native désactivée** (`f=N` — pas
  de HRI), pas de ligne au-dessus (`g=N`), pas de clé UCC (`e=N`), mode
  d'encodage auto (`m=N`).
- Champ texte dédié : `^AEN` (font E = OCR-B), hauteur `textHeight`, largeur de
  cellule `wCell`, `^FD{code}` centré à `xText` (`+` et `-` sont proscrits par
  la nomenclature).
- `wCell` peut déborder de la hauteur : seule la **baseline** guide le rendu
  (`^AEN,h,w` — hauteur réellement rendue ~ `h × 0.6`), aucun clip possible.

## Flux ZPL — mode « Plage » (1 bloc `^XA…^XZ` par code)

```
^XA
^CI28
^PW{widthDots}^LL{heightDots}
^LH0,0
^FO{x},{y}^BCN,{barHeight},N,N,N
^FD1A10^FS
^FO{xText},{yText}^AEN,{textHeight},{wCell}^FD1A10^FS
^XZ
^XA
… (un bloc identique par code, sans ^PQ)
^XZ
```

La position `xText`/`yText` est **identique pour tous les blocs** (même
largeur de symbole) ; seul l'`^FD` change.

## Règles de non-régression (contrats existants)

- `^BE` EAN-13 (feature 008) : **inchangé** — `buildEan13Zpl` ne passe aucune
  ligne de gap (`textGapDots` défaut 0) et conserve sa ligne lisible native.
- `^PW`/`^LL`/`^LH0,0`/`^PQ` (mode single) : conforme aux contrats 006/007.

## Exemples signifiants

- `codes: ["1A5B"], quantity: 5, 40×25` : contenance `^PW320^LL200`,
  `^FO42,10^BCN,151,N,N,N`, `^FO135,165^AEN,25,12`, `^PQ5`.
- `codes: ["1A10","1A11"], 40×25` : 2 blocs `^XA…^XZ`, aucun `^PQ`, chaque
  bloc porte `^FO42,10^BCN,151,N,N,N` + `^FO135,165^AEN,25,12^FD1A10/1A11^FS`.

## Données attendues par format de papier (code 4 caractères)

| Format | `^BY` | `barHeight` | `^BCN` | `textHeight` | gap | `xText` | `yText` | `^AEN` |
|--------|------:|------------:|:-------|-------------:|----:|--------:|--------:|:-------|
| `40x25` (320×200) | `^BY3,3,151` | 151 | `^FO42,10^BCN,151,N,N,N` | 25 | 4 | 135 | 165 | `^FO135,165^AEN,25,12` |
| `75x25` (600×200) | `^BY6,3,151` | 151 | `^FO63,10^BCN,151,N,N,N` | 25 | 4 | 274 | 165 | `^FO274,165^AEN,25,12` |
| `100x50` (800×400) | `^BY8,3,305` | 305 | `^FO84,20^BCN,305,N,N,N` | 48 | 7 | 350 | 332 | `^FO350,332^AEN,48,23` |
| `100x150` (800×1200) | `^BY8,3,988` | 988 | `^FO84,60^BCN,988,N,N,N` | 80 | 12 | 316 | 1060 | `^FO316,1060^AEN,80,38` |

> Vérification sur le terrain (Zebra ZD420, 2026-09-29) : rendu validé sur
> 40×25 et 75×25 (texte non étiré, une seule occurrence, centré). Référence
> des tests automatiques : **formats 100×150 (principal) et 40×25 (garde-fou,
> défaut de l'application)**.