# Contrat — Réglage d'orientation (cookie `tagmaker_print_settings`)

## Contenu (extension additive)

```json
{ "paperId": "40x25", "printerAddress": "192.168.1.63", "rotated": true }
```

- `rotated` : optionnel, booléen — orientation pivotée (antihoraire).
- Absent ou non `true` → orientation normale. Les champs restent
  indépendants, écrits séparément (merge du cookie inchangé).

## Attributs

`Max-Age=2592000` (30 jours), `path=/`, `SameSite=Lax`, **non** HttpOnly —
inchangé. Le `Max-Age` est rafraîchi à chaque écriture.

## API (adaptateur navigateur, `lib/print-settings-cookie.ts`)

- `readPrintSettings(): PrintSettings`
  - cookies absent → `{}` ; JSON invalide → `{}` (retour sûr) ;
  - `rotated` mal typé (non booléen) → `rotated: false` — ne casse pas la
    lecture des autres champs.
- `writePrintSettings(settings)` — écrit `rotated` quand fourni ; échec
  silencieux.
- `clearPrintSettings()` — tests uniquement.

## Cycle de vie — format incompatible (FR-013/FR-015)

| Événement | État du switch | `rotated` persistent |
|-----------|----------------|----------------------|
| Format compatible sélectionné, activation manuelle | actif | `true` |
| Sélection d'un format incompatible | **disabled** (non actionnable) | forcé à `false` |
| Retour à un format compatible | actif de nouveau | reste `false` (jamais de bascule auto) |
| Rechargement de page | selon `rotated` relu | inchangé |

Règle de désactivation : `rotated` ne peut être `true` que si le format courant
est rotatable (voir `contracts/printing-orientation.md` — faisabilité).

## Exigences couvertes

FR-007 (mémorisation), FR-013 (switch désactivé), FR-014 (immédiateté),
FR-015 (réinitialisation manuelle), FR-012 (propre au navigateur).