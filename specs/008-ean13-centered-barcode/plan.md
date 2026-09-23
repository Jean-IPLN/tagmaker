# Implementation Plan: Code-barres EAN-13 centré et pleine échelle

**Branch**: `008-ean13-centered-barcode` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-ean13-centered-barcode/spec.md`

## Summary

Le code-barres EAN-13 imprimé par le module doit être **centré en largeur et en
hauteur** sur l'étiquette et **occup**er au maximum **l'espace disponible**
(barres + chiffres lisibles inclus), pour chaque format papier sélectionné,
tout en préservant les zones de silence minimales exigées par GS1 afin de
conserver la scannabilité.

Approche technique : la géométrie du symbole (module X, largeur de barres,
hauteur, position `^FO`) est **calculée dynamiquement** dans la fonction pure
`buildEan13Zpl` à partir des dimensions de l'étiquette (déjà fournies par le
réseau), au lieu des constantes actuelles `^BY2,3,120` / `^FO70,30^BEN,120,Y,N`.
Le rendu natif `^BE` garde la ligne lisible sous les barres (`Y`). Seule
`lib/zpl/build.ts` et ses tests changent — aucun changement d'API, de route ou
d'environnement.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js (Next.js App Router) ; flux
ZPL II ciblant une imprimante thermique 203 dpi (8 dots/mm).

**Primary Dependencies**: Next.js, Zod (validation `env`), Vitest (tests) ;
émission ZPL via la commande native `^BE` (EAN-13).

**Storage**: N/A — le layout est purement calculé ; les dimensions d'étiquette
proviennent de `ZPL_PAPER_SIZES` dans `.env` (feature 006/007), résolues par
`route.ts` (`resolveDimensions`) sans changement.

**Testing**: Vitest — tests unitaires sur `lib/zpl/__tests__/build.test.ts`
(TDD precedent : RED puis GREEN), puis gate complet (lint + tsc + tests +
build), comme les features précédentes.

**Target Platform**: Serveur API Next.js + imprimante thermique ZPL 203 dpi.

**Project Type**: Web-service mono-projet (Next.js App Router).

**Performance Goals**: Construction du flux < 1 ms — calculs arithmétiques
simples, appelés une fois par requête d'impression.

**Constraints**:
- `buildEan13Zpl` reste **pure** et synchronisée avec `.slice(0, 12)` pour
  `^FD` (12 chiffres, la clé est calculée par la machine).
- Scannabilité GS1 : module X dans `[0.25, 0.66]` mm (borne haute = 5 dots à
  203 dpi) ; zones de silence ≥ 11 modules à gauche et 7 à droite.
- Fichier < 300-400 lignes, pas de warning, pas de `TODO`.
- Aucune régression sur la validation EAN-13, la quantité (`^PQ`), l'envoi
  réseau et le choix du papier (FR-008 / SC-006).

**Scale/Scope**: Une étiquette EAN-13 par requête ; 4 formats papier
(`40x25`, `50x25`, `60x40`, `100x50`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **1 Projet** ✓ — Next.js mono-projet ; pas de dépôt, workspace ou package
  supplémentaire.
- **Complexité minimale (KISS)** ✓ — constantes documentées + formules
  arithmétiques ; aucun moteur de layout externe.
- **Pas de code produit sans test** ✓ — chaque invariant du layout est codé en
  test (RED) avant l'implémentation (GREEN).
- **Pas de performance sans mesure** ✓ — aucun changement perceptible ; les
  gains de dimensions sont rendu, pas optimisation.
- **Documentation avant code** ✓ — le présent plan, `research.md`,
  `data-model.md` et `contracts/zpl.md` précèdent l'implémentation.
- **Pas de warning ni de code mort** ✓ — l'entièreté du changement remplace
  l'ancien layout (pas de duplication).
- **Pas de commit sur `main`** ✓ — travail sur la branche
  `008-ean13-centered-barcode` ; aucun commit/push sans ordre explicite.
- **DRY / YAGNI / SOC** ✓ — calcul localisé dans une seule fonction pure ;
  rien d'ajouté à l'API ou à la route.

**Résultat : aucune violation → Tableau *Complexity Tracking* vide.**

## Project Structure

### Documentation (this feature)

```text
specs/008-ean13-centered-barcode/
├── plan.md              # Ce fichier (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── zpl.md           # Contrat ZPL du nouveau layout (remplace la géométrie du contrat 001)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/zpl/
├── build.ts             # MODIFIÉ — layout EAN-13 centré/pleine échelle (fonction pure)
└── __tests__/
    └── build.test.ts    # MODIFIÉ — tests TDD du nouveau layout (tableau par format)
```

Hors périmètre (non modifiés) : `app/api/print/ean13/route.ts`
(`resolveDimensions` fournit déjà `widthDots`/`heightDots`), `lib/paper-sizes.ts`,
`lib/ean13/validate.ts`, `lib/printer/send.ts`.

**Structure Decision**: Mono-projet Next.js. Le changement est **confiné à
`lib/zpl/build.ts` + son test** : la signature de `buildEan13Zpl` reste
identique (aucun impact sur l'API, la route, l'UI ou l'environnement).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Aucune violation — tableau vide.