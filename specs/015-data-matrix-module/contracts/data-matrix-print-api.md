# Contrat — API `POST /api/print/data-matrix`

**Feature**: 015-data-matrix-module | **Auth** : aucune (application locale)

## Requête

```http
POST /api/print/data-matrix
Content-Type: application/json
```

```json
{
  "content": "REF-2026-A17",
  "legend": "Palette 42",
  "quantity": 1,
  "paperId": "40x25",
  "printerAddress": "192.168.1.50",
  "rotated": false
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `content` | string | oui | trim ; 1–200 ; `^[\x20-\x7E]+$` |
| `legend` | string | non | trim ; 0–60 ; `^[\x20-\x7E]*$` ; vide = aucun texte |
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
| 422 | `VALIDATION_ERROR` | contenu/légende trop grands | `Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format.` |
| 409 | `PRINT_IN_PROGRESS` | impression déjà en cours sur l'endpoint | `Une impression est déjà en cours.` |
| 503 | `PRINTER_UNAVAILABLE` | connexion/envoi échoué | `Imprimante injoignable ou envoi échoué.` |

Corps d'erreur :

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

## Comportement

- Verrou **par endpoint** (un `POST /api/print/data-matrix` concurrent reçoit
  `409`), libéré dans tous les cas.
- Sans `printerAddress`, l'imprimante configurée par l'environnement est
  utilisée ; sans `paperId`, le premier format configuré s'applique.
- Pipeline, verrou et réponses mutualisés via `lib/print/route-handler.ts`.
- Aucune donnée persistée ni journalisée.
