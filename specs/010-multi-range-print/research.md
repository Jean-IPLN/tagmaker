# Recherche — Plages multiples (Feature 010)

**Input** : specification `spec.md` + demande UI explicite (« faire une ligne
par plage et les séparer avec un Separator shadcn, icon poubelle et + avec
phosphor icon »).

## Sujets résolus

### 1. Forme du contrat API pour plusieurs plages

- **Decision** : le mode `range` passe d'une paire unique à un **tableau de
  paires** :
  ```json
  { "mode": "range", "locationType": "classic",
    "ranges": [ { "startCode": "1A10", "endCode": "1A12" },
                { "startCode": "1B10", "endCode": "1B15" } ] }
  ```
  `ranges` : 1 à `MAX_RANGES` éléments ; chaque paire validée avec les règles
  de plage par **boîte** (même zone, ordre par axe, taille = produit ≤
  `MAX_RANGE_SIZE`) ; somme des tailles ≤ `MAX_TOTAL_LABELS` (= 1000, limite
  partagée).
- **Rationale** : une liste de paires est le JSON le plus simple ; la
  validation Zod par paire réutilise les règles existantes (DRY) ; le serveur
  concatène les expansions (ZPL inchangé, qui prend déjà `codes[]`).
- **Alternatives considérées** :
  - *N appels par plage* : rejeté — perd l'atomicité du job, N allers-retours,
    passe le même flux ZPL coupé impossible à garantir.
  - *Nouvelle route dédiée* : rejeté (YAGNI) — une seule route, changée en
    place ; aucun autre consommateur que le formulaire du module.
  - *Payload `startCodes`/`endCodes` parallèles* : rejeté — plus risqué
    (couplage d'index), pairer explicitement est plus lisible.

### 2. Identité des lignes dans l'état React (`ranges[]`)

- **Decision** : chaque plage possède un **identifiant stable** (`id`
  incrémental généré à l'ajout, type `RangeRow { id, startCode, endCode }`),
  utilisé comme `key` de la ligne.
- **Rationale** : la suppression au milieu du tableau ne doit pas réutiliser
  l'état d'une autre ligne (focus de la saisie segmentée préservé, transitions
  DOM propres). Coût minimal, corrige un piège classique des listes controlées.
- **Alternatives** : `key=index` — rejeté (problèmes de focus/état fantôme lors
  d'une suppression médiane).

### 3. Séparateurs et icônes (demande utilisateur)

- **Decision** : `components/ui/separator.tsx` (shadcn sur
  `@base-ui/react/separator`) **existe déjà** et est réutilisé : un `Separator
  orientation="horizontal"` entre chaque ligne de plage. Icônes **Phosphor**
  via `@phosphor-icons/react` : `Plus` (bouton « Ajouter une plage ») et
  `Trash` (action supprimer en bout de ligne, `variant="ghost"`).
- **Rationale** : composants et dépendances déjà présents (vérifiés dans le
  kit et `package.json`) — aucune nouvelle dépendance, cohérence visuelle avec
  le reste de l'application (header, settings-footer utilisent déjà Separator +
  Phosphor).
- **Alternatives** : bordures CSS custom — rejeté (duplication du style, pas
  d'accessibilité `role=separator`).

### 4. Identification de la plage fautive

- **Decision** : les erreurs Zod portent un `path` sur le champ de la paire
  (`ranges[i].startCode`) ; côté client, le message affiché devient
  **« Plage N : <message> »** (N = index + 1) via l'analyse du `path`.
- **Rationale** : satisfait FR-007 (identifier la plage) sans dupliquer les
  messages par paire dans le schéma ; le serveur garde un message générique
  stable, le client ajoute le contexte visuel (numérotation des lignes).
- **Alternatives** : embarquer « Plage N » dans chaque message Zod — rejeté
  (message figé dans le contrat, moins réutilisable).

### 5. Limites de volume

- **Decision** : `MAX_RANGES = 10` (≥ 1 plage toujours, « + » inopérant à 10) ;
  `MAX_TOTAL_LABELS = 1000` (somme des tailles), en plus de `MAX_RANGE_SIZE =
  1000` par paire (défensif ; en réalité ≤ 36 par paire via la nomenclature).
- **Rationale** : borne raisonnable sans complexité ; cohérent avec la limite
  de quantité existante (un job ≤ 1000 étiquettes) ; l'ordre de grandeur reste
  celui d'une impression physique.
- **Alternatives** : plages illimitées — rejeté (risque d'états extrêmes et
  d'erreurs liées à la taille du job) ; plancher « zéro plage » — rejeté
  (le formulaire garde toujours ≥ 1 plage, FR-003).

### 6. Génération ZPL

- **Decision** : **aucun changement**. `buildLocationZpl({ codes, … })`
  génère déjà un flux `^XA…^XZ` par code dans l'ordre du tableau : le serveur
  concatène `expandRange` de chaque plage en un seul tableau `codes`, somme
  des longueurs = `labels`. Confirmation client sur le total cumulé avant
  envoi.
- **Rationale** : KISS/DRY — la couche ZPL ignore le multi-plages ; l'ajout se
  résume à l'accumulation en amont. Contrat ZPL 009 inchangé
  ([contracts/zpl.md](./contracts/zpl.md)).
- **Alternatives** : générer un flux par plage (N jobs) — rejeté
  (perte d'atomicité, incohérent avec FR-005).

## Verdicts de faisabilité

| Sujet | Verdict | Preuve |
|-------|---------|--------|
| `Separator` shadcn | ✅ présent | `components/ui/separator.tsx` (shadcn/@base-ui) |
| Icônes `Plus` / `Trash` Phosphor | ✅ présents | `@phosphor-icons/react` (package.json + usage existant) |
| Génération ZPL multi | ✅ aucun changement | `buildLocationZpl` prend `codes[]` (`lib/zpl/location.ts`) |
| Validation par paire 009 | ✅ réutilisable | `lib/location/validate.ts` (`superRefine`, `expandRange`) |
| Rendu segmenté début/fin | ✅ réutilisable | `LocationCodeInput` (cases fixes `#D` en dynamique) |