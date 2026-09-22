# Modèle de données — Galerie des derniers modules utilisés

Aucune nouvelle persistance serveur. Le seul état introduit est l'historique
des modules utilisés, conservé dans un **cookie** du navigateur
(directive utilisateur).

## Entité : Entrée d'historique (RecentModuleEntry)

Représente la dernière consultation d'un module du catalogue.

| Champ | Type | Rôle | Validation |
|-------|------|------|------------|
| `moduleId` | chaîne | référence un module du catalogue (`LabelModule.id`) | non vide ; **doit appartenir au catalogue** (whitelist) |
| `lastUsedAt` | nombre entier | instant de la dernière consultation (ms epoch) | entier strictement positif ; **pas plus ancien que 30 jours** (FR-010) |

## Entité : Galerie

Ensemble **dérivé** — jamais stocké — des entrées d'historique valides,
ordonnées de la plus récente à la plus ancienne.

- Contient au plus 4 modules (`MAX_RECENT_MODULES = 4`, confirmé par
  l'utilisateur).
- Une entrée dont le `moduleId` n'existe plus dans le catalogue est exclue
  (FR-009).
- Une entrée dont la dernière consultation date de **plus de 30 jours**
  (`MAX_RECENT_AGE_MS` = 30 jours) est exclue (FR-010, SC-006).
- Les doublons sont impossibles : enregistrer un module déjà présent le
  remonte en tête avec un `lastUsedAt` actualisé, sans créer de seconde entrée
  (FR-005, FR-006).

## Règles de transition

1. **Consultation d'un module** (`moduleId`, `lastUsedAt = maintenant`) :
   - si `moduleId` absent des entrées → ajout en tête ;
   - si `moduleId` présent → mise à jour de `lastUsedAt`, remontée en tête ;
   - toute nouvelle liste est tronquée à 4 entrées (le plus ancien sort).
2. **Traitement à la lecture (rendu accueil + suivi)** : entrées expirées
   (> 30 jours) puis hors catalogue filtrées, ordre récent → ancien,
   projection sur le catalogue (titre, description, chemin).
3. **Rafraîchissement du support** : à chaque écriture, le cookie est réécrit
   avec un `Max-Age` de 30 jours (aligné sur le seuil d'expiration).

## Persistance (cookie)

- Nom : `tagmaker_recent_modules`.
- Valeur : JSON (URL-encodé) d'un tableau d'entrées `{ moduleId, lastUsedAt }`.
- Attributs : `path=/`, `SameSite=Lax`, `Max-Age=30 jours`, **non `HttpOnly`**
  (lu et écrit côté client), aucun contenu sensible.
- Lecture : cookie absent, JSON invalide ou forme inattendue → historique vide
  (retour sûr, aucun plantage).
- Écriture : après chaque enregistrement ; échec silencieux — le rendu ou le
  suivi ne doit jamais échouer à cause du stockage.
- Lecture serveur (SSR) : l'accueil lit le cookie pour rendre la galerie dès
  le premier chargement.