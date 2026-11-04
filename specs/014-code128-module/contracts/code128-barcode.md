# Contrat — Encodage et rendu Code 128

**Feature**: 014-code128-module | **Consommateurs** : `lib/zpl/code128.ts`,
route `/api/print/code128`, module Emplacement (adaptateur)

## Entrée

```ts
interface BuildCode128ZplInput {
  codes: string[];          // 1..N contenus, même longueur
  quantity?: number;        // appliqué à l'étiquette unique (codes.length === 1)
  widthDots: number;        // largeur du média (points)
  heightDots: number;       // hauteur du média (points)
  rotated?: boolean;        // défaut false
}
```

Préconditions (validées en amont) : chaque contenu est un ASCII imprimable
non vide. Le constructeur ne valide pas le contenu ; il suppose la requête
déjà acceptée par le schéma.

## Encodage

- Code 128 **sous-ensemble B**, sans caractère de sélection de jeu.
- Symboles : `11 × n + 35` modules ; zone de silence `20` modules
  (10 de chaque côté). Total : `11 × n + 55`.
- Commande : `^BCN,<barHeight>,N,N,N` (HRI désactivée, pas de champ
  d'interprétation), texte OCR-B ajouté séparément en `^AEN` (normal) ou
  `^AEB` (pivoté).
- Largeur de module : `clamp(⌊axeCode / totalModules⌋, 2, 8)`.

## Tenue (« fits »)

```ts
maxCode128Length({ widthDots, heightDots, rotated }): number
code128Fits(content, { widthDots, heightDots, rotated }): boolean
```

`maxCode128Length` = `min(80, ⌊(axeCode / 2 − 55) / 11⌋, ⌊(axeTexte − 20) / 15⌋)`
avec `axeCode = axeTexte = widthDots` en normal, `heightDots` en pivoté.

Le constructeur ne lève pas d'erreur : c'est l'appelant (route) qui refuse
avant construction. Pour un contenu accepté, le texte OCR-B est borné en
hauteur afin de ne jamais dépasser l'axe disponible.

## Sortie ZPL

Étiquette unique (normal) :

```text
^XA
^PW<widthDots>^LL<heightDots>
^LH0,0
^BY<moduleWidth>,3,<barHeight>
^FO<x>,<y>^BCN,<barHeight>,N,N,N
^FD<escapedContent>^FS
^FO0,<yText>^AEN,<textHeight>,<wCell>^FB<widthDots>,1,0,C[^FH]^FD<escapedText>^FS
^PQ<quantity>
^XZ
```

- Séparateur de lignes : `\r\n`.
- Échappement barcode (sous-ensemble B) : `>` → `>0`, `^` → `><`,
  `~` → `>=` ; sans quoi ces caractères sont interprétés comme codes
  d'invocation ZPL et disparaissent du code-barres.
- Échappement texte : `^` → `_5E`, `~` → `_7E`, `_` → `_5F`, avec
  `^FH` émis uniquement lorsque l'échappement est nécessaire.
- Centrage du texte délégué à l'imprimante via `^FB` (bloc de largeur
  `widthDots` en normal, `heightDots` en pivoté, justification `C`) :
  plus de dépendance à une estimation de l'avance OCR-B.
- Bloc centré verticalement (90 % de la hauteur), code centré
  horizontalement, texte centré sous le code.
- `^PQ` présent uniquement pour une étiquette unique avec quantité.
- En pivoté : `^BCB` / `^AEB`, marges de 10 points, axes longs/shorts
  inversés comme dans le module Emplacement.

## Garanties de non-régression

- Pour `codes.length === 1` et `n === 4`, la sortie est identique à
  l'actuelle `buildLocationZpl` (tests `lib/zpl/__tests__/location.test.ts`).
- Aucun `^CF`, aucun `^FH`, aucun `^BCR`.
