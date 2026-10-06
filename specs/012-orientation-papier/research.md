# Recherche — Orientation d'impression (feature 012)

Décisions issues de l'analyse du code actuel (`lib/zpl/*`, `lib/print-settings*`,
`app/api/print/*`) et de la documentation ZPL II. Chaque décision est formulée
`Decision / Rationale / Alternatives` ; les points marqués **[TEST]** sont à
confirmer par l'impression physique (`nc`, voir quickstart.md).

## D1 — Sens de rotation : antihoraire (orientation ZPL `B`)

- **Decision** : le contenu pivoté est émis avec l'orientation ZPL `B`
  (rotation 90° antihoraire).
- **Rationale** : la spécification fixe « haut du contenu à gauche, bas à
  droite » (FR-003), ce qui correspond à une rotation antihoraire du contenu
  dans le repère d'impression (haut → gauche). En ZPL, les orientations de
  champ/symbole sont `N` (normal), `R` (90° horaire), `I` (180°), `B` (90°
  antihoraire) : seule `B` place le « haut » du contenu du côté gauche de
  l'étiquette pour une largeur de tête inchangée.
- **Alternatives considerées** : `R` (horaire) — rejetée, placerait le haut à
  droite (résultat que l'utilisateur n'attend pas).

**VALIDÉ T10/2026-10-05** — impression physique (`nc`) réalisée par
l'utilisateur : `SENS-B` (orientation `B`) affiche le haut du contenu du côté
gauche de l'étiquette ; `SENS-R` (orientation `R`) l'a du côté droit. D1 est
verrouillé sur `B`.

## D2 — Mécanique de rotation : orientation par élément, pas de `^FW` global

- **Decision** : chaque élément émis avec son paramètre d'orientation propre :
  code-barres `^BEB` (EAN-13), `^BCB` (Code 128 Emplacement), police `^AEB`
  (OCR-B `^AEN` → `^AEB`). Pas de commande `^FW` en tête d'étiquette.
- **Rationale** : le code actuel pose déjà clairement chaque élément via
  `^FO x,y` et des orientations codées en dur `N` ; changer le littéral
  d'orientation par élément est le delta minimal, sans re-mapping global du
  repère (interactions `^FW`/`^LH`/`^PQ` évitées, comportement stable selon les
  firmwares).
- **Alternatives considerées** : `^FW` global en tête d'étiquette — rejetée
  (change le repère de toutes les coordonnées et le contrat `^FO` pour les
  multi-étiquettes `^PQ`).

**[VALIDÉ]**
`printf '...^XZ\n'` au lieu de `printf '...^XZ'` — les imprimantes ZPL
n'exécutent pas la dernière commande si la ligne n'est pas terminée ; le
here-doc `<<'EOF'` fonctionnait pour cette raison. La convention d'ancre
« inférieur gauche » en `B` est confirmée par le test (les deux étiquettes
SENS-R et SENS-B sont lisibles aux positions attendues).

## D3 — Géométrie rotée : axes de layout échangés, `^PW`/`^LL` inchangés

- **Decision** : le canvas d'impression reste `^PW{largeurDots}^LL{hauteurDots}`
  du format (le support ne bouge pas). En mode roté, `computeBarcodeLayout` est
  appelé avec **axes échangés** : l'axe « longueur du symbole » (= modules du
  code-barres) prend le **côté court** du support en dots, et l'axe « empilage »
  (hauteur des barres + texte) prend le **côté long**.
- **Rationale** : c'est la seule lecture cohérente de FR-002/FR-003 : même
  zone, contenu pivoté, zéro rognage. La géométrie d'origine (module width,
  centrage x, hauteur de barres, position y, texte dessous) reste celle du code
  existant : seul l'appel change (largeur/hauteur échangées). Conséquence
  assumée : le symbole roté est plus fin (module width minimal) car sa longueur
  est bornée par le petit côté.
- **Alternatives considerées** : permuter `^PW`/`^LL` (poser le petit côté en
  `^PW`) — rejetée, cela équivaudrait à recharger le support, contrairement à
  la clarification utilisateur.

## D4 — Faisabilité de la rotation : seuil par module (switch désactivé)

- **Decision** : la rotation est possible pour un format donné si le **côté
  court** en dots suffit au symbole à largeur de module minimale :
  `côtéShortDots ≥ moduleSymboles × moduleWidthMin`, soit côté court ≥
  `moduleSymboles × moduleWidthMin × 25,4 / DPI` (millimètres). Le calcul est
  fait au runtime à partir des constantes de module existantes et de
  `ZPL_RESOLUTION_DPI`.
- **Rationale** : le code écrase déjà `moduleWidth = floor(côtéDots / total)`
  au sein de `[MIN, MAX]` ; le vrai limiteur du symbole est
  `moduleSymboles × MIN`. Le switch étant **global** (les deux modules
  d'impression), le seuil appliqué est le **plus contraignant** des deux
  modules, afin que l'activation ne produise jamais une étiquette illisible.
- **Alternatives considerées** : seuil par module pour le désactivement —
  rejetée (deux états différents selon le module → incohérent, FR-005).

### Seuils à 203 DPI (référence `.env`)

| Module | Constantes (`SYMBOL × MIN`) | Seuil en dots | Seuil en mm @203 dpi |
|--------|----------------------------|---------------|----------------------|
| EAN-13 | 95 × 2 = 190 | 190 dots | ≈ 23,8 mm |
| Emplacement (Code 128) | 79 × 2 = 158 | 158 dots | ≈ 19,8 mm |
| **Seuil global appliqué** | (max des deux) | 190 dots | ≈ 23,8 mm |

Formats courants (`.env`) : 40×25, 75×25, 100×50, 100×150 → côté court
minimal 25 mm ≥ 23,8 mm → **tous les formats actuels sont compatibles**, le
switch reste actif. Le cas désactivé ne survient qu'avec des formats plus
étroits (ex. 20×30 → 20 mm < 23,8 mm).

**[TEST]** — le seuil est exprimé en mm à DPI courante (pas un constant en dur)
: `DPI` vient de `ZPL_RESOLUTION_DPI`.

## D5 — Transport du réglage : champ bookéen `rotated`

- **Decision** : nouveau champ `rotated?: boolean` dans `PrintSettings`
  (cookie), transmis dans le corps des requêtes d'impression
  (`ean13`/`location`), validé strictement (booléen) côté serveur, consommé
  par les builders ZPL.
- **Rationale** : même chemin que `paperId`/`printerAddress` (cookie →
  composant → corps de requête → routes), zéro stockage serveur. Rétro-compatible :
  absent = `false`.
- **Alternatives considerées** : champ `orientation` en minutes — non, le
  besoin est un booléen (sens fixé) ; stockage serveur — rejeté (les réglages
  sont déjà côté navigateur, FR-012).

## D6 — Réinitialisation sur format incompatible (FR-015) et « rotation impossible »

- **Decision** : quand le format sélectionné est incompatible (seuil D4 non
  atteint), le composant expose le switch en `disabled` et force
  `rotated = false` (cookie réécrit sans rotation) ; au retour sur un format
  compatible le switch est réactivé mais reste désoctivé (activation manuelle).
- **Rationale** : conforme à la clarification utilisateur et à FR-013/FR-015 :
  aucune bascule automatique, aucun symbole illisible.
- **Alternatives considerées** : refus d'impression — rejetée (l'utilisateur a
  choisi le désactivement) ; retour auto à la normale pendant l'impression —
  rejetée (état affiché ≠ état effectif).

## D7 — DRY : extraction de la résolution des dimensions

- **Decision** : extraire `dotsFromMm` + `resolveDimensions` (dupliqués dans
  `app/api/print/ean13/route.ts` et `app/api/print/location/route.ts`) dans un
  module unique `lib/zpl/dimensions.ts`, qui prend aussi `rotated` et applique
  l'échange d'axes / la faisabilité.
- **Rationale** : la fonctionnalité exige que la rotation soit décidée au même
  endroit pour les deux routes ; le code actuel est une copie littérale
  (duplication > 2 occurrences → violation DRY latente, constitution II).
- **Alternatives considerées** : garder la duplication et copier la rotée —
  rejetée (fragile, contredit la constitution).

## Référence

- Contrats doc ZPL d'origine : `specs/001-module-ean13/contracts/zpl.md`,
  `specs/008-ean13-centered-barcode/contracts/zpl.md` (orientation `N` en dur,
  invariants `^PW`/`^LL`).
- Code réel : `lib/zpl/layout.ts`, `lib/zpl/build.ts`, `lib/zpl/location.ts`,
  `lib/paper-sizes.ts`, `lib/print-settings.ts`, routes `app/api/print/{ean13,location}/route.ts`.