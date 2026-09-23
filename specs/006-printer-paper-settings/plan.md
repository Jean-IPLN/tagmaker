# Implementation Plan: Paramétrage imprimante et taille de papier

**Branch**: `006-printer-paper-settings` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-printer-paper-settings/spec.md`

## Summary

Ajouter au pied de la barre latérale une section **Paramètres** avec deux listes
déroulantes : **Papier** et **Imprimante** (FR-001). Les formats de papier
viennent de la configuration (`.env`, format humain `largeurxlongueur` en mm,
triés par **surface croissante** calculée, FR-010/FR-011). L'imprimante choisie
est stockée dans un **cookie** : déjà définie → affichée directement sans scan
(FR-013) ; non définie → sélecteur non sélectionné + avertissement, scan réseau
du sous-réseau local (port ZPL) à l'ouverture, choix **explicite seul** mémorisé
(FR-012/FR-014). Les réglages sont transmis à l'impression EAN-13 (taille du
flux ZPL + adresse de destination) avec repli sûr sur la configuration `.env`
(FR-003/FR-006/FR-008/FR-009).

Approche retenue (research.md) : scan réseau **serveur** (le navigateur ne peut
pas sonder le port 9100), cookie unique `tagmaker_print_settings`, et extension
**additive rétro-compatible** de la requête d'impression.

## Technical Context

**Language/Version**: TypeScript strict, Next.js 16.3.5 (App Router, Server/Client
Components), React 19.2.8

**Primary Dependencies**: `@base-ui/react` (composant shadcn Select base-nova
— déjà présent, **aucune nouvelle dépendance**), `@phosphor-icons/react`
(icônes d'avertissement/caret), `zod` (validation), `node:net` (scan TCP 9100 +
envoi imprimante), `server-only` (configuration serveur)

**Storage**: cookie navigateur `tagmaker_print_settings` (JSON non sensible,
30 j, non HttpOnly) + variables d'environnement serveur (`.env`)

**Testing**: vitest 5 + jsdom, couverture > 80 % exigée (linter + build verts à la
livraison)

**Target Platform**: navigateur local (localhost) + serveur Node local

**Project Type**: application web locale (App Router : SSR, composants client,
routes API)

**Performance Goals**: sélecteur « Imprimante » — liste affichée ≤ 5 s après
ouverture (scan /24 borné, connexions parallèles) ; rendu SSR immédiat des
formats papier (aucun flash)

**Constraints**: scan réseau **uniquement** du sous-réseau local configuré,
port **dédié** `ZPL_PRINTER_PORT`, délais courts, aucun payload écrit sur les
sockets sondées ; aucun secret dans les cookies ; écoute localhost

**Scale/Scope**: un seul sous-réseau (/24), ≤ 255 adresses sondées, une seule
imprimante sélectionnée, liste de formats courte (< 10)

## Constitution Check

*GATE: doit passer avant la recherche (Phase 0) et être re-vérifié après le design
(Phase 1).*

- **G1 — KISS** : solution simple — ajout d'une section de pied de barre
  latérale, d'une fonction pure de tri des formats, d'une route scan et d'un
  ajout de champs à l'API d'impression. Aucune abstraction superflue.
- **G2 — DRY** : toutes les coopérations de formats centralisées dans
  `lib/paper-sizes.ts` ; adressage imprimante centralisé (hôte/port) dans
  `lib/printer/send.ts` ; cookie partagé côté client/serveur via une constante
  unique.
- **G3 — YAGNI** : pas de gestion manuelle d'imprimantes, pas de test de
  connectivité, pas de rafraîchissement de scan, pas de découverte continue.
- **G4 — SOC** : `paper-sizes.ts` (pur) / `settings-cookie.ts` (adapter) /
  `discovery.ts` (scan serveur) / `SettingsFooter` (UI) / route d'impression
  (orchestration) — une responsabilité par module.
- **G5 — Sécurité minimale** : scan restreint au sous-réseau local et au port
  ZPL (jamais l'internet), aucune donnée écrite sur les sockets de scan, cookie
  sans secret, validation systématique (zod) des entrées.
- **G6 — Tests obligatoires** : parties pures (paper-sizes, cookie, discovery
  logique) 100 % testables ; composants et routes couverts ; coverage >
  80 %.
- **G7 — Git** : travail exclusivement sur la branche dédiée
  `006-printer-paper-settings` ; **aucun commit sans ordre explicite**.

**Résultat Phase 0/1** : tous les PAR PASS.

## Project Structure

### Documentation (this feature)

```text
specs/006-printer-paper-settings/
├── plan.md              # This file
├── research.md          # Phase 0 : décisions (D1–D6)
├── data-model.md        # Entités : PaperSize, PrinterDevice, PrintSettings
├── quickstart.md        # Scénarios de validation A–G
├── contracts/
│   ├── paper-sizes.md       # parsing/tri des formats (env, surface)
│   ├── settings-cookie.md   # cookie tagmaker_print_settings
│   ├── printer-discovery.md # GET /api/printers/discover (scan /24, 9100)
│   ├── printing.md          # POST /api/print/ean13 étendu paperId/printerAddress
│   └── ui.md                # Section Paramètres, états et avertissements
└── tasks.md             # Phase 2 (/speckit.tasks, hors périmètre de ce plan)
```

### Source Code (repository root) — structure monopile existante

```text
app/
├── layout.tsx                       # [modifié] lit les formats serveur → props AppSidebar
├── api/
│   ├── printers/
│   │   └── discover/route.ts        # [nouveau] scan réseau (FR-014)
│   └── print/ean13/route.ts         # [modifié] paperId + printerAddress (contracts/printing)
├── __tests__/
│   └── ...
components/
├── app-sidebar.tsx                  # [modifié] SidebarFooter → <SettingsFooter />
├── settings-footer.tsx              # [nouveau] section Paramètres (2 Selects)
├── ui/select.tsx                    # [nouveau] shadcn Select base-nova (@base-ui/react)
└── __tests__/
    ├── settings-footer.test.tsx     # [nouveau]
    └── ...
lib/
├── env.ts                           # [modifié] ZPL_PAPER_SIZES + ZPL_SCAN_SUBNET (optionnel)
├── paper-sizes.ts                   # [nouveau, pur] parse/valide/trie par surface
├── paper-sizes.test.ts              # [nouveau]
├── print-settings-cookie.ts         # [nouveau, adapter client] cookie PRG
├── print-settings-cookie.test.ts    # [nouveau]
├── printer/
│   ├── discovery.ts                 # [nouveau, serveur] scan /24 port ZPL
│   ├── discovery.test.ts            # [nouveau] (logique pure + mock net)
│   ├── send.ts                      # [modifié] target optionnel { host, port }
│   └── send.test.ts                 # [modifié/ajout]
└── ean13/validate.ts                # [modifié] schéma étendu (paperId, printerAddress)
.env.example                         # [modifié] ZPL_PAPER_SIZES, ZPL_SCAN_SUBNET
specs/006-printer-paper-settings/    # [nouveau] artefacts de la feature
```

**Structure Decision**: entraîne sur le monopile existant (App Router) ; le pied
de barre latérale accueille la section Paramètres ; la découverte est une route
API serveur appelée à la demande par le sélecteur client ; la logique pure
(format papier, cookie, découverte) vit dans `lib/` comme les features
précédentes.

## Complexity Tracking

> Rien à justifier : aucune violation de la constitution (gates G1–G7 PASS,
> pas de couche ou dépendance supplémentaire).