# Feature Specification: Module EAN-13 — Impression d'étiquettes

**Feature Branch**: `001-module-ean13`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "On va faire une application qui sert à imprimer des étiquettes ; quand on arrive on a une galerie de modules (qu'on complètera) qui nous permet de sélectionner le type d'étiquette que l'on veut créer. Dans un premier temps on va créer le module 'EAN-13' qui est juste un input qui prend uniquement des EAN-13 et un autre input qui sert à renseigner une quantité ; quand on valide ça imprime sur une imprimante ZPL un code-barres de l'EAN-13 ; si la quantité demandée est > 2 demander confirmation par une modal critique."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parcourir la galerie de modules (Priority: P1)

Lorsqu'un utilisateur ouvre l'application, il arrive sur une galerie de
modules d'étiquettes. Cette galerie liste les types d'étiquettes
disponibles ; en première version, le seul module proposé est "EAN-13".
L'utilisateur sélectionne un module pour accéder au formulaire de création
correspondant.

**Why this priority**: C'est le point d'entrée de l'application : sans
galerie fonctionnelle, aucun module n'est accessible, et pourtant cette
gallery fournit de la valeur dès qu'un premier module existe.

**Independent Test**: Peut être testé indépendamment en ouvrant
l'application : la galerie s'affiche, le module EAN-13 apparaît, et sa
sélection affiche le formulaire EAN-13.

**Acceptance Scenarios**:

1. **Given** un utilisateur arrive sur l'application, **When** la page
   s'affiche, **Then** une galerie listant le module "EAN-13" est visible.
2. **Given** la galerie affichée, **When** l'utilisateur clique sur le module
   "EAN-13", **Then** le formulaire de création EAN-13 s'affiche.

---

### User Story 2 - Créer et imprimer une étiquette EAN-13 (Priority: P1)

L'utilisateur renseigne un code EAN-13 (13 chiffres valides) et une quantité,
puis valide. L'application imprime sur l'imprimante ZPL un code-barres de
l'EAN-13, en nombre d'exemplaires égal à la quantité demandée. Si la quantité
demandée est supérieure à 2, une modal critique exige une confirmation
explicite avant toute impression.

**Why this priority**: C'est la valeur métier centrale : la sélection d'un
module n'apporte rien sans la possibilité d'imprimer l'étiquette.

**Independent Test**: Peut être testé indépendamment en saisissant un EAN-13
valide et une quantité, puis en validant : les étiquettes sont imprimées sur
l'imprimante ZPL ; avec une quantité supérieure à 2, l'impression n'a lieu
qu'après confirmation explicite.

**Acceptance Scenarios**:

1. **Given** un EAN-13 valide et une quantité de 1 ou 2, **When**
   l'utilisateur valide, **Then** les étiquettes sont imprimées sans
   confirmation préalable.
2. **Given** un EAN-13 valide et une quantité supérieure à 2, **When**
   l'utilisateur valide, **Then** une modal critique s'affiche et **Then**
   aucune impression n'a lieu tant que l'utilisateur n'a pas confirmé.
3. **Given** la modal critique affichée, **When** l'utilisateur confirme,
   **Then** les étiquettes sont imprimées en nombre égal à la quantité.
4. **Given** la modal critique affichée, **When** l'utilisateur annule,
   **Then** aucune impression n'a lieu et l'utilisateur reste sur le
   formulaire.

### Edge Cases

- Un code saisi n'est pas un EAN-13 valide (longueur incorrecte, caractères
  non numériques, checksum invalide) : l'impression est refusée et un message
  clair s'affiche.
- La quantité saisie est invalide (vide, 0, négative, non entière) :
  l'impression est refusée et un message clair s'affiche.
- La quantité est exactement 2 : aucune modal de confirmation n'est affichée.
- Le champ EAN-13 est vide ou la quantité absente : la validation est
  bloquée sans impression.
- L'imprimante ZPL est injoignable ou l'impression échoue : l'utilisateur
  reçoit un message d'erreur explicite ; l'échec n'est jamais silencieux.
- Double soumission : un nouvel ordre d'impression ne peut pas être déclenché
  pendant qu'une impression est déjà en cours.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: L'application DOIT afficher à l'arrivée une galerie listant les
  modules d'étiquettes disponibles ; le module "EAN-13" DOIT y figurer.
- **FR-002**: La galerie DOIT pouvoir accueillir de nouveaux modules à
  l'avenir sans modification des modules existants.
- **FR-003**: La sélection du module "EAN-13" DOIT afficher son formulaire de
  création.
- **FR-004**: Le module EAN-13 DOIT fournir un champ de saisie acceptant
  uniquement des codes EAN-13 (13 chiffres, checksum valide selon la
  norme EAN-13).
- **FR-005**: Le module EAN-13 DOIT fournir un second champ de saisie pour la
  quantité d'étiquettes (nombre entier positif, borné à 1000).
- **FR-006**: À la validation, le système DOIT imprimer sur l'imprimante ZPL
  un code-barres de l'EAN-13, en nombre d'exemplaires égal à la quantité
  demandée.
- **FR-007**: Si la quantité demandée est supérieure à 2, le système DOIT
  afficher une modal critique exigeant une confirmation explicite avant toute
  impression ; l'impression DOIT être bloquée en l'absence de confirmation.
- **FR-008**: Le système DOIT rejeter toute saisie invalide (EAN-13 ou
  quantité) avec un message d'erreur clair, sans imprimer.
- **FR-009**: Le système DOIT informer l'utilisateur en cas d'échec ou
  d'indisponibilité de l'impression, avec un message explicite.
- **FR-010**: Le système DOIT empêcher le déclenchement simultané de plusieurs
  ordres d'impression.

### Key Entities

- **Module d'étiquette**: représente un type d'étiquette imprimable
  (ex. EAN-13) ; possède une identité et les règles de saisie qui lui sont
  propres ; constructible à la galerie.
- **Demande d'étiquettes**: associe un code EAN-13 validé et une quantité
  d'exemplaires demandés.
- **Ordre d'impression**: représente l'envoi en cours ou terminé d'une
  demande vers l'imprimante ZPL ; possède un état (en cours, réussi, échoué).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des codes EAN-13 valides saisis aboutissent à une
  impression correcte.
- **SC-002**: Aucun code EAN-13 invalide n'aboutit à une impression ; chaque
  rejet est accompagné d'un message explicite.
- **SC-003**: 100 % des demandes de quantité supérieure à 2 affichent la
  modal critique avant toute impression.
- **SC-004**: Un utilisateur peut générer une demande d'impression en moins
  de 30 secondes pour un EAN-13 et une quantité connus.
- **SC-005**: Un échec d'impression (imprimante indisponible) est signalé à
  l'utilisateur dans 100 % des cas.

## Assumptions

- L'imprimante ZPL est disponible sur le réseau local et son adresse est
  configurée / configurable dans l'application ; aucune découverte
  automatique d'imprimante n'est prévue en v1.
- L'application est locale (usage mono-utilisateur sur une même machine) :
  l'authentification et le multi-utilisateur sont hors périmètre.
- La validation EAN-13 inclut la vérification de la clé de contrôle (modulo
  10) conformément à la norme EAN-13.
- La quantité est un entier positif borné à 1000 : la borne limite les boucles
  d'impression accidentelles ; la confirmation critique au-delà de 2 reste le
  garde-fou principal.
- Le nombre d'exemplaires imprimés est égal à la quantité demandée (1 étiquette
  = 1 code-barres).
- L'extensibilité de la galerie se limite à permettre l'ajout ultérieur de
  nouveaux modules ; aucun module supplémentaire n'est livré avec le module
  EAN-13.