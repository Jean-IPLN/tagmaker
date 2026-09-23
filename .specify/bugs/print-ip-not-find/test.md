# Bug Verification: L'imprimante configurée (`ZPL_PRINTER_HOST`) apparaît dans la découverte

- **Slug**: `print-ip-not-find`
- **Tested**: 2026-09-23
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

La cause mécanique est éliminée : l'exclusion ne porte plus sur
`ZPL_PRINTER_HOST`, et le test de régression montre qu'une imprimante dont
l'adresse vaut cette variable est maintenant sondée puis retournée. Tous les
contrôles locaux passent. La reproduction **réelle sur le réseau local**
(scan live du /24) n'a pas été rejouée après le fix — l'utilisateur a souhaité
la sauter — donc conformément à la garde-fou, le résultat est
`partial` plutôt que `verified`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix, équivalent automatisé) | `npx vitest run lib/printer/discovery.test.ts` — test « détecte l'imprimante configurée dans ZPL_PRINTER_HOST » | pass | Une imprimante ouverte à `192.168.1.63` (= `ZPL_PRINTER_HOST`) est bien retournée ; avant fix, `.63` n'était jamais sondée. |
| Reproduction (réseau réel) | Scan LAN `/api/printers/discover` + `nc -z 192.168.1.63 9100` | skipped | Non exécuté — l'utilisateur a refusé la vérification live (réseau) ; nécessite son consentement. |
| Nouvelles/mises à jour de tests | `npx vitest run lib/printer/discovery.test.ts` | pass | 16/16 (2 tests `getLocalIpAddresses`, test de non-régression, exclusions multi-IP). |
| Suite de régression globale | `npx vitest run` | pass | 140/140 (22 fichiers). |
| Lint / type-check | `npm run lint` + `npx tsc --noEmit` | pass | 0 warning, 0 erreur. |
| Build | `npm run build` | pass | Compiled successfully. |

## Output Excerpts

```
Test Files  22 passed (22)
Tests       140 passed (140)
TSC_OK
✓ Compiled successfully in 1321ms
```

## Residual Risks

- La validation sur le **réseau physique** n'a pas été exécutée : l'apparition
  effective de `192.168.1.63` dans le sélecteur d'imprimantes sur le LAN reste
  à confirmer (scan out-of-band d'un seul clic dans le footer de l'app).
- L'IP réelle de la machine serveur (`[NEEDS CLARIFICATION]` de l'assessment)
  reste inconnue ; le fallback « exclure rien » couvre le cas où elle ne serait
  pas dans le /24, mais aucune confirmation terrain n'a été faite.

## Recommendation

Close the bug trust with local checks, but re-run une vérification live
rapide (ouvrir le sélecteur « Imprimante » dans l'app sur le LAN) avant de
clôturer définitivement. Si `192.168.1.63` apparaît, le bug est clos ; dans le
cas contraire, réouvrir et relancer `/speckit.bug.assess` avec les nouvelles
preuves.