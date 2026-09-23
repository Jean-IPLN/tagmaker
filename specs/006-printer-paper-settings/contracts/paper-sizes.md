# Contrat — Formats de papier

Logique **pure** (testable sans DOM ni réseau) : parsing, validation, tri.

## Variable d'environnement

- `ZPL_PAPER_SIZES` (optionnelle) : liste séparée par des virgules de formats au
  format humain `largeurxlongueur` (mm), ex. `40x25, 50x25, 60x40, 100x50`.
- Absente ou vide → repli sur un unique format dérivé de la taille courante
  (`ZPL_LABEL_WIDTH_MM` × `ZPL_LABEL_HEIGHT_MM`).

## Type

- `PaperSize = { id: string; widthMm: number; heightMm: number; surfaceMm2: number; label: string }`

## `parsePaperSizes(raw, { widthMm, heightMm })`

- **Retour** : liste de `PaperSize` triée par `surfaceMm2` **croissant**
  (FR-011), sans doublon d'`id` ; jamais vide (repli sur le format courant).
- Parsing : découpe sur `,` et `;` (tolérant), trim, chaque format attendu
  `NNNxMMM` (entiers > 0) ; tout élément invalide est écarté silencieusement.
- `id` = `"<largeur>x<longueur>"` normalisé ; `label` = `"<largeur> × <longueur> mm"`.

## `formatIdToSize(id, sizes)` / `sizeById(id, sizes)`

- Association identifiant ⇄ `PaperSize` ; inconnu → `undefined` (le sélecteur
  doit l'ignorer, cf. cookie).

## Exigences couvertes

FR-010 (configurable via env, format humain, défaut = format courant), FR-011
(tri par surface), edge case « format invalide écarté ».