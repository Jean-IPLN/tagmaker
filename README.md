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
| `ZPL_LABEL_WIDTH_MM` | `40` | largeur de l'étiquette (mm) |
| `ZPL_LABEL_HEIGHT_MM` | `25` | hauteur de l'étiquette (mm) |
| `ZPL_RESOLUTION_DPI` | `203` | résolution de l'imprimante (dpi) |

## Lancement

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:3000`. La barre latérale liste les modules ; la
vue d'accueil affiche une **galerie de cartes** des modules récemment
consultés (les 4 plus récents), ou une silhouette (skeleton) de 4 cartes quand
l'historique est vide. Le module **EAN-13** permet de saisir un code (13
chiffres, clé de contrôle vérifiée) et une quantité, puis d'imprimer. Une
quantité supérieure à 2 déclenche une modal de confirmation explicite. Le
module affiché est mis en évidence dans la barre latérale et dans le fil
d'Ariane en en-tête ; la navigation est persistante sur toutes les vues.

## Tests

```bash
npm test            # suite Vitest
npm run test:coverage  # couverture (> 80 % exigé)
npm run lint        # ESLint, aucun warning
```

## Architecture du module EAN-13

- `lib/ean13/validate.ts` — validation EAN-13 partagée client/serveur
- `lib/zpl/build.ts` — génération du flux ZPL (fonction pure)
- `lib/printer/send.ts` — envoi raw TCP vers l'imprimante
- `app/api/print/ean13/route.ts` — API `POST /api/print/ean13`
- `components/ean13-form.tsx` / `ean13-confirm-dialog.tsx` — formulaire + modal critique

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