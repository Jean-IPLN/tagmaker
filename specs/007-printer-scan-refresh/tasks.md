---

description: "Task list for feature 007: découverte d'imprimantes — spinner + Actualiser"

---

# Tasks: Découverte d'imprimantes : spinner et actualisation

**Input**: Design documents from `/specs/007-printer-scan-refresh/`
(plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md)

**Prerequisites**: plan.md (required), spec.md (required), research.md,
data-model.md, contracts/ui.md

**Tests**: OBLIGATOIRES — la constitution (V. Tests obligatoires, coverage
> 80 %) impose un test par comportement. Tests écrits en premier (RED) puis
implémentés (GREEN).

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project Next.js (repo racine)**: `app/` (routes API),
  `components/` (UI), `components/ui/` (primitives), `lib/` (logique),
  `lib/printer/` (réseau) ; tests côté composants dans
  `components/__tests__/`, tests lib dans `lib/*.test.ts`
- Jeu de commandes de référence :
  `npx vitest run <fichier>`, `npx vitest run` (suite), `npm run lint`,
  `npx tsc --noEmit`, `npm run build`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verte avant toute modification + confirmation de la
configuration papier.

- [X] T001 Run the full baseline green: `npx vitest run`, `npm run lint`,
      `npx tsc --noEmit` (attendu : suite complète verte, 140 tests, 0
      warning) avant toute modification
- [X] T002 [P] Confirm that `ZPL_PAPER_SIZES` (liste « largeur×hauteur »
      séparée par virgule, ex. `40x25, 50x25, 100x50`) est déclarée dans
      `lib/env.ts` (schéma zod) ET documentée dans `.env.example` +
      `README.md` ; ajouter/compléter la documentation si absent

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Aucune fondation nouvelle requise — l'infrastructure (parser
papier `lib/paper-sizes.ts`, découverte réseau `lib/printer/discovery.ts`,
primitives `components/ui/select.tsx`, cookie réglages) est livrée en feature
006 et non modifiée.

**⚠️ CRITICAL**: Le composant à modifier (`components/settings-footer.tsx`)
et son test (`components/__tests__/settings-footer.test.tsx`) dépendent de
ces fondations ; aucune US ne commence avant T001 (baseline verte).

**Checkpoint**: Baseline verte (T001) + documentation config validée (T002) —
les US peuvent démarrer.

---

## Phase 3: User Story 1 - Formats papier définis dans la configuration (Priority: P1) 🎯 MVP (vérification)

**Goal**: Les formats papier du `.env` (`ZPL_PAPER_SIZES`, formats
« largeur×hauteur » séparés par virgule) apparaissent tels quels dans la
liste déroulante « Papier » (FR-001 → FR-003). Capacité livrée en 006 :
**vérifier**, pas réimplémenter (YAGNI).

**Independent Test**: `npx vitest run lib/paper-sizes.test.ts` — la chaîne
`"40x25, 50x25, 100x50"` produit 3 formats triés par surface croissante ;
un format invalide (`10x999`) est ignoré sans bloquer ; liste absente →
fallback format courant (`{ widthMm, heightMm }`).

### Tests for User Story 1 (RED si manque) ⚠️

- [X] T003 [P] [US1] Run `npx vitest run lib/paper-sizes.test.ts` ; vérifier
      que les comportements des FR-001/002/003 sont couverts (séparateurs
      `[,;]`, `\d+x\d+` tolerant casse, tri par `surfaceMm2` croissante,
      dédoublonnage, ignore invalides, fallback). **Ne rien ajouter** si déjà
      couvert (couverture existante : 8 tests dans lib/paper-sizes.test.ts)

### Implementation for User Story 1

- [X] T004 [US1] Only if T003 révèle un trou de couverture : ajouter le ou
      les tests manquants dans `lib/paper-sizes.test.ts` pinçant la
      FR-001 (« `40x25, 50x25, 100x50` → 3 formats triés ») / FR-002 (liste
      présente dès le démarrage) / FR-003 (invalides ignorés). Sinon, marquer
      la tâche comme triviale (aucune modification) et vérifier que
      `components/__tests__/app-sidebar.test.tsx` et
      `components/__tests__/settings-footer.test.tsx` continuent de passer

**Checkpoint**: Les formats `.env` sont confirmés actifs et testés — US1
indépendamment vérifiable.

---

## Phase 4: User Story 2 - Indicateur de chargement pendant la recherche (Priority: P1)

**Goal**: Pendant le scan (`printerScan === "scanning"`), la ligne
« Recherche des imprimantes… » du menu déroulant « Imprimante » est précédée
d'un **spinner** (icône en rotation) ; il disparaît dès la fin du scan
(succès ou échec) (FR-004, FR-005).

**Independent Test**: `npx vitest run components/__tests__/settings-footer.test.tsx`
— avec un `fetch` pendu sur `/api/printers/discover`, ouvrir le sélecteur
Imprimante : le spinner (icône `animate-spin`, `aria-hidden`) côtoie le texte
« Recherche des imprimantes… » ; une fois le scan résolu, le spinner a
disparu.

### Tests for User Story 2 (à écrire EN PREMIER, RED) ⚠️

- [X] T005 [P] [US2] RED test in
      `components/__tests__/settings-footer.test.tsx` : avec un fetch pendu,
      après ouverture du sélecteur Imprimante, vérifier qu'une icône spinner
      (rôle/spinner via une classe `animate-spin` ou un `data-testid`) est
      présente à côté de « Recherche des imprimantes… », puis absente après
      résolution du scan (mock `vi.spyOn(globalThis, "fetch")`, helper
      `chooseOption` existant réutilisé)

### Implementation for User Story 2

- [X] T006 [US2] Implement : dans `components/settings-footer.tsx`, rendre le
      spinner dans la ligne « Recherche des imprimantes… » — import de
      l'icône `CircleNotch` depuis `@phosphor-icons/react`, rendu
      `<CircleNotch className="size-4 animate-spin" aria-hidden="true" />`
      uniquement quand `printerScan === "scanning"` (ligne item
      `value="__scanning__"`)

**Checkpoint**: À ce point, US2 fonctionne : un spinner visible pendant le
scan, invisible après.

---

## Phase 5: User Story 3 - Bouton « Actualiser » pour relancer une recherche (Priority: P2)

**Goal**: En pied du menu déroulant « Imprimante », un bouton « Actualiser »
est visible dès qu'aucune recherche n'est en cours (états `idle` et `done`) ;
il relance un scan complet (spinner réaffiché, liste remplacée par les
nouveaux résultats). Absent pendant `scanning` — jamais de double scan
(FR-006 → FR-009).

**Independent Test**: `npx vitest run components/__tests__/settings-footer.test.tsx`
— après un premier scan terminé, le bouton « Actualiser » est présent dans le
popup ; un clic déclenche un **second** appel `fetch("/api/printers/discover")`
et réaffiche le spinner ; pendant le scan, le bouton est absent.

### Tests for User Story 3 (à écrire EN PREMIER, RED) ⚠️

- [X] T007 [P] [US3] RED test in
      `components/__tests__/settings-footer.test.tsx` :
      (a) le bouton « Actualiser » est visible quand `printerScan` vaut
      `idle`/`done` ; (b) absent pendant `scanning` ; (c) un clic appelle à
      nouveau `fetch("/api/printers/discover")` et réaffiche le spinner
      (compteur d'appels fetch = 2) ; (d) la sélection `printerAddress`
      existante demeure intacte après la relance

### Implementation for User Story 3

- [X] T008 [US3] Refactor : extraire `startScan()` dans
      `components/settings-footer.tsx` (DRY) — corps commun
      `setPrinterScan("scanning")` + `void runScan()`, appelé par
      `handlePrinterOpenChange` (auto-scan conservé : uniquement si
      `printerAddress` absent et état `idle`) et par le bouton « Actualiser »
- [X] T009 [US3] Implement le bouton « Actualiser » dans
      `components/settings-footer.tsx` : ligne en pied de `SelectPopup` (sous
      `SelectList`, hors du `ul` pour ne pas perturber la navigation clavier)
      — icône `ArrowClockwise` (@phosphor-icons/react) + libellé
      « Actualiser », rendue uniquement si `printerScan !== "scanning"`,
      `onClick={startScan}`, style discret (hover `bg-accent`, séparation
      `border-t`), `<button type="button">` accessible

**Checkpoint**: US1, US2 et US3 fonctionnent indépendamment et ensemble.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Vérifications finales, documentation et validation bout en bout.

- [X] T010 [P] Update docs : aligner `README.md` sur le nouveau bien-fondé
      (spinner + bouton « Actualiser » dans le sélecteur Imprimante) si
      nécessaire ; vérifier la conformité de `contracts/ui.md` et
      `quickstart.md` (feature 007) avec l'implémentation finale
- [X] T011 Run the full gate : `npx vitest run` (suite complète, coverage
      > 80 %), `npm run lint` (0 warning), `npx tsc --noEmit` (0 erreur),
      `npm run build` (build vert)
- [X] T012 [P] Run quickstart.md scenarios A–E sur serveur local :
      A (formats `.env`) automatisé par `lib/paper-sizes.test.ts`, B–D via
      navigateur (spinner, Actualiser, relance avec imprimante sélectionnée),
      E = non-régression découverte (imprimante `ZPL_PRINTER_HOST` visible —
      cf. bug `print-ip-not-find`) ; consigner les résultats

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 baseline verte d'abord
- **Foundational (Phase 2)**: Depends on Setup — clôturé par le checkpoint
  (fondations 006 déjà en place)
- **User Stories (Phase 3+)**: Toutes dépendent du checkpoint foundational
- **Polish (Phase 6)**: Dépend de T003→T009 (toutes les US cibles)

### User Story Dependencies

- **User Story 1 (P1)**: Vérifie l'existant (`lib/paper-sizes.test.ts`) —
  **aucune dépendance** aux autres US, **parallélisable** (fichiers différents :
  `lib/` vs `components/`)
- **User Story 2 (P1)**: Modifie `components/settings-footer.tsx` + son test —
  indépendante de US1
- **User Story 3 (P2)**: Modifie **les mêmes fichiers** que US2 (état
  `printerScan` + popup) → **séquentielle après US2** (non parallélisable avec
  US2)

### Within Each User Story

- Tests (RED) écrits et échouant AVANT l'implémentation (constitution V)
- Implémentation minimale qui verdoie les tests
- US complète avant la suivante (ordre imposé : US1 → US2 → US3 pour le même
  poste)

### Parallel Opportunities

- Setup : T001 et T002 parallélisables ([P])
- US1 : T003 par rapport aux US2/US3 (fichiers disjoints)
- US2 et US3 : non parallélisables (même fichier `settings-footer.tsx` +
  `settings-footer.test.tsx`) — alternatives : un développeur sur US1 pendant
  qu'un autre fait US2 puis US3

---

## Parallel Example

```bash
# Piste 1 — vérification US1 pendant le développement US2/US3 :
Task: "T003 run lib/paper-sizes.test.ts — vérifier couverture FR-001..003"

# Piste 2 — US2 (séquentielle) :
Task: "T005 RED test spinner in components/__tests__/settings-footer.test.tsx"
Task: "T006 implémentation spinner (CircleNotch + animate-spin) in components/settings-footer.tsx"

# Piste 2 suite — US3 (après US2, même fichier) :
Task: "T007 RED test button Actualiser in components/__tests__/settings-footer.test.tsx"
Task: "T008 refactor startScan() in components/settings-footer.tsx"
Task: "T009 bouton Actualiser en pied de SelectPopup in components/settings-footer.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. T001 baseline verte + T002 doc config (Setup)
2. Checkpoint Foundational (déjà en place, rien à bâtir)
3. US1 (T003/T004) : vérification papier `.env` — livrable immédiat
4. US2 (T005/T006) : spinner pendant la recherche — **MVP réel** (bénéfice
   utilisateur immédiat)
5. **STOP and VALIDATE** : `npx vitest run components/__tests__/settings-footer.test.tsx`
   + démo navigateur

### Incremental Delivery

1. Setup + US1 → validation config papier
2. Add US2 → spinner (démo) — incrément 1
3. Add US3 → bouton « Actualiser » (démo) — incrément 2
4. Polish (T010 docs, T011 gate, T012 quickstart) → livraison

### Parallel Team Strategy

- Développeur A : US1 (vérif) + Polish docs — fichier `lib/`
- Développeur B : US2 puis US3 — fichier `components/settings-footer.tsx`
  (+ test) — séquencé sur le même fichier

---

## Notes

- [P] tasks = different files, no dependencies (US2/US3 partagent les mêmes
  fichiers → exclusion [P] entre elles)
- [Story] label maps task to specific user story for traceability
- La constitution impose les tests (coverage > 80 %) : pattern RED → GREEN
  pour chaque comportement
- Stop at any checkpoint to validate story independently
- Commit after each task or logical group (ordre explicite de l'utilisateur
  requis pour pédaler « commit/go »)
## Bilan de validation (T012)

- **A (formats `.env`)** : automatisé — `lib/paper-sizes.test.ts` (8 tests :
  tri surface, invalides ignorés, doublons, séparateurs, fallbacks).
- **B (spinner)** : automatisé — `settings-footer.test.tsx` (12 tests US2) :
  `CircleNotch` + `animate-spin`, `aria-hidden`, disparition après résolution.
- **C (bouton Actualiser)** : automatisé — tests US3 (15/15 total) : absent en
  scanning, visible idle/done, relance un scan complet, spinner réaffiché.
- **D (sélection conservée)** : automatisé — relance avec `printerAddress`
  déjà mémorisée : `printerAddress` jamais effacé, re-scan possible.
- **E (non-régression)** : suite 144/144, lint 0 warning, `tsc --noEmit` 0,
  `npm run build` vert (SSR ok) + tests non-régression découverte
  (`ZPL_PRINTER_HOST` / `getLocalIpAddresses` — bug `print-ip-not-find`).
