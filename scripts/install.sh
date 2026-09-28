#!/bin/sh
# TagMaker — installation / mise à jour / désinstallation du service systemd.
# Script POSIX sh. Contrat : specs/011-install-service-systemd/contracts/cli.md.
set -eu

# ---------------------------------------------------------------------------
# Défauts (respect de la précédence flag > variable d'environnement > défaut)
# ---------------------------------------------------------------------------
: "${TAGMAKER_DIR:=/opt/tagmaker}"
: "${TAGMAKER_ENV:=/etc/tagmaker/tagmaker.env}"
: "${TAGMAKER_UNIT:=/etc/systemd/system/tagmaker.service}"
: "${TAGMAKER_USER:=tagmaker}"
: "${TAGMAKER_PORT:=3000}"
: "${TAGMAKER_HOST:=0.0.0.0}"

SERVICE_NAME="tagmaker"
REQUIRED_NODE_MAJOR="20"
REQUIRED_NODE_MINOR="9"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log()  { printf '%s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }

usage() {
    cat <<'EOF'
Usage: install.sh [COMMANDE] [OPTIONS]

COMMANDE (défaut : install)
  install     Installe ou met à jour le service (construction puis activation).
  uninstall   Désinstalle le service (équivalent du drapeau --uninstall).
  status      Imprime l'état du service (systemd) et du point d'accès.

OPTIONS
  -d, --dir <CHEMIN>       dossier de l'application (défaut: /opt/tagmaker)
  -e, --env <CHEMIN>       fichier de configuration (défaut: /etc/tagmaker/tagmaker.env)
  -u, --user <NOM>         utilisateur système dédié (défaut: tagmaker)
  -p, --port <PORT>        port d'écoute (défaut: 3000)
  -h, --host <ADRESSE>     adresse d'écoute (défaut: 0.0.0.0)
  -U, --uninstall          désinstalle le service (drapeau équivalent à la
                           commande `uninstall` ; désactive `install`)
      --keep-config        (désinstallation) conserve /etc/tagmaker
      --dry-run            valide et affiche les actions prévues, ne modifie rien
  -q, --quiet              réduit la sortie
      --help               affiche cet usage et quitte (code 0)

Variables d'environnement (même priorité que les flags) : TAGMAKER_DIR,
TAGMAKER_ENV, TAGMAKER_USER, TAGMAKER_PORT, TAGMAKER_HOST.
Codes de sortie : 0 succès, 1 échec, 2 mauvaise utilisation.
EOF
}

# ---------------------------------------------------------------------------
# Analyse des arguments (contrat cli.md — modes & priorité désinstallation)
# ---------------------------------------------------------------------------
parse_args() {
    command="install"
    keep_config="no"
    dry_run="no"
    quiet="no"
    show_help="no"

    while [ "$#" -gt 0 ]; do
        case "$1" in
            install|uninstall|status)
                command="$1"
                ;;
            -d|--dir) shift; TAGMAKER_DIR="$1" ;;
            -e|--env) shift; TAGMAKER_ENV="$1" ;;
            -u|--user) shift; TAGMAKER_USER="$1" ;;
            -p|--port) shift; TAGMAKER_PORT="$1" ;;
            -h|--host) shift; TAGMAKER_HOST="$1" ;;
            -U|--uninstall)
                command="uninstall"
                ;;
            --keep-config)
                keep_config="yes"
                ;;
            --dry-run)
                dry_run="yes"
                ;;
            -q|--quiet)
                quiet="yes"
                ;;
            --help)
                show_help="yes"
                ;;
            *)
                printf 'ERROR: option ou commande inconnue : %s\n' "$1" >&2
                usage >&2
                return 2
                ;;
        esac
        shift
    done
}

# ---------------------------------------------------------------------------
# Prérequis : distribution + Node.js ≥ 20.9 (research D2/D3, FR-001)
# ---------------------------------------------------------------------------
detect_pkg_manager() {
    if command -v apt-get >/dev/null 2>&1; then printf '%s' "apt"; return; fi
    if command -v dnf >/dev/null 2>&1; then printf '%s' "dnf"; return; fi
    if command -v yum >/dev/null 2>&1; then printf '%s' "yum"; return; fi
    printf '%s' "none"
}

node_major() { node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1; }
node_minor() { node -v 2>/dev/null | sed 's/^v//' | cut -d. -f2; }

node_sufficient() {
    maj=$(node_major)
    [ -z "$maj" ] && return 1
    [ "$maj" -lt "$REQUIRED_NODE_MAJOR" ] && return 1
    [ "$maj" -gt "$REQUIRED_NODE_MAJOR" ] && return 0
    min=$(node_minor)
    [ -n "$min" ] && [ "$min" -ge "$REQUIRED_NODE_MINOR" ]
}

ensure_prereqs() {
    pkg=$(detect_pkg_manager)
    [ "$pkg" = "none" ] && {
        printf 'ERROR: distribution non reconnue (apt/dnf/yum absents). Installez Node.js ≥ %s.%s et npm manuellement, puis relancez.\n' \
            "$REQUIRED_NODE_MAJOR" "$REQUIRED_NODE_MINOR" >&2
        return 1
    }

    if command -v node >/dev/null 2>&1 && node_sufficient; then
        log "Node.js $(node -v) présent et suffisant."
        return 0
    fi

    log "Installation des prérequis nodejs/npm via $pkg..."
    if [ "$pkg" = "apt" ]; then
        apt-get update >/dev/null 2>&1
        apt-get install -y nodejs npm >/dev/null 2>&1
    elif [ "$pkg" = "dnf" ]; then
        dnf install -y nodejs npm >/dev/null 2>&1
    else
        yum install -y nodejs npm >/dev/null 2>&1
    fi

    command -v node >/dev/null 2>&1 || {
        printf 'ERROR: Node.js introuvable après installation.\n' >&2
        return 1
    }
    node_sufficient || {
        printf 'ERROR: Node.js (%s) trop ancien. Exigez Node.js ≥ %s.%s puis relancez.\n' \
            "$(node -v)" "$REQUIRED_NODE_MAJOR" "$REQUIRED_NODE_MINOR" >&2
        return 1
    }
    log "Node.js $(node -v) installé."
}

# ---------------------------------------------------------------------------
# Configuration — /etc/tagmaker/tagmaker.env (contrat config.md, FR-002)
# ---------------------------------------------------------------------------
env_value() {
    file="$1"
    key="$2"
    sed -n "s/^$key=//p" "$file" 2>/dev/null | tail -n 1
}

create_env_file() {
    file="$1"
    example="$2"

    if [ -f "$file" ]; then
        log "Config existante conservée : $file"
        return 0
    fi

    mkdir -p "$(dirname "$file")"
    if [ -f "$example" ]; then
        cp "$example" "$file"
        log "Config créée à partir de $example"
    else
        cat > "$file" <<'EOF'
# Config générée par install.sh (feature 011). Complétez les valeurs ZPL_*.
ZPL_PRINTER_HOST=
ZPL_PRINTER_PORT=9100
ZPL_RESOLUTION_DPI=203
ZPL_PAPER_SIZES=40x25, 75x25, 100x50, 100x150
EOF
        log "Config créée avec les valeurs par défaut."
    fi

    if ! grep -q '^TAGMAKER_HOST=' "$file"; then
        printf 'TAGMAKER_HOST=%s\n' "$TAGMAKER_HOST" >> "$file"
    fi
    if ! grep -q '^TAGMAKER_PORT=' "$file"; then
        printf 'TAGMAKER_PORT=%s\n' "$TAGMAKER_PORT" >> "$file"
    fi

    chown "$TAGMAKER_USER:$TAGMAKER_USER" "$file" 2>/dev/null || true
    chmod 600 "$file"
}

effective_host() {
    h=""
    [ -f "$TAGMAKER_ENV" ] && h=$(env_value "$TAGMAKER_ENV" "TAGMAKER_HOST")
    [ -n "$h" ] || h="$TAGMAKER_HOST"
    printf '%s' "$h"
}

effective_port() {
    p=""
    [ -f "$TAGMAKER_ENV" ] && p=$(env_value "$TAGMAKER_ENV" "TAGMAKER_PORT")
    [ -n "$p" ] || p="$TAGMAKER_PORT"
    printf '%s' "$p"
}

# ---------------------------------------------------------------------------
# Unité systemd — tagmaker.service (contrat systemd.md, FR-004/FR-005)
# ---------------------------------------------------------------------------
unit_template() {
    host="$1"
    port="$2"
    appdir="$3"
    envfile="$4"
    user="$5"
    node_bin=$(command -v node 2>/dev/null || printf '%s' "node")

    cat <<EOF
[Unit]
Description=TagMaker — impression d'étiquettes
After=network.target

[Service]
Type=simple
User=${user}
Group=${user}
WorkingDirectory=${appdir}
EnvironmentFile=${envfile}
ExecStart=${node_bin} ${appdir}/node_modules/next/dist/bin/next start -H ${host} -p ${port}
Restart=on-failure
RestartSec=3
StartLimitIntervalSec=10
StartLimitBurst=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
}

write_unit() {
    host="$1"
    port="$2"
    mkdir -p "$(dirname "$TAGMAKER_UNIT")"
    unit_template "$host" "$port" "$TAGMAKER_DIR" "$TAGMAKER_ENV" "$TAGMAKER_USER" > "$TAGMAKER_UNIT"
    log "Unité écrite : $TAGMAKER_UNIT"
}

# ---------------------------------------------------------------------------
# Build production — avant activation (FR-003, research D7)
# ---------------------------------------------------------------------------
_npm_build() {
    appdir="$1"
    npm --prefix "$appdir" ci --no-audit --no-fund
    npm --prefix "$appdir" run build
}

build_app() {
    appdir="$1"
    user="$2"
    log "Build production (npm ci && npm run build, en tant que ${user})..."
    chown -R "$user:$user" "$appdir"
    su -s /bin/sh "$user" -c "npm --prefix '$appdir' ci --no-audit --no-fund && npm --prefix '$appdir' run build"
}

# ---------------------------------------------------------------------------
# Utilisateur dédié + placement de l'application (FR-009, data-model)
# ---------------------------------------------------------------------------
create_service_user() {
    user="$1"
    if id "$user" >/dev/null 2>&1; then
        log "Utilisateur système $user déjà présent."
    else
        useradd --system --no-create-home --shell /usr/sbin/nologin "$user"
        log "Utilisateur système non privilégié $user créé."
    fi
}

deploy_appcode() {
    appdir="$1"
    user="$2"
    source_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)

    if [ -f "$appdir/package.json" ]; then
        log "Application déjà présente dans $appdir (utilisée en place)."
    else
        mkdir -p "$(dirname "$appdir")"
        cp -a "$source_dir/." "$appdir"
        log "Application copiée de $source_dir vers $appdir."
    fi
    chown -R "$user:$user" "$appdir"
}

# ---------------------------------------------------------------------------
# Activation systemd (enable --now → démarrage au boot) puis récapitulatif
# ---------------------------------------------------------------------------
enable_service() {
    systemctl daemon-reload
    systemctl enable --now "$SERVICE_NAME" >/dev/null 2>&1
    systemctl start "$SERVICE_NAME" || systemctl restart "$SERVICE_NAME"
    log "Service « $SERVICE_NAME » activé au boot et démarré."
}

print_report() {
    host=$(effective_host)
    port=$(effective_port)
    cat <<EOF

--- TagMaker installé ---
État du service :  systemctl status $SERVICE_NAME
Point d'accès :    http://${host}:${port}
Dossier :          $TAGMAKER_DIR
Config :           $TAGMAKER_ENV

Commandes de contrôle :
  sudo systemctl start|stop|restart $SERVICE_NAME
  systemctl status $SERVICE_NAME
  journalctl -u $SERVICE_NAME
EOF
}

# ---------------------------------------------------------------------------
# Commandes
# ---------------------------------------------------------------------------
require_root() {
    [ "$(id -u)" -eq 0 ] && return 0
    printf 'ERROR: ce script doit être exécuté en tant que root (sudo).\n' >&2
    return 1
}

cmd_install() {
    [ "$dry_run" = "yes" ] && { dry_run_install; return 0; }

    require_root || return 1
    ensure_prereqs || return 1
    create_service_user "$TAGMAKER_USER" || return 1

    example="$REPO_ROOT/.env.example"
    create_env_file "$TAGMAKER_ENV" "$example" || return 1
    [ -f "$TAGMAKER_ENV" ] || return 1

    deploy_appcode "$TAGMAKER_DIR" "$TAGMAKER_USER" || return 1
    build_app "$TAGMAKER_DIR" "$TAGMAKER_USER" || {
        printf 'ERROR: build échoué — aucune unité enregistrée, installation existante intacte (FR-003).\n' >&2
        return 1
    }

    host=$(effective_host)
    port=$(effective_port)
    write_unit "$host" "$port" || return 1
    enable_service || return 1
    print_report
}

cmd_status() {
    state=$(systemctl is-active "$SERVICE_NAME" 2>/dev/null) || state="inactive"
    enabled=$(systemctl is-enabled "$SERVICE_NAME" 2>/dev/null) || enabled="disabled"
    pid=$(systemctl show -p MainPID --value "$SERVICE_NAME" 2>/dev/null)
    [ -n "$pid" ] && [ "$pid" != "0" ] || pid=""
    if [ -n "$pid" ]; then
        uptime=$(ps -o etime= -p "$pid" 2>/dev/null)
        [ -n "$uptime" ] || uptime="?"
        pid_line="${pid} — (uptime ${uptime})"
    else
        pid_line="(aucun processus)"
    fi
    host=$(effective_host)
    port=$(effective_port)
    cat <<EOF
Service :   $SERVICE_NAME
État :      $state
Boot :      $enabled
PID/uptime: $pid_line
Point d'accès : http://${host}:${port}
Dossier :   $TAGMAKER_DIR
Config :    $TAGMAKER_ENV
EOF
}

cmd_uninstall() {
    [ "$dry_run" = "yes" ] && { dry_run_uninstall; return 0; }

    require_root || return 1
    uninstall_remove_unit || return 1
    uninstall_remove_user
    uninstall_remove_data
    uninstall_remove_config
    log "Désinstallation terminée."
}

uninstall_remove_unit() {
    systemctl disable --now "$SERVICE_NAME" >/dev/null 2>&1 || true
    if [ -f "$TAGMAKER_UNIT" ]; then
        rm -f "$TAGMAKER_UNIT"
        systemctl daemon-reload
        log "Unité $TAGMAKER_UNIT supprimée."
    else
        log "Aucune unité à retirer (installation absente)."
    fi
}

uninstall_remove_user() {
    if id "$TAGMAKER_USER" >/dev/null 2>&1; then
        userdel "$TAGMAKER_USER" 2>/dev/null || true
        log "Utilisateur $TAGMAKER_USER supprimé."
    fi
}

uninstall_remove_data() {
    if [ -d "$TAGMAKER_DIR" ]; then
        rm -rf "$TAGMAKER_DIR"
        log "Dossier $TAGMAKER_DIR supprimé."
    fi
}

uninstall_remove_config() {
    cfgdir=$(dirname "$TAGMAKER_ENV")
    if [ "$keep_config" = "yes" ]; then
        log "Configuration conservée : $cfgdir"
    elif [ -d "$cfgdir" ]; then
        rm -rf "$cfgdir"
        log "Configuration $cfgdir purgée."
    fi
}

# ---------------------------------------------------------------------------
# Mode sec, sans effet de bord (--dry-run)
# ---------------------------------------------------------------------------
dry_run_install() {
    cat <<EOF
[DRY-RUN] install de TagMaker — aucune modification effectuée.
  Prérequis : distro + Node.js ≥ ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR} (apt/dnf/yum)
  Utilisateur : $TAGMAKER_USER (dédié, non privilégié)
  Config : $TAGMAKER_ENV (créée depuis .env.example si absent, jamais écrasée)
  Dossier : $TAGMAKER_DIR + build production (npm ci && npm run build, FR-003)
  Unité : $TAGMAKER_UNIT puis systemctl enable --now $SERVICE_NAME
  Écoute : http://${TAGMAKER_HOST}:${TAGMAKER_PORT} (LAN de confiance, FR-010/FR-011)
EOF
}

dry_run_uninstall() {
    keep="$TAGMAKER_ENV"
    [ "$keep_config" = "yes" ] && keep="$keep (conservée par --keep-config)"
    cat <<EOF
[DRY-RUN] uninstall de TagMaker — aucune modification effectuée.
  Désactive $SERVICE_NAME (systemctl disable --now)
  Supprime $TAGMAKER_UNIT + daemon-reload
  Supprime utilisateur $TAGMAKER_USER et dossier $TAGMAKER_DIR
  Purge de la configuration : $keep
EOF
}

# ---------------------------------------------------------------------------
# Point d'entrée (ne s'exécute qu'en tant que script, pas lorsqu'il est sourcé)
# ---------------------------------------------------------------------------
main() {
    parse_args "$@" || return "$?"
    [ "$show_help" = "yes" ] && { usage; return 0; }

    if [ "$keep_config" = "yes" ] && [ "$command" != "uninstall" ]; then
        printf 'ERROR: --keep-config n'\''est valable qu'\''en mode désinstallation.\n' >&2
        return 2
    fi

    case "$command" in
        install)   cmd_install ;;
        uninstall) cmd_uninstall ;;
        status)    cmd_status ;;
    esac
}

if [ "$(basename "$0")" = "install.sh" ]; then
    REPO_ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
    main "$@"
    exit "$?"
fi