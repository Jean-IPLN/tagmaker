---

description: "Task list template for feature implementation"
---

# Tasks: Logo et favicon « tag »

**Input**: Design documents from `/specs/004-tag-logo-favicon/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Le projet exige les tests (Constitution V) : TDD rouge/vert, couverture > 80 %.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (Next.js App Router)** : `app/`, `components/`, `lib/` à la racine du monorep

<!--
  Plan de tâches réel de la feature 004, organisé par user story (spec.md) et
  basé sur les décisions du research.md (icône phosphor « Tag » déjà installée,
  favicon via app/icon.svg, suppression de app/favicon.ico).
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Préparation de l'environnement de travail

- [x] T001 Create git branch `004-tag-logo-favicon` (`git checkout -b 004-tag-logo-favicon`) — jamais de code sur main
- [x] T002 [P] Vérifier qu'aucune nouvelle dépendance n'est requise : `@phosphor-icons/react` déjà installé (v2.1.10) et exporte `Tag` ; ne pas exécuter d'installation (`npm install` non nécessaire)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline avant toute modification

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Run `npm test` pour confirmer la baseline verte (49 tests) avant tout changement et consigner le résultat

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Logo de marque « TagMaker » (Priority: P1) 🎯 MVP

**Goal**: L'entête de la barre latérale affiche un logo composé du pictogramme
`Tag` (phosphor) suivi du nom « TagMaker » (FR-001, FR-004).

**Independent Test**: Rendu de `AppSidebar` seul : le lien de marque
(`role="link"`, nom « TagMaker ») contient un élément `svg` (assertion dans
`components/__tests__/app-sidebar.test.tsx`).

### Tests for User Story 1 (TDD — obligation Constitution V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [US1] Étendre `components/__tests__/app-sidebar.test.tsx` : dans le test du lien de marque « TagMaker », asserter que ce lien contient un élément `svg` (logo) — **attendu rouge** (aucune icône rendue actuellement)

### Implementation for User Story 1

- [x] T005 [US1] Implémenter le logo dans `components/app-sidebar.tsx` : dans l'entête `SidebarHeader`, précédant le span « TagMaker », importer et rendre `<Tag className="size-5" aria-hidden="true" />` depuis `@phosphor-icons/react` (poids « regular » par défaut, identique au favicon) ; le lien de marque et sa persistance sont conservés
- [x] T006 [US1] Vérification : `npm test` (US1 vert) + `npm run build` + smoke `http://localhost:3000/` (logo présent dans le SSR de la barre latérale)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Favicon d'onglet cohérent (Priority: P1)

**Goal**: L'onglet du navigateur affiche le pictogramme `Tag` identique au
logo, sur toutes les vues (`/, /ean13, 404`) ; l'icône générique
`app/favicon.ico` est supprimée (FR-002, FR-003).

**Independent Test**: Lecture de `app/icon.svg` : fichier SVG présent, viewBox
`0 0 256 256`, contient le fond arrondi sombre et le tracé phosphor du tag ;
`app/favicon.ico` absent ; après build, la page sert une balise
`rel="icon"` unique.

### Tests for User Story 2 (TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [US2] Écrire le test avec `readFileSync` dans `components/__tests__/icon-assert.test.ts` : (a) `app/icon.svg` existe et contient `<svg`, `viewBox="0 0 256 256"` et le tracé du tag « regular » (sous-chaîne `M243.31,136,144,36.69`), (b) `app/favicon.ico` **n'existe pas** — **attendu rouge** (icône encore présente, pas de `icon.svg`)

### Implementation for User Story 2

- [x] T008 [US2] Créer `app/icon.svg` : SVG 256×256 (viewBox phosphor), fond arrondi sombre (`#0c111d`) et le pictogramme « tag » en clair (tracé `regular` extrait de `node_modules/@phosphor-icons/react/dist/defs/Tag.es.js`), conforme à la convention fichier (research.md §2) — Next générera `<link rel="icon" ... sizes="any" />`
- [x] T009 [US2] Supprimer `app/favicon.ico` (icône générique create-next-app) — garantit une balise `rel="icon"` unique (contrat C-2.2)
- [x] T010 [US2] Vérification : tests US1 + US2 verts ; `npm run build` puis contrôle du `<head>` servi sur `/`, `/ean13` et une URL inconnue : balise `rel="icon"` présente et unique

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently (feature complète)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Documentation et portes de qualité

- [x] T011 Mettre à jour `README.md` : mention du logo « tag » (phosphor) dans l'entête de la barre latérale et du favicon `app/icon.svg` (section « Navigation par module » ou « Structure »)
- [x] T012 Coverage : `npm run test:coverage` — seuils ≥ 80 % (statements/branches/functions/lines)
- [x] T013 `npm run lint` (0 erreur / 0 warning) + `npm run build` (OK)
- [x] T014 Exécuter `quickstart.md` (scénarios A logo, B favicon, C non-régression) et consigner les résultats

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3/4)**: All depend on Foundational phase completion ; US1 (P1) puis US2 (P1), exécution séquentielle (priorité)
- **Polish (Final Phase)**: Depends on the two user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Ne dépend que de la baseline. Fichier : `app-sidebar.tsx` + son test
- **User Story 2 (P1)**: Indépendante de US1 (fichiers `app/icon.svg`, `app/favicon.ico`, `icon-assert.test.ts`) — parallélisable avec US1 en théorie (staffing), séquentielle ici en raison de la vérification unique

### Within Each User Story

- Tests (TDD) MUST be written and FAIL before implementation
- Implémentation avant vérification (build/smoke)
- Story complete before moving to next priority

### Parallel Opportunities

- T002 [P] peut s'exécuter en parallèle de T001
- T004 et T007 (tests TDD des deux stories) écrivent des fichiers différents → parallélisables
- T005 (US1) et T008/T009 (US2) touchent des fichiers distincts → parallélisables
- T012/T013 exécutions séquentielles, T014 à la fin

---

## Parallel Example: Stories US1 + US2

```bash
# Tests TDD des deux stories (fichiers différents) :
Task: "Étendre app-sidebar.test.tsx : lien de marque contient un svg"
Task: "Écrire icon-assert.test.ts : app/icon.svg présent + favicon.ico absent"

# Implémentations après TDD (fichiers différents) :
Task: "components/app-sidebar.tsx : <Tag /> + TagMaker"
Task: "Créer app/icon.svg puis supprimer app/favicon.ico"
```

---

## Implementation Strategy

### MVP First (Feature 004 complète)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (baseline 49 tests)
3. Complete Phase 3: User Story 1 (logo) → Vérifier seul
4. Complete Phase 4: User Story 2 (favicon) → Vérifier (feature complète)
5. **STOP and VALIDATE** avant Polish si livraison intermédiaire

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (logo) → Test → Demo
3. Add US2 (favicon) → Test → Demo — feature complète
4. Polish (README, coverage, lint/build, quickstart)
5. Les deux stories (P1) sont le MVP : le livrable est la feature 004 entière

### Parallel Team Strategy

Équipe 2 développeurs : TDD T004/T007 en parallèle, puis T005 et T008/T009 en
parallèle, vérifications US1/US2 ensuite.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD, Constitution V)
- **Aucun commit sans ordre explicite de l'utilisateur** (Constitution)
- Aucune nouvelle dépendance (constitution I/III) ; l'icône « Tag » provient de
  `@phosphor-icons/react` déjà installé
- Traçage du favicon : `app/icon.svg` (convention fichier v16) plutôt qu'un
  générateur `ImageResponse` (research.md §2)
- Eviter : tâches vagues, conflits mêmes fichiers, dépendances inter-stories qui cassent l'indépendance