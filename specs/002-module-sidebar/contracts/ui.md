# Contrat d'interface — Coquille de navigation (app shell)

**Branch**: `002-module-sidebar` | **Spec**: [spec.md](../spec.md) |
**Data model**: [data-model.md](../data-model.md)

Interface **client** (composition de composants). Il n'y a pas de nouvelle
route d'API ; l'API `POST /api/print/ean13` est inchangée.

## 1. Structure de la coquille

Chaque route de l'application est rendue à l'intérieur de la coquille :

```text
SidebarProvider
├── AppSidebar                    # sidebar-04 (floating), liste des modules
│   └── SidebarMenu               # une entrée par LabelModule (registry)
│       └── SidebarMenuButton render={<Link href={module.href} />} + isActive
├── SidebarInset
│   ├── Header (sticky)
│   │   ├── SidebarTrigger        # repli/panneau mobile
│   │   ├── Separator
│   │   └── Breadcrumb            # nom de l'app à la racine, nom du module sinon
│   └── Slot contenu = {children} # page courante
└── Toaster                        # conservé
```

## 2. Contrat du slot de contenu

- À la racine `/` : le slot contient **`SkeletonForm`** (gabarit squelettique
  d'un formulaire) — aucun module sélectionné.
- Sur une route de module (`/ean13`, etc.) : le slot contient le **formulaire
  du module** concerné.
- Tout futur module doit fournir un formulaire à placer dans ce slot et une
  entrée `LabelModule` dans le registre ; il hérite automatiquement de la
  sidebar.

## 3. Règles d'état (source de vérité : URL)

- État actif : `pathname === module.href`. À `/`, aucune entrée active.
- La sélection persiste au rechargement et via les liens directs.
- Repli sidebar : état local au `SidebarProvider` (non persisté). Raccourci
  clavier `cmd/ctrl+B` ; panneau mobile dédié.

## 4. Composants UI

Toutes les primitives proviennent de shadcn/ui (`base-nova`) : `sidebar`
(`Sidebar`, `SidebarProvider`, `SidebarInset`, `SidebarMenu…`, `SidebarTrigger`),
`skeleton`, `separator`, `breadcrumb`, `button`, ainsi que les composants
existants du formulaire EAN-13. Aucun composant UI maison (hors composition).

## 5. Critères de conformité

- Chaîne : `/` → coquille + `SkeletonForm` ; `/ean13` → coquille + `Ean13Form`.
- Sidebar visible sur toutes les routes (ex. not-found inclus).
- Entrée active cohérente avec le module affiché.