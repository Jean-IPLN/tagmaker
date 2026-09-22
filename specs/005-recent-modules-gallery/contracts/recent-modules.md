# Contrat — Logique d'historique des modules utilisés

Contrat des fonctions pures de manipulation de l'historique. Aucun de ces
symboles n'accède au navigateur ni aux cookies (testables sans DOM).

## Constantes

- `MAX_RECENT_MODULES = 4` — capacité maximale de l'historique / galerie.
- `MAX_RECENT_AGE_MS = 30 * 24 * 60 * 60 * 1000` — **30 jours** : seuil de
  sortie automatique (FR-010).

## Type

- `RecentModuleEntry = { moduleId: string; lastUsedAt: number }`

## `recordModule(entries, moduleId, timestamp)`

Enregistre une consultation de `moduleId` à `timestamp`.

- **Retour** : une **nouvelle liste** (immutable) d'entrées dédupliquée et
  tronquée à `MAX_RECENT_MODULES`.
- `moduleId` déjà présent → sa `lastUsedAt` est remplacée par `timestamp`, il
  passe en **tête** de liste, sans doublon.
- `moduleId` absent → nouvelle entrée en tête.
- La liste résultat garde les autres entrées dans leur ordre relatif, puis est
  tronquée (l'entrée la plus ancienne est évincée en cas de dépassement).
- **Exigences couvertes** : FR-004, FR-005, FR-006 ; scénarios 2, 3, 4.

## `filterValidEntries(entries, availableModuleIds, now = Date.now())`

Ne conserve que les entrées **non expirées** et dont le `moduleId` correspond
au catalogue.

- **Retour** : nouvelle liste filtrée, ordre inchangé.
- Entrée dont `lastUsedAt < now - MAX_RECENT_AGE_MS` → **expirée**, exclue
  (FR-010).
- Entrée au `moduleId` hors catalogue → exclue silencieusement (FR-009).
- **Paramètre `now` injecté** pour des tests déterministes (le défaut est
  l'heure courante).
- **Exigences couvertes** : FR-009, FR-010 ; edge cases « module absent du
  catalogue » et « module non consulté depuis plus d'1 mois ».

## `getRecentModuleIds(entries, availableModuleIds, now = Date.now())`

Projette l'historique sur le catalogue.

- **Retour** : ids des modules « récemment utilisés », valides, non expirés,
  sans doublon, ordonnés du plus récent au plus ancien, tronqués à
  `MAX_RECENT_MODULES`.
- Équivaut à `filterValidEntries` (mêmes filtres + `now`), tri décroissant sur
  `lastUsedAt`, puis déduplication en conservant la **première** occurrence (la
  consultation la plus récente gagne).
- **Exigences couvertes** : FR-001 (ordre), FR-004, FR-010.

## Format d'échange (sérialisation, sans I/O)

- `serializeEntries(entries)` → chaîne JSON compacte des entrées.
- `parseEntries(raw)` → entrées si la chaîne est un JSON valide dont le tableau
  ne contient que des entrées bien formées ; **sinon `[]`** (retour sûr).
  Les entrées dont les champs sont invalides (id non-chaîne, horodatage
  non-entier) sont **écartées** individuellement.