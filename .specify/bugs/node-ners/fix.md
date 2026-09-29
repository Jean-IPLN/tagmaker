# Bug Fix: install.sh ignore Node 24 du serveur et retombe sur Node 20 (apt)

- **Slug**: node-ners
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

`scripts/install.sh` résout désormais **un binaire Node unique de référence**
et le **propage de bout en bout** (prérequis → build → unité systemd), au lieu
de dépendre trois fois du PATH ambiant d'un contexte root dont le secure_path
masque les Node installés en user-space (nvm et assimilés). Résultat : sur un
serveur où Node 24 est installé (ex. `~/.nvm`), le script l'adopte au lieu de
retomber sur le paquet apt Node 20. Un override `TAGMAKER_NODE` permet de
forcer un binaire précis ; le repli apt ne sert plus que lorsqu'aucun Node ≥
20.9 n'est atteignable nulle part.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/install.sh` | rewritten | `resolve_node_bin()` (override `TAGMAKER_NODE` → scan du PATH complet → `/usr/local/bin` → `/usr/bin`, plus récent ≥ plancher), `node_candidate_sufficient()`, `node_candidate_paths()`, `node_version_of()` ; `ensure_prereqs()`, `build_app()`, `unit_template()`, `dry_run_install()`, `usage()` mis en accord ; global `NODE_BIN` |
| `scripts/__tests__/install.test.sh` | added | `make_fake_node()` (helper de binaire factice) + T027 (8 assertions : suffisance, priorité PATH, override, propagation ExecStart) |
| `specs/011-install-service-systemd/contracts/cli.md` | modified | variable `TAGMAKER_NODE`, priorité de résolution et propagation documentées |
| `.specify/bugs/node-ners/assessment.md` | unchanged | contrat du fix (never edited) |
| `.specify/bugs/node-ners/fix.md` | added | ce rapport |

## Diff Highlights

`scripts/install.sh` — cœur du fix, résolution mono-source puis propagation :

```sh
# les fonctions de formatage de version et d'évaluation du plancher sont
# remplacées par un balayage des candidats + choix du plus récent :
NODE_BIN=$(resolve_node_bin) || return 1   # inside ensure_prereqs()
```

Propagation au build et au service : `build_app()` préfixe le PATH de la
commande `su` par `dirname "$NODE_BIN"` (`PATH='$node_dir:\$PATH'`), et
`unit_template()` lit `node_bin=${NODE_BIN:-}` (repli `command -v node`) pour
`ExecStart` — le binaire vérifié à l'étape prérequis est celui qui compile et
celui qui sert.

## Tests Added or Updated

- `scripts/__tests__/install.test.sh` :: T027 (8 assertions), helper
  `make_fake_node(dir, ver)` (script POSIX qui répond `v<ver>` sur `-v`) :
  - `node_candidate_sufficient` : 18 → refusé ; 20.19 et 24 → acceptés ;
    chemin inexistant → refusé.
  - `resolve_node_bin` sous PATH synthétique (node 18 + node 24) → le Node 24
    gagne (priorité au plus récent ≥ plancher).
  - `TAGMAKER_NODE` forcé vers un 20 suffisant → honoré même si un 24 est
    détectable ; verso binaire invalide → échec explicite.
  - `unit_template` avec `NODE_BIN` posé → `ExecStart` contient ce chemin
    absolu (le service démarre avec le Node résolu).
  - Le sous-shell du test PATH isolé ré-suffixe `/usr/bin:/bin` pour préserver
    les utilitaires POSIX (`tr`/`sed`/`cut`) hors du PATH d'essai.

## Local Verification

- `sh scripts/__tests__/run-install-tests.sh` → **PASS: 50 — FAIL: 0**
  (42 existants + T027).
- `npm test` → vitest **306/306** + suite shell **50/50**.
- `npm run lint` → 0 warning/erreur ; `npx tsc --noEmit` → OK ;
  `npm run build` → OK.
- `npx vitest run --coverage` → 306/306, all files **93.03 %** (branches 93,29),
  stable (aucun code runtime TS touché).
- Reprise du scénario réel de l'évaluation (machine de dev : nvm Node 24.13.0
  face à `/usr/bin/node` 18.19.1) :
  - PATH utilisateur nvm → `resolve_node_bin` → `~/.nvm/versions/node/v24.13.0/
    bin/node` (rc 0) — le Node 24 du serveur est bien adopté ;
  - PATH simulé `secure_path` (`/usr/bin:/bin`) → rc 1 (refusé) → branche apt
    du script ; override `TAGMAKER_NODE=/usr/bin/node` (18 < 20.9) → rc 1,
    refusé ; `TAGMAKER_NODE` inexistant → rc 1 avec erreur explicite.
  - `--dry-run install` (T009) reste vert malgré la ligne Node ajoutée.

## Deviations from Assessment

- **Risque « permissions nvm » non traité** : un Node résolu sous un home 700
  (`~/.nvm`) reste inaccessible au user `tagmaker`/systemd. La remédiation
  préférée demandait un repli avec erreur claire ; le fix actuel propage ce
  binaire dans l'unité sans contrôle de droits préalable. Suivi ouvert (cf.
  Follow-ups) — le cas par défaut documenté (Node 24 atteignable via
  `/usr/local/bin` ou `/usr/bin`) n'est pas concerné.
- **Test `build_app` non automatisé** : l'assertion prévue (stub npm appelé
  depuis le répertoire résolu) nécessite `su`/root ; la propagation build est
  couverte par construction (même `NODE_BIN`) et le comportement PATH-prefix
  est validé par inspection du diff + T027 (propagation au service). Noté comme
  limite de la suite shell non-root.
- Le repli résolution « plancher conservé 20.9 » suit la remédiation
  « preferred » ; l'alternative « relever le plancher à 24 » a été écartée
  (changement de contrat d'exigence, hors périmètre du bug).

## Follow-ups

- **Vérifier l'accès du user service au Node résolu** (nvm 700) : décider entre
  une installation système Node 24 (NodeSource/tarball `/usr/local`) ou un
  contrôle de droits dans le script avant de générer l'unité (repli avec erreur
  explicite). Ne pas oublier `systemctl daemon-reload` déjà géré par
  `enable_service` si ExecStart devait changer.
- Clôturer les trois questions ouvertes de l'évaluation (canal d'installation
  du Node 24 serveur, lancement `sudo`, droits du dossier nvm) — déterminantes
  pour le playbook de déploiement réel.
- Le plancher 20.9 vs runtime de référence 24 : la stack vitest exige Node ≥
  22.12 côté dev ; rien ne change pour le build production désormais capsulé
  sur le Node résolu — réévaluer le plancher si l'écart devenait gênant.