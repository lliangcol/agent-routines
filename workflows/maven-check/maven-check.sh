#!/usr/bin/env bash
set -euo pipefail

workflow="maven-check"
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
  printf '%s' "$value"
}

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
for name in mvn java git; do probe_command "$name"; done
[ -f pom.xml ] && add_check "root-pom" true "Root pom.xml probe." || add_check "root-pom" false "Root pom.xml not found."
[ -f mvnw ] && add_check "maven-wrapper" true "Maven wrapper probe." || add_check "maven-wrapper" false "Maven wrapper not found."
settings="$HOME/.m2/settings.xml"
if [ -f "$settings" ]; then
  add_check "user-settings" true "$settings"
  if grep -Eiq '<mirrorOf>[[:space:]]*\*[[:space:]]*</mirrorOf>' "$settings"; then
    add_check "mirrorof-wildcard" false "User Maven settings contain mirrorOf=*."
    add_warning "User Maven settings contain mirrorOf=*; dependency failures may be mirror-related."
  else
    add_check "mirrorof-wildcard" true "No mirrorOf=* entry detected."
  fi
else
  add_check "user-settings" false "No user Maven settings.xml found."
fi
case "$(detect_os)" in windows) add_warning 'When running Maven from PowerShell, quote -D properties such as "-Dtest=SomeTest".' ;; esac
add_warning "This workflow does not edit Maven settings, delete caches, or run builds."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
