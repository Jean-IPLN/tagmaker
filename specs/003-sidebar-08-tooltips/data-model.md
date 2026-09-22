# Modèle de données — Sidebar-08 et descriptions au survol

## Entité principale : `LabelModule` (inchangée)

| Champ | Type | Rôle | Présentation |
|-------|------|------|--------------|
| `id` | `string` | identifiant unique du module | non rendu |
| `name` | `string` | titre du module | **rendu dans la liste** (libellé de lien) |
| `description` | `string` | description du module | **rendue exclusivement dans l'infobulle droite au survol** |
| `href` | `string` | destination de navigation | portée par le lien d'entrée |

Source unique : `lib/modules/registry.ts` (`getLabelModules()`). **Aucune
modification** de cette entité, de ses validations ou de son registre.

## État de navigation (dérivé, inchangé)

- Module affiché : dérivé de l'URL courante (`pathname === module.href`).
- Entrée active : mise en évidence via l'état `active` du bouton de menu
  (`data-active`), conservée à l'identique.

## État d'infobulle (transitoire, non modélisé)

- L'ouverture/fermeture de l'infobulle est un état local du composant
  `Tooltip` de shadcn ; aucun store, aucune donnée persistée.
- Règles observables (issues de la spec) :

| Événement | Résultat |
|-----------|----------|
| Survol d'une entrée | infobulle droite contenant `description` de ce module |
| Retrait du pointeur | infobulle fermée |
| Deux entrées survolées successivement | une seule infobulle visible à la fois (remplacement) |

## Transitions d'état

Aucune transition de données : la feature n'ajoute, ne modifie ni ne supprime
aucune entrée du registre. Seuls les comportements de présentation changent
(liste → titres seuls ; description → infobulle).