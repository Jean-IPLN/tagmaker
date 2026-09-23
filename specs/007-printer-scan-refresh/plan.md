# Implementation Plan: Découverte d'imprimantes : spinner et actualisation

**Branch**: `007-printer-scan-refresh` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-printer-scan-refresh/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Feature incrémentale sur le pied de barre latérale (composant
`SettingsFooter`, livré par la feature 006) :

1. **Formats papier depuis `.env`** — la capacité « liste de formats
   `largeur×hauteur` » existe déjà (`ZPL_PAPER_SIZES="40x25, 50x25, 100x50"`,
   dossiers de web responsable : `lib/paper-sizes.ts`). On la **conserve telle
   quelle**, on la documente et elle est couverte par la validation
   (FR-001 → FR-003, déjà satisfaits).
2. **Spinner pendant la recherche d'imprimantes** — pendant le scan
   (`printerScan === "scanning"`), la ligne « Recherche des imprimantes… »
   du menu déroulant est accompagnée d'une icône animée en rotation
   (FR-004, FR-005).
3. **Bouton « Actualiser » dans le menu déroulant** — visible dès qu'aucune
   recherche n'est en cours (états `idle`/`done`), il relance un scan complet ;
   pendant le scan il disparaît (jamais deux scans simultanés) et la liste
   affichée est remplacée par les nouveaux résultats (FR-006 → FR-009).

Aucune nouvelle dépendance, aucun changement du parser `.env`, de la découverte
réseau ni des primitives UI : le changement est cantonné à
`components/settings-footer.tsx` et ses tests.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 16.3.5 (App Router), React 19.2.8,
Node 20+

**Primary Dependencies**: `@base-ui/react` ^1.8 (Select, Popup, Positioner),
Tailwind CSS v4 (+ `tw-animate-css` présent), `@phosphor-icons/react` ^2.1,
`zod` ^4.6 (validation env), `shadcn` CLI ^4.21 présent mais non sollicité ici

**Storage**: fichier `.env` (variables serveur, ex. `ZPL_PAPER_SIZES`) +
cookie client `tagmaker_print_settings` (feature 006) — pas de base de données

**Testing**: vitest 5 + jsdom, `@testing-library/react` + jest-dom, coverage
> 80 % ; `npm run lint`, `npx tsc --noEmit`, `npm run build` (gate)

**Target Platform**: navigateur (client) + API route Next.js servie en
localhost (côté serveur : `app/api/printers/discover/route.ts`)

**Project Type**: web application full-stack (Next.js App Router), monorepo
racine unique

**Performance Goals**: scan `discoverPrinters` ~1 s (une passe parallèle des
254 adresses, feature 006) ; la relance ne dégrade pas ce budget ; réactivité
UI standard (pas de seuil volumétrique)

**Constraints**: écoute locale uniquement (constitution) ; aucune dépendance
nouvelle superflue (KISS/YAGNI) ; cohérence avec le style d'icônes existant
(phosphor + Tailwind) ; pas de modification du mécanisme réseau ni du parser
env

**Scale/Scope**: application locale mono-poste ; 3 user stories P1/P1/P2 ;
périmètre strictement UI + vérification config

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | État | Justification |
|----------|------|---------------|
| I. KISS — Simplicité | ✅ PASS | Spinner = icône phosphor + `animate-spin` (utilitaires déjà dispo). Pas de librairie de spinners ajoutée. |
| II. DRY — Pas de duplication | ✅ PASS | Extraction d'un `startScan()` unique, partagé entre l'auto-scan à l'ouverture et le bouton « Actualiser ». |
| III. YAGNI — Pas d'anticipation | ✅ PASS | Aucune persistance du bouton, aucun thème, aucun lazy-load spéculatif. La liste `.env` n'est pas réimplémentée (déjà livrée en 006). |
| IV. Code clair | ✅ PASS | Petites fonctions, noms « quoi » ; le state machine `idle`/`scanning`/`done` reste inchangé. |
| V. Tests obligatoires | ✅ PASS | `settings-footer.test.tsx` mis à jour : spinner, bouton Actualiser, interdiction de double scan. Suite globale reste verte (> 80 % couverture). |
| VI. Évolutivité | ✅ PASS | Aucun changement de contrat public (props `SettingsFooter` identiques, réponses API inchangées). |
| Sécurité minimale | ✅ PASS | Aucun secret, aucune donnée envoyée ; le bouton ne déclenche que le scan réseau local existant (lecture seule, port 9100). |

Résultat : **aucune violation** → Phase 0 autorisée.

## Project Structure

### Documentation (this feature)

```text
specs/007-printer-scan-refresh/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
tagmaker/                                   # monorepo Next.js racine unique
├── .env / .env.example                     # variables, dont ZPL_PAPER_SIZES (liste « largeur×hauteur »)
├── app/
│   └── api/printers/discover/route.ts      # GET → { printers } / 503 (inchangé)
├── components/
│   ├── settings-footer.tsx                 # ⚙️ CHANGEMENT PRINCIPAL : spinner + bouton Actualiser
│   ├── ui/select.tsx                       # primitives Select (POPUP conteneur) — non modifié
│   └── __tests__/settings-footer.test.tsx  # ⚙️ tests mis à jour : spinner, Actualiser, double-scan
├── lib/
│   ├── env.ts                              # schéma zod des variables (ZPL_PAPER_SIZES présent)
│   ├── paper-sizes.ts                      # parsePaperSizes (liste .env) — inchangé
│   ├── print-settings-cookie.ts            # réglages cookie (feature 006) — inchangé
│   └── printer/discovery.ts                # scan réseau — inchangé
└── specs/007-printer-scan-refresh/         # documentation de cette feature
```

**Structure Decision**: projet unique (Next.js) — structure existante
conservée. Le changement est **strictement client** :
`components/settings-footer.tsx` + `components/__tests__/settings-footer.test.tsx`
(+ documentation). Aucune nouvelle couche.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Aucune violation — tableau vide. Le spinner et le bouton sont des ajouts de
quelques lignes dans le composant existant ; l'extraction `startScan()` réduit
la duplication actuelle (l'appel auto du `onOpenChange` et celui du bouton).

- **Constitution re-check post-design** : PASS (voir Phase 1) — aucune
  abstraction nouvelle, aucun contrat cassé.