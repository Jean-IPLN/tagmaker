# Guide de validation rapide — Navigation modules via sidebar

Scénarios de validation de bout en bout. Contrat : [contracts/ui.md](./contracts/ui.md),
modèle : [data-model.md](./data-model.md).

## Prérequis

- App scaffoldée (Next.js + shadcn base-nova), module EAN-13 en place.
- Tests unitaires : `npm test` ; exécution app : `npm run dev`.
- Contrainte : l'interface est gérée uniquement par des composants shadcn.

## Scénario A — Coquille par défaut (racine)

1. `npm run dev`, ouvrir `http://localhost:3000/`.
2. **Attendu** — la coquille s'affiche : sidebar à gauche listant le module
   **EAN-13** (nom + description), header avec bouton de repli et fil
   d'Ariane, et dans la zone principale un **SkeletonForm** (gabarit
   squelettique de formulaire : champ code + champ quantité + bouton attendus
   en squelette). Aucune zone vide, aucune carte « galerie ».

## Scénario B — Sélection d'un module

1. Depuis la racine, cliquer sur **EAN-13** dans la sidebar.
2. **Attendu** — URL `/ean13` ; le formulaire EAN-13 réel remplace le
   SkeletonForm dans la zone principale ; l'entrée « EAN-13 » de la sidebar est
   visuellement active.
3. Revenir à la racine → le SkeletonForm réapparaît, aucune entrée active.

## Scénario C — Accès direct à un module

1. Ouvrir directement `http://localhost:3000/ean13` (nouvel onglet).
2. **Attendu** — coquille + formulaire EAN-13, entrée active correcte.

## Scénario D — Repli / petit écran

1. Desktop : cliquer le trigger (ou `cmd/ctrl+B`) → sidebar repliée, contenu
   inchangé ; relancer → re-dépliée.
2. Réduire la fenêtre (largeur mobile) → la sidebar passe en panneau mobile ;
   le déclencheur reste accessible et les modules cliquables.

## Scénario E — Cohérence registre

1. Ajouter un second `LabelModule` au registre → il apparaît dans la sidebar
   sans autre changement ; un module retiré disparaît.
2. Visiter une URL inconnue → erreur « introuvable » du framework avec la
   sidebar toujours visible.

## Vérifications automatisées

- `npm test` — suite verte ; composants coquille et module couverts.
- Couverture globale > 80 % (constitution).
- `npm run lint` — aucun warning.
- `npm run build` — typecheck et build OK, routes `/` et `/ean13` présentes.