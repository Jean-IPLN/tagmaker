---

description: "Task list for feature 006 - printer & paper settings"

---

# Tasks: Paramétrage imprimante et taille de papier

**Input**: Design documents from `/specs/006-printer-paper-settings/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD exigé — les tests sont écrits AVANT l'implémentation et doivent
échouer au départ (RGE : couverture > 80 %).

**Organization**: Tasks grouped by user story for independent implementation
and testing. Baseline : 80 tests verts (feature 005).

## Path Conventions

- Monopile App Router : `app/`, `components/`, `lib/`
- Tests au même niveau que le code (`lib/x.test.ts`, `app/api/*/__tests__/`, `components/__tests__/`)
- Spec : `specs/006-printer-paper-settings/` ; contrats : `specs/006-printer-paper-settings/contracts/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: branche dédiée, composant Select, configuration env

- [X] T001 Create dedicated git branch `006-printer-paper-settings` from `master`
- [X] T002 [P] Verify no new dependency needed and add shadcn Select base-nova in `components/ui/select.tsx` (built on `@base-ui/react`, already installed)
- [X] T003 [P] Extend `lib/env.ts` zod schema with optional `ZPL_PAPER_SIZES` and optional `ZPL_SCAN_SUBNET` (server-only) + update `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: logique pure des formats papier et du cookie — bloque US1 et US2

**⚠️ CRITICAL**: aucune user story avant cette phase

- [X] T004 [P] Write RED test `lib/paper-sizes.test.ts`: `parsePaperSizes("40x25, 50x25, 60x40, 100x50")` sorted by `surfaceMm2` ascending (`40x25`→1000, `50x25`→1250, `60x40`→2400, `100x50`→5000), invalid items (`zpl`, `abc`, `-3x0`) discarded, duplicate `id` dropped, never empty (fallback to current `ZPL_LABEL_WIDTH_MM`×`ZPL_LABEL_HEIGHT_MM` when raw empty/invalid), `id` = `"<largeur>x<longueur>"`, `label` = `"<largeur> × <longueur> mm"` (contracts/paper-sizes.md)
- [X] T005 Implement `lib/paper-sizes.ts` (pure, no DOM/network): `parsePaperSizes(raw, { widthMm, heightMm })` + `sizeById(id, sizes)` returning `undefined` for unknown ids (contracts/paper-sizes.md)
- [X] T006 [P] Write RED test `lib/print-settings-cookie.test.ts`: cookie absent / invalid JSON / wrong field types → `{}`; write `{ paperId, printerAddress }` then read round-trip; attributes `Max-Age=2592000`, `path=/`, `SameSite=Lax`, non HttpOnly (contracts/settings-cookie.md)
- [X] T007 Implement `lib/print-settings-cookie.ts`: `PRINT_SETTINGS_COOKIE_NAME` (shared const), `readPrintSettings()`, `writePrintSettings()`, `clearPrintSettings()` (tests only); silent failure on write (contracts/settings-cookie.md)

**Checkpoint**: formats + cookie OK — les user stories peuvent démarrer

---

## Phase 3: User Story 1 - Réglage de la taille de papier (Priority: P1) 🎯 MVP

**Goal**: section « Paramètres » au pied de la barre latérale avec le sélecteur
« Papier » (formats `.env`, tri surface croissante, défaut présélectionné,
persistant en cookie) ; l'impression EAN-13 utilise le format choisi.

**Independent Test**: ouvrir la section, sélectionner un format → recharger →
toujours sélectionné ; imprimer → dimensions du flux ZPL = format choisi
(lisible dans `lib/zpl/build.ts` sortie). Testable sans imprimante.

### Tests for User Story 1 ⚠️

> **NOTE: écrire ces tests en premier, les voir ÉCHOUER, puis implémenter**

- [X] T008 [P] [US1] RED test `app/api/print/ean13/__tests__/route.test.ts`: `paperId` valide → dimensions associées ; `paperId` inconnu → `422 VALIDATION_ERROR` ; sans `paperId` → feuille `.env` (contrat contracts/printing.md)
- [X] T009 [P] [US1] RED test `components/__tests__/settings-footer.test.tsx`: section « Paramètres » dans le pied, sélecteur « Papier » listant les formats triés (surface croissante) avec format courant annoté « par défaut » et présélectionné ; sélection → cookie `paperId` (contracts/ui.md)

### Implementation for User Story 1

- [X] T010 [US1] Extend `labelRequestSchema` in `lib/ean13/validate.ts` with optional `paperId: string` (contracts/printing.md)
- [X] T011 [US1] Update `app/api/print/ean13/route.ts`: resolve `widthMm`/`heightMm` from `paperId` (via `sizeById` + env sizes) else `ZPL_LABEL_WIDTH_MM`/`ZPL_LABEL_HEIGHT_MM` (contracts/printing.md)
- [X] T012 [US1] Implement `components/settings-footer.tsx`: section `Paramètres`, `SidebarFooter` ; Select « Papier » from props `paperSizes: PaperSize[]` + `defaultPaperId: string` ; initial = cookie `paperId` (if in list) else `defaultPaperId` ; selection → `writePrintSettings({ paperId })` (contracts/ui.md, contracts/settings-cookie.md)
- [X] T013 [US1] Wire `app/layout.tsx` (server: parse `ZPL_PAPER_SIZES` → `paperSizes` + `defaultPaperId` via `lib/paper-sizes.ts`) and `components/app-sidebar.tsx` (`SidebarFooter` → `<SettingsFooter ... />`)
- [X] T014 [US1] Update `components/ean13-form.tsx` to send current `paperId` (from `readPrintSettings()`) in the `POST /api/print/ean13` body (contracts/printing.md)
- [X] T015 [US1] Verify User Story 1 independently: build + HTML SSR (section Paramètres et formats présents), sélection « Papier » persistante au rechargement, impression dimensionnée au format choisi (contrôle des dimensions dans le flux ZPL)

**Checkpoint**: US1 fully functional and testable independently

---

## Phase 4: User Story 2 - Réglage de l'imprimante (Priority: P1)

**Goal**: sélecteur « Imprimante » : cookie → affichée directement sans scan ;
sinon état non sélectionné + avertissement, scan réseau à l'ouverture, choix
explicite seul mémorisé ; l'impression part vers la destination choisie.

**Independent Test**: sans cookie → avertissement visible, ouverture → scan et
liste des imprimantes du réseau ; sélection → cookie + impression vers cette
adresse ; avec cookie → sélection directe sans appel réseau.

### Tests for User Story 2 ⚠️

- [X] T016 [P] [US2] RED test `lib/printer/discovery.test.ts` (pure logic, `node:net` mocked): subnet derived from `ZPL_PRINTER_HOST` (/24, host excluded), only port-open addresses returned, non-local IPs excluded, bounded budget, no data written (contracts/printer-discovery.md)
- [X] T017 [P] [US2] RED test `app/api/printers/discover/__tests__/route.test.ts` (supertest, net mocked): returns `{ printers: [...] }`; scan empty → `200 { printers: [] }` ; unknown subnet → `503` (contracts/printer-discovery.md)
- [X] T018 [P] [US2] RED test `app/api/print/ean13/__tests__/route.test.ts`: `printerAddress` valide → envoi vers cette adresse ; mal formée → `422` ; absente → défaut `.env` (contracts/printing.md)
- [X] T019 [P] [US2] RED test `components/__tests__/settings-footer.test.tsx`: cookie `printerAddress` → sélectionné sans scan ; sans cookie → état non sélectionné + avertissement ; ouverture → fetch `/api/printers/discover` (mocked) + « Aucune imprimante détectée » si vide ; sélection → cookie (contracts/ui.md)

### Implementation for User Story 2

- [X] T020 [US2] Implement `lib/printer/discovery.ts` (server): scan /24 derived from `ZPL_PRINTER_HOST` (or `ZPL_SCAN_SUBNET`), probe `ZPL_PRINTER_PORT`, parallel batches ≤ 50, per-host timeout ≤ 2000ms, total budget bounded, close sockets immediately, never write payload (contracts/printer-discovery.md)
- [X] T021 [US2] Implement `app/api/printers/discover/route.ts`: `200 { printers }` or `503` (subnet undeterminable) (contracts/printer-discovery.md)
- [X] T022 [US2] Modify `lib/printer/send.ts`: `sendToPrinter(zpl, target?: { host: string; port: number })` defaulting to env (keep current error/status semantics) (contracts/printing.md)
- [X] T023 [US2] Extend `labelRequestSchema` in `lib/ean13/validate.ts` with optional `printerAddress` (IPv4) (contracts/printing.md)
- [X] T024 [US2] Update `app/api/print/ean13/route.ts`: destination = `printerAddress` + `ZPL_PRINTER_PORT`, else env host/port (contracts/printing.md)
- [X] T025 [US2] Extend `components/settings-footer.tsx` with the « Imprimante » Select: cookie present → selected directly (no scan, FR-013) ; absent → placeholder « Imprimante non définie » + warning, disabled while loading, on open call `GET /api/printers/discover`, « Recherche des imprimantes… » then options, empty → « Aucune imprimante détectée », selection → `writePrintSettings({ printerAddress })` (contracts/ui.md)
- [X] T026 [US2] Update `components/ean13-form.tsx` to send current `printerAddress` (from `readPrintSettings()`) in the print request body (contracts/printing.md)

**Checkpoint**: US1 AND US2 both functional and independently testable

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: documentation, couverture, validation end-to-end

- [X] T027 [P] Update `README.md` (section Paramètres : formats `.env`, cookie, découverte réseau)
- [X] T028 [P] Run `npm run test:coverage` — coverage ≥ 80 % (RGE)
- [X] T029 Run `npm run lint` (0 warning) + `npm run build` (vert)
- [X] T030 Run `specs/006-printer-paper-settings/quickstart.md` scenarios A–G and mark `[x]` along the way

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucun prérequis
- **Foundational (Phase 2)** : dépendante du Setup ; BLOQUE toutes les stories
- **User Stories (Phase 3-4)** : dépendantes du Foundational ; séquentielles en
  priorité (US1 → US2), avec dépendances de fichiers partagés
- **Polish (Phase 5)** : après US1 et US2

### User Story Dependencies

- **User Story 1 (P1)** : démarre après Foundational — aucune dépendance sur US2
- **User Story 2 (P1)** : démarre après Foundational — partage
  `components/settings-footer.tsx` (T012) et `components/ean13-form.tsx` (T014)
  → **séquentielle après US1** sur ces fichiers, sinon indépendante

### Within Each User Story

- Tests écrits AVANT l'implémentation (RGE), doivent ÉCHOUER d'abord
- Logique pure avant route ; route avant UI ; intégration en dernier

### Parallel Opportunities

- Setup : T002 ∥ T003
- Foundational : T004 ∥ T006
- US1 : T008 ∥ T009
- US2 : T016 ∥ T017 ∥ T018 ∥ T019
- TDD : chaque paire test→implémentation est [P]-isable avec une autre paire de
  fichiers disjoints

---

## Parallel Example: User Story 2 tests

```bash
Task: "RED test discovery logic in lib/printer/discovery.test.ts"
Task: "RED test route in app/api/printers/discover/__tests__/route.test.ts"
Task: "RED test print destination in app/api/print/ean13/__tests__/route.test.ts"
Task: "RED test footer in components/__tests__/settings-footer.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational → fondations prêtes
2. US1 (Selector Papier + impression dimensionnée) → **STOP, valider**
   indépendamment (impression possible sans imprimante)
3. US2 (découverte + destination) → valider indépendamment
4. Polish → validation quickstart A–G

### Incremental Delivery

- Phase 1+2 → phase 3 (MVP) → démo → phase 4 → démo → phase 5

---

## Notes

- [P] = fichiers différents, aucune dépendance
- [US1]/[US2] = traçabilité vers les user stories
- TDD : les tests doivent échouer avant implémentation
- Ne **jamais commit/push sans ordre explicite** (RGE) ; chaque groupe logique
  fera l'objet d'un commit à la demande explicite de l'utilisateur