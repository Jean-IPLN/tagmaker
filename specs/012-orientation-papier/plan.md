# Implementation Plan: Orientation d'impression du papier

**Branch**: `feature/012-orientation-papier` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-orientation-papier/spec.md`

## Summary

Ajouter un switch **Orientation** dans la section Paramètres. Activé, il imprime
le contenu de l'étiquette **pivoté d'un quart de tour dans le sens antihoraire**
(haut du contenu à gauche, bas à droite) dans la **même zone d'impression** : le
support n'est ni rechargé ni tourné, seules la mise en page et l'orientation du
contenu changent (les axes largeur/hauteur du calcul de layout sont échangés).
Le switch est **désactivé** quand le format sélectionné ne permet pas
l'orientation pivotée (côté court trop petit pour un symbole lisible), et le
réglage est réinitialisé sur désactivé dans ce cas (FR-015).

## Technical Context

**Language/Version**: TypeScript, Next.js (App Router), React, Tailwind, base-ui

**Primary Dependencies**: `next`, `zod` (validation des requêtes d'impression),
`base-ui` (primitives Switch/Select), Vitest + Testing Library

**Storage**: cookie navigateur `tagmaker_print_settings` (30 jours) — pas de
stockage serveur

**Testing**: Vitest (`vitest run`, seuil de couverture 80 %), suite POSIX
`scripts/__tests__` (non concernée par cette feature)

**Target Platform**: application web locale servie par le service systemd
(feature 011), imprimante thermique ZPL sur le LAN (TCP/9100)

**Project Type**: application web (Next.js App Router)

**Performance Goals**: génération de quelques Ko de ZPL, non critique (< 50 ms)

**Constraints**: écoute réseau codifiée (constitution, amendement VII), aucune
télémétrie, validation stricte des entrées, KISS/DRY/YAGNI, tests obligatoires

**Scale/Scope**: application locale mono-utilisateur ; un seul réglage global

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Verdict | Justification |
|----------|---------|---------------|
| Branche dédiée requise | Passe | Branche `feature/012-orientation-papier` créée avant tout écriture |
| Aucun commit/push sans ordre | Passe | Aucune opération git d'écriture effectuée |
| Tests obligatoires, coverage > 80 % | Passe | Nouveaux tests prévus (layout roté, seuil de faisabilité, cookie, UI) |
| KISS / YAGNI | Passe | Un seul réglage booléen, pas de second réglage de sens, pas de per-format |
| DRY | Attention | `dotsFromMm`/`resolveDimensions` sont dupliqués dans les deux routes API → extraction dans le périmètre |
| SOC / Single Responsibility | Passe | Faisabilité calculée dans un module unique ; layout inchangé en N |
| Sécurité minimale | Passe | Champ booléen strict validé (zod) ; aucune entrée reflétée brute dans le ZPL |
| Pas de warning/TODO livrés | Passe | À vérifier au merge |

*Complexity Tracking vide : aucune violation.*

## Project Structure

### Documentation (this feature)

```text
specs/012-orientation-papier/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions techniques
├── data-model.md        # Phase 1 — modèle de données
├── quickstart.md        # Phase 1 — guide de validation (inclut le test d'impression nc)
├── contracts/           # Phase 1 — contrats
│   ├── orientation-setting.md
│   ├── printing-orientation.md
│   ├── zpl-rotation.md
│   └── ui-orientation-switch.md
└── tasks.md             # Phase 2 (créé par /speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── print-settings.ts            # PrintSettings + new champ `rotated`
├── print-settings-cookie.ts     # lecture/écriture cookie (merge par champ)
├── paper-sizes.ts               # PaperSize (inchangé)
├── zpl/
│   ├── layout.ts                # computeBarcodeLayout (axes, centrale) 
│   ├── build.ts                 # buildEan13Zpl → orientation B si roté
│   └── location.ts              # buildLocationZpl → orientation B si roté
├── orientation.ts               # (nouveau) seuil de faisabilité rotation
├── ean13/validate.ts            # labelRequestSchema + `rotated` (bool strict)
└── location/validate.ts         # champs partagés + `rotated` (bool strict)

app/api/print/{ean13,location}/route.ts   # résolution dims + orientation (DRY)

components/
├── settings-footer.tsx          # switch Orientation dans Paramètres
├── location-form.tsx            # SwitchRow (pattern existant, réutilisé)
├── ean13-form.tsx
└── ui/switch.tsx                # primitive existante

components/__tests__/            # tests UI (settings-footer, formes)

lib/zpl/__tests__/build.test.ts  # invariants rotés + quasients
lib/__tests__/orientation.test.ts
```

**Structure Decision**: structure monorepo unique existante (`app/`, `components/`,
`lib/`), fonctionnalité répartie dans les fichiers existants + un nouveau module
`lib/orientation.ts` pour la faisabilité. Candidat à extraction unique des deux
routes : `lib/zpl/dimensions.ts` (DRY, conformité constitution).