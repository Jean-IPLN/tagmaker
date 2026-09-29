# Bug Assessment: Node 24 nvm détecté mais inaccessible au user service — build bloqué

- **Slug**: node-nvm-access
- **Created**: 2026-09-29
- **Source**: pasted text (sortie réelle de `sudo ./scripts/install.sh` sur le serveur)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

```
Node.js v24.18.0 présent et suffisant (/home/ipln/.nvm/versions/node/v24.18.0/bin/node).
Utilisateur système tagmaker déjà présent.
Config existante conservée : /home/tagmaker/.tagmaker.env
Application déjà présente dans /opt/tagmaker (utilisée en place).
Build production (npm ci && npm run build, en tant que tagmaker)...
ERROR: Node résolu (/home/ipln/.nvm/versions/node/v24.18.0/bin/node) inaccessible au user tagmaker. Installez un Node accessible système (ex. NodeSource dans /usr/local) ou forcez TAGMAKER_NODE.
ERROR: build échoué — aucune unité enregistrée, installation existante intacte (FR-003).
```

## Symptom

Sur le serveur de production (Node 24 par nvm dans le home de l'admin `ipln`),
l'installation s'arrête au build : le Node 24 est maintenant bien trouvé
(`v24.18.0` via `~ipln/.nvm`), mais le user système `tagmaker` ne peut pas
l'exécuter, et le script échoue avec une invitation à installer un Node
système **fait main**. Attendu : l'installation se termine et le service
démarre avec le Node 24 du serveur, sans étape manuelle obligatoire.

C'est le risque « permissions nvm » déjà identifié dans
`.specify/bugs/node-ners-nvm/assessment.md` et transformé en échec explicite
(`patch/015`). Le cas le plus canonique — Node 24 managé par nvm dans un home
privé — reste donc **bloqué par construction** : ni le build (via `su
tagmaker`) ni systemd ne peuvent atteindre ce binaire.

## Reproduction

1. Serveur Linux ; Node 24 installé via nvm dans le home d'un utilisateur
   admin (ex. `/home/ipln/.nvm/...`) ; `/usr/bin/node` = paquet apt (<= 20)
   ; home admin en droits de type `700`.
2. `sudo ./scripts/install.sh` → `ensure_prereqs()` résout le Node 24 du home
   (détection `node_user_space_candidates`, install.sh:156) → « présent et
   suffisant » → **aucun Node système installé**.
3. `build_app()` (install.sh:376) : la probe `su tagmaker -c 'test -x
   <nvm-bin>'` (install.sh:384-391) échoue (home non traversable) → erreur
   explicite → installation interrompue (FR-003 : existing install intacte).

`[NEEDS CLARIFICATION]` : distribution exacte du serveur et droits actuels du
home `/home/ipln` (700 ? 750 ?) — déterminent si la réparation « +x ciblé »
suffit.

## Suspected Code Paths

- `scripts/install.sh:384-391` — probe d'accessibilité de `build_app()` : le
  point de blocage exact rapporté (erreur identique au log).
- `scripts/install.sh:236` — `NODE_BIN=$(resolve_node_bin)` dans
  `ensure_prereqs()` : tout Node ≥ plancher (fût-il hors de portée du service)
  est adopté sans vérifier l'usage futur → le repli apt/automatique n'est pas
  déclenché et il resterait de toute façon sur Node 20.
- `scripts/install.sh:156-184` — `node_user_space_candidates()` : découvre
  correctement le Node du home (`/home/ipln/.nvm`), sans moyen de le rendre
  utilisable au service.
- `scripts/install.sh:194-231` — `resolve_node_bin()` : même périmètre,
  choix « plus récent ≥ plancher » cohérent.

## Root Cause Hypothesis

Le fix `node-ners-nvm` a fait sortir du sable le Node 24 du home, mais il
reste **hors de la zone d'exécution du user service** (chaîne de répertoires
`/home/ipln/.nvm/...` non traversable en `o+x`). La probe de `build_app` —
volontaire en `patch/015` — transforme ce cas canonique en échec, et le script
n'offre aucune stratégie pour combler l'écart (Node système ≥ plancher ni
accès au home). L'installation ne peut donc pas aboutir sur le serveur réel
sans intervention manuelle. Confidence : **haute**.

## Proposed Remediation

**Preferred (choix de l'utilisateur : « ouvrir l'accès au home nvm »)** :
quand la probe échoue ET que le binaire résolu vit dans un home de
l'utilisateur déclencheur (`$SUDO_USER` ou propriétaire résolu de la chaîne),
ouvrir **parcimonieusement** l'accès au user service :

- Nouveau helper `node_open_service_access()` : remonte la chaîne de
  `/dir/to/bin` jusqu'à l'ancêtre home (`getent passwd` du propriétaire du
  path, ou `/home/<SUDO_USER>`) et applique « `chmod o+x` » (uniquement le bit
  d'exécution/traverse) à chaque répertoire qui ne l'a pas ; ne touche jamais
  ailleurs, ne retire jamais un bit, et **logue chaque commande appliquée**.
- Vérification finale par la même probe `su "$user" -c "test -x"` ; si elle
  échoue encore (nfs/ro, ACL, home verrouillé), l'erreur explicite actuelle
  subsiste en dernièrerecours.
- `build_app()` : appeler le helper avant la probe quand
  `${NODE_BIN:-}` pointe sous un home (autre que le home du user service).
- Documenter la transformation de droits (transparence + revert exact
  impossible — on n'ajoute que `+x`), très supérieure à « installez NodeSource ».

**Alternatives** :
- *Installer un Node système ≥ plancher automatiquement (NodeSource
  apt/dnf/tarball → `/usr/local`) et re-résoudre* : aucun changement de droits
  home, reproductible, mais nécessite réseau + dépôt tiers et a été écarté
  par l'utilisateur.
- *Gadauer par un flag explicite* (`TAGMAKER_OPEN_NVM_ACCESS=yes`) au lieu
  d'automatique : plus strict, mais frustre le flux `sudo` non interactif.

**Files likely to change** :
- `scripts/install.sh` (nouveau helper + appel dans `build_app`)
- `scripts/__tests__/install.test.sh` (tests du helper ; build_app non
  automatisable sans `su`)
- `specs/011-install-service-systemd/contracts/cli.md` (comportement
  « accès au Node user-space » documenté)

**Tests to add or update** :
- Helper liste exactement la chaîne minimale de répertoires concernés
  (path home → bin), sans remonter au-delà du home ;
- chmod appliqué : `o+x` posé sur chaque répertoire qui ne l'avait pas (assert
  par `stat -c '%a'`) et **inchangé sinon** ; aucun bit supprimé ;
- hors home (ex. `/usr/local/bin/node`) → aucun chmod ;
- erreur de la probe préservée quand l'ouverture échoue.

## Risks & Considerations

- **Sécurité** : on ajoute `o+x` (traverse) sur la chaîne du home admin — pas
  de lecture/écriture pour autrui ; à mettre en avant dans le log et la spec.
  Un « home » monté en NFS/hôme RO ou avec ACL peut rendre le `chmod`
  inefficace → l'erreur explicite reste le filet.
- **Idempotence** : ré-exécution de l'install → `chmod` déjà satisfaits,
  aucun changement (helper « no-op si déjà `o+x` »).
- **Runtime** : ExecStart conserve le même chemin `/home/ipln/.nvm/...` —
  aucune refonte d'unité, pas de besoin de `daemon-reload` supplémentaire.
- **Régressions** : aucun impact sur les cas « Node système suffisant » ni
  « apt fallback » ; `--dry-run` doit continuer à ne rien transformer.

## Open Questions

- [NEEDS CLARIFICATION: distribution et droits (`stat -c '%a' /home/ipln`)
  du serveur — confirment la suffisance du `+x` ciblé.]
- [NEEDS CLARIFICATION: l'admin souhaite-t-il que cette ouverture soit
  effectuée à chaque install (automatique) ou conditionnée à un flag ?]