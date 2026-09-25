---

description: "Task list for feature 009: module Emplacement — code-barres Code 128"

---

# Tasks: Module Emplacement — code-barres Code 128

**Input**: Design documents from `/specs/009-module-emplacement/`
(plan.md, spec.md, research.md, data-model.md, contracts/api.md,
contracts/zpl.md, contracts/ui.md, quickstart.md)

**Prerequisites**: plan.md (required), spec.md (required), research.md,
data-model.md, contracts/

**Tests**: OBLIGATOIRES — la constitution (V. Tests obligatoires, coverage
> 80 %) impose un test par comportement. Tests écrits en premier (RED) puis
implémentés (GREEN). Tests au même niveau que le code source.

**Organization**: Tasks groupées par user story (US1→US4) ; fondations
partagées (Switch, validation, ZPL, API) dans la Phase 2 car elles bloquent
les 4 stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3 / US4
- Include exact file paths in descriptions

## Path Conventions

- **Single project Next.js (repo racine)**: `lib/location/` (validation
  partagée), `lib/zpl/` (layout + Code 128), `app/api/print/location/` (API),
  `components/` (formulaire + dialog), `app/emplacement/` (page), kit UI
  `components/ui/`
- Jeu de commandes de référence : pour chaque test,
      `npx vitest run <fichier de test>` ; suite complète : `npx vitest run` ;
  gate : `npm run lint`, `npx tsc --noEmit`, `npm run build` ;
  coverage : `npx vitest run --coverage`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verte avant toute modification (175 tests).

- [X] T001 Run the full baseline green : `npx vitest run` (attendu : suite
      complète verte, 175 tests), `npm run lint` (0 warning),
      `npx tsc --noEmit` (0 erreur), `npm run build` (vert) — avant toute
      modification (constitution : suite verte avant livraison)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastructures partagées bloquant les 4 stories — composant
Switch (confort UI), édition/validation de la nomenclature et expansion de
plage (`lib/location/`), extraction du layout partagé + builder Code 128
(`lib/zpl/`), route d'impression (`app/api/print/location/route.ts`).

**⚠️ CRITICAL**: `buildEan13Zpl` doit produire la **sortie strictement
identique** après extraction du layout dans `lib/zpl/layout.ts` (FR-013,
SC-006 — les 35 tests de `lib/zpl/__tests__/build.test.ts` sont le filet).

**Checkpoint**: Validation + ZPL Code 128 + API prêtes — les 4 stories peuvent
démarrer.

- [X] T002 [P] Créer le composant Switch du kit UI :
      `components/ui/switch.tsx` (shadcn/Base UI `@base-ui/react` 1.8 déjà
      installé, style de       `components/ui/select.tsx` : `cva` + `cn` + `forwardRef`) — props
      minimales (`checked`, `onCheckedChange`, `disabled?`, `aria-*`), rôle `"switch"`, aucune dépendance nouvelle
      (KISS/YAGNI)
- [X] T003 [P] RED : écrire les tests de validation et d'expansion de plage
      dans `lib/location/__tests__/validate.test.ts` — contraintes citées du
      `data-model.md` :
      - nomenclature combinée (FR-005, « exactement 4 caractères ») :
        `'^[12](([A-Z][1-9A-Z])|(#D))[0-9A-Z]$'` — accepter `1A5B`, `2B9C`,
        `1#D7`, `1A90` (0 final autorisé) ; rejeter code vide, `X1` (trop
        court), `1a5b` (minuscules), `0A12`/`3B25` (premier hors 1/2),
        `1A05` (0 en 2ᵉ position du groupe lettre), espace/symboles hors `#` ;
      - type × code (FR-006) : classique `'^[12][A-Z][1-9A-Z][0-9A-Z]$'`,
        dynamique `'^[12]#D[0-9A-Z]$'` — un code `#D` est refusé en mode
        Classique et un code lettre-groupe refusé en mode Dynamique ; message
        orientant vers le bon type ;
      - plage (FR-006) : même type et « même préfixe (3 premiers caractères
        identiques) », début ≤ fin dans l'ordre `ORDRE_LAST =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"`, taille ≤ 1000 ;
      - expansion pure : `1A10` → `1A1B` génère exactement 12 codes
        (`1A10…1A1B`) ; `1A19` → `1A1B` traverse `1A1A` ; rejets : `1A15` →
        `1A10` (inversé), `1A19` → `1A21` (préfixe `1A1` ≠ `1A2`),
        `1A10` → `1B10` (préfixes différents), `1A10` → `1#D5` (types
        différents), taille > 1000. Run
        `npx vitest run lib/location/__tests__/validate.test.ts` → **ROUGE**
- [X] T004 GREEN : implémenter `lib/location/code.ts` (constantes : regex de
      la nomenclature et par type, `ORDRE_LAST`, `MAX_RANGE_SIZE = 1000`) puis
      `lib/location/validate.ts` (schéma Zod shared client/serveur — union
      discriminée `mode` : single `{code, quantity 1…1000}` / range
      `{startCode, endCode}` + `expandRange` pure). Run le test T003 → **VERT**
- [X] T005 [P] RED : écrire les tests de layout Code 128 dans
      `lib/zpl/__tests__/location.test.ts` — flux `^BC` (`^XA`/`^XZ`,
      `^PW{width}^LL{height}`, `^LH0,0`, `^BY{module},3,{barHeight}`,
      `^FO{x},{y}^BCN,{barHeight},Y,N,N`, `^FD` = 4 caractères du code) ;
      valeurs EXACTES du `contracts/zpl.md` (module/X-plafond 2..8,
      `SYMBOL_MODULES = 11×4+35 = 79`, `TOTAL_MODULES = 99`, plancher barres
      51 dots, `TEXT_HEIGHT_DOTS = 25`, couverture 0.9) — `40x25`→
      `^BY3,3,155`/`^FO42,10`, `75x25`→`^BY6,3,155`/`^FO63,10`,
      `100x50`→`^BY8,3,335`/`^FO84,20`, `100x150`→`^BY8,3,1055`/`^FO84,60` ;
      invariants par format : zones de silence `x ≥ 10 × module` ET
      `widthDots − x − barsWidth ≥ 10 × module`, `x + barsWidth ≤ widthDots`,
      `blockHeight / heightDots = 0.9`, `barHeight ≥ 51`, clamp module (320 →
      3, 600 → 6, 800 → 8, très large → 8) ; **single** : `^PQ{quantity}` ;
      **range** : un bloc `^XA…^XZ` par code (pas de `^PQ`). Run → **ROUGE**
- [X] T006 GREEN : extraire les calculs partagés dans `lib/zpl/layout.ts`
      (clamp, module, position x, bloc/hauteur/marge verticale) et
      refactorer `lib/zpl/build.ts` pour les utiliser **avec les constantes
      EAN-13 inchangées** (sortie `buildEan13Zpl` strictement identique —
      FR-013) ; créer `lib/zpl/location.ts` (`buildLocationZpl({ codes,
      quantity?, widthDots, heightDots })`, Code 128 : `SYMBOL_MODULES`,
      `TOTAL_MODULES`, bornes 2..8, plancher 51). Run `location.test.ts`
      (T005) **VERT** + `lib/zpl/__tests__/build.test.ts` **toujours VERT**
      (non-régression du layout EAN-13)
- [X] T007 [P] RED : écrire les tests d'intégration dans
      `app/api/print/location/__tests__/route.test.ts` (pattern
      `app/api/print/ean13/__tests__/route.test.ts`, supertest) — `200`
      `{status:"sent", labels}` (single : labels = `quantity` ; range :
      labels = taille de plage), `422` par classe (code/type incohérent, plage
      inversée, préfixes/types différents, taille > 1000, quantité hors
      1…1000), `409` `PRINT_IN_PROGRESS` (garde anticoncurrence), `503`
      `PRINTER_UNAVAILABLE` (mock `sendToPrinter`) ; vérifier que
      `sendToPrinter` n'est **jamais** appelé sur 422. Run → **ROUGE**
- [X] T008 GREEN : implémenter `app/api/print/location/route.ts` (POST ;
      `safeParse` du schéma partagé T004 ; en mode range `expandRange` puis
      `buildLocationZpl({ codes })` ; en mode single `buildLocationZpl({
      codes:[code], quantity })` ; `resolveDimensions(paperId)` de
      `lib/paper-sizes.ts` ; `sendToPrinter(zpl, target)` de
      `lib/printer/send.ts` ; réutilisation de la garde anticoncurrence).
      Run test T007 → **VERT**

**Checkpoint**: Fondations prêtes — validation, ZPL Code 128 et API
d'impression opérationnelles ; les stories peuvent démarrer en parallèle.

---

## Phase 3: User Story 1 - Imprimer le code-barres d'un seul emplacement (Priority: P1) 🎯 MVP

**Goal**: Le module **Emplacement** apparaît dans la navigation et permet
d'imprimer un **code-barres Code 128** pour un emplacement unique : choix du
type (Classique / Dynamique `#D`) par interrupteur, saisie du code + quantité,
ligne lisible sous les barres, centrage et pleine échelle (FR-001 → FR-005,
FR-008 → FR-012).

**Independent Test**: `npx vitest run components/__tests__/location-form.test.tsx`
(parcours single) ; manuel : imprimer `2A1Z` en Classique puis `1#D7` en
Dynamique sur un format quelconque, scanner : chaque code = emplacement saisi
(US1.Sc).

### Tests for User Story 1 (à écrire EN PREMIER, RED) ⚠️

- [X] T009 [US1] Mettre à jour `lib/modules/registry.ts` (ajouter le module
      `{ id: "location", name: "Emplacement", description: "Imprimer des
      étiquettes à code-barres Code 128 (classique ou #D)", href:
      "/emplacement" }` — FR-001) **et** adapter
      `lib/modules/__tests__/registry.test.ts` (attendu : longueur 2, `ean13`
      inchangé en tête, module `location` présent avec ses métadonnées, les
      cas `registerLabelModule` dupliqué préservés). Run le test → **VERT**

### Implementation for User Story 1

- [X] T010 [US1] Créer la page `app/emplacement/page.tsx` (miroir de
      `app/ean13/page.tsx` : `<main>`, titre « Étiquette Emplacement »,
      description, `<LocationForm />`, lien « ← Retour »)
- [X] T011 [P] [US1] RED : écrire les tests du formulaire single dans
      `components/__tests__/location-form.test.tsx` (Testing Library, pattern
      `ean13-form.test.tsx`) — état par défaut (mode Un seul, type Classique,
      quantité `"1"`) ; le Switch type bascule Classique/Dynamique ; soumission
      `fetch("/api/print/location", {method, headers, body})` avec
      `{mode:"single", locationType, code, quantity}` + `paperId`/
      `printerAddress` issus de `readPrintSettings` quand présents ; refus
      client avant fetch sur code invalide ; quantité > 2 → `AlertDialog`
      (composant `LocationConfirmDialog`) puis envoi après confirmation ;
      toasts succès/503/réseau (convention `ean13-form.tsx`). Run → **ROUGE**
- [X] T012 [US1] GREEN : implémenter `components/location-form.tsx`
      ("use client" ; Switch mode + Switch type de `components/ui/switch.tsx` ;
      champs code + quantité ; validation via le schéma partagé T004 ;
      `submitPrint` vers `/api/print/location` ; états `isConfirming`/
      `isSending`) **et** `components/location-confirm-dialog.tsx` (props
      `open`, `onOpenChange`, `count`, `onConfirm` — miroir de
      `ean13-confirm-dialog.tsx`). Run test T011 → **VERT**

**Checkpoint**: L'US1 est fonctionnelle et vérifiable seule (navigation +
impression single + type #D).

---

## Phase 4: User Story 2 - Imprimer une plage d'emplacements (Priority: P1)

**Goal**: basculer le mode par interrupteur, saisir début/fin de même type,
imprimer **une étiquette par emplacement** (codes distincts), confirmation
volume > 2, quantité masquée en mode plage (FR-004, FR-006, FR-008, FR-011).

**Independent Test**: manuel : plage `1A10` → `1A12` en Classique → exactement
3 étiquettes (`1A10`, `1A11`, `1A12`), chacune scannable avec son propre code
(US2.Sc) ; test `npx vitest run components/__tests__/location-form.test.tsx`.

### Tests for User Story 2 (à écrire EN PREMIER, RED) ⚠️

- [X] T013 [P] [US2] RED : étendre `components/__tests__/location-form.test.tsx`
      au mode Plage — le Switch mode Un seul/Plage masque la quantité et
      affiche `startCode`/`endCode` ; soumission
      `{mode:"range", locationType, startCode, endCode}` + `paperId`/
      `printerAddress` ; plage > 2 → `LocationConfirmDialog` puis envoi ;
      plages invalides (début > fin, préfixes/types différents, taille > 1000)
      → message d'erreur et **aucun** fetch ; toast succès « mentionnant le
      nombre d'étiquettes de la plage ». Run → **ROUGE**

### Implementation for User Story 2

- [X] T014 [US2] GREEN : étendre `components/location-form.tsx` — champs
      conditionnels (taille plage affichée en informatif quand mode Plage),
      gestion `mode` dans le schéma partagé, soumission range. Run test T013 →
      **VERT**
- [X] T015 [US2] Non-régression plage de bout en bout : `npx vitest run`
      (suite complète ; cas range route T007 + UI T013 inclus) + contrôle
      manuel du scénario `1A10` → `1A12` (3 étiquettes distinctes, ordre
      croissant) via quickstart.md (étape 5) si imprimante disponible

**Checkpoint**: US1 ET US2 fonctionnent indépendamment (les 2 modes).

---

## Phase 5: User Story 3 - Rejet des emplacements non conformes (Priority: P2)

**Goal**: aucun code/plage non conforme ne doit produire d'étiquette ni de
requête vers l'imprimante ; message d'erreur clair, orientant vers le bon type
(FR-007, SC-002). Matrice complète des edge cases de la spec à verrouiller
côté UI **et** côté serveur.

**Independent Test**: `npx vitest run components/__tests__/location-form.test.tsx
app/api/print/location/__tests__/route.test.ts` — chaque edge case de la
matrice produit un refus sans appel d'impression (US3.Sc).

### Tests for User Story 3 (RED) ⚠️

- [X] T016 [P] [US3] RED : compléter la matrice de refus dans
      `app/api/print/location/__tests__/route.test.ts` **et**
      `components/__tests__/location-form.test.tsx` — citer les edge cases de
      la spec : code vide ; longueur ≠ 4 (`X1`, `1A5BC`) ; premier caractère
      hors `1`/`2` (`0A12`, `3B25`) ; minuscules/accents/espaces/symboles hors
      `#` ; `0` interdit en 2ᵉ position du groupe lettre (`1A05`) ; `#D` saisi
      en mode Classique (message « orientant vers le bon type ») ; lettre-
      groupe en mode Dynamique ; plage début > fin (`1A15` → `1A10`) ; plage
      entre préfixes/types différents (`1A10` → `1B10`, `1A10` → `1#D5`) ;
      plage > 1000. Pour chaque cas : **aucun** appel à `sendToPrinter`
      (serveur) / **aucun** `fetch` (client). Run → **ROUGE** (cas manquants)

### Implementation for User Story 3

- [X] T017 [US3] GREEN : ajuster les messages de refus dans
      `lib/location/validate.ts` (Zod `refine`/messages — « code requis »,
      « format attendu : 4 caractères », « emplacement #D : utiliser le type
      Dynamique », « plage : même préfixe requis », « plage : début après
      fin », « taille de plage > 1000 ») pour que la matrice T016 passe sans
      qu'aucune route d'impression ne soit atteinte. Run T016 → **VERT**

**Checkpoint**: Rejet garanti à 100 % (SC-002), UI et serveur.

---

## Phase 6: User Story 4 - Réglages partagés et confort de saisie (Priority: P3)

**Goal**: réutilisation des réglages papier/imprimante (features 006/007),
confirmation grande quantité du module EAN-13, quantité masquée en mode Plage,
0 réglage spécifique au module (FR-012, SC-006).

**Independent Test**: changer le format de papier dans les Paramètres puis
imprimer une plage → étiquettes au nouveau format, envoi vers l'imprimante
sélectionnée (US4.Sc).

### Tests for User Story 4 (RED) ⚠️

- [X] T018 [P] [US4] RED : étendre `components/__tests__/location-form.test.tsx`
      (les deux modes) et `app/api/print/location/__tests__/route.test.ts`
      pour verrouiller le **passthrough** des réglages : le corps envoyé inclut
      `paperId` et `printerAddress` de `readPrintSettings()` quand présents ;
      `resolveDimensions` reçoit le `paperId` de la requête (mock) ;
      `sendToPrinter` reçoit `target = printerAddress` ; en mode Plage le champ
      quantité est absent du formulaire (FR-011) et du corps de requête ; seuil
      de confirmation identique au module EAN-13 (quantité > 2 en single,
      taille de plage > 2 en range). Run → **ROUGE** (cas manquants)

### Implementation for User Story 4

- [X] T019 [US4] GREEN : compléter le passthrough dans
      `components/location-form.tsx` (body des deux modes) et confirmer que
      `app/api/print/location/route.ts` résout `resolveDimensions`/
      `sendToPrinter` exactement comme la route EAN-13. Run T018 → **VERT**
- [X] T020 [US4] Non-régression réglages : `npx vitest run` — inclure
      `components/__tests__/settings-footer.test.tsx` et les tests cookie ;
      vérifier qu'**aucun** réglage spécifique au module n'a été ajouté
      (aucun changement dans `.env`, `lib/print-settings-cookie.ts`,
      `lib/printer/`, `lib/paper-sizes.ts`)

**Checkpoint**: Les 4 stories sont fonctionnelles et indépendamment testées.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: documentation, gate final, validation quickstart.

- [X] T021 [P] Documentation : contrôler la cohérence
      `specs/009-module-emplacement/contracts/*` (api/zpl/ui) et
      `data-model.md`/`research.md` avec l'implémentation finale ; mettre à
      jour `README.md` si la liste des modules y figure (mention du module
      Emplacement) ; relire `specs/001-module-ean13/contracts/zpl.md` —
      **aucune** supersession des valeurs EAN-13 n'est attendue (feature
      additive, SC-006) ; documenter d'éventuels écarts soulevés par les tests
- [X] T022 Run the full gate : `npx vitest run` (suite complète, coverage
      > 80 %), `npm run lint` (0 warning), `npx tsc --noEmit` (0 erreur),
      `npm run build` (vert)
- [X] T023 [P] Run quickstart.md (feature 009) : confronter les valeurs
      des tests au tableau « Valeurs générées par format » de
      `contracts/zpl.md` ; si imprimante connectée, impression réelle —
      contrôle visuel (centrage, marges 10 modules, ligne lisible) + scan
      Code 128 (codes distincts en plage, ordre `0-9 → A-Z`) ; consigner les
      résultats en fin de ce fichier (section « Bilan de validation »)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 baseline verte d'abord
- **Foundational (Phase 2)**: Depends on Setup — ferme le checkpoint
  (validation + ZPL Code 128 + route) qui **bloque** les 4 stories
- **User Story 1 (Phase 3)**: Depends on Foundational only — n'a pas de
  dépendance sur US2/US3/US4
- **User Story 2 (Phase 4)**: Depends on Foundational only — pas de
  dépendance sur US1 (fichiers `location-form.tsx`/`location-confirm-dialog.tsx`
  partagés ; en cas de parallélisation stricte, merger après US1)
- **User Story 3 (Phase 5)**: Depends on Foundational ; utilise l'UI des
  US1/US2 pour la matrice client — séquentiel après US1/US2 dans ce repo mono-
  piste
- **User Story 4 (Phase 6)**: Depends on US1/US2/US3 (passthrough réglages
  testé sur les deux modes)
- **Polish (Phase 7)**: Depends on toutes les stories

### User Story Dependencies

- **US1 (P1)**: T009 → T010 → (T011 RED) → (T012 GREEN) — séquence stricte,
  mêmes fichiers UI
- **US2 (P1)**: T013 RED → T014 GREEN → T015 — dépend du formulaire de l'US1
  (mode Plage dans le même composant)
- **US3 (P2)**: T016 RED → T017 GREEN — s'appuie sur `lib/location/validate.ts`
  (fondations) et l'UI des US1/US2
- **US4 (P3)**: T018 RED → T019 GREEN → T020 — s'appuie sur les deux modes
  (US1/US2)

### Within Each User Story

- Tests (RED) écrits et échouant AVANT l'implémentation (constitution V)
- Fonctions pures (validation, expansion, build ZPL) avant l'UI/la route
- Implémentation minimale puis non-régression avant le checkpoint

### Parallel Opportunities

- **Foundational** : T002, T003, T005, T007 [P] — fichiers disjoints ; T004
  (devient VERT sur T003), T006 (sur T005), T008 (sur T007)
- **US1** : T011 RED [P] indépendant de T009/T010 (fichiers différents)
- **US2** : T013 RED [P] peut s'écrire dès que US1 RED est posé
- **US3** : T016 [P] s'appuie sur la matrice serveur (T007/T008)
- **US4** : T018 [P] s'appuie sur les deux modes
- **Polish** : T021 et T023 [P] entre elles après l'implémentation ;
      T022 (gate final) en dernier

---

## Parallel Example

```bash
# Piste A — Fondations (4 fichiers disjoints, [P]) :
Task: "T002 créer components/ui/switch.tsx"
Task: "T003 RED tests lib/location/__tests__/validate.test.ts"
Task: "T005 RED tests lib/zpl/__tests__/location.test.ts"
Task: "T007 RED tests app/api/print/location/__tests__/route.test.ts"
# puis GREEN : T004 → T006 → T008 (séquentiels, dépendent des RED)

# Piste B — US1 (après fondations) :
Task: "T009 registry + test (lib/modules/)"
Task: "T010 page app/emplacement/page.tsx"
Task: "T011 RED tests components/__tests__/location-form.test.tsx (single)"
Task: "T012 GREEN components/location-form.tsx + location-confirm-dialog.tsx"

# Piste C — US2/US3/US4 (après US1, mêmes fichiers formulaire → séquentiel) :
Task: "T013 RED tests range → T014 GREEN extension location-form / T015 non-régression"
Task: "T016 RED matrice refus → T017 GREEN messages validate.ts"
Task: "T018 RED passthrough réglages → T019 GREEN location-form/route / T020"
```

---

## Implementation Strategy

### MVP First (User Story 1 — le cœur du module)

1. T001 baseline verte → T002 Switch
2. Fondations : validation (T003/T004), ZPL Code 128 (T005/T006), route
   (T007/T008) — checkpoint bloquant
3. US1 : T009 registry → T010 page → T011 RED → T012 GREEN — **livrable MVP**
   (navigation + impression single + type Dynamique `#D`)
4. **STOP and VALIDATE** : `npx vitest run components/__tests__/location-form.test.tsx`
   + impression réelle (classique + #D) si imprimante

### Incremental Delivery

1. Setup + fondations → base fonctionnelle (validation, ZPL, API)
2. US1 → MVP livrable et testable seul
3. US2 (plage) → incrément P1
4. US3 (rejet) → durcissement au même niveau
5. US4 (réglages) → conformité transverse
6. Polish (docs, gate, quickstart) → livraison

### Parallel Team Strategy

- Développeur A : fondations (T002→T008) → US1 (T009→T012) → US2 (T013→T015)
- Développeur B (le cas échéant) : US3 (T016/T017) après fondations — fichiers
  `lib/location/validate.ts` + matrice tests ; attend l'UI pour la partie
  client-only (matrice UI côté T016 client)
- Développeur C (le cas échéant) : US4 (T018→T020) — fichiers formulaire/
  route partagés ; séquentiel après US1/US2 dans ce repo mono-piste

---

## Notes

- [P] tasks = different files, no dependencies ; en interne de story les
  tâches sont séquentielles (mêmes fichiers)
- Le composant Switch vit dans `components/ui/switch.tsx` (kit existant
  `select.tsx`/`button.tsx`) — seule addition au kit UI (YAGNI)
- La validation Zod est la **source de vérité unique** client + serveur (DRY) :
  `lib/location/validate.ts` importé par le formulaire **et** la route
- `buildLocationZpl` est une fonction pure : aucun I/O, aucun secret, les
  entrées passent la validation Zod avant tout envoi (sécurité constitution)
- Constitution : tests obligatoires (coverage > 80 %) — pattern RED → GREEN
  partout ; suite complète verte avant livraison
- Branche dédiée `feature/009-module-emplacement` ; commit/push exige
  l'ordre explicite de l'utilisateur (jamais sans)
- Risque d'étalonnage (research.md) : `MIN_BAR_HEIGHT_DOTS = 51` et
  `TEXT_HEIGHT_DOTS = 25` pourraient être ajustés d'un ou deux dots au premier
  rendu réel — changement localisé dans `lib/zpl/location.ts`, sans effet sur
  le centrage (symétrique) ni sur EAN-13

## Bilan de validation

**Valeurs « générées par format » (quickstart, étape confrontée aux tests)**
— vérifié automatiquement par `lib/zpl/__tests__/location.test.ts` (tableau
FORMATS, 15 assertions) :

| Format (mm) | module | barres (dots) | x | barHeight | y | blockHeight | couverture |
|-------------|--------|---------------|----|----|--------|----|------------|
| 40x25       | 3      | 237           | 42 | 155      | 10 | 180         | 90 %       |
| 75x25       | 6      | 474           | 63 | 155      | 10 | 180         | 90 %       |
| 100x50      | 8      | 632           | 84 | 335      | 20 | 360         | 90 %       |
| 100x150     | 8      | 632           | 84 | 1055     | 60 | 1080        | 90 %       |

Invariants verrouillés : zones de silence ≥ 10 modules/côté, `x + barsWidth ≤
widthDots`, `blockHeight/heightDots = 0.9`, `barHeight ≥ 51`, clamp module
2..8. Flux `^BCN,h,Y,N,N` sans rotation, `^PQ` en single uniquement.

**Impression réelle / scan : non réalisé** — aucune imprimante connectée.
Validation physique (centrage visuel, marges 10 modules, scannabilité ligne
lisible + codes distincts en plage, ordre `0-9 → A-Z`) **en attente**, à faire
via quickstart.md étape 5. Risque d'étalonnage résiduel documenté dans
`research.md` (`MIN_BAR_HEIGHT_DOTS = 51`, `TEXT_HEIGHT_DOTS = 25`), ajustable
uniquement dans `lib/zpl/location.ts` sans effet EAN-13 (REF tested).

## Évolution post-009 — calcul de plage en « boîte » (feature 010)

Le calcul des codes d'une plage a été étendu (feature 010) : la plage ne varie
plus **uniquement** sur le dernier caractère, elle génère la **boîte** bornée
par ses extrêmes (espace `A-Z`, position `1-9` puis `A-Z`, sous-position
`0-9` puis `A-Z`), le tout appliqué aussi au mode Plage unique de 009. Les
règles citées plus haut (« même préfixe (3 premiers caractères) ») sont
**remplacées** par : même zone (`1`/`2`), ordre par axe, taille = produit des
écarts + 1 ≤ 1000. « `1A10` → `1B10` » est désormais **valide** (2 codes) ;
« `1A19` → `1A21` » reste refusé (sous-position `9` > `1`). Détails :
`specs/010-multi-range-print/` (§ data-model, spec edge cases) et addendum
T004/T005/T011 de son tasks.md.