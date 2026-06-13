#!/usr/bin/env bash
set -euo pipefail

workflow="runtime-check"
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
  local current="${!var_name:-}"
  if [ -z "$current" ]; then printf -v "$var_name" '%s' "$obj"; else printf -v "$var_name" '%s,%s' "$current" "$obj"; fi
}

add_check() {
  append_obj checks "{\"name\":\"$(json_escape "$1")\",\"ok\":$2,\"details\":\"$(json_escape "$3")\"}"
}

add_warning() { append_obj warnings "\"$(json_escape "$1")\""; }
add_error() { append_obj errors "\"$(json_escape "$1")\""; }

detect_os() {
  case "$(uname -s 2>/dev/null || printf unknown)" in
    MINGW*|MSYS*|CYGWIN*) printf 'windows' ;;
    Darwin*) printf 'macos' ;;
    Linux*) printf 'linux' ;;
    *) printf 'unknown' ;;
  esac
}

probe_command() {
  if command -v "$1" >/dev/null 2>&1; then add_check "command:$1" true "$(command -v "$1")"; else add_check "command:$1" false "Command not found."; fi
}

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi

if command -v pwsh >/dev/null 2>&1; then
  ps_version="$(pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>/dev/null || printf 'unknown')"
  add_check "powershell-version" true "$ps_version"
elif command -v powershell >/dev/null 2>&1; then
  ps_version="$(powershell -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>/dev/null | tr -d '\r' || printf 'unknown')"
  add_check "powershell-version" true "$ps_version"
else
  add_check "powershell-version" false "PowerShell not found."
fi
for name in node npm volta git bash python python3; do probe_command "$name"; done
git_bash_path="C:/Program Files/Git/bin/bash.exe"
[ -f "$git_bash_path" ] && add_check "git-bash-common-path" true "$git_bash_path" || add_check "git-bash-common-path" false "$git_bash_path"
[ -n "${PATH:-}" ] && add_check "path-env-present" true "PATH environment variable probe." || add_check "path-env-present" false "PATH is empty."
[ -f "$HOME/.claude/settings.json" ] && add_check "user-claude-settings" true "$HOME/.claude/settings.json" || add_check "user-claude-settings" false "User-level runtime settings not found."
[ -d "$HOME/.codex/skills" ] && add_check "user-codex-skills" true "$HOME/.codex/skills" || add_check "user-codex-skills" false "User-level Codex skills not found."
[ -f ".claude/settings.json" ] && add_check "project-claude-settings" true ".claude/settings.json" || add_check "project-claude-settings" false "Project runtime settings not found."
[ -f ".claude/hooks/run-python-hook.js" ] && add_check "project-hook-wrapper" true ".claude/hooks/run-python-hook.js" || add_check "project-hook-wrapper" false "Project hook wrapper not found."
[ -n "${PYTHONIOENCODING:-}" ] && add_check "pythonioencoding" true "$PYTHONIOENCODING" || add_check "pythonioencoding" false "PYTHONIOENCODING not set."
[ -n "${PYTHONUTF8:-}" ] && add_check "pythonutf8" true "$PYTHONUTF8" || add_check "pythonutf8" false "PYTHONUTF8 not set."
add_warning "This workflow does not reinstall packages, edit settings, or mutate PATH."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
