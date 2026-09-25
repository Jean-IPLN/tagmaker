# Interface web — Contrat UI : module Emplacement, plages multiples

Évolutions du formulaire du module Emplacement (feature 009, `location-form.tsx`)
pour le mode **Plage**, selon la demande : **une ligne par plage**, lignes
**séparées par un `Separator` shadcn**, bouton **« + »** (icône Phosphor
`Plus`) et **poubelle par ligne** (icône Phosphor `Trash`).

## Composants réutilisés (kit existant, aucun ajout)

| Élément | Composant | État |
|---------|-----------|------|
| `Separator` horizontal | `components/ui/separator.tsx` (shadcn) | ✅ existe |
| Icône « + » | `Plus` — `@phosphor-icons/react` | ✅ existe |
| Icône poubelle | `Trash` — `@phosphor-icons/react` | ✅ existe |
| Saisie segmentée début/fin | `LocationCodeInput` (feature 009, cases fixes `#D` en dynamique) | ✅ réutilisé |

## Rendu du mode Plage

```text
Plage 1    [7|A|5|9]  [7|A|6|9]        🗑 Trash
──────────────────────────────────────────  ← Separator
Plage 2    [7|A|7|0]  [7|A|7|3]        🗑 Trash
──────────────────────────────────────────  ← Separator
[+ Ajouter une plage]                      ← bouton (icône Plus, Phosphor)
```

- Chaque plage est **une ligne** : deux `LocationCodeInput` segmentés
  (« Code début » / « Code fin ») côte à côte, précédés du libellé « Plage N »
  (numérotation visible, 1-based) et suivis d'une action **`Trash`**
  (`variant="ghost"` bornée à la ligne) pour la supprimer.
- Les lignes sont **séparées** par un `<Separator orientation="horizontal" />`
  (largeur pleine).
- Le bouton « + Ajouter une plage » (icône **`Plus`**, `variant="outline"` ou
  équivalent) ajoute une plage vierge à la fin ; **désactivé/masqué** quand le
  nombre maximal (`MAX_RANGES` = 10) est atteint.
- La poubelle de la **dernière plage restante** est désactivée (minimum une
  plage toujours présente) — FR-003.

## État et gestion (formulaire)

- `useState` → `ranges: RangeRow[]` avec `RangeRow = { id, startCode, endCode }`
  (`id` stable, incrémental, sert de `key`) ; initialisé avec **une** plage
  vierge. Conservés : `mode`, `locationType`, `code`, `quantity`,
  `isConfirming`, `isSending`.
- **Ajouter** (`+`) : `setRanges([...ranges, { id: nextId(), startCode: "",
  endCode: "" }])` (ignoré si `length ≥ MAX_RANGES`).
- **Supprimer** (poubelle, ligne `id`) : filtre la ligne ; **ignoré** si
  `length === 1`.
- **Synchro de zone** : le 1er caractère (combobox `1`/`2`) est partagé entre
  le **début et la fin d'une même plage** — toute sélection d'une zone sur un
  des deux champs s'applique à l'autre champ de cette plage, les caractères
  restants saisis étant préservés. **Aucune synchro entre plages** : chaque
  plage choisit sa propre zone librement (lots indépendants, FR-011) — le
  schéma n'exige la même zone qu'**au sein** de chaque paire (défense API si
  le couple début/fin d'une plage venait à diverger).
- Type global : basculer l'interrupteur Type applique `fixedIndexes` et
  `placeholders` (dynamique `#D`) à **toutes** les lignes — réutilise
  `LOCATION_CODE_PLACEHOLDERS`.

## Validation et retours visibles

- La validation client partage le **même schéma Zod** que le serveur
  (union discriminée `mode`, `ranges` 1..10) : premier `issue` affiché via
  `toast` ; si le `path` porte sur `ranges[i]` (ex. `ranges[2].startCode`),
  le message est préfixé **« Plage N : … »** (N = i+1) — FR-007.
- Une plage vierge ou incomplète rend l'ensemble invalide (aucun envoi).
- `quantity` reste masquée en mode Plage ; le compteur informatif affiche le
  **total cumulé** d'étiquettes sur toutes les plages.

## Confirmation de volume

- `computeCount()` = **somme** des tailles de toutes les plages (`expandRange`
  par paire, `expandRanges`) ;
- au seuil existant (total > 2) → `LocationConfirmDialog` « Imprimer N
  étiquettes ? » avec N = total cumulé ; sinon impression directe ;
- `labels` du toast de succès = total cumulé.

## Soumission

```json
{ "mode": "range", "locationType": "<classic|dynamic>",
  "ranges": [ { "startCode": "…", "endCode": "…" }, … ] }
```

avec `paperId`/`printerAddress` issus de `readPrintSettings()` (accordés
conditionnellement, comme EAN-13). Gestion inchangée des réponses 409/503 et
des erreurs réseau (pattern 009).