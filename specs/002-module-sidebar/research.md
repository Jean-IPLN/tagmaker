# Research — Navigation modules via sidebar

**Branch**: `002-module-sidebar` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

## 1. Bloc sidebar-04 de shadcn

**Decision**: Utiliser le bloc shadcn **sidebar-04** (« A floating sidebar with
submenus ») comme base du shell de navigation, adapté au style `base-nova` du
projet (via `npx shadcn add sidebar-04`).

**Rationale**: Le bloc fournit exactement la structure demandée : une sidebar
repliable listant des entrées (`SidebarMenuButton` avec `isActive`), une zone
de contenu principale (`SidebarInset`) et un header avec `SidebarTrigger`,
`Separator` et `Breadcrumb`. Le composant `SidebarProvider` gère l'état
déplié/plié sur desktop et le repli en panneau mobile (`Sheet`), ce qui couvre
la FR-007 sans code custom.

**Alternatives considered**:
- sidebar-01 (simple, sans sous-menus) : plus basique mais sans la mise en
  évidence du module actif centralisée dans `SidebarMenuButton`.
- sidebar-07 (collapse en icônes) : utile à plus long terme, complexité
  d'icônes par module non requise (YAGNI).

## 2. Composants shadcn à ajouter

**Decision**: Ajouter via `npx shadcn add …` : `sidebar`, `skeleton`,
`separator`, `breadcrumb` (le bloc 04 embarque la plupart ; `skeleton` et
`breadcrumb` sont des dépendances nommées de nos composants).

**Rationale**: Ce sont les seules primitives nécessaires au shell. Les entrées
de modules réutiliseront `SidebarMenuButton` avec `render={<Link … />}` (pattern
documenté pour la navigation), évitant tout `Link` custom.

**Alternatives considered**: Composant `NavMain` des blocs dashboard — plus
riche, inutile pour N entrées plates (YAGNI).

## 3. État par défaut : SkeletonForm

**Decision**: Créer `components/skeleton-form.tsx` composé uniquement de
primitives shadcn (`Skeleton`, `Card`, `Label` non actif puisque placeholder) —
gabarit reprenant la silhouette du formulaire EAN-13 (label + champ + bouton),
d'après le pattern « Form » de la doc `Skeleton`.

**Rationale**: Répond à FR-004 (aucune zone vide à la racine) sans nouvel état
ni fetch. Le composant reste générique pour tout module futur.

**Alternatives considered**: Page d'accueil vide, indicateur de chargement
spinner — rejeté : la demande explicite est un SkeletonForm.

## 4. Données des modules et sélection active

**Decision**: La liste provient de `lib/modules/registry.ts` inchangé
(`LabelModule : id, name, description, href`). La sélection active est dérivée
de l'URL (`usePathname`) : `isActive = pathname === module.href` ; à la racine
(`/`), aucune entrée active et la zone principale affiche `SkeletonForm`.

**Rationale**: DRY (le registre reste l'unique source), KISS (pas de store —
l'URL est la source de vérité de la sélection), et la persistance de la
navigation est gratuite (rechargement, liens directs FR-005/SC-005).

**Alternatives considered**: état `useState` global ou contexte de module —
rejeté : duplication de la source de vérité et perte des accès directs.

## 5. Structure de l'application

**Decision**: Le shell vit dans le layout racine (server component) :
`<SidebarProvider><AppSidebar /><SidebarInset><HeaderBreadcrumb />{children}</SidebarInset></SidebarProvider>`.
`children` = la page courante (`/` → `SkeletonForm`, `/ean13` → `Ean13Form`).
Suppression de `components/label-gallery.tsx` et de son test.

**Rationale**: La sidebar est visible sur 100 % des vues (FR-005, SC-003) avec
un seul point de composition ; les routes modules existantes sont conservées
(couplage faible, upgradable).

**Alternatives considered**: Sidebar déclarée par page — duplication et risque
d'incohérence ; shell dans un layout dédié `app/(app)/layout.tsx` — sur-
conception pour 2 routes (YAGNI).

## 6. Tests

**Decision**: Tests vitest/jsdom couvrant : `app-sidebar` (liste des modules,
`isActive` selon `/`, lien fonctionnel), `skeleton-form` (rendering), composant
page racine (sidebar + SkeletonForm), navigation vers `/ean13`. Retirer le test
`label-gallery.test.tsx`. Maintenir l'exclusion de `components/ui/**` de la
couverture.

**Rationale**: Constitution (tests obligatoires, couverture > 80 %). Le
comportement des composants shadcn sous test (sidebar mobile, etc.) reste couvert
par le package amont.

## 7. Contrainte utilisateur « uniquement shadcn »

**Decision**: Toute primitive d'interface provient de shadcn/ui (base-nova).
Aucun composant UI maison (hors composition) n'est créé ; `skeleton-form.tsx` et
`app-sidebar.tsx` sont des compositions de primitives shadcn.

**Rationale**: Contrainte explicite du client ; alignée sur KISS (pas de CSS
custom ni de bibliothèque supplémentaire).

## 8. Compatibilité existante

**Decision**: Aucune API ni route de module n'est modifiée. `POST
/api/print/ean13` et `Ean13Form` restent intacts ; seule la coquille d'affichage
(landing + layout) change.

**Rationale**: Évolutivité (constitution §VI), risque de régression minimal —
la suite EAN-13 existante (38 tests) doit rester verte.