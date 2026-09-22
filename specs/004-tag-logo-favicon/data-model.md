# Modèle de données — Logo et favicon « tag »

## Entités

**Aucune entité de données nouvelle.**

La feature 004 est purement visuelle : elle n'introduit ni persistance, ni
champ, ni relation. Les seuls éléments touchés sont :

- `components/app-sidebar.tsx` — rendu de l'entête de marque (logo) ;
- `app/icon.svg` — nouvel artefact statique (favicon) ;
- `app/favicon.ico` — fichier par défaut supprimé.

Aucune évolution du registre `LabelModule` (`lib/modules/registry.ts`) ni des
routes existantes (accueil, `/ean13`, 404).

## Règles de validation

Sans objet (aucune donnée). Les seules contraintes applicables sont visuelles
et énoncées dans les FR : cohérence symbole logo/favicon (FR-004), réseau
libre de tout favori par défaut (FR-002), présence du logo sur toutes les vues
(FR-005).

## Transitions d'état

Sans objet.