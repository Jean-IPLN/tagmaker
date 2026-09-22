# Contrat UI — Galerie de l'accueil

Définit le comportement observable de l'accueil (FR-001..003, FR-008).

## Composant : `RecentModulesGallery` (client, sur props)

Rendu de la page d'accueil `app/page.tsx`. Le composant est **client** mais ne
lit pas lui-même le stockage : il reçoit en props les ids de modules récents
**déjà validés par le serveur** (cookie lu en SSR).

- **Historique vide / cookie absent** : squelette de galerie — plusieurs formes
  de cartes de même allure que les cartes réelles, contenant `role="status"`
  et une étiquette accessible (ex. « Chargement de la galerie… »). Aucun
  message d'invitation redondant.
- **Historique non vide** : grille responsive de **cartes**, une par module,
  du plus récent au plus ancien (FR-001).

### Carte de module

- Affichage : **titre** du module (ex. « EAN-13 ») + **description** identiques
  à ceux de la barre latérale (source : catalogue) (FR-002).
- Clic / activation → navigation vers l'`href` du module (FR-003).

## Composant : `RecentModulesTracker` (client)

Monté dans la coquille `app/layout.tsx`, sur toutes les vues.

- Observe le chemin courant ; lorsqu'il correspond à l'`href` d'un module du
  catalogue → enregistre ce module comme utilisé (FR-005) via la logique pure
  (lecture cookie → `recordModule` → filtres → `writeRecentCookie`).
- Aucun rendu visible (aucun DOM).

## Squelette de galerie

- Nombre de formes de cartes cohérent avec la grille (4 maximum).
- Reprend la géométrie des cartes (hauteur, largeur) pour assurer la
  « correspondance » d'allure exigée par FR-008 / SC-004.
- Annoncé aux aides techniques via `role="status"`.

## Accueil — rendu SSR

- `app/page.tsx` lit le cookie en **serveur** et applique
  `getRecentModuleIds` avant de passer les ids à la galerie cliente.
- Résultat : au premier chargement, les cartes (si le cookie contient des
  entrées valides) **ou** le squelette (sinon) sont rendus **dès le HTML
  serveur** — zéro flash, zéro décalage d'hydratation.

## Accueil — remplacement de l'ancienne vue

- L'ancien composant fonctionnel de l'accueil (message d'invitation +
  silhouette de formulaire) est **retiré** (scénario 5) ; aucun autre écran ne
  doit le référencer.