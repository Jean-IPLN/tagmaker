# Data Model — Navigation modules via sidebar

**Branch**: `002-module-sidebar` | **Spec**: [spec.md](./spec.md)

Cette fonctionnalité ne change pas la persistance des données ; elle introduit
un état de navigation dérivé. Le modèle existant des modules est inchangé et
documenté ici pour référence.

## Entités

### LabelModule (seul, inchangé)

Source : `lib/modules/registry.ts` (registre unique, DRY).

| Champ | Type | Règle |
|-------|------|-------|
| `id` | `string` | unique, sinon le registre rejette l'enregistrement |
| `name` | `string` | libellé affiché |
| `description` | `string` | description affichée |
| `href` | `string` | route de la page du module (chemin relatif de l'app) |

Relations : aucun. Un module ↔ une page de formule → zone de contenu du shell.

### Sélection courante (état dérivé, non persisté)

- Représentée par le **chemin d'URL courant** (`usePathname`).
- Racine (`/`) : **aucun** module sélectionné → zone principale = `SkeletonForm`.
- Chemin d'un module (`module.href`) : module sélectionné → zone principale =
  formulaire du module ; entrée de la sidebar active (`isActive = pathname ===
  module.href`).
- Chemin inconnu : erreur « introuvable » du framework, shell toujours visible.

Règles de cohérence :
- Une seule sélection à la fois (une seule URL). Recharger/revenir en arrière
  préserve la sélection (état dans l'URL, pas en mémoire).

## Transitions

| État | Action | État suivant |
|------|--------|--------------|
| Racine (SkeletonForm) | clic sur l'entrée d'un module | Page du module (formulaire affiché) |
| Page d'un module | retour/navigation vers `/` | Racine (SkeletonForm) |
| Page d'un module A | clic sur l'entrée du module B | Page du module B |
| Tout état | repli/ouverture sidebar | État inchangé, sidebar repliée/dépliée |

## Validation

Aucune entrée utilisateur nouvelle : la validation s'applique aux formulaires
existants (EAN-13), inchangée. L'état de navigation est dérivé de l'URL côté
client, sans écriture.