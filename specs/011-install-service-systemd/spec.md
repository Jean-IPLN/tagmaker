# Feature Specification: Installation du service sur serveur Unix

**Feature Branch**: `feature/011-install-service-systemd`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "il faut faire un script d'installation pour le service. l'installations se faire sur un serveur unix le but c'est de faire un service controllable avec systemctl. il faut que je n'ai qu'a clone le repo sur le server et executer le script pour que ca tourne"

## Clarifications

### Session 2026-09-25

- Q: Le service doit-il être joignable depuis d'autres postes du réseau local, auquel cas la règle « localhost uniquement » de la constitution doit être amendée ? → A: Oui — le service écoute sur l'**interface réseau locale (LAN)**, joignable depuis les postes du réseau ; cela impose un amendement documenté de la constitution (règle « écoute locale uniquement »).
- Q: Faut-il protéger l'accès à l'application par un contrôle minimal maintenant qu'elle sera exposée sur le réseau local ? → A: **Aucun contrôle** — LAN de confiance : aucune authentification ni restriction d'adresse n'est ajoutée ; aucune machine extérieure ne doit accéder au réseau. Aucun amendement de sécurité supplémentaire.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Installation initiale sur serveur vierge (Priority: P1)

Un opérateur dispose d'un serveur Unix (Linux) fraîchement provisionné sans rien
d'installé. Il clone le dépôt du projet puis exécute **un seul script
d'installation**. Le script installe tout ce qui manque (prérequis), applique
une configuration par défaut valide, construit l'application et l'enregistre
comme **service controllable avec systemctl**. À la fin, l'application est
démarrée, disponible, et continuera de tourner seule (démarrage au redémarrage
du serveur, relance automatique après un plantage).

**Why this priority**: c'est le besoin principal et la valeur minimale viable —
« je clone, j'exécute, ça tourne ». Sans cette installation reproductible, le
déploiement exige une intervention manuelle longue et fragile.

**Independent Test**: peut être testé de bout en bout sur un serveur Unix vierge
(ou un conteneur sans aptitude à rien d'autre) : `git clone` puis exécution du
script → le service « actif » répond au point d'accès configuré ; testable sans
aucune autre fonctionnalité.

**Acceptance Scenarios**:

1. **Given** un serveur Unix vierge sans prérequis installés, **When**
   l'opérateur clone le dépôt et exécute le script d'installation, **Then** le
   script installe les prérequis manquants sans intervention manuelle, puis le
   service est démarré et déclaré **actif**.
2. **Given** le service installé et démarré, **When** le serveur redémarre,
   **Then** le service redémarre automatiquement, sans action de l'opérateur.
3. **Given** le service en cours d'exécution, **When** l'opérateur demande son
   statut via systemctl, **Then** le statut affiché est **actif (running)** et
   l'application répond sur le point d'accès configuré.

---

### User Story 2 - Gestion du service au quotidien (Priority: P2)

L'opérateur gère le cycle de vie du service pendant l'exploitation : le
**démarrer**, l'**arrêter**, le **redémarrer**, consulter son **statut** et
parcourir ses **journaux** (sortie standard et erreurs), exclusivement via la
commande de contrôle initée (systemctl). Le service est configuré pour **se
relancer automatiquement** après un arrêt anormal.

**Why this priority**: sans contrôle fiable du cycle de vie, l'exploitation ne
peut ni récupérer d'un incident ni planifier une maintenance.

**Independent Test**: après installation, exécuter successivement les commandes
de contrôle : arrêt → statut « inactif » et application injoignable ;
démarrage → statut « actif » et application joignable ; redémarrage →
l'application redevient joignable ; les journaux du service sont consultables.

**Acceptance Scenarios**:

1. **Given** le service actif, **When** l'opérateur exécute la commande
   d'arrêt, **Then** le service passe « inactif » et l'application cesse de
   répondre.
2. **Given** le service arrêté, **When** l'opérateur exécute la commande de
   démarrage, **Then** le service redevient « actif » et l'application répond.
3. **Given** n'importe quel état du service, **When** l'opérateur consulte les
   journaux, **Then** il voit la sortie standard et les erreurs du service.

---

### User Story 3 - Mise à jour du service (Priority: P2)

L'opérateur récupère une nouvelle version du dépôt (pull/stash) sur le serveur
puis **relance le même script d'installation**. Le script détecte une
installation existante, **préserve la configuration** (y compris les éventuelles
modifications de l'opérateur), reconstruit l'application et **redémarre le
service**, qui redevient disponible — le tout sans suppression ni ré-paramétrage
manuel.

**Why this priority**: un service qu'on ne peut pas mettre à jour proprement
devient obsolète ou cassé ; la mise à jour est le moment le plus critique de
l'exploitation.

**Independent Test**: modifier la configuration de l'installation (par ex. le
port), relancer le script après avoir récupéré une nouvelle version : le service
tourne avec la **configuration modifiée conservée** et la nouvelle version ;
vérifiable sans autres fonctionnalités.

**Acceptance Scenarios**:

1. **Given** une installation existante avec une configuration personnalisée,
   **When** l'opérateur récupère une nouvelle version et relance le script de
   mise à jour, **Then** la configuration personnalisée est **conservée** et le
   service s'exécute avec la nouvelle version.
2. **Given** le service en cours d'exécution, **When** la mise à jour se
   termine, **Then** le service est « actif » et l'application répond à nouveau.

---

### User Story 4 - Désinstallation du service (Priority: P3)

L'opérateur ne souhaite plus utiliser l'application sur ce serveur. Il exécute
le script avec une option de désinstallation : le service est **arrêté** puis
**retiré** du contrôle systemctl, et les fichiers d'exécution et la
configuration sont supprimés, sans laisser de processus orphelin ni de résidu.

**Why this priority**: essentiel pour un serveur propre et une reprise du
support, mais non bloquant pour la première mise en service.

**Independent Test**: après désinstallation, la commande de statut indique que
le service n'existe plus et aucun processus de l'application ne tourne ;
vérifiable sans autres fonctionnalités.

**Acceptance Scenarios**:

1. **Given** le service installé et actif, **When** l'opérateur exécute le
   script en mode désinstallation, **Then** le service est arrêté, retiré du
   système, et l'application ne répond plus.
2. **Given** la désinstallation terminée, **When** l'opérateur cherche un
   processus ou un fichier résiduel de l'application, **Then** il n'en trouve
   aucun.

---

### Edge Cases

- **Ré-exécution du script sur installation existante** : doit être sans danger
  (idempotent) — aucun prérequis ré-installé inutilement, configuration intacte,
  service redémarré proprement.
- **Prérequis manquants ou obsolètes** (durée de vie du runtime, gestionnaire de
  paquets indisponible) : le script les installe ou échoue avec un message clair
  indiquant quoi faire ; jamais d'échec silencieux.
- **Droits insuffisants** : le script exécuté sans privilèges refuse de prendre
  des demi-mesures et explique la commande à exécuter.
- **Port occupé** : l'installation détecte le conflit, rend un message explicite
  (processus fautif / paramètre à changer) et ne laisse pas un service démarré
  mais non joignable.
- **Échec de construction** : le script s'arrête net en indiquant la cause,
  sans enregistrer ni démarrer un service incomplet.
- **Plantage du service** : la politique de relance le redémarre ;
  si les échecs se répètent, l'état reste consultable dans les journaux.
- **Accès depuis un réseau non fiable** : aucune protection n'étant ajoutée
  (LAN de confiance), l'opérateur est responsable de ne pas exposer le service
  hors du réseau local (pare-feu, VLAN, etc.).
- **Interruption du script en cours d'exécution** : la ré-exécution le
  reprend sans corruption ni état incohérent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le script d'installation vérifie les prérequis du serveur et les
  installe automatiquement lorsqu'ils manquent (via le gestionnaire de paquets
  de la distribution), ou fournit une erreur explicite si l'installation
  automatique est impossible.
- **FR-002**: Le script crée automatiquement une **configuration par défaut
  valide** pour l'application si elle n'existe pas ; si elle existe, il la
  conserve telle quelle (jamais écrasée).
- **FR-003**: Le script construit l'application en mode production et détecte
  tout échec de construction, auquel cas il s'arrête sans enregistrer ni
  démarrer le service.
- **FR-004**: Le script **enregistre le service** auprès de systemd sous un nom
  stable, l'**active** (démarrage automatique au boot) et le **démarre**
  immédiatement.
- **FR-005**: Le service est configuré pour **redémarrer automatiquement** en
  cas d'arrêt anormal (plantage), et pour **démarrer au boot du serveur**.
- **FR-006**: À la fin de l'installation, le script affiche un **récapitulatif**
  clair : état du service, point d'accès configuré, et les commandes de contrôle
  disponibles (démarrage, arrêt, redémarrage, statut, journaux).
- **FR-007**: Le script est **ré-exécutable sans danger** (idempotent) : relancé
  sur une installation existante, il met à jour l'application en préservant la
  configuration et en redémarrant le service.
- **FR-008**: Le script propose une **option de désinstallation** — commande
  `uninstall` **ou drapeau** `--uninstall` (alias `-U`) — qui arrête le
  service, le retire de systemd et supprime l'installation et la configuration,
  sans processus orphelin.
- **FR-009**: Le service s'exécute sous un **utilisateur système non
  privilégié** dédié (créé par le script), jamais en tant qu'administrateur.
- **FR-010**: Le service écoute sur l'**interface réseau locale (LAN)** afin
  d'être joignable depuis d'autres postes du réseau ; l'interface et le port
  sont configurables dans la configuration.
- **FR-011**: Le service n'ajoute **aucun contrôle d'accès** (ni
  authentification, ni liste d'adresses autorisées) : l'exposition repose
  explicitement sur un réseau local **de confiance**, et la responsabilité de
  la limite du réseau incombe à l'opérateur.

### Key Entities *(include if feature involves data)*

- **Service** : unité de gestion de services (systemd) exécutant l'application
  TagMaker — nom stable, droits (utilisateur dédié), commandes de démarrage,
  politique de relance, dépendances de démarrage.
- **Configuration** : fichier de paramètres de l'application créé à
  l'installation avec des valeurs par défaut valides ; **jamais écrasé** par les
  mises à jour ; source de vérité pour le port et l'interface d'écoute.
- **Utilisateur système dédié** : compte non privilégié propriétaire de
  l'installation, sous lequel le service s'exécute.
- **Journal** : sortie standard et erreurs du service, consultables via les
  commandes de traces de systemd ; seule trace d'incident du service.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur un serveur Unix vierge, l'installation complète se fait avec
  **le clone du dépôt plus ≤ 2 commandes** (dont l'exécution du script) et
  prend **moins de 10 minutes**, sans saisie manuelle ni connaissance préalable
  du serveur.
- **SC-002**: Après installation, le service est **actif**, **joignable** sur le
  point d'accès configuré, **démarre au boot**, et **redémarre seul** après un
  plantage, sans action de l'opérateur.
- **SC-003**: 100 % des ré-exécutions du script sur une installation existante
  aboutissent **sans perte de configuration** et avec un service sain et actif.
- **SC-004**: 100 % des mises à jour préservent la configuration personnalisée
  et aboutissent à un service actif avec la nouvelle version.
- **SC-005**: La désinstallation retire **toutes** les traces (service,
  processus, fichiers du serveur) : aucune recherche manuelle de résidu n'est
  nécessaire pour obtenir un serveur propre.
- **SC-006**: Depuis n'importe quel poste du réseau local, un opérateur atteint
  l'application **sans paramétrage supplémentaire** (aucun secret à fournir).

## Assumptions

- **Serveur cible** : Linux avec **systemd** comme gestionnaire de services
  (l'utilisateur a nommé systemctl) ; la distribution dispose d'un gestionnaire
  de paquets accessible avec privilèges.
- **Prérequis** : runtime et outillage nécessaires à l'application ; le script
  les installe via le gestionnaire de paquets, sinon échoue avec instruction
  claire.
- **Droits** : le script est exécuté avec les droits d'administration (sudo) par
  l'opérateur ; il ne requiert aucune installation préalable sur le serveur.
- **Point d'accès** : le port 3000 par défaut ; le service écoute sur
  **l'interface réseau locale (LAN)** par défaut (accès depuis les postes du
  réseau, OSI) — interface et port restent configurables dans la configuration.
- **Écart constitutionnel** : l'écoute LAN dévie de la règle « écoute locale
  uniquement » de la constitution (sécurité). Cette deviation est **assumée et
  documentée** dans le cadre de la démonstration sur serveur Unix ; elle impose
  un **amendement de la constitution** (règle de sécurité assouplie pour le
  déploiement serveur) à faire valider avec cette feature.
- **Réseau de confiance** : aucun contrôle d'accès n'est ajouté au service
  (pas d'authentification, pas de liste d'adresses) ; la limitation de
  l'exposition au LAN est de la responsabilité de l'opérateur (pare-feu,
  réseau privé non routé vers Internet).
- **Données** : TagMaker ne stocke aucune donnée persistante côté serveur en
  dehors de la configuration (les réglages applicatifs vivent dans le navigateur
  de l'opérateur) — aucune sauvegarde de données n'est donc requise à
  l'installation ni à la mise à jour.
- **Périmètre** : le script concerne uniquement l'installation et l'exploitation
  du service sur serveur Unix ; aucun changement du comportement applicatif
  (module Emplacement, EAN-13, imprimantes, etc.).
- **Dépendance** : l'exécution en local (poste de travail, `npm run dev`) reste
  le mode par défaut des développeurs et reste inchangée.