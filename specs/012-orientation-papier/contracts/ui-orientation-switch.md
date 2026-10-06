# Contrat — Switch « Orientation » (Paramètres)

## Emplacement

Section Paramètres (pied de la barre latérale), même panneau que les
sélecteurs « Papier » et « Imprimante » (feature 006) : `components/settings-footer.tsx`.
Le switch s'ajoute comme nouvelle ligne « Orientation » dans le
panneau, en dessous des lignes existantes (champ « Papier » / « Imprimante »).

## Comportement

| État du switch | Affichage | Enabled | `rotated` effectif |
|----------------|-----------|---------|--------------------|
| Off | « Orientation » non activée | oui (format rotatable) | `false` |
| On | « Orientation » activée (antihoraire, haut à gauche) | oui (format rotatable) | `true` |
| Format incompatible | « Orientation » désactivée (couleur grisée) | **non** (`disabled`) | forcé `false` |

- Valeur par défaut : **désactivé** (rotation jamais active à l'installation,
  FR-007). Le switch lit l'état du cookie au chargement (comme les autres
  lignes) via `readPrintSettings()`.
- **Déclenchement immédiat** (FR-014) : un clic bascule l'état + écrit le
  cookie (`rotated`) ; aucune autre action requise.
- **Réinitialisation (FR-015)** : la bascule d'un format compatible vers un
  format incompatible écrit `rotated: false` et affiche le switch désactivé ;
  sans changement de format, un clic reste sans effet sur un format
  incompatible (aucune écriture, message/aria expliquant pourquoi : « format
  trop étroit »).
- Retour à un format compatible : le switch est réactivé mais **reste sur
  Off** (jamais de bascule automatique).
- A11Y : même pattern que les autres lignes (role `switch`/aria-label
  localisé, description optionnelle).

## Réinitialisation de la transmission

Chaque formulaire d'impression (`ean13-form`, `location-form`) transmet
`rotated` du cookie dans le corps de requête (`POST`) : le corps porte donc
toujours l'état réellement affiché (cohérence FR-005/FR-006).

## Données

- Lecture : `readPrintSettings().rotated` (`false` si absent) +
  `isRotatable(formatCourant, dpi)` pour `disabled`.
- Écriture : `writePrintSettings(settings)` — seul `rotated` modifié, autres
  champs inchangés.
- Le schéma de requête (`lib/*/validate.ts`) accepte `rotated` en booléen
  strict et renvoie `422` sinon (cohérence côté serveur).

## Exigences couvertes

FR-001 (paramètre visible et actionnable), FR-004 (non-régression format
normal), FR-007/FR-012 (mémorisation navigateur), FR-011 (carré → désactivé
pour EAN-13), FR-013/FR-014/FR-015 (désactivation, immédiateté, réinit).