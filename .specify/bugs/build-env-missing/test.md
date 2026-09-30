# Bug Verification: build échoue — config ZPL absente à l'évaluation des modules (next build)

- **Slug**: build-env-missing
- **Tested**: 2026-09-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Reproduction réelle **end-to-end du build** (pas un simulacre) : sans `.env`
de dépôt et sans `ZPL_*`, `next build` échoue avec exactement l'erreur du
serveur (`Configuration d'environnement invalide` à `lib/env.ts:16`, collect
`/_not-found` et `/emplacement`). Avec la config minée par le pipeline du fix
(`render_env_exports` → snippet `export` → source dans le contexte `su`), le
même build aboutit (`Generating static pages 9/9`). La vérification a en
outre démasqué le point faible du sourcing brut (valeurs à espaces) — corrigé
et re-vérifié. Aucune régression.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix, état du bug) | `.env` retiré du dossier + `env -i PATH=<node+sys> npm run build` | pass | `Configuration d'environnement invalide` à `lib/env.ts:16` sur `/_not-found` et `/emplacement` — identique au log serveur |
| Reproduction (post-fix, état corrigé) | `.env` retiré + snippet rendu sourcé + build | pass | `✓ Generating static pages (9/9)` — build complet réussi |
| New / updated tests | `sh scripts/__tests__/run-install-tests.sh` | pass | **PASS: 81 — FAIL: 0** (T031 : renderer, valeurs à espaces, snippets source, skip illisible, env vide) |
| Regression suite | `npx vitest run` | pass | **26 files, 306 tests** |
| Lint / type-check / build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | pass | rc 0 chacun |
| `su` réel serveur | `sudo ./scripts/install.sh` | skipped | requiert root/serveur ; la chaîne `su … -c "$(npm_build_command …)"` est couverte au niveau string + le pipeline de build réel a été exercé |

## Output Excerpts

```
== Àl'état du bug ==
Error: Failed to collect configuration for /_not-found
  [cause]: Error: Configuration d'environnement invalide: {"ZPL_PRINTER_HOST":["Invalid input: expected string, received undefined"], …}
  > 16 |   throw new Error(
> Build error occurred

== État corrigé ==
export ZPL_PAPER_SIZES="40x25, 75x25, 100x50, 100x150"   # snippet rendu
✓ Compiled successfully in 1703ms
✓ Generating static pages using 10 workers (9/9) in 535ms

Suite POSIX verte.   PASS: 81 — FAIL: 0
Test Files  26 passed (26) | Tests  306 passed (306)
```

## Residual Risks

- Le rendu de la config par `render_env_exports` repose sur `node` (garanti
  par `ensure_prereqs`) ; si le snippet ne peut pas être rendu, le build
  repart sans config (`log`) et retomberait sur l'erreur fixée — dégradation
  volontaire, tracée.
- La commande `su` complète n'est pas exécutable hors root ; la somme
  (string assert + pipeline de build réel avec le même snippet) couvre le
  comportement.
- npm 11/`allowScripts` (postinstall bloquées) : non causal, à surveiller.

## Recommendation

Close the bug — verified. Le fix a été durci en cours de vérification
(renderer dotenv→POSIX pour les valeurs à espaces) et re-validé par un build
`next build` réel dans les deux états. Confirmation finale serveur :
`sudo ./scripts/install.sh` → attendu `next build` abouti puis unité
enregistrée.