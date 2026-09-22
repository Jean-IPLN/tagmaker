# Recherche — Sidebar-08 et descriptions au survol

## 1. Bloc prébuild `sidebar-08` (source officielle)

- **Source** : ui.shadcn.com/blocks/sidebar#sidebar-08 ; registre brut :
  `https://ui.shadcn.com/r/styles/new-york-v4/sidebar-08.json`
- **Description officielle** : « An inset sidebar with secondary navigation. »
- **Incohérence avec le bloc installé localement (base-nova)** : le bloc v4
  public est versionné `new-york` (lucide-react, `asChild`, primitives
  radix-style) alors que le projet utilise `base-nova` (`@base-ui/react`,
  prop `render`, `@phosphor-icons/react`). On **réutilise donc la structure et
  les classes du prébuild**, interprétées par les primitives `base-nova`
  installées.

### Structure du prébuild (page d'accueil)

```tsx
<SidebarProvider>
  <AppSidebar />                   // variant="inset"
  <SidebarInset>
    <header className="flex h-16 shrink-0 items-center gap-2">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>…</Breadcrumb>
      </div>
    </header>
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{slot}</div>
  </SidebarInset>
</SidebarProvider>
```

### Structure du prébuild (AppSidebar)

```tsx
<Sidebar variant="inset" {...props}>
  <SidebarHeader>   // marque : boîte icône + nom + sous-titre
  <SidebarContent>  // NavMain (groupes collapsibles) + NavProjects + NavSecondary (mt-auto)
  <SidebarFooter>   // NavUser (avatar + dropdown)
</Sidebar>
```

### Parties du prébuild écartées (YAGNI, non requises par la spec)

- **NavMain collapsible avec sous-menus** : nos modules sont plats (1 niveau).
- **NavProjects + dropdown-menu** : aucune notion de « projets » dans le
  domaine.
- **NavUser + avatar + dropdown-menu** : pas d'utilisateur connecté.
- **Icônes par entrée (lucide/phosphor)** : la spec impose titres seuls ;
  une icône de marque seule est conservée (entête).

→ Dépendances du bloc non retenues : `collapsible`, `dropdown-menu`, `avatar`.
Déjà présentes : `sidebar`, `breadcrumb`, `separator`. **Aucune nouvelle
dépendance.**

## 2. Infobulle « tooltip right » pour la description

- **Contrainte** : `SidebarMenuButton` possède une prop `tooltip`, mais le
  composant installé ne l'affiche **que lorsque la sidebar est repliée en
  icônes** (`hidden={state !== "collapsed" || isMobile}`).
- **Décision** : pour afficher la description **plus droite de l'entrée, quel
  que soit l'état de la sidebar**, on enveloppe chaque entrée de module avec
  le composant `Tooltip` de shadcn (déjà installé : `components/ui/tooltip.tsx`,
  `components/ui/sidebar.tsx` importe `Tooltip`/`TooltipTrigger`/`TooltipContent`) :
  `TooltipTrigger` = entrée (lien), `TooltipContent side="right"` = description.
- **Comportement attendu** (par le composant shadcn) : ouverture au survol ou
  au focus clavier, fermeture au retrait du pointeur — conforme aux exigences
  d'accessibilité de la spec (US2, Edge Cases).
- **Title seul en liste** : les entrées rendent uniquement `module.name`.

## 3. Variante « inset » — points techniques

- `variant="inset"` ajoute le padding `p-2` au conteneur (`data-slot="sidebar-container"`)
  et le crochet de test `data-variant="inset"` sur le wrapper desktop
  (`data-slot="sidebar"`). Testable en jsdom (desktop : `isMobile=false`,
  `window.innerWidth=1024` par défaut de jsdom).
- `collapsible` par défaut (`offcanvas`) conservé comme dans le prébuild ;
  le repli passe par `SidebarTrigger`. L'infobulle droite fonctionne dans
  tous les états (FR-006 satisfaite en tout état).
- En-tête ip0 du prébuild : `h-16`, pas de `border-b`, conteneur interne
  `px-4` ; le header actuel (002) est aligné sur ce gabarit.

## 4. Interactions de test (jsdom)

- **Liste titres seuls** : `screen.queryByText(/Imprimer des étiquettes/)`
  absent du document après rendu de `AppSidebar`.
- **Infobulle au survol** : `fireEvent.pointerEnter` (ou `mouseEnter`) sur le
  trigger (lien du module) → contenu `TooltipContent` présent avec la
  description ; `pointerLeave` → contenu absent. Variante alternative :
  `user-event.hover()`.
- **Variante inset** : `querySelector('[data-slot="sidebar"]')` →
  `data-variant="inset"`.
- **Non-régression** : les 46 tests existants (dont `app-sidebar`,
  `header`) doivent rester verts ; les assertions d'état actif et de
  breadcrumb sont inchangées.

## 5. Décisions consolidées

| Décision | Justification | Alternatives considérées |
|----------|---------------|--------------------------|
| Réutiliser la structure du prébuild sidebar-08 (`variant="inset"`, header `h-16`, slot `p-4 pt-0`) | Premier exigence explicite de l'utilisateur (« utilise bien le prébuild sidebar-08 ») | Interpréter librement la « variante encastrée » sans se caler sur le bloc → moins fidèle |
| Infobulle shadcn `Tooltip` explicite `side="right"` sur chaque entrée, au lieu de la prop `tooltip` de `SidebarMenuButton` | La prop intégrée n'apparaît que repliée en icônes ; la spec impose la description à droite au survol, en tout état | Utiliser la prop `tooltip` → description invisible en mode étendu (échec FR-003) |
| Écarter NavProjects/NavUser/NavMain-collapsible (démo) | YAGNI/KISS : aucune donnée utilisateur, projet ou sous-menu dans le domaine | Reproduire le bloc intégralement avec des données factices → code mort non conforme |
| `collapsible` défaut (offcanvas) conservé | Fidélité au prébuild | `collapsible="icon"` (002) → s'éloigne du gabarit demandé |