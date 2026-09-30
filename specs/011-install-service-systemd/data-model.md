# Data Model — Installation du service sur serveur Unix (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25

## Vue d'ensemble

Le déploiement produit quatre persistants système :

```text
/opt/tagmaker/                  # code + build de l'application (propriétaire: tagmaker)
~/.tagmaker.env                  # configuration (EnvironmentFile), home de
                                 #   l'utilisateur propriétaire = déclencheur sudo
                                 #   sous sudo (ex. /home/ipln/.tagmaker.env)
/etc/systemd/system/tagmaker.service  # unité systemd
utilisateur système "tagmaker"  # compte d'exécution non privilégié, sans home
                                # (caches : /run/tagmaker via RuntimeDirectory)
```

## Entités

### Application déployée (`/opt/tagmaker`)

- **Représente** : le code source cloné + l'artefact de production (build).
- **Attributs** : propriétaire = `tagmaker`, groupe `tagmaker`, dossier racine de
  l'unité (`WorkingDirectory`).
- **Règles** :
  - jamais écrite par autre chose que le script d'installation/mise à jour ;
  - la configuration **ne vit pas ici** (voir `tagmaker.env`) — distinction
    code/config = condition de FR-002/FR-007 (configuration préservée).
- **Fiabilité** : si le build échoue, le dossier existant reste intact et le
  service continue de tourner (FR-003).

### Configuration (`~/.tagmaker.env` — home de l'utilisateur service)

- **Représente** : le paramétrage d'exploitation de l'application.
- **Emplacement** : `~/.tagmaker.env`, le `~` étant le répertoire personnel de
  l'utilisateur **propriétaire** (déclencheur sudo sous sudo, ex.
  `/home/ipln/.tagmaker.env` ; sinon utilisateur courant). Un chemin explicite
  via `-e`/`TAGMAKER_ENV`
  reste possible.
- **Genre** : fichier clé-valeur utilisable comme `EnvironmentFile` systemd,
  produit à partir de `.env.example` du dépôt.
- **Cycle de vie** : créé à la première installation (valeurs par défaut
  valides) ; **jamais écrasé** par les mises à jour (FR-002, FR-007) ; purgé à
  la désinstallation sauf `--keep-config` (FR-008).
- **Règles** : valeurs par défaut = celles de `.env.example` ; `ZPL_*` requis
  pour le fonctionnement applicatif — le script **présuppose** leur présence
  lorsque le dépôt est déjà configuré pour une imprimante (pas de génération
  de secret, constitution : aucun secret en dur).
- **Précédence** : les valeurs présentes sont la seule source de vérité ; le
  script n'écrit que si le fichier n'existe pas.

### Unité systemd (`tagmaker.service`)

- **Représente** : la déclaration du service auprès de systemd.
- **Contenu stable** : `Description`, `User=tagmaker`, `Group=tagmaker`,
  `WorkingDirectory=/opt/tagmaker`, `EnvironmentFile=%h/.tagmaker.env`
  (défaut, `%h` = home de `tagmaker`) ou chemin exact si `TAGMAKER_ENV` fixé,
  `ExecStart=<node> .../node_modules/next/dist/bin/next start -H <host> -p <port>`,
  `Restart=on-failure`, `RestartSec=3`, `StartLimitIntervalSec=10`,
  `StartLimitBurst=5`, `StandardOutput=journal`, `StandardError=journal`,
  `WantedBy=multi-user.target`.
- **Règles** : host et port proviennent de la configuration (défauts
  `0.0.0.0` et `3000`) ; modifications opérateur possibles par **drop-in**
  systemd — le script ne régénère l'unité que pour un changement de
  source/chemin, jamais pour un drop-in (stabilité).

### Utilisateur système `tagmaker`

- **Représente** : le compte d'exécution non privilégié du service.
- **Règles** : créé par le script sans shell de connexion (`nologin`), sans
  mot de passe et avec un répertoire personnel dédié (`--create-home`, où vit
  `~/.tagmaker.env`) ; propriétaire de `/opt/tagmaker` ; jamais utilisé en
  administrateur (FR-009). Supprimé à la désinstallation.

## États & transitions

### Cycle de vie du service

```text
NULL ──install──► INSTALLÉ (inactif) ──start──► ACTIF
  ▲                    ▲                            │ restart
  │                    │ uninstall                   ▼
  └──── uninstall ─────┼──────────────────────── ACTIF (redémarre)
        (retire tout)  │
                        ├──── crash ────► restart automatique (on-failure)
                        └──── stop ─────► INACTIF (reste enregistré)
```

Transitions légales :

| État actuel | Action | État suivant |
|-------------|--------|--------------|
| NULL | `install` (première fois) | INSTALLÉ puis ACTIF (unit `enable --now`) |
| INSTALLÉ/ACTIF | `install` (ré-exécution) | código à jour, config préservée, ACTIF |
| ACTIF | `uninstall` (commande **ou** `--uninstall`) | NULL (purge, daemon-reload) |
| ACTIF | contrainte external (crash) | ACTIF après relance `on-failure` |
| ACTIF | arrêt manuel systemd | INACTIF (enregistré, `enable` conservé) |

### Invariants de l'installation

1. Il existe toujours 0 ou 1 unité `tagmaker.service`.
2. `tagmaker.env` n'est jamais modifié après sa création, sauf purge à la
   désinstallation.
3. Le dossier build n'est jamais laissé dans un état partiel actif : build
   avant activation (ordres D7).
4. L'utilisateur `tagmaker` n'a aucune permission au-delà de `/opt/tagmaker` et
   des fichiers de configuration (droits minimaux, FR-009).
5. Aucune donnée applicative n'est stockée côté serveur en dehors de la
   configuration (réglages navigateur) — pas de sauvegarde de données requise.