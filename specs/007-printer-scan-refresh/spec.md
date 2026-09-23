# Feature Specification: Découverte d'imprimantes : spinner et actualisation

**Feature Branch**: `007-printer-scan-refresh`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "pour le papier il faut que dans le .env je puisse definir un liste en ecrivant les format en largeurxlongeur ca qui donnerais '40x25' et pour le paramettrage de l'imprimante met un Spinner de shadcn quand on cherche les imprimante et dans le dropdown du select met un bouton actualiser quand on ne cherche pas d'imprimante, il servira à relancer une recherche"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Formats papier définis dans la configuration (Priority: P1)

L'utilisateur définit dans le fichier de configuration de l'application la
liste des formats d'étiquettes qu'il utilise, au format
« largeur×hauteur » (ex. `40x25`), séparés par des virgules
(ex. `40x25, 50x25, 100x50`). Au démarrage, tous ces formats sont proposés
dans la liste déroulante **Papier** de la section Paramètres, sans aucune
compilation ni manipulation de code.

**Why this priority**: La taille de papier détermine le rendu des étiquettes ;
permettre à l'utilisateur de maintenir sa propre liste de formats est le
socle du paramétrage demandé.

**Independent Test**: Éditer la liste des formats dans la configuration,
redémarrer, ouvrir la section Paramètres : la liste **Papier** contient
exactement les formats définis, dans l'ordre, libellés en millimètres.

**Acceptance Scenarios**:

1. **Given** une configuration contenant `40x25, 50x25, 100x50`, **When**
   l'application démarre, **Then** la liste **Papier** présente ces trois
   formats
2. **Given** le format `100x50` dans la configuration, **When** un format
   invalide est aussi présent (`10x999`), **Then** les formats valides sont
   conservés et l'invalide est ignoré sans blocage
3. **Given** aucun format personnalisé défini, **When** l'application démarre,
   **Then** la liste **Papier** affiche le format par défaut de l'application

---

### User Story 2 - Indicateur de chargement pendant la recherche (Priority: P1)

L'utilisateur ouvre la liste déroulante **Imprimante**. Tant que la recherche
d'imprimantes est en cours, il voit un **indicateur de chargement animé
(spinner)** dans le pied du menu — au même emplacement que le bouton
« Actualiser ». Quand la recherche se termine — qu'elle ait trouvé
des imprimantes ou non — l'indicateur disparaît.

**Why this priority**: La recherche réseau peut prendre environ une seconde ;
sans indicateur, l'utilisateur ne sait pas si l'application travaille ou a
échoué.

**Independent Test**: Ouvrir la liste **Imprimante** : un spinner visible
pendant la recherche, absent une fois les résultats affichés (ou l'état
« aucune imprimante »).

**Acceptance Scenarios**:

1. **Given** l'utilisateur ouvre la liste **Imprimante**, **When** la recherche
   démarre, **Then** un indicateur de chargement animé est affiché dans la
   liste
2. **Given** une recherche en cours, **When** elle se termine (avec ou sans
   résultats), **Then** l'indicateur disparaît

---

### User Story 3 - Bouton « Actualiser » pour relancer une recherche (Priority: P2)

Dans la liste déroulante **Imprimante**, quand **aucune recherche n'est en
cours**, l'utilisateur voit un bouton **Actualiser**. Il clic dessus pour
relancer une recherche complète des imprimantes du réseau, sans avoir à
fermer/réouvrir le sélecteur. Le résultat remplace la liste précédemment
affichée.

**Why this priority**: Empêcher le bouton ne brise rien de l'existant tout en
offrant la relance ; c'est le seul ajout fonctionnel de cette itération.

**Independent Test**: Ouvrir la liste **Imprimante**, attendre la fin de la
recherche, cliquer **Actualiser** : l'indicateur réapparaît puis la liste des
imprimantes se reconstruit.

**Acceptance Scenarios**:

1. **Given** aucune recherche en cours, **When** l'utilisateur regarde la liste
   **Imprimante**, **Then** un bouton « Actualiser » y est visible
2. **Given** le bouton « Actualiser », **When** l'utilisateur clique dessus,
   **Then** une nouvelle recherche démarre et l'indicateur de chargement
   réapparaît
3. **Given** une recherche en cours, **When** l'utilisateur regarde la liste,
   **Then** le bouton « Actualiser » est masqué (une seule recherche active à
   la fois)
4. **Given** une recherche terminée, **When** l'utilisateur relance via
   « Actualiser », **Then** la liste affichée est remplacée par les nouveaux
   résultats (ou l'état « aucune imprimante »)

---

### Edge Cases

- Réseau sans imprimante : après un scan vide, l'état « aucune imprimante »
  s'affiche et le bouton « Actualiser » reste disponible pour relancer.
- Recherche en cours : spinner affiché, bouton « Actualiser » masqué — jamais
  deux recherches simultanées.
- Échec de la recherche (réseau indisponible, réponse invalide) : la recherche
  se termine, l'indicateur disparaît et l'utilisateur peut relancer via
  « Actualiser » (aucun blocage).
- Format papier mal formé dans la configuration : les formats valides sont
  conservés, les invalides ignorés, l'application démarre normalement.
- Recherche relancée avec une imprimante déjà sélectionnée : la sélection
  courante reste intacte pendant la recherche ; si le réseau change, seul un
  nouveau choix utilisateur met à jour le réglage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST permettre de définir, dans le fichier de
  configuration, la liste des formats papier au format
  « largeur×hauteur » (ex. `40x25`), formats séparés par des virgules.
- **FR-002**: System MUST afficher dans la liste déroulante « Papier » tous
  les formats définis dans la configuration, au démarrage et sans
  recompilation.
- **FR-003**: System MUST insérer les formats invalides de la configuration
  (ex. largeur/hauteur hors plage) sans perturber les formats valides.
- **FR-004**: Lors d'une recherche d'imprimantes, System MUST afficher un
  indicateur de chargement animé (spinner) dans le pied de la liste
  déroulante « Imprimante ».
- **FR-005**: System MUST masquer l'indicateur de chargement dès la fin de la
  recherche, que celle-ci soit réussie ou échouée.
- **FR-006**: Quand aucune recherche n'est en cours, System MUST afficher un
  bouton « Actualiser » au même emplacement du menu déroulant « Imprimante ».
- **FR-007**: Quand aucune recherche n'est en cours et que l'utilisateur
  actionne « Actualiser », System MUST relancer une recherche complète
  d'imprimantes et réafficher l'indicateur de chargement pendant celle-ci.
- **FR-008**: System MUST interdire tout scan concurrent : si une recherche
  est en cours, le bouton « Actualiser » n'est pas proposé.
- **FR-009**: À l'issue d'une recherche relancée, System MUST remplacer la
  liste affichée par les nouveaux résultats (imprimantes ou état
  « aucune imprimante »).

### Key Entities

- **PaperSize**: format d'étiquette (largeur, hauteur) identifié par la chaîne
  « largeur×hauteur » (ex. `40x25`) ; libellé lisible pour l'utilisateur
  (ex. « 40 × 25 mm »).
- **PrinterDevice**: imprimante réseau détectée (adresse IP, port) ; une
  imprimante est identifiée par son adresse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un utilisateur configure sa liste de formats papier en éditant
  une simple chaîne « largeur×hauteur, … » sans recompilation ; les formats
  sont disponibles dès l'ouverture de l'application.
- **SC-002**: Pendant chaque recherche d'imprimantes, un indicateur de
  chargement est visible en continu, du lancement jusqu'à la fin de la
  recherche.
- **SC-003**: Un utilisateur relance une recherche d'imprimantes en un seul
  clic, depuis le sélecteur ouvert, sans recharger la page.
- **SC-004**: Il n'est jamais possible d'observer deux recherches simultanées
  (le bouton « Actualiser » n'est jamais actionnable pendant une recherche).
- **SC-005**: Après une relance, la liste des imprimantes affichée reflète les
  résultats de la recherche la plus récente.

## Assumptions

- Le réglage des formats papier via une liste « largeur×hauteur » en
  configuration existe déjà (feature 006, variable `ZPL_PAPER_SIZES`) :
  cette capacité est **conservée et vérifiée**, non réimplémentée.
- « Spinner shadcn » = indicateur de chargement animé (rotation) ; le style
  réutilise l'icône/espacement cohérents avec l'interface existante, sans
  introduire de nouvelle dépendance.
- Le bouton « Actualiser » est visible dès qu'aucune recherche n'est en cours
  (état initial comme post-recherche, y compris après un échec) et est placé
  en pied de liste déroulante, discret.
- En cas d'échec de la recherche (réseau, réponse invalide), la recherche se
  termine proprement et le bouton « Actualiser » reste disponible.
- Portée : le mécanisme de découverte réseau lui-même n'est pas modifié
  (adresses sondées, port, budget temps).
- L'utilisateur est un opérateur technique local (l'app fonctionne sur un
  poste de bureau) ; la documentation de la variable de configuration est
  mise à jour dans le README.