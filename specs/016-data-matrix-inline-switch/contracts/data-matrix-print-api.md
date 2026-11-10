# Contrat — Delta API `POST /api/print/data-matrix`

**Feature**: 016-data-matrix-inline-switch | **Base** :
[015 data-matrix-print-api.md](../../015-data-matrix-module/contracts/data-matrix-print-api.md)

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
  "inline": true
}
```

| Champ | Type | Requis | Contraintes |
|-------|------|--------|-------------|
| `content` | string | oui | inchangé (1–200, ASCII imprimable) |
| `legend` | string | non | inchangé (0–60, ASCII imprimable) |
| `quantity` | number | oui | inchangé (entier 1–1000) |
| `paperId` | string | non | inchangé |
| `printerAddress` | string | non | inchangé |
| `rotated` | boolean | non | inchangé ; prioritaire sur `inline` |
| `inline` | boolean | non | défaut `false` ; in-line en orientation normale |

Champs inconnus refusés (`strict`). `inline` non booléen est refusé avec
`Le mode d'affichage est invalide`.

## Comportement

- `inline` absent ou `false` : rendu actuel, strictement inchangé.
- `inline: true` et `rotated: false` : légende à droite du symbole, sur une
  ligne, en orientation normale.
- `inline: true` et `rotated: true` : le rendu pivoté actuel est conservé ;
  `inline` est ignoré, sans erreur.
- `inline: true` avec légende vide : étiquette identique au mode actuel, code
  seul.
- La tenue est vérifiée avant envoi ; une légende qui ne tient pas est refusée
  sans troncature.
- Aucun champ n'est persisté ; `inline` ne modifie pas le cookie de réglages.

## Réponse nominale

Inchangée :

```http
200 OK
```

```json
{ "status": "sent", "labels": 1 }
```

## Erreurs

| HTTP | `error.code` | Déclencheur | Message |
|------|--------------|-------------|---------|
| 422 | `VALIDATION_ERROR` | `inline` non booléen | `Le mode d'affichage est invalide` |
| 422 | `VALIDATION_ERROR` | disposition in-line qui ne tient pas | `Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format.` |
| 409 | `PRINT_IN_PROGRESS` | impression déjà en cours | inchangé |
| 503 | `PRINTER_UNAVAILABLE` | connexion/envoi échoué | inchangé |

Les autres erreurs `422` (JSON, contenu, légende, quantité, papier, rotation)
restent inchangées.

## Compatibilité

- Les requêtes 015 sans `inline` restent valides et produisent le même ZPL.
- Aucune nouvelle route, aucun nouveau champ obligatoire, aucune migration.
- Le verrou et les réponses restent mutualisés par
  `lib/print/route-handler.ts`.
