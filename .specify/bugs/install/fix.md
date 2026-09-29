# Bug Fix: npm ci échoue (ERESOLVE) au build d'installation serveur

- **Slug**: install
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`@types/node` passe de `^20` à `^24` (devDependency) et le lockfile est
régénéré : le peer optional de `vitest@5.0.1` (`@types/node@^22 || >=24`) est
enfin satisfait par la racine, ce qui élimine l'`ERESOLVE` que npm 10 (apt Node
20) déclenchait au `npm ci` du déploiement sur machine vierge. Les deux
garde-fous demandés par l'évaluation (install « from scratch » + cohérence
manifeste/peer) ont été ajoutés à la suite shell (T026). `scripts/install.sh`
reste inchangé (plancher Node ≥ 20.9 conservé).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `package.json` | modified | `@types/node`: `^20` → `^24` (types alignés sur le runtime de référence Node 24) |
| `package-lock.json` | modified (régénéré) | `node_modules/@types/node` → `24.19.0`, `undici-types` → `7.24.6` ; sync des nœuds optionnels WASM `@emnapi/*`/`@tybys/*` (cosmétique, sans effet) |
| `scripts/__tests__/install.test.sh` | added | T026 : 2 assertions garde-fou (npm ci from scratch + appartenance du major aux peers de vitest) |
| `.specify/bugs/install/assessment.md` | unchanged | contrat du fix (never edited) |
| `.specify/bugs/install/fix.md` | added | ce rapport |

## Diff Highlights

`package.json` — le nœud du conflit, une seule ligne :

```diff
-    "@types/node": "^20",
+    "@types/node": "^24",
```

`package-lock.json` — résolution verrouillée sur le major accepté par vitest :

```diff
     "node_modules/@types/node": {
-      "version": "20.19.43",
+      "version": "24.19.0",
```

## Tests Added or Updated

- `scripts/__tests__/install.test.sh` :: T026 (2 assertions) :
  - `npm ci` from scratch (copie de `package.json` + lock dans un sandbox,
    `npm ci --dry-run`) aboutit — reproduit le chemin `build_app()` d'install.sh
    et échoue si manifeste/lock redeviennent incohérents (ERESOLVE).
  - le major de `@types/node` déclaré à la racine appartient aux majors du peer
    de `vitest` (lu depuis le lock) — garde-fou **indépendant du npm** : il
    casserait immédiatement si on revenait à `^20` même sous npm 11.

## Local Verification

- `sh scripts/__tests__/run-install-tests.sh` → **PASS: 42 — FAIL: 0** (suite
  011 ; le test 40→42 inclut T026).
- `npm test` → vitest 306/306 + suite shell 42/42.
- `npm run lint` → 0 warning/erreur.
- `npx tsc --noEmit` → OK.
- `npm run build` (next build) → OK.
- `npx vitest run --coverage` → 306/306, **93,03 %** (inchangé — pas de code
  source runtime touché).
- Référence croisée déja démontrée en évaluation : avec `@types/node@24.19.0`
  au lock, `npm ci --dry-run` passe sous **npm 10.9.2** (celui du serveur apt
  Node 20), alors que `^20` y réproduit l'`ERESOLVE` rapporté.

## Deviations from Assessment

Aucune sur le fond (remédiation « preferred » suivie telle quelle).
Écart de surface mineur, sans impact : la régénération du lock a également
synchronisé des nœuds optionnels de plateforme WASM (`@emnapi/core`,
`@emnapi/runtime`, `@emnapi/wasi-threads`, `@tybys/wasm-util`) issus de la
résolution npm — présence purement additive, aucun paquet retiré du runtime.

## Follow-ups

- Le garde-fou T026 « npm ci from scratch » est significatif sur le toolchain
  réel (npm 10) ; sous npm 11 une régression de *manifeste seul* est attrapée
  par la seconde assertion (appartenance du major) — couverture complète.
- `vitest@5` exige Node ≥ 22.12 pour s'exécuter : aucun impact serveur (vitest
  n'y tourne jamais), mais documenter dans `README.md`/specs que la toolchain
  de dev requiert Node ≥ 22.12 alors que le runtime d'exploitation reste
  ≥ 20.9 (bonus : le runtime de référence est Node 24).
- Le paquet apt `nodejs` (Node 20) reste un fallback correct pour le build en
  production — réévaluer si un jour `npm test` doit tourner côté serveur.