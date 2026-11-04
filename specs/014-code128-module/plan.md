# Implementation Plan: Module Code 128 à contenu libre

**Branch**: `feature/014-code128-module` (créée) | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-code128-module/spec.md`

## Summary

Ajouter un troisième module d'impression d'étiquettes permettant de saisir
un **contenu libre** (1 à 80 caractères ASCII imprimables) et de l'imprimer
en **Code 128**, avec le même pipeline que les modules existants : garde-fou
imprimante, validation, quantité (confirmation au-delà de 2), réglages
papier/orientation partagés, verrou d'impression unique et registre de
modules. Approche : réutiliser la mécanique du module Emplacement (déjà en
Code 128) en **généralisant** son générateur ZPL pour une longueur
quelconque, et en **factorisant** les duplications arrivées à leur troisième
occurrence (options de validation, envoi client, dialogue de confirmation,
pipeline de route API).

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Next.js 16.3.5 (App Router)

**Primary Dependencies**: zod 4.6 (validation), sonner 2.0 (toasts),
@base-ui/react, @phosphor-icons/react ; aucune dépendance ajoutée

**Storage**: aucun nouveau stockage — cookie existant
`tagmaker_print_settings` (imprimante, papier, orientation)

**Testing**: vitest 5 + @testing-library/react + jsdom ; `npm test`,
`npm run test:coverage` (cible > 80 %), `npm run lint`,
`npx tsc --noEmit`

**Target Platform**: application web locale (LAN via service systemd),
navigateur desktop, imprimantes thermiques ZPL

**Project Type**: web application (monorepo applicatif Next.js unique)

**Performance Goals**: N/A — impression séquentielle, une requête à la fois
par endpoint ; jusqu'à 1000 étiquettes par demande

**Constraints**: contenu ASCII imprimable 1–80 caractères ; le code-barres
et son texte doivent tenir sur le format papier à la largeur de module
minimale (2 points) ; aucune dépendance ajoutée ; suite verte, linter sans
warning, couverture > 80 %

**Scale/Scope**: 1 page, 1 formulaire, 1 route API, 1 générateur ZPL,
1 entrée de registre ; ~10 fichiers source touchés, dont 4 refactorisations
de duplication (2–3 occurrences)

**NEEDS CLARIFICATION**: aucun — encodage, dimensionnement et intégration
sont tranchés dans [research.md](./research.md) (R1–R7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Porte | Verdict | Justification |
|-------|---------|---------------|
| I. KISS | ✅ | Aucune dépendance ni couche nouvelle : réutilisation du pipeline et du générateur Code 128 existants ; helpers extraits uniquement aux 3ᵉ occurrences imposées par DRY |
| II. DRY | ✅ | Cinq duplications résolues : champs Zod d'impression (`lib/print-options.ts`), envoi client (`lib/print-client.ts`), dialogue de confirmation (`print-confirm-dialog.tsx`), pipeline de route (`lib/print/route-handler.ts`), générateur ZPL unifié (`lib/zpl/code128.ts`) |
| III. YAGNI | ✅ | Un seul contenu par impression, pas de plage/séquence/import, pas de décodeur, pas de nouveau réglage ; sous-ensemble B uniquement (pas de C/A) |
| IV. Code clair / SOC | ✅ | Validation (`lib/code128/validate.ts`), ZPL (`lib/zpl/code128.ts`), API (route), UI (form + page) séparés ; noms explicites ; linter/typecheck exigés verts |
| V. Tests ≥ 80 % | ✅ | Nouveaux tests : validation, générateur (encodage, texte, rotation, non-débordement), route (422/409/503/rotation), formulaire (garde-fou, confirmation, payload), dialogue ; refactorisations couvertes par les 393 tests existants |
| VI. Évolutivité | ✅ | Ajout par registre ; contrat API additif ; endpoints EAN-13/Emplacement inchangés fonctionnellement |
| Sécurité | ✅ | Aucun secret ; validation server-side (Zod) du contenu, de la quantité et de l'adresse ; aucune nouvelle surface réseau ; garde-fou imprimante conservé |
| Développement & Qualité (branche) | ✅ | Branche `feature/014-code128-module` déjà créée ; aucun commit sans ordre explicite |

**Évaluation pré-Phase 0** : gates **PASS**, aucune violation à justifier.

**Re-évaluation post-Phase 1** : les artefacts n'introduisent ni dépendance,
ni entité persistée, ni contrat réseau nouveau hors `/api/print/code128`
(additif). Les gates restent **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/014-code128-module/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions R1-R7
├── data-model.md        # Phase 1 — entités, règles, états
├── quickstart.md        # Phase 1 — validation de bout en bout
├── contracts/
│   ├── code128-print-api.md   # Contrat HTTP
│   ├── code128-barcode.md     # Contrat d'encodage / dimensionnement
│   └── code128-ui.md          # Contrat d'interface
├── checklists/
│   └── requirements.md        # /speckit.specify (16/16)
├── spec.md
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── code128/page.tsx                  # AJOUT: page du module
├── api/print/code128/route.ts        # AJOUT: POST impression
└── api/print/code128/__tests__/      # AJOUT: route + rotation
    ├── route.test.ts
    └── route-rotation.test.ts

components/
├── code128-form.tsx                  # AJOUT: formulaire (contenu, quantité, confirmation)
├── print-confirm-dialog.tsx          # AJOUT: dialogue générique (3ᵉ occurrence)
├── ean13-form.tsx                    # MODIF: helper d'envoi + dialogue générique
├── location-form.tsx                 # MODIF: helper d'envoi + dialogue générique
├── ean13-confirm-dialog.tsx          # SUPPR: remplacé par le dialogue générique
├── location-confirm-dialog.tsx       # SUPPR: idem
└── __tests__/
    ├── code128-form.test.tsx         # AJOUT
    ├── print-confirm-dialog.test.tsx # AJOUT (remplace ean13-confirm-dialog.test)
    └── ean13-form.test.tsx, location-form.test.tsx  # MODIF si nécessaire

lib/
├── code128/validate.ts               # AJOUT: schéma de requête
├── code128/__tests__/validate.test.ts# AJOUT
├── print-options.ts                  # AJOUT: champs Zod partagés (quantity, papier, imprimante, rotation)
├── print-client.ts                   # AJOUT: garde-fou + envoi + toasts partagés
├── print/route-handler.ts            # AJOUT: pipeline POST commun (parse, papier, rotation, verrou, envoi)
├── print/__tests__/route-handler.test.ts  # AJOUT si la couverture l'exige
├── zpl/code128.ts                    # AJOUT: générateur généralisé + limites de longueur
├── zpl/location.ts                   # MODIF: délègue à code128.ts (API et sortie 4 caractères inchangées)
├── modules/registry.ts               # MODIF: entrée "code128"
├── ean13/validate.ts                 # MODIF: champs partagés
├── location/validate.ts              # MODIF: champs partagés
└── __tests__ zpl                      # MODIF/AJOUT: code128.test.ts
```

**Structure Decision**: structure applicative Next.js existante conservée
(modules auto-découverts par `lib/modules/registry.ts` → page d'accueil,
barre latérale, en-tête et modules récents). Aucun nouveau répertoire
d'architecture.

## Complexity Tracking

Aucune violation de la constitution : le tableau est vide.
