# Bug Verification: npm ci échoue (ERESOLVE) au build d'installation serveur

- **Slug**: install
- **Tested**: 2026-09-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Le symptôme initial (§ Reproduction de l'évaluation) est **rejoué puis éteint** :
les fichiers d'avant-fix (restaurés depuis `HEAD`, `@types/node@^20`) déclenchent
à nouveau l'`ERESOLVE` exact du rapport sous **npm 10.9.2** ; les fichiers
corrigés (`^24` + lock 24.19.0) résolvent proprement sous npm 10 **et** npm 11.
Le garde-fou manifeste (T026) casse immédiatement si le major `@types/node`
redevient hors du peer vitest. Aucune régression : suites vitest et shell,
lint, tsc, build tous verts.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction pré-fix (contrôle négatif) | `git show HEAD:{package,package-lock}.json` → sandbox → `npm@10.9.2 ci --dry-run` | pass | `ERESOLVE … peerOptional @types/node@"^22.0.0 \|\| >=24.0.0" from vitest@5.0.1` — identique au rapport |
| Reproduction post-fix (npm 10, toolchain causal) | `npm@10.9.2 ci --dry-run` sur arbre corrigé | pass | `added 821 packages`, exit 0 |
| Reproduction post-fix (npm 11, toolchain dev) | `npm ci --dry-run` | pass | `added 719 packages`, exit 0 |
| Garde-fou manifeste (scénario régression) | logique T026 avec major `20` simulé vs peer `^22\|\|>=24` | pass | retour `no` → le test échouerait si on revenait à `^20` |
| Tests ajoutés (T026 + suite 011) | `sh scripts/__tests__/run-install-tests.sh` | pass | **PASS: 42 — FAIL: 0** |
| Suite vitest (régression) | `npm test` | pass | 306/306, 26 fichiers |
| Lint / type-check / build | `npm run lint` ; `npx tsc --noEmit` ; `npm run build` | pass | eslint 0, tsc OK, next build OK |

## Output Excerpts

Contrôle négatif (pré-fix, source : `HEAD`) :

```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error Could not resolve dependency:
npm error peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.1
```

Post-fix (même commande, npm 10.9.2) :

```
added 821 packages in 360ms
POST-FIX npm10 exit=0
```

Suite shell :

```
--- Résumé tests shell ---
PASS: 42 — FAIL: 0
```

## Residual Risks

- La reproduction **physique** d'`install.sh` sur un serveur apt réel (Node 20
  + npm 10 dédié) n'a pas été rejouée ici — seul le maillon causal identifié
  (`npm ci` strict sous npm 10) a été reproduit à l'identique. Le déploiement
  de recette (feature 011) reste le test de bout en bout définitif.
- `sh` utilisé pour la suite (pas `bash`) : les snippets T026 utilisent
  `sed -E`, `grep -oE` (POSIX-compatibles). Validé par la suite elle-même.
- Le contrôle « regression suite » vitest sert de filet global ; rien n'a été
  exécuté sur un serveur distant.

## Recommendation

Close — bug **verified** end-to-end sur le mécanisme racine. Le symptôme ne se
reproduit plus sous le toolchain causal (npm 10) et sous le toolchain de dev
(npm 11), le garde-fou T026 verrouille les deux classes de régression
(installation from scratch *et* cohérence manifeste/peer, indépendante du npm).
Valider physiquement le premier déploiement serveur (feature 011) en recette
comme contrôle final.