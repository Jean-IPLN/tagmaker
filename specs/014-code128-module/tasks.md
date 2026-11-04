# Tasks: Module Code 128 à contenu libre

**Input**: Design documents from `/specs/014-code128-module/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: OBLIGATOIRES (constitution V : couverture > 80 %, tests avant
implémentation pour chaque comportement nouveau).

**Organization**: Tâches groupées par user story pour une implémentation et
une validation indépendantes.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, aucune dépendance en cours)
- **[Story]** : US1, US2, US3 (voir spec.md)
- Chemins de fichiers exacts dans chaque description

## Path Conventions

Application Next.js unique à la racine du dépôt : `app/`, `components/`,
`lib/`, tests colocalisés dans `__tests__/`.

---

## Phase 1: Setup

**Purpose**: Vérifier l'environnement avant toute modification

- [X] T001 Vérifier que la branche `feature/014-code128-module` est active et que la base est verte (`npm test`, `npm run lint`, `npx tsc --noEmit`) depuis la racine (`package.json`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructure partagée et duplications à factoriser avant
toute user story

**⚠️ CRITICAL**: Aucune user story ne commence avant la fin de cette phase.

- [X] T002 [P] Extraire les champs Zod communs (`quantity` entier 1–1000, `paperId`, `printerAddress` IPv4, `rotated`) dans `lib/print-options.ts` et les réutiliser dans `lib/ean13/validate.ts` et `lib/location/validate.ts`, messages d'erreur inchangés
- [X] T003 [P] Créer le dialogue générique `components/print-confirm-dialog.tsx` (titre « Imprimer N étiquette(s) ? », Annuler/Confirmer) et son test `components/__tests__/print-confirm-dialog.test.tsx` ; supprimer `components/ean13-confirm-dialog.tsx`, `components/location-confirm-dialog.tsx` et `components/__tests__/ean13-confirm-dialog.test.tsx`
- [X] T004 Créer `lib/print-client.ts` avec `submitPrint(endpoint, body, labels)` (garde-fou « Aucune imprimante sélectionnée… », ajout des réglages du cookie, toasts succès/503/réseau) et migrer `components/ean13-form.tsx` et `components/location-form.tsx` vers ce helper et vers le dialogue générique (comportement observable inchangé) — dépend de T003
- [X] T005 [P] Créer `lib/print/route-handler.ts` (`createPrintPostHandler({ schema, build, validate? })` : JSON invalide, `safeParse`, papier inconnu, rotation non pivotable, verrou par route, envoi, réponses 200/409/503) avec test `lib/print/__tests__/route-handler.test.ts`, puis migrer `app/api/print/ean13/route.ts` et `app/api/print/location/route.ts` en conservant leurs formats de réponse
- [X] T006 [P] Généraliser `lib/zpl/location.ts` vers `lib/zpl/code128.ts` : `buildCode128Zpl({ codes, quantity?, widthDots, heightDots, rotated? })`, `totalModules(n) = 11n + 55`, `maxCode128Length(...)`, `code128Fits(...)` ; faire de `lib/zpl/location.ts` un adaptateur ré-exportant `buildLocationZpl`, `SYMBOL_MODULES` (4 caractères) et `MIN_MODULE_WIDTH`
- [X] T007 [P] Créer `lib/code128/validate.ts` : `content` requis, `trim`, 1–80 caractères après trim, regex `^[\x20-\x7E]+$`, messages exacts (« Le contenu est requis », « Le contenu ne peut pas dépasser 80 caractères », « Le contenu ne peut contenir que des caractères ASCII imprimables ») ; champs `quantity`/`paperId`/`printerAddress`/`rotated` via `lib/print-options.ts` ; schéma strict sans `mode` — dépend de T002

**Checkpoint**: Infrastructure prête — les user stories peuvent démarrer.

---

## Phase 3: User Story 1 - Imprimer une étiquette Code 128 pour un contenu saisi (Priority: P1) 🎯 MVP

**Goal**: Saisir un contenu libre, une quantité, et imprimer des étiquettes
Code 128 identiques avec texte OCR-B, garde-fou imprimante et confirmation
au-delà de 2.

**Independent Test**: Imprimer `REF-2026-A17` (quantité 1) : le code-barres
scanne exactement `REF-2026-A17` ; avec quantité 5, la confirmation
s'affiche puis 5 étiquettes identiques sont produites ; sans imprimante
sélectionnée, aucun envoi.

### Tests for User Story 1

- [X] T008 [P] [US1] Écrire `lib/zpl/__tests__/code128.test.ts` : sous-ensemble B (`^BCN,…,N,N,N`, aucun `^CF`/`^BCR`), `11n + 35` modules + 20 de silence, texte OCR-B centré, sortie **identique pour 4 caractères** aux attentes de `lib/zpl/__tests__/location.test.ts`, orientations normale et pivotée (dépend de T006)
- [X] T009 [P] [US1] Écrire `app/api/print/code128/__tests__/route.test.ts` : 200 `{ "status": "sent", "labels": quantity }`, payload valide, JSON invalide → 422, verrou concurrent → 409, `sendToPrinter` en échec → 503
- [X] T010 [P] [US1] Écrire `components/__tests__/code128-form.test.tsx` : envoi de `{ content, quantity, paperId?, printerAddress?, rotated? }` depuis le cookie, toast de succès, garde-fou sans imprimante (aucun `fetch`), quantité > 2 → dialogue puis confirmation, annulation sans envoi

### Implementation for User Story 1

- [X] T011 [P] [US1] Créer `app/api/print/code128/route.ts` avec `createPrintPostHandler` (T005) et un builder appelant `buildCode128Zpl({ codes: [content], quantity, widthDots, heightDots, rotated })`, réponse `{ status: "sent", labels: quantity }` (dépend de T005, T006, T007)
- [X] T012 [P] [US1] Créer `components/code128-form.tsx` : champ « Contenu » (`Input`, `maxLength={80}`, aide « 1 à 80 caractères ASCII imprimables »), champ « Quantité » (1–1000, défaut 1), validation client via `code128RequestSchema`, envoi via `lib/print-client.ts`, dialogue générique au-delà de 2, bouton « Impression en cours… » désactivé pendant l'envoi (dépend de T003, T004, T007)
- [X] T013 [US1] Créer `app/code128/page.tsx` (titre « Code 128 », description, formulaire) (dépend de T012)

**Checkpoint**: US1 fonctionnelle et testable seule via `/code128` (sans
entrée de galerie).

---

## Phase 4: User Story 2 - Rejeter un contenu non imprimable ou trop volumineux (Priority: P2)

**Goal**: Refuser sans impression les contenus invalides (vide, non ASCII
imprimable, > 80, ne tenant pas sur le papier) avec un message explicite.

**Independent Test**: `café`, 81 caractères et 10 caractères en 40 × 25 mm
sont refusés avec un message ; aucune requête n'est envoyée à l'imprimante.

### Tests for User Story 2

- [X] T014 [P] [US2] Écrire `lib/code128/__tests__/validate.test.ts` : vide/espaces, accents/emoji/caractères de contrôle refusés, 80 caractères acceptés, 81 refusés, trim des bords, casse et espaces internes conservés, quantité 0/1001/1,5/non numérique refusée
- [X] T015 [P] [US2] Écrire `app/api/print/code128/__tests__/route-fit.test.ts` : 10 caractères en 40 × 25 mm → 422 « Le contenu ne tient pas sur ce format (9 caractères max). » ; 5 caractères pivotés en 40 × 25 mm → 422 « (4 caractères max) » ; `sendToPrinter` non appelé
- [X] T016 [P] [US2] Écrire `components/__tests__/code128-form-validation.test.tsx` : vide → « Le contenu est requis », `Café` → message ASCII, 81 caractères → message de longueur, quantité invalide → message dédié, message serveur 422 affiché en toast et saisie conservée
- [X] T017 [P] [US2] Écrire `lib/zpl/__tests__/code128-fit.test.ts` : `maxCode128Length` = 9/4 (40×25), 22/4 (75×25), 31/13 (100×50), 31/49 (100×150) en normal/pivoté ; `code128Fits` faux à la limite + 1 ; largeur de module minimale 2 et hauteur de texte bornée

### Implementation for User Story 2

- [X] T018 [US2] Brancher le hook `validate` de `app/api/print/code128/route.ts` : si `!code128Fits(content, { widthDots, heightDots, rotated })`, répondre 422 `Le contenu ne tient pas sur ce format (${maxCode128Length(...)} caractères max).` ; vérifier que les messages du schéma (T007) couvrent tous les rejets (dépend de T011)

**Checkpoint**: US1 et US2 vérifiées indépendamment.

---

## Phase 5: User Story 3 - Retrouver le module et réutiliser les réglages (Priority: P3)

**Goal**: Le module apparaît dans la galerie, la navigation et les modules
récents, et applique les réglages partagés (papier, orientation,
imprimante).

**Independent Test**: L'accueil liste « Code 128 » ; après usage, il figure
dans les modules récents ; changer papier/orientation dans les Paramètres
change les étiquettes produites.

### Tests for User Story 3

- [X] T019 [P] [US3] Mettre à jour `lib/modules/__tests__/registry.test.ts` : 3 modules, entrée `{ id: "code128", name: "Code 128", description: "Imprimer des étiquettes Code 128 à contenu libre", href: "/code128" }`
- [X] T020 [P] [US3] Mettre à jour `components/__tests__/recent-modules-gallery.test.tsx`, `components/__tests__/app-sidebar.test.tsx`, `components/__tests__/header.test.tsx` et `app/__tests__/page.test.tsx` pour inclure le module Code 128, et `components/__tests__/recent-modules-tracker.test.tsx` pour tracer `/code128`

### Implementation for User Story 3

- [X] T021 [US3] Ajouter l'entrée Code 128 dans `lib/modules/registry.ts` (id, nom, description, href ci-dessus) (dépend de T013, T019, T020)

**Checkpoint**: Les trois user stories sont fonctionnelles indépendamment.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Qualité, non-régression et validation de bout en bout

- [X] T022 Exécuter `npm test`, `npm run test:coverage` (> 80 %), `npm run lint` et `npx tsc --noEmit` ; corriger tout échec ou warning introduit par la feature
- [X] T023 Dérouler les scénarios 1–7 de `specs/014-code128-module/quickstart.md`, y compris la non-régression EAN-13/Emplacement et la parité ZPL 4 caractères
- [X] T024 Revue finale du diff : aucun TODO/code mort, aucun changement hors périmètre, contrats `specs/014-code128-module/contracts/` respectés, rapport de complétion

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: immédiat
- **Foundational (T002–T007)**: après T001 — **bloque toutes les stories**
- **US1 (T008–T013)**: après T007
- **US2 (T014–T018)**: après T011 (route) ; T014–T017 démarrent dès T007/T006
- **US3 (T019–T021)**: après T013
- **Polish (T022–T024)**: après T018 et T021

### User Story Dependencies

- **US1 (P1)**: aucune dépendance à US2/US3
- **US2 (P2)**: réutilise la route de US1 (hook `validate`), le générateur et le schéma
- **US3 (P3)**: réutilise la page de US1 ; indépendante de US2

### Within Each User Story

Tests → implémentation ; validation avant route ; route et formulaire avant
intégration ; story validée avant la suivante.

### Parallel Opportunities

- T002, T003, T005, T006, T007 en parallèle (fichiers disjoints) ; T004 après T003
- US1 : T008, T009, T010 en parallèle ; T011 et T012 en parallèle ; T013 après T012
- US2 : T014, T015, T016, T017 en parallèle ; T018 après T011
- US3 : T019 et T020 en parallèle ; T021 après T013 et T019/T020

---

## Parallel Example: User Story 1

```bash
# Tests en parallèle
Task: "Écrire lib/zpl/__tests__/code128.test.ts"
Task: "Écrire app/api/print/code128/__tests__/route.test.ts"
Task: "Écrire components/__tests__/code128-form.test.tsx"

# Implémentations en parallèle
Task: "Créer app/api/print/code128/route.ts"
Task: "Créer components/code128-form.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 → T002–T007 (fondations + factorisations)
2. T008–T013 (tests, route, formulaire, page)
3. **STOP et VALIDER** : impression `REF-2026-A17`, scan, confirmation,
   garde-fou
4. Démo possible via `/code128`

### Incremental Delivery

1. Fondations → suite verte, modules existants inchangés
2. US1 → MVP impression
3. US2 → rejets complets (contenu/format)
4. US3 → découvrabilité et modules récents
5. Polish → couverture, lint, types, quickstart

---

## Notes

- [P] = fichiers différents, sans dépendance en cours
- Les refactorisations T002–T005 sont protégées par les 393 tests existants ;
  toute différence de comportement est un échec
- Aucun commit sans ordre explicite de l'utilisateur
- Contraintes verbatim : `quantity` entier 1–1000 ; `content` 1–80 après
  `trim`, regex `^[\x20-\x7E]+$` ; accent/emoji/contrôle refusés ; limite
  papier calculée serveur (9/4, 22/4, 31/13, 31/49)
