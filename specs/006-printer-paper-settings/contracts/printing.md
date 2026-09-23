# Contrat — Impression avec réglages

## Rappel de l'existant

`POST /api/print/ean13` (statut 200/409/422/503), corps actuel :
`{ ean13, quantity }` (schéma `labelRequestSchema`) ; dimensions de l'étiquette
et imprimante issues des variables `ZPL_*` (serveur).

## Extension du corps de requête (additive, rétro-compatible)

| Champ | Type | Contrainte |
|-------|------|------------|
| `ean13` | `string` (13 chiffres, clé valide) | inchangé |
| `quantity` | `number` eu [1,1000] | inchangé |
| `paperId` | `string (optionnel)` | identifiant d'un format connu du serveur |
| `printerAddress` | `string (optionnel)` | adresse IPv4 valide |

- Champs omis → comportement actuel (repli `.env`) : aucune impression bloquée
  (FR-008).
- `paperId` inconnu du serveur → `422 VALIDATION_ERROR` (message clair).
- `printerAddress` mal formée → `422 VALIDATION_ERROR`.

## Résolution effective (serveur)

1. `widthMm`/`heightMm` = format correspondant à `paperId` si fourni, sinon
   `ZPL_LABEL_WIDTH_MM`/`ZPL_LABEL_HEIGHT_MM`.
2. destinataire = `printerAddress` fournie + `ZPL_PRINTER_PORT`, sinon
   `ZPL_PRINTER_HOST`/`ZPL_PRINTER_PORT`.
3. Génération ZPL + envoi via `lib/printer/send.ts` (hôte/port paramétrés).

## Contrat `lib/printer/send.ts`

- `sendToPrinter(zpl: string, target?: { host: string; port: number })`
  - `target` fourni → utilisé ; absent → valeurs `.env` (rétro-compatible).
  - Erreurs/statut : inchangés (timeout, port fermé, connexion refusée).

## Exigences couvertes

FR-003 (format appliqué à l'impression), FR-006 (adresse appliquée à
l'impression), FR-008 (défaut sans blocage), FR-009 (réglages globaux), FR-015
(échec imprimante signalé comme aujourd'hui).