# Tasks: Module Data Matrix avec légende

**Input**: Design documents from `/specs/015-data-matrix-module/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Obligatoires (constitution V) ; les tests de chaque histoire sont
écrits avant son implémentation et doivent échouer d'abord.

**Organization**: Tâches groupées par histoire utilisateur pour permettre une
implémentation et une validation indépendantes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: peut tourner en parallèle (fichiers différents, aucune dépendance)
- **[Story]**: US1, US2 ou US3 (absent en Setup/Foundational/Polish)
- Chemins de fichiers exacts dans chaque description

## Phase 1: Setup

**Purpose**: Vérifier la base et préparer les répertoires

- [X] T001 [P] Vérifier la base verte avant modification (`npm test`, `npm run lint`, `npx tsc --noEmit`) et noter l'état de la branche dans `package.json`
- [X] T002 [P] Créer les répertoires de tests `lib/data-matrix/__tests__/` et `app/api/print/data-matrix/__tests__/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schéma de validation et primitives d'encodage communs à toutes les histoires

**⚠️ CRITICAL**: Aucune histoire ne commence avant cette phase.

- [X] T003 [P] Créer `lib/data-matrix/validate.ts` : `content` requis, `trim()` puis 1–200 caractères et regex `^[\x20-\x7E]+$` ; `legend` facultatif, `trim()` puis 0–60 caractères et regex `^[\x20-\x7E]*$` (vide normalisé en `""`) ; réutiliser `quantityField`, `paperIdField`, `printerAddressField`, `rotatedField` de `lib/print-options.ts` ; schéma `.strict()` et export du type
- [X] T004 [P] Écrire `lib/data-matrix/__tests__/validate.test.ts` : contenu vide/espaces, accents/emoji, 200 et 201 caractères, légende absente/vide/60/61, accents dans la légende, champs inconnus refusés, trim des bords et conservation des espaces internes/casse
- [X] T005 [P] Créer `lib/zpl/data-matrix.ts` avec la table des capacités ECC200 carrées (3, 5, 8, 12, 18, 22, 30, 36, 44, 62, 86, 114, 144, 174, 204, 280 octets pour 10 à 64 modules), `dataMatrixSymbolDimension(length)`, `escapeDataMatrixData(value)` (`_`→`__`, `^`→`_d094`, `~`→`_d126`) et la réutilisation de `escapeTextData` de `lib/zpl/code128.ts` pour la légende
- [X] T006 Écrire `lib/zpl/__tests__/data-matrix-encoding.test.ts` : dimensions aux bornes de capacité (3/4, 174/175, 200), échappement `A_B^C~D` → `A__B_d094C_d126D`, aucun échappement pour les autres ASCII, légende via `^FH` uniquement si `^`, `~` ou `_`

**Checkpoint**: schéma et primitives prêts ; US1 peut démarrer.

---

## Phase 3: User Story 1 - Imprimer une étiquette Data Matrix avec légende (Priority: P1) 🎯 MVP

**Goal**: Saisir contenu + légende facultative, imprimer N étiquettes Data
Matrix carrées avec le contenu exact et la légende lisible.

**Independent Test**: Imprimer `REF-2026-A17` + `Palette 42` en quantité 1 :
le scan restitue `REF-2026-A17`, le code est carré/centré et la légende
apparaît sous le code (à côté en pivoté) ; sans légende, aucun texte.

### Tests for User Story 1

- [X] T007 [P] [US1] Écrire `lib/zpl/__tests__/data-matrix.test.ts` : ZPL normal (`^BXN,<module>,200,<dim>,<dim>,6,_,1`), `^FD` échappé, légende `^AEN...^FB<widthDots>,1,0,C`, `^PQ<quantity>` ; pivoté (`^BXB`, `^AEB...^FB<heightDots>`) ; légende vide = aucun champ texte ; symbole carré et module 2–8
- [X] T008 [US1] Implémenter dans `lib/zpl/data-matrix.ts` le calcul de mise en page (marge 8, zone de silence 1 module/côté, légende OCR-B 28–112 points, module `clamp(⌊min(largeurDispo, hauteurDispo)/(dimension+2)⌋, 2, 8)`) et `buildDataMatrixZpl({ content, legend?, quantity?, widthDots, heightDots, rotated? })` avec les deux orientations
- [X] T009 [P] [US1] Créer `app/api/print/data-matrix/route.ts` avec `createPrintPostHandler`, `dataMatrixRequestSchema`, `buildDataMatrixZpl` et `body: { status: "sent", labels: data.quantity }`
- [X] T010 [P] [US1] Écrire `app/api/print/data-matrix/__tests__/route.test.ts` : 200 avec contenu/légende/quantité, 422 JSON invalide et champs Zod, 409 impression concurrente, 503 imprimante injoignable, format inconnu et rotation non supportée
- [X] T011 [P] [US1] Créer `components/data-matrix-form.tsx` : champs Contenu (`maxLength=200`) et Légende facultative (`maxLength=60`), Quantité 1–1000, validation par le schéma, `sendPrintRequest("/api/print/data-matrix", …)`, `PrintConfirmDialog` si `quantity > 2`, `noValidate`
- [X] T012 [P] [US1] Écrire `components/__tests__/data-matrix-form.test.tsx` : envoi nominal avec contenu + légende, légende vide omise ou vide, garde-fou sans imprimante, confirmation > 2, annulation sans envoi, erreur 422/503 affichée
- [X] T013 [US1] Créer `app/data-matrix/page.tsx` avec titre « Étiquette Data Matrix », description des deux champs et lien retour

**Checkpoint**: US1 fonctionnelle et testable seule (impression nominale avec
ou sans légende).

---

## Phase 4: User Story 2 - Rejeter un contenu ou une légende non imprimable (Priority: P2)

**Goal**: Refuser sans impression les contenus/légendes invalides ou trop
grands pour le support, avec un message actionnable.

**Independent Test**: `café`, 201 caractères, légende de 61 caractères et
contenu de 200 + légende de 60 en 40 × 25 mm sont refusés avec un message et
aucun envoi.

### Tests for User Story 2

- [X] T014 [P] [US2] Écrire `lib/zpl/__tests__/data-matrix-fit.test.ts` : `dataMatrixFits` vrai pour les cas nominaux des quatre formats, faux si module < 2 ou bloc symbole+légende trop grand, faux pour une légende trop longue sur l'axe de texte, vrai sans légende
- [X] T015 [P] [US2] Écrire `app/api/print/data-matrix/__tests__/route-fit.test.ts` : 422 avec `Le contenu ou la légende ne tient pas sur ce format. Raccourcissez ou changez de format.` pour les cas hors format, 200 pour les cas limites acceptés, dans les deux orientations
- [X] T016 [US2] Implémenter `dataMatrixFits({ content, legend, widthDots, heightDots, rotated })` dans `lib/zpl/data-matrix.ts` (module minimal 2, réservation légende, orientation) et l'utiliser dans `buildDataMatrixZpl` pour ne jamais produire de bloc débordant
- [X] T017 [US2] Ajouter le hook `validate` à `app/api/print/data-matrix/route.ts` : `dataMatrixFits` sinon 422 avec le message ci-dessus
- [X] T018 [P] [US2] Écrire `components/__tests__/data-matrix-form-validation.test.tsx` : contenu vide, 201 caractères, accents, légende 61 caractères, accents dans la légende, quantité 0/1001, et propagation du 422 de tenue sans second envoi

**Checkpoint**: US1 + US2 indépendantes et fonctionnelles ; les rejets sont
couverts côté client et serveur.

---

## Phase 5: User Story 3 - Retrouver le module et réutiliser les réglages (Priority: P3)

**Goal**: Rendre le module découvrable et cohérent avec la galerie, les
modules récents et les réglages partagés.

**Independent Test**: La galerie affiche Data Matrix ; après visite il
apparaît dans les modules récents ; papier/orientation/imprimante du cookie
sont appliqués à l'impression.

### Implementation for User Story 3

- [X] T019 [P] [US3] Ajouter l'entrée `{ id: "data-matrix", name: "Data Matrix", description: "Imprimer des étiquettes Data Matrix à contenu libre et légende", href: "/data-matrix" }` dans `lib/modules/registry.ts`
- [X] T020 [P] [US3] Mettre à jour `app/__tests__/page.test.tsx` pour vérifier le lien `/data-matrix` dans la galerie et dans les modules récents
- [X] T021 [P] [US3] Mettre à jour `components/__tests__/recent-modules-tracker.test.tsx` pour vérifier l'enregistrement de `data-matrix` lors de la visite de `/data-matrix`
- [X] T022 [US3] Vérifier que `components/__tests__/app-sidebar.test.tsx` et `components/__tests__/header.test.tsx` couvrent la nouvelle entrée via `getLabelModules()` ; ajuster les attentes figées si nécessaire

**Checkpoint**: les trois histoires sont indépendamment fonctionnelles.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation finale et non-régression

- [X] T023 Exécuter `npm test` et corriger toute régression dans `lib/`, `app/` ou `components/`
- [X] T024 Exécuter `npm run test:coverage` et vérifier une couverture > 80 %
- [X] T025 Exécuter `npm run lint`, `npx tsc --noEmit` et `npm run build` ; corriger warnings et erreurs
- [X] T026 Dérouler `specs/015-data-matrix-module/quickstart.md` (dont Labelary) et valider le scan réel sur l'imprimante cible
- [X] T027 Relire `lib/zpl/data-matrix.ts` et `lib/data-matrix/validate.ts` : échappements `^BX`, bornes 200/60, aucun TODO/commentaire inutile, aucune modification des modules existants

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: aucune dépendance
- **Foundational (Phase 2)**: dépend du Setup ; bloque US1, US2 et US3
- **US1 (Phase 3)**: dépend de la Phase 2
- **US2 (Phase 4)**: dépend de la Phase 2 et réutilise le générateur de US1
- **US3 (Phase 5)**: dépend de la Phase 2 ; la page de US1 est nécessaire pour
  tester le suivi des modules récents
- **Polish (Phase 6)**: dépend de toutes les histoires livrées

### User Story Dependencies

- **US1 (P1)**: aucune dépendance sur US2/US3 — MVP
- **US2 (P2)**: dépend du générateur de US1 pour le calcul de tenue
- **US3 (P3)**: dépend de la page de US1 pour les modules récents

### Within Each User Story

- Tests écrits avant l'implémentation et échouant d'abord
- Schéma/entités avant services/générateur
- Générateur avant route
- Route avant tests de route complets
- Formulaire avant page

### Parallel Opportunities

- T001, T002 en parallèle
- T003, T004, T005 en parallèle (fichiers différents) ; T006 après T005
- US1 : T007, T009, T010, T011, T012 en parallèle après T005 ; T008 après
  T005/T007 ; T013 après T011
- US2 : T014, T015, T018 en parallèle ; T016 après T014 ; T017 après T015/T016
- US3 : T019, T020, T021 en parallèle ; T022 après T019

---

## Parallel Example: User Story 1

```bash
Task: "Écrire lib/zpl/__tests__/data-matrix.test.ts"
Task: "Créer app/api/print/data-matrix/route.ts"
Task: "Écrire app/api/print/data-matrix/__tests__/route.test.ts"
Task: "Créer components/data-matrix-form.tsx"
Task: "Écrire components/__tests__/data-matrix-form.test.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "Écrire lib/zpl/__tests__/data-matrix-fit.test.ts"
Task: "Écrire app/api/print/data-matrix/__tests__/route-fit.test.ts"
Task: "Écrire components/__tests__/data-matrix-form-validation.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2
2. Phase 3 (US1)
3. **STOP et VALIDER** : impression `REF-2026-A17` + `Palette 42`, scan et
   légende lisible
4. Démo possible

### Incremental Delivery

1. Setup + Foundational → base prête
2. US1 → MVP (impression nominale)
3. US2 → garde-fous de tenue et de saisie
4. US3 → galerie, modules récents, réglages partagés
5. Polish → suite verte, couverture, lint/typecheck/build, quickstart

---

## Notes

- Tests obligatoires par la constitution V ; ne pas livrer sans suite verte.
- Aucun commit/push/merge sans ordre explicite.
- La branche cible `feature/015-data-matrix-module` reste à créer ; le travail
  014 non commité est encore sur `feature/014-code128-module`.
- Ne pas modifier `lib/zpl/code128.ts`, `lib/print/route-handler.ts`,
  `lib/print-client.ts` ni les modules existants.
- La légende est facultative : vide = aucun champ texte, symbole seul centré.
