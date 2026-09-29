# Bug Verification: Node 24 nvm inaccessible au user service — ouverture ciblée o+x

- **Slug**: node-nvm-access
- **Tested**: 2026-09-29
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

Le fix fonctionne : reproduite à l'identique du layout serveur (home 700 +
chaîne nvm 700 + binaire 755 sous `/home/<u>/.nvm/...`), l'ouverture pose
`o+x` sur toute la chaîne et rend le `test -x` du user service possible après
coup. Toutes les suites locales passent. Seul élément non exercé : le run
littéral `sudo ./scripts/install.sh` sur le serveur (probe `su tagmaker`
réelle, non rejouable sans root/localement) — d'où `partial` et non
`verified`, conformément aux garde-fous.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | simulation du layout serveur : home 700, `.nvm` 700, binaire 755 ; `node_open_service_access` + analyse des bits | pass | chaîne entière en `o+x` (701/701/755…/755) + binaire 755 → `test -x` autres = réussi en mode-logique |
| Défense en profondeur | `node_open_service_access` avec `anchor` vide | pass | garde `[ -n "$anchor" ]` → return 1, aucun chmod hors ancre (ajoutée pendant le test, reprise dans le diff) |
| Nouveaux tests (fix) | `sh scripts/__tests__/run-install-tests.sh` | pass | **61/61** (dont T029 : home 700→701, no-op sur 751/755, 711 préservé, ancre `/home/ipln`, exclusion hors `/home`) |
| Suite de régression TS | `npx vitest run` | pass | **306/306** |
| Lint / type-check / build | `npm run lint`, `npx tsc --noEmit`, `npm run build` | pass | 0 / 0 / 0 |
| Couverture | `npm run test:coverage` | pass | all files **93.03 %** (branches 93,29) — inchangé |
| Run serveur réel | `sudo ./scripts/install.sh` sur le serveur de prod | not-run | nécessite l'environnement de production (droits root) |

## Output Excerpts

```
== État après ouverture (chaîne home 700 → bin 755) ==
/home/ipln                                                   701
/home/ipln/.nvm                                              701
/home/ipln/.nvm/versions                                     755
.../bin                                                      755
.../node                                                     755
txr par les autres OK (o+x sur toute la chaîne + binaire o+r+x) : oui
```

```
--- Résumé tests shell ---
PASS: 61 — FAIL: 0
```

```
npx vitest run  → Test Files 26 passed, Tests 306 passed
```

## Residual Risks

- Le `test -x` réel au build (via `su -s /bin/sh tagmaker`) n'a pas été
  exercé hors serveur — la preuve repose sur l'analyse des bits (`o+x` partout
  sur la chaîne + `o+r+x` sur le binaire), proxy fidèle de la sémantique
  kernel, mais pas le run `sudo` littéral.
- `/home` lui-même en mode bizarre (sans `o+x`) n'est pas couvert par le fix —
  rare (755 standard), la probe finale alerterait quand même.
- Home sous `/root` : volontairement non ouvert (vérifié hors périmètre) —
  l'erreur explicite subsiste, canal NodeSource documenté.

## Recommendation

Le bug est résolu par le code (détection occulte), et le fix tient localement.
Sign-off final : relancer `sudo ./scripts/install.sh` sur le serveur — attendu
« Accès service ouvert : chmod o+x /home/ipln », puis « Build production (…) »
qui aboutit et service actif. Sur cette confirmation, passer le statut à
**verified** et clore.