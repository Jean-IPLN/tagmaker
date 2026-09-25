# Feature Specification: Plages multiples — imprimer plusieurs plages d'emplacements

**Feature Branch**: `010-multi-range-print`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "pour le systeme de plage on vas faire en sorte de pouvoire imprimer plusieur plage c'est a dire que en mode plage on puissent cliquer sur un + pour ajouter une plage et une icon poubelle a chaque plage ajouter pour suprimer cette plage"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ajouter une plage supplémentaire (Priority: P1)

En mode **Plage**, l'utilisateur voit une première plage (emplacement de début
et de fin). Il clique sur le bouton **« + » Ajouter une plage** : une nouvelle
plage vierge apparaît, avec les mêmes champs début/fin, imbriquée dans
l'ensemble. L'utilisateur peut ajouter autant de plages qu'il le souhaite
(dans la limite fixée), puis saisir ses bornes dans chacune.

**Why this priority**: C'est le cœur de la demande — pouvoir équiper plusieurs
zones en une seule passe de formulaire, sans repasser par le mode « Un seul »
ni dupliquer la page.

**Independent Test**: Ouvrir le module Emplacement, passer en mode Plage,
cliquer trois fois sur « + » : on obtient quatre plages, toutes saisissables et
validées indépendamment.

**Acceptance Scenarios**:

1. **Given** le mode Plage actif avec une plage affichée, **When** l'utilisateur
   clique sur « + Ajouter une plage », **Then** une plage vierge supplémentaire
   (début + fin) est affichée et saisissable
2. **Given** plusieurs plages affichées, **When** l'utilisateur saisit des
   bornes dans l'une d'elles, **Then** les autres plages restent inchangées
3. **Given** le nombre maximal de plages atteint, **When** l'utilisateur clique
   sur « + », **Then** aucune plage supplémentaire n'est ajoutée (le bouton est
   désactivé ou masqué)

---

### User Story 2 - Supprimer une plage (Priority: P1)

Chaque plage ajoutée est accompagnée d'une icône **poubelle**. L'utilisateur la
clique pour retirer la plage correspondante : ses bornes sont oubliées et elle
disparaît de l'ensemble. Il reste toujours au moins une plage à l'écran.

**Why this priority**: Corriger une saisie (zone erronée, plage ajoutée par
erreur) sans repartir de zéro ; garantie qu'un formulaire vide d'interface
n'existe jamais.

**Independent Test**: Ajouter deux plages puis supprimer la première : seule la
seconde reste affichée, sans impact sur les autres champs (type, mode).

**Acceptance Scenarios**:

1. **Given** plusieurs plages affichées, **When** l'utilisateur clique sur la
   poubelle d'une plage, **Then** cette plage est retirée de l'ensemble
2. **Given** une seule plage affichée, **When** l'utilisateur tente de la
   supprimer, **Then** la suppression est refusée (au moins une plage demeure)
3. **Given** une plage supprimée, **When** l'impression est lancée, **Then** les
   plages restantes à l'écran sont les seules prises en compte

---

### User Story 3 - Imprimer toutes les plages en une seule opération (Priority: P1)

L'utilisateur a renseigné plusieurs plages valides et clique sur **Imprimer** :
le système produit **une étiquette par emplacement de chaque plage**, en une
seule impression. Si le volume total dépasse le seuil, une confirmation affiche
le total cumulé avant envoi. Si une plage est invalide, aucune impression n'a
lieu et un message désigne la plage fautive.

**Why this priority**: La valeur isolée de l'ajout/suppression est faible sans
une impression globale ; c'est la brique qui rend le multi-plages utile en
production.

**Independent Test**: Saisir deux plages (ex. `1#D0 → 1#D2` et `1#D3 → 1#D7`)
et imprimer : 8 étiquettes (3 + 5) sont envoyées en une seule action, sans
modal (≤ 2 par plage mais total > 2 → modal si total > 2).

**Acceptance Scenarios**:

1. **Given** deux plages valides de 5 étiquettes chacune, **When** l'utilisateur
   clique sur Imprimer, **Then** 10 étiquettes sont produites en une seule
   opération (une par code, sur l'ensemble des plages)
2. **Given** un total cumulé supérieur au seuil de confirmation, **When**
   l'utilisateur clique sur Imprimer, **Then** une confirmation affiche le total
   exact cumulé sur toutes les plages et l'impression attend validation
3. **Given** une plage invalide parmi plusieurs (code incomplet, début > fin,
   type incohérent ou zones différentes), **When** l'utilisateur clique sur
   Imprimer, **Then** aucune étiquette n'est produite et un message identifie la
   plage à corriger
4. **Given** un total cumulé ≤ 2 (au seuil), **When** l'utilisateur clique sur
   Imprimer, **Then** l'impression part directement, sans confirmation

---

### Edge Cases

- **Suppression de la dernière plage** : interdite ; l'ensemble conserve
  toujours au moins une plage.
- **Plage vierge ou incomplète** : une plage avec des bornes manquantes ou un
  code non complet rend l'ensemble non imprimable, avec message désignant la
  plage concernée.
- **Plage incohérente** : début après fin (sur l'espace, la position ou la
  sous-position), types différents ou zones différentes entre les bornes d'une
  même plage → ensemble refusé, plage désignée.
- **Plage traversant groupes et espaces** : en Classique, une plage valide
  peut couvrir plusieurs groupes de position et espaces ; elle génère la
  **boîte** bornée par ses extrêmes — ex. `1B10 → 1D45` produit, sur chaque
  groupe, les sous-positions `0` à `5` : `1B10–1B15`, `1B20–1B25`… `1B45`,
  puis `1C…`, jusqu'à `1D…45`. En Dynamique, seuls les codes de même préfixe
  (`x#D`) et de sous-position variable sont générés.
- **Sous-position inversée** : traverser des groupes impose que la
  sous-position de fin reste ≥ celle de début (ex. `1A19 → 1A21`, sous-position
  `9` > `1`) → plage refusée.
- **Zones différentes entre plages** : **autorisées** — chaque plage est un lot
  indépendant ; la zone (premier caractère `1`/`2`) d'une plage n'a aucune
  influence sur les autres. Une plage `1A10 → 1A12` et une plage `2B10 → 2B14`
  s'impriment ensemble en un seul envoi.
- **Changement de zone en cours de saisie** : le premier caractère choisi
  (combobox `1`/`2`) est **synchronisé entre le début et la fin de la même
  plage** (min/max), **sans** propagation aux autres plages — chaque plage
  choisit sa zone indépendamment.
- **Nombre maximal de plages** : atteint → le bouton « + » est inopérant
  (désactivé ou masqué).
- **Chevauchement ou doublon entre plages** : autorisé — chaque plage fournit
  ses propres étiquettes, le total est la somme (pas de dédoublonnage).
- **Total cumulé très grand** : le cumul est borné par la limite partagée,
  cohérente avec la limite de quantité existante.
- **Changement de type en cours de saisie** : toutes les plages suivent le type
  courant ; une plage incohérente avec le type devient invalide à l'impression.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST afficher, en mode **Plage**, une première plage
  (début + fin) conforme à la saisie existante.
- **FR-002**: System MUST permettre d'ajouter une plage supplémentaire via un
  bouton dédié clairement libellé (« + Ajouter une plage »), chaque nouvelle
  plage étant vierge et saisissable.
- **FR-003**: System MUST permettre de supprimer individuellement chaque plage
  via une action dédiée (icône poubelle) ; la dernière plage restante MUST NOT
  pouvoir être supprimée.
- **FR-004**: System MUST valider chaque plage indépendamment selon les règles
  du calcul par **boîte** : nomenclature du code, même zone pour les bornes
  d'une plage, ordre non décroissant sur l'espace/position/sous-position, taille
  de plage (produit des écarts + 1) bornée.
- **FR-005**: System MUST imprimer l'ensemble des plages en une seule
  opération : le nombre d'étiquettes produit est la **somme** des étiquettes de
  toutes les plages valides renseignées, une étiquette par code.
- **FR-006**: System MUST appliquer la confirmation de volume sur le **total
  cumulé** de toutes les plages (même seuil que l'existant) ; en dessous du
  seuil, impression directe sans confirmation.
- **FR-007**: System MUST refuser l'impression si **au moins une plage** est
  invalide, et MUST fournir un message identifiant la plage fautive (numérotation
  visible).
- **FR-008**: System MUST appliquer le type (Classique / Dynamique) de manière
  globale à **toutes** les plages affichées.
- **FR-009**: System MUST conserver le mode **Un seul** et les autres modules
  strictement inchangés (0 régression) ; les plages multiples n'existent qu'en
  mode Plage.
- **FR-010**: System MUST borner le nombre de plages ajoutables (limite
  raisonnable) et le cumul total d'étiquettes à la limite partagée existante.
- **FR-011**: System MUST traiter chaque plage comme un **lot indépendant** : la
  zone (premier caractère du code : `1` ou `2`) peut **différer d'une plage à
  l'autre** ; seules les bornes d'une même plage (début ↔ fin) partagent la zone
  et sont synchronisées en saisie.

### Key Entities

- **Plage d'emplacements** : ensemble de codes générés par la **boîte** délimitée
  par ses bornes (début, fin) : pour chaque axe (espace, position,
  sous-position), les caractères parcourent l'ordre du jeu (espace `A-Z`,
  position `1-9` puis `A-Z`, sous-position `0-9` puis `A-Z`) entre les extrêmes,
  tous les axes étant combinés. Son nombre d'étiquettes est le produit des
  écarts + 1 par axe (ex. `1B10 → 1D45` = 3 × 4 × 6 = 72).
- **Ensemble de plages** : la liste des plages saisies en mode Plage. L'état
  de l'ensemble (minimum une plage, ordre, ajout/suppression) détermine les
  codes à imprimer.
- **Étiquette Emplacement** : support imprimé portant le code-barres Code 128
  et la ligne lisible, une par code de chaque plage — comportement inchangé.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur peut ajouter jusqu'à la limite fixée de plages
  puis les imprimer toutes en **une seule action**, sans re-saisie ni étape
  supplémentaire.
- **SC-002**: Le nombre d'étiquettes produit est **exactement égal à la somme**
  des étiquettes de chaque plage (aucune duplication ni omission), vérifiable
  au scanner.
- **SC-003**: 100 % des ensembles contenant au moins une plage invalide sont
  refusés avant toute impression, avec un message désignant la plage fautive.
- **SC-004**: Il est impossible d'obtenir un ensemble sans plage ; **toute
  suppression** d'une plage retirée est visible immédiatement et réversible par
  ré-ajout.
- **SC-005**: Le seuil de confirmation porte sur le **total cumulé** : un total
  > 2 déclenche la confirmation, ≤ 2 imprime directement (100 % des cas
  conformes à la règle).
- **SC-006**: Le mode Un seul et les autres modules fonctionnent sans
  régression (suite de tests verte, comportement inchangé).

## Assumptions

- Le **seuil de confirmation** et la **limite de volume** restent ceux de la
  feature 009 (confirmation au-delà de 2, cumul borné par la limite partagée).
- **Nombre maximal de plages** : valeur raisonnable et constante (par exemple
  10), la même pour tous les utilisateurs ; au-delà, le bouton « + » est
  inopérant.
- **Toujours au moins une plage** : la poubelle de la dernière plage restante
  est désactivée/hidden ; il n'existe pas d'état « zéro plage ».
- **Chevauchements/doublons** entre plages autorisés : chaque plage contribue
  ses étiquettes, le total est la somme (YAGNI — pas de dédoublonnage ni de
  détection de recouvrement).
- **Type global unique** : l'interrupteur de type s'applique à toutes les
  plages ; aucune plage ne peut avoir un type propre.
- **Zone par plage indépendante** : chaque plage est un lot — elle choisit sa
  zone librement (`1` ou `2`), sans contrainte sur les autres plages. En saisie,
  la zone est synchronisée **à l'intérieur** de chaque plage (début ↔ fin),
  sans propagation entre plages.
- Chaque plage est **numérotée visuellement** (ex. « Plage 1 », « Plage 2 »…)
  afin d'identifier simplement la plage fautive dans les messages d'erreur.
- Le **flux d'impression** (une seule opération, confirmation, rattachement aux
  réglages papier/imprimante) réutilise l'existant de la feature 009 sans
  nouveau réglage ni prévisualisation.
- La **découpe par plage** n'est pas une exigence : les étiquettes sont
  produites dans l'ordre des plages, en une seule génération.