# Phase 0 — Recherche : module Data Matrix

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-31

Toutes les inconnues du contexte technique sont résolues ci-dessous. Aucun
`NEEDS CLARIFICATION` ne subsiste.

## R1 — Symbologie et dimensionnement : ECC200, taille forcée quand possible

**Décision** : imprimer un **Data Matrix ECC200** carré via
`^BXo,h,200,c,r,f,g,a`, avec :
- `h` = taille du module en points, bornée `2..8` ;
- `c = r = dimension` du plus petit symbole ECC200 carré capable d'encoder le
  contenu, lorsque cette dimension vaut 10 à 48 (valeurs paires) ;
- `c = r = 0` au-delà de 48, laissant l'imprimante choisir la taille (le ZPL
  ignore les valeurs supérieures à 49) ;
- `f = 6`, `g = _` (échappement contrôlé, voir R2), `a = 1` (carré).

La capacité en octets de chaque taille carrée est tabulée dans le code
(10→3, 12→5, 14→8, 16→12, 18→18, 20→22, 22→30, 24→36, 26→44, 32→62, 36→86,
40→114, 44→144, 48→174, 52→204, 64→280, …). Le contenu étant de l'ASCII
imprimable encodé au pire en mode ASCII/Base 256, cette table donne une borne
haute fiable : le symbole choisi contient toujours les données.

**Rationale** :
- ECC200 est la seule qualité moderne et la valeur recommandée par Zebra ;
  les qualités 0–140 sont des formats legacy que les lecteurs récents ne
  garantissent plus.
- Forcer `c`/`r` quand c'est possible rend la taille du symbole déterministe,
  donc le centrage exact et les tests stables, sans dépendre de
  l'optimisation C40/Text du firmware.
- Au-delà de 48, le ZPL impose de laisser l'imprimante choisir ; la taille
  prédite par la table reste utilisée pour le calcul de placement.
- Le Data Matrix carré évite les variantes rectangulaires (DMRE), dont le
  support dépend du firmware.

**Vérification** : Labelary (`8 dpmm`) rend
`^FO100,40^BXN,4,200,20,20,6,_,1^FDHELLO_DM^FS` en un symbole de 80×80 points
à l'origine (100,40), ce qui confirme l'ordre des paramètres et la taille
forcée 20×20 à 4 points par module. La lecture du contenu devra être
confirmée sur le matériel cible.

**Alternatives rejetées** :
- **Laisser l'imprimante choisir toujours** (`c=r=0`) : la taille réelle
  varie avec l'optimisation du firmware, donc le centrage est approximatif.
- **Forcer au-delà de 48** : non supporté par `^BX` (valeur remise à 0).
- **Symbole rectangulaire** : support firmware inégal, gain de place non
  demandé. Rejeté (YAGNI).

## R2 — Échappement du contenu : `g = _` et séquences `^BX`

**Décision** : ne pas utiliser `^FH` pour le contenu Data Matrix. Régler
explicitement `g = _` et échapper avec les séquences du `^BX` :
- `_` → `__` (underscore littéral) ;
- `^` → `_d094` (code ASCII décimal 94) ;
- `~` → `_d126` (code ASCII décimal 126).

**Rationale** :
- `^` et `~` sont les préfixes de commande ZPL/firmware : laissés bruts dans
  `^FD`, ils cassent le champ ou déclenchent une commande.
- Pour la qualité 200, `^BX` traite lui-même un caractère d'échappement
  (`g`) : `_` sur les firmwares récents, `~` sur les anciens. En imposant
  `g = _`, le comportement ne dépend plus du firmware.
- `^FH` est traité **avant** les séquences d'échappement du `^BX` : un
  `_5F` deviendrait `_`, puis pourrait être relu comme début de séquence.
  Utiliser directement `_dNNN` évite cette double interprétation.
- Les autres caractères ASCII imprimables (dont `>` et `\`) n'ont aucun rôle
  spécial dans `^FD`/`^BX`.

**Alternatives rejetées** :
- **`^FH` seul** : ambigu avec l'échappement natif de `^BX` (R2 ci-dessus).
- **Laisser `g` par défaut** : `_` ou `~` selon la version de firmware, donc
  rendu non déterministe.
- **Choisir un caractère `g` absent du contenu** : impossible à garantir
  pour tout ASCII imprimable.

**Risque résiduel** : la disponibilité de `_dNNN` et le comportement de `g`
sur le firmware exact de l'imprimante doivent être confirmés matériellement ;
repli documenté ci-dessous si besoin.

## R3 — Légende : champ texte OCR-B séparé

**Décision** : imprimer la légende comme un champ texte distinct, avec la
police OCR-B déjà utilisée par le module Code 128 :
- normale : `^FO0,<y>^AEN,<h>,<w>^FB<widthDots>,1,0,C[^FH]^FD<légende>^FS` ;
- pivotée : `^FO<x>,0^AEB,<h>,<w>^FB<heightDots>,1,0,C[^FH]^FD<légende>^FS`.

La légende est centrée par l'imprimante via `^FB` (comme le texte du module
Code 128), avec `^FH` uniquement si elle contient `^`, `~` ou `_` (helper
`escapeTextData` existant).

**Rationale** :
- Le centrage `^FB` ne dépend pas des métriques réelles de la police, qui
  ont déjà causé un décalage sur le module Code 128.
- OCR-B est déjà embarquée/maîtrisée sur le parc ; aucune police nouvelle.
- `^FH` est sûr pour un champ texte classique ; il évite toute perte de
  caractères spéciaux.

**Alternatives rejetées** :
- **Faire porter la légende par `^BX`** : elle serait encodée dans le code,
  pas imprimée en clair. Rejeté.
- **Police scalable `^A0`** : rendu et métriques moins prévisibles sur les
  imprimantes du parc ; OCR-B est déjà validée.

## R4 — Mise en page : symbole carré + légende, deux orientations

**Décision** : calculer un bloc centré, symbole au-dessus de la légende en
orientation normale, légende à côté en orientation pivotée.

- Marge : 8 points (`ROTATED_MARGIN_DOTS` existant).
- Zone de silence Data Matrix : 1 module de chaque côté, soit
  `span = dimension + 2` modules pour le calcul de place.
- Hauteur de légende : proportionnelle au petit axe (18 %), bornée 28–112
  points, alignée sur la cellule OCR-B de 28 points, puis réduite pour que
  `longueur × avance` tienne sur l'axe de texte (avance = 15 points à la
  taille minimale, ratio 0,52).
- Module : `clamp(⌊min(largeurDisponible, hauteurDisponible) / span⌋, 2, 8)`.
  En normal, la hauteur disponible retire la légende et son espacement ; en
  pivoté, c'est la largeur disponible qui les retire.
- Bloc centré sur le support ; légende centrée par `^FB`.

**Rationale** : réutilise les constantes et conventions du module Code 128
(marges, cellule OCR-B, ratio d'avance, `^FB`) sans dupliquer son générateur ;
le Data Matrix étant carré, le calcul se réduit à un carré et un côté de
texte.

**Alternatives rejetées** :
- **Réutiliser `computeBarcodeLayout`** : conçu pour un code-barres 1D avec
  hauteur de barres et texte dessous ; détourner ses champs pour un carré 2D
  serait trompeur.
- **Ne pas réserver la place de la légende** : chevauchement du symbole et du
  texte sur les petits formats.
- **Tronquer la légende** : perte silencieuse de donnée, interdite par la
  spec.

## R5 — Tenue sur l'étiquette et validation serveur

**Décision** : calculer la mise en page côté serveur et refuser en `422`
lorsque le module minimal (2 points) ou le bloc ne tient pas, avec un message
demandant de raccourcir le contenu/la légende ou de changer de format. Le
schéma Zod applique les plafonds de saisie (contenu 1–200, légende 0–60).

**Rationale** :
- Les dimensions physiques sont résolues côté serveur (`resolveDimensions`),
  le navigateur ne connaît que `paperId`.
- Une seule fonction `dataMatrixFits` couvre contenu et légende, sans exposer
  de formule au client.
- Le message reste actionnable sans calculer une limite exacte par format
  (la contrainte dépend à la fois du contenu et de la légende).

**Alternatives rejetées** :
- **Tronquer ou réduire le module sous 2 points** : illisible/non scannable.
- **Endpoint de calcul côté client** : surface et code nouveaux pour un
  message d'erreur (YAGNI).

## R6 — Intégration : registre et pipeline existants

**Décision** : ajouter une entrée `data-matrix` dans
`lib/modules/registry.ts`, une page `app/data-matrix/page.tsx`, une route
`app/api/print/data-matrix/route.ts` construite avec
`createPrintPostHandler`, et un formulaire `components/data-matrix-form.tsx`
qui réutilise `sendPrintRequest` et `PrintConfirmDialog`.

**Rationale** : la galerie, la barre latérale, l'en-tête et les modules
récents lisent le registre ; le pipeline de route et l'envoi client sont déjà
mutualisés depuis la feature 014. Aucun nouveau mécanisme d'impression.

**Alternatives rejetées** : dupliquer le pipeline ou le dialogue (violation
DRY) ; ajouter un réglage dédié (YAGNI).
