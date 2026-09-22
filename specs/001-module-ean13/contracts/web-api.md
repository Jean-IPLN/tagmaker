# Interface web — Contrats d'API locale

L'application expose une interface web locale (navigateur ⇄ serveur Next.js).
Les routes d'API sont les frontières entre le client (formulaire) et le
serveur (validation + envoi ZPL). Voir aussi [ean13.md](./ean13.md) pour la
règle de validation partagée.

## Conventions

- Toutes les routes sont locales (localhost)— aucun partage externe.
- Réponses JSON. Erreurs : `{ "error": { "code": string, "message": string } }`
  avec un statut HTTP adapté.

## 1. Imprimer des étiquettes EAN-13

`POST /api/print/ean13`

Corps :

```json
{
  "ean13": "5901234123457",
  "quantity": 5
}
```

| Champ | Règle |
|-------|-------|
| `ean13` | 13 chiffres, checksum mod 10 valide ([ean13.md](./ean13.md)) |
| `quantity` | entier ≥ 1, ≤ 1000 |

Réponses :

- `200` — impression envoyée avec succès :
  ```json
  { "status": "sent", "quantity": 5 }
  ```
- `422` — validation refusée (EAN-13 ou quantité invalide) :
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

Note : la modal critique (quantité > 2) est un comportement **client**
(`AlertDialog` avant l'appel à cette route) ; le serveur n'imprime que ce
qu'on lui demande et n'a pas besoin de connaître la confirmation UI.