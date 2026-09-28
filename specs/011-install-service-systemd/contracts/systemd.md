# Contrat systemd — service `tagmaker.service` (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25

## Nom et rôle

Le service enregistré par `install.sh` s'appelle **`tagmaker.service`** et
exécute l'application TagMaker en production (serveur Next.js), joinable sur le
réseau local par défaut.

## Contrat d'unité

| Champ | Valeur |
|-------|--------|
| `Description` | `TagMaker — impression d'étiquettes` |
| `User` / `Group` | `tagmaker` / `tagmaker` |
| `WorkingDirectory` | `/opt/tagmaker` |
| `EnvironmentFile` | `/etc/tagmaker/tagmaker.env` |
| `ExecStart` | `<node> <app>/node_modules/next/dist/bin/next start -H <host> -p <port>` |
| `Restart` | `on-failure` |
| `RestartSec` | `3` |
| `StartLimitIntervalSec` / `StartLimitBurst` | `10` / `5` |
| `StandardOutput` / `StandardError` | `journal` |
| `WantedBy` | `multi-user.target` |

- **Démarrage au boot** : activé par `systemctl enable` (install), relancé à
  chaque boot (FR-005).
- **Relance** : tout arrêt anormal (crash, signal, code de sortie ≠ 0) déclenche
  une relance ; un arrêt manuel (`systemctl stop`) ne relance pas.
- **protection marche-arrêt** : après 5 échecs en 10 s, systemd abandonne
  (état `failed`) — l'opérateur consulte les journaux pour diagnostiquer.
- `<host>` / `<port>` : lus depuis `tagmaker.env` au moment de la génération de
  l'unité (défauts `0.0.0.0` / `3000`) ; modifiables par l'opérateur.

## Commandes de contrôle (objet du besoin)

| Opération | Commande |
|-----------|----------|
| Statut | `systemctl status tagmaker` |
| Démarrer | `sudo systemctl start tagmaker` |
| Arrêter | `sudo systemctl stop tagmaker` |
| Redémarrer | `sudo systemctl restart tagmaker` |
| Journal (temps réel) | `journalctl -fu tagmaker` |
| Journal (depuis le début) | `journalctl -u tagmaker` |
| Auto-démarrage au boot | `systemctl is-enabled tagmaker` |

> Ces commandes sont affichées dans le récapitulatif final de `install.sh`
> (FR-006).

## Personnalisation opérateur

- `port`/`host` : modifier `tagmaker.env` puis `sudo systemctl daemon-reload &&
  sudo systemctl restart tagmaker` — le fichier est la **source de vérité** à
  l'installation ; un drop-in systemd reste possible pour tout autre réglage.
- Le script ne régénère l'unité que pendant une installation/mise à jour et
  **préserve** tout drop-in existant.

## Contrat applicatif exposé

Le service sert l'application sur `http://<host>:<port>` (défaut :
`http://<serveur>:3000`) sans authentification (FR-011 — LAN de confiance).
L'application nécessite les variables `ZPL_*` valides de `tagmaker.env` pour
l'impression (héritées de `.env.example`).