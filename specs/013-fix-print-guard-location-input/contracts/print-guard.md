# Contract — Garde-fou « aucune imprimante sélectionnée »

**Feature**: 013-fix-print-guard-location-input | **Spec**: [spec.md](../spec.md)

Contrat d'interface utilisateur entre les formulaires d'impression et
l'utilisateur (le toast est la sortie visible du contrat ; il n'y a pas de
nouveau contrat réseau).

## Portée

- Module **EAN-13** (`components/ean13-form.tsx`) et module **Emplacement**
  (`components/location-form.tsx`).
- Chemins couverts dans chaque module :
  - envoi direct (quantité ≤ 2),
  - envoi après confirmation (quantité > 2),
  - mode simple et mode plage (Emplacement).

## Entrées / état

| Élément | Source | Signification |
|---------|--------|---------------|
| `printerAddress` | cookie `tagmaker_print_settings` lu au moment de la tentative (source de vérité unique, partagée avec le pied de page) | absente ou vide = aucune imprimante sélectionnée (« Non défini ») |
| Clic sur **Imprimer** ou **Confirmer** | utilisateur | tentative d'impression |

## Comportement

### Cas A — aucune imprimante sélectionnée (bloqué)

1. Aucune requête d'impression n'est émise (aucun appel vers
   `/api/print/ean13` ni `/api/print/location`).
2. Un toast d'erreur est affiché, message **littéral** :
   > `Aucune imprimante sélectionnée. Choisissez une imprimante dans les paramètres.`
3. Aucun envoi vers une imprimante de secours ou par défaut de
   l'environnement (SC-002).
4. L'état d'envoi du formulaire n'est pas modifié (pas de « en cours »).
5. Les validations de saisie existantes restent **prioritaires** : une saisie
   invalide produit son propre message et le garde-fou n'est pas atteint.

### Cas B — imprimante sélectionnée (autorisé)

Flux strictement inchangé : validations existantes (code, quantité, format de
papier, orientation, confirmation) puis envoi vers l'adresse sélectionnée.
Aucun changement observable (SC-004).

## Contrat API — inchangé (bornage)

Les routes `/api/print/*` conservent leur comportement actuel :
`printerAddress` optionnelle, fallback sur l'hôte de l'environnement absent
le cas échéant (contrat couvert par les tests de route existants). Le
garde-fou s'entend au niveau des flux de l'application (interface), pas des
appels directs à l'API (research R1).

## Critères d'acceptation liés

- SC-001 : 100 % des clics sans imprimante → toast + zéro envoi.
- SC-002 : zéro impression vers une imprimante de secours.
- Scénarios d'acceptation 1 à 6 de la spec (US1).

## Tests de contrat

- `components/__tests__/ean13-form.test.tsx` : sans imprimante → toast +
  `fetch` non appelé (chemin direct et chemin confirmation) ; avec
  imprimante → appel émis.
- `components/__tests__/location-form.test.tsx` : idem, mode simple et mode
  plage.
- `app/api/print/**/__tests__` : inchangés (non-régression du contrat API).
