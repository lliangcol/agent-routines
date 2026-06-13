#!/usr/bin/env bash
set -euo pipefail

workflow="security-check"
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
append_text() { local var_name="$1"; local value="$2"; local current="${!var_name:-}"; if [ -z "$current" ]; then printf -v "$var_name" '%s' "$value"; else printf -v "$var_name" '%s; %s' "$current" "$value"; fi; }

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi
secret_re='(api[_-]?key|access[_-]?token|secret|password|passwd|private[_-]?key)[[:space:]]*[:=][[:space:]]*['"'"'"]?[A-Za-z0-9_./+=-]{12,}'
aws_re='AKIA[0-9A-Z]{16}'
private_key_re='-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----'
private_path_re='([A-Z]:\\Users\\[^\\]+\\Documents\\|[A-Z]:\\Work\\Projects\\|/home/[^/]+/private/)'
high=""
manual=""
file_count=0
while IFS= read -r -d '' file; do
  file_count=$((file_count + 1))
  matches="$(grep -Eni "$secret_re|$aws_re|$private_key_re" "$file" 2>/dev/null || true)"
  if [ -n "$matches" ]; then
    while IFS=: read -r line_no _; do append_text high "secret-like:${file#./}:$line_no"; done <<< "$matches"
  fi
  private_matches="$(grep -En "$private_path_re" "$file" 2>/dev/null || true)"
  if [ -n "$private_matches" ]; then
    while IFS=: read -r line_no _; do append_text manual "private-path:${file#./}:$line_no"; done <<< "$private_matches"
  fi
done < <(find . \( -type d \( -name '.git' -o -name 'node_modules' -o -name 'target' -o -name 'dist' -o -name 'build' -o -name 'out' -o -name 'release' -o -name 'coverage' -o -name 'tmp' -o -name 'temp' -o -name '.tmp' -o -name '.cache' -o -name '__pycache__' \) -prune \) -o -type f -size -1048576c -print0 2>/dev/null)

add_check "files-scanned" true "$file_count files scanned, files over 1 MiB skipped."
if [ -n "$high" ]; then add_check "high-confidence-findings" false "$high"; add_error "High-confidence sensitive patterns were found. Values are redacted; inspect the listed paths manually."; else add_check "high-confidence-findings" true "No high-confidence secret-like findings."; fi
if [ -n "$manual" ]; then add_check "manual-review-findings" false "$manual"; add_warning "Manual-review findings were found. Values are redacted; inspect the listed paths manually."; else add_check "manual-review-findings" true "No private path findings."; fi
add_warning "This workflow does not delete files, rotate credentials, rewrite history, or publish results."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
