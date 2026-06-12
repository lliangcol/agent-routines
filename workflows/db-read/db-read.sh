#!/usr/bin/env bash
set -euo pipefail

workflow="db-read"
path="."
sql=""
sql_file=""
custom_commands=()

usage() {
  printf 'Usage: %s [--path PATH] [--custom-command CMD] [--sql SQL] [--sql-file FILE]\n' "$0"
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
    --custom-command) require_value "$@"; custom_commands+=("$2"); shift 2 ;;
    --sql) require_value "$@"; sql="$2"; shift 2 ;;
    --sql-file) require_value "$@"; sql_file="$2"; shift 2 ;;
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
  printf '%s' "$value"
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

case "$workflow" in
  preflight)
    if run_git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      add_check "git-repository" true "Inside a git work tree."
      if output="$(run_git branch --show-current)"; then add_check "git-branch" true "$output"; else add_check "git-branch" false "$output"; fi
      if output="$(run_git rev-parse --verify HEAD)"; then add_check "git-head" true "$output"; else add_check "git-head" false "No HEAD commit found."; add_warning "No git HEAD commit was found; repository may be on an unborn branch."; fi
      if status="$(run_git status --short)"; then
        [ -n "$status" ] || status="clean"
        add_check "git-status" true "$status"
      else
        add_check "git-status" false "$status"
      fi
    else
      add_warning "Directory is not a git repository or git is unavailable."
    fi
    for rule in AGENTS.md CLAUDE.md .codex .claude .agent-routines docs plans; do
      if [ -e "$rule" ]; then add_check "rule-presence:$rule" true "Rule or documentation path probe."; else add_check "rule-presence:$rule" false "Rule or documentation path probe."; fi
    done
    ;;
  gate-check)
    if run_git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      if output="$(run_git diff --check)"; then add_check "git-diff-check" true "$output" true; else add_check "git-diff-check" false "$output" true; fi
      if output="$(run_git diff --cached --check)"; then add_check "git-diff-cached-check" true "$output" true; else add_check "git-diff-cached-check" false "$output" true; fi
    else
      add_warning "Skipping git gates because this is not a git repository or git is unavailable."
    fi
    for command in "${custom_commands[@]}"; do safe_custom_command "$command"; done
    ;;
  merge-check)
    if run_git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      merge_head="$(run_git rev-parse --git-path MERGE_HEAD || true)"
      if [ -n "$merge_head" ] && [ -f "$merge_head" ]; then add_check "merge-state" true "Merge in progress."; else add_check "merge-state" true "No merge in progress."; fi
      unresolved="$(run_git diff --name-only --diff-filter=U || true)"
      if [ -z "$unresolved" ]; then add_check "unresolved-files" true "" true; else add_check "unresolved-files" false "$unresolved" true; fi
      if output="$(run_git diff --cached --check)"; then add_check "cached-diff-check" true "$output" true; else add_check "cached-diff-check" false "$output" true; fi
    else
      add_warning "Skipping git merge checks because this is not a git repository or git is unavailable."
    fi
    markers="$(grep -RInE --exclude-dir=.git '^(<<<<<<<|=======|>>>>>>>)' . 2>/dev/null | head -20 || true)"
    if [ -z "$markers" ]; then add_check "conflict-markers" true "No conflict markers found." true; else add_check "conflict-markers" false "$markers" true; fi
    ;;
  archive-check)
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
    ;;
  db-read)
    query="$sql"
    if [ -n "$sql_file" ]; then
      if [ -f "$sql_file" ]; then query="$(cat "$sql_file")"; else add_error "SQL file not found: $sql_file"; fi
    fi
    if [ -z "${query:-}" ]; then
      add_warning "No SQL provided. This workflow validates readonly SQL only and never connects to a database."
    elif printf '%s' "$query" | grep -Eiq '\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke|merge|call|execute)\b'; then
      add_error "SQL rejected because it contains write, DDL, or execution keywords."
    else
      add_check "readonly-sql" true "SQL passed keyword validation. Integrate a project-owned readonly wrapper before real use."
    fi
    add_warning "No database connection is opened by this workflow."
    ;;
  doc-check)
    [ -f README.md ] && add_check "readme-present" true "Root README.md probe." true || add_check "readme-present" false "Root README.md probe." true
    [ -d docs ] && add_check "docs-present" true "docs directory probe." true || add_check "docs-present" false "docs directory probe." true
    if command -v python >/dev/null 2>&1; then add_check "python-detected" true "python is available for optional documentation commands."; else add_warning "python was not found; Python-based doc checks were skipped."; fi
    for command in "${custom_commands[@]}"; do safe_custom_command "$command"; done
    ;;
esac

ok=true
if [ -n "$errors" ]; then ok=false; fi
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
