# Contrat — Cookie des réglages d'impression

## Nom

`tagmaker_print_settings` (constante partagée `PRINT_SETTINGS_COOKIE_NAME`).

## Contenu

JSON URL-encodé dans le cookie :

```json
{ "paperId": "40x25", "printerAddress": "192.168.1.63" }
```

- `paperId` : optionnel, identifiant d'un `PaperSize` de la liste courante.
- `printerAddress` : optionnel, adresse IPv4 d'une imprimante.
- Les deux sont indépendants ; chaque champ est écrit séparément.

## Attributs

`Max-Age=2592000` (30 jours), `path=/`, `SameSite=Lax`, **non** HttpOnly
(aucun secret). Le `Max-Age` est rafraîchi à chaque écriture.

## API (adaptateur navigateur, `lib/print-settings-cookie.ts`)

- `readPrintSettings(): PrintSettings`
  - cookie absent → `{}` ;
  - JSON invalide → `{}` (retour sûr) ;
  - champs mal formés (type incorrect) → `{}` ;
  - `paperId`/`printerAddress` inconnus de la référence courante → champ ignoré
    individuellement (couche de validation appelante).
- `writePrintSettings(settings: PrintSettings): void`
  - écrit `paperId` et/ou `printerAddress` fournis ; échec silencieux (le
    réglage ne doit jamais faire planter l'interface).
- `clearPrintSettings()` — utile aux tests uniquement.

## Partage

Constante et type exposés côté **client** et côté **serveur** (lecture SSR du
`paperId` initial). Le contenu n'est jamais considéré comme fiable : chaque
lecture re-valide contre la référence courante.

## Exigences couvertes

FR-004 (mémorisation papier), FR-007 (mémorisation imprimante), FR-012 (choix
explicite seul écrit), edge case cookie corrompu.