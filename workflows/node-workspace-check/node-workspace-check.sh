#!/usr/bin/env bash
set -euo pipefail

workflow="node-workspace-check"
path="."

usage() {
  printf 'Usage: %s [--path PATH]\n' "$0"
  printf 'Produces stable JSON and performs only readonly checks.\n'
}

require_value() {
  if [ "$#" -lt 2 ] || [ -z "${2:-}" ]; then
    printf 'Missing value for %s\n' "$1" >&2
    exit 2
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --path) require_value "$@"; path="$2"; shift 2 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

json_escape() { local value="$1"; value="${value//\\/\\\\}"; value="${value//\"/\\\"}"; value="${value//$'\n'/\\n}"; value="${value//$'\r'/\\r}"; value="${value//$'\t'/\\t}"; printf '%s' "$value"; }
checks=""
warnings=""
errors=""
append_obj() { local var_name="$1"; local obj="$2"; local current="${!var_name:-}"; if [ -z "$current" ]; then printf -v "$var_name" '%s' "$obj"; else printf -v "$var_name" '%s,%s' "$current" "$obj"; fi; }
add_check() { append_obj checks "{\"name\":\"$(json_escape "$1")\",\"ok\":$2,\"details\":\"$(json_escape "$3")\"}"; }
add_warning() { append_obj warnings "\"$(json_escape "$1")\""; }
add_error() { append_obj errors "\"$(json_escape "$1")\""; }
detect_os() { case "$(uname -s 2>/dev/null || printf unknown)" in MINGW*|MSYS*|CYGWIN*) printf 'windows' ;; Darwin*) printf 'macos' ;; Linux*) printf 'linux' ;; *) printf 'unknown' ;; esac; }
probe_command() { if command -v "$1" >/dev/null 2>&1; then add_check "command:$1" true "$(command -v "$1")"; else add_check "command:$1" false "Command not found."; fi; }

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi
for name in node npm pnpm yarn; do probe_command "$name"; done
[ -f package.json ] && add_check "package-json" true "Root package.json probe." || add_check "package-json" false "Root package.json not found."
for item in pnpm-workspace.yaml package-lock.json pnpm-lock.yaml yarn.lock turbo.json nx.json; do
  [ -e "$item" ] && add_check "workspace-file:$item" true "Workspace metadata probe." || add_check "workspace-file:$item" false "Workspace metadata probe."
done
if [ -f package.json ]; then
  if command -v node >/dev/null 2>&1; then
    manager="$(node -e "const p=require('./package.json'); console.log(p.packageManager || '')" 2>/dev/null || true)"
    [ -n "$manager" ] && add_check "package-manager-field" true "$manager" || add_check "package-manager-field" false "packageManager not declared."
    for script in doctor validate test lint build pack release publish; do
      if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$script'] ? 0 : 1)" >/dev/null 2>&1; then
        add_check "script:$script" true "package.json script probe."
      else
        add_check "script:$script" false "package.json script probe."
      fi
    done
  else
    add_warning "node was not found; package.json script parsing skipped."
  fi
fi
add_warning "This workflow does not install dependencies, mutate versions, or publish packages."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
