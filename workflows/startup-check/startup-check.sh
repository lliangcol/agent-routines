#!/usr/bin/env bash
set -euo pipefail

workflow="startup-check"
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

json_escape() { local value="$1"; value="${value//\\/\\\\}"; value="${value//\"/\\\"}"; value="${value//$'\n'/\\n}"; value="${value//$'\r'/\\r}"; value="${value//$'\t'/\\t}"; value="${value//$'\b'/\\b}"; value="${value//$'\f'/\\f}"; printf '%s' "$value" | tr -d '\000-\010\013\014\016-\037\177'; }
checks=""
warnings=""
errors=""
append_obj() { local var_name="$1"; local obj="$2"; local current="${!var_name:-}"; if [ -z "$current" ]; then printf -v "$var_name" '%s' "$obj"; else printf -v "$var_name" '%s,%s' "$current" "$obj"; fi; }
add_check() { append_obj checks "{\"name\":\"$(json_escape "$1")\",\"ok\":$2,\"details\":\"$(json_escape "$3")\"}"; }
add_warning() { append_obj warnings "\"$(json_escape "$1")\""; }
add_error() { append_obj errors "\"$(json_escape "$1")\""; }
detect_os() { case "$(uname -s 2>/dev/null || printf unknown)" in MINGW*|MSYS*|CYGWIN*) printf 'windows' ;; Darwin*) printf 'macos' ;; Linux*) printf 'linux' ;; *) printf 'unknown' ;; esac; }

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi
if [ "$(detect_os)" != "windows" ]; then
  add_warning "Windows startup sources are only available on Windows."
else
  if command -v reg.exe >/dev/null 2>&1; then
    for key in \
      'HKCU\Software\Microsoft\Windows\CurrentVersion\Run' \
      'HKLM\Software\Microsoft\Windows\CurrentVersion\Run' \
      'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' \
      'HKLM\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run'; do
      if output="$(reg.exe query "$key" 2>&1)"; then
        count="$(printf '%s\n' "$output" | grep -c 'REG_' || true)"
        add_check "registry:$key" true "$count entries detected."
      else
        add_check "registry:$key" false "$output"
      fi
    done
  else
    add_warning "reg.exe was not found; registry startup probes skipped."
  fi
  if command -v schtasks.exe >/dev/null 2>&1; then
    output="$(schtasks.exe /Query /FO LIST 2>/dev/null | grep -Ei 'TaskName:.*(Startup|Logon|OneDrive|NvNode|NVIDIA)' | head -30 || true)"
    add_check "scheduled-task-probe" true "$output"
  else
    add_warning "schtasks.exe was not found; scheduled task probes skipped."
  fi
  add_warning "This workflow only reads startup sources; it does not remove registry values or disable tasks."
fi

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
