# Modèle de données — Module EAN-13

La v1 est sans persistance (aucune base de données) : les données ci-dessous
décrivent les objets métier transitoires manipulés à chaque demande
d'impression.

## Entités

### LabelModule (galerie)

Représente un type d'étiquette imprimable proposé dans la galerie.

| Champ | Type | Contrainte |
|-------|------|------------|
| `id` | string | unique, identifiant stable du module (`"ean13"`) |
| `name` | string | nom affiché (`"EAN-13"`) |
| `description` | string | description courte affichée dans la galerie |
| `href` | string | chemin de la page du module |

Note : la galerie est construite à partir d'une liste de modules. En v1 un
seul module existe (`ean13`) ; la liste est conçue pour être étendue sans
modifier les modules existants (PRINCIPLE: Évolutivité).

### LabelRequest (demande d'étiquettes)

Demande d'impression soumise par l'utilisateur (transitoire).

| Champ | Type | Contrainte |
|-------|------|------------|
| `ean13` | string | 13 chiffres exactement, clé de contrôle (mod 10) valide |
| `quantity` | number | entier ≥ 1 ; si > 2 => confirmation critique requise |

Validation (règle partagée client/serveur, DRY) :
- `ean13` : `/^\d{13}$/` + checksum mod 10 (algorithme EAN/UCC).
- `quantity` : entier ≥ 1, maximum 1000 (borne de sécurité contre les boucles
  d'impression accidentelles).

### PrintJob (ordre d'impression)

Représente l'envoi d'une demande vers l'imprimante ZPL (transitoire).

| Champ | Type | Contrainte |
|-------|------|------------|
| `labelRequest` | LabelRequest | demande associée |
| `zpl` | string | flux ZPL généré (`^XA` … `^XZ`, code-barres `^BE`) |
| `status` | enum | `"pending"` → `"sent"` / `"failed"` |
| `error` | string? | message d'erreur si `status = failed` |

Transitions d'état :
- `pending` : génération du ZPL terminée, prêt à l'envoi.
- `sent` : flux ZPL accepté par la socket d'imprimante.
- `failed` : connexion/écriture refusée ou en erreur ; le message d'erreur
  est renvoyé à l'interface (aucun échec silencieux — FR-009).

## Règles de validation (rappel)

| Règle | Valeur refusée | Comportement |
|-------|----------------|--------------|
| EAN-13 | longueur ≠ 13, caractères non numériques, checksum invalide | rejet + message clair, pas d'impression (FR-008) |
| Quantité | vide, 0, négative, non entière | rejet + message clair, pas d'impression (FR-008) |
| Quantité > 2 | confirmation absente | impression bloquée tant que non confirmée (FR-007) |
| Doublon | soumission pendant impression en cours | nouveau déclenchement refusé (FR-010) |