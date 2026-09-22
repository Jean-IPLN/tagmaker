# Guide de validation rapide — Module EAN-13

Scénarios de validation de bout en bout. Détails de contrat :
[contracts/web-api.md](./contracts/web-api.md) et
[contracts/zpl.md](./contracts/zpl.md), modèle : [data-model.md](./data-model.md).

## Prérequis

- Next.js scaffoldé, shadcn/ui appliqué avec le preset (voir implémentation).
- Un `.env` local contenant :
  - `ZPL_PRINTER_HOST=192.168.1.63`
  - `ZPL_PRINTER_PORT=9100`
  - `ZPL_LABEL_WIDTH_MM=40`, `ZPL_LABEL_HEIGHT_MM=25`, `ZPL_RESOLUTION_DPI=203`
- Une imprimante ZPL joignable sur `192.168.1.63` (port 9100) avec le rouleau
  40 × 25 mm chargé.
- Tests unitaires : `npm test` ; exécution app : `npm run dev`.

## Scénario A — Impression sans confirmation (quantité ≤ 2)

1. `npm run dev`, ouvrir `http://localhost:3000`.
2. La galerie affiche le module **EAN-13** ; cliquer dessus.
3. Saisir l'EAN-13 `5901234123457` et la quantité `2`.
4. **Valider**.
5. **Attendu** — impression immédiate, sans modal ; 2 étiquettes imprimées ;
   toast de succès avec la quantité.

## Scénario B — Quantité > 2 : modal critique

1. Repartir au formulaire (via galerie).
2. Saisir `5901234123457` et la quantité `5`.
3. **Valider**.
4. **Attendu** — une modal critique (AlertDialog shadcn) s'affiche :
   « Imprimer 5 étiquettes ? » ; aucune impression avant action.
5. Cliquer **Confirmer** → 5 étiquettes imprimées, toast de succès.
6. Recommencer avec **Annuler** → aucune impression, form préservé.

## Scénario C — EAN-13 invalide

| Saisie | Attendu |
|--------|---------|
| `5901234123456` (mauvaise clé) | rejet + message « code-barres EAN-13 invalide », aucune impression |
| `59012341234` (12 chiffres) | rejet explicite |
| `abcdefghijklm` / vide | rejet explicite |

## Scénario D — Quantité invalide

| Saisie | Attendu |
|--------|---------|
| `0`, `-1`, `1.5`, vide | rejet + message, aucune impression |

## Scénario E — Imprimante injoignable

1. (Uniquement si possible) débrancher l'imprimante ou changer l'IP dans
   `.env`.
2. Valider un EAN-13 valide, quantité `1`.
3. **Attendu** — erreur explicite (toast « imprimante indisponible »), aucun
   échec silencieux ; l'interface reste utilisable.

## Scénario F — Chevauchement d'impression

1. Lancer une impression (quantité 1).
2. Tenter d'en relancer une seconde pendant que la première est en cours.
3. **Attendu** — refus avec message (code `PRINT_IN_PROGRESS`).

## Vérifications automatisées

- `npm test` — suite verte ; la logique de validation EAN-13, la génération
  ZPL et la route `POST /api/print/ean13` sont couvertes (> 80 %).
- `npm run lint` — aucun warning.