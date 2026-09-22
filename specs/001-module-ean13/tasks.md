---

description: "Task list template for feature implementation"
---

# Tasks: Module EAN-13 — Impression d'étiquettes

**Input**: Design documents from `/specs/001-module-ean13/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Inclus (constitution PRINCIPLE V : tests obligatoires, coverage > 80 %) — les tests sont écrits AVANT l'implémentation (red-green).

**Organization**: Tasks grouped by user story (US1 = galerie, US2 = création/impression EAN-13) pour implémentation et tests indépendants.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths in descriptions

## Path Conventions

Web app Next.js App Router à la racine du dépôt (pas de monorepo) :
`app/`, `components/`, `lib/` — voir `plan.md` > Project Structure.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialisation du projet (git, scaffold Next.js, shadcn/ui)

- [x] T001 Initialize git repository and create dedicated branch `001-module-ean13` (no commit/push without explicit user order)
- [x] T002 Scaffold Next.js (App Router, TypeScript, Tailwind) at repository root with `create-next-app`, preserving `.specify/` and `specs/`
- [x] T003 Initialize shadcn/ui with the provided preset: `npx shadcn@latest init --preset b1FSRMDw0` (opaque preset code — do not decode)
- [x] T004 Add required shadcn components: `npx shadcn@latest add card form input button label alert-dialog sonner`

**Checkpoint**: Project builds and boots (`npm run dev`) — `http://localhost:3000` reachable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infra commune obligatoire avant TOUTE user story (tests, env, layout)

**⚠️ CRITICAL**: Aucun travail sur user story avant la fin de cette phase

- [x] T005 Configure testing toolchain: `vitest.config.ts`, jsdom environment, setup file, supertest, coverage threshold 80% (constitution PRINCIPLE V)
- [x] T006 [P] Create `.env` (values below) + `.env.example`, and server-only env reader `lib/env.ts` validated with zod (`ZPL_PRINTER_HOST=192.168.1.63`, `ZPL_PRINTER_PORT=9100`, `ZPL_LABEL_WIDTH_MM=40`, `ZPL_LABEL_HEIGHT_MM=25`, `ZPL_RESOLUTION_DPI=203`)
- [x] T007 [P] Create `app/layout.tsx` and `app/globals.css` from the applied preset theme, and mount `<Toaster />` (sonner) for global notifications

**Checkpoint**: Fondation prête — les user stories peuvent commencer en parallèle

---

## Phase 3: User Story 1 - Galerie de modules (Priority: P1) 🎯 MVP

**Goal**: La landing affiche une galerie listant le module EAN-13 (extensible) ; la sélection ouvre le formulaire EAN-13

**Independent Test**: Ouvrir l'app → la galerie s'affiche → le module **EAN-13** apparaît → cliquer renvoie vers la page `/ean13` (formulaire)

### Tests for User Story 1

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation

- [x] T008 [P] [US1] Unit tests `lib/modules/_tests_/registry.test.ts` : le registre expose le module `ean13` avec `id`, `name` "EAN-13", `href` "/ean13" ; qu'un module supplémentaire peut être ajouté sans modifier `ean13` (extensibilité FR-002)
- [x] T009 [P] [US1] Component test `components/__tests__/label-gallery.test.tsx` (RTL) : les cards des modules s'affichent et pointent vers leur `href`

### Implementation for User Story 1

- [x] T010 [US1] Create module registry `lib/modules/registry.ts` with `LabelModule` type `{ id, name, description, href }` — single module `{ id:"ean13", name:"EAN-13", description:"Imprimer des étiquettes à code-barres EAN-13", href:"/ean13" }` (design extensible, évolutivité)
- [x] T011 [P] [US1] Create gallery component `components/label-gallery.tsx` : grille de cards (shadcn Card) construite depuis le registre, chaque card étant un lien vers `module.href`
- [x] T012 [US1] Create gallery page `app/page.tsx` rendant `LabelGallery` (landing)
- [x] T013 [US1] Create EAN-13 placeholder page `app/ean13/page.tsx` : "Module EAN-13" + lien retour galerie (complété par US2)

**Checkpoint**: US1 fonctionne seule — galerie affichée, sélection → `/ean13`

---

## Phase 4: User Story 2 - Créer et imprimer une étiquette EAN-13 (Priority: P1)

**Goal**: Formulaire EAN-13 (code + quantité), validation stricte, impression ZPL via imprimante réseau, modal critique (AlertDialog) si quantité > 2

**Independent Test**: Saisir l'EAN-13 `5901234123457` et quantité `5` → modal critique s'affiche → **Confirmer** → 5 étiquettes imprimées ; quantité `2` → impression directe

### Tests for User Story 2

> **NOTE**: Write these tests FIRST, ensure they FAIL before implementation

- [x] T014 [P] [US2] Unit tests `lib/ean13/validate.test.ts` : `5901234123457` valide ; `5901234123456` (mauvaise clé), `59012341234` (12 chiffres), `abcdefghijklm`, vide => invalides (per `contracts/ean13.md`)
- [x] T015 [P] [US2] Unit tests `lib/zpl/build.test.ts` : flux contient `^XA`/`^XZ`, `^PW320`/`^LL200`, `^BE` hauteur 120, `^FD` = 12 chiffres sans clé (`5901234123457` → `^FD590123412345`), `^PQ5` pour quantité 5
- [x] T016 [P] [US2] Contract tests (Supertest, socket mockée) pour `app/api/print/ean13/route`: 200 succès, 422 EAN/quantité invalides (dont quantité > 1000), 409 impression en cours, 503 imprimante injoignable
- [x] T017 [P] [US2] Component tests `components/__tests__/ean13-confirm-dialog.test.tsx` (RTL, fetch mocké) : qty > 2 => AlertDialog affiché, **Annuler** => aucune requête et valeurs du formulaire conservées, **Confirmer** => requête envoyée

### Implementation for User Story 2

- [x] T018 [US2] Create shared validation `lib/ean13/validate.ts` : `isEan13Valid()` (13 chiffres exactement + checksum mod 10, per `contracts/ean13.md`) + schéma zod `labelRequestSchema` (ean13 `/^\d{13}$/` + clé, quantity entier 1..1000) — source unique client/serveur (DRY)
- [x] T019 [US2] Create ZPL builder `lib/zpl/build.ts` (pure, testé) : `^XA^PW<w>^LL<h>^LH0,0^BY2,3,120^FO70,30^BEN,120,Y,N^FD<12chiffres>^FS^PQ<qty>^XZ`, dimensions mm→dots via `lib/env.ts` (203 dpi = 8 dots/mm), `^FD` = 12 chiffres de données (l'imprimante calcule la clé)
- [x] T020 [P] [US2] Create printer sender `lib/printer/send.ts` : socket TCP brute (Node `net`) vers `ZPL_PRINTER_HOST:ZPL_PRINTER_PORT` (192.168.1.63:9100), écrit le flux ZPL, résout `{ status:"sent" }` sur écriture confirmée, rejette avec erreur explicite sinon (aucun échec silencieux)
- [x] T021 [US2] Create `app/api/print/ean13/route.ts` avec `POST`, branché sur `lib/env.ts` + `send.ts` : validation serveur `labelRequestSchema` (422), garde-fou anti-chevauchement in-flight (409), envoi via `send.ts` (503 imprimante), succès 200 `{ status:"sent", quantity }` — per `contracts/web-api.md`
- [x] T022 [P] [US2] Create critical dialog `components/ean13-confirm-dialog.tsx` : shadcn **AlertDialog** destructive « Imprimer N étiquettes ? », actions **Annuler**/**Confirmer**, blocage de l'impression tant que non confirmé (FR-007)
- [x] T023 [P] [US2] Create form `components/ean13-form.tsx` : inputs code EAN-13 + quantité, validation client via `labelRequestSchema` (messages clairs), si quantité > 2 => ouvre `ConfirmDialog` AVANT l'appel API, sinon appelle directement ; bouton désactivé pendant l'envoi (FR-010)
- [x] T024 [US2] Complete `app/ean13/page.tsx` (remplace le stub T013) : rend `Ean13Form` + `ConfirmDialog` + toasts succès/erreur (sonner)

**Checkpoint**: US1 + US2 fonctionnent ensemble — validation, modal critique > 2, impression ZPL réelle

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Améliorations transverses (validation E2E, couverture, docs, sécurité)

- [x] T025 [P] Run `quickstart.md` scenarios A–F end-to-end against the real ZPL printer (192.168.1.63, 40×25 mm labels) and record results, including a time measurement of "génération de la demande < 30 s" (SC-004)
- [x] T026 Ensure coverage > 80% overall (`npm run test --coverage`) and clean `npm run lint` (no warnings)
- [x] T027 [P] Documentation : `README.md` (prérequis imprimante, `.env`, lancement), remove the temporary Sync Impact Report from `.specify/memory/constitution.md`
- [x] T028 Security review : no secret in code (host/port/dimensions only in `.env`), server-side validation is the source of truth, app bound to localhost only

**Checkpoint**: Feature complete and validated end-to-end on the local printer

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+ = US1, US2)**: depend on Foundational
  - US1 and US2 can proceed in parallel (distinct files)
- **Polish (Final Phase)**: depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: starts after Foundational (Phase 2) — no dependency on US2
- **US2 (P1)**: starts after Foundational (Phase 2) — builds on the `/ean13` page stubbed by US1 (T013), but is independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- US1 : registry → composant → page
- US2 : validation → ZPL → envoi réseau → route API → composants UI

### Parallel Opportunities

- Phase 1 : T001→T002→T003→T004 sequential (init avant add de composants)
- Phase 2 : T006, T007 in parallel (distinct files)
- Phase 3 : T008/T009 (tests) puis T010/T011 in parallel
- Phase 4 : T014/T015/T016/T017 (tests) puis T018/T020/T022/T023 in parallel
- US1 et US2 peuvent être menées en parallèle après la phase Foundational

### Parallel Example: User Story 2 (join)

```bash
# Launch all tests for US2 together:
Task: "Unit tests validate.ts (T014)"
Task: "Unit tests build.ts (T015)"
Task: "Contract tests route print/ean13 (T016)"
Task: "Component tests confirm dialog (T017)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 (galerie)
4. **STOP & VALIDATE** : galerie + navigation fonctionnelles

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → démo (galerie)
3. US2 → test → démo avec imprimante réelle (MVP métier complet)
4. Chaque story apporte de la valeur sans casser la précédente

### Parallel Team Strategy

- Team : Setup + Foundational ensemble
- Dev A : US1 (galerie)
- Dev B : US2 (formulaire + impression), après le stub `/ean13` de US1
- Intégration : T024 (page complète) en dernier

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to US1/US2 for traceability
- Constitution : tests obligatoires avec coverage > 80 % — non négociable
- Do NOT commit/push without explicit user order (constitution, Git)
- Write `.env` locally; `.env.example` is the versioned template without real values
- ZPL `^BE` uses 12 data digits; the printer computes the 13th check digit
- Stop at each checkpoint to validate the story independently