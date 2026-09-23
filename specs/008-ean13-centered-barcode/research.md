# Recherche — Centrage & pleine échelle du code-barres EAN-13 (Feature 008)

## Objectif

Centrer le bloc **barres + chiffres lisibles** en largeur et en hauteur et le
dimensionner au maximum scannable sur l'étiquette, pour chaque format papier de
`ZPL_PAPER_SIZES`, en préservant les zones de silence GS1.

## Faits techniques établis (ZPL)

Source : documentation Zebra `^BE`, référence ZPLr (rendu ZPL II 2025),
référence Labelary — concordantes.

- **`^BEo,h,f,g`** : `o` orientation (N/R/I/B), `h` **hauteur des barres** en
  dots (hors chiffres), `f` = `Y`/`N` imprimer la ligne lisible (défaut `Y`),
  `g` = `Y`/`N` placer cette ligne **au-dessus** (défaut `N` → sous les barres).
- **`^FOx,y`** = coin supérieur-gauche du champ, c.-à-d. **le haut des barres** ;
  les chiffres lisibles sont dessinés **en dessous** de la hauteur `h`.
  → Hauteur du bloc total = `h` + hauteur de la ligne lisible.
- **`^BYw,r,h`** : `w` largeur de module (dots), `r` rapport, `h` hauteur par
  défaut ; la hauteur explicite de `^BE` prévaut.
- `^BE` accepte exactement **12 chiffres** dans `^FD` et calcule lui-même la
  clé de contrôle (l'existant `.slice(0, 12)` est conservé). L'affichage des
  chiffres est intégré au symbole (natif) — étroit par rapport aux barres
  (digits dans des cellules de 7 modules), donc les zones de silence latérales
  restent dégagées.

## Faits techniques établis (standard EAN-13 / GS1)

- Symbole : **95 modules** de données + **11 modules** de zone de silence à
  gauche + **7 modules** à droite = **113 modules** de largeur totale.
- **X-dimension** (largeur du module le plus fin), produit de grande
  consommation : min **0.264 mm**, cible **0.330 mm**, max **0.660 mm**.
  Exception 0.25 mm acceptée en **impression on-demand thermique** (notre cas).
- **Hauteur de barres minimale** pour le X minimal : **18.28 mm** (~146 dots à
  203 dpi). La hauteur des barres doit croître avec la magnification.
- Bloc complet à magnification 100 % : **25.93 mm** de haut, dont barres
  **22.85 mm** → **bande de chiffres ≈ 3.08 mm ≈ 25 dots** à 203 dpi. Cette
  bande est **pratiquement constante** (recommandation OCR-B ~2.75 mm), elle ne
  suit pas la magnification du symbole.

## Décisions de conception

### 1. Largeur — module X calculé au plus grand scannable

```
moduleWidth = clamp(floor(widthDots / 113), 2, 5)
barsWidth   = 95 × moduleWidth
x           = round((widthDots − barsWidth) / 2)
```

- Borne basse `2` dots (0.25 mm) : exception on-demand thermique.
- Borne haute `5` dots (0.625 mm ≤ 0.66 mm max GS1). **Conséquence assumée** :
  sur tout format ≥ 75 mm de large (`75x25`, `100x50`, `100x150`), le symbole
  n'atteint pas toute la largeur (pour `75x25` le module 5 est exactement
  `floor(600/113)` ; pour le 800 dots un module 7 = 0.875 mm serait hors
  standard) — la scannabilité (SC-004) prime sur l'occupation maximale
  (SC-005 partiel). Documenté explicitement.
- Les marges latérales égales `(widthDots − 95·moduleWidth) / 2` garantissent les
  zones de silence (gauche ≥ 11·module, droite ≥ 7·module) — vérifié par le tableau ci-dessous.

### 2. Hauteur — bloc = 90 % de la hauteur, centré

```
TEXT_HEIGHT_DOTS       = 25   // bande chiffres lisibles (~3.08 mm), constante GS1
TARGET_HEIGHT_COVERAGE = 0.9  // couverture cible : bloc = 90 % de la hauteur
blockHeight            = round(0.9 × heightDots)
barHeight              = max(blockHeight − TEXT_HEIGHT_DOTS, 146)
y                      = round((heightDots − blockHeight) / 2)
```

- Le bloc **barres + chiffres** couvre **exactement 90 %** de la hauteur sur
  tous les formats ; les marges haut/bas valent **5 % de la hauteur** chacune
  (10 dots sur 200, 60 dots sur 1200) → bloc centré verticalement (SC-002),
  couverture uniforme (SC-003).
- Plancher GS1 : `barHeight ≥ 146` dots dans tous les cas de figure (min atteint
  ici : 155 dots).
- `^BY{moduleWidth},3,{barHeight}` + `^BEN,{barHeight},Y,N` (rapport 3, ligne
  lisible sous les barres, inchangé).

### 3. Chiffres lisibles

Conservés par la commande native (`f = Y`). Pas de rendu manuel via `^A0N` :
YAGNI, et cela évite toute divergence entre chiffres affichés et clé calculée.

## Valeurs attendues (203 dpi = 8 dots/mm)

| Format | Dots (L×H) | Module X | X-dots | X (mm) | Barres | `x` | `hauteur` | `y` | Bloc | Couv. H |
|--------|-----------|---------:|-------:|-------:|-------:|----:|----------:|----:|-----:|--------:|
| `40x25` | 320×200 | 2 (floor 2.83) | 190 | 0.250 | 190 | 65 | 155 | 10 | 180 | 90.0 % |
| `75x25` | 600×200 | 5 (floor 5.31) | 475 | 0.625 | 475 | 63 | 155 | 10 | 180 | 90.0 % |
| `100x50`| 800×400 | 5 (floor 7.08 → cap) | 475 | 0.625 | 475 | 163 | 335 | 20 | 360 | 90.0 % |
| `100x150`| 800×1200 | 5 (floor 7.08 → cap) | 475 | 0.625 | 475 | 163 | 1055 | 60 | 1080 | 90.0 % |

Formats issus de `ZPL_PAPER_SIZES` dans `.env` (source de vérité),
`40x25, 75x25, 100x50, 100x150`.

Zones de silence vérifiées : chaque marge latérale (min 63 dots) est très
supérieure au besoin (11×module = 22 à 55 dots). Aucune coupe de symbole.

> La couverture verticale est uniforme à **90 %** sur tous les formats
> (marges haut/bas = 5 % de la hauteur) : retouche utilisateur post-livraison
> pour laisser respirer l'étiquette tout en gardant un bloc dominant.

## Alternatives rejetées

| Alternative | Raison du rejet |
|-------------|-----------------|
| Chiffres rendus manuellement (`^A0N` sous les barres) | Complexité accrue, risque de divergence affichage/clé, aucun besoin réel |
| Magnification fixe (`^BY` seul) ou % du symbole | Ne remplit pas l'espace sur tous les formats ; ne « grossit » pas avec le format (SC-004/005) |
| Module sans plafond (7 dots sur 800×400) | 0.875 mm hors X-dimension GS1 — dégradation de la lecture scanner |
| Mesure exacte de la bande texte sur le modèle d'imprimante avant conception | Non nécessaire : constante estimée ± quelques dots, le centrage reste symétrique ; calibration au premier rendu réel |

## Risques résiduels (acceptés)

- **`TEXT_HEIGHT_DOTS = 25` est une estimation** (bande GS1 ≈ 3.08 mm à 100 %).
  La police interne Zebra peut varier de quelques dots : les deux marges
  verticales bougent ensemble (centrage conservé) ; un écart notable créerait
  seulement un léger débord/coupe du bloc sur les labels courts. À vérifier au
  premier rendu réel ; ajustable via une seule constante.
- **Formats larges non pleine largeur** (`75x25`, `100x50`, `100x150`) :
  plafond GS1 assumé (cf. décisions).
- **Hauteur de barres non plafonnée** : sur `100x150` (hauteur 1200 dots →
  barres 1055 dots ≈ 132 mm), la hauteur dépasse largement le maximum GS1
  recommandé (45.7 mm) — des barres trop **hautes** restent lisibles (seul le
  sous-dimensionnement casse la lecture), conforme à l'objectif « pleine
  échelle » de l'US ; le plancher 146 dots est le seul garde-fou appliqué.
- Aucun format de la liste (≥ 40×25 mm) ne présente de risque de dépassement
  en largeur ou de coupe de symbole.

## Critères de non-régression

- `^FD` = 12 chiffres (clé machine), `^PQ` = quantité, `^PW`/`^LL`/`^LH0,0`
  inchangés.
- Signature de `buildEan13Zpl` inchangée → `route.ts` neutre.