---

description: "Task list for feature implementation"
---

# Tasks: Galerie des derniers modules utilisés

**Input**: Design documents from `/specs/005-recent-modules-gallery/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD exigé — chaque test est écrit avant l'implémentation et doit
échouer (rouge), puis passer après implémentation (vert).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `app/`, `components/`, `lib/` at repository root (Next.js App Router)
- Tests au même niveau que le code source (constitution)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialisation du chantier

- [x] T001 Create dedicated git branch `005-recent-modules-gallery` (dépôt initialisé : ne jamais coder sur `main`)
- [x] T002 [P] Verify no new dependency needed: cookie natif (navigateur + `cookies()` Next), `components/ui/card`, `components/ui/skeleton`, `lib/modules/registry.ts` déjà présents (aucun `npm install` requis)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Run full Vitest suite and record baseline (52 tests verts avant toute modification) via `npm test`

**Checkpoint**: Baseline verte — l'implémentation des user stories peut commencer.

---

## Phase 3: User Story 1 - Enregistrement des modules consultés (Priority: P1) 🎯 MVP

**Goal**: Chaque consultation d'un module (URL coïncidant avec un `href` du catalogue) est enregistrée — dédupliquée, en tête, éviction à 4, expiration à 30 jours — dans le cookie `tagmaker_recent_modules`.

**Independent Test**: Visiter `/ean13` puis relire le cookie `tagmaker_recent_modules` : EAN-13 y figure seul, `Max-Age` de 30 jours ; re-visiter `/ean13` ne crée aucun doublon.

### Tests for User Story 1 (TDD — rouge attendu) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] [US1] Write unit tests in `lib/recent-modules.test.ts` for pure logic contract (contracts/recent-modules.md): `recordModule` (déduplication par `moduleId`, remontée en tête, troncature à `MAX_RECENT_MODULES = 4` = « nouvelle liste », `MAX_RECENT_AGE_MS = 30 * 24 * 60 * 60 * 1000`), `filterValidEntries(entries, availableModuleIds, now)` exclut les entrées dont `lastUsedAt < now - MAX_RECENT_AGE_MS` (FR-010) et celles hors catalogue (FR-009), `getRecentModuleIds` trie du plus récent au plus ancien, `serializeEntries`/`parseEntries` (JSON invalide → `[]`, entrées mal formées écartées individuellement)
- [x] T005 [P] [US1] Write tests in `lib/recent-modules-cookie.test.ts` for cookie adapter (contracts/cookie.md): `RECENT_COOKIE_NAME = "tagmaker_recent_modules"`, lecture via `document.cookie` (cookie absent ou JSON invalide → `[]` sans exception), écriture avec `path=/`, `SameSite=Lax`, `Max-Age=30 jours` (valeur rafraîchie) et encodage des caractères spéciaux, échec d'écriture silencieux
- [x] T006 [US1] Write test in `components/__tests__/recent-modules-tracker.test.tsx`: au rendu du tracker sur la route `/ean13`, le cookie `tagmaker_recent_modules` est écrit avec EAN-13 en tête ; sur la route `/` (non-module), aucune écriture ; le composant ne produit aucun rendu visible (aucun `role`/`data-*` dans son DOM)

### Implementation for User Story 1

- [x] T007 [US1] Implement `lib/recent-modules.ts`: constantes `MAX_RECENT_MODULES = 4` et `MAX_RECENT_AGE_MS = 30 * 24 * 60 * 60 * 1000`, type `RecentModuleEntry { moduleId: string; lastUsedAt: number }`, fonctions pures `recordModule(entries, moduleId, timestamp)`, `filterValidEntries(entries, availableModuleIds, now = Date.now())`, `getRecentModuleIds(entries, availableModuleIds, now = Date.now())`, `serializeEntries(entries)`, `parseEntries(raw)` — immutables, sans accès navigateur/cookie (contracts/recent-modules.md)
- [x] T008 [US1] Implement `lib/recent-modules-cookie.ts`: `readRecentCookie(): RecentModuleEntry[]` (parse sûr de `document.cookie` → `[]` en cas d'échec) et `writeRecentCookie(entries)` (`path=/`, `SameSite=Lax`, `Max-Age=30 jours`, valeur URL-encodée, échec silencieux) (contracts/cookie.md)
- [x] T009 [US1] Implement `components/recent-modules-tracker.tsx` (client, `usePathname`, aucun DOM visible) et le monter dans `app/layout.tsx` (coquille `SidebarProvider` existante) : à chaque chemin coïncidant avec l'`href` d'un module du catalogue, lire le cookie, appliquer `recordModule` + filtres (`now` courant), réécrire le cookie — couvre clic sidebar, carte, URL directe, retour arrière
- [x] T010 [US1] Vérification US1 : suite Vitest verte (T004–T006 passent) + smoke serveur dev (visiter `/ean13` → cookie `tagmaker_recent_modules` = `[{ "moduleId": "ean13", ... }]`, `Max-Age` 30 jours) avec sonde `node -e fetch` ; servir via `setsid npm run dev` (jamais `pkill -f "next dev"`, stopper par PID)

**Checkpoint**: US1 fonctionnelle et testable seule (données d'usage écrites).

---

## Phase 4: User Story 2 - Accueil en galerie de cartes (Priority: P1)

**Goal**: La page d'accueil affiche une galerie de cartes des 4 derniers modules utilisés (récent → ancien), chacune avec titre + description du catalogue et navigation vers le module ; si l'historique est vide (ou expiré/corrompu), un squelette de galerie (`role="status"`) est rendu dès le HTML serveur.

**Independent Test**: Avec un cookie `tagmaker_recent_modules` contenant EAN-13, ouvrir `/` : le HTML serveur contient une carte « EAN-13 » (titre + description) cliquable ; sans cookie, le HTML serveur contient le squelette (aucune carte, aucun message « Choisissez un module… »).

### Tests for User Story 2 (TDD — rouge attendu) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US2] Write component test in `components/__tests__/recent-modules-gallery.test.tsx`: props `moduleIds` vide → rendu du squelette (`role="status"`, formes de cartes, pas de lien) ; `moduleIds` non vide (EAN-13) → une carte avec titre « EAN-13 » + description issues du catalogue (`lib/modules/registry.ts`), ordre du plus récent au plus ancien, chaque carte est un lien vers l'`href` du module
- [x] T012 [US2] Write server test in `app/__tests__/page.test.tsx` (mock de `cookies()` de `next/headers`): cookie valide → page rend la galerie avec la ou les cartes valides (modèle + expiration 30 jours appliqués) ; cookie absent, JSON invalide ou entrée expirée → squelette sans erreur (FR-008, FR-009, FR-010)

### Implementation for User Story 2

- [x] T013 [US2] Implement `components/recent-modules-gallery.tsx` (client, reçoit `moduleIds` en props du serveur) : si non vide → grille responsive de cartes (titre + description du catalogue, chacune liée à son `href`) ; sinon → squelette de galerie (`role="status"`, étiquette accessible « Chargement de la galerie… ») de même allure que les cartes (contracts/ui.md)
- [x] T014 [P] [US2] Rewrite `app/page.tsx` en composant serveur : lire le cookie via `cookies()`, `parseEntries`, appliquer `getRecentModuleIds(entries, catalogue, now)` (expiration 30 jours incluse), rendre `<RecentModulesGallery moduleIds={ids} />` — galerie ou squelette dans le HTML serveur initial (aucun décalage d'hydratation)
- [x] T015 [P] [US2] Remove obsolete `components/skeleton-form.tsx` and `components/__tests__/skeleton-form.test.tsx` (YAGNI — ancienne vue d'accueil remplacée, plus aucun référencement) ; vérifier qu'aucun import ne les référence
- [x] T016 [US2] Vérification US2 : suite Vitest verte (T011, T012 passent) + `npm run build` + smoke SSR : `/` sans cookie → squelette dans le HTML initial ; avec cookie simulé → carte EAN-13 dans le HTML initial ; URL `/ean13` (cookie écrit) et URL inconnue (404 + coquille) non régressées

**Checkpoint**: US1 ET US2 fonctionnent ; l'accueil est une galerie rendue dès le premier chargement.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Améliorations transverses et validation finale

- [x] T017 [P] Update `README.md` (section navigation/accueil : galerie de cartes des 4 derniers modules, squelette à vide, cookie `tagmaker_recent_modules`, expiration 30 jours)
- [x] T018 Run `npm run test:coverage` and confirm coverage ≥ 80 % (Stmts/Branches/Functions/Lines) — sinon compléter les tests sans changer le périmètre
- [x] T019 [P] Run `npm run lint` (0 warning) and `npm run build` (succès) ; stopper les serveurs dev/prod par PID
- [x] T020 Run quickstart.md validation A–G (squelette au premier lancement, carte après usage, déduplication, éviction à 4, expiration > 30 jours, cookie corrompu/hors catalogue, non-régression) et marquer [x] au fur et à mesure

**Checkpoint**: Feature complète et validée — couverture ≥ 80 %, lint 0, build vert, quickstart A–G vert.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — blocks all user stories
- **US1 (Phase 3)**: depends on Foundational — no dependency on US2
- **US2 (Phase 4)**: depends on Foundational and on US1 (T014 lit le cookie produit par le tracker T009, T013/T015 indépendants) — TDD T011/T012 écrivables en parallèle du code US1 (fichiers distincts)
- **Polish (Phase 5)**: depends on US1 + US2

### Within Each User Story

- Tests FIRST (rouges), modèles/logique avant composants, implémentation avant vérification

### Parallel Opportunities

- Phase 1 : T002 [P]
- US1 : T004, T005, T006 [P] (fichiers différents) ; T007/T008/T009 séquentiels sur fichiers distincts (finissables dans l'ordre)
- US2 : T011, T012 [P] ; T014, T015 [P] (fichiers différents)
- Polish : T017, T019 [P]

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests together (TDD — all FAIL first):
Task: "T004 lib/recent-modules.test.ts (logique pure + expiration)"
Task: "T005 lib/recent-modules-cookie.test.ts (adaptateur cookie)"
Task: "T006 components/__tests__/recent-modules-tracker.test.tsx (écriture via URL)"
```

## Parallel Example: User Story 2

```bash
# Launch all US2 tests together (TDD):
Task: "T011 components/__tests__/recent-modules-gallery.test.tsx"
Task: "T012 app/__tests__/page.test.tsx (cookies() mocké)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (enregistrement + cookie)
4. **STOP and VALIDATE** (T010) : US1 testée seule

### Incremental Delivery

1. Setup + Foundational → baseline verte
2. US1 (tracking cookie) → déployable/démontrable (données écrites)
3. US2 (galerie + squelette SSR) → accueil utile de bout en bout
4. Polish → validation quickstart A–G complète

### Parallel Team Strategy

1. Développeur A : US1 (logique + cookie + tracker)
2. Développeur B : tests US2 (T011, T012) puis composants indépendants (T013, T015)
3. Intégration : T014 (page serveur) après T009 + T013 ; retour à la main pour vérifs

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail before implementing (rouge) et passent après (vert)
- Contraintes citées depuis data-model/contracts : capacité `MAX_RECENT_MODULES = 4`, expiration `MAX_RECENT_AGE_MS = 30 j`, nom de cookie `tagmaker_recent_modules`, attributs `path=/ · SameSite=Lax · Max-Age=30 j · non HttpOnly`, retour sûr (`parseEntries` → `[]`)
- Ne jamais écrire de secret ; aucune donnée hors du cookie