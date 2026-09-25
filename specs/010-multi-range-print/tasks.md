---

description: "Task list template for feature implementation"
---

# Tasks: Plages multiples — imprimer plusieurs plages d'emplacements

**Input**: Design documents from `/specs/010-multi-range-print/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests requis — la constitution V rend les tests obligatoires (couverture > 80 %, TDD, suite verte). Chaque story a un « Independent Test » issu de la spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project** (racine du repo) : `lib/`, `app/`, `components/` — voir [plan.md](plan.md). Tests au même niveau que le code.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialisation et structure (projet déjà initialisé — feature 009)

- [x] T001 Create feature branch `010-multi-range-print` (constitution : jamais de code sur `main` ; branche dédiée `feature/xxx`)
- [x] T002 [P] Verify kit components designed in plan.md exist without new dependency: `components/ui/separator.tsx` (shadcn), icons `Plus` and `Trash` exported by `@phosphor-icons/react` (research.md verdicts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Couche domaine partagée (constantes + schéma multi-plages + `expandRanges`). **Bloque les 3 user stories** : le formulaire (US1/US2/US3 UI) et la route (US3 serveur) consomment `locationRequestSchema` et les constantes de plafond.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add constants in `lib/location/code.ts` next to `MAX_RANGE_SIZE`: `MAX_RANGES = 10` and `MAX_TOTAL_LABELS = 1000`, per data-model.md — contrainte verbatim : « `1 ≤ ranges.length ≤ 10` et `Σ rang_taille(plage) ≤ 1000` »
- [x] T004 [P] Tests de validation multi-plages in `lib/location/__tests__/validate.test.ts` (à écrire en premier, échouants) : rejette `ranges` vide, `ranges` > `MAX_RANGES` (10), paire invalide (type, préfixe, ordre, taille) ; **accepte** des plages de **zones différentes** (premier caractère `1`/`2`, lots indépendants) ; somme des tailles > `MAX_TOTAL_LABELS` (1000) ; valide N plages valides ; `expandRanges` concatène les codes dans l'ordre d'affichage des plages (1ʳᵉ plage d'abord)
- [x] T005 Rework multi-plages schema in `lib/location/validate.ts` : extraire la logique de la paire actuelle (`superRefine` de `rangeSchema`, rules 009 verbatim — « les bornes partagent le même préfixe (3 premiers caractères) », « rang(début) ≤ rang(fin) », « taille ≤ MAX_RANGE_SIZE ») dans un validateur de paire réutilisé, puis `rangeSchema` → `ranges: z.array(paire).min(1).max(MAX_RANGES)` avec vérification de la somme ≤ `MAX_TOTAL_LABELS` ; ajouter `expandRanges(ranges): string[]` (concatène `expandRange` de chaque paire, ordre d'affichage) et les types exportés (`RangesLocationRequest`)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Ajouter une plage supplémentaire (Priority: P1) 🎯 MVP

**Goal**: En mode Plage, chaque plage est une ligne (2 `LocationCodeInput` segmentés + libellé « Plage N »), les lignes sont séparées par un `Separator` shadcn, et un bouton « + Ajouter une plage » (icône Phosphor `Plus`) ajoute une plage vierge, borné à `MAX_RANGES`.

**Independent Test** (spec) : ouvrir le module Emplacement, passer en mode Plage, cliquer trois fois sur « + » : on obtient quatre plages, toutes saisissables et validées indépendamment. Au plafond (10), le « + » est inopérant.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US1] Tests d'ajout in `components/__tests__/location-form.test.tsx` (mode Plage) : une seule plage « Plage 1 » à l'initialisation ; 3 clics « + » → « Plage 2..4 » visibles, vierges et saisissables ; saisie dans une plage laisse les autres inchangées ; au nombre maximal (10) le « + » n'ajoute plus de ligne ; un `Separator` sépare chaque ligne

### Implementation for User Story 1

- [x] T007 [US1] État multi-plages in `components/location-form.tsx` : `useState` → `ranges: RangeRow[]` avec `RangeRow = { id, startCode, endCode }` (id stable, incrémental, sert de `key`), initialisé avec **une** plage vierge ; `addRange()` ignore si `ranges.length >= MAX_RANGES` (importé de `lib/location/code.ts`)
- [x] T008 [US1] Rendu des lignes et bouton « + » in `components/location-form.tsx` : chaque plage = libellé « Plage N » (numérotation 1-based) + deux `LocationCodeInput` segmentés (réutilisés de la feature 009, `fixedIndexes` et placeholders selon le type courant) ; `<Separator orientation="horizontal" />` entre les lignes ; bouton « + Ajouter une plage » (icône Phosphor `Plus`) `variant="outline"`, désactivé à `MAX_RANGES`

**Checkpoint**: User Story 1 fully functional and testable independently (4 plages saisissables, plafond respecté)

---

## Phase 4: User Story 2 - Supprimer une plage (Priority: P1)

**Goal**: Chaque ligne porte une action poubelle (icône Phosphor `Trash`, `variant="ghost"`) qui retire la plage ; la dernière plage restante ne peut pas être supprimée.

**Independent Test** (spec) : ajouter deux plages puis supprimer la première : seule la seconde reste affichée, sans impact sur les autres champs (type, mode).

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US2] Tests de suppression in `components/__tests__/location-form.test.tsx` (mode Plage) : après ajout, cliquer la poubelle d'une plage la retire et les autres restent intactes ; les bornes de la plage retirée sont oubliées ; avec une seule plage la poubelle est désactivée/refusée (état « zéro plage » impossible) ; la suppression n'affecte ni le type ni le mode

### Implementation for User Story 2

- [x] T010 [US2] Action supprimer in `components/location-form.tsx` : bouton `Trash` (Phosphor, `variant="ghost"`) en bout de chaque ligne ; `removeRange(id)` filtre `ranges` ; bouton désactivé si `ranges.length === 1` (FR-003, SC-004)

**Checkpoint**: User Stories 1 AND 2 work independently (liste lignes + ajout + suppression, min 1 plage)

---

## Phase 5: User Story 3 - Imprimer toutes les plages en une seule opération (Priority: P1)

**Goal**: Validation de l'ensemble (schéma partagé), confirmation sur le **total cumulé** (seuil existant > 2), impression serveur de toutes les plages en **un seul job** (`labels` = somme), rejet avec message « Plage N » si une plage est invalide, mode Un seul inchangé.

**Independent Test** (spec) : saisir deux plages (ex. `1#D0 → 1#D2` et `1#D3 → 1#D7`) et imprimer : 8 étiquettes (3 + 5) envoyées en une seule action, sans modal si total ≤ 2, avec modal si total cumulé > 2. Les plages peuvent couvrir des **zones différentes** (lots indépendants : `1A10 → 1A12` + `2B10 → 2B14` s'impriment ensemble).

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US3] Tests de route multi-plages in `app/api/print/location/__tests__/route.test.ts` : POST `{mode:"range", ranges:[2 paires valides]}` → `200 {status:"sent", labels:<somme>}` ; paire invalide (zone, ordre par axe, type) → `422` ; `ranges` vide → `422` ; `ranges` > 10 → `422` ; plages de **zones différentes** → `200` (lots indépendants) ; somme > 1000 → `422` ; `409` (impression en cours) et `503` (imprimante injoignable) conservés
- [x] T012 [P] [US3] Tests de formulaire multi-plages in `components/__tests__/location-form.test.tsx` (mode Plage) : total cumulé affiché et envoyé = somme des plages ; modal « Imprimer N étiquettes ? » avec N = total si total > 2, impression directe si ≤ 2 ; une plage invalide → aucun envoi, message « Plage N : … » (N désignant la plage fautive, via le chemin Zod `ranges[i]`) ; payload soumis = `{mode:"range", ranges:[{startCode, endCode}, …]}`

### Implementation for User Story 3

- [x] T013 [P] [US3] Route multi-plages in `app/api/print/location/route.ts` : en mode `range`, `ranges` → concaténer `expandRanges(ranges)` en un unique tableau `codes`, `labels` = leur longueur (somme), un seul `buildLocationZpl({ codes, … })` et une seule connexion à l'imprimante ; mode `single` et code 409/503 strictement inchangés (FR-009, SC-006)
- [x] T014 [US3] Impression globale in `components/location-form.tsx` : `computeCount()` = somme des tailles via `expandRanges` (bornée par le schéma) ; validation par le schéma partagé de `lib/location/validate.ts` — premier `issue` affiché via toast, préfixé « Plage N : … » si `path` porte sur `ranges[i]` (N = i+1) ; confirmation `LocationConfirmDialog` quand total cumulé > 2 (sinon impression directe) ; `buildRangeBody()` = `{mode:"range", ranges:[{startCode,endCode}]}` + réglages `readPrintSettings()` ; `labels` du toast de succès = total cumulé

**Checkpoint**: All user stories independently functional — impression en une action, totals exacts (SC-002), rejet plage désignée (SC-003), seuil sur total (SC-005), zéro régression (SC-006)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Consolidation post-implémentation — quality gate et validation de bout en bout.

- [x] T015 Full quality gate (constitution : CI verte) : `npm run lint` (0 erreur/warning), `npx tsc --noEmit` (0 erreur), `npm test` (suite entière verte, coverage > 80 %), `npm run build` (vert)
- [x] T016 [P] Run [quickstart.md](quickstart.md) validation : section 1 (statique + tests), section 2 (curl multi-plages → `200 {labels: 8}`, plages de zones différentes → `200`, paire invalide → `422`) ; section 3 (manuelle, imprimante réelle 203 dpi) si une imprimante est disponible — 8 étiquettes scannables (3 × `1#Dx` puis 5 × `1#Dx`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (branche du feature avant tout code)
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories** (constantes et schéma partagés par le formulaire et la route)
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - US1 puis US2 sont séquentielles : elles modifient le **même fichier** `components/location-form.tsx`
  - US3 dépend de US1/US2 côté formulaire et ajoute `app/api/print/location/route.ts` (fichier indépendant, parallélisable)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no deps on other stories
- **User Story 2 (P1)**: Depends on US1 (même composant : l'action poubelle opère sur les lignes créées par US1) mais reste **testable indépendamment**
- **User Story 3 (P1)**: Depends on US1 + US2 (formulaire multi-lignes à soumettre) ; la partie route (T013) peut démarrer dès la Foundational (aucune dépendance aux stories UI)

### Within Each User Story

- Tests (obligatoires, constitution V) MUST be written and FAIL before implementation
- Implémentation de référence : tests `[P]` (fichiers distincts) → implémentation
- Story complete before moving to next priority

### Parallel Opportunities

- T002 [P] indépendant (vérification kit) dans la Setup
- Foundational : T004 (tests) `[P]` par rapport au reste une fois T003 posées les constantes
- US3 : T011 et T012 (tests route + tests formulaire) en parallèle `[P]` ; T013 (route) `[P]` dès la Foundational
- Séquentiels (même fichier) : T006→T007→T008 (US1), T009→T010 (US2), T012→T014 (form US3)

---

## Parallel Example: User Story 3

```bash
# Launch both test suites together (different files):
Task: "T011 [P] [US3] Tests de route multi-plages in app/api/print/location/__tests__/route.test.ts"
Task: "T012 [P] [US3] Tests de formulaire multi-plages in components/__tests__/location-form.test.tsx"

# Implementations after tests pass:
Task: "T013 [P] [US3] Route multi-plages in app/api/print/location/route.ts"
Task: "T014 [US3] Impression globale in components/location-form.tsx"
```

## Parallel Example: User Story 1

```bash
# Write the failing tests first, then implement:
Task: "T006 [P] [US1] Tests d'ajout in components/__tests__/location-form.test.tsx"
# puis (fichiers distincts aussi, mais TDD impose tests d'abord) :
Task: "T007 [US1] État multi-plages in components/location-form.tsx"
Task: "T008 [US1] Rendu des lignes et bouton « + » in components/location-form.tsx"
```

---

## Implementation Strategy

### MVP First

La spec marque les 3 stories **P1**. MVP minimal cohérent = **User Story 1** (lignes de plages + bouton « + », rendement immédiat saisissable) ; la valeur production n'est atteinte qu'avec US2 + US3 :

1. Complete Phase 1: Setup (branche `010-multi-range-print`)
2. Complete Phase 2: Foundational (constantes + schéma multi-plages + `expandRanges`) — **CRITICAL, blocks all stories**
3. Complete Phase 3: User Story 1 → **STOP and VALIDATE** (4 plages saisissables, plafond)
4. Complete Phase 4: User Story 2 → **VALIDATE** (poubelle, min 1 plage)
5. Complete Phase 5: User Story 3 → **VALIDATE** (impression globale, modal, rejet plage)
6. Phase 6: quality gate + quickstart (imprimante réelle si dispo)

### Incremental Delivery

1. Setup + Foundational → foundation ready (schéma partagé, aucune régression — suit 009)
2. US1 → test indépendant (4 plages)
3. US2 → test indépendant (suppression, min 1)
4. US3 → test indépendant (route + formulaire, contrats `contracts/api.md` + `ui.md`)
5. Polish → gate vert complet (SC-006 : mode Un seul et suite 272 existante inchangés)

### Parallel Team Strategy

Avec plusieurs développeurs :

1. Ensemble : Setup + Foundational
2. Foundational complétée :
   - Développeur A : US1 puis US2 (même composant `location-form.tsx`)
   - Développeur B : T013 route (`app/api/print/location/route.ts`) — prérequis US3, fichiers indépendants
3. US3 (T014 formulaire) une fois US2 et T013 terminés

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story pour la traçabilité
- US1 et US2 partagent `components/location-form.tsx` → séquentielles pour un seul développeur (pas de `[P]` entre elles), mais chacune testable indépendamment (fichier de test distinct)
- Vérifier que chaque test échoue avant d'implémenter (TDD)
- Commit après chaque tâche ou groupe logique (message conventional commits, sur la branche `010-multi-range-print`)
- Contrainte UI respectée : une **ligne par plage** séparée par un **`Separator` shadcn**, poubelle et « + » en **icônes Phosphor** (`Trash`, `Plus`) — contract/ui.md
- Pas de modification du contrat ZPL (inchangé, renvoi 009) ni du mode Un seul (FR-009)
- Éviter : tâches vagues, conflits sur `location-form.tsx` entre stories, dépendances croisées cassant l'indépendance

## Évolution post-livraison — calcul de plage en « boîte » (décision utilisateur)

Le calcul des codes a été refondu : une plage ne varie plus **uniquement** sur
le dernier caractère.

- **Classique** : la plage est la **boîte** bornée par ses extrêmes, sur chaque
  axe (espace `A-Z`, position `1-9` puis `A-Z`, sous-position `0-9` puis `A-Z`)
  — ex. `1B10 → 1D45` = 3 × 4 × 6 = **72** codes (sous-positions `0..5` sur
  chaque groupe : `1B10–1B15`, `1B20–1B25`… `1B45`, puis `1C…`, jusqu'à `1D45`).
- **Dynamique** : seul l'axe sous-position varie (`x#D` fixe) — inchangé.
- Règles par paire : **même zone** requise entre bornes (`1A10 → 2A10` →
  `422`) ; ordre **par axe** (`1A19 → 1A21` refusé, sous-position `9 > 1` ;
  `1A10 → 1B10` désormais **valide**) ; taille = produit des écarts + 1
  (per-plage ≤ 1000, plafond **désormais atteignable**, plus « défensif ») ;
  somme ≤ 1000 vérifiée.
- Tests : `validate.test.ts` (boîtes 72 / 36 / 4 / 12, zone, ordre par axe,
  tailles) et `route.test.ts` (`1A10 → 1B10` → `200 {labels:2}`,
  `1A10 → 2A10` → `422`, somme > 1000 → `422` réel) — mis à jour par TDD
  (écrits rouges d'abord). Docs 010 et 009 alignées.

## Évolution post-livraison — zones libres entre plages (lots indépendants)

Décision utilisateur : retrait de la contrainte FR-011 (« toutes les plages
même zone »). Chaque plage est un **lot indépendant** :

- Les plages d'un même envoi peuvent avoir des **zones différentes** :
  `{1A10 → 1A12}` + `{2B10 → 2B14}` → `200 {labels: 8}` (plus de message
  global de zone).
- La synchro de zone reste **intra-plage** (début ↔ fin d'une même plage,
  `withZoneSync` inchangé) ; une plage reste refusée si ses propres bornes
  diffèrent de zone (`1A10 → 2A10` → `422`, message « Plage N : … même zone »).
- Code : `lib/location/validate.ts` — suppression du bloc `zones.size > 1`
  dans le `superRefine` (seule la vérification par paire subsiste). Tests :
  `validate.test.ts` et `route.test.ts` — le refus inter-plages est retourné en
  cas 200/accept (TDD rouges d'abord). Docs 010 alignées (spec FR-011/edge
  cases/assumptions, data-model, contracts/api, quickstart, tasks).