# Interface web — Contrat d'API : module Emplacement (plages multiples)

Évolution volontaire du contrat de `specs/009-module-emplacement/contracts/api.md` :
le mode **range** ne porte plus une paire unique mais un **tableau de paires**.
Mêmes conventions : routes locales, réponses JSON, erreurs
`{ "error": { code, message } }`. **Aucun autre consommateur** que le
formulaire du module → pas de compatibilité rétro exigée.

## 1. Imprimer des étiquettes d'emplacement

`POST /api/print/location`

Corps — **union discriminée sur `mode`** :

### Mode Un seul *(inchangé)*

```json
{ "mode": "single", "locationType": "classic", "code": "1A5B", "quantity": 5 }
```

| Champ | Règle |
|-------|-------|
| `mode` | `"single"` |
| `locationType` | `"classic"` \| `"dynamic"` |
| `code` | 4 caractères, conforme au type |
| `quantity` | entier ≥ 1, ≤ 1000 |

### Mode Plage *(multi-plages)*

```json
{
  "mode": "range",
  "locationType": "classic",
  "ranges": [
    { "startCode": "1A10", "endCode": "1A12" },
    { "startCode": "1B10", "endCode": "1B15" }
  ]
}
```

| Champ | Règle |
|-------|-------|
| `mode` | `"range"` |
| `locationType` | `"classic"` \| `"dynamic"` |
| `ranges` | **tableau de 1 à 10 objets** `{ startCode, endCode }` |
| — chaque paire | bornes valides pour le type, **même zone**, ordre **par axe** (espace/position/sous-position), taille ≤ 1000 |
| — boîte | expansion produit la boîte bornée par les extrêmes : espace `A-Z`, position `1-9` puis `A-Z`, sous-position `0-9` puis `A-Z` (Dynamique : seul l'axe sous-position varie) |
| — zone | **au sein d'une paire** : bornes de même premier caractère (`1` ou `2`) ; **entre paires** : zones libres (lots indépendants) |
| — total | **somme** des tailles ≤ 1000 |

Pas de `quantity` en mode plage (le serveur calcule le nombre d'étiquettes).

Champs communs optionnels inchangés : `paperId` (format `ZPL_PAPER_SIZES`),
`printerAddress` (IP IPv4) — même résolution que la route EAN-13
(cookie `tagmaker_print_settings` en secours).

## Réponses

- `200` — impression envoyée ; `labels` = **nombre total d'étiquettes** (somme
  des tailles de toutes les plages — `quantity` en mode single) :
  ```json
  { "status": "sent", "labels": 8 }
  ```
- `422` — validation refusée (paire invalide : type, bornes de zones
  différentes, ordre par axe, taille ; tableau hors bornes ; quantité hors
  bornes) :
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "..." } }
  ```
  Le message décrit la plage concernée via son numéro (« Plage N : … ») quand
  l'erreur porte sur une paire. Les plages étant des lots indépendants, aucun
  mélange de zones entre plages n'est refusé.
- `409` — une impression est déjà en cours (inchangé) :
  `{ "error": { "code": "PRINT_IN_PROGRESS", "message": "..." } }`
- `503` — imprimante injoignable / envoi échoué (inchangé) :
  `{ "error": { "code": "PRINTER_UNAVAILABLE", "message": "..." } }`

## Règles de gestion

- La modal de confirmation (volume total > 2, toutes plages confondues) est un
  comportement **client** : le serveur imprime dès réception d'un corps valide.
- `labels` = somme exacte ; un job = **un seul** flux ZPL envoyé
  (`^XA…^XZ` par code), une seule connexion à l'imprimante.
- Le formulaire n'envoie jamais un ensemble invalide : la validation client
  partage le **même schéma Zod** que le serveur.