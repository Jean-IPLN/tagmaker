# Implementation Plan: Galerie des derniers modules utilisés

**Branch**: `005-recent-modules-gallery` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-recent-modules-gallery/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

L'accueil devient une **galerie de cartes** présentant les 4 derniers modules
utilisés (du plus récent au plus ancien) ; si l'historique est vide, un
**squelette de galerie** de même allure est affiché. L'usage est enregistré à
chaque consultation de module (URL observée, source unique), dédupliqué,
tronqué à 4, **expiré au-delà de 30 jours** et persévéré dans un **cookie**
du navigateur (directive utilisateur, aucune nouvelle dépendance). L'accueil
lit le cookie en **SSR** : cartes ou squelette rendus dès le premier HTML.

## Technical Context

**Language/Version**: TypeScript — Next.js 16 (App Router), React 19

**Primary Dependencies**: Aucune nouvelle ; réutilise `@phosphor-icons/react`,
les primitives shadcn `ui/card`, `ui/skeleton`, le catalogue
`lib/modules/registry.ts`

**Storage**: Cookie navigateur `tagmaker_recent_modules` (JSON URL-encodé,
`path=/`, `SameSite=Lax`, `Max-Age=30 jours`, non `HttpOnly`, aucune donnée
sensible) — directive utilisateur. Lecture en SSR via `cookies()` de Next.js,
écriture côté client. Aucune persistance serveur ; lecture/écriture encapsulées
(retour sûr, échec silencieux)

**Testing**: Vitest 5 + jsdom avec Testing Library ; tests au même niveau que
le code source (logique pure `lib/`, composants `components/__tests__`,
tests serveur pour `app/page.tsx`)

**Target Platform**: Navigateur moderne (localhost)

**Project Type**: Application web (Next.js App Router) — composants serveur +
client

**Performance Goals**: Rendu instantané de l'accueil (rien de dépendant du
réseau) ; galerie ou squelette présents dans le HTML serveur (SC-001, SC-004)

**Constraints**: Le cookie est lisible côté serveur (`cookies()` → rendu
dynamique de l'accueil) ; l'écriture reste côté client (tracker). Expiration
**30 jours** (FR-010) et capacité **4** bloquées ; `SameSite=Lax` ; aucune
donnée hors de l'appareil

**Scale/Scope**: Mono-utilisateur, catalogue local de quelques modules,
historique ≤ 4 entrées, expiration 30 jours

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**G1 — Tests obligatoires (≥ 80 %)**: ✓ PASS (post-design confirmé) — logique
pure (record, filtre d'expiration, whitelist, tri) testée unitairement avec
`now` injecté, composants client testés (rendu cartes + squelette), lecture
SSR du cookie testée. Cohérent avec la suite existante (52 tests).

**G2 — KISS**: ✓ PASS — pas de nouvelle dépendance ni abstraction : cookie
natif (browser + `cookies()` Next), fonctions pures, 2 petits composants
client + accueil serveur.

**G3 — YAGNI**: ✓ PASS — uniquement enregistrer / expirer / afficher /
squelette ; ni suppression manuelle, ni statistiques, ni synchronisation
(annoncés hors périmètre dans la spec).

**G4 — SOC / Single Responsibility**: ✓ PASS — `lib/recent-modules.ts`
(logique pure, sans DOM/API) séparée de l'adaptateur cookie
(`lib/recent-modules-cookie.ts` client) et des composants de rendu ; le
tracker observe l'URL (source unique, DRY) et l'accueil SSR lit le cookie.

**G5 — Évolutivité (upgradable)**: ✓ PASS — logique en fonctions pures à
contrats stables (`contracts/recent-modules.md`, `contracts/cookie.md`) ;
l'adaptateur isole le support de stockage ; changer de support (ex. retour à
`localStorage`) ne toucherait que l'adaptateur et l'accueil.

**G6 — Sécurité minimale**: ✓ PASS — cookie sans secret ni donnée sensible,
non `HttpOnly` assumé (analysé en `research.md`) ; ids filtrés par whitelist
du catalogue (FR-009) ; contenu échappé par React ; `SameSite=Lax` ;
lecture/écriture à retour sûr ; données strictement locales (constitution :
stockage local uniquement).

**G7 — Branche dédiée / pas de commit sans ordre**: ✓ PASS — branch prévue
`005-recent-modules-gallery`, aucune action git sans ordre utilisateur.

## Project Structure

### Documentation (this feature)

```text
specs/005-recent-modules-gallery/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── recent-modules.md
│   └── ui.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx            # monte <RecentModulesTracker /> (coquille existante)
└── page.tsx              # accueil SERVEUR : lit le cookie (cookies()) → <RecentModulesGallery /> (remplace l'ancienne vue)
components/
├── recent-modules-gallery.tsx   # galerie de cartes OU squelette (client, reçoit les ids en props)
├── recent-modules-tracker.tsx   # enregistre l'usage depuis l'URL (client, sans DOM)
└── __tests__/
    ├── recent-modules-gallery.test.tsx
    └── recent-modules-tracker.test.tsx
lib/
├── recent-modules.ts            # logique pure (record, expiration 30 j, filtre, tri, capacité 4)
├── recent-modules-cookie.ts     # adaptateur cookie client (lecture/écriture, retour sûr)
├── recent-modules.test.ts      # tests unitaires, même niveau
└── modules/registry.ts         # catalogue existant (source des titres/descriptions/chemins)
```

**Structure Decision**: Structure web appliquée (option par défaut) — les
composants client/liblivent au ras des points d'usage existants du projet, les
tests au même niveau que le code source (constitution). L'ancien composant
« SkeletonForm » accompagnant l'ancien accueil est supprimé avec son test
(YAGNI). La lecture du cookie se fait côté serveur (rendu immédiat), son
écriture côté client (tracker).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Aucune violation — tableau laissé vide.