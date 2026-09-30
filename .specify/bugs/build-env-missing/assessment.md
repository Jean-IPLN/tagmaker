# Bug Assessment: build échoue — env ZPL requise absente à l'évaluation des modules (next build)

- **Slug**: build-env-missing
- **Created**: 2026-09-29
- **Source**: pasted text (sortie réelle de `sudo ./scripts/install.sh` sur le serveur, après le fix build-error/PATH)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

```
✓ Running next.config.ts took 405ms
...
  Creating an optimized production build ...
✓ Compiled successfully in 13.5s
✓ Finished TypeScript in 11.2s
  Collecting page data using 3 workers  ..Error: Failed to collect configuration for /_not-found
  [cause]: Error: Configuration d'environnement invalide: {
    "ZPL_PRINTER_HOST":["Invalid input: expected string, received undefined"],
    "ZPL_PRINTER_PORT":["Invalid input: expected number, received NaN"],
    "ZPL_RESOLUTION_DPI":["Invalid input: expected number, received NaN"],
    "ZPL_PAPER_SIZES":["Invalid input: expected string, received undefined"]
  }
      at module evaluation (lib/env.ts:16:9)
      at module evaluation (app/layout.tsx:28:1)
...
> Build error occurred
Error: Failed to collect page data for /_not-found
ERROR: build échoué — aucune unité enregistrée, installation existante intacte (FR-003).
```

Le `spawn sh ENOENT` (précédent bug) a disparu : le build compile et passe le
typecheck. Nouveau blocage : **la collecte de page** de `next build` évalue les
modules serveur (`lib/env.ts` via `app/layout.tsx`) et cette évaluation lance
une erreur car les variables d'environnement ZPL obligatoires sont absentes
(`undefined` / `NaN`).

## Symptom

Sans les variables `ZPL_PRINTER_HOST`, `ZPL_PRINTER_PORT`, `ZPL_RESOLUTION_DPI`
et `ZPL_PAPER_SIZES` dans l'environnement au moment du build, l'évaluation du
module `lib/env.ts:16` jette `Error: Configuration d'environnement invalide`
→ `next build` échoue (blocage FR-003). Attendu : le build aboutit —
l'installation génère pourtant la config (`~/.tagmaker.env`) à l'étape 3, mais
celle-ci n'est chargée qu'au runtime systemd (`EnvironmentFile`), jamais au
build.

## Reproduction

1. Installer le dépôt proprement, ne pas renseigner le dotenv dans le PATH du
   process `npm run build`.
2. Lancer `npm run build` (équivalent à l'étape 5 de `install.sh` : `next
   build` sous `su tagmaker`, sans export des ZPL_*).
3. Compiler passe ; `Collecting page data` échoue sur
   `Failed to collect configuration for /_not-found`, cause
   `lib/env.ts:16:9` (zod : `ZPL_*` → `undefined`/`NaN`).

Reproduisible à 100 % localement en retirant les ZPL_* de
`process.env` (le build grille déjà les modules qui importent `env`).
`[NEEDS CLARIFICATION: none — le chemin est direct]`.

## Suspected Code Paths

- `lib/env.ts:5-19` — `envSchema` requiert 4 clés ZPL sans défaut
  (`min(1)`/`positive`) ; `safeParse(process.env)` puis `throw` si invalide.
- `app/layout.tsx:31` — `getDefaultPaperSettings()` lit `env.ZPL_PAPER_SIZES` :
  le layout racine est évalué par la collecte de page de `next build`.
- `scripts/install.sh:266-304` — `create_env_file()` : écrit la config
  (`~/.tagmaker.env` ou `TAGMAKER_ENV`) depuis `.env.example`, `chown`
  au user service, `chmod 600` — **jamais chargée au build**.
- `scripts/install.sh:421-460` — `build_app()`/`npm_build_command()` : le
  `su … npm run build` ne fournit pas l'environnement applicatif.
- `scripts/install.sh:345` — l'unité systemd charge la config au runtime via
  `EnvironmentFile=${envfile}` (seul point de consommation actuel).

## Root Cause Hypothesis

`next build` évalue les modules serveur (configuration/pages) et `lib/env.ts`
exige, au moment de l'évaluation, les variables ZPL qui n'ont **aucun défaut**
dans le schéma zod. Le déploiement ne re-projette pas ces variables au process
de build : l'installation écrit bien la config, mais elle n'est exportée qu'au
démarrage du service (systemd `EnvironmentFile`). Résultat : sur un serveur
sans ces variables déjà dans son environnement, le build d'installation tombe
dès la première évaluation. Confidence : **haute** (l'émail de l'erreur
concorde 1:1 avec le schéma, et le layout racine est évalué au build).

## Proposed Remediation

**Preferred** : charger la config applicative dans l'environnement du build
`su`, en réutilisant la même source de vérité que le runtime — `env_file_path`
(`~/.tagmaker.env` ou `TAGMAKER_ENV`), déjà créée par `create_env_file()` et
lisible par le user service (`chown` + `chmod 600`).

- `npm_build_command(appdir, node_dir, envfile)` : préfixer la commande
  environnement du build avec un source du dotenv quand le fichier existe —
  ex. `[ -r 'envfile' ] && set -a; . 'envfile'; set +a; …`.
- `build_app()` passe `env_file_path` au helper ; le *sourcing* se fait dans la
  chaîne `su` (droits alignés : le home du user), avant `npm ci && npm run
  build`.
- Contrat cli.md : documenter que le build charge la config (même source que
  le runtime).

**Alternatives**:
- Copier la config dans `$TAGMAKER_DIR/.env.local` (le loading `.env*` natif
  de Next) — deux copies de la config à maintenir (dérive).
- Rendre les ZPL_* optionnelles/par défaut côté app (`lib/env.ts`) — aucun
  défaut d'imprimante sensé ; changerait le contrat config (config.md).
- Garder le build sans env et valider au runtime — incompatible : Next évalue
  `env` au build.

**Files likely to change**:
- `scripts/install.sh` (`npm_build_command`, `build_app`)
- `scripts/__tests__/install.test.sh`
- `specs/011-install-service-systemd/contracts/cli.md`

**Tests to add or update**:
- Helper : la chaîne émise contient le path du dotenv et le `set -a`/`.` ;
  `[ -r … ]` si fichier absent → pas de source (hybride string).
- Test d'intégration léger : générer un dotenv dans la sandbox, exécuter la
  commande émise sans `su`, vérifier que `npm run build` (ou un build
  minimal) voit les ZPL_* (variable exportée dans le process npm).
- (Vitest) `lib/env.test.ts` verrouillant le schéma ZPL existant.

## Risks & Considerations

- Le dotenv peut contenir `TAGMAKER_*` (port/host) : le build les charge aussi
  — sans danger (non lues au build).
- Fichier avec `chmod 600` : le *sourcing* se fait dans le contexte du user
  service (propriétaire) → lisible.
- Cas limite : config générée sans `.env.example` (host vide) → le build
  planterait encore (valeur vide, `min(1)`) — comportement attendu du contrat
  config (champ à compléter), à rester explicite dans cli.md.
- npm 11/`allowScripts` : toujours actif mais non causal.

## Open Questions

- [NEEDS CLARIFICATION: aucune — la cause est directe et le fix sur la seule
  source de vérité existante.]