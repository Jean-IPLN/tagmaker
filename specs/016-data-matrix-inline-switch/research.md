# Phase 0 — Recherche technique : commutateur in-line Data Matrix

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**:
2026-11-06

## R1 — Sémantique de l'affichage in-line

**Décision** : en orientation normale, le symbole reste carré et la légende
est placée à sa droite, sur une seule ligne, après un espacement horizontal.
Le bloc symbole + légende est centré horizontalement ; le symbole et la ligne
de légende sont centrés verticalement. La légende est alignée à gauche juste
après le code, pas dans un espace résiduel arbitraire.

**Rationale** : répond à « légende à droite du symbole sur la même ligne »,
reste lisible sur une étiquette compacte et ne change pas le mode actuel.

**Alternatives considérées** :
- Appliquer l'in-line aussi en orientation pivotée : rejeté, la spec exige de
  conserver la disposition pivotée actuelle.
- Centrer la légende dans la largeur restante : rejeté, une légende courte
  serait éloignée du code et ne serait plus « in-line ».
- Autoriser plusieurs lignes : rejeté, hors besoin et plus complexe à garantir
  sans troncature.

## R2 — Contrat d'impression additif

**Décision** : ajouter `inline?: boolean` à la requête d'impression Data
Matrix. Absent = `false` = mode actuel. Le formulaire n'envoie `inline` que
lorsque le commutateur est activé. Une valeur non booléenne est refusée avec un
message explicite. Les champs inconnus restent refusés.

**Rationale** : les clients et tests existants continuent de fonctionner sans
modification ; aucune version d'API ni migration n'est nécessaire.

**Alternatives considérées** :
- Champ requis : rejeté, casse les requêtes existantes.
- Enum de disposition : rejeté, surdimensionné pour deux modes.
- Paramètre de requête ou réglage persistant : rejeté, le choix est propre à
  l'impression et le cookie de réglages partagés ne doit pas changer.

## R3 — Priorité entre in-line et orientation pivotée

**Décision** : `rotated=true` est prioritaire ; `inline` est ignoré et le
rendu pivoté actuel est conservé. Aucun message d'erreur n'est ajouté pour
cette combinaison.

**Rationale** : l'orientation pivotée est un réglage partagé existant, tandis
que le commutateur est local au formulaire. La spec demande explicitement de
conserver le rendu pivoté.

**Alternatives considérées** :
- Refuser la combinaison : rejeté, l'utilisateur peut avoir activé l'in-line
  avant de changer l'orientation partagée ; cela créerait une erreur non
  demandée.
- Faire gagner l'in-line : rejeté, contraire à la spec et au rendu pivoté
  validé.

## R4 — Calcul de mise en page in-line

**Décision** : réutiliser les constantes existantes (marge 8, zone de silence
1 module, module 2–8, hauteur de légende 28–112 par pas de 28, ratios 0,52 et
0,15). Pour une légende non vide :

1. Calculer la dimension ECC200 depuis la longueur du contenu, comme
   aujourd'hui.
2. Partir de la plus grande taille de module permise par la hauteur
   disponible, puis descendre jusqu'à 2.
3. Pour chaque module, essayer les hauteurs de légende de la valeur désirée
   (18 % du petit axe, arrondie au multiple de 28) jusqu'à 28.
4. Retenir la première combinaison dont la largeur de légende estimée
   (`longueur × avance`) plus l'espacement tient à droite du symbole.
5. Centrer le bloc horizontalement et chaque élément verticalement ; placer le
   champ texte à gauche dans l'espace restant.

Si aucune combinaison ne tient, la mise en page est invalide et l'impression
est refusée (`422`). Sans légende, le calcul actuel sans texte est conservé.

**Rationale** : algorithme déterministe, borné, réutilisant les proportions
déjà validées ; il privilégie le plus grand symbole scannable plutôt qu'une
légende plus haute. Il n'exige ni solveur ni nouvelle constante.

**Alternatives considérées** :
- Résoudre simultanément module et hauteur de texte : rejeté, complexité
  inutile pour un gain visuel marginal.
- Taille de module fixe : rejeté, sous-utilise le support et peut refuser des
  légendes qui tiendraient avec un module plus petit.
- Choisir d'abord la hauteur de légende maximale : rejeté, peut réduire le
  code alors qu'une ligne plus petite suffirait.

## R5 — Sortie ZPL in-line

**Décision** : conserver `^BXN` pour le symbole et utiliser `^AEN` pour la
légende normale, avec `^FB<largeurDisponible>,1,0,L`. L'échappement `^FH`
n'est émis que si la légende contient `^`, `~` ou `_`, comme aujourd'hui.

**Rationale** : aucune commande nouvelle, rendu texte normal déjà utilisé dans
le module, alignement à gauche adjacent au code, une seule ligne.

**Alternatives considérées** :
- `^AEB` : rejeté, orientation de texte pivotée, incorrecte pour l'in-line
  normal.
- `^FB` centré : rejeté, éloigne une légende courte du symbole.
- Écrire la légende dans le même champ que le code : rejeté, le contenu scanné
  serait pollué et la garantie de scan exact serait perdue.

## R6 — Interface et état

**Décision** : utiliser `components/ui/switch.tsx` avec un libellé visible
« Affichage in-line », un état local `isInline` initialisé à `false`, une aide
« Légende à droite du code, sur la même ligne (orientation normale). » et un
`aria-label`/libellé associé. L'état n'est ni persisté ni ajouté aux réglages
partagés. Le champ n'est envoyé que si l'état est vrai.

**Rationale** : composant déjà accessible et utilisé dans le projet ; le
formulaire reste la seule source de vérité du choix pour l'impression en cours.

**Alternatives considérées** :
- Case à cocher : rejeté, le projet utilise déjà un commutateur pour les choix
  binaires.
- Liste déroulante : rejeté, plus lourde pour deux options.
- Mémoriser le choix dans le cookie : rejeté, non demandé et contraire à la
  séparation entre réglages partagés et choix d'impression.

## R7 — Validation et tests

**Décision** : ajouter `inline` au schéma strict comme booléen facultatif
(message `Le mode d'affichage est invalide` si le type est incorrect).
Couvrir par tests : schéma (absent, vrai, faux, type invalide), mise en page
(symbole carré, légende à droite, légende vide, limites de tenue, pivoté
inchangé), route (défaut, `inline: true`, refus de tenue, priorité pivotée) et
formulaire (désactivé par défaut, bascule, payload, confirmation, accessibilité
clavier).

**Rationale** : respecte la constitution (tests obligatoires, > 80 %) et
verrouille la compatibilité ainsi que la non-régression du mode actuel.

**Alternatives considérées** :
- Tests de snapshot ZPL complets : rejeté, fragiles face aux moindres
  ajustements de coordonnées.
- Validation manuelle seule : rejeté, ne protège pas les cas limites de tenue.

## Résultat

Aucun `NEEDS CLARIFICATION` ne reste. Les décisions R1–R7 sont compatibles avec
la constitution et le périmètre de la spec.
