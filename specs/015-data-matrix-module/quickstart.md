# Quickstart — module Data Matrix

**Feature**: 015-data-matrix-module | **Prérequis** : Node/npm installés,
imprimante ZPL joignable ou adresse saisie dans les réglages

## Démarrage

```sh
npm install
npm run dev
```

Ouvrir `http://localhost:3000` (ou l'URL LAN du service systemd), puis
« Data Matrix » dans la barre latérale (`/data-matrix`).

## Scénario 1 — impression nominale avec légende

1. Contenu `REF-2026-A17`, légende `Palette 42`, quantité `1`, format
   40 × 25 mm.
2. Cliquer « Imprimer ».
3. Attendu : toast « Impression envoyée (1 étiquette) » ; étiquette avec un
   Data Matrix carré centré et la légende OCR-B lisible sous le code.

Vérification directe de l'API (adresse de l'imprimante requise) :

```sh
curl -s -X POST http://localhost:3000/api/print/data-matrix \
  -H 'content-type: application/json' \
  -d '{"content":"REF-2026-A17","legend":"Palette 42","quantity":1,"printerAddress":"192.168.1.50"}'
# → {"status":"sent","labels":1}
```

Scanner l'étiquette : le lecteur doit restituer exactement
`REF-2026-A17` (sans la légende, qui n'est pas encodée).

## Scénario 2 — sans légende

1. Contenu `12345678`, légende vide, quantité `1`.
2. Attendu : le code seul, carré et centré ; aucun texte imprimé.

## Scénario 3 — caractères spéciaux

1. Contenu `A_B^C~D`, légende `Lot_5^A~B`, quantité `1`.
2. Attendu : aucune erreur ; le scan restitue exactement `A_B^C~D` et la
   légende s'imprime littéralement.

## Scénario 4 — confirmation au-delà de 2

1. Quantité `5`, cliquer « Imprimer ».
2. Attendu : dialogue « Imprimer 5 étiquettes ? ».
3. « Confirmer » → toast de succès ; « Annuler » → aucun envoi.

## Scénario 5 — rejets de saisie

| Saisie | Attendu |
|--------|---------|
| contenu vide / espaces | « Le contenu est requis » |
| contenu `Café` | « Le contenu ne peut contenir que des caractères ASCII imprimables » |
| contenu de 201 caractères | « Le contenu ne peut pas dépasser 200 caractères » |
| légende de 61 caractères | « La légende ne peut pas dépasser 60 caractères » |
| légende `Café` | message ASCII imprimable pour la légende |
| quantité `0` ou `1001` | message de quantité existant |
| contenu de 200 caractères + légende de 60 en 40 × 25 mm | 422 « Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format. » |

Les limites exactes dépendent du format et de l'orientation ; voir
[data-model.md](./data-model.md#5-limites-par-format-légende-à-taille-minimale).

## Scénario 6 — garde-fou imprimante

1. Réglages : aucune imprimante sélectionnée.
2. Cliquer « Imprimer ».
3. Attendu : toast « Aucune imprimante sélectionnée… », aucun appel réseau.

## Scénario 7 — orientation pivotée

1. Format 40 × 25 mm, orientation pivotée, contenu `1A2B`, légende `Zone A`
   (≤ 12 caractères).
2. Attendu : succès ; symbole carré centré, légende le long du grand côté.
3. Légende de 13 caractères → 422 avec le message de tenue.

## Scénario 8 — impression concurrente

Lancer deux requêtes simultanées sur `/api/print/data-matrix` : l'une reçoit
`200`, l'autre `409 PRINT_IN_PROGRESS` (verrou libéré après la première).

## Scénario 9 — non-régression

- `/ean13`, `/emplacement` et `/code128` fonctionnent comme avant.
- Le module Emplacement imprime toujours `1A5B` à l'identique.
- L'ajout Data Matrix est visible dans la galerie et les modules récents.

## Vérifications automatiques

```sh
npm test                 # suite vitest (dont tests shell d'installation)
npm run test:coverage    # couverture > 80 %
npm run lint
npx tsc --noEmit
npm run build
```

Attendu : tout vert, aucun warning.

## Vérification ZPL hors matériel (facultatif)

Le rendu peut être contrôlé via Labelary (8 dpmm) :

```sh
printf '^XA\n^PW320^LL200\n^LH0,0\n^FO100,40^BXN,4,200,20,20,6,_,1\n^FDHELLO_DM^FS\n^XZ' \
  | curl -s -X POST 'http://api.labelary.com/v1/printers/8dpmm/labels/1.5748x0.9843/0/' \
      -H 'Accept: image/png' --data-binary @- -o /tmp/dm.png
```

Attendu : un symbole carré de 80 × 80 points à l'origine (100,40).
Le scan réel reste à valider sur l'imprimante cible.
