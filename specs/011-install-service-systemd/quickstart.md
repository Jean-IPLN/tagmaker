# Quickstart — Validation déploiement serveur Unix (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25

Guide de validation end-to-end sur un serveur Unix (exemple : Debian/Ubuntu,
familles apt/dnf supportées). Réf. contrats : [cli](contracts/cli.md),
[systemd](contracts/systemd.md), [config](contracts/config.md).

## Prérequis de validation

- Serveur Unix (Linux) avec systemd et **accès administrateur (sudo)**.
- Le dépôt `tagmaker` cloné sur le serveur (utilisateur non root) ou copié.
- Node.js ≥ 20.9 et npm (le script les installe si absents).
- Une imprimante ZPL joignable pour les étapes d'impression réelles (optionnel
  jusqu'à l'étape 9).

## 1. Contrôles statiques (CI — sans serveur)

```sh
npm run lint                  # eslint (0 erreur)
npx tsc --noEmit              # types (0 erreur)
npm test                      # vitest + runner shell (vert, >80 % couv.)
sh scripts/__tests__/run-install-tests.sh   # tests POSIX du script
[ -x scripts/install.sh ] && sh scripts/install.sh --help   # usage ok
```

**Attendu** : rien ne remonte d'erreur ; `install.sh --help` sort 0 et affiche
l'usage.

## 2. Vérification hors effets de bord (`--dry-run`)

```sh
sh scripts/install.sh --dry-run
```

**Attendu** : liste des actions planifiées (prérequis, copie, build, unité,
`enable --now`) **sans** rien modifier du système ; sortie 0 sur machine
adaptée, messages `ERROR:` clairs sinon.

## 3. Installation réelle

```sh
sh scripts/install.sh
```

**Attendu** :
- récapitulatif final : service `tagmaker` **actif**, point d'accès
  `http://<ip-serveur>:3000`, commandes de contrôle affichées ;
- `systemctl status tagmaker` → **active (running)** ;
- `systemctl is-enabled tagmaker` → `enabled` (démarrage au boot).

## 4. Joignabilité LAN (FR-010 / SC-006)

Depuis **un autre poste du réseau local** :

```sh
curl -sI http://<ip-serveur>:3000 | head -1
# Attendu : HTTP/1.1 200 OK (réponse du serveur Next.js)
```

Depuis le serveur : `journalctl -u tagmaker -n 20` montre le démarrage sans
erreur.

## 5. Gestion quotidienne (US2 / FR-005)

```sh
sudo systemctl stop tagmaker && systemctl is-active tagmaker   # → inactive
sudo systemctl start tagmaker && systemctl is-active tagmaker  # → active
sudo systemctl restart tagmaker                                 # reste active
journalctl -fu tagmaker                                          # logs en direct
```

**Attendu** : chaque commande répond comme attendu ; l'application est
redevenue joignable après chaque relance.

## 6. Redémarrage serveur (US1 / FR-005)

```sh
sudo reboot
# après retour :
systemctl is-active tagmaker        # → active  (sans action manuelle)
curl -sI http://<ip>:3000 | head -1 # → HTTP 200
```

## 7. Mise à jour préservant la configuration (US3)

```sh
sudo tee -a /home/<USER>/.tagmaker.env >/dev/null <<EOF
TAGMAKER_PORT=3100
EOF
git -C /opt/tagmaker pull        # ou : git pull dans le clone d'origine
bash scripts/install.sh          # ré-exécution (ou .setup in place)
```

`<USER>` = l'utilisateur propriétaire (déclencheur sudo ; ex. `/home/ipln/.tagmaker.env` au serveur).

**Attendu** : `TAGMAKER_PORT=3100` et les `ZPL_*` personnalisés toujours
présents ; service actif sur le nouveau port
(`curl -sI http://<ip>:3100` → 200). La configuration n'est **jamais écrasée**.

## 8. Désinstallation propre (US4 / SC-005)

Les deux formes équivalentes (commande `uninstall` ou drapeau `--uninstall`) :

```sh
sh scripts/install.sh uninstall
# ou :
sh scripts/install.sh --uninstall
systemctl status tagmaker 2>&1 | grep -q "Loaded: not-found" || echo KO
ls /opt/tagmaker 2>/dev/null && echo KO   # → aucune sortie OK
pgrep -f next || echo KO                  # → aucun processus orphelin
ls /home/<USER>/.tagmaker.env 2>/dev/null && echo KO   # → config purgée
```

**Attendu** : aucune ligne `KO` — service retiré, dossier, config et processus
absents. Variante de conservation de la configuration : `uninstall
--keep-config` (ou `--uninstall --keep-config`) : `~/.tagmaker.env` préservé.

## 9. Impression réelle (optionnel, imprimante ZPL)

Ouvrir `http://<ip-serveur>:3000` depuis un poste du LAN, module
Emplacement/EAN-13, imprimer 1 étiquette avec l'imprimante paramétrée dans
`~/.tagmaker.env` : l'étiquette sort avec le code-barres relisible (SC-002,
comportement applicatif inchangé).

## Critères d'acceptation couverts

| Cible | Étape |
|-------|-------|
| SC-001 (install ≤ 2 commandes, < 10 min) | 3 |
| SC-002 (actif, boot, relance, joignable) | 3, 4, 6 |
| SC-003 (ré-exécution idempotente) | 7 |
| SC-004 (config préservée à la mise à jour) | 7 |
| SC-005 (désinstallation sans résidu) | 8 |
| SC-006 (atteinte LAN sans secret) | 4, 9 |
| FR-006 (récap + commandes affichées) | 3 |
| FR-009 (utilisateur non privilégié) | 3 (`systemctl show -p User tagmaker` → `tagmaker`)