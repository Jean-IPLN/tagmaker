# Contrat — Orientation dans la chaîne d'impression

## Corps de requête (extension additive, rétro-compatible)

`POST /api/print/ean13` et `POST /api/print/location` :

| Champ | Type | Contrainte |
|-------|------|------------|
| `ean13` / `codes` + `quantity` | inchangés | inchangé |
| `paperId` | `string (optionnel)` | inchangé (format connu du serveur) |
| `printerAddress` | `string (optionnel)` | inchangé (IPv4 valide) |
| `rotated` | `boolean (optionnel)` | absent = `false` ; sinon booléen strict |

- `rotated` non booléen → `422 VALIDATION_ERROR` (schémas zod stricts) ;
- `rotated: true` sur un format **non rotatable** → `422 VALIDATION_ERROR`
  avec message clair (« Format inutilisable en orientation pivotée ») — jamais
  de symbole illisible silencieux.

## Résolution effective (serveur, DRY)

`dotsFromMm` + `resolveDimensions(paperId, rotated)` extraits dans un module
unique `lib/zpl/dimensions.ts` partagé par les deux routes (research D7) :

1. `widthDots`/`heightDots` = format résolu (default = plus petite surface,
   `DEFAULT_PAPER_SIZE`) × DPI (`ZPL_RESOLUTION_DPI`) — canvas **inchangé**.
2. En `rotated: true` : le builder reçoit `widthDots`/`heightDots` échangés
   selon la convention « axe symbole = côté court » (research D3) ;
   `lib/orientation.ts` calcule la faisabilité (threshold runtime en mm).
3. En « normal » : comportement strictement actuel (`^PW`/`^LL` et orientations
   `N` identiques) — non-régression FR-004/SC-005.
4. Generation ZPL + envoi via `lib/printer/send.ts` (hôte/port inchangés).

## Faisabilité (switch désactivé côté UI)

Règle unique `isRotatable(paperSize, dpi)` (data-model.md) avec le seuil le
plus contraignant des deux modules d'impression (EAN-13 : 190 dots ≈ 23,8 mm
@203 dpi ; Emplacement : 158 dots ≈ 19,8 mm @203 dpi). Cette règle est partagée
entre le composant Paramètres (désactive le switch) et le serveur (rejette une
demande rotée invalide). Le seuil est dérivé des constantes de modules du code
ZPL (`MIN_MODULE_WIDTH`, `SYMBOL_MODULES`), pas écrit en dur.

## Exigences couvertes

FR-002 (même zone), FR-003 (mise en page adaptée), FR-005/FR-006 (tous les
modules, transmission à chaque demande), FR-004 (non-régression), FR-010
(contenu contenu, lisible).