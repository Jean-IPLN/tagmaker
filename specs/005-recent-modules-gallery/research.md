# Recherche & décisions — Galerie des derniers modules utilisés

## Décision — Persistance de l'historique (directive utilisateur : cookies)

- **Decision**: Persistance dans un **cookie** du navigateur,
  `tagmaker_recent_modules`, valeur JSON URL-encodée : tableau d'entrées
  `{ moduleId, lastUsedAt }` (timestamp ms), capacité 4. Attributs :
  `path=/`, `SameSite=Lax`, `Max-Age=30 jours` (raffiné à chaque écriture),
  **non `HttpOnly`** (lu et écrit côté client).
- **Rationale**: Directive explicite de l'utilisateur (« utilise les cookie
  pour stocker les recent »). Un cookie convient à un historique minuscule et
  non sensible (ids de modules du catalogue + instants), persiste au-delà du
  rechargement et des sessions (Max-Age), et est **lisible côté serveur** :
  l'accueil peut être rendu en SSR avec les cartes dès le premier chargement.
- **Alternatives considered**:
  - `localStorage` (première conception) : directive remplacée par l'utilisateur ;
    rejeté.
  - `IndexedDB` : surdimensionné ; rejeté (KISS).
  - Sessions serveur / ronde réseau : constitution interdit l'apport réseau
    non sollicité ; rejeté.

## Décision — Expiration après 1 mois sans utilisation

- **Decision**: Toute entrée dont `lastUsedAt` est plus ancienne que
  **30 jours** (`MAX_RECENT_AGE_MS`) est **retirée de l'historique** à chaque
  traitement (filtrage au filtre des entrées valides). La durée de vie du
  cookie (`Max-Age=30 jours`) est rafraîchie à chaque écriture, alignée sur le
  seuil.
- **Rationale**: Directive utilisateur (« si un module n'est pas utiliser plus
  de 1 mois ca le sort des recent »). Une donnée obsolète n'est jamais rendue ;
  l'alignement du Max-Age évite de garder un cookie « mort » en base.
- **Alternatives considered**: expire au se moment de la consultation seulement
  (éviction paresseuse) : l'utilisateur a demandé une sortie « automatique »,
  le filtrage à la lecture garantit l'effet sur 100 % des ouvertures (SC-006).
  Différer la suppression à l'écriture uniquement expose des cartes obsolètes
  si le module est consulté plus d'1 mois après ; rejeté.

## Décision — Déclencheur d'enregistrement « module utilisé »

- **Decision**: Un composant client, monté dans la coquille (`app/layout.tsx`),
  observe l'URL courante ; dès que le chemin correspond à l'`href` d'un module
  du catalogue, ce module est enregistré comme utilisé (réécriture du cookie).
- **Rationale**: Le parcours « consulter (ouvrir) la page du module » est
  couvert dans tous les cas : clic dans la barre latérale, clic sur une carte
  de la galerie, saisie directe de l'URL, navigation précédent/suivant. Une
  seule source de vérité, découplée des événements de clic (SOC/DRY).
- **Alternatives considered**: enregistrement au clic : ne couvre ni l'URL
  directe ni le retour arrière ; rejeté. Hook dupliqué sur chaque page :
  rejeté (DRY).

## Décision — Rendu SSR : galerie dès le premier chargement

- **Decision**: `app/page.tsx` est un **composant serveur** qui lit le cookie
  (`cookies()` de Next.js) et transmet les entrées valides à une **galerie
  cliente** (rendu des cartes, ou squelette si le cookie est vide/absent).
  La lecture du cookie déclenche un rendu dynamique de la page d'accueil.
- **Rationale**: 
  - Plus de « flash » ni décalage d'hydratation : la galerie (ou le squelette)
    est rendue par le serveur au premier chargement — SC-001 (instantané),
    SC-004 (squelette au premier lancement).
  - Contrat UI maintenu : historique vide → squelette (`role="status"`) ; non
    vide → cartes.
  - L'écriture reste client-side (composant de suivi), le serveur ne fait que
    lire.
- **Alternatives considered**: galerie cliente qui lit le cookie au montage
  (comme pour `localStorage`) : matérialise un squelette même quand des cartes
  existent, et réintroduit un risque de décalage d'hydratation ; rejeté.

## Décision — Structure du code

- **Decision** (SOC) :
  - `lib/recent-modules.ts` — *fonctions pures* : enregistrer (déduplication +
    éviction), **filtre d'expiration (30 j)**, filtre whitelist catalogue, tri
    du plus récent au plus ancien, capacité 4. Aucun accès au navigateur →
    testable unitairement. Le format des entrées (encodage cookie) y est
    défini (parse/sérialisation sans I/O).
  - `lib/recent-modules-cookie.ts` — *adaptateur navigateur* : lecture/écriture
    du cookie (lecture seule côté client), valeur JSON URL-encodée, retour sûr
    (parse invalide → vide).
  - `components/recent-modules-gallery.tsx` — *composant client*, reçoit les
    entrées en props (fournies par le serveur) : rend les cartes ou le
    squelette.
  - `components/recent-modules-tracker.tsx` — *composant client* : observe
    l'URL et enregistre l'usage (réécrit le cookie).
  - `app/page.tsx` — *serveur* : lit le cookie (`cookies()`), applique les
    filtres, rend la galerie.
- **Rationale**: séparation logique pure / côté navigateur ; SSR centralise la
  lecture pour un rendu immédiat.

## Décision — Remplacement de l'accueil actuel

- **Decision**: `SkeletonForm` (silhouette de formulaire) et son test deviennent
  obsolètes : la nouvelle accueil les remplace. L'ancien message « Choisissez un
  module dans la barre latérale » disparaît (FR-008, scénario 5).
- **Rationale**: YAGNI — du code mort n'est pas livré.

## Décision — Aucune nouvelle dépendance

- **Decision**: Aucune dépendance supplémentaire. Cookie natif (browser +
  `cookies()` Next), primitives shadcn `ui/card` et `Skeleton`,
  `lib/modules/registry.ts` réutilisés.
- **Rationale**: KISS ; le besoin est couvert par l'écosystème existant.

## Sécurité (constitution)

- Aucun secret dans le cookie : seuls des ids de modules (whitelist) et des
  instants, pas de données personnelles ni de jetons.
- Attention particulière : le cookie n'est **pas `HttpOnly`** (il doit être lu
  et écrit côté client) mais **ne contient aucune donnée sensible** — analyse
  de la constitution : pas de secret en clair, ✔.
- Les ids de modules sont **restreints au catalogue** (whitelist) : toute entrée
  dont l'id n'existe pas dans le catalogue est filtrée au rendu (FR-009) ; le
  contenu rendu provient du catalogue lui-même (échappement React natif), une
  valeur de cookie malveillante ne peut donc pas injecter de contenu.
- Écriture/lecture du cookie encapsulées avec retour sûr : cookie corrompu
  (JSON invalide) → historique vide, l'accueil ne plante jamais.
- `SameSite=Lax` : le cookie n'est pas envoyé sur requêtes cross-site
  (écoute localhost, apport réseau non sollicité absent).