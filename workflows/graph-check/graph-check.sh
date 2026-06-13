#!/usr/bin/env bash
set -euo pipefail

workflow="graph-check"
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
if command -v codebase-memory-mcp >/dev/null 2>&1; then add_check "command:codebase-memory-mcp" true "$(command -v codebase-memory-mcp)"; else add_check "command:codebase-memory-mcp" false "Command not found."; fi
for item in AGENTS.md .mcp.json .codex .claude graphify-out; do
  [ -e "$item" ] && add_check "graph-path:$item" true "Graph or MCP instruction path probe." || add_check "graph-path:$item" false "Graph or MCP instruction path probe."
done
hits=""
for file in AGENTS.md CLAUDE.md .CLAUDE.md; do
  if [ -f "$file" ] && grep -Eq 'codebase-memory-mcp|search_graph|trace_path|get_code_snippet' "$file"; then
    hits="${hits}${hits:+, }$file"
  fi
done
[ -n "$hits" ] && add_check "graph-first-instructions" true "$hits" || add_check "graph-first-instructions" false "No graph-first repo instruction file found."
add_warning "This workflow does not register MCP servers, index repositories, install graph tools, or upload code."
add_warning "Project indexing status must be confirmed through the active MCP graph tool when available; otherwise use targeted file inspection."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
