#!/usr/bin/env bash
set -euo pipefail

workflow="archive-check"
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

if [ ! -d executions ]; then
  add_warning "No executions directory found."
else
  found=false
  while IFS= read -r dir; do
    found=true
    [ -f "$dir/README.md" ] && add_check "archive:$(basename "$dir"):README" true "README.md required." true || add_check "archive:$(basename "$dir"):README" false "README.md required." true
    [ -f "$dir/result.md" ] && add_check "archive:$(basename "$dir"):result" true "result.md required." true || add_check "archive:$(basename "$dir"):result" false "result.md required." true
    [ -d "$dir/evidence" ] && add_check "archive:$(basename "$dir"):evidence" true "evidence directory required." true || add_check "archive:$(basename "$dir"):evidence" false "evidence directory required." true
    [ -d "$dir/artifacts" ] && add_check "archive:$(basename "$dir"):artifacts" true "artifacts directory required." true || add_check "archive:$(basename "$dir"):artifacts" false "artifacts directory required." true
  done < <(find executions -type d | grep -E '/[0-9]{4}/[0-9]{2}/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{4}[+-][0-9]{4}-[a-z0-9-]+$' || true)
  [ "$found" = true ] || add_warning "No archive execution directories matched the expected layout."
fi

ok=true
if [ -n "$errors" ]; then ok=false; fi
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
