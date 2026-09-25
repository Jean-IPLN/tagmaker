# Implementation Plan: Plages multiples — imprimer plusieurs plages d'emplacements

**Branch**: `010-multi-range-print` | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-multi-range-print/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Étendre le **mode Plage** du module Emplacement (feature 009) pour imprimer
**plusieurs plages en une seule opération**. En mode Plage, l'utilisateur voit
**une ligne par plage** (début/fin), chaque ligne étant **séparée par un
`Separator` shadcn** ; un bouton **« + » (icône Phosphor `Plus`)** ajoute une
plage, une **icône Phosphor `Trash`** en bout de ligne la supprime (minimum une
plage conservée). L'impression envoie l'ensemble des plages en un seul job :
total cumulé, confirmation au seuil existant (> 2), rejet global si une plage
est invalide avec désignation de la plage fautive.

La génération ZPL **ne change pas** : `buildLocationZpl` consomme déjà un
tableau `codes` — le serveur concatène simplement les expansions de toutes les
plages. Les changements portent sur : validation/schéma Zod (tableau
`ranges`), route (accumulation des plages), formulaire (état `ranges[]`,
lignes/séparateurs/icônes), tests.

## Technical Context

**Language/Version**: TypeScript 5, React 19 (App Router Next.js 16.3.5)

**Primary Dependencies**: Next.js 16 (App Router), Zod 4 (validation partagée),
Base UI `@base-ui/react` 1.8 + `shadcn` 4 (`Separator` du kit déjà présent dans
`components/ui/separator.tsx`), Tailwind 4, `@phosphor-icons/react` 2.1
(icônes `Plus`, `Trash`), `cn`, `sonner`

**Storage**: Aucune base de données. Réglages via cookie
`tagmaker_print_settings` (`paperId`, `printerAddress`) — inchangé. Les plages
sont un état de formulaire (aucune persistance)

**Testing**: Vitest 5 (jsdom) + Testing Library ; coverage v8 > 80 % ; ESLint 9
(aucun warning) ; `tsc --noEmit` ; `next build` vert. Tests au même niveau que
le code (constitution). Suite existante (272 tests) reste verte

**Target Platform**: Application web locale (localhost) + imprimante étiquettes
203 dpi en TCP raw, flux ZPL

**Project Type**: Web app mono-projet (single project)

**Performance Goals**: Job borné à 1000 étiquettes cumulées (limite partagée
avec la quantité) ; envoi synchrone (timeout 10 s existant) ; ≤ 10 plages ;
aucune contrainte stricte de latence UI (impression locale)

**Constraints**: Résolution 203 dpi ; syntaxe ZPL ; nomenclature stricte ;
règles de plage par **boîte** (même zone, ordre par axe, taille = produit ≤
1000, calcul des codes étendu aux espaces/positions) appliquées **par paire** ;
une **seule** opération d'impression pour l'ensemble ;
type global unique (interrupteurs existants) ; changement de contrat API
`range` (evolution volontaire documentée) ; constitution VI (addition non
destructive pour le reste)

**Scale/Scope**: Formulaire Emplacement en mode Plage + schéma/route + tests —
ZPL, réglages, mode Un seul et autres modules inchangés

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **KISS** : réutiliser `LocationCodeInput` (saisie segmentée existante) tel
  quel ; pas de composant « multi-range » générique, pas de moteur de règles,
  pas de prévisualisation. ✅
- **DRY** : validation par paire **réutilisée** (règles identiques à la plage
  unique → même logique `rangeEntrySchema` + `expandRange`) ; expansion
  concaténée via un unique `expandRanges` ; séparation des lignes par le
  composant `Separator` du kit (aucun style custom). ✅
- **YAGNI** : pas de persistance des plages, pas de réordonnancement par
  drag & drop, pas de dédoublonnage entre plages, pas de type par plage. ✅
- **SOC** : validation (lib/location) / route (app/api/print/location) / UI
  (components/location-form + ligne dédiée) restent séparés ; ZPL inchangé. ✅
- **Tests obligatoires** : nouveaux tests validation (schéma `ranges`),
  route (multi-plages), composant (ajout/suppression/impression) ; suite
  existante verte. ✅
- **Sécurité** : validation stricte Zod des entrées (tableau borné 1..10,
  chaque paire validée, cumul ≤ 1000) — aucun code arbitraire vers
  l'imprimante ; messages d'erreur sans donnée sensitive. ✅
- **Git** : branche dédiée `feature/010-multi-range-print`, commits unitaires,
  pas de commit/push sans ordre. ✅

Gates passent. Aucune violation à la constitution.

**Re-check post-design (Phase 1)** : conforme — contrat API `range` évolue de
`{startCode,endCode}` vers `{ranges:[…]}` (évolution volontaire, consommée
uniquement par ce module ; pas de compat rétro nécessaire — voir
`contracts/api.md`) ; le formulaire garde l'état « minimum une plage » et le
bouton « + » borné à `MAX_RANGES` (YAGNI respecté) ; ZPL non touché (KISS) ;
validation par paire réutilisée (DRY) ; aucun TODO ni warning sur le livrable ;
branche dédiée avant implémentation.

## Project Structure

### Documentation (this feature)

```text
specs/010-multi-range-print/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.md           # contrat POST /api/print/location (mode range → ranges[])
│   ├── ui.md            # formulaire multi-plages (lignes, séparateurs, + , poubelle)
│   └── zpl.md           # renvoi vers 009 (flux ZPL inchangé)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
└── location/
    ├── __tests__/
    │   └── validate.test.ts         # + schéma ranges[], expandRanges, caps, messages "Plage N"
    ├── code.ts                      # constants (inchangé, + éventuellement MAX_RANGES)
    └── validate.ts                  # rangeSchema → ranges: array(min 1, max MAX_RANGES)
                                     #   + rangeEntrySchema (règles 009 par paire)
                                     #   + expandRanges(ranges): string[] (concaténation)

app/
└── api/print/location/
    ├── __tests__/
    │   └── route.test.ts            # + multi-plages : total = somme, 422 si paire invalide, 409/503 inchangés
    └── route.ts                     # mode range → buildRangesZpl(ranges) (concaténation des codes)

components/
├── location-form.tsx                # état ranges: RangeRow[] (id stable), ligne par plage
│                                    #   (LocationCodeInput ×2 + Trash), Separator entre les lignes,
│                                    #   bouton "+ Ajouter une plage" (Plus), compteur de totaux, submit
├── location-range.row.tsx           # [facultatif] ligne de plage (début/fin + poubelle) — si la
│                                    #   lecture le justifie (SOC), sinon inline dans le formulaire
├── __tests__/
│   └── location-form.test.tsx       # + ajout/suppression (min 1), 10 max, séparateurs,
│                                    #   impression multi (totaux + modal), dynamique fixe
└── ui/
    ├── separator.tsx                # EXISTE (shadcn) — réutilisé
    └── button.tsx                   # EXISTE — réutilisé pour "+" et poubelle (variant ghost/outline)

Tests de non-régression : suite existante (272 tests) reste verte.
```

**Structure Decision**: Structure mono-projet conservée, miroir de la feature
009. La modification touche uniquement `lib/location/validate.ts` (tableau de
paires), `app/api/print/location/route.ts` (accumulation) et
`components/location-form.tsx` (état `ranges[]` + rendu lignes). La saisie
segmentée (`LocationCodeInput`) et le build ZPL sont **réutilisés inchangés** ;
chaque plage est une ligne réutilisant la même paire de champs segmentés, les
lignes étant séparées par le `Separator` du kit et closes par une action
`Trash` ; le bouton « + » utilise l'icône `Plus` (Phosphor).

## Complexity Tracking

Aucune violation de la constitution. Le changement de forme du payload `range`
(paire unique → tableau) est une **évolution volontaire de contrat**, bornée à
ce module et documentée dans `contracts/api.md` (aucun autre consommateur).