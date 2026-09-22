---

description: "Task list template for feature implementation"
---

# Tasks: Sidebar-08 et descriptions au survol

**Input**: Design documents from `/specs/003-sidebar-08-tooltips/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Les exemples suivants incluent des tâches de test. Le projet exige
les tests (Constitution V) : TDD rouge/vert, couverture > 80 %.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (Next.js App Router)** : `app/`, `components/`, `lib/` à la racine du monorep

<!--
  Le contenu ci-dessous est le plan de tâches réel de la feature 003,
  organisé par user story (spec.md) et articulé sur les décisions du research.md
  (prébuild sidebar-08, infobulle shadcn droite, aucun eventuel por new dependency).
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Préparation de l'environnement de travail

- [x] T001 Create git branch `003-sidebar-08-tooltips` (`git checkout -b 003-sidebar-08-tooltips`) — jamais de code sur main
- [x] T002 [P] Vérifier qu'aucune nouvelle dépendance n'est requise : primitives `sidebar`, `tooltip`, `separator`, `breadcrumb` présentes dans `components/ui/` ; ne pas exécuter de `npx shadcn add` (pre-build sidebar-08 réutilisé avec les primitives `base-nova` installées)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline avant toute modification

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Run `npm test` pour confirmer la baseline verte (46 tests) avant tout changement et consigner le résultat

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Panneau encastré, liste en titres seuls (Priority: P1) 🎯 MVP

**Goal**: La sidebar adopte la variante encastrée du prébuild sidebar-08
(`variant="inset"`, marque « TagMaker ») et affiche les modules **par leur
titre seul** (FR-001, FR-002).

**Independent Test**: Rendu seul de `AppSidebar` (`SidebarProvider` obligatoire) :
`data-variant="inset"` sur `[data-slot="sidebar"]`, marque « TagMaker », titre
`EAN-13` présent, texte de description absent du document.

### Tests for User Story 1 (TDD — obligation Constitution V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [US1] Écrire le test TDD dans `components/__tests__/app-sidebar.test.tsx` : (a) `container.querySelector('[data-slot="sidebar"]')` porte `data-variant="inset"`, (b) marque « TagMaker » rendue, (c) titre `EAN-13` présent, (d) description « Imprimer des étiquettes à code-barres EAN-13 » absente du document → **attendu rouge**

### Implementation for User Story 1

- [x] T005 [US1] Implémenter `components/app-sidebar.tsx` selon le prébuild sidebar-08 (research.md) : `<Sidebar variant="inset">` (repli `offcanvas` défaut conservé), `SidebarHeader` (marque « TagMaker », icône phosphor), groupe « Modules » (`SidebarGroup`/`SidebarMenu`) avec entrées `module.name` en titres seuls via `getLabelModules()`, état actif conservé (`isActive` → `data-active`, contrat C-2.2) ; la description n'est **pas** rendue
- [x] T006 [US1] Vérification : `npm test` (US1 vert) + `npm run build` + smoke `http://localhost:3000/` (panneau encastré visible, liste titres seuls)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Description au survol, infobulle droite (Priority: P1)

**Goal**: Le survol (ou le focus clavier) d'une entrée de module ouvre une
infobulle shadcn **à droite** contenant la description ; elle se ferme au
retrait du pointeur ; une seule infobulle à la fois (FR-003..FR-006, US2).

**Independent Test**: Rendu seul de `AppSidebar` + interactions simulées
(`pointerEnter`/`pointerLeave`) sur le lien d'un module : description absente
initialement, présente dans le contenu de l'infobulle après survol, absente
après retrait.

### Tests for User Story 2 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [US2] Étendre `components/__tests__/app-sidebar.test.tsx` (interactions infobulle) : `fireEvent.pointerEnter` (ou `mouseEnter`) sur le lien `EAN-13` → texte description présent ; `pointerLeave` → texte absent ; `queryByText(description)` absent avant tout survol → **attendu rouge**

### Implementation for User Story 2

- [x] T008 [US2] Implémenter l'infobulle dans `components/app-sidebar.tsx` : envelopper chaque entrée de module d'un `Tooltip` shadcn (`TooltipTrigger` = lien de l'entrée, `TooltipContent side="right"` = `module.description`) — l'unicité d'ouverture est assurée par le composant (contrats C-2.3, C-2.4) ; ne pas utiliser la prop `tooltip` de `SidebarMenuButton` (s'affiche uniquement replié, research.md §2)
- [x] T009 [US2] Vérification : `npm test` (US1 + US2 verts) + smoke survol sur `/` (infobulle positionnée à droite)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently (P1 livrable complet)

---

## Phase 5: User Story 3 - Non-régression du gabarit (Priority: P2)

**Goal**: Le header et le slot de contenu se calent sur le gabarit du prébuild
sidebar-08 et tous les parcours existants restent valides (FR-007, FR-008,
US3, SC-004).

**Independent Test**: Parcours A-E de `quickstart.md` (racine skeleton, /ean13
+ entrée active, accès direct, 404 avec shell, repli mobile) + tests existants
(`app-sidebar`, `header`) inchangés et verts.

### Implementation for User Story 3

- [x] T010 [P] [US3] Aligner `components/header.tsx` sur le gabarit du prébuild : `header` `flex h-16 shrink-0 items-center gap-2` (sans `border-b`), conteneur interne `flex items-center gap-2 px-4` (SidebarTrigger `-ml-1`, Separator vertical, Breadcrumb du module courant / « Accueil »)
- [x] T011 [P] [US3] Aligner `app/layout.tsx` sur le slot du prébuild : à l'intérieur de `SidebarInset`, header puis conteneur `flex flex-1 flex-col gap-4 p-4 pt-0` recevant `{children}` (Toaster et dark conservés)
- [x] T012 [US3] Vérification non-régression : `npm test` (46 + nouveaux verts) + smoke des parcours visés A-E (`quickstart.md`) — racine skeleton, `/ean13` + `data-active`, accès direct, 404 avec shell, repli mobile

**Checkpoint**: All user stories are now independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Améliorations transverses, portes de qualité

- [x] T013 Mettre à jour `README.md` : présentation encastrée sidebar-08 et infobulle droite (section « Navigation par module »)
- [x] T014 Gate `specs/003-sidebar-08-tooltips/checklists/ux.md` — approbation explicite de l'utilisateur le 2026-09-22 pour procéder malgré 36/36 items non cochés ; les markers d'`ux.md` restent intacts ; conflit CHK012/CHK013 résolu : `collapsible offcanvas` du prébuild conservé (research.md §5)
- [x] T015 Coverage : `npm run test:coverage` — seuils ≥ 80 % (statements/branches/functions/lines) ; exclusion `components/ui/**` conservée
- [x] T016 `npm run lint` (0 erreur / 0 warning) + `npm run build` (OK)
- [x] T017 Exécuter `quickstart.md` (scénarios A-E) — validé via `node fetch` (accueil skeleton, /ean13 actif + breadcrumb, 404 avec shell) et tests jsdom (infobulle ouverte `data-open`/`data-side="right"`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3/4/5)**: All depend on Foundational phase completion
  - US1 (P1) → US2 (P1) → US3 (P2) ; exécution séquentielle (priorité)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Ne dépend que de la baseline (T003). Fichiers : `app-sidebar.tsx` + son test
- **User Story 2 (P1)**: Dépend de US1 (mêmes fichiers `app-sidebar.tsx`/test → séquentielle après US1) ; indépendante des US3
- **User Story 3 (P2)**: Dépend de US1 (shell en place) ; T010 et T011 parallélisables entre eux

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Implémentation avant vérification (build/smoke)
- Story complete before moving to next priority

### Parallel Opportunities

- T002 [P] peut s'exécuter en parallèle de T001
- T010 [P] et T011 [P] (US3) parallélisables (fichiers différents : `header.tsx` vs `app/layout.tsx`)
- Aucune autre parallélisation sûre : les tests/implémentations d'une même story touchent les mêmes fichiers

---

## Parallel Example: User Story 3

```bash
# Deux fichiers distincts, exécutables en parallèle :
Task: "Aligner components/header.tsx sur le gabarit h-16 du prébuild"
Task: "Aligner app/layout.tsx sur le slot p-4 pt-0 du prébuild"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 — P1 livrable)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (baseline 46 tests)
3. Complete Phase 3: User Story 1 (encastra + titres seuls) → Vérifier seul
4. Complete Phase 4: User Story 2 (infobulle droite) → Vérifier (P1 complet)
5. **STOP and VALIDATE** avant US3

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → Demo (panneau encastré, liste titres)
3. Add US2 → Test → Demo (infobulle droite au survol) — P1 livré
4. Add US3 → non-régression (header/layout prébuild) → Demo
5. Polish (README, gate ux.md, coverage, lint/build, quickstart)

### Parallel Team Strategy

Équipe simple (1 développeur) : séquentiel. Si 2 développeurs : après US1+US2,
US3 (T010/T011) peut être parallélisé avec le polish non bloquant.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD, Constitution V)
- **Aucun commit sans ordre explicite de l'utilisateur** (Constitution)
- Gate `checklists/ux.md` à lever **avant** le lancement de l'implémentation (`/speckit.implement`)
- Eviter : tâches vagues, conflits mêmes fichiers, dépendances inter-stories qui cassent l'indépendance