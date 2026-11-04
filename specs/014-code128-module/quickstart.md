# Quickstart — module Code 128

**Feature**: 014-code128-module | **Prérequis** : Node/npm installés,
imprimante ZPL joignable ou adresse saisie dans les réglages

## Démarrage

```sh
npm install
npm run dev
```

Ouvrir `http://localhost:3000` (ou l'URL LAN du service systemd), puis
« Code 128 » dans la barre latérale (`/code128`).

## Scénario 1 — impression nominale

1. Saisir `PALETTE-42`, quantité `1`, choisir un format (ex. 40 × 25 mm).
2. Cliquer « Imprimer ».
3. Attendu : toast « Impression envoyée (1 étiquette) » ; étiquette
   Code 128 avec le texte OCR-B sous les barres.

Vérification directe de l'API (adresse de l'imprimante requise) :

```sh
curl -s -X POST http://localhost:3000/api/print/code128 \
  -H 'content-type: application/json' \
  -d '{"content":"PALETTE-42","quantity":1,"printerAddress":"192.168.1.50"}'
# → {"status":"sent","labels":1}
```

## Scénario 2 — confirmation au-delà de 2

1. Quantité `5`, cliquer « Imprimer ».
2. Attendu : dialogue « Imprimer 5 étiquettes ? ».
3. « Confirmer » → toast de succès ; « Annuler » → aucun envoi.

## Scénario 3 — rejets de saisie

| Saisie | Attendu |
|--------|---------|
| vide / espaces | « Le contenu est requis » |
| `Café` | « Le contenu ne peut contenir que des caractères ASCII imprimables » |
| 81 caractères | « Le contenu ne peut pas dépasser 80 caractères » |
| quantité `0` ou `1001` | message de quantité existant |
| `ABCDEFGHIJ` (10 car.) en 40 × 25 mm | 422 « Le contenu ne tient pas sur ce format (9 caractères max). » |

La limite dépend du format et de l'orientation (voir
[data-model.md](./data-model.md#4-limites-de-longueur-par-format-dérivées-calculées-serveur)).

## Scénario 4 — garde-fou imprimante

1. Réglages : aucune imprimante sélectionnée.
2. Cliquer « Imprimer ».
3. Attendu : toast « Aucune imprimante sélectionnée… », aucun appel réseau.

## Scénario 5 — orientation pivotée

1. Format 40 × 25 mm, orientation pivotée, contenu `1A2B` (≤ 4 caractères).
2. Attendu : succès, code-barres et texte le long du grand côté.
3. Contenu de 5 caractères → 422 avec « 4 caractères max ».

## Scénario 6 — impression concurrente

Lancer deux requêtes simultanées sur `/api/print/code128` : l'une reçoit
`200`, l'autre `409 PRINT_IN_PROGRESS` (verrou libéré après la première).

## Scénario 7 — non-régression

- `/ean13` et `/emplacement` fonctionnent comme avant (garde-fou,
  confirmation, plages, rotation).
- Le module Emplacement imprime toujours `1A5B` à l'identique (flux ZPL
  inchangé pour 4 caractères).

## Vérifications automatiques

```sh
npm test                 # suite vitest (dont tests shell d'installation)
npm run test:coverage    # couverture > 80 %
npm run lint
npx tsc --noEmit
```

Attendu : tout vert, aucun warning.
