---

description: "Task list for feature 011 — installation du service sur serveur Unix"
---

# Tasks: Installation du service sur serveur Unix (feature 011)

**Input**: Design documents from `/specs/011-install-service-systemd/`

**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: La constitution (V) **impose** des tests (> 80 % de couverture) et la
spec/quickstart exigent `npm test` vert **incluant le runner shell** ; les
tâches de test sont donc **incluses** et écrites en premier (TDD rouges avant
l'implémentation), comme pour les features 009/010.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Ce plan : **projet unique**, le script vit dans `scripts/` avec ses tests au
  même niveau (`scripts/__tests__/`) — voir plan.md Project Structure.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialisation de l'arborescence et intégration à la suite de tests existante

- [X] T001 Create structure `scripts/` / `scripts/__tests__/` with `scripts/__tests__/fixtures/bin/` (stubs système) and `scripts/__tests__/fixtures/env.example` per plan.md Project Structure
- [X] T002 [P] Wire the POSIX test runner into the existing suite: update `package.json` `"test"` script to `"vitest run && sh scripts/__tests__/run-install-tests.sh"` so the gate `npm test` couvre script ET application

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure de base — **MUST be complete before ANY user story can begin** (le script tout entier s'appuie dessus)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create the POSIX test harness `scripts/__tests__/run-install-tests.sh`: sources `scripts/install.sh` (fonctions) + `scripts/__tests__/install.test.sh`, exécute les assertions, sort en erreur au premier échec, affiche `PASS/FAIL` par test (utilisation dans la CI, constitution V)
- [X] T004 [P] Create `scripts/install.sh` skeleton: shebang `#!/bin/sh`, `set -eu`, helpers de sortie (`ERROR:`/`WARN:` prefixes, `log`), résolution des défauts `TAGMAKER_DIR=/opt/tagmaker`, `TAGMAKER_ENV=~/.tagmaker.env (default, home de l'utilisateur dédié)`, `TAGMAKER_USER=tagmaker`, `TAGMAKER_PORT=3000`, `TAGMAKER_HOST=0.0.0.0` per `contracts/cli.md`
- [X] T005 [P] Implement the argument parser in `scripts/install.sh` (flags/short `-d -e -u -p -h -U -q`, longue `--dry-run --keep-config --help`, override env `TAGMAKER_*`, précédence flag > env > défaut, `--uninstall`/`-U` désactive le mode install, combinaisons d'usage → exit 2, codes 0/1/2) per `contracts/cli.md`
- [X] T006 [P] Implement distro detection + prereq check in `scripts/install.sh` (famille **apt** Debian/Ubuntu ou **dnf/yum** RHEL-like sinon `ERROR:` explicite ; **Node ≥ 20.9** et npm — install via gestionnaire de paquets si absents, sinon instruction de mise à niveau) per `contracts/cli.md` FR-001, research D2/D3

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Installation initiale sur serveur vierge (Priority: P1) 🎯 MVP

**Goal**: `git clone` + une exécution d'`install.sh` → service `tagmaker` actif, joignable sur le LAN, relancé au boot et après plantage (spec US1, FR-002 à FR-006)

**Independent Test**: [quickstart.md](quickstart.md) §1-§3 (statique + `--dry-run` + install réel), §4 (joignabilité LAN) et §6 (reboot) — SC-001/SC-002/SC-006

### Tests for User Story 1 (obligatoires — constitution V) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Test création + immutabilité de la configuration in `scripts/__tests__/install.test.sh` : fixture depuis `fixtures/env.example`, fichier **jamais écrasé** à la ré-exécution, contient `TAGMAKER_HOST/TAGMAKER_PORT`, droits `0600` — contraintes verbatim de `contracts/config.md`
- [X] T008 [P] [US1] Test des champs de l'unité systemd générée in `scripts/__tests__/install.test.sh` : `Name=tagmaker.service`, `User=tagmaker/Group=tagmaker`, `WorkingDirectory=/opt/tagmaker`, `EnvironmentFile=%h/.tagmaker.env`, `ExecStart` avec `next start -H <host> -p <port>`, `Restart=on-failure`, `RestartSec=3`, `WantedBy=multi-user.target` — contrat verbatim `contracts/systemd.md`
- [X] T009 [P] [US1] Test build-avant-activation + `--dry-run` sans effet de bord in `scripts/__tests__/install.test.sh` : build échoué → aucun `enable/start`, dossier existant intact, sortie `ERROR:` (FR-003) — stubs système via `PATH` `fixtures/bin/`

### Implementation for User Story 1

- [X] T010 [US1] Implement `create_service_user` in `scripts/install.sh` : utilisateur `TAGMAKER_USER` dédié **non privilégié**, `nologin`, sans mot de passe ; créé seulement si absent (FR-009)
- [X] T011 [US1] Implement le placement de l'application dans `scripts/install.sh` : copie du dépôt vers `TAGMAKER_DIR` (ou usage en place), propriétaire/groupe `TAGMAKER_USER` (data-model « Application déployée »)
- [X] T012 [US1] Implement le build production dans `scripts/install.sh` : `npm ci && npm run build` exécuté **en tant que** `TAGMAKER_USER` ; échec → arrêt immédiat, aucune unité enregistrée, dossier existant intact (FR-003, D7)
- [X] T013 [P] [US1] Implement la génération de `/etc/systemd/system/tagmaker.service` dans `scripts/install.sh` avec les champs exacts de `contracts/systemd.md`, host/port lus de la config (`TAGMAKER_HOST`/`TAGMAKER_PORT`)
- [X] T014 [US1] Implement l'activation dans `scripts/install.sh` : `systemctl daemon-reload`, `systemctl enable --now tagmaker`, `systemctl start tagmaker` (FR-004, FR-005 — démarrage au boot)
- [X] T015 [US1] Implement le récapitulatif final dans `scripts/install.sh` : état du service, point d'accès `http://<host>:<port>`, commandes de contrôle (statut/start/stop/restart/journal) per FR-006 + `contracts/systemd.md` section « Commandes de contrôle »

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (MVP)

---

## Phase 4: User Story 2 - Gestion du service au quotidien (Priority: P2)

**Goal**: l'opérateur contrôle le service via l'état et les commandes systemd ; relance automatique après panne (spec US2, FR-005/FR-006)

**Independent Test**: [quickstart.md](quickstart.md) §5 — stop/start/restart/statut et journaux reproduits avec les transitions attendues

### Tests for User Story 2 (obligatoires — constitution V) ⚠️

- [X] T016 [P] [US2] Test de la sous-commande `status` in `scripts/__tests__/install.test.sh` : `systemctl is-active` stubfée → « active (running) » / « inactive », affichage PID/uptime et point d'accès (contrat de sortie `contracts/cli.md`, contrat `contracts/systemd.md`)

### Implementation for User Story 2

- [X] T017 [US2] Implement la sous-commande `status` dans `scripts/install.sh` : `systemctl is-active/is-enabled`, PID/uptime, point d'accès `http://<host>:<port>`, dossier & config ; sortie conforme au contrat de sortie de `contracts/cli.md`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Mise à jour du service (Priority: P2)

**Goal**: ré-exécuter `install.sh` après une nouvelle version → configuration préservée, rebuild, service redémarré proprement (spec US3, FR-002/FR-007)

**Independent Test**: [quickstart.md](quickstart.md) §7 — modification de `TAGMAKER_PORT` et des `ZPL_*`, ré-exécution, nouveau port actif

### Tests for User Story 3 (obligatoires — constitution V) ⚠️

- [X] T018 [US3] Test d'idempotence de la ré-exécution in `scripts/__tests__/install.test.sh` : second `install` sur fixtures → config (port personnalisé, `ZPL_*`) **conservée**, unité unique, drop-in système préservé, service relancé (FR-002/FR-007, data-model invariants 2-3)

### Implementation for User Story 3

- [X] T019 [US3] Implement le chemin « mise à jour » dans `scripts/install.sh` : détection installation existante, **préservation de la config et des drop-ins**, rebuild, `daemon-reload` + restart du service (FR-007)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Désinstallation (Priority: P3)

**Goal**: retirer proprement le service, sans résidu ni processus orphelin, par **commande `uninstall` ou drapeau `--uninstall`/-U** (spec US4, FR-008/SC-005)

**Independent Test**: [quickstart.md](quickstart.md) §8 — après désinstallation, `Loaded: not-found`, aucun fichier/processus de l'application

### Tests for User Story 4 (obligatoires — constitution V) ⚠️

- [X] T020 [P] [US4] Test de parsing des modes de désinstallation in `scripts/__tests__/install.test.sh` : `uninstall` et `--uninstall`/`-U` équivalents ; `uninstall`+`--uninstall` → même mode sans erreur ; `--keep-config` hors mode désinstallation → exit 2 (contrat `contracts/cli.md` « Modes & priorité désinstallation »)
- [X] T021 [P] [US4] Test de l'effet de la désinstallation in `scripts/__tests__/install.test.sh` : `disable --now`, unité supprimée + `daemon-reload`, purge utilisateur/dossier/config ; `--keep-config` préserve `~/.tagmaker.env` ; idempotence sur installation absente → exit 0 (FR-008/SC-005)

### Implementation for User Story 4

- [X] T022 [US4] Implement le mode désinstallation dans `scripts/install.sh` : commande `uninstall` **et** drapeau `--uninstall`/`-U` (désactive install) ; `disable --now`, suppression unité + `daemon-reload`, suppression `TAGMAKER_USER` + `TAGMAKER_DIR` + config (sauf `--keep-config`) ; toujours exit 0 si installation absente (FR-008, contrat `contracts/cli.md`)

**Checkpoint**: Toutes les user stories sont fonctionnelles et testables indépendamment

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Qualité, gouvernance et validation finale

- [X] T023 [P] Run `shellcheck` (si présent) sur `scripts/install.sh` et `scripts/__tests__/run-install-tests.sh` ; corriger toute erreur de conformité POSIX `sh`
- [X] T024 [P] Rédiger et soumettre l'**amendement de la constitution** (`.specify/memory/constitution.md`) : assouplir la règle « écoute locale uniquement » pour le déploiement serveur (LAN de confiance, FR-010/FR-011) — version + « dernier amendement » mis à jour (constitution §Gouvernance, research D10)
- [ ] T025 [P] Run [quickstart.md](quickstart.md) §1-§8 en conditions réelles (serveur de test systèmeD, sudo) : statique, dry-run, install, LAN, gestion, reboot (si possible), mise à jour, désinstallation — rapporter les résultats
- [X] T026 [P] Vérifier le gate complet : `npm run lint` (0), `npx tsc --noEmit`, `npm test` (vitest + runner sh verts), `npm run build`, `npx vitest run --coverage` (> 80 %)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - **BLOCKS all user stories**
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Ensuite en parallèle (si capacité) ou séquentiel P1 → P2 → P3
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories (**MVP**)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - indépendante (seulement la sous-commande `status`)
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - s'appuie sur le chemin install (US1) mais testable seule
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - indépendante du workflow install

### Within Each User Story

- Tests écrits d'abord et **échouants avant l'implémentation** (TDD)
- Helpers/test harness avant fonctions métier (T003 avant T004-T006)
- Parsing/config (T004-T006) avant actions système (T010-T015)
- Story complète avant de passer à la priorité suivante

### Parallel Opportunities

- Setup : T001 ∥ T002
- Foundational : T004 ∥ T005 ∥ T006 (toutes [P], fichiers/tâches distincts)
- US1 tests : T007 ∥ T008 ∥ T009 ; puis implémentation : T010/T011 ∥ T013
- US2 : T016 [P] seuils pour T017
- US3 : T018 (test) → T019
- US4 tests : T020 ∥ T021 → T022
- Polish : T023 ∥ T024 ∥ T025 ∥ T026 (si serveur de test disponible)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD rouges d'abord):
Task: "Test création + immutabilité de la config (fixtures) in scripts/__tests__/install.test.sh"
Task: "Test des champs de l'unité systemd (contrat systemd.md) in scripts/__tests__/install.test.sh"
Task: "Test build-avant-activation + --dry-run (stubs PATH) in scripts/__tests__/install.test.sh"

# Launch all helpers/actions indépendantes ensembles une fois T010/T011 posés :
Task: "create_service_user (nologin) in scripts/install.sh"
Task: "génération de l'unité tagmaker.service in scripts/install.sh"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (quickstart §1-§4, §6)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (**MVP** : install + LAN + boot)
3. Add User Story 2 → `status` / contrôle quotidien
4. Add User Story 3 → mise à jour sans écrasement de config
5. Add User Story 4 → désinstallation (commande `uninstall` ou `--uninstall`)
6. Polish : shellcheck, amendement constitution (LAN), quickstart réel, gate

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (install)
   - Developer B: User Story 4 (uninstall/--uninstall)
   - Developer C: User Story 2 (status) puis 3 (mise à jour)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD — constitution V)
- Commit after each task or logical group (conventional commits)
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence