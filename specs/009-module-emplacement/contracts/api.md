# Interface web — Contrat d'API : module Emplacement

Frontière client (formulaire) ⇄ serveur (validation + envoi ZPL). Mêmes
conventions que `specs/001-module-ean13/contracts/web-api.md` : routes locales,
réponses JSON, erreurs `{ "error": { code, message } }` avec statut adapté.

## 1. Imprimer des étiquettes d'emplacement

`POST /api/print/location`

Corps — **union discriminée sur `mode`** (le type `locationType` filtre la
regex appliquée) :

### Mode Un seul

```json
{
  "mode": "single",
  "locationType": "classic",
  "code": "1A5B",
  "quantity": 5
}
```

| Champ | Règle |
|-------|-------|
| `mode` | `"single"` |
| `locationType` | `"classic"` \| `"dynamic"` |
| `code` | 4 caractères, conforme au type (classique / `#D`) |
| `quantity` | entier ≥ 1, ≤ 1000 |

### Mode Plage

```json
{
  "mode": "range",
  "locationType": "classic",
  "startCode": "1A10",
  "endCode": "1A1B"
}
```

| Champ | Règle |
|-------|-------|
| `mode` | `"range"` |
| `locationType` | `"classic"` \| `"dynamic"` |
| `startCode` | valide pour le type ; même zone que `endCode` (premier caractère) |
| `endCode` | valide pour le type ; sur **chaque axe**, `rang(start) ≤ rang(end)` |
| — taille | produit des `rang(end) − rang(start) + 1` par axe ≤ 1000 |

Pas de champ `quantity` en mode plage (le serveur calcule le nombre d'étiquettes).

Champs communs optionnels : `paperId` (identifiant du format `ZPL_PAPER_SIZES`),
`printerAddress` (IP IPv4, adresse du réglage) — même résolution que la route
EAN-13 (cookie `tagmaker_print_settings` en secours).

## Réponses

- `200` — impression envoyée ; `labels` = nombre d'étiquettes dans le job :
  ```json
  { "status": "sent", "labels": 5 }
  ```
  (`labels` = `quantity` en mode single, taille de plage en mode range).
- `422` — validation refusée (code/type incohérent, plage de zones différentes,
  plage inversée sur un axe, taille > 1000, quantité hors bornes) :
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "..." } }
  ```
- `409` — une impression est déjà en cours :
  ```json
  { "error": { "code": "PRINT_IN_PROGRESS", "message": "..." } }
  ```
- `503` — imprimante injoignable / envoi échoué :
  ```json
  { "error": { "code": "PRINTER_UNAVAILABLE", "message": "..." } }
  ```

## Règles de gestion

- La modal de confirmation (quantité &gt; 2 ou taille de plage &gt; 2) est un
  comportement **client** (`AlertDialog` avant l'appel) — le serveur imprime ce
  qu'on lui demande (pattern EAN-13 conservé).
- En mode plage, le serveur **calcule** chaque code (expansion déterministe) et
  construit **un bloc `^XA…^XZ` par code** concaténé dans un seul job ZPL.
- En mode single, le serveur passe `^PQ<quantity>` (copies identiques).
- La garde anticoncurrence existante (une impression à la fois) est réutilisée
  pour ce nouvel endpoint.