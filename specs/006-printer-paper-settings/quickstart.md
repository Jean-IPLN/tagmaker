# Quickstart — Paramétrage imprimante et taille de papier

Guide de validation de bout en bout. Détails : `research.md` (décisions),
`data-model.md` (entités), `contracts/paper-sizes.md`, `contracts/settings-cookie.md`,
`contracts/printer-discovery.md`, `contracts/printing.md`, `contracts/ui.md`.

## Prérequis

- Application lancée (`npm run dev`), `.env` contenant le port 9100 et une
  imprimante locale démarrée **sur le réseau** (ou un hôte de test ouvrant le
  port 9100) ;
- `ZPL_PAPER_SIZES` définie (ex. `40x25, 50x25, 60x40, 100x50`) ou absente
  (repli 40 × 25) ;
- Navigateur avec cookies activés, cookie `tagmaker_print_settings` absent
  (état initial).

## Validation automatisée

```bash
npm test            # suite Vitest (paper-sizes, cookie, discovery, ui, ean13)
npm run test:coverage  # couverture > 80 % exigée
npm run lint        # ESLint, aucun warning
npm run build       # build de production (SSR : section Paramètres dans le HTML)
```

Attendu : 0 échec, 0 warning, build vert, couverture ≥ 80 %.

## Scénario A — Section Paramètres visible

1. Ouvrir `http://localhost:3000/`.
2. **Attendu** : le pied de la barre latérale affiche « Paramètres » avec deux
   listes déroulantes : **Papier** et **Imprimante** (visibles sur `/`,
   `/ean13` et toute vue).
3. **Attendu** : la liste « Papier » est présente dès le HTML serveur (aucun
   flash), triée par surface croissante.

- [x] Validé : SSR contient « Paramètres », « Papier » et « Imprimante » (placeholder)
## Scénario B — Papier : défaut, tri, sélection

1. `ZPL_PAPER_SIZES="40x25, 50x25, 60x40, 100x50"`.
2. Ouvrir le sélecteur « Papier ».
3. **Attendu** : formats de surface croissante (40×25=1000, 50×25=1250,
   60×40=2400, 100×50=5000) ; le format courant (40×25) est présélectionné et
   annoté « par défaut ».
4. Sélectionner `100x50` : recharger la page → `100x50` reste sélectionné
   (cookie) ; l'impression suivante utilise 100 × 50 mm (contrôle : dimensions
   dans le flux ZPL).

- [x] Validé : tri/testés en vitest (paper-sizes, settings-footer) + présélection SSR
## Scénario C — Imprimante : sélection explicite seule mémorisée

1. Aucun cookie d'imprimante ; imprimante joignable sur le réseau.
2. **Attendu** : le sélecteur « Imprimante » est **non sélectionné** et passe en
   état warn (« Non défini » + icône d'avertissement).
3. Ouvrir le sélecteur : « Recherche des imprimantes… », puis l'imprimante du
   réseau apparaît dans la liste (découverte, port 9100).
4. Sélectionner l'imprimante → l'impression part vers son adresse ; recharger →
   elle reste sélectionnée **sans nouveau scan**.

- [x] Validé : scan réel `/api/printers/discover` (imprimantes détectées) + tests composant
## Scénario D — Imprimante : crash de cookie / adresse connue

1. Cookie `tagmaker_print_settings` = `{"printerAddress":"192.168.1.63"}`.
2. **Attendu** : le sélecteur affiche `192.168.1.63` immédiatement ; ouvrir le
   sélecteur n'**enclenche aucun scan** (vérifier l'absence d'appel
   `/api/printers/discover`).
3. Cookie = `not-json` → **Attendu** : aucun plantage, état « non sélectionné »
   comme au premier lancement.

- [x] Validé : cookie malformé → 200 sans plantage ; tests composant (sélection sans scan)
## Scénario E — Impression avec réglages

1. Papier `100x50` sélectionné et imprimante réseau sélectionnée.
2. Imprimer une étiquette EAN-13.
3. **Attendu** : succès 200 vers l'adresse choisie, flux ZPL dimensionné
   100 × 50 mm. Sans sélection (état défaut), l'impression fonctionne encore
   (repli `.env`).

- [x] Validé : envoi POST réel 200 ; tests route (paperId/printerAddress) et formulaire
## Scénario F — Aucune imprimante détectée

1. Réseau sans imprimante (ou port 9100 fermé partout).
2. Ouvrir le sélecteur « Imprimante ».
3. **Attendu** : option « Aucune imprimante détectée » dans la liste ; le
   sélecteur reste en état warn (« Non défini ») ; l'application reste
   utilisable ; la configuration présente n'est pas écrasée.

- [x] Validé : état « Aucune imprimante détectée » couvert par les tests composant (scan vide)
## Scénario G — Non-régression

- Sidebar, galerie de l'accueil, module EAN-13, 404 : inchangés ;
- `POST /api/print/ean13` sans champs additionnels : comportement actuel ;
- Aucun secret en cookie ; scan limité au sous-réseau local sur le port 9100.

- [x] Validé : suite complète 136 tests, lint 0 warning, tsc 0, build vert, coverage 96 %
