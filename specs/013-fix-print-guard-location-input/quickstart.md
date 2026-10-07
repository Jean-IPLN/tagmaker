# Quickstart — 013-fix-print-guard-location-input

**Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

Guide de **validation** (exécutable de bout en bout). Aucun code
d'implémentation ici : la mise en œuvre appartient à `tasks.md`.

## Prérequis

- Branche dédiée créée avant toute modification : `feature/013-fix-print-guard-location-input`
  (constitution « Développement & Qualité » — jamais de code sur `master`).
- Dépendances installées : `npm install` (écosystème npm, `package-lock.json`).
- Serveur de développement : `npm run dev` (application locale, port Next
  habituel).
- Imprimante physique **non requise** pour les scénarios de blocage (le but
  est justement qu'aucun envoi n'ait lieu). Pour le scénario de
  non-régression avec imprimante : imprimante ZPL joignable sur le LAN
  (adresse choisie dans le pied de page « Imprimante »), ou observer le
  résultat via les tests automatisés.

## Commandes de contrôle

| Commande | Attendu |
|----------|---------|
| `npm test` | suite verte (tests unitaires + tests d'installation) |
| `npm run lint` | aucun warning ni erreur |
| `npx tsc --noEmit` | aucune sortie (types propres) |
| `npm run test:coverage` | couverture > 80 % |

## Scénario V1 — Blocage sans imprimante (US1)

**Prérequis**: aucun cookie de réglage d'imprimante (navageur neuf ou cookie
`tagmaker_print_settings` effacé) → pied de page affiche « Non défini ».

1. Module **EAN-13** : saisir un code valide, quantité `1`, cliquer
   **Imprimer**.
   - **Attendu**: toast `Aucune imprimante sélectionnée. Choisissez une
     imprimante dans les paramètres.` ; aucune étiquette imprimée ; aucun
     message d'erreur de saisie.
2. Module **EAN-13** : quantité `5` (boîte de confirmation), cliquer
   **Imprimer** puis **Confirmer**.
   - **Attendu**: la confirmation s'ouvre, puis, à la confirmation, le même
     toast ; rien n'est imprimé.
3. Module **Emplacement** : code valide, mode **Un seul**, cliquer
   **Imprimer**.
   - **Attendu**: même toast, aucun envoi.
4. Module **Emplacement** : mode **Plage** (`1A10` → `1A12`), cliquer
   **Imprimer**.
   - **Attendu**: même toast, aucun envoi.
5. Contrôle négatif croisé : saisie **invalide** + aucune imprimante.
   - **Attendu**: le message de validation de la saisie s'affiche (priorité
     conservée), pas le toast d'imprimante.

## Scénario V2 — Non-régression avec imprimante (SC-004)

1. Pied de page → sélectionner une imprimante (état mémorisé).
2. Répéter V1.1 à V1.4 avec une saisie valide.
   - **Attendu**: chaque impression part normalement (toast de succès
     « Impression envoyée… »), y compris via la confirmation et en plage ;
     aucun toast d'absence d'imprimante.
3. Recharger l'application.
   - **Attendu**: la sélection d'imprimante est retrouvée ; l'impression
     reste autorisée.

## Scénario V3 — Alignement de la frappe (US2)

**Module Emplacement, type Classique** (état initial : zone affichée `1`).

1. Taper `5` dans la **2e** position, `B` en 3e, `2` en 4e.
   - **Attendu**: les segments affichent `1 5 B 2` — la zone est **restée
     `1`** (jamais remplacée par un caractère tapé). Ce code est rejeté par
     la validation au moment de l'impression (`15B2` : la 2e position doit
     être une lettre, message FR-007 inchangé).
2. Changer la zone en `2` via le sélecteur.
   - **Attendu**: positions 2-4 intactes ; code `25B2`.
3. Effacer la position du milieu (`Backspace`).
   - **Attendu**: seule cette position se vide ; les autres ne décalent pas.
4. Coller `5B2` sur la 2e position.
   - **Attendu**: chaque caractère rejoint sa position (`1 5 B 2`), aucun
     décalage résiduel.

**Type Dynamique** (basculer le commutateur Type) :

5. Saisir la 4e position.
   - **Attendu**: `#` et `D` verrouillés aux positions 2-3 ; la zone reste
     inchangée ; seul le 4e caractère change.

**Mode Plage** :

6. Renseigner `1A10` → `1A12`, puis changer la zone de la borne de début.
   - **Attendu**: la borne de fin suit la zone (synchro conservée,
     FR-008) ; éditer un caractère ne modifie pas la zone.

## Références

- Contrats : [contracts/print-guard.md](./contracts/print-guard.md),
  [contracts/location-code-input.md](./contracts/location-code-input.md)
- Modèle : [data-model.md](./data-model.md)
- Décisions : [research.md](./research.md)
