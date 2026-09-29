# Bug Verification: build échoue — ENOENT spawn sh — PATH autonome du build

- **Slug**: build-error
- **Tested**: 2026-09-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

La reproduction de l'évaluation a été rejouée à l'identique et le correctif
tient : avec un `PATH` réduit au seul répertoire du binaire Node, `npm run`
meurt toujours en `ENOENT spawn sh` (pile d'erreurs bit pour bit, `rc 254`) —
c'est le marqueur du bug ; avec le `PATH` autonome désormais émis par
`npm_build_command` (node_dir + répertoires système, `SHELL=/bin/sh`), le même
lifecycle s'exécute (`rc 0`). Aucune régression.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix, identification) | `env -i PATH="$node_dir" npm run x` | pass | reproduit la pile serveur `ENOENT / spawn sh / enoent spawn sh ENOENT`, `rc 254` — état pathologique correctement reconnu |
| Reproduction (post-fix, correctif) | `env -i PATH="$node_dir:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" npm run x` | pass | script `sh -c 'echo ok'` exécuté, `rc 0` — delta exact du correctif |
| Commande émise par le fix | `env -i PATH=<build_path> SHELL=/bin/sh npm run x` | pass | `rc 0` ; le contenu string de la commande (node_dir, 6 répertoires système, appdir, SHELL) est verrouillé par T030 |
| New / updated tests | `sh scripts/__tests__/run-install-tests.sh` | pass | **PASS: 72 — FAIL: 0** (T030 inclus, 12 assertions) |
| Regression suite | `npx vitest run` | pass | **26 files, 306 tests** |
| Lint / type-check / build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | pass | rc 0 chacun |
| Wrapper `su` réel | `sudo ./scripts/install.sh` sur le serveur | skipped | requiert root/serveur ; non nécessaire à la preuve — le PATH est désormais indépendant de l'environnement `su` |

## Output Excerpts

```
== Identification (PATH node_dir seul) ==
npm error code ENOENT
npm error syscall spawn sh
npm error enoent spawn sh ENOENT
rc=254

== Correctif (PATH autonome) ==
> t@0.0.1 x
> sh -c 'echo ok'
ok
rc=0

Suite POSIX verte.   PASS: 72 — FAIL: 0
Test Files  26 passed (26) | Tests  306 passed (306)
```

## Residual Risks

- La fonction `npm_build_command` est testée au niveau string + mécanisme ;
  l'appel réel `su -s /bin/sh tagmaker -c …` n'est pas automatisable hors
  root — mais sa dépendance (le `$PATH` du compte sans login) est devenue sans
  objet car le PATH est entièrement reconstruit côté helper.
- npm 11 `allowScripts` : postinstall bloquée (unrs-resolver@1.12.2) dans le
  log serveur actuel — non causal ici ; à revoir si un postinstall devient
  requis au build.

## Recommendation

Close the bug — verified. Le rejet du bug (`ENOENT spawn sh`) et son issue
(PATH autonome) sont prouvés par la reproduction bit pour bit des deux états,
avec le vrai npm. Confirmation finale optionnelle : relancer
`sudo ./scripts/install.sh` sur le serveur et constater le `next build` qui
aboutit puis l'enregistrement de l'unité.