# Implementation Plan: Installation du service sur serveur Unix (feature 011)

**Branch**: `feature/011-install-service-systemd` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-install-service-systemd/spec.md`

**Note**: Ce plan est produit par `/speckit.plan` (Phases 0-1) ; `tasks.md` sera
généré par `/speckit.tasks`.

## Summary

Installer l'application TagMaker sur un serveur Unix en un script **POSIX `sh`**
: prérequis (Node ≥ 20.9 via le gestionnaire de paquets figé), configuration
conservée, build production, unité systemd `tagmaker.service` (enable --now,
relance on-failure, LAN sur `0.0.0.0:3000` configurable, utilisateur dédié non
privilégié), récapitulatif final + **désinstallation avec la commande
`uninstall` ou le drapeau `--uninstall`/`-U`** (options `--keep-config`,
`--dry-run`). Script testable en CI (`--dry-run` + runner POSIX) sans nécessiter
de root. Détails phase 0 : [research.md](research.md).

## Technical Context

**Language/Version**: POSIX `sh` (`/bin/sh`) pour le script d'installation ;
application existante en Node.js/Next.js 16 (Node ≥ 20.9 — vérifié dans
`next/package.json`).

**Primary Dependencies**: utilitaires POSIX standard (`cp`, `rm`, `grep`,
`sed`, `getent`, `systemctl`, gestionnaire de paquets `apt`/`dnf`) ; aucune
dépendance tierce ajoutée ; le script orchestre `npm ci` / `npm run build`.

**Storage**: fichiers système uniquement — `/opt/tagmaker` (code+build),
`~/.tagmaker.env` (config, home de l'utilisateur dédié), unité
`/etc/systemd/system/tagmaker.service`, utilisateur `tagmaker`. Aucune donnée
applicative côté serveur.

**Testing**: runner POSIX `scripts/__tests__/run-install-tests.sh` (fonctions
pures + `--dry-run` + stubs via `PATH`), branché sur `npm test` ;
`shellcheck` quand disponible ; suite vitest existante inchangée (vert).

**Target Platform**: serveur Unix/Linux avec systemd — familles apt
(Debian/Ubuntu) et dnf/yum (RHEL/Fedora/Rocky) ; échec explicite ailleurs.

**Project Type**: web-app existante (Next.js à la racine) + script
d'exploitation système (`sh`).

**Performance Goals**: pas de cible de débit — la métrique est opérationnelle :
installation complète < 10 min sur serveur vierge, idempotente (SC-001/003).

**Constraints**: écoute LAN `0.0.0.0` (FR-010, **écart constitutionnel
documenté**) ; aucun contrôle d'accès ajouté (FR-011 — LAN de confiance) ;
utilisateur non privilégié (FR-009) ; build avant activation (FR-003, D7) ;
config jamais écrasée (FR-002/007/008) ; désinstallation par commande
`uninstall` **ou** drapeau `--uninstall`/`-U` (FR-008, D8) ; temps d'alternance
systemd borné (D6).

**Scale/Scope**: monserveur unique ; script ≤ ~300 lignes orienté fonctions ;
documentation specs/011 complète (spec, plan, research, data-model, contracts,
quickstart ; tasks à venir).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Évaluation | Verdict |
|----------|------------|---------|
| I. KISS | script sh simple, fonctions, pas de dépendance tierce, pas de mode JSON superflu | ✔ |
| II. DRY | logique factorisée en fonctions ; réutilisation de `.env.example` (source unique) | ✔ |
| III. YAGNI | pas d'auth, pas de reverse-proxy/TLS, pas de support d'autres familles que apt/dnf | ✔ |
| IV. Code clair | POSIX, conventions documentées, erreurs explicites `ERROR:`/`WARN:` | ✔ |
| V. Tests obligatoires | runner POSIX en CI + `--dry-run` testable ; logic shell couvert | ✔ |
| VI. Évolutivité | config hors code, drop-in systemd préservé, déménagement/upgrade sans réécriture | ✔ |
| **Sécurité (écoute)** | règle « localhost uniquement » **écartée** par décision utilisateur (Q1:B) — documentation + amendement requis (D10) ; l'écoute LAN élargit l'exposition | ⚠️ écart justifié |
| Sécurité (droits) | utilisateur `tagmaker` non privilégié, `0600` sur la config | ✔ |

**Verdict Phase 0** : PASS (un écart connu et documenté : écoute LAN à
traduire en **amendement de la constitution** durant l'implémentation).

**Re-check Phase 1** : toujours PASS — l'écart LAN est assumé, siné dans
research D5/D10 et les contrats ([systemd](contracts/systemd.md),
[config](contracts/config.md)) ; aucun contrôle d'accès ajouté à l'application
elle-même.

## Project Structure

### Documentation (this feature)

```text
specs/011-install-service-systemd/
├── spec.md               # /speckit.specify + clarifications (Q1:B, Q2:A)
├── plan.md               # ce fichier (/speckit.plan)
├── research.md           # Phase 0 — D1..D10 (/speckit.plan)
├── data-model.md         # Phase 1 — entités, états, invariants (/speckit.plan)
├── quickstart.md         # Phase 1 — validation end-to-end (/speckit.plan)
├── contracts/            # Phase 1 — cli.md, systemd.md, config.md
├── checklists/           # requirements.md (qualité de spec)
└── tasks.md              # Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
└── install.sh            # script d'installation POSIX sh (CLI see contracts/cli.md)

scripts/__tests__/
├── run-install-tests.sh  # runner POSIX des tests du script (lancé par npm test)
├── fixtures/
│   ├── env.example       # jeu .env pour tests de création/immutabilité
│   └── bin/              # stubs système (apt-get, systemctl, node, npm …) via PATH
└── install.test.sh       # assertions (sourced, fonctions pures)

package.json              # npm test → "vitest run && sh scripts/__tests__/run-install-tests.sh"
```

**Structure Decision**: code applicatif existant inchangé (Next.js à la
racine ; repo-sans-sous-dossiers) ; la feature ajoute une arborescence de
script autonome sous `scripts/` avec ses tests **au même niveau** (constitution
V). Les docs de feature vivent sous `specs/011-…` conforme aux features 009/010.

## Complexity Tracking

> Rempli uniquement pour les violations de la constitution à justifier.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Écoute réseau sur toutes interfaces (règle « localhost uniquement ») | Volonté utilisateur exprimée (Q1:B) : le service doit être joignable depuis les postes du LAN sur un serveur dédié | Rester en localhost = injoignable depuis le LAN (le besoin contextuel d'origine) ; ajouter une authentification compensatrice = hors périmètre (FR-011, YAGNI) — d'où l'amendement constitutionnel documenté (D10) |