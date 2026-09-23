# Data Model: Découverte d'imprimantes : spinner et actualisation

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-23

Cette feature n'introduit **aucune nouvelle entité persistée**. Elle affine
l'utilisation de deux entités existantes (livrées en feature 006) et ajoute
un **état d'interface** transitoire.

## PaperSize (existant, inchangé)

Identifié par la chaîne « largeur×hauteur » (ex. `40x25`).

| Attribut | Type | Règle |
|----------|------|-------|
| `id` | string | `"<largeur>x<hauteur>"` — unique, ordre croissant de surface |
| `widthMm` / `heightMm` | number | > 0, extraits de la liste `.env` `ZPL_PAPER_SIZES` |
| `surfaceMm2` | number | dérivé (tri) — `widthMm × heightMm` |
| `label` | string | libellé affiché « 40 × 25 mm » |

**Source de vérité**: `ZPL_PAPER_SIZES` dans `.env` (liste « largeur×hauteur »
séparée par virgule ou point-virgule). Parseur : `lib/paper-sizes.ts`
(validation, dédoublonnage, tri, fallback format par défaut). **Aucun
changement.**

## PrinterDevice (existant, inchangé)

| Attribut | Type | Règle |
|----------|------|-------|
| `address` | string | IP IPv4 — identifiant |
| `port` | number | port ZPL (défaut 9100) |

Source : `GET /api/printers/discover` (feature 006). **Aucun changement.**

## PrintSettings (existant, inchangé)

Cookie client `tagmaker_print_settings` (feature 006) : `{ paperId?,
printerAddress? }`. Non touché.

## PrinterScanState (état d'interface — cette feature)

État transitoire du sélecteur « Imprimante », géré dans le composant
`SettingsFooter`. **Non persistant, UI-only.**

```
              open selecte (auto si idle & pas de printerAddress)
   idle ───────────────────────────────────────────> scanning
     ^                                                   │
     │                fin de scan (ok / échec)          ▼
     └─────────────── done ◄────────────────────────────┘
        │                                              
        │  clic « Actualiser » (startScan)
        └──────────────────────────────────────────────> scanning
```

| État | Contenu du menu déroulant | Bouton Actualiser |
|------|---------------------------|-------------------|
| `idle` | (liste vide : aucun contenu, sélecteur jamais ouvert en auto) | visible |
| `scanning` | (liste vide) pied de menu : « Recherche des imprimantes… » **+ spinner animé** | **masqué** (pas de scan concurrent) |
| `done` | `printerAddress` du cookie, sinon liste des `PrinterDevice` détectés ou ligne « Aucune imprimante détectée » | visible |

**Invariants** :
- la valeur affichée dans le déclencheur (`printerAddress`) n'est **jamais**
  écrasée par un scan (y compris relance) — seul un choix utilisateur la met à
  jour ;
- une seule transition `idle|done → scanning` possible à la fois.

## Validation guide

Contrats d'interface : [contracts/ui.md](./contracts/ui.md).
Scénarios de bout en bout : [quickstart.md](./quickstart.md).