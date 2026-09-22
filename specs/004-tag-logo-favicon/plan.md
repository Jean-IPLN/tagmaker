# Implementation Plan: Logo et favicon « tag »

**Branch**: `004-tag-logo-favicon` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-tag-logo-favicon/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

L'application doit arborer un logo composé d'un pictogramme « étiquette » (tag)
associé au nom « TagMaker » dans la barre latérale, et un favicon d'onglet
utilisant le **même** pictogramme. Contrainte utilisateur : réutiliser les
icônes phosphor **déjà installées** (via shadcn) — `@phosphor-icons/react`
v2.1.10 est présent, aucune nouvelle dépendance. Favicon via la convention
fichier `app/icon.svg` du App Router (v16) ; suppression du `favicon.ico`
par défaut. Approche : voir [research.md](./research.md).

## Technical Context

**Language/Version**: TypeScript / React 19 / Next.js 16.3.5 (App Router)

**Primary Dependencies**: @phosphor-icons/react 2.1.10 (déjà installé) — **aucune nouvelle dépendance** (constitution I/III)

**Storage**: N/A (modification purement visuelle)

**Testing**: vitest 5.0.1 + jsdom (TDD rouge/vert), couverture > 80 %

**Target Platform**: navigateur web (localhost, thème sombre)

**Project Type**: web app (Next.js App Router)

**Performance Goals**: favicon statique prérendu par Next (aucun round-trip de
génération ; chargement `< 100 ms` — objectif d'usage standard, non critique)

**Constraints**: aucune nouvelle dépendance ; pictogramme phosphor « tag »
unique et cohérent logo/favicon ; thème sombre (contraste d'onglet) ; écoute
locale uniquement ; pas de télémétrie

**Scale/Scope**: 1 logo (entête sidebar) + 1 favicon (`app/icon.svg`) sur
n vues (/, /ean13, 404)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | État | Justification |
|------|------|---------------|
| G1 tests obligatoires (V) | ✅ | Tests logo (rendu `svg`) + lecture `app/icon.svg` ; suite existante (49) verte |
| G2 branche dédiée | ✅ | Branche `004-tag-logo-favicon` créée à l'implémentation ; jamais de commit sans ordre |
| G3 KISS / YAGNI (aucune dép. superflue) | ✅ | `@phosphor-icons/react` déjà installé ; favicon = fichier SVG statique, pas de générateur |
| G4 sécurité (aucun secret / réseau) | ✅ | Aucune donnée, aucun flux ; domaine non concerné |
| G5 CI verte (lint/tests/build) | ✅ | Vérifié dans le quickstart et le polish |

Aucune violation → **Complexity Tracking vide** (post-Phase 1, toujours aucun).

## Project Structure

### Documentation (this feature)

```text
specs/004-tag-logo-favicon/
├── plan.md              # Ce fichier (/speckit.plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (ui.md)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # inchangé
├── icon.svg             # NOUVEAU — favicon « tag » (app/icon.svg, convention fichier)
└── favicon.ico          # SUPPRIMÉ — icône générique create-next-app

components/
├── app-sidebar.tsx      # logo : <Tag /> (phosphor) + « TagMaker » dans SidebarHeader
└── __tests__/
    └── app-sidebar.test.tsx  # + cas : le lien de marque contient un <svg>

specs/004-tag-logo-favicon/add/
└── icon-assert.test.ts  # OR: tests de présence du SVG favicon (unit via module fs)
```

**Structure Decision**: Le projet est un monorepo Next.js single (App Router) ;
la feature touche `app/` (favicon) et `components/` (logo), tests au même
niveau que la source (constitution). Aucun répertoire `models/services` : pas
de logique de domaine.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(aucune — gate complet)_ | — | — |