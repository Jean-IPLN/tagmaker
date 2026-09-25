# Modèle de données — Plages multiples (Feature 010)

Aucune entité persistante : l'ensemble de plages est un **état de formulaire**
(validation → concaténation des codes → flux ZPL → envoi). Ce document étend
`specs/009-module-emplacement/data-model.md` : la **plage unique** devient une
**liste de plages**, chaque plage conservant les règles de la feature 009.

## Types métier

| Type | Définition | Rôle |
|------|------------|------|
| `CodeEmplacement` | chaîne de **4 caractères** conforme à la nomenclature (009) | étiquette à imprimer |
| `TypeEmplacement` | `"classic"` \| `"dynamic"` (inchangé) | type global de l'ensemble |
| `RangePair` | `{ startCode, endCode }` — deux codes valides, cohérents | une plage (règles 009) |
| `RangeRow` | `{ id, startCode, endCode }` — `RangePair` + identifiant stable | état UI d'une ligne de plage |
| `LocationRequest` | union discriminée sur `mode` (voir `contracts/api.md`) | requête validée de la route |
| `LocationCodes` | `string[]` = concaténation des expansions de **toutes** les plages | entrée unique du build ZPL |

## Règles de plage — par paire (extension du calcul 009 en « boîte »)

Chaque `RangePair` est validée indépendamment. Le calcul des codes étend la
plage 009 (une colonne de sous-positions) à une **boîte** multi-axes :

1. Les deux codes sont valides pour le `TypeEmplacement` global ;
2. Les bornes **partagent la même zone** (premier caractère `1` ou `2`) ;
3. Sur chaque axe (espace `A-Z`, position `1-9` puis `A-Z`, sous-position
   `0-9` puis `A-Z`), le caractère de **début ≤ celui de fin** (ordre par axe) ;
4. Taille = produit sur les axes de `rang(fin) − rang(début) + 1`
   `≤ MAX_RANGE_SIZE` (1000) — ex. `1B10 → 1D45` = 3 (espaces) × 4 (positions)
   × 6 (sous-positions) = 72 ;
5. Expansion : combinaison des caractères de chaque axe entre les extrêmes,
   dans l'ordre espace → position → sous-position (« boîte » — ex. `1B10 →
   1D45` génère `1B10–1B15`, `1B20–1B25`… `1B45`, puis `1C…`, jusqu'à
   `1D…45`) ; en Dynamique la boîte est réduite au seul axe de sous-position
   (`x#D` fixe).

Deux plages voisines n'ont **pas de contrainte de plage à plage** : bornes
différentes autorisées (y compris des **zones différentes** — chaque plage est
un lot indépendant, comme plusieurs impressions distinctes groupées), chevauche
ments/doublons **autorisés** (chaque plage fournit ses propres étiquettes ; le
total est la somme — YAGNI). En revanche, **au sein** d'une plage les bornes
(début ↔ fin) partagent la **même zone** (`1` ou `2`).

## Limites de l'ensemble (nouvelles)

| Constante | Valeur | Sens |
|-----------|-------:|------|
| `MAX_RANGES` | 10 | nombre maximal de plages dans l'ensemble (bouton « + » inopérant au-delà) |
| `MIN_RANGES` | 1 | le formulaire conserve toujours au moins une plage |
| `MAX_TOTAL_LABELS` | 1000 | **somme** des tailles de toutes les plages (limite partagée avec la quantité) |

Invariants : `1 ≤ ranges.length ≤ 10`, `Σ rang_taille(plage) ≤ 1000`,
`rang_taille(plage) ≤ 1000`, **les bornes de chaque plage partagent la même
zone** (`1`/`2`), les zones **peuvent différer entre plages** (lots indépendants).

## Ordre d'impression

Les plages sont imprimées **dans l'ordre d'affichage** (de haut en bas). Le
tableau `LocationCodes` est la concaténation des expansions, plage par plage,
dans cet ordre — déterminisme garanti (aucun tri, aucune déduplication).

## Flux de données (résolution serveur → ZPL)

```text
request (range multi)
   │  ranges: [{startCode, endCode}, …]
   ▼
validation Zod : chaque RangePair (règles 009) + limites d'ensemble
   ▼
expansion : for each plage → expandRange(...) ; LocationCodes = concat(all)
   │                                     (sum lengths = labels)
   ▼
buildLocationZpl({ codes, widthDots, heightDots })        // INCHANGÉ (009)
   │
flux ZPL ^XA…^XZ (1 bloc/code)  →  sendToPrinter(zpl, target)   // INCHANGÉ
```

Mode **Un seul** : strictement inchangé (code + quantité → `[code]`).

## Invariants vérifiés par test

1. Toute paire invalide (type, zone, ordre par axe, taille) rejette
   **l'ensemble** avec un message désignant la plage (chemin `ranges[i]` →
   « Plage N ») ;
2. `ranges` vide ou > `MAX_RANGES` → rejet ;
3. `labels` renvoyé = **exactement la somme** des tailles des plages validées ;
4. L'ordre des codes dans le flux suit l'ordre d'affichage des plages
   (1ʳᵉ plage d'abord), vérifiable au scanner ;
5. ZPL généré identique, quelle que soit la découpe en plages, pour un même
   ensemble de codes (aucune régression du contrat ZPL 009) ;
6. Des plages de **zones différentes** sont acceptées (lots indépendants),
   chaque plage restant homogène (même zone entre ses bornes).