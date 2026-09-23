# Quickstart — Validation de la feature 007 (spinner + Actualiser)

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-23

Scénarios de validation bout en bout de la feature « Découverte
d'imprimantes : spinner et actualisation ». Détails d'implémentation :
`tasks.md` (généré ensuite).

## Prérequis

- Dépendances installées (`npm install`), `.env` présent.
- Découverte réseau opérationnelle (feature 006) : `GET /api/printers/discover`
  répond `{ printers: [...] }` (ou 503 hors sous-réseau).

## Commandes de vérification automatisée

```sh
npx vitest run components/__tests__/settings-footer.test.tsx   # tests UI du footer
npx vitest run                                                 # suite complète
npm run lint                                                   # 0 warning
npx tsc --noEmit                                               # 0 erreur
npm run build                                                  # build vert
```

Attendu : tous verts, couverture > 80 %.

## Scénario A — Liste de formats papier dans `.env` (FR-001→003, vérifier)

1. Éditer `.env` :
   ```env
   ZPL_PAPER_SIZES=40x25, 50x25, 100x50
   ```
2. Redémarrer l'application.
3. Ouvrir le pied de barre latérale → liste « Papier ».
4. **Attendu** : les trois formats sont présents, dans l'ordre croissant de
   surface, libellés en millimètres. Un format invalide (`10x999`) ajouté dans
   la liste n'apparaît pas et ne casse pas l'affichage.

## Scénario B — Spinner pendant la recherche (FR-004→005)

1. Aucun cookie d'imprimante ; ouvrir le sélecteur « Imprimante ».
2. **Attendu** : pendant le scan, le pied du menu affiche « Recherche des
   imprimantes… » avec un **spinner en rotation** (à la place du bouton
   « Actualiser »).
3. **Attendu** : à la fin (trouvée ou non), le spinner et la ligne
   « Recherche… » disparaissent.

## Scénario C — Bouton « Actualiser » (FR-006→009)

1. Laisser la recherche initiale se terminer → la liste affiche les
   imprimantes (ou « Aucune imprimante détectée »).
2. **Attendu** : le bouton « Actualiser » est présent en pied de menu.
3. Cliquer « Actualiser ».
4. **Attendu** : le spinner réapparaît, le bouton disparaît, puis la liste est
   remplacée par les nouveaux résultats.
5. **Attendu** : le bouton n'est **jamais** visible pendant une recherche
   (test : re-cliquer pendant le scan n'est pas possible).

## Scénario D — Relance avec imprimante déjà sélectionnée (régression)

1. Cookie `printerAddress` défini (ex. `192.168.1.20`) → à l'ouverture,
   **aucun auto-scan** (comportement 006).
2. « Actualiser » est visible : cliquer relance bien un scan (le scan
   explicite fonctionne même avec une sélection existante), la sélection du
   déclencheur reste intacte pendant/après le scan.

## Scénario E — Non-régression de la découverte (bug print-ip-not-find)

1. Lancer le scan (ouverture ou « Actualiser ») sur le réseau de production.
2. **Attendu** : l'imprimante configurée dans `ZPL_PRINTER_HOST` apparaît
   dans la liste (ex. `192.168.1.63`) — cf. validation du bug
   `.specify/bugs/print-ip-not-find/`.

Attendus de référence complétés : contracts [ui.md](./contracts/ui.md),
modèle [data-model.md](./data-model.md).