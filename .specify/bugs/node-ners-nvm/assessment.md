# Bug Assessment: Node 24 nvm invisible sous sudo — repli « Node 20 présent et suffisant »

- **Slug**: node-ners-nvm
- **Created**: 2026-09-29
- **Source**: retour utilisateur après déploiement de `patch/014` (« le script cherche toujours à installer avec node 20 »)
- **Verdict**: valid
- **Severity**: medium (correctif `patch/014` insuffisant sur le déploiement réel)

## Report (verbatim or summarized)

> je ne comprends pas, le script cherche toujours à installer avec node 20

Précisions recueillies (questionnaire) :
- Node 24 installé via **nvm dans un home utilisateur** ;
- le script affiche **« Node.js v20.x présent et suffisant »** (pas « Installation des prérequis… »).

## Root Cause

`patch/014` a rendu la résolution mono-source (PATH → `/usr/local/bin` →
`/usr/bin`, plus récent ≥ 20.9) mais ne scrute **pas les installations
utilisateur**. Sous `sudo`, le PATH devient le « secure_path » de sudo (sans
nvm), `HOME` devient `/root`, et `/usr/bin/node` = Node 20 apt répond au
plancher 20.9 → le script l'adopte silencieusement, exactement le symptôme
initial. Le nvm du serveur n'était donc jamais un candidat.

Preuve locale (machine de dev) : `~/.nvm/versions/node/v24.13.0/bin/node`
existe ; en simulant l'environnement sudo (`SUDO_USER=jean HOME=/root
PATH=/usr/bin:/bin`), `resolve_node_bin` de `patch/014` renvoie vide
(secure_path) alors que le Node 24 est bien présent.

## Proposed Remediation

1. Étendre la détection aux **installs en user-space** des homes pertinents :
   - nvm : `$HOME/.nvm/versions/node/*/bin` et `/root/.nvm/...` ;
   - **home du `SUDO_USER`** (via `getent`, repli `/home/$SUDO_USER`) — c'est
     LE cas du déploiement `sudo ./install.sh` ;
   - volta (`~/.volta/bin`), fnm (`~/.local/share/fnm/node-versions/*/…`) ;
   - nvm système (`/usr/local/nvm`) et tarballs NodeSource
     (`/usr/local/nodejs*`, `/opt/nodejs*`).
2. **Accessibilité service** : un Node logé dans un home fermé (nvm, droits
   700) est indéchiffrable par le user `tagmaker`/systemd → vérifier
   (`su tagmaker -c 'test -x …'`) avant le build et échouer avec une
   instruction claire (Node accessible système via NodeSource, ou
   `TAGMAKER_NODE`).
3. Documenter dans `contracts/cli.md`.

## Files likely to change

- `scripts/install.sh` (`sudo_user_home`, `node_user_space_candidates`,
  `node_candidate_paths`, `build_app`)
- `scripts/__tests__/install.test.sh` (T028, hermétisation HOME de T027)
- `specs/011-install-service-systemd/contracts/cli.md`

## Risks & Considerations

- Accessibilité au user service morte sur home 700 → erreur explicite
  (point 2) plutôt qu'un service qui ne démarre pas.
- Sudo avec `-H` ou config préservant HOME → `$HOME` du trigger déjà couvert
  par la même passe.
- Aucune mutation système dans la détection (lecture seule de globs).