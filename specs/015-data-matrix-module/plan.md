# Implementation Plan: Module Data Matrix avec légende

**Branch**: `feature/015-data-matrix-module` (à créer ; le travail 014 non
commité reste sur `feature/014-code128-module`) | **Date**: 2026-10-31 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-data-matrix-module/spec.md`

## Summary

Ajouter un module d'impression **Data Matrix ECC200** à contenu libre
(1–200 caractères ASCII imprimables) avec une **légende facultative**
(0–60 caractères) imprimée en clair sous le code (ou à côté en orientation
pivotée). Le module réutilise entièrement le pipeline existant : registre,
garde-fou imprimante, validation Zod partagée, quantité avec confirmation
au-delà de 2, réglages papier/orientation, verrou d'impression et envoi
client. Le travail se limite à un générateur ZPL `^BX` avec calcul de
placement carré + légende, un schéma de validation, une route, un formulaire
et une page.

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

**Constraints**: contenu 1–200 et légende 0–60 caractères ASCII imprimables ;
le symbole carré (module ≥ 2 points) et la légende doivent tenir sur le
format papier, dans les deux orientations ; aucune dépendance ajoutée ; suite
verte, linter sans warning, couverture > 80 %

**Scale/Scope**: 1 page, 1 formulaire, 1 route API, 1 générateur ZPL,
1 entrée de registre ; ~8 fichiers source ajoutés, 3 fichiers de tests
existants ajustés (registre/page), aucune refactorisation des modules
existants

**NEEDS CLARIFICATION**: aucun — encodage, échappement, dimensionnement et
mise en page sont tranchés dans [research.md](./research.md) (R1–R6).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Porte | Verdict | Justification |
|-------|---------|---------------|
| I. KISS | ✅ | Aucune dépendance ni couche nouvelle : pipeline, validation partagée, dialogue et envoi client réutilisés ; un seul générateur ZPL dédié |
| II. DRY | ✅ | Réutilise `createPrintPostHandler`, `sendPrintRequest`, `PrintConfirmDialog`, `quantityField`/`paperIdField`/`printerAddressField`/`rotatedField` et `escapeTextData` ; pas de duplication de pipeline |
| III. YAGNI | ✅ | Un contenu + une légende, pas de plage/séquence/import, pas de GS1/FNC1, pas de DMRE, pas de nouveau réglage |
| IV. Code clair / SOC | ✅ | Validation (`lib/data-matrix/validate.ts`), ZPL (`lib/zpl/data-matrix.ts`), API (route), UI (form + page) séparés ; noms explicites ; linter/typecheck verts exigés |
| V. Tests ≥ 80 % | ✅ | Nouveaux tests : validation, dimensionnement/échappement/mise en page ZPL, route (422/409/503/fit/rotation), formulaire ; tests registre/page ajustés |
| VI. Évolutivité | ✅ | Ajout par registre ; contrat API additif ; endpoints existants inchangés fonctionnellement |
| Sécurité | ✅ | Aucun secret ; validation server-side (Zod) du contenu, de la légende, de la quantité et de l'adresse ; aucune nouvelle surface réseau ; garde-fou imprimante conservé |
| Développement & Qualité (branche) | ⚠️ | Branche cible `feature/015-data-matrix-module` ; la branche courante reste `feature/014-code128-module` tant que la feature 014 n'est pas commitée. Aucun commit sans ordre explicite |

**Évaluation pré-Phase 0** : gates **PASS** (la remarque branche est
organisationnelle, pas une violation de conception).

**Re-évaluation post-Phase 1** : les artefacts n'introduisent ni dépendance,
ni entité persistée, ni contrat réseau nouveau hors
`/api/print/data-matrix` (additif). Les gates restent **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/015-data-matrix-module/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions R1-R6
├── data-model.md        # Phase 1 — entités, règles, capacités, mise en page
├── quickstart.md        # Phase 1 — validation de bout en bout
├── contracts/
│   ├── data-matrix-print-api.md  # Contrat HTTP
│   ├── data-matrix-barcode.md    # Contrat d'encodage / dimensionnement
│   └── data-matrix-ui.md         # Contrat d'interface
├── checklists/
│   └── requirements.md           # /speckit.specify (16/16)
├── spec.md
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── data-matrix/page.tsx                   # AJOUT: page du module
├── api/print/data-matrix/route.ts         # AJOUT: POST impression
└── api/print/data-matrix/__tests__/       # AJOUT: route + tenue
    ├── route.test.ts
    └── route-fit.test.ts

components/
├── data-matrix-form.tsx                   # AJOUT: contenu, légende, quantité
├── __tests__/data-matrix-form.test.tsx    # AJOUT
└── __tests__/data-matrix-form-validation.test.tsx  # AJOUT si utile

lib/
├── data-matrix/validate.ts                # AJOUT: schéma de requête
├── data-matrix/__tests__/validate.test.ts # AJOUT
├── zpl/data-matrix.ts                     # AJOUT: ^BX, dimensionnement, placement, échappement
├── zpl/__tests__/data-matrix.test.ts      # AJOUT
├── modules/registry.ts                    # MODIF: entrée "data-matrix"
├── zpl/code128.ts                         # RÉUTILISÉ (escapeTextData), non modifié
├── print-options.ts                       # RÉUTILISÉ, non modifié
├── print/route-handler.ts                 # RÉUTILISÉ, non modifié
└── print-client.ts                        # RÉUTILISÉ, non modifié

app/__tests__/page.test.tsx                # MODIF: module visible
components/__tests__/recent-modules-*.test.tsx  # MODIF si le registre est figé
```

**Structure Decision**: structure applicative Next.js existante conservée
(modules auto-découverts par `lib/modules/registry.ts` → page d'accueil,
barre latérale, en-tête et modules récents). Aucun nouveau répertoire
d'architecture ; le générateur Data Matrix est isolé dans `lib/zpl/` comme
celui de Code 128.

## Complexity Tracking

Aucune violation de la constitution : le tableau est vide.

## Risques et vérifications

- **Firmware `^BX`** : `g = _`, `_dNNN` et la taille forcée 10–48 sont
  documentés par Zebra et rendus par Labelary ; le scan réel et le firmware
  de l'imprimante cible restent à valider (le quickstart prévoit le contrôle
  Labelary et le scan manuel).
- **Légende longue** : le plafond de 60 caractères peut être refusé plus tôt
  selon le format (table dans `data-model.md`) ; le message invite à
  raccourcir ou changer de format.
- **Aucune modification** de `lib/zpl/code128.ts`, des routes ou formulaires
  existants : la non-régression est couverte par la suite actuelle.
