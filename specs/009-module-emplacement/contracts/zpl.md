# Contrat ZPL — Étiquette Emplacement Code 128 centrée (Feature 009)

Génération du flux ZPL envoyé à l'imprimante (203 dpi = 8 dots/mm). Rendu du
code-barres : commande native **`^BC` (Code 128)**, symbole **centré en
largeur et en hauteur** (barres + ligne lisible sous les barres) et
**dimensionné au maximum scannable**, en reprenant la convention de la feature
008. Référence : [research.md](../research.md), valeurs du layout :
[data-model.md](../data-model.md).

## Données d'entrée

| Entrée | Source | Usage |
|--------|--------|-------|
| `widthDots`, `heightDots` | `ZPL_PAPER_SIZES` (format sélectionné) via `resolveDimensions` | géométrie du layout |
| `codes: string[]` | expansion de plage ou `[code]` (mode single) | un `^FD` par code |
| `quantity` | requête validée (mode single seulement, 1…1000) | `^PQ` |

## Paramètres de calcul (constantes Code 128)

| Constante | Valeur | Sens |
|-----------|-------:|------|
| `CHAR_MODULES` | 11 | largeur d'un caractère de données |
| `CODE_128_BASE_MODULES` | 35 | départ (11) + clé mod 103 (11) + arrêt (13) |
| `SYMBOL_MODULES` | `11×4 + 35 = 79` | largeur du symbole (code de 4 caractères) |
| `QUIET_MODULES` | 20 | zones de silence (10 + 10) |
| `TOTAL_MODULES` | `79 + 20 = 99` | largeur de référence du clamping |
| `MIN_MODULE_WIDTH` | 2 dots | X min Code 128 (0.19 mm) |
| `MAX_MODULE_WIDTH` | 8 dots | X max Code 128 (1.016 mm) |
| `TEXT_HEIGHT_DOTS` | 25 | bande ligne lisible (~3.08 mm) |
| `TARGET_HEIGHT_COVERAGE` | 0.9 | bloc = 90 % de la hauteur |
| `MIN_BAR_HEIGHT_DOTS` | 51 | plancher scannabilité (0.25″) |

## Flux généré — mode Un seul (une étiquette ×N copies)

```zpl
^XA
^PW320^LL200            ; largeur/hauteur étiquette (320 × 200 dots pour 40×25 mm)
^LH0,0                  ; origine en haut à gauche
^BY3,3,155              ; module X=3 dots, ratio 3, hauteur barres 155 dots
^FO42,10^BCN,155,Y,N,N  ; centré (x=42, y=10), Code 128, ligne lisible sous les barres
^FD1A5B^FS              ; 4 caractères saisis tels quels (imprimante calcule mod 103)
^PQ5                    ; nombre de copies = quantité demandée
^XZ
```

Mapping `^BCo,h,f,g,e,m` : `o=N` (normal), `h=barHeight`, `f=Y` (ligne lisible
sous les barres), `g=N` (pas au-dessus), `e=N` (pas de clé UCC), `m` omis
(défaut `N`, sous-ensemble optimal choisi par la machine).

## Flux généré — mode Plage (un bloc par code distinct)

`^PQ` répète la **même** étiquette : il est donc inutilisable pour une plage
(codes différents). Le flux concatène un bloc par code, dans l'ordre croissant
de la plage, en **un seul job** :

```zpl
^XA
^PW320^LL200
^LH0,0
^BY3,3,155
^FO42,10^BCN,155,Y,N,N
^FD1A10^FS
^XZ
^XA
^PW320^LL200
^LH0,0
^BY3,3,155
^FO42,10^BCN,155,Y,N,N
^FD1A11^FS
^XZ
; … un bloc suivant par code de la plage (taille ≤ 1000)
```

Pas de `^PQ` explicite (valeur par défaut 1) — chaque bloc est imprimé une fois.

### Calcul des valeurs (applicable à tout format)

```text
moduleWidth = clamp(floor(widthDots / 99), 2, 8)
barsWidth   = 79 × moduleWidth
x           = round((widthDots − barsWidth) / 2)      → marge gauche ≈ droite ≥ 10 modules
blockHeight = round(0.9 × heightDots)                 → bloc = 90 % de la hauteur
barHeight   = max(blockHeight − 25, 51)
y           = round((heightDots − blockHeight) / 2)   → marge haute ≈ basse (= 5 %)
```

## Valeurs générées par format (code de 4 caractères)

| Format | Dots | module | barres (79×m) | `x` | zones de silence | barHeight | `y` | bloc | couverture H |
|--------|------|-------:|--------------:|----:|------------------|----------:|----:|-----:|-------------:|
| `40x25` | 320×200 | 3 | 237 | 42 | 42 / 41 | 155 | 10 | 180 | 90.0 % |
| `75x25` | 600×200 | 6 | 474 | 63 | 63 / 63 | 155 | 10 | 180 | 90.0 % |
| `100x50` | 800×400 | 8 | 632 | 84 | 84 / 84 | 335 | 20 | 360 | 90.0 % |
| `100x150` | 800×1200 | 8 | 632 | 84 | 84 / 84 | 1055 | 60 | 1080 | 90.0 % |

Formats issus de `ZPL_PAPER_SIZES` dans `.env` : `40x25, 75x25, 100x50,
100x150`. Zone de silence requise : `10 × module` (30 / 60 / 80 / 80 dots) —
respectée sur chaque format (invariant 1 du data-model).

## Règles

- Toute étiquette : `^XA` … `^XZ`, une par bloc.
- `^BYw,3,h` et `^BCN,h,Y,N,N` portent le même module `w` et la même hauteur `h`.
- `^FD` = **4 caractères** du code (pas de transformation — `#` et `D` transmis
  tels quels) ; la clé mod 103 est toujours calculée par l'imprimante.
- Ligne lisible `Y` sous les barres (le bloc « barres + texte » dépasse `h` de
  ~`TEXT_HEIGHT_DOTS`, même géométrie que `^BE`).
- Zones de silence ≥ 10 modules de chaque côté : garanties par construction
  (`x ≥ 10×module` et `widthDots − x − barsWidth ≥ 10×module`), vérifiées par
  test sur chaque format.
- Le flux est construit dans `lib/zpl/location.ts` (fonction pure, testée,
  sans I/O) — `buildLocationZpl({ codes, quantity?, widthDots, heightDots })`.
  Les calculs de géométrie partagés avec EAN-13 sont extraits dans
  `lib/zpl/layout.ts` (DRY) ; `buildEan13Zpl` reste strictement identique.

## Cas limites

- **Formats larges (75×25, 100×50, 100×150)** : module plafonné à 8 dots
  (X max Code 128 1.0 mm) — symbole centré avec marges larges (scannabilité
  avant remplissage maximal).
- **Format très haut (100×150)** : barres de 1055 dots (~132 mm) — hauteur non
  plafonnée (seul le plancher 51 dots s'applique).
- **Petit format (40×25)** : module 3 dots (0.375 mm) ; barres 155 dots ≥ 51.
- **Plage maximale** : 1000 blocs × (~140 octets) ≈ 140 Ko — envoi unique,
  sous le timeout 10 s (borne métier 006 inchangée).
- **Ligne lisible plus large que le symbole** : 4 caractères à la police
  défaut (~10 dots/char) ≪ 237 dots — aucun débordement de `x`.
- **Rotation** : toujours `^BCN` (non roté) — pas de besoin d'orientation.
- **Arrondi** : `x` arrondi à l'entier ; l'écart gauche/droite ≤ 1 dot
  (tolérance SC-001/002).
- **Sans imprimante** : `sendToPrinter` échoue → `503` `PRINTER_UNAVAILABLE`
  (validation Zod déjà passée) — inchangé.