#!/usr/bin/env bash
set -euo pipefail

workflow="gate-check"
path="."
custom_commands=()

usage() {
  printf 'Usage: %s [--path PATH] [--custom-command CMD]\n' "$0"
  printf 'Produces stable JSON. Built-in checks are readonly. Custom commands run as given\n'
  printf 'after a best-effort destructive-keyword filter; pass readonly commands only.\n'
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
    --custom-command) require_value "$@"; custom_commands+=("$2"); shift 2 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  value="${value//$'\b'/\\b}"
  value="${value//$'\f'/\\f}"
  printf '%s' "$value" | tr -d '\000-\010\013\014\016-\037\177'
}

checks=""
warnings=""
errors=""

append_obj() {
  local var_name="$1"
  local obj="$2"
  local current
  current="${!var_name:-}"
  if [ -z "$current" ]; then
    printf -v "$var_name" '%s' "$obj"
  else
    printf -v "$var_name" '%s,%s' "$current" "$obj"
  fi
}

add_check() {
  local name="$(json_escape "$1")"
  local ok="$2"
  local details="$(json_escape "$3")"
  local required="${4:-false}"
  append_obj checks "{\"name\":\"$name\",\"ok\":$ok,\"details\":\"$details\"}"
  if [ "$required" = true ] && [ "$ok" != true ]; then
    add_error "Required check failed: $1"
  fi
}

add_warning() {
  local message="$(json_escape "$1")"
  append_obj warnings "\"$message\""
}

add_error() {
  local message="$(json_escape "$1")"
  append_obj errors "\"$message\""
}

run_git() {
  if ! command -v git >/dev/null 2>&1; then
    return 127
  fi
  git "$@" 2>&1
}

safe_custom_command() {
  local command="$1"
  if printf '%s' "$command" | grep -Eiq '\b(rm|del|erase|remove-item|rmdir|rd|format|shutdown|reboot|drop|delete|truncate|alter|insert|update|merge|grant|revoke|call|execute)\b'; then
    add_error "Rejected potentially destructive custom command: $command"
    return
  fi
  local output
  if output="$(sh -c "$command" 2>&1)"; then
    add_check "custom-command" true "$output"
  else
    add_check "custom-command" false "$output" true
  fi
}

detect_os() {
  case "$(uname -s 2>/dev/null || printf unknown)" in
    MINGW*|MSYS*|CYGWIN*) printf 'windows' ;;
    Darwin*) printf 'macos' ;;
    Linux*) printf 'linux' ;;
    *) printf 'unknown' ;;
  esac
}

if [ -d "$path" ]; then
  cwd="$(cd "$path" && pwd -P)"
else
  cwd="$path"
  add_error "Path does not exist: $path"
fi

if [ -d "$path" ]; then
  cd "$path"
fi

if run_git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if output="$(run_git diff --check)"; then add_check "git-diff-check" true "$output" true; else add_check "git-diff-check" false "$output" true; fi
  if output="$(run_git diff --cached --check)"; then add_check "git-diff-cached-check" true "$output" true; else add_check "git-diff-cached-check" false "$output" true; fi
else
  add_warning "Skipping git gates because this is not a git repository or git is unavailable."
fi
if [ "${#custom_commands[@]}" -gt 0 ]; then
  add_warning "Custom commands are screened by a best-effort keyword denylist only; the caller is responsible for passing readonly commands."
  for command in "${custom_commands[@]}"; do safe_custom_command "$command"; done
fi

ok=true
if [ -n "$errors" ]; then ok=false; fi
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
