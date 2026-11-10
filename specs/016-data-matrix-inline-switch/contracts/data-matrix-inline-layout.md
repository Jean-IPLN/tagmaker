# Contrat — Mise en page in-line Data Matrix

**Feature**: 016-data-matrix-inline-switch | **Base** :
[015 data-matrix-barcode.md](../../015-data-matrix-module/contracts/data-matrix-barcode.md)

## Entrée

```ts
interface BuildDataMatrixZplInput {
  content: string;          // 1..200 ASCII imprimable
  legend?: string;          // 0..60 ASCII imprimable, vide = pas de texte
  quantity?: number;
  widthDots: number;
  heightDots: number;
  rotated?: boolean;        // défaut false
  inline?: boolean;         // défaut false ; ignoré si rotated=true
}
```

`dataMatrixFits` reçoit les mêmes champs de disposition et applique exactement
le même calcul que le constructeur.

## Priorité

```text
rotated=true              → disposition pivotée actuelle
sinon inline=true         → disposition in-line
sinon                     → disposition normale actuelle
```

Une légende vide produit le code seul dans tous les modes.

## Géométrie in-line

Constantes : marge `8`, zone de silence `1` module par côté,
`span = dimension + 2`, module `2..8`, hauteur de légende `28..112` par pas de
28, avance `0,52 × hauteur`, espacement `0,15 × hauteur`.

```text
largeurDispo = widthDots − 16
hauteurDispo = heightDots − 16
moduleMax    = clamp(⌊hauteurDispo / span⌋, 2, 8)
```

Pour chaque module décroissant de `moduleMax` à `2`, puis chaque hauteur de
légende décroissante de la valeur désirée (18 % du petit axe, multiple de 28,
plafonnée à 112 et à la hauteur disponible) jusqu'à `28` :

```text
tailleSymbole = dimension × module
largeurTexte  = longueurLégende × round(0,52 × hauteur)
espacement    = round(0,15 × hauteur)
valide        = largeurTexte + espacement ≤ largeurDispo − tailleSymbole
```

La première combinaison valide est retenue. Si aucune ne convient,
`dataMatrixFits` retourne `false` et le constructeur retourne une chaîne vide ;
la route répond `422` avant envoi.

## Placement

```text
blocLargeur = tailleSymbole + espacement + largeurTexte
symboleX    = round((widthDots − blocLargeur) / 2)
symboleY    = round((heightDots − tailleSymbole) / 2)
texteX      = symboleX + tailleSymbole + espacement
texteY      = round((heightDots − hauteur) / 2)
largeurChamp = widthDots − marge − texteX
```

- Symbole toujours carré, centré verticalement.
- Légende sur une ligne, centrée verticalement, alignée à gauche après le code.
- Jamais de troncature : `largeurTexte` doit tenir dans `largeurChamp`.

## Sortie ZPL

Symboles et échappements inchangés :

```text
^XA
^PW<widthDots>^LL<heightDots>
^LH0,0
^FO<symboleX>,<symboleY>^BXN,<module>,200,<dimension>,<dimension>,6,_,1
^FD<contenuÉchappé>^FS
^FO<texteX>,<texteY>^AEN,<hauteur>,<largeurCellule>^FB<largeurChamp>,1,0,L[^FH]^FD<légendeÉchappée>^FS
^PQ<quantity>
^XZ
```

- `^AEN` : texte normal, une ligne, aligné à gauche (`L`).
- `^FH` seulement si la légende contient `^`, `~` ou `_`.
- Sans légende : aucun champ texte, symbole seul centré.
- Aucun `^BY`, aucun `^AEB` en mode in-line normal.
- Séparateur de lignes : `\r\n`.

## Exemple de référence

Entrée : contenu `REF-2026-A17`, légende `Palette 42`, `320 × 200` points,
orientation normale, in-line.

```text
^XA
^PW320^LL200
^LH0,0
^FO19,36^BXN,8,200,16,16,6,_,1
^FDREF-2026-A17^FS
^FO151,86^AEN,28,13^FB161,1,0,L^FDPalette 42^FS
^PQ1
^XZ
```

Le mode actuel (`inline` absent ou faux) doit continuer à produire exactement
la sortie de la feature 015.
