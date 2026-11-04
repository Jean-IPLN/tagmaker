# Phase 1 — Modèle de données : module Data Matrix

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-31

## 1. Requête d'impression

```ts
interface DataMatrixPrintRequest {
  content: string;          // requis, trim, 1..200, ASCII imprimable
  legend?: string;          // facultatif, trim, 0..60, ASCII imprimable
  quantity: number;         // requis, entier 1..1000
  paperId?: string;         // identifiant de getPaperSizes()
  printerAddress?: string;  // IPv4
  rotated?: boolean;        // défaut false
}
```

Champs inconnus refusés (`strict`). `legend` absent ou vide est normalisé en
chaîne vide : aucun champ texte n'est alors émis.

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
| contenu + légende | tient sur le support | `Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format.` |

La casse et les espaces internes sont conservés ; les espaces de début et de
fin sont ignorés.

## 3. Taille du symbole ECC200

Le plus petit symbole carré dont la capacité en octets couvre la longueur du
contenu :

| Modules | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 32 | 36 | 40 | 44 | 48 | 52 | 64 |
|---------|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Capacité (octets) | 3 | 5 | 8 | 12 | 18 | 22 | 30 | 36 | 44 | 62 | 86 | 114 | 144 | 174 | 204 | 280 |

Exemples : `REF-2026-A17` (12) → 16×16 ; 50 caractères → 32×32 ;
120 caractères → 44×44 ; 200 caractères → 52×52.

Le symbole est forcé à cette dimension via `c = r = dimension` lorsque la
valeur est ≤ 48 ; au-delà, `c = r = 0` laisse l'imprimante choisir (ZPL ignore
les valeurs > 49). La dimension prédite sert alors au placement.

## 4. Mise en page

Constantes : marge `8` points, zone de silence `1` module par côté
(`span = dimension + 2`), module `2..8` points, cellule OCR-B `28` points,
hauteur de légende `28..112` points, ratio d'avance `0,52`, espacement
symbole/légende `15 %` de la hauteur de légende.

```text
dimension     = plus petit ECC200 carré couvrant content.length
hauteurTexte  = 0 si légende vide, sinon arrondi au multiple de 28 qui tient
                sur l'axe de texte (sinon : ne tient pas)
module        = clamp(⌊min(largeurDispo, hauteurDispo) / (dimension + 2)⌋, 2, 8)
tailleSymbole = dimension × module
```

- **Normal** : `largeurDispo = widthDots − 2×marge`,
  `hauteurDispo = heightDots − 2×marge − hauteurTexte − espacement` ;
  symbole centré horizontalement au-dessus de la légende, légende en
  `^FB<widthDots>,1,0,C`.
- **Pivoté** : `largeurDispo = widthDots − 2×marge − hauteurTexte − espacement`,
  `hauteurDispo = heightDots − 2×marge` ; légende à droite du symbole, en
  `^FB<heightDots>,1,0,C`.
- Le bloc `symbole + espacement + légende` est centré sur le support.
- Si `module < 2` ou si le bloc dépasse le support, la requête est refusée
  (`422`), jamais tronquée ni déformée.

## 5. Limites par format (légende à taille minimale)

Longueur maximale de légende à 28 points de haut (plafond de saisie : 60) :

| Format (points) | Normal | Pivoté |
|-----------------|-------:|-------:|
| 40 × 25 (320×200) | 20 | 12 |
| 75 × 25 (600×200) | 38 | 12 |
| 100 × 50 (800×400) | 52 | 25 |
| 100 × 150 (800×1200) | 52 | 60 |

La contrainte réelle combine contenu et légende : `dataMatrixFits` calcule la
mise en page complète et refuse si le module minimal ne suffit pas. Le
plafond de 200 caractères de contenu reste un garde-fou de saisie.

## 6. Flux et états

1. Saisie client → validation par le même schéma que le serveur ; premier
   message en toast, aucun appel réseau.
2. Aucune imprimante dans le cookie → toast et arrêt, aucun envoi.
3. `quantity > 2` → dialogue de confirmation ; annulation = aucun envoi.
4. `POST /api/print/data-matrix` → validation Zod, dimensions, contrôle de
   tenue, verrou, génération ZPL, envoi.
5. Succès `200 { status: "sent", labels }` ; erreurs `409`/`422`/`503` selon
   le pipeline commun.

Aucune donnée persistée ; le cookie de réglages existant reste la seule
source de vérité pour papier/orientation/imprimante.

## 7. Entités

- **Contenu** : 1–200 caractères ASCII imprimables, casse conservée.
- **Légende** : 0–60 caractères ASCII imprimables, casse conservée, vide
  autorisé.
- **Impression Data Matrix** : contenu, légende, quantité.
- **Réglages partagés** : papier, orientation, imprimante.
- **Module** : `data-matrix`, nom `Data Matrix`, `/data-matrix`.
