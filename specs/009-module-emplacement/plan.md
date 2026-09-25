# Implementation Plan: Module Emplacement — code-barres Code 128

**Branch**: `009-module-emplacement` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-module-emplacement/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Nouveau module « Emplacement » : imprimer des étiquettes portant un code-barres
**Code 128** (commande native ZPL `^BC`) pour des codes d'emplacement conformes
à la nomenclature `^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$` (exactement 4
caractères). Le formulaire propose deux interrupteurs shadcn : **mode** (Un
seul / Plage d'emplacements) et **type** (Classique / Dynamique `#D`). Le
module réutilise l'existant du projet — réglages papier/imprimante (006/007),
pipeline d'envoi réseau, convention de centrage/pleine échelle (008) — et suit
l'architecture du module EAN-13 (validation partagée Zod, build ZPL en fonction
pure testée, API dédiée, formulaire dédié, entrée dans la navigation).

## Technical Context

**Language/Version**: TypeScript 5, React 19 (App Router Next.js 16.3.5)

**Primary Dependencies**: Next.js 16 (App Router), Zod 4 (validation partagée
client/serveur), Base UI `@base-ui/react` 1.8 + `shadcn` 4 (composants UI — dont
un Switch à ajouter), Tailwind 4, `cn`, Phosphor icons, `sonner` (toasts)

**Storage**: Aucune base de données. Réglages via cookie
`tagmaker_print_settings` (`paperId`, `printerAddress`) ; les codes emplacement
sont calculés à la volée (aucune persistance)

**Testing**: Vitest 5 (jsdom) + Testing Library ; coverage v8 > 80 % ;
ESLint 9 (aucun warning) ; `tsc --noEmit` ; `next build` vert. Tests au même
niveau que le code source (constitution)

**Target Platform**: Application web locale (localhost) + imprimante étiquettes
203 dpi (8 dots/mm) en TCP raw, flux ZPL

**Project Type**: Web app mono-projet (single project)

**Performance Goals**: Plage bornée à 1000 étiquettes par job ; envoi
synchrone vers l'imprimante (timeout 10 s existant) ; aucune contrainte stricte
de latence côté UI (impression locale)

**Constraints**: Résolution 203 dpi ; syntaxe ZPL ; nomenclature stricte
(4 caractères, majuscules) ; borne quantité 1–1000 partagée avec la plage ;
architecture du module EAN-13 déjà en place à reproduire par addition
non destructive (constitution VI)

**Scale/Scope**: Un nouveau module complet — validation + ZPL + API + formulaire
+ navigation — sans toucher au comportement des modules existants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **KISS** : reproduire le pattern EAN-13 existant (validation Zod, build ZPL
  pure, route, formulaire) ; pas d'abstraction spéculative, pas de moteur de
  règles, pas de prévisualisation. ✅
- **DRY** : validation partagée client/serveur (un seul schéma) ; réutilisation
  du pipeline papier/imprimante/envoi ; calculs de layout (module, position,
  bloc) dupliqués entre EAN-13 et Code 128 → extraction d'aides communes
  justifiée (> 2 occurrences). ✅
- **YAGNI** : pas de persistance des emplacements, pas de mémorisation des
  switches, pas de réglage d'imprimante dédié, pas d'export. ✅
- **SOC** : séparation validation (lib/location) / ZPL (lib/zpl) / API
  (app/api/print/location) / UI (components/location-form). ✅
- **Tests obligatoires** : unitaires (validation, expansion de plage, build
  ZPL) + intégration (route) + composant ; coverage > 80 %. ✅
- **Sécurité** : validation stricte Zod des entrées (aucun code arbitraire vers
  l'imprimante), sortie ZPL construite en fonction pure, aucun secret. ✅
- **Git** : branche dédiée `feature/009-module-emplacement`, commits unitaires,
  pas de commit/push sans ordre. ✅

Gates passent. Aucune violation à la constitution.

**Re-check post-design (Phase 1)** : conforme — extraction `layout.ts`
(D1/D2) couvre le DRY sans changer `buildEan13Zpl` ; la plage ne varie que le
dernier caractère (KISS) ; pas de persistance, de preview ni de préférences
(YAGNI) ; validation/ZPL/API/UI séparés (SOC) ; cas limites documentés
(FR-006, plage > 1000, axe inversé). Aucun TODO ni warning sur le livrable ;
branche dédiée `feature/009-module-emplacement` avant implémentation.

> **Évolution post-009** : le calcul de plage a été étendu en « boîte » par la
> feature 010 (`1A10` → `1B10` valide, ordre par axe, taille = produit) — voir
> l'addendum du tasks.md et `specs/010-multi-range-print/`.

## Project Structure

### Documentation (this feature)

```text
specs/009-module-emplacement/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Application web mono-projet (convention existante conservée)

lib/
├── location/
│   ├── __tests__/
│   │   └── validate.test.ts        # validation codes, types, plages (pure)
│   ├── code.ts                     # regex de la nomenclature, type × codes (NEUI. VERIFIÉ)
│   └── validate.ts                 # schéma Zod partagé (single/range) + expansion plage
├── zpl/
│   ├── __tests__/
│   │   └── location.test.ts        # flux ^BC Code 128 (pure)
│   ├── build.ts                    # buildEan13Zpl (inchangé hors extraction)
│   ├── layout.ts                   # aides partagées de centrage/échelle (extraites de build.ts)
│   └── location.ts                 # buildLocationZpl (Code 128, single + plage)
├── modules/
│   └── registry.ts                 # + entrée « emplacement » (id "location")

app/
├── emplacement/
│   └── page.tsx                    # page du module (nouvelle)
├── api/
│   └── print/
│       └── location/
│           ├── __tests__/
│           │   └── route.test.ts   # intégration POST /api/print/location
│           └── route.ts            # API dédiée (garde anticoncurrence réutilisée)

components/
├── location-form.tsx               # formulaire du module (switches + champs)
├── location-confirm-dialog.tsx     # confirmation grande quantité (pattern ean13)
├── __tests__/
│   └── location-form.test.tsx
└── ui/
    └── switch.tsx                  # composant Switch shadcn (à ajouter au kit UI)

Tests de non-régression : suite existante (175 tests) reste verte.
```

**Structure Decision**: Structure mono-projet conservée, miroir du module EAN-13
(validation dans `lib/location/`, ZPL dans `lib/zpl/`, route sous
`app/api/print/location/`, formulaire dans `components/`, navigation dans le
registry). Le centrage du code-barres partage des calculs avec la feature 008 :
une extraction vers `lib/zpl/layout.ts` évite la duplication (DRY), sans changer
le contrat de sortie de `buildEan13Zpl`.

## Complexity Tracking

Aucune violation de la constitution → tableau non rempli.