# Feature Specification: Code-barres EAN-13 centré et pleine échelle

**Feature Branch**: `008-ean13-centered-barcode`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "modifiction du module EAN-13 : le codebar est centrer en largeur et en hauteur et occupe tout l'espace disponible"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Code-barres centré et plein cadre sur l'étiquette (Priority: P1)

Quand l'utilisateur imprime une étiquette depuis le module EAN-13, le
code-barres imprimé est **centré en largeur et en hauteur** sur l'étiquette
et **occupe tout l'espace disponible** : il est dimensionné au maximum
possible pour le format de papier choisi, chiffres lisibles compris, tout en
conservant les marges minimales nécessaires à la lecture au scanner.

**Why this priority**: C'est la totalité du besoin exprimé. Un centrage seul
ou un agrandissement seul ne satisfait pas l'attente : les deux aspects
vont ensemble sur une même étiquette.

**Independent Test**: Imprimer une étiquette avec un code EAN-13 valide sur
un format quelconque de la liste des papiers, puis mesurer les marges du
code-barres sur l'étiquette : marges égales à gauche/droite et haut/bas, et
code occupant l'essentiel de l'espace utile. Vérifier enfin la lecture au
scanner.

**Acceptance Scenarios**:

1. **Given** le format `40x25` sélectionné, **When** l'utilisateur imprime le
   code `5901234123457`, **Then** le code-barres est positionné au centre de
   l'étiquette dans les deux dimensions (marges gauche/droite égales, marges
   haut/bas égales)
2. **Given** n'importe quel format de la liste (ex. `100x50`), **When**
   l'étiquette est imprimée, **Then** le code-barres occupe le maximum de
   l'espace utile : un format plus grand produit un code plus grand, jamais
   un petit code isolé au centre
3. **Given** une étiquette imprimée, **When** on mesure la hauteur du bloc
   code-barres (barres + chiffres lisibles), **Then** il couvre au moins
   90 % de la hauteur utile de l'étiquette
4. **Given** le code-barres centré et agrandi, **When** on le lit avec un
   scanner, **Then** le code EAN-13 est reconnu (zones de silence
   préservées) pour chaque format de la liste
5. **Given** une quantité choisie, **When** l'impression a lieu, **Then** le
   nombre d'étiquettes produites est inchangé et chaque étiquette porte le
   même code-barres centré

---

### Edge Cases

- **Format étroit** (ex. `40x25`) : le code se dimensionne au maximum sans
  jamais dépasser les bords de l'étiquette.
- **Format large** (ex. `100x50`) : le code grossit pour remplir l'étiquette ;
  il ne reste pas à une taille fixe en centre d'étiquette.
- **Format plus grand** (ex. `60x40`) : proportionnalité conservée — le code
  occupe la même part de l'espace utile quel que soit le format.
- **Étiquette trop petite** pour contenir le code avec ses marges de lecture :
  le code est réduit au minimum scannable et centré ; il n'est jamais tronqué
  ni collé à un bord.
- **Chiffres lisibles** sous les barres : inclus dans le bloc centré — le
  bloc complet (barres + chiffres) reste centré, les chiffres ne débordent
  pas de l'étiquette.
- **Marges d'arrondi** : la résolution physique de l'imprimante peut rendre
  deux marges égales à ±1 unité de mesure près ; c'est acceptable.
- **Code ou format invalide** : la validation existante du module EAN-13 est
  inchangée (aucune impression d'un code invalide).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST positionner le code-barres au centre horizontal de
  l'étiquette (marge gauche = marge droite, tolérance d'arrondi).
- **FR-002**: System MUST positionner le code-barres au centre vertical de
  l'étiquette (marge haute = marge basse, tolérance d'arrondi), le bloc
  complet (barres + chiffres lisibles) étant l'objet centré.
- **FR-003**: System MUST dimensionner le code-barres au maximum possible
  pour le format de papier sélectionné : la hauteur du bloc occupe au moins
  90 % de la hauteur utile de l'étiquette.
- **FR-004**: System MUST faire grossir le code-barres quand le format
  d'étiquette est plus grand, et le réduire quand il est plus petit, afin
  qu'il occupe la même part de l'espace utile quel que soit le format.
- **FR-005**: System MUST préserver les marges de lecture (zones de silence)
  minimales exigées par le standard EAN-13 : le code-barres n'est jamais
  coupé par un bord ni rendu illisible par un agrandissement excessif.
- **FR-006**: System MUST conserver l'affichage des chiffres lisibles sous
  les barres (comportement actuel) et les inclure dans le centrage.
- **FR-007**: System MUST appliquer le même centrage et la même échelle sur
  chaque étiquette d'une impression multiple (quantité > 1).
- **FR-008**: La validation du code EAN-13, le choix de la quantité, le
  réglage de l'imprimante et le nombre d'étiquettes produites restent
  inchangés.

### Key Entities

- **Étiquette** : support imprimé dont les dimensions dépendent du format de
  papier sélectionné (largeur × hauteur) ; l'espace utile est la surface
  privée des marges de lecture minimales.
- **Code-barres EAN-13** : bloc composé des barres et des chiffres lisibles ;
  sa position (centrage) et sa taille (échelle dans l'espace utile) sont les
  attributs de rendu concernés.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur 100 % des étiquettes imprimées, la différence entre la
  marge gauche et la marge droite du code-barres est nulle ou due à l'arrondi
  (écart ≤ 1 unité de mesure de l'imprimante).
- **SC-002**: Sur 100 % des étiquettes imprimées, la différence entre la
  marge haute et la marge basse du bloc code-barres est nulle ou due à
  l'arrondi (écart ≤ 1 unité de mesure).
- **SC-003**: Pour chaque format de la liste des papiers, la hauteur du bloc
  code-barres couvre ≥ 90 % de la hauteur utile de l'étiquette.
- **SC-004**: 100 % des formats de la liste produisent un code-barres lisible
  au scanner (aucun échec de lecture dû au centrage ou à l'agrandissement).
- **SC-005**: Changer de format papier change proportionnellement la taille
  du code imprimé — un format deux fois plus large produit un code occupant
  la même part de largeur utile.
- **SC-006**: La validation des entrées et le nombre d'étiquettes produites
  sont inchangés par rapport au module actuel (0 régression).

## Assumptions

- Le besoin porte sur la **sortie imprimée** du module EAN-13 ; aucune
  prévisualisation à l'écran n'existe et aucune n'est ajoutée (YAGNI).
- Les chiffres lisibles sous les barres sont conservés (comportement actuel,
  attendu sur une étiquette produit).
- « Tout l'espace disponible » = taille maximale compatible avec la
  scannabilité, pour le format de papier sélectionné : les zones de silence
  minimales du standard EAN-13 sont un plancher non négociable (une étiquette
  illisible n'a aucune valeur).
- « Centré » = marges égales sur chaque axe, à l'arrondi près lié à la
  résolution physique de l'imprimante.
- Le format de papier sélectionné dans les réglages fournit les dimensions
  de l'étiquette (déjà en place, feature 006) ; ce feature ne change pas ce
  mécanisme.
- Portée : uniquement le positionnement et le dimensionnement du code-barres
  sur l'étiquette ; la validation EAN-13, l'envoi réseau, le choix de
  l'imprimante et la quantité sont hors périmètre (inchangés).
