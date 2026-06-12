#!/usr/bin/env bash
set -euo pipefail

workflow="governance-check"
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

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi
for item in AGENTS.md CLAUDE.md .agents .claude .agent-routines .mcp.json; do
  [ -e "$item" ] && add_check "governance-path:$item" true "Current checkout governance path probe." || add_check "governance-path:$item" false "Current checkout governance path probe."
done
for item in scripts/verify_claude_governance.py .agents/tools/validate.py scripts/sync_agent_assets.py scripts/agent_governance_gate.py; do
  [ -e "$item" ] && add_check "governance-script:$item" true "Current checkout script probe." || add_check "governance-script:$item" false "Current checkout script probe."
done
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current 2>&1 || true)"
  status="$(git status --short 2>&1 || true)"
  [ -n "$status" ] || status="clean"
  add_check "git-branch" true "$branch"
  add_check "git-status" true "$status"
else
  add_warning "Skipping git governance probes because this is not a git repository or git is unavailable."
fi
add_warning "Archived or cutover documents are context only; this workflow checks current checkout paths."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
