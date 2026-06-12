#!/usr/bin/env bash
set -euo pipefail

workflow="github-check"
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
if [ -d .github/workflows ]; then
  add_check "github-workflows-directory" true ".github/workflows probe."
  workflow_count="$(find .github/workflows -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) | wc -l | tr -d ' ')"
  add_check "workflow-file-count" "$([ "$workflow_count" -gt 0 ] && printf true || printf false)" "$workflow_count workflow files found."
  candidates=""
  for file in .github/workflows/*.yml .github/workflows/*.yaml; do
    [ -f "$file" ] || continue
    base="$(basename "$file")"; base="${base%.*}"
    candidates="${candidates}${candidates:+, }$base"
    job_ids="$(awk '/^[[:space:]]*jobs:[[:space:]]*$/{in_jobs=1; next} in_jobs && /^[A-Za-z_][A-Za-z0-9_-]*:[[:space:]]*$/{in_jobs=0} in_jobs && /^[[:space:]][[:space:]][A-Za-z0-9_-]+:[[:space:]]*$/{gsub(/[[:space:]:]/,""); print}' "$file" | sort -u | paste -sd ', ' -)"
    [ -n "$job_ids" ] && candidates="${candidates}, $job_ids"
  done
  [ -n "$candidates" ] && add_check "candidate-checks" true "$candidates" || add_check "candidate-checks" false "No candidate checks found."
else
  add_check "github-workflows-directory" false ".github/workflows probe."
  add_warning "No .github/workflows directory found; required checks cannot be inferred from local workflow evidence."
fi
add_warning "This workflow does not call GitHub APIs, save rulesets, change branch protection, or submit forms."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
