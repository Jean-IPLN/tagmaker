# Contrat ZPL — Étiquette EAN-13 centrée et pleine échelle (Feature 008)

Génération du flux ZPL envoyé à l'imprimante (203 dpi = 8 dots/mm). Rendu du
code-barres : commande native `^BE` (EAN-13), symbole **centré en largeur et en
hauteur** (barres + chiffres lisibles) et **dimensionné au maximum scannable**
pour le format de papier sélectionné. Reference : [research.md](../research.md).

> Ce contrat **supplante les valeurs géométriques du
> contrat `specs/001-module-ean13/contracts/zpl.md`** (module, position,
> hauteur codés en dur). Validation EAN-13, `^PQ` et envoi réseau inchangés.

## Données d'entrée

| Entrée | Source | Usage |
|--------|--------|-------|
| `widthDots`, `heightDots` | `ZPL_PAPER_SIZES` (format sélectionné) via `resolveDimensions` | géométrie du layout |
| `ean13` (13 chiffres) | requête validée | `^FD` = les 12 premiers, la clé est calculée par la machine |
| `quantity` | requête validée (1…1000) | `^PQ` |

## Paramètres de calcul (constantes d'étalonnage)

| Constante | Valeur | Sens |
|-----------|-------:|------|
| `DATA_MODULES` | 95 | modules du symbole |
| `QUIET_LEFT_MODULES` | 11 | zone de silence min à gauche |
| `QUIET_RIGHT_MODULES` | 7 | zone de silence min à droite |
| `TOTAL_MODULES` | 113 | `95 + 11 + 7` |
| `MIN_MODULE_WIDTH` | 2 dots | X min on-demand (0.25 mm) |
| `MAX_MODULE_WIDTH` | 5 dots | X max GS1 (0.66 mm) |
| `TEXT_HEIGHT_DOTS` | 25 | bande chiffres lisibles (~3.08 mm) |
| `TARGET_HEIGHT_COVERAGE` | 0.9 | couverture cible : bloc = 90 % de la hauteur |
| `MIN_BAR_HEIGHT_DOTS` | 146 | plancher GS1 (18.28 mm) |

## Flux généré (structure)

```zpl
^XA
^PW320^LL200            ; largeur/hauteur étiquette (320 × 200 dots pour 40×25 mm)
^LH0,0                  ; origine en haut à gauche
^BY2,3,155              ; module X=2 dots, ratio 3, hauteur barres 155 dots
^FO65,10^BEN,155,Y,N    ; centré (x=65, y=10), EAN-13, ligne lisible sous les barres
^FD590123412345^FS     ; 12 chiffres de données (imprimante calcule la clé)
^PQ5                    ; nombre de copies = quantité demandée
^XZ
```

### Calcul des valeurs (applicable à tout format)

```text
moduleWidth = clamp(floor(widthDots / 113), 2, 5)
barsWidth   = 95 × moduleWidth
x           = round((widthDots − barsWidth) / 2)      → marge gauche = droite
blockHeight = round(0.9 × heightDots)                 → bloc = 90 % de la hauteur
barHeight   = max(blockHeight − 25, 146)
y           = round((heightDots − blockHeight) / 2)   → marge haute = basse (= 5 %)
```

## Valeurs générées par format

| Format | Dots | module | barres | `x` | barHeight | `y` | bloc | couverture H |
|--------|------|-------:|-------:|----:|----------:|----:|-----:|-------------:|
| `40x25` | 320×200 | 2 | 190 | 65 | 155 | 10 | 180 | 90.0 % |
| `75x25` | 600×200 | 5 | 475 | 63 | 155 | 10 | 180 | 90.0 % |
| `100x50`| 800×400 | 5 | 475 | 163 | 335 | 20 | 360 | 90.0 % |
| `100x150`| 800×1200 | 5 | 475 | 163 | 1055 | 60 | 1080 | 90.0 % |

Formats issus de `ZPL_PAPER_SIZES` dans `.env` : `40x25, 75x25, 100x50, 100x150`.

## Règles

- Toute étiquette : `^XA` … `^XZ`.
- `^BYw,3,h` et `^BEN,h,Y,N` portent le même module `w` et la même hauteur `h`.
- `^FD` = **12 chiffres** (les 13 moins la clé) — comportement existant conservé.
- Nombre de copies = `^PQ<quantity>` (le printer répète l'étiquette ; pas de
  boucle application). Chaque copie est identique et centrée (FR-007).
- Marges latérales ≥ 11 modules (gauche) / 7 modules (droite) : garanties par
  construction (vérifié par test sur chaque format).
- Le flux est construit dans `lib/zpl/build.ts` (fonction pure, testée, sans
  I/O), signe inchangé : `buildEan13Zpl({ ean13, quantity, widthDots, heightDots })`.

## Cas limites

- **Formats larges (75×25, 100×50, 100×150)** : module plafonné à 5 dots
  (X max GS1 0.625 mm) — symbole volontairement plus étroit que la largeur
  disponible (scannabilité avant remplissage maximal).
- **Format très haut (100×150)** : barres de 1055 dots (~132 mm) — hauteur non
  plafonnée : des barres trop hautes restent lisibles (seul le plancher 146
  dots s'applique).
- **Petit format (40×25)** : module 2 dots (0.25 mm, exception on-demand
  thermique) ; hauteur de barres 155 dots ≥ plancher GS1 146 dots.
- **Quantité élevée** : bornée à 1000 par la validation métier (règle partagée
  client/serveur) — inchangé.
- **Rotation** : toujours `^BEN` (non roté) — inchangé.
- **Arrondi** : `x` est arrondi à l'entier ; l'écart gauche/droite reste ≤ 1 dot
  (tolérance SC-001/002).