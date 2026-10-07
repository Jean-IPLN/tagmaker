---

description: "Task list template for feature implementation"
---

# Tasks: Correction d'UX — blocage d'impression et saisie du code emplacement

**Input**: Design documents from `/specs/013-fix-print-guard-location-input/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: **Inclus** — la constitution V (« Tests obligatoires (NON-NÉGOCIABLE) », couverture > 80 %) et [research.md](./research.md) § R6 (stratégie de tests) les exigent pour cette feature. Les tâches de tests sont placées **avant** l'implémentation de leur story (écrire les tests, les voir échouer, puis implémenter).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Structure web app existante (Next.js unique) issue de plan.md :
`components/`, `lib/`, `app/api/`, tests **au même niveau** que le code
(`components/__tests__/`, `lib/location/__tests__/`). `app/api/print/*` est
**hors périmètre** (contrat API conservé, research R1).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Préalables procéduraux (branche dédiée, aucune initialisation de projet nécessaire — projet existant)

- [X] T001 Créer et basculer sur la branche dédiée `feature/013-fix-print-guard-location-input` depuis `master` (`git checkout -b feature/013-fix-print-guard-location-input`) — obligation constitution « Développement & Qualité » (jamais de code sur `master`), aucun commit sans ordre explicite

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Baseline verte à établir avant toute modification — gate commun aux deux user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Note**: aucune infrastructure transverse supplémentaire n'existe entre US1 et US2 (décisions research R1 et R2 : garde-fou client autonome, helpers de code localisés à US2) — cette phase se limite à la baseline.

- [X] T002 Établir la baseline verte avant toute modification : exécuter `npm test`, `npm run lint` et `npx tsc --noEmit` depuis la racine et vérifier que la suite complète est verte (~360 tests, 0 warning linter, 0 erreur TypeScript) — gate constitution V commun à US1 et US2

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - L'impression est bloquée sans imprimante sélectionnée (Priority: P1) 🎯 MVP

**Goal**: Aucune impression (EAN-13 et Emplacement, simple et plage, direct et après confirmation) sans imprimante sélectionnée ; toast littéral à chaque tentative bloquée ; flux inchangé dès qu'une imprimante est choisie.

**Independent Test**: Sans cookie d'imprimante : cliquer Imprimer dans EAN-13 (quantité 1, puis quantité 5 avec confirmation) et Emplacement (mode simple, puis mode plage) → à chaque fois le toast `Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.` s'affiche et `fetch` n'est jamais appelé ; avec `printerAddress` dans le cookie → envoi normal (non-régression). Scénario négatif croisé : saisie invalide + aucune imprimante → message de validation prioritaire, pas le toast d'imprimante.

### Tests for User Story 1 (écrits AVANT l'implémentation — doivent échouer d'abord) ⚠️

- [X] T003 [P] [US1] Ajouter les tests de garde-fou EAN-13 dans `components/__tests__/ean13-form.test.tsx` : sans cookie `tagmaker_print_settings`, clic Imprimer quantité 1 → `toast.error` avec le message littéral « Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres. » **et** `fetch` non appelé ; quantité 5 → boîte de confirmation ouverte, puis à la confirmation même toast et `fetch` non appelé ; avec `printerAddress` dans le cookie → `fetch POST /api/print/ean13` émis (non-régression) ; saisie invalide + aucune imprimante → message de validation, pas le toast d'imprimante (mock `sonner` selon le motif du fichier existant)
- [X] T004 [P] [US1] Ajouter les tests de garde-fou Emplacement dans `components/__tests__/location-form.test.tsx` : même matrice de scénarios pour le mode **Un seul** et le mode **Plage** (direct + confirmation), `fetch POST /api/print/location` jamais appelé sans imprimante, appelé avec imprimante ; préserver tous les tests existants du fichier

### Implementation for User Story 1

- [X] T005 [US1] Implémenter le garde-fou dans `submitPrint` de `components/ean13-form.tsx` : après `readPrintSettings()`, si `!settings.printerAddress` → `toast.error("Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.")` puis `return` **avant** `setIsSending(true)` et avant tout `fetch` ; aucun autre changement du flux (validations, confirmation, corps de requête inchangés) — dépend de T003
- [X] T006 [US1] Implémenter le garde-fou identique dans `submitPrint` de `components/location-form.tsx` (même condition, même message littéral, `return` avant `setIsSending(true)` et le `fetch POST /api/print/location`) — couvre les chemins simple, plage et confirmation puisque tous passent par `submitPrint` — dépend de T004

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - La frappe du code emplacement reste alignée sur chaque caractère (Priority: P1)

**Goal**: Représentation du code à **4 positions paddées** (espace = position vide), zone amorcée « 1 » (modifiable en « 2 »), frappe/effacement/collage sans aucun décalage, positions fixes `#`/`D` conservées en dynamique, compaction unique à la frontière de validation.

**Independent Test**: Module Emplacement type Classique : taper `5` en 2e position, `B` en 3e, `2` en 4e → segments affichent `1 5 B 2`, zone **restée `1`**, corps envoyé `15B2` ; changer la zone en `2` → positions 2-4 intactes ; effacer la position du milieu → aucun décalage ; coller `5B2` sur la 2e position → chaque caractère rejoint sa position ; type Dynamique → `#`/`D` verrouillés, seul le 4e caractère change ; mode Plage → changement de zone synchronise les deux bornes (FR-008).

### Tests for User Story 2 (écrits AVANT l'implémentation — doivent échouer d'abord) ⚠️

- [X] T007 [P] [US2] Créer `components/__tests__/location-code-input.test.tsx` avec les tests du contrat [contracts/location-code-input.md](./contracts/location-code-input.md) : normalisation à `value.length === 4`, défaut de zone « 1 », affichage position `" "` → champ vide (placeholder visible), sélecteur de zone `value = chars[0].trim() || null` avec options `1`/`2`, saisie en position 2 sans modification de la position 1 (FR-005), `Backspace` sans décalage, collage `5B2` distribué depuis la position cible avec assainissement `^[0-9A-Z#]$`, positions fixes `[1, 2]` (`#`/`D`) non éditables en dynamique, navigation clavier conservée (`aria-label` `${prefix} — 2e caractère` etc. inchangés)
- [X] T008 [P] [US2] Ajouter les tests de compaction dans `lib/location/__tests__/validate.test.ts` : entrée paddée `"1   "` → échec avec le message inchangé `/4 caractères/` ; `"1 5B"` (position vide) → échec `/4 caractères/` ; code complet `"15B2"` → validé et **sortie inchangée** (compactée = identique) ; `startCode`/`endCode` paddés du mode plage → même comportement ; message d'erreur « Le code emplacement doit contenir exactement 4 caractères : 1 ou 2, puis 'A-Z' + '1-9/A-Z' ou '#D', puis '0-9/A-Z' » conservé verbatim (tests existants du fichier doivent rester verts)
- [X] T009 [P] [US2] Ajouter/adapter les tests d'intégration dans `components/__tests__/location-form.test.tsx` : état initial du champ code = `"1   "` (zone amorcée « 1 », FR-004), saisie `5`,`B`,`2` → `fetch` avec corps `code: "15B2"` compact (jamais de `" "`), changement de zone `1`→`2` sur une borne de plage → l'autre borne suit (FR-008), édition d'un caractère de plage **ne** change **pas** la zone, préserver les tests US1 ajoutés dans ce même fichier (T004) et les tests existants — exécuter après T004 pour éviter le conflit de fichier

### Implementation for User Story 2

- [X] T010 [US2] Ajouter les helpers purs dans `lib/location/code.ts` : `LOCATION_CODE_LENGTH = 4`, `LOCATION_CODE_EMPTY_SLOT = " "` (invariants data-model : « l'état a `length === 4` à tout instant », « l'espace ne figure jamais dans un code compacté — hors `LOCATION_REGEX` »), `padLocationCode(value: string): string` (normalise en longueur 4 : tronque au-delà, complète par espaces en deçà) et `compactLocationCode(value: string): string` (`value.replace(/ /g, "")`, sans effet sur un code déjà complet) — dépend de T008
- [X] T011 [P] [US2] Transformer `locationCodeField` dans `lib/location/validate.ts` en point de compaction unique : `z.string(...)` → `.transform(compactLocationCode)` → `.pipe(z.string().regex(LOCATION_REGEX, <message inchangé>))` — le champ est déjà réutilisé par `code`, `startCode` et `endCode` (DRY : **un seul** point, research R2) ; les `superRefine` (orientation de type, `boxBounds`, expansion de plage) continuent de recevoir des codes compactés ; importer depuis `@/lib/location/code` — dépend de T010
- [X] T012 [P] [US2] Adapter `components/location-code-input.tsx` à la représentation paddée : normalisation défensive `value` → longueur 4 (invariant contrat), `chars` dérivés des 4 positions, affichage position `" "` → champ `Input` vide (placeholder conservé), sélecteur de zone `value = chars[0].trim() || null`, `updateChar` écrit `LOCATION_CODE_EMPTY_SLOT` pour une position vidée et **re-pad systématique** avant `onChange` (émission toujours paddée, longueur 4), forces fixes dynamiques `next[fix] = placeholders[fix]` conservées, `handleKeyDown` (Backspace/flèches) et `aria-label` inchangés — dépend de T010
- [X] T013 [US2] Ajouter le collage distribué dans `components/location-code-input.tsx` : gestionnaire `onPaste` sur les `Input` (positions 2-4) — `preventDefault`, texte du presse-papier passé en majuscules et assaini caractère par caractère (`CHAR_PATTERN` `^[0-9A-Z#]$`), répartition depuis la position cible vers les positions **éditables** suivantes en conservant les positions fixes (dynamique `#`/`D`), bornée aux 4 positions (aucun décalage résiduel, FR-005 + Edge Cases « collage »), un seul `onChange` paddé émis — dépend de T012 (même fichier)
- [X] T014 [US2] Adapter `components/location-form.tsx` : état initial `code` et bornes de plage `startCode`/`endCode` = `padLocationCode("1")` (soit `"1   "` — amorçage zone « 1 », FR-004) ; envoyer `parsed.data` (déjà compacté par T011) au lieu de reconstruire le corps depuis l'état : `handleSubmit` et `handleConfirm` appellent `submitPrint(parsed.data)` (les fonctions `buildSingleBody`/`buildRangeBody` restent les entrées de `safeParse`) ; conserver la priorisation des réglages (`spread` de `paperId`/`printerAddress`/`rotated` **après** `parsed.data`, comme aujourd'hui) ; `withZoneSync`/`resyncZone` **inchangés** (research R3) — dépend de T011 et T012

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Contrôles transverses de qualité et de conformité (constitution)

- [X] T015 Exécuter la validation automatisée complète depuis la racine : `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:coverage` — suite verte (y compris les tests de route `app/api/print/**` non modifiés), 0 warning, 0 erreur TypeScript, couverture > 80 % ; corriger toute régression dans les fichiers de la feature uniquement
- [X] T016 [P] Réaliser la validation manuelle du guide [quickstart.md](./quickstart.md) (`npm run dev`) : scénario V1 (blocage sans imprimante, 5 étapes dont le contrôle négatif croisé), V2 (non-régression avec imprimante, mémorisation après rechargement), V3 (alignement de frappe : défaut « 1 », effacement, collage, dynamique, plage) — chaque « Attendu » conforme
- [X] T017 [P] Revue de conformité constitution sur le diff : KISS/DRY/YAGNI (compaction en un seul point, garde-fou sur 2 occurrences seulement, aucune dépendance ajoutée), aucun TODO ni code commenté, tests au même niveau que le code, périmètre respecté (`app/api/print/*`, `lib/print-settings*` et `components/settings-footer.tsx` **inchangés**), lignes < 120 caractères, noms explicites — dépend de T015

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Both depend on Foundational phase completion
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1, MVP)**: Peut démarrer dès la fin de Phase 2 — aucune dépendance sur US2
- **User Story 2 (P1)**: Indépendante de US1 en logique ; **conflit de fichiers à coordonner** : `components/location-form.tsx` (US1 T006 / US2 T014) et `components/__tests__/location-form.test.tsx` (US1 T004 / US2 T009) sont partagés → ordre recommandé **US1 complet avant US2**, ou attribution d'un seul développeur par fichier
- Ordre de priorité : les deux stories sont P1 ; MVP = US1 (phase 3)

### Within Each User Story

- Tests écrits et **échouant** avant l'implémentation de la story
- US1 : T003 ∥ T004 (tests) → T005 ∥ T006 (implémentation, fichiers distincts)
- US2 : T007 ∥ T008 ∥ T009 (tests) → T010 (helpers) → T011 ∥ T012 (fichiers distincts) → T013 (même fichier que T012) → T014 (formulaire)
- Story complète avant de passer à la suivante

### Parallel Opportunities

- Phase 1/2 : séquentielles (2 tâches)
- US1 : vagues parallèles `T003+T004` puis `T005+T006`
- US2 : vagues parallèles `T007+T008+T009` puis `T011+T012` ; `T010`, `T013`, `T014` séquentielles (dépendances ou même fichier)
- US1 ∥ US2 : partiellement possible (T003, T005 et les tâches T007-T008, T010-T013 de US2 touchent des fichiers disjoints) ; **exclure** T009 et T014 tant que T004/T006 ne sont pas terminés
- Polish : `T016 ∥ T017` après T015

---

## Parallel Example: User Story 1

```bash
# Wave 1 — tests (fichiers distincts, lancer ensemble) :
Task: "Tests de garde-fou EAN-13 dans components/__tests__/ean13-form.test.tsx"   # T003
Task: "Tests de garde-fou Emplacement dans components/__tests__/location-form.test.tsx"  # T004

# Wave 2 — implémentation (fichiers distincts, lancer ensemble) :
Task: "Garde-fou dans submitPrint de components/ean13-form.tsx"   # T005
Task: "Garde-fou dans submitPrint de components/location-form.tsx" # T006
```

## Parallel Example: User Story 2

```bash
# Wave 1 — tests (3 fichiers distincts) :
Task: "Tests composant components/__tests__/location-code-input.test.tsx"  # T007
Task: "Tests schéma lib/location/__tests__/validate.test.ts"               # T008
Task: "Tests formulaire components/__tests__/location-form.test.tsx"       # T009 (après T004)

# Wave 2 — après T010 (helpers) :
Task: "locationCodeField transform dans lib/location/validate.ts"          # T011 [P]
Task: "Représentation paddée dans components/location-code-input.tsx"      # T012 [P]

# Wave 3 — séquentiel (même fichier / dépendances) :
Task: "Collage onPaste dans components/location-code-input.tsx"            # T013
Task: "État « 1   » + parsed.data dans components/location-form.tsx"       # T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Compléter Phase 1: Setup (T001 — branche dédiée)
2. Compléter Phase 2: Foundational (T002 — baseline verte, CRITIQUE)
3. Compléter Phase 3: User Story 1 (tests T003-T004 puis impl T005-T006)
4. **STOP et VALIDER** : exécuter les critères indépendants d'US1 (quickstart V1 + V2) — le blocage sans imprimante fonctionne dans les deux modules, la non-régression avec imprimante est vérifiée
5. Démo possible à ce stade (correctif le plus critique livré seul)

### Incremental Delivery

1. Setup + Foundational → baseline prête
2. User Story 1 → testée indépendamment → démo (**MVP !**)
3. User Story 2 → testée indépendamment (quickstart V3) → démo
4. Polish (T015-T017) → validation complète + revue de conformité
5. Chaque story ajoute de la valeur sans casser la précédente (US1 reste verte après US2 : re-lancer `npm test`)

### Parallel Team Strategy

Avec plusieurs développeurs :

1. L'équipe réalise Setup + Foundational ensemble
2. Une fois Phase 2 terminée :
   - Développeur A : US1 complète (T003→T006)
   - Développeur B : US2 sur les fichiers disjoints (T007, T008, T010→T013), **en attente** de T004/T006 pour T009/T014
3. Les stories se terminent et s'intègrent indépendamment (fichiers partagés coordonnés)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Chaque user story est complétable et testable indépendamment
- Vérifier que les tests échouent avant l'implémentation (tests d'abord)
- Commit après chaque tâche ou groupe logique — **uniquement sur ordre explicite de l'utilisateur**
- S'arrêter à chaque checkpoint pour valider la story indépendamment
- Éviter : tâches vagues, conflits sur un même fichier, dépendances inter-stories qui cassent l'indépendance
- Message de toast **littéral** à respecter à l'identique (contrat) : `Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.`
- Périmètre interdit (non-régression) : `app/api/print/**`, `lib/print-settings*`, `components/settings-footer.tsx`
