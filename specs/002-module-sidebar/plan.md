# Implementation Plan: Navigation modules via sidebar

**Branch**: `002-module-sidebar` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-module-sidebar/spec.md`

**Note**: Ce plan est rempli par la commande `/speckit.plan` ; son
en-tête « Input » reprend la demande utilisateur.

## Summary

Remplacer la galerie de cartes de l'accueil par une coquille de navigation
basée sur le bloc shadcn **sidebar-04** : une sidebar listant les modules
(enregistrés dans `lib/modules/registry.ts`), une zone de contenu principale
affichant le module sélectionné, et un SkeletonForm (gabarit squelettique)
comme état par défaut à la racine quand aucun module n'est affiché. La
sélection active est dérivée de l'URL ; l'API d'impression EAN-13 est
inchangée.

## Technical Context

**Language/Version**: TypeScript ; React 19.2.8 ; Node ≥ 20 (npm 11)

**Primary Dependencies**: Next.js 16.3.5 (App Router) ; shadcn/ui
`base-nova` — composants `sidebar`, `skeleton`, `separator`, `breadcrumb` ;
`@phosphor-icons/react` (icônes shadcn)

**Storage**: N/A — état de navigation dérivé de l'URL uniquement ; le registre
`lib/modules/registry.ts` est la source unique des modules

**Testing**: Vitest 5 + Testing Library (jsdom), couverture > 80 % (constitution)

**Target Platform**: navigateur (localhost), desktop + mobile

**Project Type**: web app (Next.js App Router)

**Performance Goals**: navigation instantanée sans requête (rendu statique des
pages `/` et `/ean13`)

**Constraints**: « uniquement shadcn pour gérer l'interface » (demande
utilisateur) : toutes les primitives UI proviennent de shadcn/ui ; thème dark
par défaut conservé ; aucune modification de l'API `POST /api/print/ean13`

**Scale/Scope**: 1 module actuel (EAN-13), 2 routes wrapperées (`/`, `/ean13`)
; shell conçu pour N modules sans changement structurel

## Constitution Check

*GATE : doit passer avant la recherche (Phase 0). Revérifié après la Phase 1.*

- **G1 — Tests obligatoires > 80 %** : testé par les composants coquille
  (`AppSidebar`, `SkeletonForm`, pages) ; exclusion `components/ui/**`
  conservée. OK
- **G2 — KISS/YAGNI** : pas de store global ni d'abstraction de navigation ;
  l'URL est la source de vérité ; suppression de la galerie inutilisée. OK
- **G3 — DRY** : liste des modules toujours issue du registre unique
  (`getLabelModules`). OK
- **G4 — Sécurité minimale** : aucun secret, aucune nouvelle route réseau,
  écoute localhost conservée. OK
- **G5 — Évolutivité** : shell commun, les modules conservent leur page et
  héritent de la sidebar sans modification. OK
- **G6 — Contrainte « uniquement shadcn »** : composition de primitives
  shadcn uniquement ; aucune dépendance UI supplémentaire. OK

**Toutes les portes passent ; aucune violation à justifier (table Complexity
Tracking vide).**

## Project Structure

### Documentation (this feature)

```text
specs/002-module-sidebar/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 : décisions (sidebar-04, SkeletonForm, URL)
├── data-model.md        # Phase 1 : LabelModule + sélection dérivée de l'URL
├── quickstart.md        # Phase 1 : scénarios A-E
├── contracts/
│   └── ui.md            # Phase 1 : contrat de la coquille (app shell)
└── tasks.md             # Phase 2 : /speckit.tasks (non créé par /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── layout.tsx           # Shell : SidebarProvider + AppSidebar + SidebarInset
│                        #   + Header (trigger/separator/breadcrumb) + Toaster
├── page.tsx             # Racine → <SkeletonForm /> (aucun module)
├── globals.css          # inchangé
└── ean13/page.tsx       # inchangé (formulaire EAN-13 dans le slot)

components/
├── app-sidebar.tsx      # Sidebar-04 adaptée : liste des modules (Link + isActive)
├── skeleton-form.tsx    # SkeletonForm (composé de Skeleton/Card shadcn)
├── header.tsx           # Header sticky (SidebarTrigger, Separator, Breadcrumb)
├── ean13-form.tsx       # inchangé
├── ui/                  # + sidebar, skeleton, separator, breadcrumb (shadcn)
└── (label-gallery.tsx supprimé)

lib/modules/registry.ts  # inchangé (LabelModule, getLabelModules)
```

**Structure Decision**: Projet single app (Next.js App Router) — option 1. Le
shell est composé dans le layout racine ; les pages restent des routes
statiques rendues dans le slot `SidebarInset`.

## Complexity Tracking

> Vide — aucune violation de la Constitution à justifier (toutes les portes
> passent).