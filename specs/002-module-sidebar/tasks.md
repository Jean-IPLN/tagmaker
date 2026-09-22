---

description: "Task list for feature implementation — Navigation modules via sidebar"

---

# Tasks: Navigation modules via sidebar

**Input**: Design documents from `/specs/002-module-sidebar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md

**Tests**: **Couvrés** — la constitution impose des tests obligatoires (couverture > 80 %) et le plan (G1) exige des tests de composants coquille. Tests écrits d'abord (TDD : rouges avant implémentation), conformément au modèle de la feature 001.

**Gate quality**: `checklists/ux.md` est un gate de revue pour `/speckit.implement` (tous les items doivent être cochés par le relecteur avant livraison).

**Organization**: Tasks grouped by user story for independent implementation/testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to user stories in spec.md (US1, US2, US3)
- Exact file paths in descriptions

## Path Conventions

- Single project (Next.js App Router) : `app/`, `components/`, `lib/`, `specs/002-module-sidebar/`
- Tests co-localisés `__tests__/` (même niveau que le code — constitution)
- Composants shadcn : `components/ui/` (générés, exclus de la couverture)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branche git et primitives shadcn nécessaires au shell

- [x] T001 Create git branch `002-module-sidebar` (`git checkout -b 002-module-sidebar`) — jamais de code sur main
- [x] T002 [P] Add shadcn primitives `sidebar`, `separator`, `breadcrumb`, `skeleton` via `npx shadcn@latest add sidebar separator breadcrumb skeleton --yes` (style `base-nova` → `components/ui/sidebar.tsx`, `separator.tsx`, `breadcrumb.tsx`, `skeleton.tsx`)

**Checkpoint**: composants shadcn présents dans `components/ui/`, branche prête.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline vert avant refactor (aucun prérequis métier bloquant)

- [x] T003 Run `npm test` to confirm green baseline (38 tests) and record output before any change

**Checkpoint**: suite verte connue — baseline pour détecter toute régression.

---

## Phase 3: User Story 1 - Choix d'un module depuis la sidebar (Priority: P1) 🎯 MVP

**Goal**: La sidebar shadcn liste les modules du registre ; sélectionner un module affiche son formulaire dans la zone principale.

**Independent Test**: Ouvrir la racine avec le shell ; la sidebar liste « EAN-13 » (nom + description) ; le clic sur l'entrée affiche le formulaire EAN-13 (`/ean13`) dans la zone principale.

### Tests for User Story 1 (TDD — rouges avant implémentation) ⚠️

- [x] T004 [P] [US1] Write `components/__tests__/app-sidebar.test.tsx`: with `next/navigation#usePathname` mocked to `/` — asserts the sidebar lists every module name+description from `getLabelModules()` (`lib/modules/registry.ts`), each rendered as a link to `module.href`, and no entry is active. Expect FAIL (component missing)

### Implementation for User Story 1

- [x] T005 [US1] Implement `components/app-sidebar.tsx`: compose `Sidebar` (shadcn, default variant) with `SidebarHeader` (brand « TagMaker »), `SidebarContent` → `SidebarGroup` → `SidebarMenu`; one `SidebarMenuItem` per module from `getLabelModules()` with `SidebarMenuButton` `render={<Link href={module.href} />}` (module icon optional via `@phosphor-icons/react`); `isActive={pathname === module.href}` from `usePathname()`; `SidebarRail`
- [x] T006 [US1] Build the app shell in `app/layout.tsx`: wrap children in `<SidebarProvider><AppSidebar /><SidebarInset>{header + {children} + Toaster}</SidebarInset></SidebarProvider>`; keep `lang="fr"`, dark class (`dark`), fonts and existing metadata; import `AppSidebar` from `@/components/app-sidebar`
- [x] T007 [US1] Run `npm test` (T005 green) then `npm run build` — smoke-check dev server: sidebar visible on `/` and `/ean13`, navigation works; current landing content (gallery) still renders inside the shell

**Checkpoint**: sidebar fonctionnelle, navigation vers `/ean13` OK, suite verte.

---

## Phase 4: User Story 2 - État par défaut : SkeletonForm (Priority: P2)

**Goal**: À la racine, la zone principale affiche un SkeletonForm (gabarit squelettique d'un formulaire de module), aucune zone vide — la galerie disparaît.

**Independent Test**: Ouvrir `/` → la zone principale affiche un formulaire squelettique (lignes de label/champ/bouton) et plus aucune grille de cartes.

### Tests for User Story 2 (TDD — rouges avant implémentation) ⚠️

- [x] T008 [P] [US2] Write `components/__tests__/skeleton-form.test.tsx`: asserts the component renders a skeleton-shaped module form (title, label+input lines, button line via `Skeleton` placeholders) and exposes no editable form fields. Expect FAIL (component missing)

### Implementation for User Story 2

- [x] T009 [US2] Implement `components/skeleton-form.tsx`: pure composition of shadcn primitives (`Card`, `Skeleton`) replicating the silhouette of `Ean13Form` (title row, code label+field row, quantity label+field row, button row) — purely visual, no interactive elements
- [x] T010 [US2] Rewrite `app/page.tsx` to render `<SkeletonForm />` as the landing content (no gallery, no heading)
- [x] T011 [P] [US2] Delete `components/label-gallery.tsx` and `components/__tests__/label-gallery.test.tsx` (replaced by the sidebar; registry remains the single source — FR-008)

**Checkpoint**: racine = SkeletonForm dans le shell, galerie supprimée, suite verte.

---

## Phase 5: User Story 3 - Navigation persistante et module actif (Priority: P3)

**Goal**: Sidebar visible sur toutes les vues, entrée active mise en évidence, fil d'Ariane (breadcrumb) reflétant le module courant.

**Independent Test**: Naviguer racine ↔ `/ean13` ; l'entrée active et le breadcrumb suivent l'URL ; la sidebar reste visible partout (y compris URL inconnue).

### Tests for User Story 3 (TDD — rouges avant implémentation) ⚠️

- [x] T012 [P] [US3] Write `components/__tests__/header.test.tsx`: with `usePathname()` mocked — `/` → breadcrumb « TagMaker » ; `/ean13` → page « EAN-13 » ; chemin inconnu `/x` → « TagMaker ». Expect FAIL (component missing)
- [x] T013 [P] [US3] Extend `components/__tests__/app-sidebar.test.tsx` with active-state cases: `usePathname()` = `/ean13` → entry « EAN-13 » active (`aria-current`/`isActive`) and `usePathname()` = `/` → no active entry. Expect FAIL until T005/T015 implement `isActive`

### Implementation for User Story 3

- [x] T014 [US3] Implement `components/header.tsx`: sticky `header` with `SidebarTrigger`, `Separator` (vertical) and `Breadcrumb` — label derived from `getLabelModules()` + `usePathname()` (module found → its name ; root or unknown → « TagMaker »)
- [x] T015 [US3] Integrate `components/header.tsx` into `app/layout.tsx` (inside `SidebarInset`, above `{children}`)
- [x] T016 [US3] Verify the shell persists on unknown URLs: next/app already wraps `_not-found` in the root layout; if not the case, add `app/not-found.tsx` (minimal content, shell kept). Verify via dev server

**Checkpoint**: entrée active + breadcrumb suivent l'URL ; shell persistant sur toutes les vues.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, gates quality, validation globale

- [x] T017 Update `README.md` architecture section (navigation par sidebar-04 shadcn, SkeletonForm par défaut, primitives `sidebar`/`skeleton`/`separator`/`breadcrumb`)
- [x] T018 (gate ux.md levé par approbation explicite de l'utilisateur le 2026-09-19) Validate the reviewer gate `specs/002-module-sidebar/checklists/ux.md`: all items reviewed and checked `[x]` (requirements-quality) before delivery
- [x] T019 Run `npm run test:coverage` — global coverage ≥ 80 % (constitution) ; add missing tests if any branch below threshold
- [x] T020 [P] Run `npm run lint` (no warnings) and `npm run build` (typecheck + build OK, routes `/`, `/ean13`, `/api/print/ean13`)
- [x] T021 Run quickstart.md scenarios A–E (dev + navigateur : shell racine, sélection, accès direct, repli/écran étroit, cohérence registre) and record results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup
- **US1 (Phase 3)**: depends on Setup (shadcn `sidebar`) — no dependency on other stories
- **US2 (Phase 4)**: depends on US1 (shell + page) — `skeleton-form.tsx` itself independent
- **US3 (Phase 5)**: depends on US1 & US2 (shell, header dans SidebarInset)
- **Polish (Phase 6)**: depends on US1–US3 complete

### User Story Dependencies

- **US1 (P1)**: après Setup — aucune dépendance
- **US2 (P2)**: après US1 (intégration dans le shell) — testable indépendamment (composant seul)
- **US3 (P3)**: après US1/US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Composant/UI avant intégration (layout/page)
- Story complète avant la suivante

### Parallel Opportunities

- T002 (shadcn add) parallèle au reste du Setup
- T004 seul (test US1) ; T008/T011 parallèles dans US2 ; T012/T013 parallèles dans US3
- T019 et T020 parallèles dans Polish
- Les composants shadcn générés (`components/ui/**`) ne sont jamais implémentés à la main

---

## Parallel Example: User Story 2

```bash
# Launch tests/components together:
Task: "Write components/__tests__/skeleton-form.test.tsx (FAIL first)"
```

```bash
# After implementation:
Task: "Implement components/skeleton-form.tsx"
Task: "Delete components/label-gallery.tsx + its test"
# (parallel — files distincts)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003, baseline)
3. Complete Phase 3: User Story 1 (T004–T007) — sidebar + shell + navigation modules
4. **STOP and VALIDATE**: sidebar liste les modules, navigation `/ean13` fonctionnelle, suite verte
5. Demo si prêt

### Incremental Delivery

1. Setup + Baseline → branche prête
2. US1 (sidebar + shell) → Tester → **MVP**
3. US2 (SkeletonForm racine) → Tester
4. US3 (module actif + breadcrumb + persistance vues)
5. Polish (docs, gate ux.md, coverage, lint, build, quickstart A–E)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group — **jamais sans ordre explicite de l'utilisateur** (constitution)
- Avoid: vague tasks, same-file conflicts, cross-story dependencies breaking independence
- Contrainte « uniquement shadcn » : aucune primitive UI hors `components/ui/` ; `app-sidebar.tsx`, `skeleton-form.tsx`, `header.tsx` = compositions uniquement