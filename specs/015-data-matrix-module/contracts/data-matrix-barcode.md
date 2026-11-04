# Contrat — Encodage et rendu Data Matrix

**Feature**: 015-data-matrix-module | **Consommateurs** : `lib/zpl/data-matrix.ts`,
route `/api/print/data-matrix`

## Entrée

```ts
interface BuildDataMatrixZplInput {
  content: string;          // 1..200 ASCII imprimable (validé en amont)
  legend?: string;          // 0..60 ASCII imprimable, vide = pas de texte
  quantity?: number;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;        // défaut false
}
```

Le constructeur ne valide pas les données : il suppose la requête acceptée
par le schéma et le contrôle de tenue déjà passés.

## Encodage

- Symbologie **Data Matrix ECC200**, symbole **carré** (`a = 1`).
- Commande : `^BX<orientation>,<module>,200,<colonnes>,<lignes>,6,_,1`.
  - `module` : `clamp(⌊min(largeurDispo, hauteurDispo) / (dimension + 2)⌋, 2, 8)`.
  - `colonnes = lignes = dimension` si `dimension ≤ 48`, sinon `0`.
- Dimension = plus petit carré ECC200 dont la capacité en octets couvre le
  contenu (table dans `data-model.md`).
- Échappement du contenu (séquences `^BX`, sans `^FH`) :
  - `_` → `__` ;
  - `^` → `_d094` ;
  - `~` → `_d126`.
- Légende : champ texte séparé OCR-B, échappement `escapeTextData`
  (`^`→`_5E`, `~`→`_7E`, `_`→`_5F`), `^FH` émis seulement si nécessaire.

## Sortie ZPL — orientation normale

```text
^XA
^PW<widthDots>^LL<heightDots>
^LH0,0
^FO<symX>,<symY>^BXN,<module>,200,<dim>,<dim>,6,_,1
^FD<escapedContent>^FS
^FO0,<textY>^AEN,<legendHeight>,<wCell>^FB<widthDots>,1,0,C[^FH]^FD<escapedLegend>^FS
^PQ<quantity>
^XZ
```

## Sortie ZPL — orientation pivotée

```text
^XA
^PW<widthDots>^LL<heightDots>
^LH0,0
^FO<symX>,<symY>^BXB,<module>,200,<dim>,<dim>,6,_,1
^FD<escapedContent>^FS
^FO<textX>,0^AEB,<legendHeight>,<wCell>^FB<heightDots>,1,0,C[^FH]^FD<escapedLegend>^FS
^PQ<quantity>
^XZ
```

- Séparateur de lignes : `\r\n`.
- Sans légende : le champ texte et son `^FB` sont omis ; le symbole reste
  centré sur le support.
- `^PQ` présent uniquement lorsque `quantity` est fourni.
- Aucun `^BY`, aucun `^FH` sur le contenu Data Matrix.

## Tenue

```ts
dataMatrixFits({ content, legend, widthDots, heightDots, rotated }): boolean
```

`false` si le module minimal (2 points) ou le bloc symbole + légende ne tient
pas, ou si la légende ne tient pas à la hauteur OCR-B minimale. Le constructeur
ne lève pas d'erreur : la route refuse avant construction.

## Garanties

- Symbole toujours carré, jamais étiré.
- Légende jamais tronquée : le contrôle de tenue refuse en amont.
- Le contenu scanné doit restituer exactement la chaîne saisie, y compris
  `^`, `~` et `_`.
