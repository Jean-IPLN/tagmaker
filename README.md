# TagMaker

Application web locale d'impression d'étiquettes à code-barres EAN-13 sur
imprimante thermique ZPL (via réseau TCP).

Stack : Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui,
Vitest (tests > 80 % de couverture), zod (validation partagée client/serveur).

## Prérequis

- Node.js ≥ 20
- Une imprimante ZPL joignable sur le réseau local (port raw TCP 9100)

## Configuration

Copier `.env.example` vers `.env` et ajuster si besoin :

| Variable | Défaut | Rôle |
|----------|--------|------|
| `ZPL_PRINTER_HOST` | `192.168.1.63` | adresse de l'imprimante |
| `ZPL_PRINTER_PORT` | `9100` | port raw TCP de l'imprimante |
| `ZPL_RESOLUTION_DPI` | `203` | résolution de l'imprimante (dpi) |
| `ZPL_PAPER_SIZES` | *(requise)* | formats de papier — **source de vérité de la taille d'étiquette**, ex. `40x25, 75x25, 100x50, 100x150` ; le format par défaut est la plus petite surface |
| `ZPL_SCAN_SUBNET` | *(vide)* | sous-réseau de découverte, ex. `192.168.1.0` (sinon dérivé de `ZPL_PRINTER_HOST`) |

## Lancement

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:3000`. La barre latérale liste les modules ; la
vue d'accueil affiche une **galerie de cartes** des modules récemment
consultés (les 4 plus récents), ou une silhouette (skeleton) de 4 cartes quand
l'historique est vide. Le module **EAN-13** permet de saisir un code (13
chiffres, clé de contrôle vérifiée) et une quantité, puis d'imprimer. Le
module **Emplacement** imprime des code-barres **Code 128** pour un
emplacement unique (classique ou dynamique `#D`) ou une plage (une étiquette
par emplacement, quantité masquée en mode plage). Une
quantité supérieure à 2 déclenche une modal de confirmation explicite. Le
module affiché est mis en évidence dans la barre latérale et dans le fil
d'Ariane en en-tête ; la navigation est persistante sur toutes les vues.

## Paramètres (pied de barre latérale)

Une section **Paramètres** est épinglée au pied de la barre latérale sur toutes
les vues :

- **Papier** : formats issus de `ZPL_PAPER_SIZES` (tri par surface croissante,
  le format par défaut = plus petite surface). La sélection est mémorisée côté
  client et appliquée à l'impression suivante.
- **Imprimante** : l'adresse mémorisée est réaffichée directement sans scan ;
  sinon le sélecteur passe en **état warn** (« Non défini » + icône
  d'avertissement) et un **scan réseau** est lancé à l'ouverture
  (`GET /api/printers/discover`, scan /24 local, port 9100, aucune donnée
  envoyée). Pendant la recherche, le pied du menu affiche un **spinner** ;
  une recherche terminée, ce même emplacement propose le bouton **Actualiser**
  qui relance un scan complet sans effacer la sélection. Un choix explicite
  est nécessaire pour mémoriser une adresse ; aucune imprimante détectée
  n'est pas une erreur, mais un état affiché.

Les réglages sont stockés dans le cookie `tagmaker_print_settings`
(30 jours, `SameSite=Lax`, non HttpOnly) : `paperId` et `printerAddress`.
Le formulaire envoie ces valeurs dans le corps de la requête (modules
EAN-13 et Emplacement) ; sans `paperId`, l'impression utilise le format par
défaut de `ZPL_PAPER_SIZES` (plus petite surface) — aucune impression bloquée.

## Tests

```bash
npm test            # suite Vitest
npm run test:coverage  # couverture (> 80 % exigé)
npm run lint        # ESLint, aucun warning
```

## Architecture du module EAN-13

- `lib/ean13/validate.ts` — validation EAN-13 partagée client/serveur
- `lib/zpl/build.ts` — génération du flux ZPL (fonction pure) : code-barres
  centré en largeur/hauteur et dimensionné au maximum scannable du format choisi
- `lib/printer/send.ts` — envoi raw TCP vers l'imprimante
- `app/api/print/ean13/route.ts` — API `POST /api/print/ean13`
- `components/ean13-form.tsx` / `ean13-confirm-dialog.tsx` — formulaire + modal critique
- `lib/paper-sizes.ts` — formats de papier : parsing de `ZPL_PAPER_SIZES`,
  tri par surface, résolution par identifiant
- `lib/print-settings.ts` / `lib/print-settings-cookie.ts` — logique et
  adaptateur browser du cookie `tagmaker_print_settings` (`paperId`,
  `printerAddress`)
- `lib/printer/discovery.ts` — scan réseau /24 (probe TCP, lot borné, budget
  de temps, aucune donnée écrite)
- `app/api/printers/discover/route.ts` — API `GET /api/printers/discover`
  (`200 { printers }` / `503` sous-réseau indéterminable)
- `components/settings-footer.tsx` — section **Paramètres** au pied de la
  barre latérale (sélecteurs Papier et Imprimante)

## Modules récemment utilisés (accueil)

- `lib/recent-modules.ts` — logique pure : enregistrement, déduplication,
  expiration (30 jours), filtrage sur le catalogue, sérialisation
- `lib/recent-modules-cookie.ts` — adaptateur navigateur : lecture/écriture du
  cookie `tagmaker_recent_modules` (30 jours, `SameSite=Lax`, non chiffré)
- `components/recent-modules-tracker.tsx` — enregistre chaque consultation
  (observation de l'URL) ; rendu invisible, monté dans `app/layout.tsx`
- `components/recent-modules-gallery.tsx` — galerie de cartes (4 max, du plus
  récent au plus ancien) ou squelette ; reçoit la liste validée en props
- `app/page.tsx` — serveur : lit le cookie (`cookies()`), filtre et passe les
  identifiants à la galerie (rendu SSR, pas de flash)

Un module non consulté depuis plus d'un mois et les entrées hors catalogue
sont ignorées à la lecture ; le cookie ne contient jamais de secret.

## Navigation par module

- `lib/modules/registry.ts` — source unique des modules (`LabelModule`)
- `components/app-sidebar.tsx` — barre latérale encastrée (prébuild shadcn
  sidebar-08, variante `inset`) avec logo « tag » (icône phosphor) ; la liste
  affiche les modules **par leur titre seul** et la description apparaît dans
  une **infobulle à droite** au survol
- `components/header.tsx` — bouton de repli + fil d'Ariane du module courant
- `app/layout.tsx` — coquille `SidebarProvider` / `AppSidebar` / `SidebarInset`
- `app/icon.svg` — favicon « tag » (pictogramme identique au logo, thème
  sombre) ; sert la balise `rel="icon"` sur toutes les vues

Le module actif est dérivé de l'URL (`usePathname`), sans store ni état global.

Note : le flux ZPL utilise la commande native `^BE` (EAN-13) ; le `^FD`
transporte les 12 chiffres de données, l'imprimante calcule la clé de contrôle.
Le code-barres (barres + chiffres lisibles) est centré sur l'étiquette et
occupe tout l'espace scannable du format papier sélectionné (largeur module
bornée par le standard, zones de silence préservées).