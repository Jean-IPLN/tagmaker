# Bug Fix: build échoue — config ZPL absente à l'évaluation des modules (next build)

- **Slug**: build-env-missing
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Le build d'installation charge désormais la config applicative avant `npm ci
&& npm run build` : le contexte `su` source `env_file_path`
(`~/.tagmaker.env` ou `TAGMAKER_ENV`) — la même source de vérité que le
runtime systemd (`EnvironmentFile`) — ce qui fournit les `ZPL_*` exigées par
`lib/env.ts` lors de l'évaluation des modules par `next build`.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/install.sh` | modified | `render_env_exports(envfile, outfile, node_bin)` nouveau — dotenv → extraits `export` POSIX sûrs (valeur à espaces/guillemets) ; `build_app()` rend le snippet (chown/chmod 600 user) et `env_load_prefix`/`npm_build_command` le sourcent dans `su` |
| `scripts/install.sh` | modified | `build_app()` passe `"$(env_file_path)"` au helper — une seule source de config, build et runtime alignés |
| `scripts/__tests__/install.test.sh` | added test | T031 (6 assertions) : présence du source dans la commande émise, skip si env vide, `[ -r ]` sur fichier illisible, et vérification fonctionnelle du dotenv par dash |
| `specs/011-install-service-systemd/contracts/cli.md` | modified | étape build 5 : config chargée (même source que runtime) + PATH autonome, JS l'« pourquoi » (évaluation `lib/env.ts` par `next build`) |

## Diff Highlights

`npm_build_command` (install.sh:436) — la config est minée en tête, le PATH
(autonome, fix `build-error`) reste posé immédiatement après :

```sh
env_load_prefix() {
    envfile="$1"
    if [ -n "$envfile" ]; then
        printf "%s" "if [ -r '$envfile' ]; then set -a; . '$envfile'; set +a; fi; "
    fi
}
```

Appel (install.sh:462) :
`su -s /bin/sh "$user" -c "$(npm_build_command "$appdir" "$node_dir" "$(env_file_path)")"`.

## Tests Added or Updated

- `scripts/__tests__/install.test.sh` :: **T031** :
  - la commande émise contient `if [ -r '<envfile>' ]`, `. '<envfile>'` et
    `set -a`/`set +a` ; avec env vide → aucun source ;
  - mécanisme vérifié par le vrai shell (`set -a; . …`) : dotenv → variable
    `ZPL_PRINTER_HOST` exportée ; fichier `chmod 000` → skip silencieux.
- `lib/__tests__/env.test.ts` — déjà existant (schéma zod `ZPL_*` verrouillé :
  validation, échec rapide, absence de `ZPL_PAPER_SIZES`) : aucun ajout
  nécessaire, constaté dans le rapport.
- Régressions : `npm_build_command` appelé sans 3ᵉ argument (T030) → `$3`
  non défini sous `set -u` ; corrigé par `envfile=${3:-}` (défensif).

## Local Verification

- `sh scripts/__tests__/run-install-tests.sh` → **PASS: 78 — FAIL: 0**
  (72 + T031).
- `npx vitest run` → **26 files, 306 tests** (dont `lib/__tests__/env.test.ts`).
- `npm run lint` → rc 0 ; `npx tsc --noEmit` → OK ; `npm run build` → OK.
- `sh -n scripts/install.sh` → OK.
- Rejeu du symptôme équivalent : la chaîne émise, amputée du `su`, source le
  dotenv puis `npm run` dans un PATH autonome → variables ZPL exportées
  (contrôles T031/T030).

## Deviations from Assessment

- **Durcissement du mécanisme (découvert pendant la vérification)** : un
  sourcing **brut** du dotenv par `.` échouait sur les valeurs à espaces non
  quotées du `.env.example` (`ZPL_PAPER_SIZES=40x25, 75x25, …` → le fragment
  `75x25,` était exécuté comme commande, `sh: 75x25,: not found` ; la variable
  jamais assignée → erreur zond identique). Le correctif rend désormais la
  config via `render_env_exports()` (Node — garanti par `ensure_prereqs`) en
  extraits `export KEY="…"` POSIX sûrs (parser dotenv : commentaires ignorés,
  guillemets optionnels retirés, `JSON.stringify`), sourcés par la commande
  `su`. Le route réel B a confirmé : config `.env.example`-style → `next build`
  aboutit (9/9 static pages).
- `lib/env.test.ts` : le plan le demandait « à ajouter » — il existait déjà à
  l'identique ; aucun changement apporté (non-régression vérifiée).
- Détail POSIX : `if [ -r … ]` plein (plutôt qu'un `-r &&` court-circuit)
  protège le `.` contre un fichier absent/illisible.

## Follow-ups

- Confirmation serveur : relancer `sudo ./scripts/install.sh` → attendu
  `next build` abouti (page data collectée avec les `ZPL_*`) puis unité
  enregistrée.
- Cas config « host vide » (générée sans `.env.example`) : le build échouera
  encore (zod `min(1)`) — comportement attendu du contrat config, à signaler
  dans la sortie du script si constaté (suivi UX possible).