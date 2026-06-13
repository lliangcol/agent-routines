#!/usr/bin/env bash
set -euo pipefail

workflow="commit-check"
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
line_count() { if [ -z "$1" ]; then printf '0'; else printf '%s\n' "$1" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' '; fi; }

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi
if ! command -v git >/dev/null 2>&1; then
  add_check "git-repository" false "git not found"
  add_error "Required check failed: git-repository"
else
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    add_check "git-repository" true "Inside a git work tree."
    branch="$(git branch --show-current 2>&1 || true)"
    [ -n "$branch" ] && add_check "git-branch" true "$branch" || add_check "git-branch" true "Detached HEAD or unnamed branch."
    head="$(git rev-parse --verify HEAD 2>&1 || true)"
    git rev-parse --verify HEAD >/dev/null 2>&1 && add_check "git-head" true "$head" || add_check "git-head" false "No HEAD commit found."
    status="$(git status --short --untracked-files=all 2>&1 || true)"
    [ -n "$status" ] && add_check "git-status" true "$status" || add_check "git-status" true "clean"
    staged="$(git diff --cached --name-only 2>&1 || true)"
    add_check "staged-files" true "$(line_count "$staged") staged files."
    unstaged="$(git diff --name-only 2>&1 || true)"
    add_check "unstaged-files" true "$(line_count "$unstaged") unstaged files."
    untracked="$(git ls-files --others --exclude-standard 2>&1 || true)"
    add_check "untracked-files" true "$(line_count "$untracked") untracked files."
    user_name="$(git config --get user.name 2>/dev/null || true)"
    user_email="$(git config --get user.email 2>/dev/null || true)"
    [ -n "$user_name" ] && add_check "git-user-name" true "$user_name" || add_check "git-user-name" false "user.name is not configured."
    [ -n "$user_email" ] && add_check "git-user-email" true "$user_email" || add_check "git-user-email" false "user.email is not configured."
    if [ -z "$user_name" ] || [ -z "$user_email" ]; then add_warning "Git identity is incomplete; commit commands may need repo-specific one-off identity flags."; fi
    diff_check="$(git diff --check 2>&1 || true)"
    if git diff --check >/dev/null 2>&1; then add_check "git-diff-check" true "No whitespace errors in unstaged diff."; else add_check "git-diff-check" false "$diff_check"; add_error "Required check failed: git-diff-check"; fi
    cached_check="$(git diff --cached --check 2>&1 || true)"
    if git diff --cached --check >/dev/null 2>&1; then add_check "git-diff-cached-check" true "No whitespace errors in staged diff."; else add_check "git-diff-cached-check" false "$cached_check"; add_error "Required check failed: git-diff-cached-check"; fi
  else
    add_check "git-repository" false "Directory is not a git work tree."
    add_error "Required check failed: git-repository"
  fi
fi
add_warning "This workflow does not stage, commit, push, tag, or rewrite history."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
