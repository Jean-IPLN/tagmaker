# Contrat CLI — script d'installation `install.sh` (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25

Le script `scripts/install.sh` est un script **POSIX `sh`** (`/bin/sh`),
exécutable en tant que `root`/sudo.

## Usage

```text
install.sh [COMMANDE] [OPTIONS]

COMMANDE (défaut : install)
  install     Installe ou met à jour le service (construction puis activation).
  uninstall   Désinstalle le service (équivalent du drapeau --uninstall).
  status      Imprime l'état du service (systemd) et du point d'accès.

OPTIONS
  -d, --dir <CHEMIN>       dossier de l'application (défaut: /opt/tagmaker)
  -e, --env <CHEMIN>       fichier de configuration (défaut: ~/.tagmaker.env,
                           home de l'utilisateur dédié, ex. /home/tagmaker/.tagmaker.env)
  -u, --user <NOM>         utilisateur système dédié (défaut: tagmaker)
  -p, --port <PORT>        port d'écoute (défaut: 3000)
  -h, --host <ADRESSE>     adresse d'écoute (défaut: 0.0.0.0)
  -U, --uninstall           désinstalle le service (drapeau équivalent à la
                            commande `uninstall` ; désactive `install`)
      --keep-config        (désinstallation) conserve le fichier ~/.tagmaker.env
                           (vaut pour `uninstall` et --uninstall)
      --dry-run            valide et affiche les actions prévues, ne modifie rien
  -q, --quiet              réduit la sortie
      --help               affiche l'usage et quitte (code 0)
```

Options aussi configurables par variables d'environnement à la même priorité
que les flags : `TAGMAKER_DIR`, `TAGMAKER_ENV`, `TAGMAKER_USER`,
`TAGMAKER_PORT`, `TAGMAKER_HOST`. **Précédence** : flag > variable > défaut.
`TAGMAKER_NODE` force le binaire Node utilisé (sinon résolution automatique,
cf. § Prérequis détectés).

## Prérequis détectés

- `root`/droits admin (sinon erreur explicite avec la commande à lancer) ;
- famille de distribution : **apt** (Debian/Ubuntu) ou **dnf/yum**
  (RHEL/Fedora/Rocky/RHEL-likes) ; toute autre famille → erreur explicite ;
- **Node.js ≥ 20.9** et `npm`. **Résolution** : `TAGMAKER_NODE` (si défini)
  sinon le binaire le plus récent satisfaisant le plancher, cherché dans **tous
  les répertoires du PATH** puis `/usr/local/bin`, `/usr/bin`, puis les
  **installations en user-space** des homes pertinents (nvm/volta/fnm du
  `SUDO_USER` déclencheur, du `HOME` courant et de `/root`), le nvm système
  (`/usr/local/nvm`) et les tarballs NodeSource (`/usr/local/nodejs*`,
  `/opt/nodejs*`) — la version du serveur (ex. Node 24 installé via nvm dans un
  home utilisateur, y compris sous `sudo` dont le « secure_path » masque le
  PATH utilisateur) est toujours préférée au paquet apt quand elle est
  atteignable ; le binaire résolu est **propagé** au build (`npm ci && npm run
  build`) et à l'unité systemd.
  Installation via le gestionnaire de paquets (apt/dnf/yum) seulement si aucun
  Node suffisant n'est atteignable ; version insuffisante → erreur avec
  instruction de mise à niveau.
  **Accessibilité du service** : le binaire résolu doit être exécutable par le
  user `TAGMAKER_USER`. Si c'est un Node user-space logé sous `/home` (nvm/
  volta/fnm) et que la chaîne d'accès n'est pas traversable (ex. home 700),
  le script ouvre **parcimonieusement** l'accès : `chmod o+x` (traverse, jamais
  de lecture/écriture pour autrui, aucun bit retiré) appliqué à chaque
  répertoire concerné et **loggé**, du home jusqu'au dossier du binaire —
  uniquement dans le home concerné. Le check `test -x` est ensuite rejoué au
  build ; en cas d'échec persistant (home verrouillé, NFS/ACL...) une erreur
  explicite invite à installer un Node accessible système (NodeSource) ou à
  forcer `TAGMAKER_NODE`.

## Comportement `install`

1. Vérifie les droits et prérequis (installation des paquets manquants).
2. Crée `TAGMAKER_USER` (si absent) — non privilégié, `nologin`, avec home
   dédié (`--create-home`).
3. Crée `~/.tagmaker.env` depuis `.env.example` **si absent** (jamais écrasé) ;
   applique host/port par défaut du contrat config.
4. Copie le dépôt vers `TAGMAKER_DIR` (propriétaire `TAGMAKER_USER`) — ou
   l'utilise en place si c'est déjà le dossier de travail.
5. Exécute `npm ci && npm run build` **en tant que** `TAGMAKER_USER`, dans un
   contexte `su` au **PATH autonome** : répertoires système
   (`/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`) plus le
   répertoire du binaire Node résolu — un compte système sans login peut avoir
   un `$PATH` vide, ce qui rendrait `sh` (lifecycle npm) introuvable
   (`ENOENT spawn sh`).
6. Écrit l'unité `/etc/systemd/system/tagmaker.service` puis
   `systemctl daemon-reload`.
7. `systemctl enable --now tagmaker` et `systemctl start tagmaker`.
8. Affiche le récapitulatif (statut, point d'accès, commandes utiles).

En cas d'échec de construction : **arrêt immédiat**, aucune unité
enregistrée/démarrée, dossier existant intact (FR-003).

## Codes de sortie

| Code | Signification |
|------|---------------|
| 0 | Succès (ou `--help`) |
| 1 | Échec d'installation/mise à jour (prérequis, build, unit) |
| 2 | Mauvaise utilisation (option ou commande inconnue) |

## Modes & priorité désinstallation

- Deux écritures **équivalentes** activent la désinstallation : la **commande**
  `uninstall` ou le **drapeau** `--uninstall` (alias court `-U`) — le besoin
  « des flags pour désinstaller » est satisfait par les deux formes.
- `--uninstall` **désactive** le mode d'installation (implicit `install` par
  défaut) : lancer `install.sh --uninstall` désinstalle sans poser de question.
- `uninstall` ET `--uninstall` ensemble → même mode, sans erreur.
- `--keep-config` ne s'applique qu'en mode désinstallation ; combiné à une
  installation (commande `install` sans `--uninstall`) → usage incorrect
  (code 2).

## Comportement `uninstall`

1. `systemctl disable --now tagmaker` (ignore l'absence d'unité).
2. Supprime `/etc/systemd/system/tagmaker.service` + `daemon-reload`.
3. Supprime `TAGMAKER_USER` et `TAGMAKER_DIR` (données du dossier).
4. Supprime `~/.tagmaker.env` (et le home dédié s'il devient vide), sauf
   `--keep-config`.
5. Sortie : récapitulatif des éléments supprimés (SC-005).

Toujours idempotent : `uninstall` sur une installation absente réussit (code 0)
avec un message informatif.

## Contrat de sortie

- Sortie **humainement lisible** (sans mode JSON prévu — YAGNI).
- `status` affiche : état systemd, PID/uptime, point d'accès
  (`http://<host>:<port>`), dossier, fichier de configuration.
- Messages d'erreur préfixés `ERROR:` ; les avertissements `WARN:`. La sortie
  standard porte le récapitulatif, les journaux d'action.

## Testabilité

- **`--dry-run`** : mêmes calculs mais aucun effet de bord (testé dans la CI,
  permutation sur répertoires temporaires, commandes externes stubfées via
  `PATH`).
- Fonctions pures exposées (parse d'arguments, détection de famille, synthèse
  d'unité, lecture de config) testées par le runner `scripts/__tests__/run-install-tests.sh`.