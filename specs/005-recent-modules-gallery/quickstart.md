# Quickstart — Galerie des derniers modules utilisés

Guide de validation de bout en bout. Détails techniques : `contracts/recent-modules.md`
(logique + expiration), `contracts/cookie.md` (adaptateur), `contracts/ui.md`
(rendu), `data-model.md` (persistance).

## Prérequis

- Application lancée (`npm run dev`), catalogue contenant au moins le module
  EAN-13 (chemin `/ean13`).
- Navigateur avec cookies activés (aucune donnée initiale, cookie absent).

## Validation automatisée

```bash
npm test            # suite Vitest (logique pure, expiration, cookie, tracker, galerie)
npm run test:coverage  # couverture > 80 % exigée
npm run lint        # ESLint, aucun warning
npm run build       # build de production (SSR : galerie ou squelette dans le HTML)
```

Attendu : 0 échec, 0 warning, build vert. Couverture ≥ 80 %.

## Scénario A — Premier lancement (historique vide)

1. Ouvrir `http://localhost:3000/` (cookie absent).
2. **Attendu** : un **squelette de galerie** (formes de cartes, `role="status"`)
   est visible ; aucun message « Choisissez un module… » ; aucune carte.
3. **Attendu** : le squelette est présent **dans le HTML serveur initial**
   (aucun décalage d'hydratation, aucun flash), et **aucun cookie** n'est
   créé avant la première consultation.

## Scénario B — Utilisation d'un module puis retour à l'accueil

1. Ouvrir `/ean13` (clic barre latérale ou URL directe) — EAN-13 est consulté,
   le cookie `tagmaker_recent_modules` est écrit (`Max-Age` 30 jours).
2. Naviguer vers `/`.
3. **Attendu** : une **carte « EAN-13 »** avec sa description est affichée,
   titre et description identiques à la barre latérale ; la carte est rendue
   **dès le HTML serveur** (source de la page : carte visible).
4. Clic sur la carte → **Attendu** : ouverture de `/ean13`.

## Scénario C — Déduplication et persistance

1. Consulter `/ean13` plusieurs fois.
2. **Attendu** : la galerie ne contient qu'**une seule** carte EAN-13
   (0 doublon).
3. Recharger la page (`F5`) ou rouvrir l'onglet.
4. **Attendu** : EAN-13 reste affiché (persistance du cookie, SC-005).

## Scénario D — Éviction (capacité 4)

1. Consulter 4 modules distincts dans l'ordre, puis un 5ᵉ.
2. **Attendu** : la galerie affiche au plus 4 cartes, ordre du plus récent au
  plus ancien ; le module le plus ancien a disparu.

## Scénario E — Expiration après 1 mois (FR-010, SC-006)

1. Simuler un cookie contenant une entrée EAN-13 dont `lastUsedAt` date de
   plus de 30 jours (cookie manuel/modifié, ou test unitaire
   `filterValidEntries` avec `now` injecté).
2. Ouvrir `/`.
3. **Attendu** : aucune carte EAN-13 n'est affichée (entrée expirée filtrée) ;
   si c'était la seule entrée, le **squelette** s'affiche.

## Scénario F — Cookie corrompu / hors catalogue (FR-009, retour sûr)

1. Remplacer la valeur du cookie par du contenu invalide (JSON cassé) ou un
   `moduleId` inconnu du catalogue.
2. Ouvrir `/`.
3. **Attendu** : aucune erreur à l'écran ; l'entrée inconnue n'est pas rendue
   et une valeur corrompue est ignorée (historique traité comme vide pour la
   partie invalide).

## Scénario G — Non-régression

- La barre latérale (titres, infobulles, module actif, fil d'Ariane) reste
  fonctionnelle ; les vues `/ean13` et les URL inconnues (404 + coquille)
  s'affichent comme avant ; aucun `rel`/logo modifié ; l'enregistrement n'écrit
  jamais de secret ni de donnée hors `tagmaker_recent_modules`.