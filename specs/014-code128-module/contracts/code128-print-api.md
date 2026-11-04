# Contrat — API `POST /api/print/code128`

**Feature**: 014-code128-module | **Auth** : aucune (application locale)

## Requête

```http
POST /api/print/code128
Content-Type: application/json
```

```json
{
  "content": "PALETTE-42",
  "quantity": 1,
  "paperId": "40x25",
  "printerAddress": "192.168.1.50",
  "rotated": false
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `content` | string | oui | trim ; 1–80 ; `^[\x20-\x7E]+$` |
| `quantity` | number | oui | entier 1–1000 |
| `paperId` | string | non | identifiant de `getPaperSizes()` |
| `printerAddress` | string | non | IPv4 |
| `rotated` | boolean | non | défaut `false` ; format pivotable requis |

Champs inconnus refusés (schéma strict).

## Réponse nominale

```http
200 OK
```

```json
{ "status": "sent", "labels": 1 }
```

`labels` = `quantity` (une seule impression, contenu unique).

## Erreurs

| HTTP | `error.code` | Déclencheur | Message |
|------|--------------|-------------|---------|
| 422 | `VALIDATION_ERROR` | JSON invalide | `Le corps de la requête doit être un JSON valide.` |
| 422 | `VALIDATION_ERROR` | champ invalide | premier message Zod (français) |
| 422 | `VALIDATION_ERROR` | `paperId` inconnu | `Format de papier inconnu : <id>.` |
| 422 | `VALIDATION_ERROR` | rotation non supportée | `Format inutilisable en orientation pivotée.` |
| 422 | `VALIDATION_ERROR` | contenu trop long | `Le contenu ne tient pas sur ce format (N caractères max).` |
| 409 | `PRINT_IN_PROGRESS` | impression déjà en cours sur l'endpoint | `Une impression est déjà en cours.` |
| 503 | `PRINTER_UNAVAILABLE` | connexion/envoi échoué | `Imprimante injoignable ou envoi échoué.` |

Corps d'erreur :

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

## Comportement

- Le verrou est **par endpoint** (un `POST /api/print/code128` concurrent
  reçoit `409`), comme pour EAN-13 et Emplacement ; le verrou est libéré
  dans tous les cas.
- Sans `printerAddress`, l'imprimante configurée par l'environnement est
  utilisée (`env.ZPL_PRINTER_*`).
- Sans `paperId`, le premier format configuré s'applique.
- Aucune donnée n'est persistée ; la requête n'est pas journalisée.
- Les réponses et le pipeline sont mutualisés via
  `lib/print/route-handler.ts` ; ce contrat est identique, à la réponse
  près, à celui des endpoints existants.
