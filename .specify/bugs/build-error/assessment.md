# Bug Assessment: build échoue — ENOENT spawn sh (npm run build sous su tagmaker)

- **Slug**: build-error
- **Created**: 2026-09-29
- **Source**: pasted text (sortie réelle de `sudo ./scripts/install.sh` sur le serveur, après le fix node-nvm-access)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

```
Build production (npm ci && npm run build, en tant que tagmaker)...
Accès service ouvert : chmod o+x /home/ipln
...
added 717 packages in 23s
...
npm notice run tagmaker-app@0.1.0 build
npm notice run next build
npm error code ENOENT
npm error syscall spawn sh
npm error path /opt/tagmaker
npm error errno -2
npm error enoent spawn sh ENOENT
npm error enoent This is related to npm not being able to find a file.
ERROR: build échoué — aucune unité enregistrée, installation existante intacte (FR-003).
```

Progression du déploiement : le fix précédent (accès `o+x` au home nvm) a
fonctionné, `npm ci` aboutit (717 paquets), mais `npm run build` → `next build`
meurt au `spawn sh ENOENT`.

## Symptom

`npm run build` (exécuté via `su -s /bin/sh tagmaker -c …`) échoue en ENOENT
sur le spawn de `sh` : npm ne trouve pas le shell nécessaire à l'exécution du
script de build. Attendu : le build aboutit et l'unité systemd est enregistrée.
L'installation est bloquée (FR-003 : aucune unité enregistrée, install
existante intacte).

## Reproduction

Mécanisme reproduit **à l'identique, bit pour bit**, en local (sandbox) : un
`npm run <script on emploie sh>` avec un `PATH` réduit au dossier du binaire
Node (contenant `node`/`npm` mais **pas de `sh`**) produit exactement la même
pile d'erreurs (`ENOENT`, `syscall spawn sh`, `path <cwd>`) :

```
$ env -i PATH="$node_dir" npm --prefix scratch run x
npm error code ENOENT
npm error syscall spawn sh
npm error path /tmp/opencode/build-enoent
npm error errno -2
npm error enoent spawn sh ENOENT
npm error enoent This is related to npm not being able to find a file.
```

Avec le même PATH mais ré-additionné des répertoires système
(`$node_dir:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`),
le même script s'exécute (`rc 0`).

`[NEEDS CLARIFICATION]` : consulter le log serveur
`/home/tagmaker/.npm/_logs/2026-09-29T14_02_20_542Z-debug-0.log` pour
confirmer le `PATH` réel du process npm (attendu : sans `/usr/bin:/bin`).

## Suspected Code Paths

- `scripts/install.sh:440` — `build_app()` : `PATH='$node_dir:\$PATH'` dépend
  du `$PATH` de l'environnement `su`. Si cet environnement est minimal/vide
  (compte système `nologin`, `env_reset` de sudo → `su` non-login), le PATH
  résultant = `$node_dir:` (segment vide = répertoire courant) **sans les
  répertoires système** → `npm` exécute `node`/`npm` (présents dans
  `$node_dir`) mais ne retrouve pas `sh` pour le lifecycle → ENOENT.
- `scripts/install.sh:442` — branche sans `NODE_BIN` : repose entièrement sur
  le PATH ambiant de `su` — même fragilité.
- `scripts/install.sh:432` — la probe `test -x` du binaire passe (elle ne
  dépend pas de `sh`), d'où une avancée jusqu'au build.

## Root Cause Hypothesis

`build_app()` construit un PATH **additionnel** (`$node_dir:$PATH`) au lieu
d'un PATH **autonome** : il dépend du contenu de `$PATH` de l'environnement
`suspendu` par `su -s /bin/sh <user sans login>`, dont le `PATH` est vide ou
ne contient pas les répertoires système. Le `sh` du lifecycle npm devient
alors introuvable → `ENOENT spawn sh`, exactement reproduit en local.
Confidence : **haute** (reproduction bit pour bit de la pile d'erreurs ; la
conjonction « npm trouvé dans $node_dir » + « sh introuvable » n'est possible
que quand standard-dirs manquent).

## Proposed Remediation

**Preferred** : rendre le PATH **autonome et complet** dans `build_app()`, sans
dépendre de l'environnement `su` :

- cas `node_dir` :
  `PATH="$node_dir:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"`
  (plus `SHELL=/bin/sh` exporté, pour l'exécuteur npm) ;
- cas sans `node_dir` : le même PATH système complet sans préfixe ;
- extraire la commande dans un helper pur `npm_build_command(appdir, node_dir)`
  → retourne la chaîne `su -c …` complète, testable sans `su`.

**Alternative** : utiliser `env -i` (`su -s /bin/sh user -c "env -i PATH=… npm …"`)
pour un environnement 100 % maîtrisé — plus strict, légèrement plus invasif.

**Files likely to change**:
- `scripts/install.sh` (`build_app`, nouveau helper)
- `scripts/__tests__/install.test.sh`
- `specs/011-install-service-systemd/contracts/cli.md` (note build/ctx PATH)

**Tests to add or update**:
- Helper `npm_build_command` : la chaîne retournée contient `node_dir` + les
  répertoires système (`/usr/bin`, `/bin`) et l'`appdir` (assert string) ;
- contrôle négatif + positif (méthode prouvée ici) : scruter un package minimal
  avec le vrai npm, `PATH=node_dir` seul → ENOENT `spawn sh` ; PATH complet →
  `rc 0` (hermétique, via `OLD_PATH`).

## Risks & Considerations

- **Régression** : le PATH complet est exposé ; aucun impact hors du processus
  `npm` du build.
- **npm 11 + allowScripts** : le log montre « 1 package had install scripts
  blocked … unrs-resolver@1.12.2 » — fonctionnalité récente de npm 11 ; à
  surveiller (postinstall bloquée) mais non causal ici (l'échec est le `sh`).
- **Couverture** : `build_app` non automatisable sans `su`/root (limite déjà
  posée) — compensée par les tests du helper et du mécanisme PATH.

## Open Questions

- [NEEDS CLARIFICATION: contenu réel du `PATH` dans le log npm serveur
  (confirme la vacuité du PATH sous `su`).]
- [NEEDS CLARIFICATION: les installations serveur antérieures (avant les fixes
  Node) ont-elles jamais atteint un build réussi via `su tagmaker` ? — permet
  de savoir si le cas « PATH su vide » est historique ou induit.]