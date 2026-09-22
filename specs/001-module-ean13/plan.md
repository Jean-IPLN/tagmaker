# Implementation Plan: Module EAN-13 — Impression d'étiquettes

**Branch**: `001-module-ean13` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-module-ean13/spec.md`

**Note**: Ce template est rempli par la commande `/speckit.plan` ; sa définition
décrit le workflow d'exécution.

## Summary

Primaire : une web app locale (Next.js + shadcn/ui) qui, à l'arrivée, affiche
une galerie de modules d'étiquettes. En première version, seul le module EAN-13
existe : saisie d'un code EAN-13 (13 chiffres, checksum validé) et d'une
quantité ; à la validation, l'application envoie en ZPL le code-barres à une
imprimante réseau ; si la quantité > 2, une modal critique (shadcn
AlertDialog/Dialog) exige une confirmation explicite avant l'impression.

Approche technique : le code-barres EAN-13 est rendu nativement par
l'imprimante via la commande ZPL `^BE` — aucune bibliothèque de génération de
code-barres n'est nécessaire. Le serveur Next.js ouvre une socket TCP brute
(port 9100) vers l'imprimante. Adresse de l'imprimante : `192.168.1.63`
(configurée dans `.env`). Format papier temporaire : 40 mm × 25 mm
(largeur × longueur), tailles définitives à définir ultérieurement.

## Technical Context

**Language/Version**: TypeScript (strict), Node.js runtime de Next.js

**Primary Dependencies**: Next.js (App Router), React, shadcn/ui (preset
`b1FSRMDw0`), shadcn Dialog/AlertDialog, sonner (toasts), zod (validation)

**Storage**: N/A pour la v1 — aucune persistance ; les demandes d'impression
sont transitoires (aucun historique demandé)

**Testing**: Vitest + React Testing Library + Supertest (routes API)

**Target Platform**: web app locale, serveur exécuté sur la machine de
l'utilisateur (localhost), navigateur moderne

**Project Type**: web app (Next.js App Router)

**Performance Goals**: réponse d'impression < 2 s (contexte local, temps de
connexion à l'imprimante inclus)

**Constraints**: usage mono-utilisateur local ; pas de sortie réseau avec
l'extérieur (localhost uniquement) ; IP imprimante en `.env`, jamais en dur
dans le code ; pas de dépendance réseau externe au moment de l'exécution

**Scale/Scope**: 1 module (EAN-13) ; galerie extensible ; une étiquette par
impression, répétée selon la quantité

## Constitution Check

*GATE: Doit passer avant la Phase 0. Vérifié de nouveau après la Phase 1.*

- **Tests non-négociables (V)** : toute logique doit être couverte, coverage
  > 80 %. GATE : stratégie de test incluse (unit + intégration API).
- **DRY (II)** : une seule source de validation EAN-13 partagée entre le
  client et le serveur. GATE : aucun code de validation dupliqué.
- **YAGNI (III)** : pas de persistance, pas de découverte d'imprimante, pas
  d'historique en v1. GATE : périmètre borné au module EAN-13 + galerie.
- **KISS (I)** : pas de bibliothèque de code-barres (l'imprimante rend `^BE`),
  pas de couche d'abstraction superflue. GATE : toute abstraction doit être
  justifiée.
- **Sécurité minimale** : entrées validées côté serveur ; adresse imprimante
  uniquement dans `.env` (pas de secret en dur) ; écoute locale uniquement.
- **Git** : travail sur branche dédiée (`feature/` ou `001-module-ean13`) ;
  pas de commit/push sans ordre explicite. NOTE : le dépôt git n'est pas
  encore initialisé — see follow-up.

## Project Structure

### Documentation (this feature)

```text
specs/001-module-ean13/
├── plan.md              # Ce fichier (sortie de /speckit.plan)
├── research.md          # Sortie Phase 0 (/speckit.plan)
├── data-model.md        # Sortie Phase 1 (/speckit.plan)
├── quickstart.md        # Sortie Phase 1 (/speckit.plan)
├── contracts/           # Sortie Phase 1 (/speckit.plan)
└── tasks.md             # Sortie Phase 2 (/speckit.tasks - PAS créé par /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── page.tsx                    # Galerie de modules (landing)
├── ean13/page.tsx              # Module EAN-13 : formulaire + impression
├── layout.tsx
├── globals.css
└── api/print/ean13/route.ts    # API locale d'impression (validation + envoi ZPL)

components/
├── ui/                         # Composants shadcn/ui (générés par le preset)
├── label-gallery.tsx           # Grille de modules (card par module)
├── ean13-form.tsx              # Formulaire EAN-13 (code + quantité)
└── ean13-confirm-dialog.tsx    # Modal critique (Dialog shadcn) qty > 2

components.json                 # Config shadcn (preset appliqué)

lib/
├── ean13/
│   ├── validate.ts             # Validation EAN-13 (13 chiffres + checksum mod 10)
│   └── validate.test.ts
├── zpl/
│   ├── build.ts                # Génération ZPL ^BE (^PW/^LL, bar height, quantity)
│   └── build.test.ts
└── printer/
    └── send.ts                 # Envoi raw TCP (port 9100) vers l'imprimante

.env                            # ZPL_PRINTER_HOST=192.168.1.63, port, dimensions (NON versionné)
.env.example                    # Modèle versionné sans valeur réelle
```

**Structure Decision**: Application Next.js App Router standard (`app/`,
`components/`, `lib/`). Les composants shadcn vont dans `components/ui/`,
les composants métier dans `components/`. La logique métier pure (validation,
génération ZPL) dans `lib/`, séparée de l'infra (envoi réseau) pour une
testabilité unitaire simple. Aucun backend séparé : les route handlers
Next.js suffisent (SOC respecté sans prochain/sous-projet — KISS).

## Complexity Tracking

> À remplir uniquement si la Constitution Check a des violations à justifier

Aucune violation identifiée. L'architecture reste sur une seule application
Next.js sans monorepo : la galerie étant extensible, les modules futurs
suivront le même pattern (page + formulaire + lib), sans nouvelle
abstraction anticipée (YAGNI).