# Implementation Plan: Data Matrix — commutateur d'affichage in-line

**Branch**: `feature/016-data-matrix-inline-switch` | **Date**: 2026-11-06 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from
`/specs/016-data-matrix-inline-switch/spec.md`

## Summary

Ajouter au formulaire Data Matrix un commutateur **« Affichage in-line »**
(désactivé par défaut). Désactivé, le rendu actuel reste strictement inchangé.
Activé en orientation normale, la légende est imprimée à droite du symbole,
sur une seule ligne, sans modifier le contenu encodé ni les réglages partagés.
L'API d'impression reçoit un champ additif facultatif `inline`, la tenue est
vérifiée avant envoi, et l'orientation pivotée conserve sa disposition
existante. Aucune dépendance, persistance ou nouvelle surface réseau n'est
ajoutée.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2, Next.js 16.3.5 (App Router)

**Primary Dependencies**: zod 4.6 (validation), `components/ui/switch.tsx`
(Base UI, existant), sonner 2.0 (toasts) ; aucune dépendance ajoutée

**Storage**: aucun stockage nouveau — le cookie existant
`tagmaker_print_settings` reste la seule source de vérité pour papier,
orientation et imprimante ; `inline` n'est pas persisté

**Testing**: vitest 5 + @testing-library/react + jsdom ; `npm test`,
`npm run test:coverage` (cible > 80 %), `npm run lint`,
`npx tsc --noEmit`

**Target Platform**: application web locale (LAN via service systemd),
navigateur desktop, imprimantes thermiques ZPL

**Project Type**: application web Next.js unique (frontend + routes API)

**Performance Goals**: N/A — impression séquentielle, une requête à la fois
par endpoint ; le calcul de mise en page reste borné à quelques dizaines
d'itérations et ne s'exécute qu'une fois par impression

**Constraints**: contenu 1–200 et légende 0–60 caractères ASCII imprimables ;
légende in-line sur une seule ligne ; symbole carré (module ≥ 2 points) ;
aucune troncature ; `inline` ignoré lorsque l'orientation pivotée est active ;
compatibilité des requêtes sans `inline` ; aucune dépendance ajoutée ; suite
verte, linter sans warning, couverture > 80 %

**Scale/Scope**: 1 formulaire, 1 schéma de validation, 1 route existante,
1 branche de mise en page ZPL, 1 commutateur ; aucun nouveau module, écran,
stockage ou réglage partagé

**NEEDS CLARIFICATION**: aucun — sémantique in-line, priorité sur l'orientation
pivotée, contrat additif, placement ZPL et stratégie de tenue sont tranchés
dans [research.md](./research.md) (R1–R7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Porte | Verdict | Justification |
|-------|---------|---------------|
| I. KISS | ✅ | Un booléen facultatif et une branche de mise en page ; commutateur, pipeline, validation et envoi existants réutilisés ; aucune dépendance |
| II. DRY | ✅ | Même schéma client/serveur, même routeur d'impression, même fonction de tenue, mêmes constantes de légende et même composant `Switch` ; aucun calcul dupliqué |
| III. YAGNI | ✅ | Pas d'aperçu, pas de persistance, pas de nouveau réglage, pas de variante GS1/DMRE, pas de paramètre d'alignement ou de police |
| IV. Code clair / SOC | ✅ | UI dans `components/data-matrix-form.tsx`, contrat dans `lib/data-matrix/validate.ts`, mise en page dans `lib/zpl/data-matrix.ts`, orchestration dans la route existante |
| V. Tests ≥ 80 % | ✅ | Tests unitaires de schéma et de mise en page, tests de route (défaut, in-line, tenue, pivoté), tests du formulaire (défaut, bascule, payload, confirmation) |
| VI. Évolutivité | ✅ | Contrat additif : absence de `inline` = mode actuel ; aucune migration ; l'orientation pivotée reste prioritaire |
| Sécurité | ✅ | Validation serveur du booléen, mêmes limites d'entrée, aucun secret, aucune nouvelle écoute réseau, contenu toujours validé et échappé |
| Développement & Qualité (branche) | ✅ | Branche `feature/016-data-matrix-inline-switch` active ; aucun commit sans ordre explicite |

**Évaluation pré-Phase 0** : gates **PASS**.

**Ré-évaluation post-Phase 1** : les artefacts restent additifs, sans
dépendance, sans persistance et sans nouvelle route. Les gates restent
**PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/016-data-matrix-inline-switch/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — décisions R1–R7
├── data-model.md        # Phase 1 — données, règles et mise en page
├── quickstart.md        # Phase 1 — validation de bout en bout
├── contracts/
│   ├── data-matrix-print-api.md      # Delta du contrat HTTP
│   ├── data-matrix-inline-layout.md  # Contrat de mise en page ZPL
│   └── data-matrix-ui.md             # Contrat du commutateur
├── checklists/
│   └── requirements.md               # /speckit.specify (16/16)
├── spec.md
└── tasks.md             # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
components/
├── data-matrix-form.tsx                           # MODIF: commutateur in-line
└── __tests__/
    ├── data-matrix-form.test.tsx                  # MODIF: payload + défaut
    └── data-matrix-form-inline.test.tsx            # AJOUT: bascule/accessibilité

lib/
├── data-matrix/
│   ├── validate.ts                                # MODIF: champ inline facultatif
│   └── __tests__/validate.test.ts                 # MODIF: booléen, absence, type invalide
├── zpl/
│   ├── data-matrix.ts                             # MODIF: layout in-line + tenue
│   └── __tests__/
│       ├── data-matrix.test.ts                    # MODIF: ZPL in-line, pivoté inchangé
│       └── data-matrix-fit.test.ts                # MODIF: limites in-line
├── print-options.ts                               # RÉUTILISÉ, non modifié
├── print/route-handler.ts                         # RÉUTILISÉ, non modifié
└── print-client.ts                                # RÉUTILISÉ, non modifié

app/api/print/data-matrix/
├── route.ts                                       # MODIF: transmet inline
└── __tests__/
    ├── route.test.ts                              # MODIF: inline + défaut + pivoté
    └── route-fit.test.ts                          # MODIF: refus in-line

specs/015-data-matrix-module/contracts/             # RÉFÉRENCE, non modifiée
```

**Structure Decision**: structure Next.js existante conservée. Le choix de
mise en page reste encapsulé dans `lib/zpl/data-matrix.ts` ; le formulaire ne
calcule aucune géométrie et l'API ne duplique pas la logique de tenue.

## Phase 0 — Décisions techniques

Les décisions complètes et leurs alternatives sont dans
[research.md](./research.md). Synthèse :

1. **Sémantique** : in-line = légende à droite du symbole en orientation
   normale, sur une ligne, alignée à gauche après un espacement ; symbole et
   légende centrés verticalement.
2. **Priorité** : `rotated=true` conserve le rendu pivoté actuel ; `inline`
   n'a alors aucun effet.
3. **Contrat** : `inline?: boolean` additif, absent = `false` ; le formulaire
   n'envoie le champ que lorsqu'il est activé.
4. **Mise en page** : essayer les tailles de module de la plus grande à la plus
   petite, puis la plus grande hauteur de légende qui tient ; première
   combinaison valide retenue.
5. **ZPL** : symbole `^BXN` inchangé ; légende normale `^AEN` à droite avec
   `^FB<largeurDisponible>,1,0,L` ; échappement `^FH` existant réutilisé.
6. **UI** : `Switch` existant, libellé visible « Affichage in-line », état
   désactivé par défaut, aide précisant l'orientation normale.
7. **Tests** : non-régression du rendu actuel, bornes de tenue, compatibilité
   des requêtes sans `inline`, accessibilité clavier/lecteur d'écran.

## Phase 1 — Modèle et contrats

- [data-model.md](./data-model.md) : champs, règles de priorité, géométrie
  in-line, limites observables et absence de persistance.
- [contracts/data-matrix-print-api.md](./contracts/data-matrix-print-api.md) :
  delta HTTP, défaut, erreurs, compatibilité.
- [contracts/data-matrix-inline-layout.md](./contracts/data-matrix-inline-layout.md) :
  géométrie, sortie ZPL, garanties de tenue.
- [contracts/data-matrix-ui.md](./contracts/data-matrix-ui.md) : commutateur,
  payload, accessibilité, non-régression.
- [quickstart.md](./quickstart.md) : scénarios de validation manuels et
  automatisés.

## Complexity Tracking

Aucune violation de la constitution : le tableau est vide.

## Risques et vérifications

- **Firmware / rendu réel** : le placement `^AEN` + `^FB` sera vérifié par les
  tests ZPL et Labelary ; le scan physique sur l'imprimante cible reste à
  confirmer dans le quickstart.
- **Lisibilité** : l'in-line réduit la largeur disponible pour le code et la
  légende ; les formats étroits refusent plus tôt. Les tests bornent les cas
  limite et le message invite à raccourcir ou changer de format.
- **Non-régression** : le mode désactivé réutilise le chemin normal actuel ;
  les tests existants de la feature 015 restent la référence.
- **Pivoté** : `inline` est ignoré lorsque `rotated` est vrai ; un test dédié
  verrouille cette priorité pour éviter toute régression.
