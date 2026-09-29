# Research — Installation du service sur serveur Unix (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25

## Inconnues et décisions

### D1 — Langage du script d'installation

**Decision**: script POSIX **`sh`** (interprété par `/bin/sh`), sans dépendance
bash ni outil externe non standard.

**Rationale**: décision utilisateur explicite (« un script sh ») ; `/bin/sh` est
présent sur tout système Unix ; scripts simplement testables, lisibles, sans
outillage supplémentaire. Respecte KISS.

**Alternatives considered**: `bash` (riche mais non standard sur certains Unix
minimaux) ; un script Node (nécessite Node avant d'installer) ; un paquet
(micro-manager). Toutes rejetées : `sh` suffit et colle à la demande.

### D2 — Distributions Unix cibles

**Decision**: cibler les deux familles majeures — **Debian/Ubuntu** (apt) et
**RHEL/Fedora/Rocky** (dnf/yum) — détectées par la présence de leur
gestionnaire de paquets. Toute autre famille entraîne un **échec explicite**
avec instructions, jamais un comportement approximatif.

**Rationale**: couverture du parc serveur Linux courant sans inflation de code ;
échec clair > demi-support. Le script n'installe que les paquets réellement
manquants (métrique d'idempotence).

**Alternatives considered**: uniquement Debian (plus simple, couverture réduite) ;
Nix/containers (surcoût et dépendance). Rejetées.

### D3 — Runtime Node.js : installation

**Decision**: le script installe `nodejs` + `npm` **via le gestionnaire de
paquets de la distribution** s'ils sont absents ou trop anciens ; il exige
**Node ≥ 20** (prérequis de la version de l'application, Next.js 16). Si la
distribution ne fournit pas une version suffisante, le script échoue avec une
instruction de mise à niveau explicite.

**Rationale**: pour un moniteur opérationnel, la version du gestionnaire de
paquets est suffisante et évite des dépôts tiers ; vérification de version faite
par le script. Aucun ajout de source externe (sécurité, KISS).

**Alternatives considered**: dépôt NodeSource (source externe, dernière version)
→ sur-ingénierie ; nvm (nouvel outil, plus lourd). Rejetés.

### D4 — Emplacement des fichiers d'installation

**Decision**:

| Ressource | Chemin |
|-----------|--------|
| Dossier d'application (clone/copie du code) | `/opt/tagmaker` |
| Configuration (`EnvironmentFile`) | `~/.tagmaker.env` (home de `tagmaker`, soit `/home/tagmaker/.tagmaker.env`) |
| Utilisateur système dédié (non privilégié) | `tagmaker` |
| Unité systemd | `/etc/systemd/system/tagmaker.service` |

**Rationale**: conventions Linux (FS-Standard) ; configuration hors du dossier
d'app afin d'être **préservée** par les mises à jour (FR-002/FR-007/FR-008).

**Alternatives considered**: tout dans `/opt/tagmaker` (config écrasée aux
mises à jour — fragile) ; `/srv/tagmaker`. Rejetés au profit du layout ci-dessus.

### D5 — Écoute réseau (FR-010)

**Decision**: le service démarre avec `next start` en **mode production** et
`-H 0.0.0.0` (interface réseau locale, joignable depuis le LAN) sur le **port
3000** par défaut — host et port **configurables** dans `tagmaker.env`. AUCUN
contrôle d'accès ajouté (FR-011) : exposition sur LAN de confiance,
responsabilité de l'opérateur.

**Rationale**: décision utilisateur Q1:B et Q2:A (clarifications intégrées à la
spec) ; `-H` explicite rend le comportement déterministe quel que soit le défaut
de l'exécutable.

**Alternatives considered**: bind localhost (rejeté — Q1:B) ; reverse-proxy +
TLS/authentification (hors périmètre, YAGNI).

### D6 — Politique de relance (FR-005)

**Decision**: `Restart=on-failure`, `RestartSec=3`, `StartLimitBurst=5` (créneau
de 10 s), `StandardOutput=journal`, `StandardError=journal` — le service
redémarre seul après un arrêt anormal et ses traces sont consultables via les
journaux systemd. `WantedBy=multi-user.target` (démarrage au boot).

**Rationale**: comportement attendu FR-005/FR-006, configurable par l'opérateur
via `drop-in` (patterns systemd standard, sans réécrire le script).

**Alternatives considered**: `Restart=always` (redémarre aussi suite à un arrêt
manuel — indésirable) ; watchdog applicatif (hors périmètre). Rejetés.

### D7 — Construction (FR-003)

**Decision**: le script réalise `npm ci` puis `npm run build` (production) en
tant qu'utilisateur applicatif (`tagmaker`), **avant** d'enregistrer/démarrer le
service. Toute erreur de construction interrompt le script (FR-003) — le
service existant reste **en place** (pas d'état cassé).

**Rationale**: build avant activation = jamais de service incomplet actif ;
`npm ci` (lockfile) = reproductibilité. L'utilisateur dédié possède le dossier
d'app (ni root, ni service non isolé — FR-009/FR-008).

**Alternatives considered**: build au démarrage du service (boucle de
construction au runtime — fragile, permission timide) ; build en tant que root
(mauvaises pratiques). Rejetés.

### D8 — Désinstallation (FR-008)

**Decision**: désinstallation accessible par **deux formes équivalentes** : la
sous-commande `uninstall` **et le drapeau** `--uninstall` (alias `-U`) — ce
drapeau désactive le mode d'installation par défaut (`install.sh --uninstall`
désinstalle directement). Action : `systemctl disable --now tagmaker`,
suppression de l'unité + `daemon-reload`, suppression de l'utilisateur et du
dossier `/opt/tagmaker`, purge de la configuration `~/.tagmaker.env` (avec
`--keep-config` pour la conserver). Aucun processus orphelin.**

**Rationale**: exigence FR-008 + SC-005 (pas de résidu) ; le drapeau
`--uninstall` (demande utilisateur) et la commande `uninstall` sont deux
vitrines d'un même mode — doc unique, parse d'arguments partagé ; configuration
conservable au choix — comportement explicite.

**Alternatives considered**: désinstallation partielle (config toujours
conservée) → fragile ; drapeau seul sans commande (retire la forme
« action explicite ») — rejetés : les deux formes sont retenues.

### D9 — Testabilité du script sh (constitution V)

**Decision**:
- **Lint** : `shellcheck` s'il est présent (aucune erreur dans le mode POSIX
  `sh`), sinon avertissement — jamais bloquant hors CI.
- **Tests unitaires** : `scripts/install.sh` expose des fonctions pures
  (détection de distribution, parse d'arguments, matière d'unité systemd,
  lecture de configuration) testées par un runner POSIX dédié
  (`scripts/__tests__/run-install-tests.sh`).
- **Tests d'intégration** : le mode `--dry-run` + l'exécution réelle guidée par
  `quickstart.md` (serveur cible) ; stub des commandes système via `PATH` pour
  les tests fichier-réels dans des répertoires temporaires.
- Le tout branché sur la suite existante (`npm test` lance aussi le runner sh),
  conformément à « tests au même niveau que le code source ».

**Rationale**: couvrir la logique du script sans exiger root dans la CI ;
constitution V (tests obligatoires, couverture > 80 % de la logique applicative
— le script sh suit la même exigence au travers de ses fonctions).

### D10 — Constitution : écart « écoute locale uniquement »

**Decision**: l'écoute LAN (FR-010) **dévie** de la règle de sécurité
« écoute uniquement sur localhost / jamais sur toutes les interfaces réseau ».
C'est une décision utilisateur mûrie (Q1:B), **documentée** dans la spec
(assumption « Écart constitutionnel ») ; cette feature exige un **amendement de
la constitution** (règle assouplie pour le déploiement serveur, réseau de
confiance, sans authentification — FR-011). L'amendement sera rédigé et soumis
avec l'implémentation.

**Alternatives considered**: rester en localhost (rejeté — volonté utilisateur) ;
ajouter une authentification pour compenser (rejeté — FR-011, LAN de confiance).

## Synthèse

Toutes les inconnues de la spec sont résolues : `sh` (D1), familles apt/dnf
(D2), Node ≥ 20 via gestionnaire de paquets (D3), layout `/opt` + `/etc`
(D4), écoute LAN (D5), relance systemd (D6), build-before-enable (D7),
désinstallation propre (D8), stratégie de test (D9), amendement constitution
(D10). Aucune [NEEDS CLARIFICATION] restante.