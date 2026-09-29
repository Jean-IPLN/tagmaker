# Bug Assessment: install.sh ignore Node 24 du serveur et retombe sur Node 20 (apt)

- **Slug**: node-ners
- **Created**: 2026-09-29
- **Source**: pasted text (« le serveur est bien en node 24 mais le script d'installation n'arrête pas de vouloir utiliser node 20 »)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> le serveur est bien en node 24 mais le script d'installation n'arrête pas de
> vouloir utiliser node 20.

Pas d'URL fournie — rien à récupérer (aucune branche de la policy de fetch).

## Symptom

Sur un serveur dont le Node **de référence est 24** (installé dans l'espace
utilisateur, ex. nvm/volta/fnm ou prefix custom), `scripts/install.sh` ne le
voit pas : exécuté en root (sudo), il résout `node` via le *PATH root*
(secure_path → `/usr/bin`), tombe sur le node apt (18/20), accepte Node 20.9+
comme « suffisant » ou **réinstalle le paquet `nodejs` apt (Node 20)** — et
utilise systématiquement ce Node 20 pour le build et pour l'unité systemd.
Attendu : le script détecte le Node 24 du serveur et l'utilise de bout en bout.

## Reproduction

Environnement type : Node 24 installé via nvm (ou équivalent) dans le profil
utilisateur, `/usr/bin/node` = node apt (18 ou 20) ; admin lançant
`sudo ./install.sh`.

1. `sudo ./scripts/install.sh` → `require_root()` OK. Le PATH devient celui de
   `secure_path` (sudo), **sans** le répertoire nvm (`~/.nvm/versions/node/
   v24*/bin`).
2. `command -v node` → `/usr/bin/node` (apt). `node_sufficient()` :
   - cas `/usr/bin/node` = 18 → `18 < 20` → échoue → branche apt :
     `apt-get install -y nodejs npm` → Node 20 installé puis accepté ;
   - cas `/usr/bin/node` = 20 → `20 ≥ 20.9` → retourne 0 → « présented et
     suffisant » → Node 20 utilisé sans aucune alerte.
3. `build_app()` : `su -s /bin/sh tagmaker -c "npm ..."` — shell non-login dont
   le PATH ne contient pas non plus le Node 24 → npm/node = apt Node 20.
4. `unit_template()` : `node_bin=$(command -v node)` re-résout depuis le même
   PATH root → ExecStart = Node 20.
5. Re-exécutions : même chemin → « n'arrête pas de vouloir utiliser node 20 ».

Démonstration locale (machine de dev) : `node` (PATH utilisateur)
= `~/.nvm/versions/node/v24.13.0/bin/node` (v24.13.0), mais `/usr/bin/node`
= **v18.19.1** (+ npm 9.2.0). Sous `sudo`/secure_path, le script ne peut
physiquement pas trouver le Node 24.

## Suspected Code Paths

- `scripts/install.sh:144-147` — garde « `command -v node` && `node_sufficient`
  » : dépend du PATH ambiant ; aucune recherche au-delà du PATH root.
- `scripts/install.sh:149-157` — repli `apt-get install nodejs npm` (ou
  dnf/yum) : produit un Node 20 (Ubuntu 24.04) **qui éclipse le Node 24** non
  visible ; l'installation apt est silencieuse et devient la référence.
- `scripts/install.sh:16-17` — `REQUIRED_NODE_MAJOR="20"`/`MINOR="9"` : le
  plancher 20.9 « bénit » silencieusement le Node 20 alors que le runtime de
  référence est Node 24 (alignement `@types/node@^24`, ticket précédent).
- `scripts/install.sh:281-287` — `build_app()` : `su -s /bin/sh` (shell
  non-login) → PATH du user service sans nvm → npm/node du système (20).
- `scripts/install.sh:238` — `unit_template()` : re-résout `command -v node`
  dans un 2e temps ; même binaire incohérent entre prérequis / build / service.

## Root Cause Hypothesis

Le script ne **résout jamais un binaire Node/version « de référence » unique et
ne le propage pas** entre ses étapes (prérequis → build → unité) : il dépend à
trois endroits du PATH ambiant d'un contexte root dont le secure_path exclut les
installations Node de l'espace utilisateur (nvm et assimilés). Conséquence : le
Node 24 n'est jamais découvrable, le repli apt livre/accepte Node 20, et le
plancher 20.9 valide ce choix sans erreur. Le symptôme est donc structurel et
reproductible sur tout serveur où Node 24 est installé hors du PATH root.
Confidence : **haute** (démontrable par lecture du code + environnement : Node
24 nvm présent à côté d'un `/usr/bin/node` 18/20).

## Proposed Remediation

**Preferred** : rendre la résolution du Node **explicite, prioritaire et
partagée** par toutes les étapes :

- Ajouter `resolve_node_bin()` dans `install.sh` : honorer un override
  `TAGMAKER_NODE` (env/flag documenté) ; sinon balayer PATH **puis** des
  emplacements connus (`/usr/local/bin/node`, `/usr/bin/node`) ; retenir le
  candidat satisfaisant le plancher, **favorisant la version la plus récente** ;
  si plusieurs candidats, choisir le plus récent et le loguer explicitement.
- Dans `ensure_prereqs()` : si un candidat ≥ plancher existe hors PATH
  (ex. Node 24 dans `/usr/local/bin`), l'**adopter** au lieu de
  `apt-get install nodejs` (qui l'éclipserait). Ne conserver le repli apt que
  quand aucun Node suffisant n'existe nulle part.
- Propager la cible : `build_app()` doit exporter
  `PATH="$(dirname "$node_bin"):$PATH"` dans la commande `su`, et
  `unit_template()` doit recevoir le **même** `node_bin` résolu (plus de
  re-résolution PATH discrétionnaire) pour ExecStart.
- Documenter le nouveau comportement dans `contracts/cli.md` (variable
  `TAGMAKER_NODE`, priorité de résolution).

**Alternatives** :
- *Relever le plancher* : `REQUIRED_NODE_MAJOR="24"` → `node_sufficient`
  rejette le Node 20 apt et le script **échoue explicitement** (« installez
  Node ≥ 24 ») au lieu d'accepter 20 silencieusement. Changement d'une
  constante, contraignant, mais il transforme le bug en erreur franche et
  rend la stack vitest (≥ 22.12) réellement opérante — à coupler avec le
  fixing de la résolution, sinon il faudra installer Node 24 par un autre
  canal (NodeSource) car apt plafonne à 20.
- *Pas de code, documentation* : imposer Node 24 dans `/usr/local/bin` (ou
  `/usr/bin`) via NodeSource et redocumenter le prérequis. Réglage zéro ligne
  mais ne traite pas la visibilité secure_path si Node reste hors PATH root ;
  footgun conservé.

**Files likely to change**:
- `scripts/install.sh` (`resolve_node_bin`, `ensure_prereqs`, `build_app`,
  `unit_template`, `cmd_install`, doc usage)
- `scripts/__tests__/install.test.sh` + fixtures (`bin-good`) — tests de
  priorité et de propagation
- `specs/011-install-service-systemd/contracts/cli.md` (override + priorité)

**Tests to add or update**:
- `resolve_node_bin` avec PATH synthétique contenant node 18 + node 24 → le
  chemin 24 est retenu ; avec `TAGMAKER_NODE=/usr/local/bin/node` → override
  respecté ; seulement des nodes < plancher → échec avec message explicite.
- `build_app` : la commande `su` préfixe le PATH par le répertoire du binaire
  résolu (assert via stub npm appelé depuis ce répertoire).
- `unit_template` : ExecStart contient le `node_bin` résolu (et non plus
  `node` relatif du PATH courrant).

## Risks & Considerations

- **Permissions du user service** : si le Node 24 résolu vit sous un home
  utilisateur (`~/.nvm`, droits 700), le user système `tagmaker` et systemd ne
  peuvent pas l'exécuter → prévoir un repli avec erreur claire (« Node 24 non
  accessible au user service — utilisez une installation système »), sinon on
  remplace un Node 20 silencieux par un service qui ne démarre plus.
- Cohérence avec le ticker précédent : le runtime « Node 20 silencieux »
  contredisait l'alignement `@types/node@^24` et pouvait ramener les soucis
  npm 10 ; ce fix rétablit la cohérence par construction.
- Changer ExecStart (de `node` relatif à chemin absolu résolu) est sans
  danger technique, mais toute modification d'unité impose
  `systemctl daemon-reload` déjà géré par `enable_service`.
- Pas de risque data / migration / sécurité au sens strict.

## Open Questions

- [NEEDS CLARIFICATION : sur le serveur concerné, Node 24 est-il installé via
  nvm, fnm, NodeSource (tarball `/usr/local`), ou compilation ? — détermine les
  répertoires à scanner et la faisabilité d'accès par le user `tagmaker`.]
- [NEEDS CLARIFICATION : l'admin lance-t-il `sudo ./install.sh` (PATH =
  secure_path) — cas de figure probable et confirmant le mécanisme ?]
- [NEEDS CLARIFICATION : le user `tagmaker` peut-il lire/exécuter le binaire
  Node 24 (droits du dossier nvm) ?]