# Bug Fix: build échoue — ENOENT spawn sh — PATH autonome dans le su du build

- **Slug**: build-error
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`build_app()` construit désormais la commande `su` du build via un helper
`npm_build_command()` qui embarque un **PATH autonome et complet** (répertoires
système + répertoire du binaire Node résolu) et exporte `SHELL=/bin/sh` — fini
la dépendance au `$PATH` de l'environnement `su` d'un compte système sans
login (vide/maximal → `sh` introuvable → `ENOENT spawn sh`). Cette fragilité
atteignait le déploiement serveur réel : `npm ci` réussissait, `npm run build`
mourait au spawn.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/install.sh` | modified | `npm_build_command(appdir, node_dir)` nouveau — PATH autonome (`$node_dir` + `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`), `export PATH SHELL=/bin/sh` ; `build_app()` : les deux branches fusionnées sur ce helper |
| `scripts/__tests__/install.test.sh` | added test | T030 (12 assertions) : contenu du PATH (node_dir + 6 répertoires système + appdir + SHELL) ; contrôle négatif/positif du mécanisme avec le vrai npm en `env -i` |
| `specs/011-install-service-systemd/contracts/cli.md` | modified | étape build documentée : contexte `su` au PATH autonome (`ENOENT spawn sh` explicité) |

## Diff Highlights

`scripts/install.sh` — l'ancien PATH « additionnel » (`PATH='$node_dir:\$PATH'`)
devient autonome :

```sh
npm_build_command() {
    build_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    [ -n "$node_dir" ] && build_path="$node_dir:$build_path"
    printf "%s" "PATH='$build_path'; export PATH SHELL=/bin/sh; npm --prefix '$appdir' ci --no-audit --no-fund && npm --prefix '$appdir' run build"
}
```

`build_app()` (install.sh:421) se raccord partout :
`su -s /bin/sh "$user" -c "$(npm_build_command "$appdir" "$node_dir")"`.

## Tests Added or Updated

- `scripts/__tests__/install.test.sh` :: **T030** :
  - la commande retournée contient `node_dir` (quand résolu), chaque répertoire
    système, `appdir`, et `export PATH SHELL=/bin/sh` (assertions string, sans
    `su`) ;
  - **contrôle du mécanisme**, vrai npm en `env -i` (hermétique, pas de
    réseau) : `PATH=<node_dir only>` → `npm run` échoue en « spawn sh » ;
    `PATH=<node_dir + répertoires système>` → `rc 0` — verrouille la cause
    exacte du bug et son correctif.
  - (piège outillé : le JSON du package de contrôle devait passer par un
    heredoc littéral, le `printf` de dash n'interprétant pas `\x27`.)

## Local Verification

- `sh scripts/__tests__/run-install-tests.sh` → **PASS: 72 — FAIL: 0**
  (61 + T030).
- `npm test` → vitest **306/306** + suite shell **72/72**.
- `npm run lint` → 0 ; `npx tsc --noEmit` → OK ; `npm run build` → OK.
- `npx vitest run --coverage` → 306/306, all files **93.03 %** (aucun code
  runtime TS touché — `build_app` est shell).
- `sh -n scripts/install.sh` → OK.
- Reprise de la reproduction de l'évaluation : `PATH=<node_dir>` seul → la
  pile d'erreurs serveur (`ENOENT`, `syscall spawn sh`, `path <cwd>`) est
  reproduite ; avec le PATH autonome (même + `/usr/bin:/bin`), le même script
  s'exécute (`rc 0`) — bit pour bit le delta qui manquait au serveur.

## Deviations from Assessment

Aucune sur le fond. Détail : l'ancrage `su` de `build_app` ne peut toujours
pas être automatisé hors (root) — la garantie est portée par le helper
(string) + le contrôle mécanisme T030, conformément au plan.

## Follow-ups

- Validation serveur : relancer `sudo ./scripts/install.sh` → attendu
  `added N packages` puis `next build` qui aboutit et unité enregistrée.
- npm 11 `allowScripts` : « 1 package had install scripts blocked
  (unrs-resolver@1.12.2, postinstall) » — non causal ici, mais à surveiller
  si un postinstall devenait requis au build (envisager
  `npm install-scripts approve` ou une config allowScripts ciblée).