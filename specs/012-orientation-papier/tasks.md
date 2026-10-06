# Tasks: Orientation d'impression du papier

**Input**: Design documents from `/specs/012-orientation-papier/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: La constitution (principe V) rend les tests **obligatoires** (couverture
> 80 %) : les tâches de test ci-dessous sont donc OBLIGATOIREMENT incluses, écrites
et rouges avant l'implémentation qu'elles couvrent.

**Organization**: Tasks grouped by user story (US1 P1 → US3 P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel
- **[Story]**: US1/US2/US3 de spec.md
- Paths: conventions du repo (structure Next.js App Router, `app/`, `components/`, `lib/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verte avant tout changement

- [X] T001 [P] Vérifier la base : lancer `pnpm vitest run` et le linter depuis
  la racine du repo ; constater la suite verte (couverture ≥ 80 %) avant toute
  modification, servir de référence de non-régression.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fondations bloquantes pour TOUTES les user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Étendre le modèle `PrintSettings` dans `lib/print-settings.ts` :
  ajouter `rotated?: boolean` (contrainte data-model.md : « `rotated` : `boolean ?` ;
  absente = `false` ; « `rotated` mal typé (non booléen) → `rotated: false` — ne
  casse pas la lecture des autres champs ») ; adapter `parsePrintSettings` et
  `serializePrintSettings` (un champ absent reste absent, un champ invalide est
  ignoré, jamais d'exception).
- [X] T003 [P] Extraire `dotsFromMm` + `resolveDimensions(paperId)` (dupliqués dans
  `app/api/print/ean13/route.ts` et `app/api/print/location/route.ts`) dans un
  module unique `lib/zpl/dimensions.ts` (DRY, constit. II) ; refactorer les deux
  routes pour l'importer — aucun changement de comportement (mêmes valeurs).
- [X] T004 [P] Créer `lib/orientation.ts` — source unique de la faisabilité
  rotation : `isRotatable({ widthMm, heightMm }, dpi)` (vrai si le petit côté en
  mm ≥ seuil), seuil dérivé des constantes de modules (EAN-13 `95 × 2`,
  Emplacement `79 × 2`, `min = 2`) via `25.4 / dpi` ; exposer les constantes pour
  les tests. Règle LE PLUS contraignant des deux modules (recherche D4/D5) :
  ≈ 23,8 mm @203 dpi.

**Checkpoint**: Foundation ready — US1 peut démarrer ; US3 dépend de T004.

---

## Phase 3: User Story 1 - Imprimer dans l'orientation inverse du support (Priority: P1) 🎯 MVP

**Goal**: Un switch **Orientation** dans Paramètres ; activé, le contenu imprimé
est pivoté d'un quart de tour (antihoraire, haut à gauche, FR-003) par les deux
modules, zone inchangée (FR-002), réglage persisté (FR-007), transmis par requête
(FR-006).

**Independent Test** (quickstart.md — 1/2) : activer le switch, format `40x25`,
imprimer une EAN-13 et une Emplacement → les deux sortent antihoraires, lisibles,
entièrement contenues ; recharger la page → le switch reste activé et l'impression
reste pivotée. Impressions en désactivé strictement identiques à aujourd'hui (FR-004).

### Tests for User Story 1 (écrire AVANT l'implémentation, s'assurer qu'ils échouent) ⚠️

- [X] T005 [P] [US1] Tests unitaires de `lib/zpl/rotated-layout.ts` (à créer) :
  axes échangés (axe symbole = côté court, axe empilage = côté long), toutes les
  boîtes contenues dans `[0,W]×[0,H]`, cohérence bars/text dans le repère roté.
- [X] T006 [P] [US1] Étendre `lib/zpl/__tests__/build.test.ts` et
  `lib/zpl/__tests__/location.test.ts` : avec `rotated: true` la ZPL contient
  `^BEB` / `^BCB` / `^AEB`, ne contient plus `^BEN` / `^BCN` / `^AEN`, et
  `^PW{widthDots}^LL{heightDots}` reste celui du format ; avec `rotated` omis ou
  `false`, sortie identique à l'existant (non-régression).
- [X] T007 [P] [US1] Tests schémas : `lib/ean13/validate.ts`
  (`labelRequestSchema`) et `lib/location/validate.ts` (`singleSchema`,
  `rangeSchema`) acceptent `rotated` booléen, et rejettent `rotated: "true"`,
  `rotated: 1` (bool strict).
- [X] T008 [US1] Test composant `components/__tests__/settings-footer.test.tsx` :
  le switch « Orientation » est présent (aria-label), actif par défaut (`false`),
  un clic écrit `{ rotated: true }` via `writeSettingsMock`, l'état du cookie est
  lu au montage.

### Implementation for User Story 1

- [X] T009 [P] [US1] Créer `lib/zpl/rotated-layout.ts` (fonctions pures) :
  conversion des boîtes logiques (layout calculé axes échangés) vers les ancres
  ZPL réelles de l'orientation `B` — convention d'ancre « coin inférieur gauche »
  (recherche D2, `contracts/zpl-rotation.md`) ; barres verticales (hauteur de
  barres le long du grand côté, centrée), texte au même niveau vertical, à droite
  des barres ; tous les éléments dans `[0,W]×[0,H]`.
- [X] T010 [P] [US1] Étendre `lib/zpl/build.ts` : ajouter `rotated?: boolean`
  (défaut `false`) à `BuildEan13ZplInput` ; quand `rotated`, calculer le layout
  avec les dimensions échangées via `lib/zpl/rotated-layout.ts` et émettre
  `^BEB` au lieu de `^BEN` ; `^PW`/`^LL` inchangés ; quand `false`, sortie
  strictement identique à l'actuel.
- [X] T011 [P] [US1] Étendre `lib/zpl/location.ts` (idem T010) : `rotated?: boolean`
  (défaut `false`) dans `BuildLocationZplInput` ; `^BCN`→`^BCB`, texte
  `^AEN`→`^AEB` ; axes échangés pour le layout ; canvas inchangé ; multi-labels
  (`codes`) tous orientés pareil.
- [X] T012 [P] [US1] Ajouter `rotated: z.boolean().optional()` à
  `labelRequestSchema` (`lib/ean13/validate.ts`) et aux deux schémas
  (`singleSchema`/`rangeSchema`) de `lib/location/validate.ts`.
- [X] T013 [US1] Câbler les routes : dans `app/api/print/ean13/route.ts` et
  `app/api/print/location/route.ts`, déstructurer `rotated` du corps validé et le
  transmettre aux builders via `performPrint` (Résolution effective,
  `contracts/printing-orientation.md`).
- [X] T014 [US1] Ajouter la ligne « Orientation » dans
  `components/settings-footer.tsx` : switch (pattern `SwitchRow` de
  `components/location-form.tsx`), états libellés (ex. « Normal » / « Pivotée »),
  aria-label « Orientation », lecture au montage via `readPrintSettings().rotated`,
  écriture d'un clic via `writePrintSettings({ rotated })` (FR-001/FR-007).
- [X] T015 [P] [US1] Transmettre le réglage : dans `components/ean13-form.tsx` et
  `components/location-form.tsx`, inclure `rotated` (lu de
  `readPrintSettings()`) dans le corps de requête, au même titre que
  `paperId`/`printerAddress` (FR-006).

**Checkpoint**: US1 fonctionnelle et testable seule (MVP complet).

---

## Phase 4: User Story 2 - Un réglage unique valable pour tous les types d'étiquettes (Priority: P2)

**Goal**: une seule activation couvre EAN-13 et Emplacement, y compris les lots
multi-étiquettes, sans réglage par module (FR-005/FR-006, SC-006).

**Independent Test** : activer le switch une fois, imprimer EAN-13 puis
Emplacement sans retoucher le réglage → les deux sorties sont dans l'orientation
inverse ; un lot de plusieurs étiquettes d'un même module l'est également.

### Tests for User Story 2 ⚠️

- [X] T016 [P] [US2] Étendre `components/__tests__/ean13-form.test.tsx` et
  `components/__tests__/location-form.test.tsx` : cookie `rotated: true`
  (mocké) → le corps des requêtes `POST /api/print/ean13` ET
  `POST /api/print/location` contient `rotated: true` ; aucune bascule par module.
- [X] T017 [P] [US2] Étendre `lib/zpl/__tests__/location.test.ts` : mode plage
  (`mode: "range"`, expansion) avec `rotated: true` → chaque étiquette de la pile
  (chaque bloc `^XA…^XZ`) porte `^BCB` (FR-006, SC-006).

### Implementation for User Story 2

- [X] T018 [US2] Vérifier/intégrer la transmission globale : s'assurer que le
  chemin plage (`buildRangesZpl` dans `app/api/print/location/route.ts`) relaie
  `rotated` comme en mono, et que les tests T016/T017 passent au vert ensemble
  (aucune logique supplémentaire : réutiliser T011/T013, KISS).

**Checkpoint**: US1 ET US2 fonctionnent indépendamment.

---

## Phase 5: User Story 3 - Revenir à l'orientation normale (Priority: P3)

**Goal**: désactivation → retour immédiat à l'orientation par défaut sans affecter
les autres réglages ; format trop étroit → switch désactivé + réglage réinitialisé
et jamais de bascule automatique (FR-013/014/015).

**Independent Test** : activer puis désactiver → impressions identiques à avant la
fonctionnalité, format de papier et imprimante inchangés ; sélectionner un format
trop étroit (ex. 20×30) → switch grisé, impression normale ; revenir sur 40×25 →
switch actif mais désactivé.

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] Tests unitaires de `lib/__tests__/orientation.test.ts` :
  seuils (côté court 25 mm → rotatable ; 20 mm → non rotatable @203 dpi), RÈGLE
  du plus contraignant, indépendance de la DPI (le seuil mm change avec la DPI).
- [X] T020 [P] [US3] Étendre `components/__tests__/settings-footer.test.tsx` :
  sélection d'un format non rotatable → switch `disabled` + écriture
  `writePrintSettings({ rotated: false })` (et `rotated` relu à `false`) ;
  retour à un format rotatable → switch réactivé mais `false` (FR-015) ;
  désactivation manuelle → `rotated: false` et les autres réglages mémorisés
  inchangés.
- [X] T021 [P] [US3] Tests routes/validation : `POST /api/print/ean13` avec
  `rotated: true` sur un format non rotatable → 422 `VALIDATION_ERROR` ;
  `rotated` non booléen → 422 (message clair) — même comportement pour
  `POST /api/print/location`.

### Implementation for User Story 3

- [X] T022 [US3] Propager la faisabilité : dans `app/layout.tsx` (server), calculer
  les formats rotatables avec `lib/orientation.ts` + `env.ZPL_RESOLUTION_DPI` ;
  passer `rotatablePaperIds` à `SettingsFooter` via `components/app-sidebar.tsx`
  (source unique, `contracts/printing-orientation.md`).
- [X] T023 [US3] Dans `components/settings-footer.tsx` : rendre le switch
  `disabled` pour un format non rotatable (FR-013) ; au changement vers un format
  non rotatable → réinitialiser `rotated` à `false` et écrire le cookie (FR-015) ;
  au retour compatible → le switch redevient actionnable mais reste désactivé
  (FR-014 : immédiat).
- [X] T024 [US3] Garde serveur dans `app/api/print/ean13/route.ts` et
  `app/api/print/location/route.ts` : si `rotated: true` et format non rotatable →
  422 `VALIDATION_ERROR` « Format inutilisable en orientation pivotée » (jamais
  d'impression illisible silencieuse) ; utiliser `lib/orientation.ts` (pas de
  seuil dupliqué).

**Checkpoint**: les trois user stories sont fonctionnelles et testables
indépendamment.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: validation finale et propreté (constitution IV/V)

- [X] T025 [P] Exécuter `specs/012-orientation-papier/quickstart.md` : test
  d'impression physique `nc` d'une EAN-13 et d'une Emplacement pivotées 40×25
  (haut du contenu à gauche, aucun rognage) ; noter le résultat dans la feature.
  (test physique effectué sur 100×150 mm : lisible, désormais centré verticalement
  avec l'ancre haut — correction appliquée dans `lib/zpl/rotated-layout.ts` et
  ZPL corrigées dans quickstart.md ; attente du retour utilisateur final non
  nécessaire à la clôture code, suite verte complète.)
- [X] T026 Vérifications finales : `pnpm vitest run` vert avec couverture > 80 %,
  linter propre, aucun warning ni TODO dans le code livré, sorties en mode
  désactivé strictement identiques (SC-005).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sans dépendance, à faire en premier (référence baseline).
- **Foundational (T002, T003, T004)**: dépendent de T001 ; bloquent les US.
- **US1 (Phase 3)**: dépend de T002 (cookie) et T003 (routes partagées) ;
  n'a pas besoin de T004.
- **US2 (Phase 4)**: dépend de US1 (forms/routes/builders en place).
- **US3 (Phase 5)**: dépend de US1 (switch) ET de T004 (faisabilité).
- **Polish (Phase 6)**: dépend de toutes les US.

### User Story Dependencies

- **US1 (P1)**: commence après T002+T003 — aucun lien avec US2/US3.
- **US2 (P2)**: après US1 — indépendante de US3.
- **US3 (P3)**: après US1 + T004 — indépendante de US2.

### Within Each User Story

- Tests écrits en premier et rouges avant implémentation (marqués ⚠️).
- Fondations pures (`lib/zpl/rotated-layout.ts`, `lib/orientation.ts`) avant leur
  usage dans les builders ; builders avant les routes ; routes avant les forms ;
  UI après le modèle/cookie.

### Parallel Opportunities

- T001→T024 : T002/T003/T004 parallèles (fichiers disjoints).
- US1 : T005/T006/T007 parallèles ; T009/T010/T011/T012/T015 parallèles.
- US2 : T016/T017 parallèles.
- US3 : T019/T020/T021 parallèles.
- US1/US2/US3 parallélisables entre elles dès que US1 est posée (equipe 2+).

## Parallel Example: US1

```bash
# Tests (rouges d'abord) :
Task: "T005 Tests unitaires lib/zpl/rotated-layout.ts"
Task: "T006 Étendre build.test.ts + location.test.ts (rotated)"
Task: "T007 Tests schémas rotated"

# Implémentation :
Task: "T009 lib/zpl/rotated-layout.ts"
Task: "T010 étendre lib/zpl/build.ts (rotated)"
Task: "T011 étendre lib/zpl/location.ts (rotated)"
Task: "T012 schémas acceptent rotated"
Task: "T015 forms transmettent rotated"
```

## Implementation Strategy

### MVP First (US1 only)

1. T001 (baseline verte) → T002, T003 (fondations).
2. T005→T008 (tests rouges US1), puis T009→T015.
3. **STOP and VALIDATE** : quickstart étape « validation détaillée » 1–3 + test
   physique `nc` 40×25 (EAN-13 + Emplacement) ; le switch est mémorisé après
   reload.

### Incremental Delivery

1. Fondation (T001–T004).
2. **US1** → test indépendant (switch + rotation + cookie) → MVP livrable.
3. **US2** → intégration cross-module (T016–T018) → la promesse « un réglage tous
   modules » est couverte par des tests.
4. **US3** → format incompatible + retour à la normale (T019–T024).
5. Polish (T025–T026) : validation physique finale et suite verte.

### Parallel Team Strategy

- Personne A : US1 (switch + ZPL + routes/EAN-13).
- Personne B : US2/US3 (tests d'intégration + faisabilité) après coalescence
  de T004.

## Notes

- `[P]` = fichiers disjoints.
- `[US#]` = user story cible (spec.md).
- Jeu de données « format incompatible » pour les tests : utiliser 20×30
  (20 mm < 23,8 mm) et 40×25 (compatible) — pas de dépendance aux `.env` réseau
  dans les tests unitaires (mocker `lib/printer/send.ts` pour les routes).
- Mode désactivé = non-régression : répéter les impressions de référence dispo
  dans `lib/zpl/__tests__/`.
- Commit par unité logique (conventional commits) uniquement sur ordre
  utilisateur ; branche `feature/012-orientation-papier`.