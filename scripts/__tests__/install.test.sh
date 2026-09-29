# Tests POSIX d'install.sh — sourced par run-install-tests.sh.
# Définit run_tests() qui exerce les fonctions pures de scripts/install.sh dans
# des répertoires temporaires, avec stubs via PATH (fixtures/bin-*).
# Contraintes verbatim : contracts/cli.md, contracts/config.md, contracts/systemd.md.

sanitize_path() {
    printf '%s' "$1" | sed 's#/#_#g'
}

new_sandbox() {
    sandbox=$(mktemp -d)
    SANDBOX="$sandbox"
}

tear() {
    [ -n "${SANDBOX:-}" ] && rm -rf "$SANDBOX"
}

# Fabrique un binaire `node` factice qui imprime la version demandée.
make_fake_node() {
    dir="$1"
    ver="$2"
    mkdir -p "$dir"
    cat > "$dir/node" <<EOF
#!/bin/sh
printf 'v$ver\n'
EOF
    chmod +x "$dir/node"
    printf '%s' "$dir/node"
}

run_tests() {
    new_sandbox
    stub_log="$SANDBOX/calls"
    mkdir -p "$stub_log"

    # Environnement de test : stubs + chemins temporaires sur les globals du script
    OLD_PATH="$PATH"
    export PATH="$TEST_BIN_GOOD:$PATH"
    export TAGMAKER_STUB_LOG="$stub_log"
    export TAGMAKER_DIR="$SANDBOX/tagmaker-app"
    export TAGMAKER_ENV="$SANDBOX/etc/tagmaker.env"
    export TAGMAKER_UNIT="$SANDBOX/etc/systemd/tagmaker.service"

    # --- T007 : création + immutabilité de la configuration (config contract) ---
    new_sandbox
    cfg="$SANDBOX/etc/tagmaker.env"
    mkdir -p "$SANDBOX/etc"
    create_env_file "$cfg" "$TEST_ENV_EXAMPLE" >/dev/null
    expect_file "T007: config créée depuis .env.example" "$cfg"
    expect_contains "T007: host injecté à la création" 'TAGMAKER_HOST=' "$(cat "$cfg")"
    expect_contains "T007: port injecté à la création" 'TAGMAKER_PORT=' "$(cat "$cfg")"
    expect_contains "T007: ZPL depuis l'exemple (source de vérité)" 'ZPL_PRINTER_HOST=192.168.1.63' "$(cat "$cfg")"
    mode=$(stat -c '%a' "$cfg")
    expect_eq "T007: droits 0600" "600" "$mode"
    printf '\n# marqueur opérateur' >> "$cfg"
    create_env_file "$cfg" "$TEST_ENV_EXAMPLE" >/dev/null
    expect_contains "T007: jamais écrasé (marqueur préservé)" '# marqueur opérateur' "$(cat "$cfg")"
    tear

    # env_file_path : défaut ~/.tagmaker.env dans le home de l'utilisateur dédié
    saved_env="${TAGMAKER_ENV:-}"
    unset TAGMAKER_ENV
    expect_eq "T007: défaut env_file_path ~/.tagmaker.env" "/home/tagmaker/.tagmaker.env" "$(env_file_path)"
    TAGMAKER_ENV="$saved_env"
    export TAGMAKER_ENV
    expect_eq "T007: override TAGMAKER_ENV" "$saved_env" "$(env_file_path)"

    # --- T008 : champs de l'unité systemd (systemd contract) ---
    unit=$(unit_template '0.0.0.0' '3000' '/opt/tagmaker' '/home/tagmaker/.tagmaker.env' 'tagmaker')
    for needle in \
        '[Unit]' \
        "Description=TagMaker — impression d'étiquettes" \
        'User=tagmaker' \
        'Group=tagmaker' \
        'WorkingDirectory=/opt/tagmaker' \
        'EnvironmentFile=/home/tagmaker/.tagmaker.env' \
        'next start -H 0.0.0.0 -p 3000' \
        'Restart=on-failure' \
        'RestartSec=3' \
        'WantedBy=multi-user.target'; do
        expect_contains "T008: unit contient « ${needle} »" "$needle" "$unit"
    done

    # --- T009 : build-avant-activation + --dry-run sans effet de bord (FR-003) ---
    # npm échouant → _npm_build doit échouer (porte FR-003)
    OLD_PATH2="$PATH"
    export PATH="$TEST_BIN_FAIL:$PATH"
    pseudo_app="$SANDBOX/failing-app"
    mkdir -p "$pseudo_app"
    expect_run "T009: npm en échec → build refuse (FR-003)" "7" _npm_build "$pseudo_app"
    export PATH="$OLD_PATH2"

    # --dry-run install ne crée rien sur le système
    dry_out=$(main --dry-run install 2>&1 || true)
    dry_code=$?
    expect_eq "T009: dry-run quitte 0" "0" "$dry_code"
    expect_no_file "T009: dry-run ne crée pas l'unité" "$TAGMAKER_UNIT"
    expect_no_file "T009: dry-run ne crée pas la config" "$TAGMAKER_ENV"
    expect_contains "T009: dry-run liste les actions" "Prérequis" "$dry_out"

    # --- T016 (US2) : sous-commande status (contrat de sortie cli.md) ---
    export TAGMAKER_STUB_SYSTEMCTL_STATE=active
    export TAGMAKER_STUB_SYSTEMCTL_ENABLED=enabled
    out=$(cmd_status 2>&1 || true)
    expect_contains "T016: status affiche l'état actif" 'active' "$out"
    expect_contains "T016: status affiche la joignabilité" 'http://' "$out"
    expect_contains "T016: status affiche PID/uptime" 'PID' "$out"

    export TAGMAKER_STUB_SYSTEMCTL_STATE=inactive
    export TAGMAKER_STUB_SYSTEMCTL_ENABLED=disabled
    out=$(cmd_status 2>&1 || true)
    expect_contains "T016: status affiche l'état inactif" 'inactive' "$out"

    # --- T018 (US3) : idempotence / config préservée ---
    cfg2="$SANDBOX/etc2/tagmaker.env"
    mkdir -p "$SANDBOX/etc2"
    create_env_file "$cfg2" "$TEST_ENV_EXAMPLE" >/dev/null
    printf 'TAGMAKER_PORT=3100\n' >> "$cfg2"
    create_env_file "$cfg2" "$TEST_ENV_EXAMPLE" >/dev/null
    expect_contains "T018: port personnalisé préservé à la ré-exécution" 'TAGMAKER_PORT=3100' "$(cat "$cfg2")"

    # --- T020 (US4) : parsing des modes de désinstallation (cli.md) ---
    main --help >/dev/null 2>&1
    expect_eq "T020: --help quitte 0" "0" "$?"
    parse_args uninstall
    expect_eq "T020: commande → uninstall" "uninstall" "$command"
    parse_args --uninstall
    expect_eq "T020: drapeau --uninstall → uninstall" "uninstall" "$command"
    parse_args -U
    expect_eq "T020: drapeau -U → uninstall" "uninstall" "$command"
    parse_args uninstall --uninstall
    expect_eq "T020: uninstall + --uninstall : même mode" "uninstall" "$command"
    parse_args --keep-config
    expect_eq "T020: --keep-config posé hors mode" "yes" "$keep_config"
    expect_run "T020: --keep-config hors désinstallation → exit 2" "2" main --dry-run --keep-config

    # --- T021 (US4) : effet de la désinstallation (FR-008/SC-005) ---
    mkdir -p "$TAGMAKER_DIR" "$(dirname "$TAGMAKER_UNIT")" "$(dirname "$TAGMAKER_ENV")"
    printf 'data' > "$TAGMAKER_DIR/README.md"
    : > "$TAGMAKER_UNIT"
    printf 'ZPL_PRINTER_HOST=x\n' > "$TAGMAKER_ENV"
    export TAGMAKER_USER="tagmaker_test_$$"
    uninstall_remove_unit
    expect_no_file "T021: unité supprimée" "$TAGMAKER_UNIT"
    uninstall_remove_user
    expect_contains "T021: userdel invoqué" "userdel $TAGMAKER_USER" "$(cat "$TAGMAKER_STUB_LOG/calls.log")"
    uninstall_remove_data
    expect_no_file "T021: dossier d'app supprimé" "$TAGMAKER_DIR"

    # --keep-config préserve le fichier de configuration du home
    mkdir -p "$(dirname "$TAGMAKER_ENV")"
    printf 'x\n' > "$TAGMAKER_ENV"
    keep_config=yes
    uninstall_remove_config
    expect_file "T021: --keep-config préserve la config" "$TAGMAKER_ENV"
    keep_config=no
    uninstall_remove_config
    expect_no_file "T021: sans --keep-config, config purgée" "$TAGMAKER_ENV"

    # --- T026 : installabilité npm (bug install) ---
    # npm ci from scratch doit résoudre la pile dev sans ERESOLVE (npm 10 stricte
    # les peer optional — conflit @types/node ^20 vs peer vitest ^22||>=24), et la
    # racine doit déclarer un @types/node accepté par le peer de vitest.
    saved_path="$PATH"
    export PATH="$OLD_PATH"
    npm_ci_resolvable="no"
    if command -v npm >/dev/null 2>&1 && [ -f "$ROOT/package-lock.json" ]; then
        scratch="$SANDBOX/npm-ci-resolve"
        mkdir -p "$scratch"
        cp "$ROOT/package.json" "$ROOT/package-lock.json" "$scratch/"
        if npm --prefix "$scratch" ci --dry-run --no-audit --no-fund >/dev/null 2>&1; then
            npm_ci_resolvable="yes"
        fi
    fi
    expect_eq "T026: npm ci from scratch aboutit (manifest+lock cohérents)" "yes" "$npm_ci_resolvable"

    types_node_range=$(node -e "console.log(require('$ROOT/package.json').devDependencies['@types/node']||'')")
    vitest_peer=$(node -e "const l=require('$ROOT/package-lock.json'); const p=l.packages['node_modules/vitest']; process.stdout.write((p&&p.peerDependencies&&p.peerDependencies['@types/node'])||'')")
    root_major=$(printf '%s' "$types_node_range" | sed -E 's/^[^0-9]*//')
    vitest_major_ok="no"
    for m in $(printf '%s' "$vitest_peer" | grep -oE '[0-9]+' | sort -u); do
        if [ "$root_major" = "$m" ]; then vitest_major_ok="yes"; fi
    done
    expect_eq "T026: @types/node ^$root_major ∈ peer vitest ($vitest_peer)" "yes" "$vitest_major_ok"
    export PATH="$saved_path"

    # --- T027 : résolution du binaire Node (bug node-ners) ---
    new_sandbox
    saved_home="${HOME:-}"
    export HOME="$SANDBOX/fakehome"
    fake18=$(make_fake_node "$SANDBOX/node18/bin" "18.19.1")
    fake20=$(make_fake_node "$SANDBOX/node20/bin" "20.19.2")
    fake24=$(make_fake_node "$SANDBOX/node24/bin" "24.13.0")

    if node_candidate_sufficient "$fake18"; then s18="ok"; else s18="no"; fi
    expect_eq "T027: node 18 < plancher → insuffisant" "no" "$s18"
    if node_candidate_sufficient "$fake20"; then s20="ok"; else s20="no"; fi
    expect_eq "T027: node 20.19 ≥ 20.9 → suffisant" "ok" "$s20"
    if node_candidate_sufficient "$fake24"; then s24="ok"; else s24="no"; fi
    expect_eq "T027: node 24 → suffisant" "ok" "$s24"
    if node_candidate_sufficient "$SANDBOX/absent/node"; then sa="ok"; else sa="no"; fi
    expect_eq "T027: binaire absent → refusé" "no" "$sa"

    res=$(PATH="$SANDBOX/node18/bin:$SANDBOX/node24/bin:/usr/bin:/bin" resolve_node_bin)
    expect_eq "T027: PATH — le plus récent suffisant gagne" "$fake24" "$res"

    TAGMAKER_NODE="$fake20"
    res=$(resolve_node_bin)
    expect_eq "T027: TAGMAKER_NODE prioritaire (même si 24 détectable)" "$fake20" "$res"
    unset TAGMAKER_NODE

    TAGMAKER_NODE="$SANDBOX/absent/node"
    if resolve_node_bin >/dev/null 2>&1; then rc_override="ok"; else rc_override="echec"; fi
    expect_eq "T027: TAGMAKER_NODE invalide → échec explicite" "echec" "$rc_override"
    unset TAGMAKER_NODE

    NODE_BIN="$fake24"
    unit=$(unit_template '0.0.0.0' '3000' "$SANDBOX/app" "$SANDBOX/env" "tagmaker")
    expect_contains "T027: ExecStart utilise le binaire résolu" "$fake24" "$unit"
    unset NODE_BIN

    # --- T028 : installs Node en user-space (nvm/volta/fnm) — scénario serveur
    # « sudo + secure_path » : PATH sans nvm, mais nvm du home détecté et prioritaire.
    tools_path="$TEST_BIN_GOOD:/usr/bin:/bin"
    mkdir -p "$SANDBOX/fakehome/.nvm/versions/node"
    nvm_fake=$(make_fake_node "$SANDBOX/fakehome/.nvm/versions/node/v24.13.0/bin" "24.13.0")

    res=$(PATH="$tools_path" resolve_node_bin)
    expect_eq "T028: nvm du home résolu malgré un PATH secure_path" "$nvm_fake" "$res"

    volta_fake=$(make_fake_node "$SANDBOX/fakehome/.volta/bin" "24.0.0")
    fnm_fake=$(make_fake_node "$SANDBOX/fakehome/.local/share/fnm/node-versions/v24.2.0/installation/bin" "24.2.0")
    candidates=$(PATH="$tools_path" node_user_space_candidates)
    expect_contains "T028: volta du home détecté" "$volta_fake" "$candidates"
    expect_contains "T028: fnm du home détecté" "$fnm_fake" "$candidates"
    expect_contains "T028: nvm du home détecté" "$nvm_fake" "$candidates"

    empty_home="$SANDBOX/emptyhome"
    empty_scan=$(HOME="$empty_home" node_user_space_candidates)
    expect_eq "T028: home vide → aucune install user-space (repli apt)" "" "$empty_scan"

    export HOME="$saved_home"

    # --- T029 : ouverture ciblée o+x vers un Node user-space (bug node-nvm-access) ---
    new_sandbox
    fake_home="$SANDBOX/home/admin"
    fake_node=$(make_fake_node "$fake_home/.nvm/versions/node/v24.18.0/bin" "24.18.0")
    chmod 700 "$fake_home"
    chmod 751 "$fake_home/.nvm"
    nvm_before="$(stat -c '%a' "$fake_home/.nvm")"
    bin_before="$(stat -c '%a' "$(dirname "$fake_node")")"

    node_open_service_access "$fake_node" "$fake_home"

    expect_eq "T029: home fermé → ouvert en 701" "701" "$(stat -c '%a' "$fake_home")"
    expect_eq "T029: .nvm déjà o+x → inchangé" "$nvm_before" "$(stat -c '%a' "$fake_home/.nvm")"
    expect_eq "T029: bin déjà o+x → inchangé" "$bin_before" "$(stat -c '%a' "$(dirname "$fake_node")")"

    mid_dir="$fake_home/.nvm/versions/node"
    chmod 711 "$mid_dir"
    node_open_service_access "$fake_node" "$fake_home"
    expect_eq "T029: dossier 711 préservé (on n'ajoute que x)" "711" "$(stat -c '%a' "$mid_dir")"

    expect_eq "T029: ancre home d'un chemin /home réel" "/home/ipln" "$(node_home_anchor '/home/ipln/.nvm/versions/node/v24.18.0/bin/node')"

    local_bin=$(make_fake_node "$SANDBOX/usr/local/bin" "24.0.0")
    expect_eq "T029: hors /home → aucune ancre (gate build_app)" "" "$(node_home_anchor "$local_bin")"

    tear

    # --- T030 : PATH autonome du build (bug build-error) ---
    # ENOENT `spawn sh` : npm ne trouve `sh` que si le PATH du `su` contient les
    # répertoires système ; npm_build_command doit donc embarquer un PATH complet.
    cmd=$(npm_build_command "/opt/tagmaker" "$(dirname "$fake_node")")
    expect_contains "T030: PATH du build embarque node_dir" "$(dirname "$fake_node")" "$cmd"
    for sdir in /usr/local/sbin /usr/local/bin /usr/sbin /usr/bin /sbin /bin; do
        expect_contains "T030: PATH du build contient $sdir" "$sdir" "$cmd"
    done
    expect_contains "T030: appdir ciblé" "/opt/tagmaker" "$cmd"

    case "$cmd" in *"export PATH SHELL=/bin/sh; npm"*) sh_ok="yes" ;; *) sh_ok="no" ;; esac
    expect_eq "T030: SHELL=/bin/sh exportée pour le lifecycle npm" "yes" "$sh_ok"

    # Contrôle négatif/positif du mécanisme, avec le vrai npm (hermétique) :
    saved_path3="$PATH"
    export PATH="$OLD_PATH"
    mech="$SANDBOX/buildmech"
    mkdir -p "$mech"
    cat > "$mech/package.json" <<'EOF'
{"name":"t","version":"0.0.1","scripts":{"x":"sh -c 'echo ok'"}}
EOF
    node_dir_real=$(dirname "$(command -v node)")

    if env -i PATH="$node_dir_real" HOME="$mech" npm --prefix "$mech" run x >/dev/null 2>&1; then
        neg="ok"
    else
        neg="ko"
    fi
    expect_eq "T030: PATH seul node → ENOENT spawn sh (contrôle négatif)" "ko" "$neg"

    if env -i PATH="$node_dir_real:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" HOME="$mech" npm --prefix "$mech" run x >/dev/null 2>&1; then
        pos="ok"
    else
        pos="ko"
    fi
    expect_eq "T030: PATH complet → lifecycle npm OK (contrôle positif)" "ok" "$pos"
    export PATH="$saved_path3"

    export PATH="$OLD_PATH"
    tear

    rm -rf "$stub_log"
    rm -rf "$sandbox" 2>/dev/null || true
}