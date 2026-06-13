#!/usr/bin/env bash
set -euo pipefail

workflow="drift-check"
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
for item in docs .agents/kb docs/kb .driftkb.yml driftkb.toml; do
  [ -e "$item" ] && add_check "knowledge-path:$item" true "Knowledge or drift metadata probe." || add_check "knowledge-path:$item" false "Knowledge or drift metadata probe."
done
if command -v driftkb >/dev/null 2>&1; then add_check "command:driftkb" true "$(command -v driftkb)"; else add_check "command:driftkb" false "Command not found."; fi
md_count="$(find . -path './.git' -prune -o -path './node_modules' -prune -o -path './target' -prune -o -name '*.md' -type f -print 2>/dev/null | head -200 | wc -l | tr -d ' ')"
front_count="$(find . -path './.git' -prune -o -path './node_modules' -prune -o -path './target' -prune -o -name '*.md' -type f -print 2>/dev/null | head -200 | while IFS= read -r file; do first="$(head -n 1 "$file" 2>/dev/null || true)"; if [ "$first" = "---" ]; then printf '.\n'; fi; done | wc -l | tr -d ' ')"
add_check "markdown-files-scanned" true "$md_count Markdown files scanned, capped at 200."
add_check "markdown-frontmatter-count" true "$front_count files start with YAML frontmatter."
add_warning "This workflow does not accept fingerprints, promote stubs, or edit documentation."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
