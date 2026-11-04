# Phase 0 — Recherche : module Code 128

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-30

Toutes les inconnues du contexte technique sont résolues ci-dessous. Aucun
`NEEDS CLARIFICATION` ne subsiste.

## R1 — Encodage : sous-ensemble B, mode ZPL par défaut

**Décision** : encoder le contenu en **Code 128 sous-ensemble B**, sans
préfixe de jeu de caractères, via `^BCN,<h>,N,N,N` (mode `N` = aucun mode
sélectionné → sous-ensemble B), exactement comme le module Emplacement.

**Rationale** :
- Le module Emplacement imprime déjà du Code 128 avec succès sur le parc
  cible ; conserver le même encodage élimine tout risque d'imprimante.
- Le sous-ensemble B couvre l'ASCII imprimable 32–126, soit exactement la
  plage autorisée par la spec.
- La largeur est déterministe : `11 × n + 35` modules + 20 de zone de
  silence. Le centrage et la vérification de tenue sont donc exacts.
- Les caractères ASCII imprimables n'ont pas besoin d'échappement ZPL
  (`^`, `~`, `\` sont imprimables tels quels en `^FD…^FS` avec `^FH` absent).

**Alternatives rejetées** :
- **Mode automatique (`A`)** : choisit C pour les chiffres → largeur réelle
  plus étroite que le calcul B, centrage décalé et comportement variable
  selon le firmware. Rejeté.
- **Sous-ensemble C** : deux fois plus dense mais limité aux chiffres par
  paires ; nécessiterait une commutation B/C et un calcul de largeur mixte.
  Complexité sans bénéfice pour ≤ 80 caractères. Rejeté (YAGNI).
- **Échappement `^FH`** : inutile pour l'ASCII imprimable. Rejeté.

## R2 — Générateur ZPL : généraliser celui d'Emplacement

**Décision** : extraire la construction d'étiquette de
`lib/zpl/location.ts` vers `lib/zpl/code128.ts`
(`buildCode128Zpl({ codes, quantity?, widthDots, heightDots, rotated? })`),
puis faire de `lib/zpl/location.ts` un adaptateur qui réexporte
`buildLocationZpl` et `SYMBOL_MODULES` (calculé pour 4 caractères).

**Rationale** :
- Le générateur actuel est déjà générique sur `codes`, mais fige
  `SYMBOL_MODULES = 11 × 4 + 35` et le bornage du texte sur 4 caractères.
- Généraliser donne un seul point de vérité (DRY) et garantit que les deux
  modules produisent le même flux ZPL.
- Pour 4 caractères, les formules et le rendu restent **identiques** : les
  tests existants (`lib/zpl/__tests__/location.test.ts`, 4 formats, rotation,
  bornes) servent de non-régression.

**Modifications apportées par la généralisation** :
- `totalModules(n) = 11n + 55` et `symbolModules(n) = 11n + 35`.
- Hauteur de texte OCR-B bornée aussi en orientation **normale** par la
  largeur disponible (`n × 0,52 × h ≤ widthDots − 20`) ; sans effet pour
  4 caractères.
- Exposition de `maxCode128Length({ widthDots, heightDots, rotated })` et
  `code128Fits(content, dimensions)` pour la vérification serveur.

**Alternatives rejetées** :
- Réutiliser `buildLocationZpl({ codes: [contenu] })` tel quel : sémantique
  trompeuse, pas de borne de longueur, texte débordant au-delà de 4
  caractères. Rejeté.
- Dupliquer le générateur dans `lib/zpl/code128.ts` : duplication réelle
  condamnée par la constitution (DRY). Rejeté.

## R3 — Tenue sur l'étiquette : contrôle serveur avant envoi

**Décision** : calculer la longueur maximale admissible pour le format et
l'orientation résolus, côté serveur, et répondre `422 VALIDATION_ERROR`
avec la limite explicite si le contenu dépasse. Formule (largeur de module
minimale = 2 points) :

- code-barres : `n ≤ ⌊(axeCode / 2 − 55) / 11⌋`, avec
  `axeCode = widthDots` (normal) ou `heightDots` (rotation) ;
- texte OCR-B à la hauteur minimale (28 points, avance 15) :
  `n ≤ ⌊(axeTexte − 20) / 15⌋`, `axeTexte = widthDots` (normal) ou
  `heightDots` (rotation) ;
- plafond global de la spec : `min(80, borneCode, borneTexte)`.

Exemples : 40×25 normal → 9 caractères ; 40×25 pivoté → 4 ;
100×150 normal → 31 ; 100×150 pivoté → 49. La borne papier est donc
toujours la contrainte réelle ; le plafond de 80 reste un garde-fou de
saisie.

**Rationale** : les dimensions physiques sont résolues côté serveur
(`resolveDimensions`, variables d'environnement) et ne sont pas connues du
navigateur, qui ne dispose que de `paperId`. Le message d'erreur est déjà
remonté en toast par le formulaire, sans code client supplémentaire.

**Alternatives rejetées** :
- Endpoint exposant les dimensions au client : surface et code nouveaux
  pour un simple message d'erreur. Rejeté (YAGNI).
- Tronquer ou réduire la largeur de module sous 2 points : illisible /
  non scannable. Rejeté.

## R4 — Duplications client arrivées à leur 3ᵉ occurrence

**Décision** :
1. **Champs Zod partagés** dans `lib/print-options.ts` (`quantity`,
   `paperId`, `printerAddress`, `rotated`), réutilisés par les schémas
   EAN-13, Emplacement et Code 128 (messages d'erreur inchangés).
2. **Envoi client partagé** dans `lib/print-client.ts` :
   `submitPrint(endpoint, body, labels)` regroupe garde-fou imprimante,
   `fetch`, succès et erreurs (503, réseau), avec les toasts existants.
3. **Dialogue de confirmation générique** `components/print-confirm-dialog.tsx`
   (titre, description, compte, confirmation) ; les deux dialogues
   existants sont supprimés et leurs formulaires migrés.

**Rationale** : troisième copie de chacun de ces blocs ; la constitution
impose l'abstraction au-delà de deux occurrences. Le comportement observable
(messages, toasts, payloads) est conservé, ce que garantissent les tests de
formulaires et de dialogue existants.

**Alternatives rejetées** : laisser une troisième copie (violation DRY),
ou fusionner davantage (ex. formulaire générique) : les formulaires
diffèrent trop (positions fixes, plages). Rejeté (KISS/YAGNI).

## R5 — Pipeline de route API partagé

**Décision** : extraire le pipeline commun des routes d'impression dans
`lib/print/route-handler.ts` :
`createPrintPostHandler({ schema, build, validate? })` → fonction
`POST(request)`. Le pipeline gère : JSON invalide, `safeParse`, format de
papier inconnu, rotation non supportée, verrou d'impression (un par route,
comme aujourd'hui), construction du ZPL, envoi, réponse `200`, `409`, `503`.
Chaque route ne fournit plus que son schéma et son constructeur ; les
formats de réponse existants (`{ status, quantity }` pour EAN-13,
`{ status, labels }` pour Emplacement) sont préservés.

**Rationale** : troisième copie d'environ 65 lignes identiques (verrou,
gestion papier/rotation, protocole d'erreur). Les tests de routes existants
(`app/api/print/*/__tests__`) vérifient la parité avant/après. Le hook
`validate` optionnel permet à Code 128 d'ajouter le contrôle de tenue (R3)
sans élargir le pipeline.

**Alternatives rejetées** : dupliquer la route (violation DRY) ; faire
porter le contrôle de tenue par le constructeur ZPL via exception (couplage
erreur/rendu). Rejeté.

## R6 — Intégration au produit : registre uniquement

**Décision** : ajouter une entrée `{ id: "code128", name: "Code 128",
description: "Imprimer des étiquettes Code 128 à contenu libre",
href: "/code128" }` dans `lib/modules/registry.ts`, et créer
`app/code128/page.tsx`.

**Rationale** : la page d'accueil, la barre latérale, l'en-tête et le suivi
des modules récents lisent tous le registre ; aucune autre modification
n'est nécessaire. C'est le mécanisme prévu pour l'évolutivité
(constitution VI).

**Alternatives rejetées** : navigation codée en dur (contredirait le
registre existant). Rejeté.

## R7 — Validation du contenu

**Décision** : schéma Zod `code128RequestSchema` :
`content` requis, `trim()` puis 1–80 caractères,
regex `^[\x20-\x7E]+$` ; messages en français. Les espaces internes et la
casse sont conservés ; les caractères de contrôle, accents et emoji sont
refusés.

**Rationale** : couvre exactement la spec (FR-002 à FR-004), réutilise le
style des schémas existants et reste testable unitairement. Le `trim`
n'altère pas les espaces internes (contenu utile, ex. « A B »).

**Alternatives rejetées** : accepter l'Unicode (hors sous-ensemble B,
rendu imprévisible). Rejeté.
