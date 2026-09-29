# Bug Assessment: npm ci échoue (ERESOLVE) au build d'installation serveur

- **Slug**: install
- **Created**: 2026-09-29
- **Source**: pasted text (sortie du script `scripts/install.sh` lors d'un déploiement serveur)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

Sortie d'un déploiement serveur via `scripts/install.sh` :

```
Installation des prérequis nodejs/npm via apt...
Node.js v20.19.2 installé.
Build production (npm ci && npm run build, en tant que tagmaker)...
npm ERR! code ERESOLVE
npm ERR! ERESOLVE could not resolve
npm ERR! While resolving: vitest@5.0.1
npm ERR! Found: @types/node@20.19.43
npm ERR!   dev @types/node@"^20" from the root project
npm ERR! Could not resolve dependency:
npm ERR! peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.1
npm ERR! Conflicting peer dependency: @types/node@26.6.3
...
ERROR: build échoué — aucune unité enregistrée, installation existante intacte (FR-003).
```

Pas d'URL fournie — rien à récupérer (aucune branche de la policy de fetch appliquée).

## Symptom

Le build de production exécuté par `build_app()` (`npm ci && npm run build`)
échoue avec `ERESOLVE` sur un serveur fraîchement provisionné — `npm ci` ne
trouve aucune version de `@types/node` compatible à la fois avec le devDep
racine `^20` et le peer optional de `vitest@5.0.1` (`^22.0.0 || >=24.0.0`).
Attendu : `npm ci` puis `next build` réussissent et le service est activé.
L'installation se replie correctement sur l'état existant (FR-003), mais **tout
déploiement neuf échoue à 100 %**.

## Reproduction

Le bug se déclenche en condition de premier déploiement sur une machine **sans
Node préinstallé** (l'app provisionnée par `install.sh` sur un serveur vierge) :

1. Sur un serveur (Ubuntu 24.04 par ex.) sans Node : `ensure_prereqs()` installe
   `nodejs`/`npm` via apt → **Node 20 + npm 10**.
2. `build_app()` (install.sh:283-287) : `su tagmaker -c "npm --prefix
   /opt/tagmaker ci --no-audit --no-fund && npm run build"` — `npm ci` sur un
   dossier **sans `node_modules`**.
3. Constater `npm ERR! code ERESOLVE … While resolving: vitest@5.0.1`.

**Reproduction réelle validée** (arbre neuf dans `/tmp/opencode/npmfix`, mêmes
`package.json` + `package-lock.json` que le dépôt) :

| Environnement | Manifeste | Résultat `npm ci --dry-run` |
|---|---|---|
| Node 24 / npm 11 | `@types/node@^20` | **OK** — npm 11 tolère le peer optional en conflit (arbre existant ou neuf) |
| Node 20 apt / **npm 10.9.2** | `@types/node@^20` | **ERESOLVE** — reproduction identique au rapport |
| Node 20 apt / **npm 10.9.2** | `@types/node@^24` + lock régénéré (`24.19.0`) | **OK** — 821 paquets résolus |

Conclusion : le déclencheur est la **striction du peer optional propre à
npm 10** (fourni avec le Node 20 d'apt) ; npm 11 l'ignore. Sur un serveur où
Node 24 est **déjà installé** (npm 11), le build passe — ce qui explique
qu'aucun serveur « normalement en Node 24 » n'ait rien vu avant le premier
déploiement sur machine vierge.

## Suspected Code Paths

- `package.json:34` — `devDependencies["@types/node"] = "^20"` ; en conflit
  direct avec le peer de vitest. C'est le nœud du problème.
- `package.json:48` — `devDependencies["vitest"] = "^5.0.1"` ; vitest 5.0.1
  (lock `package-lock.json:11649`) déclare : peer `@types/node`
  `^22.0.0 || >=24.0.0` **et** `engines: node ^22.12.0 || ^24.0.0 || >=26.0.0`
  → vitest 5 ne tourne même pas sous Node 20 ; ce n'est qu'une contrainte de
  dev (jamais exécuté côté serveur, qui ne lance que `next build`).
- `package-lock.json:10057` — lock verrouillé sur `@types/node@20.19.43`
  (cohérent avec la racine `^20`) : `npm ci` re-cherche une racine
  satisfaisant les peers `vitest`/`vite` → `^20` ∩ `^22||>=24` = ∅ →
  `ERESOLVE`.
- `scripts/install.sh:16-17` — `REQUIRED_NODE_MAJOR="20"`, `MINOR="9"` :
  provisionne volontairement **Node 20** via apt/dnf/yum (contrat
  spec/011 : « Node ≥ 20.9 via le gestionnaire de paquets »).
- `scripts/install.sh:283-287` — `build_app()` : `npm ci` strict sur arbre
  neuf, là où le symptôme se déclenche. `install.sh:368` assure le rollback
  FR-003 (pas de plantage partiel).
- `vite@8.3.0` (lock) — vers `^20.19.0 || >=22.12.0` : compatible avec `^24`.

## Root Cause Hypothesis

Incohérence de contraintes **au niveau manifeste/arbre de dev**, introduite
quand vitest a été promu en 5.0.1 (toolchain dev passée à Node ≥ 22.12) alors
que la racine épinglait `@types/node@^20` (types datant de l'ancien runtime
Node 20) :

1. `devDependencies["@types/node"] = "^20"` (racine) est en conflit irréductible
   avec le peer optional de vitest (`^22.0.0 || >=24.0.0`) — **aucune version
   n'appartient aux deux ranges** ;
2. sur le serveur de déploiement, la machine vierge reçoit **Node 20 + npm 10**
   via apt (`REQUIRED_NODE_MAJOR="20"`, install.sh:16) : npm 10 applique la
   striction des peers **même pour un peer optional** → `ERESOLVE` bloquant à
   `npm ci` (FR-003 rollback, install intact).

Le runtime applicatif (`next build`/`next start`) fonctionne sous Node 20 comme
sous Node 24 ; c'est la **résolution des devDependencies** qui casse le
déploiement. Sur poste de dev (Node 24 / npm 11) le conflit est silencieusement
ignoré — d'où CI verte et serveurs « en Node 24 » impeccables, jusqu'au premier
provisionnement sur machine sans Node. **Le runtime de référence est Node 24**
(cf. correction utilisateur) : `@types/node@^20` est donc faux *par ailleurs*,
et l'aligner sur `^24` règle à la fois la cohérence runtime/types et le conflit
npm 10. Confidence : **haute** (reproduit à l'identique sous npm 10.9.2).

## Proposed Remediation

**Preferred** : aligner les types sur le **runtime de référence Node 24** —
mettre `devDependencies["@types/node"]` à `^24` dans `package.json:34`, puis
régénérer `package-lock.json` (`npm install` sous Node ≥ 22). `^24` satisfait
simultanément vitest (peer `^22||>=24`), vite (peer `^20.19||>=22.12`) et
`@types/superagent` (`*`) → l'intersection n'est plus vide et **npm 10 comme
npm 11** résolvent proprement l'install. Validé en réel : avec
`@types/node@24.19.0` au lock, `npm ci --dry-run` **npm 10.9.2** passe (821
paquets), alors qu'il reproduit exactement l'`ERESOLVE` avec `^20`. Impact
réduit : `@types/node` est dév-only (typages compilés) ; le code runtime ne
consomme aucune API Node « de transition » ; l'app tourne déjà en Node 24 en
exploitation. `scripts/install.sh` n'a **pas besoin de bouger** : son plancher
Node ≥ 20.9 reste valide (sur machine vierge on tombe à 20/npm 10, mais le
build passe désormais), et vitest n'est jamais exécuté côté serveur.

**Alternatives** :
- *Standardiser le provisionnement sur Node ≥ 22* :
  `REQUIRED_NODE_MAJOR="22"` (ou `24`) dans `install.sh`, installation via
  NodeSource/fnm au lieu d'apt (car le paquet apt plafonne à Node 20) — aligne
  aussi bien le runtime que la toolchain de test (`vitest 5` exige Node ≥ 22.12
  pour tourner). Plus cohérent mais touche le contrat FR-011 (prérequis
  « Node ≥ 20.9 via gestionnaire de paquets »), ajoute une source réseau et
  réclame une révision des docs spec/011.
- *Abandonner la résolution stricte* : `.npmrc` avec `legacy-peer-deps=true`
  (ou `--legacy-peer-deps` dans `build_app()`). Contournement au coût quasi nul
  mais **désactive la validation des peers pour tout l'arbre** → à proscrire.
- *Downgrader vitest* vers un major compatible Node 20 + `@types/node@^20`
  (ex. vitest 4) avec `@vitest/coverage-v8` aligné. Rétrograde la toolchain de
  test et contredit le runtime réel Node 24 — non retenu.

**Files likely to change**:
- `package.json` (devDep `@types/node` : `^20` → `^24`)
- `package-lock.json` (régénéré — `@types/node` → 24.x)

**Tests to add or update**:
- Test shell (suite `scripts/__tests__/run-install-tests.sh`) : *garde-fou
  d'installation* — un `npm ci` from scratch aboutit (`npm ci --dry-run` dans
  une arbo temporaire) avec le Node/`REQUIRED_NODE_*` provisionné.
- Check contractuel optionnel : le major de `@types/node` du `package.json`
  doit intersecter les peers de `vitest` (lecture des deux manifestes) — sinon
  l'`ERESOLVE` règresse dès l'édition d'un devDep.

## Risks & Considerations

- `@types/node@^24` est **aligné sur le runtime de référence (Node 24)** — pas
  de dérive types/runtime ; seule la machine vierge sans Node retombe sur
  apt Node 20, mais elle n'exécute ni vitest ni les types (build `next` seul).
- Aucune modification runtime / aucune migration / aucun risque data (le
  rollout FR-003 a déjà prouvé la non-destruction de l'existant).
- Si on retient l'alternative « Node 22/24 via NodeSource » : dépendance à une
  source réseau supplémentaire et révision des docs spec/011 (contracts,
  quickstart) — inutile pour régler le bug.
- Observabilité : l'échec actuel est déjà explicite (ERESOLVE) ; le garde-fou
  CI le rend reproductible localement, sans dépendre de la stricte-striction
  d'un npm donné.

## Open Questions

- Résolu par reproduction réelle : la version npm du serveur incriminé (10.x
  du paquet apt nodejs). Le pire cas « machine vierge + npm 10 » est désormais
  couvert et passe après le fix `^24`.