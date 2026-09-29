# Bug Fix: Node 24 nvm inaccessible au user service — ouverture ciblée o+x du home

- **Slug**: node-nvm-access
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Quand le binaire Node résolu est un install user-space sous `/home` (nvm/volta/
fnm) et que la chaîne n'est pas traversable par `tagmaker` (home 700), le
script ouvre maintenant **parcimonieusement** l'accès : `chmod o+x` (traverse,
jamais de lecture/écriture, aucun bit retiré) appliqué à chaque répertoire de
la chaîne, du home jusqu'au dossier du binaire, **chaque commande étant loggée**
— puis la probe `test -x` est rejouée. L'installation du serveur (Node 24 nvm
de `~ipln`) peut ainsi aboutir ; l'erreur explicite ne subsiste qu'en dernier
recours (home verrouillé, NFS/ACL).

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/install.sh` | modified | `node_home_anchor()` (ancêtre home structural d'un chemin) ; `node_open_service_access()` (chaîne `chmod o+x` confinée à l'ancre, no-op si déjà `o+x`) ; `build_app()` : ouvre l'accès avant la probe, message d'erreur mis à jour (« même après ouverture ») |
| `scripts/__tests__/install.test.sh` | added test | T029 (6 assertions) : ouverture home 700→701, no-op sur dossiers déjà `o+x`, préservation 711, ancre `/home/ipln`, exclusion hors `/home` |
| `specs/011-install-service-systemd/contracts/cli.md` | modified | comportement d'accessibilité documenté (ouverture `o+x` loggée + probe rejouée + backstop) |

## Diff Highlights

`scripts/install.sh` — l'ouverture ciblée, confinée à l'ancre home :

```sh
node_home_anchor() {          # /home/ipln/.nvm/... → /home/ipln
    u="${bin#/home/}"; u="${u%%/*}"; printf '%s' "/home/$u"
}
```

```sh
for d in $dirs; do            # dirs = chaîne [ancre → bin], ordre ancre d'abord
    case "$d" in "$anchor"|"$anchor"/*) ;; *) continue ;; esac
    case "$(dernier octet du mode)" in 1|3|5|7) ;; *) chmod o+x "$d"; log "..." ;; esac
done
```

`build_app()` appelle l'ouverture uniquement si `node_home_anchor` renvoie un
home, puis rejoue `su tagmaker -c 'test -x …'` comme arbitre final. (Ajout
pendant la vérification : garde `[ -n "$anchor" ] || return 1` en tête de
`node_open_service_access` — défense en profondeur contre un ancêtre vide,
si la protection amont de `build_app` changeait un jour.)

## Tests Added or Updated

- `scripts/__tests__/install.test.sh` :: **T029** (6 assertions) :
  - home 700 → 701 après ouverture ;
  - dossier déjà `o+x` (751, 755) → inchangé (no-op) ;
  - dossier 711 → préservé en 711 (on n'ajoute que `x`, aucun bit retiré) ;
  - `node_home_anchor` sur un vrai chemin `/home/ipln/.nvm/…/bin/node` →
    `/home/ipln` ;
  - chemin hors `/home/` → aucune ancre → la porte de `build_app` ne fait rien.

## Local Verification

- `sh scripts/__tests__/run-install-tests.sh` → **PASS: 61 — FAIL: 0**.
- `npm test` → vitest **306/306** + suite shell **61/61**.
- `npm run lint` → 0 ; `npx tsc --noEmit` → OK ; `npm run build` → OK.
- `npx vitest run --coverage` → 306/306, all files **93.03 %** (aucun code
  runtime TS touché).
- `sh -n scripts/install.sh` → OK.
- Note : `build_app` complet (probe `su` + `chown`) non automatisable sans
  root — corroboré en miroir par T029 (comportement de l'ouverture) et par le
  contrat d'accessibilité (probe existante conservée comme arbitre).

## Deviations from Assessment

- L'ouverture est **structurelle** (toute chaîne `/home/<user>/…`), pas gâtée
  au `SUDO_USER`/propriétaire : simplicité + testabilité, risque maintenu
  faible car on n'ajoute que `o+x`, le script est root, et la probe reste
  l'arbitre. Variante « flag explicite » mentionnée en alternative dans
  l'assessment (non retenue).
- Le calcul d'ancêtre est extrait en helper pur (`node_home_anchor`) pour
  pouvoir tester en sandbox (sans droits `root` sur `/home`).

## Follow-ups

- Validation serveur : relancer `sudo ./scripts/install.sh` → attendu « Node.js
  v24.x présent et suffisant », ligne « Accès service ouvert : chmod o+x
  /home/ipln » (si home fermé), build OK, service actif.
- Notifier le propriétaire du home que `+x` a été ajouté sur sa chaîne nvm
  (transparence du log).
- Cas `~/.nvm` sous `/root` : non couvert volontairement (pas d'ouverture sur
  le home root) — l'erreur explicite s'applique, canal documenté (NodeSource).