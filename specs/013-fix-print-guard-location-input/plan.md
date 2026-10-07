# Implementation Plan: Correction d'UX — blocage d'impression et saisie du code emplacement

**Branch**: `feature/013-fix-print-guard-location-input` (à créer avant toute modification — actuellement sur `master`) | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-fix-print-guard-location-input/spec.md`

## Summary

Deux correctifs d'UX indépendants mais cohérents : (1) **empêcher toute
impression sans imprimante sélectionnée**, avec toast explicite, dans les
deux modules (EAN-13, Emplacement) et sur tous les chemins d'envoi (direct,
confirmation, plage) ; (2) **corriger l'alignement de la frappe du code
emplacement** : la zone (1er caractère, défaut « 1 », modifiable en « 2 »)
ne doit plus être écrasée par la saisie des positions suivantes. Approche :
garde-fou client dans la couche d'envoi des deux formulaires (contrat API
inchangé) + représentation du code à **4 positions paddées** (espace =
position vide) compactée à l'unique frontière de validation Zod, avec
distribution du collage et helpers `pad`/`compact` partagés.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Next.js 16.3.5 (App Router)

**Primary Dependencies**: zod 4.6 (validation), sonner 2.0 (toasts),
@base-ui/react (sélecteurs), @phosphor-icons/react ; aucune dépendance ajoutée

**Storage**: aucun nouveau stockage — cookie existant `tagmaker_print_settings`
(source de vérité du réglage d'imprimante, réutilisé tels quels)

**Testing**: vitest 5 + @testing-library/react + jsdom ; `npm test` (suite +
tests d'installation), `npm run test:coverage` (cible > 80 %) ;
`npm run lint` (eslint) ; `npx tsc --noEmit`

**Target Platform**: application web locale (LAN via le service systemd,
exception sanctuarisée feature 011), navigateur desktop

**Project Type**: web application (Next.js monorepo applicatif unique)

**Performance Goals**: N/A — correctifs d'interface, aucune contrainte de
débit ni de latence mesurable

**Constraints**: suite verte, linter sans warning, types propres, couverture
> 80 %, aucun TODO ni code commenté livré (constitution V et « Développement
& Qualité »)

**Scale/Scope**: 2 formulaires + 1 composant + 1 schéma de validation +
1 module d'aides ; ~5 fichiers source modifiés, 1 fichier de test ajouté ;
aucune migration, aucun changement de contrat API

**NEEDS CLARIFICATION**: aucun — les deux inconnues de conception (point
d'application du garde-fou, représentation du code) sont résolues dans
[research.md](./research.md) (R1, R2).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Porte | Verdict | Justification |
|-------|---------|---------------|
| I. KISS | ✅ | Aucune dépendance ni abstraction nouvelle au-delà de `pad`/`compact` (3 usages) ; garde-fou = 4 lignes inlinées ; pas de changement serveur |
| II. DRY | ✅ | Compaction en **un seul point** (`locationCodeField`, utilisé par `code`/`startCode`/`endCode`) ; helpers partagés dans `lib/location/code.ts` ; garde-fou sur 2 occurrences seulement (seuil « au-delà de deux » respecté) |
| III. YAGNI | ✅ | Rien d'anticipé : pas de garde serveur, pas de nouveau réglage, pas de modification du modèle PrintSettings ; distribution du collage exigée par la spec, pas spéculative |
| IV. Code clair / SOC | ✅ | Composant = affichage/édition des positions, formulaire = état/envoi/synchro de zone, schéma = validation, `code.ts` = fonctions pures ; noms explicites ; linter/typecheck exigés verts |
| V. Tests ≥ 80 % | ✅ | Plan de tests documenté (research R6) : garde-fou ×2 formulaires ×2 chemins, nouveau test du composant, tests de compaction du schéma, non-régression de la suite existante (362 tests) |
| VI. Évolutivité | ✅ | Contrats stables : contrat API et modèle PrintSettings inchangés ; changements par additions localisées (helpers + gestionnaire de collage) |
| Sécurité (minima) | ✅ | Aucun secret ni nouvelle exposition réseau ; validation d'entrée server-side inchangée (Zod) ; le garde-fou réduit l'envoi non voulu ; écoute réseau non touchée (exception 011 intacte) |
| Développement & Qualité (branche) | ⚠️ **Préalable obligatoire** | Aucun hook `before_plan` n'a créé de branche ; la branche `feature/013-fix-print-guard-location-input` **doit être créée avant toute modification de code** (actuellement sur `master`) ; aucun commit sans ordre explicite |

**Évaluation pré-Phase 0** : gates **PASS** (aucune violation à justifier).
L'unique point d'attention est un préalable procédural (création de branche),
pas une violation de conception.

**Re-évaluation post-Phase 1** : les artefacts (research, data-model,
contracts, quickstart) n'introduisent ni dépendance, ni entité persistée,
ni contrat réseau nouveau ; les gates restent **PASS**. Le bornage R1
(garde-fou UI, contrat API conservé) est explicite dans
[contracts/print-guard.md](./contracts/print-guard.md).

## Project Structure

### Documentation (this feature)

```text
specs/013-fix-print-guard-location-input/
├── plan.md                    # Ce fichier (/speckit.plan)
├── research.md                # Phase 0 — décisions R1-R6
├── data-model.md              # Phase 1 — représentations et transitions
├── quickstart.md              # Phase 1 — guide de validation de bout en bout
├── contracts/
│   ├── print-guard.md         # Phase 1 — contrat garde-fou imprimante
│   └── location-code-input.md # Phase 1 — contrat champ 4 positions
├── checklists/
│   └── requirements.md        # /speckit.specify (16/16)
├── spec.md                    # Spécification
└── tasks.md                   # Phase 2 — /speckit.tasks (PAS créé par /speckit.plan)
```

### Source Code (repository root)

```text
components/
├── ean13-form.tsx             # MODIF: garde-fou + toast dans submitPrint
├── location-form.tsx          # MODIF: garde-fou + état code paddé ("1   ") + envoi via parsed.data
├── location-code-input.tsx    # MODIF: positions paddées, affichage, collage distribué, clavier conservé
└── __tests__/
    ├── ean13-form.test.tsx    # MODIF: scénarios garde-fou (direct + confirmation)
    ├── location-form.test.tsx # MODIF: scénarios garde-fou + adaptation saisie paddée
    └── location-code-input.test.tsx  # AJOUT: contrat du champ 4 positions

lib/location/
├── code.ts                    # MODIF: helpers LOCATION_CODE_LENGTH / pad / compact (fonctions pures)
├── validate.ts                # MODIF: locationCodeField = transform(compact) → regex (point unique)
└── __tests__/
    └── validate.test.ts       # MODIF: compaction, messages d'erreur conservés

app/api/print/                 # INCHANGÉ (contrat API conservé, tests existants verts)
```

**Structure Decision**: structure applicative existante conservée (web
application Next.js unique) — aucune option de restructuration : les
correctifs vivent dans les fichiers qui portent déjà la responsabilité
concernée (formulaires, composant de saisie, schéma de validation), les
tests restant au même niveau que le code (constitution « Développement &
Qualité »).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Aucune violation | — | — |
