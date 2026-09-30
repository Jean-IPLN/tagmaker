# Contrat Configuration — `tagmaker.env` (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25

## Rôle

`~/.tagmaker.env` — répertoire personnel de l'utilisateur **propriétaire** de
l'installation : le déclencheur `sudo` sous sudo (ex. `/home/ipln/.tagmaker.env`
sur le serveur), sinon l'utilisateur courant — est l'**unique source de vérité
de configuration** de l'installation. Il est chargé par l'unité systemd via
`EnvironmentFile` (chemin absolu injecté au moment de la génération) et lu par
`install.sh` lors de la génération de l'unité. `-e`/`TAGMAKER_ENV` permet un
chemin explicite.

## Création

- Créé au premier `install` à partir de **`.env.example`** du dépôt (valeurs
  par défaut valides) — jamais écrasé ensuite (FR-002/FR-007).
- Le script injecte dans le fichier créé les valeurs d'écoute :

## Variables

| Variable | Défaut | Note |
|----------|--------|------|
| `ZPL_PRINTER_HOST` | de `.env.example` | requis par l'application |
| `ZPL_PRINTER_PORT` | de `.env.example` | requis |
| `ZPL_RESOLUTION_DPI` | de `.env.example` | requis |
| `ZPL_PAPER_SIZES` | de `.env.example` | requis |
| `ZPL_SCAN_SUBNET` | optionnelle | héritée telle quelle |
| `TAGMAKER_HOST` | `0.0.0.0` | adresse d'écoute (FR-010) — injectée à la création |
| `TAGMAKER_PORT` | `3000` | port d'écoute — injectée à la création |

> Les variables `ZPL_*` ne sont pas inventées : elles proviennent du
> `.env.example` du dépôt. Le script écrit uniquement `TAGMAKER_*`.

## Contrats

1. **Immutabilité** : après création, le fichier n'est modifié par aucun
   programme ; seule l'opération manuelle de l'opérateur le change.
2. **Précédence** : les valeurs du fichier définissent host/port de l'unité à la
   (ré)génération ; les flags `--port`/`--host` de `install.sh` priment sur les
   défauts **uniquement à la création** (première install).
3. **Relecture** : un changement de port/host exige
   `sudo systemctl daemon-reload && sudo systemctl restart tagmaker`
   (contrat systemd).
4. **Purge** : `uninstall` supprime `~/.tagmaker.env` (le home de l'utilisateur
   n'est **jamais** supprimé — seul le home dédié `tagmaker`, s'il est devenu
   vide, est retiré) ; `uninstall --keep-config` préserve le fichier.
5. **Sécurité** : le fichier est lisible par le propriétaire uniquement
   (`0600`, propriétaire/groupe = utilisateur propriétaire) ; aucun secret
   autre que le paramétrage imprimante n'y réside.