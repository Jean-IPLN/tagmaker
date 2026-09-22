# Implementation Plan: Sidebar-08 et descriptions au survol

**Branch**: `003-sidebar-08-tooltips` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-sidebar-08-tooltips/spec.md`

**Note**: Ce plan est rempli par la commande `/speckit.plan` ; l'en-tête
« Input » reprend la demande utilisateur.

## Summary

Refondre le contrôle navide existant (002) sur le **bloc shadcn prébuild
sidebar-08** (« An inset sidebar with secondary navigation »,
ui.shadcn.com/blocks/sidebar#sidebar-08) : variante encastrée (`variant="inset"`),
en-tête `h-16` sans bordure, zone de contenu `p-4 pt-0`. La liste des modules
affiche **uniquement les titres** ; la description de chaque module est
affichée au survol dans une **infobulle shadcn positionnée à droite** de
l'entrée. Tout le reste (mise en évidence de l'entrée active, fil d'Ariane,
persistance sur 404, repli mobile) est conservé sans régression. Aucune
nouvelle dépendance : `tooltip`, `sidebar`, `breadcrumb`, `separator` déjà
installés.

## Technical Context

**Language/Version**: TypeScript ; React 19.2.8 ; Node ≥ 20 (npm 11)

**Primary Dependencies**: Next.js 16.3.5 (App Router) ; shadcn/ui
`base-nova` ; bloc prébuild **sidebar-08** (ui.shadcn.com/r/styles/new-york-v4/
sidebar-08.json) reproduit à l'identique dans le périmètre conservé ;
`@phosphor-icons/react` (icône de marque)

**Storage**: N/A — état de navigation dérivé de l'URL ; description de module
conservée dans le registre `lib/modules/registry.ts` (non rendue en liste,
consommée par l'infobulle)

**Testing**: Vitest 5 + Testing Library (jsdom), couverture > 80 %
(constitution) ; interactions infobulle simulées (survol/retrait du pointeur)

**Target Platform**: navigateur (localhost), desktop + mobile

**Project Type**: web app (Next.js App Router)

**Performance Goals**: aucune régression de rendu statique (`/`, `/ean13`) ;
infobulle → ouverture/fermeture sans requête

**Constraints**: « utiliser le prébuild sidebar-08 » (demande utilisateur) ;
« uniquement shadcn pour gérer l'interface » (demande 002, reportée) ; thème
dark conservé ; API `POST /api/print/ean13` intacte

**Scale/Scope**: 1 module (EAN-13), 3 fichiers de présentation modifiés
(`app-sidebar.tsx`, `site-header`/`header`, `app/layout.tsx`) ; aucune
modification de registre ni de routage

## Constitution Check

*GATE : doit passer avant la recherche (Phase 0). Revérifié après la Phase 1.*

- **G1 — Tests obligatoires > 80 %** : nouveaux cas (liste sans description,
  infobulle droite au survol, fermeture au retrait) + non-régression des 46
  tests existants. Exclusion `components/ui/**` conservée. OK
- **G2 — KISS/YAGNI** : on adapte le prébuild à nos données (modules du
  registre) ; les parties démo du bloc (sous-menus collapsibles, liste de
  projets avec menu contextuel, avatar/menu utilisateur, icônes démo) sont
  rejetées comme non requises par la spec. OK
- **G3 — DRY** : liste et descriptions toujours issues de
  `getLabelModules()` (source unique) ; pas de duplication des libellés.
  OK
- **G4 — Sécurité minimale** : aucun secret, aucune route réseau, écoute
  localhost conservée (aucun changement applicatif réseau). OK
- **G5 — Évolutivité** : le prébuild sidebar-08 est réutilisé tel quel dans
  sa variante encoustrée → migration fidèle, structure stable pour N modules.
  OK
- **G6 — Contrainte « uniquement shadcn / prébuild shadcn »** : l'interface
  reste composée exclusivement de primitives et du bloc shadcn. OK

**Toutes les portes passent ; aucune violation à justifier (table Complexity
Tracking vide).**

*Revérifié après Phase 1 (conception) : le design (recherche ci-après) reste
sans nouvelle dépendance (YAGNI vérifié — parties démo du bloc écartées),
sans modification de données ni de réseau (G3/G4 OK), et fidèle au prébuild
sidebar-08 demandé (G6 OK).*

## Project Structure

### Documentation (this feature)

```text
specs/003-sidebar-08-tooltips/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 : bloc prébuild sidebar-08, infobulle droite
├── data-model.md        # Phase 1 : LabelModule inchangé, présentation de la description
├── quickstart.md        # Phase 1 : scénarios A-E
├── contracts/
│   └── ui.md            # Phase 1 : contrats de présentation (sidebar, header, slot)
└── tasks.md             # Phase 2 : /speckit.tasks (non créé par /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # SidebarInset → header (prébuild) + div flex p-4 pt-0
│                        #   (Toaster et fonts inchangés, dark conservé)
├── page.tsx             # inchangé (SkeletonForm à la racine)
└── ean13/page.tsx       # inchangé (formulaire)

components/
├── app-sidebar.tsx      # Sidebar variant="inset" (prébuild) ; groupe « Modules »
│                        #   titres seuls + Tooltip side="right" (description)
├── header.tsx           # ajusté au header h-16 du prébuild (trigger/séparateur/breadcrumb)
├── skeleton-form.tsx    # inchangé
└── ui/                  # sidebar, tooltip, breadcrumb, separator, skeleton (déjà présents)

lib/modules/registry.ts  # inchangé (LabelModule, getLabelModules)
```

**Structure Decision**: Projet single app (Next.js App Router) — option 1.
On reprend la structure exacte du bloc prébuild sidebar-08 pour la coquille
(`SidebarProvider` → `AppSidebar` `variant="inset"` → `SidebarInset` →
header `h-16` → slot `flex flex-1 flex-col gap-4 p-4 pt-0`) et on y branche
les modules du registre en liste titres + infobulle droite.

## Complexity Tracking

> Vide — aucune violation de la Constitution à justifier (toutes les portes
> passent).