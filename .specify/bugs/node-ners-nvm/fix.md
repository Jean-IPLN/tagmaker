# Bug Fix: Node 24 nvm invisible sous sudo — détection étendue aux homes utilisateur

- **Slug**: node-ners-nvm
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

La résolution Node gagne une couche **installs en user-space** : sous `sudo`
(« secure_path » + `HOME=/root`), le Node 24 installé via nvm dans le home du
`SUDO_USER` est désormais découvert, préféré au Node 20 apt et propagé au
build et à l'unité — le symptôme « Node.js v20.x présent et suffisant »
disparaît. En contrepartie, un binaire résolu que le user `tagmaker` ne peut
pas exécuter (home nvm 700) déclenche une **erreur explicite** au build avec
les deux issues possibles (Node système via NodeSource, ou `TAGMAKER_NODE`).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/install.sh` | modified | `sudo_user_home()` (getent, repli `/home/$SUDO_USER`), `node_user_space_candidates()` (nvm/volta/fnm des homes SUDO_USER+`$HOME`+`/root` + `/usr/local/nvm` + tarballs NodeSource), intégration dans `node_candidate_paths()` ; probe `test -x` du binaire pour le user service dans `build_app()` ; usage()/dry-run accordés |
| `scripts/__tests__/install.test.sh` | modified | T027 hermétisé (`HOME` isolé — indépendance au nvm de la machine) ; nouveau T028 (4 assertions : nvm du home résolu sous PATH « secure_path », volta/fnm détectés, home vide → aucun candidat) |
| `specs/011-install-service-systemd/contracts/cli.md` | modified | résolution des installs user-space documentée + exigence d'accessibilité par le user service |
| `.specify/bugs/node-ners-nvm/assessment.md` | unchanged | contrat du fix (never edited) |
| `.specify/bugs/node-ners-nvm/fix.md` | added | ce rapport |

## Diff Highlights

`scripts/install.sh` — le cœur : les homes scrutés, y compris celui du trigger
sudo (le cas « secure_path ») :

```sh
node_user_space_candidates() {
    for h in "$(sudo_user_home)" "$HOME" /root; do
        for d in "$h/.nvm/versions/node"/*/bin "$h/.local/share/fnm/node-versions"/*/installation/bin; do
            [ -f "$d/node" ] && printf '%s\n' "$d/node"
        done
        [ -f "$h/.volta/bin/node" ] && printf '%s\n' "$h/.volta/bin/node"
    done
}
```

Accessibilité service (build_app, avant `chown`/`npm ci`) :

```sh
su -s /bin/sh "$user" -c "test -x '$NODE_BIN'" || {
    printf 'ERROR: Node résolu (%s) inaccessible au user %s. Installez un Node accessible système (ex. NodeSource dans /usr/local) ou forcez TAGMAKER_NODE.\n' ...
}
```

## Tests Added or Updated

- `scripts/__tests__/install.test.sh` :: **T028** (4 assertions) :
  - `resolve_node_bin` sous `PATH="$TEST_BIN_GOOD:/usr/bin:/bin"` + `HOME`
    contenant un faux nvm v24 → résout exactement ce binaire nvm (reproduit le
    scénario server « sudo + secure_path ») ;
  - `node_user_space_candidates` détecte les layouts volta et fnm du home ;
  - home vide → aucune install user-space (le repli apt reste atteignable) ;
  - **T027 rendu hermétique** : `HOME` isolé dans le sandbox pour que les
    résultats ne dépendent pas du nvm de la machine de dev.

## Local Verification

- `sh scripts/__tests__/run-install-tests.sh` → **PASS: 55 — FAIL: 0**
  (50 existants + T028 ; T027 hermétisé).
- `npm test` → vitest **306/306** + suite shell **55/55**.
- `npm run lint` → 0 ; `npx tsc --noEmit` → OK ; `npm run build` → OK.
- `npx vitest run --coverage` → 306/306, all files **93.03 %** (aucun code
  runtime TS touché).
- Reprise du scénario réel déclarant le bug : `SUDO_USER=jean HOME=/root
  PATH=/usr/bin:/bin resolve_node_bin` → `~/.nvm/versions/node/v24.13.0/bin/
  node` (rc 0). Non-sudo → même binaire. Le Node 20 apt n'est plus adopté
  quand un Node 24 est présent.
- `sh -n scripts/install.sh` → OK.

## Deviations from Assessment

Aucune sur le fond (remédiation suivie telle quelle). Périmètre assumé : la
probe `test -x` du user service n'est exercée qu'au build (après création de
l'utilisateur) — pas de test automatique de `build_app` (nécessite `su`/root),
limite déjà notée sur `patch/014`.

## Follow-ups

- Décider du canal de Node 24 sur le serveur réel : home nvm → le service
  fonctionnera si le home du déclencheur est traversable par `tagmaker`
  (droits 7xx), sinon l'erreur explicite du build oriente vers NodeSource.
- Confirmer le comportement observé côté serveur après déploiement du fix
  (« Node.js v24.x présent et suffisant (…) » attendu au lieu de v20).