# Phase 1 — Modèle de données : commutateur in-line Data Matrix

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**:
2026-11-06

## 1. Requête d'impression

```ts
interface DataMatrixPrintRequest {
  content: string;          // requis, trim, 1..200, ASCII imprimable
  legend?: string;          // facultatif, trim, 0..60, ASCII imprimable
  quantity: number;         // requis, entier 1..1000
  paperId?: string;         // identifiant de getPaperSizes()
  printerAddress?: string;  // IPv4
  rotated?: boolean;        // défaut false
  inline?: boolean;         // défaut false ; ignoré si rotated=true
}
```

`inline` absent et `inline: false` sont équivalents. Le formulaire n'envoie le
champ que lorsque le commutateur est activé, afin de préserver à l'identique
les payloads existants. Le schéma reste strict : tout autre champ est refusé.

## 2. Règles de validation

| Champ | Règle | Message (premier échec) |
|-------|-------|--------------------------|
| `content` | requis | `Le contenu est requis` |
| `content` | trim puis 1–200 | `Le contenu ne peut pas dépasser 200 caractères` |
| `content` | `^[\x20-\x7E]+$` | `Le contenu ne peut contenir que des caractères ASCII imprimables` |
| `legend` | trim puis 0–60 | `La légende ne peut pas dépasser 60 caractères` |
| `legend` | `^[\x20-\x7E]*$` | `La légende ne peut contenir que des caractères ASCII imprimables` |
| `quantity` | entier 1–1000 | messages `lib/print-options.ts` |
| `paperId` | format connu | `Format de papier inconnu : <id>.` |
| `rotated` | format pivotable | `Format inutilisable en orientation pivotée.` |
| `inline` | booléen si présent | `Le mode d'affichage est invalide` |
| disposition | tient sur le support | `Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format.` |

Les limites de contenu et de légende ne changent pas. `inline` ne crée aucune
règle de validation supplémentaire hors type et tenue.

## 3. Priorité des dispositions

Ordre déterministe :

1. Calculer la dimension ECC200 depuis `content.length`.
2. Si `rotated === true` : appliquer la disposition pivotée actuelle ;
   `inline` est ignoré.
3. Sinon, si `inline === true` et `legend` non vide : appliquer la disposition
   in-line.
4. Sinon : appliquer la disposition normale actuelle.

Sans légende, les modes normal et in-line produisent la même étiquette : le
symbole seul, centré sur les deux axes.

## 4. Mise en page in-line

Constantes réutilisées : marge `8` points, zone de silence `1` module par côté
(`span = dimension + 2`), module `2..8` points, cellule OCR-B `28` points,
hauteur de légende `28..112` points par pas de 28, avance `0,52 × hauteur`,
espacement `0,15 × hauteur`.

```text
largeurDispo  = widthDots − 2 × marge
hauteurDispo  = heightDots − 2 × marge
moduleMax     = clamp(⌊hauteurDispo / span⌋, 2, 8)
hauteurIdéale = clamp(round(0,18 × min(widthDots, heightDots)), 28, 112)
```

Pour chaque module de `moduleMax` à `2` (ordre décroissant) :

```text
tailleSymbole = dimension × module
largeurRestante = largeurDispo − tailleSymbole
```

Pour chaque hauteur de légende de `hauteurIdéale` à `28` (pas de 28) :

```text
avance       = round(0,52 × hauteurLégende)
largeurTexte = longueurLégende × avance
espacement   = round(0,15 × hauteurLégende)
valide       = largeurTexte + espacement ≤ largeurRestante
```

La première combinaison valide est retenue. Si aucune ne convient, la mise en
page est invalide (`422`), jamais tronquée ni déformée. Le choix privilégie le
plus grand symbole, puis la plus grande hauteur de légende compatible.

Placement retenu :

```text
symboleX      = round((widthDots − (tailleSymbole + espacement + largeurTexte)) / 2)
symboleY      = round((heightDots − tailleSymbole) / 2)
texteX        = symboleX + tailleSymbole + espacement
texteY        = round((heightDots − hauteurLégende) / 2)
largeurChamp  = widthDots − marge − texteX
```

Le texte est aligné à gauche dans `largeurChamp` ; le symbole et la ligne de
légende sont centrés verticalement. Le symbole reste carré.

## 5. Limites observables

Longueur maximale de légende acceptée en in-line, avec le contenu indiqué
(plafond de saisie : 60) :

| Format (points) | Contenu 1 | Contenu 12 | Contenu 200 |
|-----------------|----------:|-----------:|------------:|
| 40 × 25 (320×200) | 18 | 17 | 13 |
| 75 × 25 (600×200) | 37 | 36 | 31 |
| 100 × 50 (800×400) | 50 | 49 | 45 |
| 100 × 150 (800×1200) | 50 | 49 | 45 |

La largeur du support est le facteur limitant pour les légendes longues. Une
légende de 60 caractères est donc refusée en in-line sur les formats standards,
même en 100 × 150, avec le message de tenue existant.

## 6. Flux et états

1. Formulaire : `isInline = false` à l'ouverture.
2. L'utilisateur bascule le commutateur ; l'état reste local, sans cookie ni
   réglage partagé.
3. Validation client avec le schéma partagé ; premier message en toast, aucun
   appel réseau si invalide.
4. `quantity > 2` : dialogue de confirmation ; l'état du commutateur est
   conservé et le payload est construit à la confirmation.
5. `POST /api/print/data-matrix` avec `inline: true` uniquement si activé ;
   validation du type, dimensions, priorité pivoté/in-line, contrôle de tenue,
   verrou, génération ZPL et envoi.
6. Succès `200 { status: "sent", labels }` ; erreurs `409`/`422`/`503` selon le
   pipeline commun. Aucune donnée persistée.

## 7. Entités

- **Contenu** : 1–200 caractères ASCII imprimables, casse conservée.
- **Légende** : 0–60 caractères ASCII imprimables, casse conservée, vide
  autorisé.
- **Disposition** : mode actuel ou in-line ; valeur propre à l'impression,
  non persistée.
- **Impression Data Matrix** : contenu, légende, quantité, disposition.
- **Réglages partagés** : papier, orientation, imprimante ; inchangés.
