#!/bin/sh
# Harness de tests POSIX du script d'installation (feature 011).
# Sourcer scripts/install.sh puis scripts/__tests__/install.test.sh, exécuter
# run_tests() et rendre un code de sortie exploitable en CI (npm test).
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)
SCRIPT="$ROOT/scripts/install.sh"

[ -f "$SCRIPT" ] || {
    printf 'ERROR: %s introuvable — implémenter install.sh d'\''abord\n' "$SCRIPT" >&2
    exit 1
}

# Données de test partagées (poluées par les tests uniquement sous daggers)
TEST_BIN_GOOD="$ROOT/scripts/__tests__/fixtures/bin-good"
TEST_BIN_FAIL="$ROOT/scripts/__tests__/fixtures/bin-fail"
TEST_ENV_EXAMPLE="$ROOT/scripts/__tests__/fixtures/env.example"

# --- mini-framework d'assertions (global) ---
t_pass=0
t_fail=0
t_errors=""

expect_eq() {
    label="$1"
    want="$2"
    got="$3"
    if [ "$want" = "$got" ]; then
        t_pass=$((t_pass + 1))
    else
        t_fail=$((t_fail + 1))
        t_errors="${t_errors}  ✗ ${label} (attendu: « ${want} », obtenu: « ${got} »)\n"
    fi
}

expect_contains() {
    label="$1"
    needle="$2"
    haystack="$3"
    case "$haystack" in
        *"$needle"*)
            t_pass=$((t_pass + 1))
            ;;
        *)
            t_fail=$((t_fail + 1))
            t_errors="${t_errors}  ✗ ${label} (contenu « ${needle} » absent)\n"
            ;;
    esac
}

expect_file() {
    label="$1"
    file="$2"
    if [ -f "$file" ]; then
        t_pass=$((t_pass + 1))
    else
        t_fail=$((t_fail + 1))
        t_errors="${t_errors}  ✗ ${label} (fichier absent: ${file})\n"
    fi
}

expect_no_file() {
    label="$1"
    file="$2"
    if [ -e "$file" ]; then
        t_fail=$((t_fail + 1))
        t_errors="${t_errors}  ✗ ${label} (fichier inattendu présent: ${file})\n"
    else
        t_pass=$((t_pass + 1))
    fi
}

# exécute la commande, attend `want` (code de sortie non nul échoué en CI)
expect_run() {
    label="$1"
    want="$2"
    shift 2
    set +e
    "$@" >/dev/null 2>&1
    code=$?
    set -e
    if [ "$code" -eq "$want" ]; then
        t_pass=$((t_pass + 1))
    else
        t_fail=$((t_fail + 1))
        t_errors="${t_errors}  ✗ ${label} (code attendu ${want}, obtenu ${code})\n"
    fi
}

. "$SCRIPT"
. "$ROOT/scripts/__tests__/install.test.sh"

run_tests

printf '\n--- Résumé tests shell ---\n'
printf 'PASS: %d — FAIL: %d\n' "$t_pass" "$t_fail"
if [ "$t_fail" -ne 0 ]; then
    printf '%b\n' "$t_errors" >&2
    exit 1
fi
printf 'Suite POSIX verte.\n'