# Recherche — Module Emplacement, code-barres Code 128 (Feature 009)

## Objectif

Nouveau module « Emplacement » : imprimer des étiquettes portant un code-barres
**Code 128** correspondant à un code d'emplacement (4 caractères, nomenclature
stricte), avec deux modes (Un seul / Plage) et deux types (Classique /
Dynamique `#D`) pilotés par des interrupteurs. Réutilise le pipeline
imprimante/format (006/007) et la convention de centrage/échelle (008).

## Faits techniques établis (ZPL — commande `^BC`, Code 128)

Source : documentation Zebra `^BC` et référence ZPLr (rendu ZPL II 2025) —
concordantes.

- **`^BCo,h,f,g,e,m`** : `o`=orientation (`N`), `h`=hauteur des barres en dots
  (hors ligne lisible), `f`=`Y`/`N` imprime la ligne lisible **sous** les
  barres (défaut `Y`), `g`=`Y`/`N` ligne au-dessus (défaut `N`),
  `e`=`Y`/`N` clé UCC (défaut `N`), `m`=mode d'encodage (défaut `N`).
- **Police de la ligne lisible (précision 012)** : sur firmware **≤ 10.3.x**,
  la ligne lisible native (`f=Y`) est rendue avec la **police « 0 » scalable à
  défaut fixe (`^CF0`)**, et la commande `^CF` / `^A` appliquée **dans** le
  champ (`^FD…^FS`) est sans effet : `^CFE` ne fonctionne **pas** pour la HRI
  native. Solution Zebra recommandée : désactiver la HRI (`f=N`) et
  **dessiner le texte soi-même** dans un champ dédié `^AEN` (font E = OCR-B),
  centré sous les barres — méthode retenue (évol. 012).
- **Clé de contrôle mod 103** : toujours calculée par l'imprimante, jamais
  fournie dans `^FD` — les 4 caractères saisis sont encodés tels quels.
- **Sous-ensembles** : Code 128 A/B/C. En mode par défaut (`N`), la machine
  choisit le codage optimal ; notre jeu de caractères (`0-9`, `A-Z`, `#`) est
  entièrement couvert par les sous-ensembles A/B. Le `#` (ASCII 35) est valide.
- **Ligne lisible** : affichée en dessous de la hauteur `h` — le bloc total
  (barres + texte) est plus haut que `h` (même géométrie que `^BE` EAN-13).
- **Zone de silence** : Code 128 exige **~10 largeurs de module** de chaque
  côté du symbole, sinon le scan échoue.
- **Largeur du symbole en modules** : chaque caractère encode 11 modules ;
  le caractère de départ = 11, la clé = 11, le caractère d'arrêt = 13.
  Pour `N` caractères de données : **largeur = 11×N + 35 modules**
  (pour 4 caractères : 79 modules), + 20 modules de zones de silence
  (10 + 10).

## Faits techniques établis (nomenclature des emplacements)

- Expression source de vérité : `^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$`.
- Codes de **exactement 4 caractères** :
  1. premier caractère : `1` ou `2` ;
  2-3. soit une lettre `A-Z` suivie d'un caractère `1-9` **ou** `A-Z`
   (le `0` est **exclu** ici), soit le littéral `#D` ;
  4. dernier caractère : `0-9` ou `A-Z` (le `0` final est autorisé).
- Deux **types** se déduisent de la position 2-3 :
  - **Classique** : `^[12][A-Z][1-9A-Z][0-9A-Z]$` ;
  - **Dynamique `#D`** : `^[12]#D[0-9A-Z]$`.

## Décisions de conception

### D1. Symbologie, commande ZPL et police OCR-B

```
^BCN,{barHeight},N,N,N   // Code 128, ligne lisible native désactivée (f=N),
                         // pas de clé UCC, mod 103 auto (toujours actif)
^FO{xText},{yText}^AEN,{textHeight},{wCell}   // font E (OCR-B) dédiée
^FD{code}^FS                                   // texte centré sous les barres
```
- Native (`^BC`), pas de rendu manuel des motifs : KISS + exactitude garantie.
- **HRI désactivée + champ texte dédié `^AEN`** : seule méthode fiable pour
  garantir la police **OCR-B** (le firmware verrouille la police de la HRI
  native sur `^CF0` — voir faits techniques). Validée sur Zebra ZD420 en
  condition réelle (2026-09-29) : texte **non étiré**, occurrence **unique**,
  **centré** sous les barres, avec **gap** et taille **proportionnels** au
  format.
- `e=N` et `m=N` : pas de variante UCC/EAN — le besoin est un Code 128 brut.
- **Alignement hauteur de cellule** : `^AEN,h,w` demande une hauteur `h` mais
  rend la police à la taille **matricielle réelle** (OCR-B ca. 28×15 dots ZD /
  41×20 dots ZM/ZT, ratio l/h ≈ 0.46–0.49) ; `wCell = round(h × 0.48)` épouse
  ce ratio pour éviter le texte « étiré ». OCR-B **non expansé** définit la
  largeur maximale (norme) — c'est ce ratio que l'on reproduit.

### D2. Layout — centré, pleine échelle scannable (convention feature 008)

Mêmes calculs que `buildEan13Zpl`, avec les constantes Code 128 :

```
SYMBOL_MODULES      = 11 × len(code) + 35     // 79 pour un code de 4 caractères
TOTAL_MODULES       = SYMBOL_MODULES + 20     // + zones de silence (10 + 10)
moduleWidth         = clamp(floor(widthDots / TOTAL_MODULES), MIN, MAX)
barsWidth           = SYMBOL_MODULES × moduleWidth
x                   = round((widthDots − barsWidth) / 2)     // marges = zones de silence
textHeight          = ceil(clamp(round(heightDots × 0.18), 25, 110) / 28) × 28   // OCR-B quantifié (multiple de la cellule 28 dots)
gap                 = round(textHeight × 0.15)                   // séparation barres/texte
blockHeight         = round(0.9 × heightDots)                // convention 90 %
barHeight           = max(blockHeight − textHeight − gap, MIN_BAR_HEIGHT_DOTS)
y                   = round((heightDots − blockHeight) / 2)
yText               = y + barHeight + gap
wCell               = round(textHeight × 0.48)            // ratio largeur/hauteur OCR-B
advance             = round(textHeight × 0.52)            // resserrement inter-caractères
xText               = x + round((barsWidth − len(code) × advance) / 2)   // centrage
```
- **Quantification OCR-B (précision 014)** : police **E = bitmap fixe
  28×15 dots @203 dpi** (table des polices standard Zebra), « expandable up to
  10 times » mais la hauteur `^AEN` n'est appliquée que par **multiples de la
  cellule (28)** — toute autre valeur est arrondie au multiple le plus proche
  par le firmware. Demander le **multiple supérieur** (`ceil`) rend le texte
  imprimé conforme au calcul :
  - 40×25 / 75×25 : 0.18×200 = 36 → arrondi à 56 → **texte doublé** (28 → 56) ;
  - 100×50 : 72 → 84 ; 100×150 : 110 → 112 (déjà imprimés ainsi auparavant).
- **Bornes module** : X-dimension Code 128 ≈ 0.19–1.02 mm. À 203 dpi (1 dot =
  0.125 mm) : `MIN = 2 dots` (0.25 mm, sûr) et `MAX = 8 dots` (1.0 mm).
- **Plancher barres** : prise recommandée min 0.25″ → `MIN_BAR_HEIGHT_DOTS =
  51 dots` (6.38 mm). Les hauteurs réelles des formats (≥ 116 dots en 40×25)
  le dépassent largement.
- **Zone de silence** : garantie par construction — avec `moduleWidth =
  floor(widthDots/(SYMBOL+20))`, chaque marge vaut ≥ 10 modules.
- **Texte lisible** : le champ OCR-B dédié remplace la HRI native ; il est
  centré sur la largeur du symbole (`xText`) et calé sous les barres (`yText`),
  l'ensemble barres + gap + texte couvrant 90 % de la hauteur (convention 008).
- Le calcul (module/position/bloc + texte) étant partagé avec EAN-13 sur la
  partie symbole, il est **extrait dans `lib/zpl/layout.ts`** (DRY) ; la
  sortie de `buildEan13Zpl` reste strictement identique (aucune régression —
  `textGapDots` défaut à 0, ligne lisible native conservée).

### D3. Modes d'édition et structure du flux

- **Mode Un seul** : un code + une quantité → **une** étiquette avec `^PQ
  quantité` (copies identiques), comme EAN-13.
- **Mode Plage** : bornes début/fin → **une étiquette par code** de la plage,
  chaque code étant **différent** → `^PQ` est inutilisable (il répète la même
  étiquette) ; le flux est la **concaténation d'un bloc `^XA…^XZ` par code**
  (un job ZPL unique, `^PQ1` implicite), envoyé en un seul envoi réseau.
- La bordure plage ≤ 1000 codes garde le job et l'envoi raisonnables (timeout
  10 s inchangé, contrainte de la feature 006).

### D4. Sémantique et validation de plage

> **Décision initiale remplacée** : la sémantique « même préfixe (3
> caractères), seul le dernier caractère varie » a été étendue en « boîte » par
> la feature 010 (`1A10` → `1B10` devient valide). Ce qui suit décrit
> l'état d'origine (009) ; l'état courant est dans `specs/010-multi-range-print/`
> et `data-model.md` § « Plage — règles ».

- Les bornes doivent être de **même type** et partager le **même préfixe**
  (3 premiers caractères) ; seul le **dernier caractère** varie, dans l'ordre
  `0-9` puis `A-Z` (ordre ASCII des caractères autorisés, `0`..`9`,`A`..`Z`).
- Validation : `début ≤ fin` selon cet ordre ; sinon plage rejetée (FR-006).
- Expansion : génération pure et séquentielle entre les bornes inclusives ;
  taille ≤ 1000 (sinon rejet).
- Cette sémantique simple (variation du dernier caractère) couvre le cas
  typique « équiper un rangée/rack » : même bâtiment, même travée, même rangée
  (`1A10` → `1A15`). Une plage traversant un changement de préfixe est refusée
  (message clair) — choix KISS, documenté (spéc. § Edge Cases).
- Exemples : `1A10`→`1A1B` = 12 étiquettes (`…10,11,…,19,1A,1B`) ;
  `1A19`→`1A21` refusé (préfixes `1A1` ≠ `1A2`).

### D5. API et validation partagée (Zod)

- Un seul schéma Zod (client + serveur) en **union discriminée** sur `mode` :
  - `mode: "single"`, `locationType: "classic" | "dynamic"`, `code`,
    `quantity` (1–1000) ;
  - `mode: "range"`, `locationType`, `startCode`, `endCode` (pas de quantité).
  - champs communs `paperId?`, `printerAddress?` (réglages 006/007).
- Chef de fichier `lib/location/validate.ts` : regex par type, validation,
  expansion de plage (pures, testées).
- Le type choisi filtre la regex appliquée (FR-006 : un code `#D` saisi en
  mode Classique est rejeté).

### D6. Interface (switches shadcn)

- Composant **Switch** du kit UI du projet (`components/ui/switch.tsx`, Base
  UI `@base-ui/react`) — à ajouter au kit, puis deux interrupts dédiés :
  - **Mode** : `Un seul` / `Plage` ;
  - **Type** : `Classique` / `Dynamique #D`.
- L'état des switches n'est pas persisté (défaut à l'ouverture : Un seul +
  Classique) — YAGNI (assomption de la spec).
- En mode Plage, le champ quantité est masqué (le nombre d'étiquettes est la
  taille de la plage) ; en mode Un seul, il reste visible avec la confirmation
  grande quantité (pattern `ean13-confirm-dialog`).

## Alternatives rejetées

| Alternative | Raison du rejet |
|-------------|-----------------|
| `^PQ` pour la plage (répétition de l'étiquette) | Imprimerait N fois le **même** code — la plage exige un code **différent** par étiquette |
| Rendus des motifs Code 128 à la main (SVG/`^FO`…) | Erreur de codage possible, complexité inutile — `^BC` native garantit la conformité |
| Plage traversant préfixes/types (ex. `1A10` → `1B10`) | Sémantique ambiguë au moment du choix 009 ; **résolue** par la feature 010 : la plage génère une « boîte » bornée par les extrêmes (`1A10` → `1B10` valide, 2 codes) |
| Persistance des emplacements / des switches | YAGNI — aucun besoin d'historique ni de préférence expriment |
| Preview écran du code-barres | YAGNI — même posture que EAN-13 (0 preview) |
| Module Code 39 / autre symbologie | Le besoin explicite est **Code 128** |

## Risques résiduels (acceptés)

- **Rendu OCR-B par format (rév. 014)** : validé en réel sur 40×25 et 75×25
  (Zebra ZD420) avec texte 56 dots (doublé) ; 100×50 (84) et 100×150 (112)
  restent à **reconfirmer** physiquement (barres re-calées sur les 90 %).
  Invariants géométriques garantissent le non-chevauchement par construction
  (tests 4 formats + format futur 50×30).
- **Largeur max du texte** : pour 4 caractères, `textWidth = 4 × advance` reste
  très inférieur à `barsWidth` (116 vs 237 dots min en 40×25) → pas de
  débordement sous le symbole ; garde-fou automatique sur le format de
  référence 40×25.
- **OCR-B dilaté hors spéc.** Zebra (« fonts E/H not considered in-spec when
  expanded ») : accepté — le rendu visuel validé prime (comme pour les grands
  formats 84/112 déjà imprimés).
- **Renommage léger du `radio` shadcn** : le Switch (Base UI) doit être ajouté
  au kit local ; si le générateur shadcn produit une API différente de
  `select.tsx`, on suit l'API générée (contrat UI local).
- **Ordre `0-9 → A-Z`** du dernier caractère : convention assumée (ASCII) ;
  une plage mixte chiffres/lettres sans saut est rare mais supportée
  (ex. `1A19` → `1A1B`).
- **Impression physique réelle** (scan) non réalisable dans la CI : les tests
  vérifient la structure du flux et les invariants géométriques ; le contrôle
  au scanner est consigné au quickstart.

## Validation matérielle (2026-09-29, Zebra ZD420 × 192.168.1.63)

Diagnostic conduit en conditions réelles (envoi ZPL brut en TCP, media
100×150 puis 40×25 / 75×25) :

| Étiquette | Test | Résultat |
|-----------|------|----------|
| 1 | `^CFE,25,12` + `^BCN,155,Y,N,N` (HRI native) | **Échec** : police E **non** appliquée à la ligne lisible (firmware ≤ 10.x la verrouille sur `^CF0`) |
| 2 | `^FO0,0^AEN,25,12^FD1A5B` (champ texte brut) | Font E (OCR-B) **présente** sur la machine |
| 3 | `^BCN,155,N,N,N` + champ `^AEN` dédié | **Succès** : texte non étiré, centré, une occurrence |
| 4 | Étiquette police (`support: text`) + test HRI | « **E-OCR-B** » listée (≠ « 0-scalable ») — la fonte existe |
| 5 | Confirmation 40×25 (gap + centrage, méthode finale) | Validation **visuelle utilisateur** : OK |
| 6 | Confirmation 75×25 (idem) | Validation **visuelle utilisateur** : OK |

Conclusion : l'unicité du rendu n'est pas garantissable via la HRI native
(`^CF`/`^A` sans effet dans le champ `^BC`) → méthode robuste **HRI off +
champ `^AEN`** adoptée (D1). Artefacts corrigés en cours de route : texte
« étiré » lié à `^AEN,h,h` (carré) et non au ratio OCR-B ; « centrage » et
« pleine page » liés à des étiquettes de test, pas à l'algorithme
(zone de silence Code 128 : 79/99 modules ≈ 79 % de la largeur max).

## Critères de non-régression

- `buildEan13Zpl` : sortie strictement identique après extraction layout (les
  35 tests existants sont le filet).
- Pipeline papier/imprimante/envoi (`resolveDimensions`, `sendToPrinter`,
  cookie) : inchangé, réutilisé.
- Suite complète (175 tests) reste verte ; contribution de tests pour le
  module (validation, plage, ZPL, route, composant).