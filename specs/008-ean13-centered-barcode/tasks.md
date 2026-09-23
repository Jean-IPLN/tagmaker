---

description: "Task list for feature 008: code-barres EAN-13 centré et pleine échelle"

---

# Tasks: Code-barres EAN-13 centré et pleine échelle

**Input**: Design documents from `/specs/008-ean13-centered-barcode/`
(plan.md, spec.md, research.md, data-model.md, contracts/zpl.md, quickstart.md)

**Prerequisites**: plan.md (required), spec.md (required), research.md,
data-model.md, contracts/zpl.md

**Tests**: OBLIGATOIRES — la constitution (V. Tests obligatoires, coverage
> 80 %) impose un test par comportement. Tests écrits en premier (RED) puis
implémentés (GREEN).

**Organization**: Feature mono-US (une seule user story) — chaque tâche est
traçable ; le layout est confiné à `lib/zpl/build.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1)
- Include exact file paths in descriptions

## Path Conventions

- **Single project Next.js (repo racine)**: `lib/zpl/build.ts` (construction
  du flux ZPL), `lib/zpl/__tests__/build.test.ts` (tests), `app/api/print/ean13/route.ts`
  (API — HORS PÉRIMÈTRE, lecture seule)
- Jeu de commandes de référence :
  `npx vitest run lib/zpl/__tests__/build.test.ts`, `npx vitest run` (suite),
  `npm run lint`, `npx tsc --noEmit`, `npm run build`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verte avant toute modification + capture de la référence
de l'ancien layout (cible des tests RED).

- [X] T001 Run the full baseline green: `npx vitest run`, `npm run lint`,
      `npx tsc --noEmit` (attendu : suite complète verte, 145 tests, 0
      warning) avant toute modification
- [X] T002 [P] Capture de la référence : relever dans `lib/zpl/build.ts` les
      valeurs actuellement câblées (`^BY2,3,120`, `^FO70,30^BEN,120,Y,N`) et
      confirmer le mapping formats → dots via `ZPL_PAPER_SIZES` (203 dpi =
      8 dots/mm) : `40x25` → 320×200, `75x25` → 600×200, `100x50` → 800×400,
      `100x150` → 800×1200. Ces valeurs servent de cible de contraste aux tests
      RED (T004/T005)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Aucune infrastructure nouvelle requise — la géométrie se calcule
dans `lib/zpl/build.ts` (fonction pure existante). Seul le **contrat
d'interface** doit être verrouillé pour garantir que le changement reste
confiné (FR-008, SC-006).

**⚠️ CRITICAL**: `buildEan13Zpl` doit garder sa signature ; si un autre appel
que `route.ts` existait, le périmètre changerait (vérifier AVANT toute US).

**Checkpoint**: Signature & appelants verrouillés (T003) + baseline verte
(T001) — l'US peut démarrer.

- [X] T003 [P] Vérifier le contrat d'interface : `buildEan13Zpl({ ean13,
      quantity, widthDots, heightDots })` (déclaré dans `lib/zpl/build.ts`) est
      appelé UNIQUEMENT par `app/api/print/ean13/route.ts` (`performPrint`,
      dimensions issues de `resolveDimensions`) — `grep` sur le repo ; autres
      fichiers (UI, tests existants) interdits d'appeler la fonction. **Ne rien
      modifier** — séquestre le confinement du changement à `lib/zpl/build.ts`
      (plan.md, Structure Decision). Marquage : consigner le résultat de la
      recherche

---

## Phase 3: User Story 1 - Code-barres centré et plein cadre sur l'étiquette (Priority: P1) 🎯 MVP

**Goal**: Le code-barres EAN-13 imprimé est **centré en largeur et en
hauteur** (barres + chiffres lisibles inclus) et **occupe au maximum l'espace
scannable** du format sélectionné (FR-001 → FR-008). Le module X, la position
`^FOx,y` et la hauteur des barres sont calculés au lieu d'être câblés.

**Independent Test**: `npx vitest run lib/zpl/__tests__/build.test.ts` — le
tableau paramétré des 4 formats produit exactement les flux attendus par
`contracts/zpl.md` (module X, `x`, `y`, `barHeight`, bloc couvert) et les
invariants (zones de silence, centrage, couverture ≥ 90 %, plafond GS1) sont
vérifiés.

### Tests for User Story 1 (à écrire EN PREMIER, RED) ⚠️

- [X] T004 [US1] RED : réécrire les attentes de layout dans
      `lib/zpl/__tests__/build.test.ts` sous forme de tableau paramétré `it.each`
      sur les 4 formats, avec les valeurs EXACTES du contrat
      (`specs/008-ean13-centered-barcode/contracts/zpl.md`) :
      `40x25`→`^BY2,3,165`/`^FO65,5`/`^BEN,165,Y,N`, `75x25`→`^BY5,3,165`/
      `^FO63,5`, `100x50`→`^BY5,3,365`/`^FO163,5`, `100x150`→`^BY5,3,1165`/
      `^FO163,5` ; conserver les assertions non-layout existantes (`^XA`/`^XZ`,
      `^PW320^LL200`, `^FD590123412345^FS` = 12 chiffres, `^PQ5`) ; ajouter
      l'assertion qu'aucune constante câblée ne subsiste. Run
      `npx vitest run lib/zpl/__tests__/build.test.ts` → **ROUGE** (l'ancien
      `^BY2,3,120` / `^FO70,30` ne correspond pas)
- [X] T005 [US1] RED : ajouter les tests d'invariants dans
      `lib/zpl/__tests__/build.test.ts` (données du tableau
      `data-model.md` — contraintes citées) :
      - zones de silence : marge latérale `x ≥ 11 × moduleWidth` ET
        `x ≥ 7 × moduleWidth` (QUIET_LEFT/QUIET_RIGHT) pour chaque format ;
      - largeur : `x + 95 × moduleWidth ≤ widthDots` (DATA_MODULES) ;
      - centrage vertical : `y + (barHeight + 25) + y = heightDots` (TEXT_HEIGHT_DOTS)
        → marges hautes/basses égales ;
      - couverture : `(barHeight + 25) / heightDots ≥ 0.9` (SC-003) ;
      - plancher : `barHeight ≥ 146` (MIN_BAR_HEIGHT_DOTS) ;
      - plafond module : pour 800 dots, module = 5 (MAX_MODULE_WIDTH = 5, le
        floor(800/113)=7 est clampé — SC-004 avant remplissage) et pour un
        label très large (ex. 10 000 dots) le module reste 5
      Run → **ROUGE** (module/positions non calculés actuellement)

### Implementation for User Story 1

- [X] T006 [US1] Implémenter le calcul du layout dans `lib/zpl/build.ts` :
      introduire les constantes (DATA_MODULES=95, QUIET_LEFT_MODULES=11,
      QUIET_RIGHT_MODULES=7, TOTAL_MODULES=113, MIN_MODULE_WIDTH=2,
      MAX_MODULE_WIDTH=5, TEXT_HEIGHT_DOTS=25, VERTICAL_MARGIN_DOTS=5,
      MIN_BAR_HEIGHT_DOTS=146) et les formules du `data-model.md` —
      `moduleWidth = clamp(floor(widthDots / 113), 2, 5)`, `barsWidth = 95 ×
      moduleWidth`, `x = round((widthDots − barsWidth) / 2)`,
      `barHeight = max(heightDots − 10 − 25, 146)`, `y = 5` ; générer
      `^BY{moduleWidth},3,{barHeight}`, `^FO{x},{y}^BEN,{barHeight},Y,N` ;
      **conserver inchangés** : `^XA`/`^XZ`, `^PW{widthDots}^LL{heightDots}`,
      `^LH0,0`, `dataDigits = ean13.slice(0, 12)` et `^FD{dataDigits}^FS`,
      `^PQ{quantity}`. Signature de `buildEan13Zpl` intacte. Run
      `npx vitest run lib/zpl/__tests__/build.test.ts` → **VERT** (T004 + T005)
- [X] T007 [US1] Non-régression (FR-008 / SC-006) : vérifier qu'`aucun` autre
      fichier n'a bougé — `npx vitest run` (suite complète, coverage > 80 %)
      + constater que `app/api/print/ean13/route.ts`, `lib/ean13/validate.ts`,
      `lib/paper-sizes.ts`, `lib/printer/send.ts` sont intacts (aucun diff si
      git suivi, sinon revue de contenu) ; le nombre d'étiquettes (`^PQ`),
      la validation code/quantité/imprimante et le choix du papier restent
      identiques

**Checkpoint**: À ce point, l'US1 est fonctionnelle et vérifiable seule :
chaque format produit un symbole centré, pleine échelle scannable, sans
régression sur validation, quantité et envoi.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, alignement des contrats, gate final et validation
quickstart.

- [X] T008 [P] Mettre à jour la doc : dans
      `specs/001-module-ean13/contracts/zpl.md`, marquer la section « Flux
      généré » et ses valeurs géométriques comme **supplantées** par le
      contrat `specs/008-ean13-centered-barcode/contracts/zpl.md` (référence
      croisée, pas de suppression du contexte historique) ; relire
      `research.md`, `data-model.md`, `quickstart.md`, `contracts/zpl.md`
      (008) avec l'implémentation finale — corriger tout écart éventuel ;
      mettre à jour `README.md` si une mention du rendu EAN-13 y figure
- [X] T009 Run the full gate : `npx vitest run` (suite complète, coverage
      > 80 %), `npm run lint` (0 warning), `npx tsc --noEmit` (0 erreur),
      `npm run build` (build vert)
- [X] T010 [P] Run quickstart.md (feature 008) : confronter les valeurs
      générées par les tests au tableau « Valeurs attendues par format »
      (module/x/y/hauteur/bloc) ; si imprimante connectée, impression réelle
      des 4 formats (contrôle visuel des marges égales + montée en échelle +
      scan OK) ; consigner les résultats en fin de ce fichier (section
      « Bilan de validation »)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 baseline verte d'abord
- **Foundational (Phase 2)**: Depends on Setup — clôturé par le checkpoint
  T003 (aucune infrastructure à bâtir)
- **User Story 1 (Phase 3)**: Dépend du checkpoint foundational ; bloque
  toutes les tâches de contenu
- **Polish (Phase 4)**: Dépend de T004→T007 (l'US1 complète)

### User Story Dependencies

- **US1 (P1)**: Toute la feature vit dans `lib/zpl/build.ts` +
  `lib/zpl/__tests__/build.test.ts` → **séquence stricte** : T004 (RED) →
  T005 (RED) → T006 (GREEN) → T007 (non-régression). Aucun [P] en interne
  (mêmes fichiers).

### Within the User Story

- Tests (RED) écrits et échouant AVANT l'implémentation (constitution V) —
  T004 puis T005, ordre imposé (même fichier de test)
- Implémentation minimale qui verdoie les tests (T006)
- Non-régression complète avant Polish (T007)

### Parallel Opportunities

- Setup : T001 et T002 parallélisables ([P]) ; T003 ([P]) indépendant de T002
- Polish : T008 (docs) et T010 (quickstart) après T006/T007 — [P] entre elles
- T009 (gate final) : après toutes les tâches précédentes, non [P]

---

## Parallel Example

```bash
# Piste A — Setup et verrouillage d'interface :
Task: "T001 baseline verte (suite complète + coverage)" 
Task: "T002 capturer la référence de l'ancien layout in lib/zpl/build.ts"
Task: "T003 vérifier les appelants de buildEan13Zpl (grep repo)"

# Piste B — US1 (séquentielle, mêmes fichiers) :
Task: "T004 RED tableau paramétré des 4 formats in lib/zpl/__tests__/build.test.ts"
Task: "T005 RED invariants (zones de silence, centrage, couverture, plafond)"
Task: "T006 GREEN calcul du layout in lib/zpl/build.ts"
Task: "T007 non-régression (suite complète + fichiers hors périmètre intacts)"

# Piste C — Polish (après checkout US1) :
Task: "T008 aligner contracts 001 + docs 008 (références croisées)"
Task: "T010 run quickstart 008 (tableau de valeurs + impression réelle si dispo)"
```

---

## Implementation Strategy

### MVP First (User Story 1 — la feature entière)

1. T001 baseline verte + T002 capture référence + T003 verrou interface
2. Checkpoint Foundational (rien à bâtir)
3. US1 : T004/T005 RED → T006 GREEN → T007 non-régression — **livrable MVP**
   (le centrage/pleine échelle est le besoin unique de la story)
4. **STOP and VALIDATE** : `npx vitest run lib/zpl/__tests__/build.test.ts` +
   contrôle visuel quickstart (si imprimante) ; démo/validation

### Incremental Delivery

1. Setup + verrou interface → état intact
2. US1 complète (RED/GREEN) → incrément unique livrable
3. Polish (T008 docs, T009 gate, T010 quickstart) → livraison

### Parallel Team Strategy

- Développeur A : Setup (T001/T002/T003) → US1 (T004→T007) → gate T009
  (fichiers `lib/zpl/*` uniquement)
- Développeur B (si disponible) : Polish docs T008 + quickstart T010 — fichiers
  `specs/*` disjoints ; attend T006/T007 pour T010

---

## Notes

- [P] tasks = different files, no dependencies (US1 interne : non [P], mêmes
  fichiers `lib/zpl/build.ts` + `lib/zpl/__tests__/build.test.ts`)
- [Story] label maps task to specific user story for traceability (1 story)
- La constitution impose les tests (coverage > 80 %) : pattern RED → GREEN
- T003 interdit toute autre forme de branche : le changement est délibérément
  confiné à `lib/zpl/build.ts` + `lib/zpl/__tests__/build.test.ts` (KISS/YAGNI)
- Stop at any checkpoint to validate story independently
- Commit after each task or logical group (ordre explicite de l'utilisateur
  requis pour « commit/go » ; branche `008-ean13-centered-barcode`)
- « À calibrer au premier rendu réel » : la constante TEXT_HEIGHT_DOTS = 25
  peut nécessiter un ajustement d'un ou deux dots selon le modèle d'imprimante —
  ajustement documenté dans `research.md` (risque résiduel accepté)

## Bilan de validation (T010)

- **Baseline pré-change** (T001) : 145/145 tests, eslint 0 warning,
  `tsc --noEmit` 0 erreur.
- **Confinement** (T003) : `buildEan13Zpl` n'est appelée que par
  `app/api/print/ean13/route.ts` (perfPrint) + son test — interface intacte,
  changement confiné à `lib/zpl/build.ts`.
- **RED (T004/T005)** : 22 échecs sur l'ancien layout câblé (`^BY2,3,120`,
  `^FO70,30`) vs les 35 nouvelles assertions — RED conforme.
- **GREEN (T006)** : `npx vitest run lib/zpl/__tests__/build.test.ts` →
  35/35 (tableau 4 formats + invariants : zones de silence, inclusion, bloc
  centré, couverture ≥ 90 %, plancher 146, plafond module 5).
- **Correction de référence (T002)** : la liste réelle de `ZPL_PAPER_SIZES`
  dans `.env` est `40x25, 75x25, 100x50, 100x150` (≠ exemple antérieur
  50x25/60x40) — toutes les tables des docs 008 et le README ont été alignés
  sur cette source de vérité.
- **Valeurs générées** (confirmées par test + exécution réelle de
  `buildEan13Zpl`) :

  | Format | `^BY` | `^FO` x | y | barres | bloc | couv. |
  |--------|-------:|-------:|--:|-------:|-----:|------:|
  | `40x25` | 2,3,155 | 65 | 10 | 155 | 180 | 90.0 % |
  | `75x25` | 5,3,155 | 63 | 10 | 155 | 180 | 90.0 % |
  | `100x50` | 5,3,335 | 163 | 20 | 335 | 360 | 90.0 % |
  | `100x150` | 5,3,1055 | 163 | 60 | 1055 | 1080 | 90.0 % |

- **Retouches utilisateur (hauteur)** :
  1. marge verticale passée de 5 → 10 dots (réduction « un peu » de la hauteur) ;
  2. puis **couverture uniformisée à 90 %** sur tous les formats :
     `TARGET_HEIGHT_COVERAGE = 0.9` → bloc = 90 % de la hauteur, marges
     haut/bas = 5 % (y proportionnel : 10 dots sur 200, 20 sur 400, 60 sur
     1200). Tests (RED puis GREEN 35/35) et toutes les tables de docs
     (contracts 008, research, quickstart, data-model) mis à jour ; les autres
     formules (module X, `x`, planchers) sont inchangées.

- **Non-régression (T007)** : suite complète **175/175** (145 + 30 nouveaux),
  coverage **95.9 %** (seuil 80 %) ; `route.ts` (API), `validate.ts`,
  `paper-sizes.ts`, `send.ts` inchangés — `^FD` 12 chiffres, `^PQ`, choix du
  papier et validation intacts.
- **Gate finale (T009)** : `npm run lint` 0 warning, `npx tsc --noEmit` 0,
  `npm run build` vert.
- **Impression physique** : **non réalisée** — aucune imprimante connectée à
  cette session ; contrôle visuel (marges égales, montée d'échelle) et scan à
  effectuer au premier branchement (protocole : `quickstart.md`, étape 3).
- **Réserve d'étalonnage** : constante `TEXT_HEIGHT_DOTS = 25` (bande
  chiffres) à ajuster d'un ou deux dots au premier rendu réel si besoin —
  changement localisé dans `lib/zpl/build.ts`, sans effet sur le centrage
  (symétrique).