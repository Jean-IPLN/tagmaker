# Quickstart — Validation de la feature « Plages multiples » (010)

Guide d'exécution pour prouver **bout-en-bout** que plusieurs plages
d'emplacements s'impriment en une seule opération, avec le rendu demandé
(lignes + `Separator`, « + » et poubelle Phosphor). Détails des règler
dans [data-model.md](data-model.md) et des contrats dans
[contracts/](contracts/).

## Prérequis

- Projet installé : `npm install` à la racine.
- Branche dédiée créée avant toute modification : `feature/010-multi-range-print`
  (constitution).
- Suite existante verte avant travail : `npm test` (272 tests).

## 1. Validation statique et testable (sans imprimante)

```bash
npm run lint       # ESLint : 0 erreur, 0 warning
npx tsc --noEmit   # TypeScript : 0 erreur
npm test           # Vitest : suite complète verte (guide existant + nouveaux tests)
npm run build      # next build : vert
```

**Résultats attendus**

- Nouveaux tests **validation** (`lib/location/__tests__/validate.test.ts`) :
  schéma `ranges` (1..10), paire invalide → rejet « Plage N », somme ≤ 1000,
  `expandRanges` concatène dans l'ordre.
- Nouveaux tests **route** (`app/api/print/location/__tests__/route.test.ts`) :
  POST multi-plages → `200 { labels: somme }` ; paire invalide → `422` ;
  `ranges` vide → `422` ; 409/503 inchangés.
- Nouveaux tests **composant** (`components/__tests__/location-form.test.tsx`) :
  ajout d'une plage (« + »), suppression (poubelle), minimum une plage,
  plafond 10 plages, `Separator` entre les lignes, dynamique `#D` fixée
  par ligne, total cumulé dans la modal (> 2).

## 2. Vérification API (mock réseau, sans imprimante)

Si nécessaire, émuler un POST avec une requête HTTP locale (`curl`), en
mockant l'envoi réseau préalablement (le code d'envoi se situe dans
`lib/printer/send` ; une imprimante réelle n'est requise qu'en §3) :

```bash
curl -s -X POST http://localhost:3000/api/print/location \
  -H 'content-type: application/json' \
  -d '{"mode":"range","locationType":"classic",
       "ranges":[{"startCode":"1A10","endCode":"1A12"},
                 {"startCode":"1B10","endCode":"1B15"}]}'
```

**Résultat attendu** : `200 { "status": "sent", "labels": 8 }` (3 + 5).

Invalide (bornes de zones différentes dans une même plage) :

```bash
curl -s -X POST http://localhost:3000/api/print/location \
  -H 'content-type: application/json' \
  -d '{"mode":"range","locationType":"classic",
       "ranges":[{"startCode":"1A10","endCode":"2A10"}]}'
```

**Résultat attendu** : `422` avec un message « Plage 1 : … même zone (1 ou 2) ».
(sur une machine avec imprimante réelle : `labels` = somme des étiquettes
reçues à l'imprimante.)

Note : une plage **traversant espaces/positions est valide** (`1A10 → 1B10`
produit 2 étiquettes, `1A10 → 1A21` en produit 4 — la boîte bornée par les
extrêmes) ; seule l'inversion d'un axe (ex. `1A19 → 1A21`, sous-position
`9` > `1`) ou un mélange de zones/d'axes internes est refusé.

Valide (plages de zones différentes — lots indépendants) :

```bash
curl -s -X POST http://localhost:3000/api/print/location \
  -H 'content-type: application/json' \
  -d '{"mode":"range","locationType":"classic",
       "ranges":[{"startCode":"1A10","endCode":"1A12"},
                 {"startCode":"2B10","endCode":"2B14"}]}'
```

**Résultat attendu** : `200 { "status": "sent", "labels": 8 }` (3 + 5) — les
plages peuvent couvrir des zones `1` et `2` distinctes en un seul envoi.

## 3. Validation utilisateur (imprimante réelle, 203 dpi)

1. `npm run dev` → ouvrir **Emplacement**.
2. **Mode Plage** (interrupteur) : une ligne « Plage 1 » apparaît
   (début/fin segmentés, poubelle).
3. Cliquer **« + Ajouter une plage »** : « Plage 2 » apparaît, séparée par un
   `Separator`, avec sa poubelle.
4. Saisir Plage 1 = `1#D0` → `1#D2` et Plage 2 = `1#D3` → `1#D7` (basculer le
   type en **Dynamique** : les cases `#` et `D` sont figées), puis **Imprimer**.
5. **Attendu** : modal « Imprimer 8 étiquettes ? » (total cumulé 3 + 5) ;
   après **Confirmer**, 8 étiquettes sortent (3 × `1#Dx` puis 5 × `1#Dx`),
   chaque code scannable et affiché en clair.
6. Supprimer Plage 1 (poubelle) : seule Plage 2 reste ; imprimer → 5
   étiquettes, sans modal si total ≤ 2.
7. Rendre Plage 2 invalide (inversion d'un axe, ex. `1#D9` → `1#D2`) →
   l'impression est refusée, message **« Plage 2 : … »**, aucune étiquette.

**Critères de succès couverts** : SC-001 (impression multi en une action),
SC-003 (somme exacte au scanner), SC-004 (rejet d'ensemble invalide),
SC-005 (minimum une plage).