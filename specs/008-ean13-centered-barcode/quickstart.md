# Quickstart — Code-barres EAN-13 centré et pleine échelle (Feature 008)

## Vérification en 5 minutes

1. **Lancer la validation du feature** (gate inchangé) :

   ```bash
   npm run lint && npm run tsc && npm test && npm run build
   ```

   → Vérifier que les tests `lib/zpl/__tests__/build.test.ts` couvrent le
   nouveau layout (redimensionnement par format, centrage, zones de silence)
   et que tout est vert.

2. **Inspecter le flux produit** (ex. `40x25` : 320×200 dots) :

   ```zpl
   ^XA
   ^PW320^LL200
   ^LH0,0
   ^BY2,3,155
   ^FO65,10^BEN,155,Y,N
   ^FD590123412345^FS
   ^PQ5
   ^XZ
   ```

   - `^BY2,…` : module 2 dots = X 0.25 mm (sur 40 mm de large).
   - `^FO65,10` : marges gauche/droite égales (65 dots ≈ 8.1 mm) et haut/bas
     égales = 5 % de la hauteur (10 dots ≈ 1.3 mm sur 40×25) autour du bloc
     bars+chiffres.
   - `^BEN,155,Y,N` : barres de 155 dots, chiffres lisibles dessous.

3. **Impression réelle — contrôle visuel** (si imprimante connectée) :

   - Imprimer successivement les formats `40x25`, `75x25`, `100x50`,
     `100x150` avec le même code `5901234123457`.
   - Vérifier : marges latérales égales sur chaque étiquette ; bloc
     (barres + chiffres) centré verticalement ; code plus grand sur les
     formats plus grands (jamais un petit symbole isolé au centre).
   - Scanner chaque étiquette : lecture OK quel que soit le format.

4. **Changement de quantité** : une impression avec `quantity = 3` doit
   produire 3 étiquettes identiques et centrées (`^PQ3` inchangé).

## Critères d'acceptation en une phrase

Un code plus grand sur un format plus grand, centré dans les deux axes avec
marges égales (à ±1 dot), lisibles au scanner pour tous les formats.

## Valeurs attendues par format (pour comparaison rapide)

| Format | `^BY` module | `^FO` x | `^FO` y | Hauteur barres | Bloc couvert |
|--------|-------------:|--------:|--------:|---------------:|-------------:|
| `40x25` | 2 | 65 | 10 | 155 | 90.0 % |
| `75x25` | 5 | 63 | 10 | 155 | 90.0 % |
| `100x50`| 5 | 163 | 20 | 335 | 90.0 % |
| `100x150`| 5 | 163 | 60 | 1055 | 90.0 % |

## Limites connues

- Sur tout format ≥ 75 mm de large (`75x25`, `100x50`, `100x150`), le module
  est **plafonné à 5 dots** (0.625 mm, max GS1) : le symbole n'occupe pas
  toute la largeur — choix de scannabilité.
- La bande de chiffres lisibles est estimée à 25 dots ; une calibration fine
  (constante `TEXT_HEIGHT_DOTS`) sera possible au premier rendu sur le modèle
  d'imprimante ciblé — le centrage reste symétrique dans tous les cas.