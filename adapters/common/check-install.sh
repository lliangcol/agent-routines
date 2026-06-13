#!/usr/bin/env bash
set -euo pipefail

tool=""
scope=""
project_path="."

usage() {
  printf 'Usage: %s --tool codex|claude-code --scope user|project [--project-path PATH]\n' "$0"
  printf 'Readonly integrity check of installed skills and workflows against the source\n'
  printf 'repository. Reports ok, drift (content differs from source), or broken (files\n'
  printf 'missing). Exits 1 only when at least one installed routine is broken.\n'
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
    --tool) require_value "$@"; tool="$2"; shift 2 ;;
    --scope) require_value "$@"; scope="$2"; shift 2 ;;
    --project-path) require_value "$@"; project_path="$2"; shift 2 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

case "$tool" in
  codex|claude-code) ;;
  *) printf 'Tool must be codex or claude-code.\n' >&2; exit 2 ;;
esac
case "$scope" in
  user|project) ;;
  *) printf 'Scope must be user or project.\n' >&2; exit 2 ;;
esac

root="$(cd "$(dirname "$0")/../.." && pwd -P)"
skill_source_root="$root/skills"
workflow_source_root="$root/workflows"
if [ "$tool" = "codex" ]; then
  skill_folder=".codex/skills"
else
  skill_folder=".claude/skills"
fi
if [ "$scope" = "user" ]; then
  skill_target_root="$HOME/$skill_folder"
  workflow_target_root="$HOME/.agent-routines/workflows"
else
  if [ ! -d "$project_path" ]; then
    printf 'Project path does not exist: %s\n' "$project_path" >&2
    exit 2
  fi
  project_root="$(cd "$project_path" && pwd -P)"
  skill_target_root="$project_root/$skill_folder"
  workflow_target_root="$project_root/.agent-routines/workflows"
fi

checked=0
ok_count=0
drift_count=0
broken_count=0

compare_installed_dir() {
  local kind="$1"
  local name="$2"
  local source="$3"
  local target="$4"
  checked=$((checked + 1))
  local missing=0
  local differs=0
  local relative target_file
  while IFS= read -r -d '' file; do
    relative="${file#"$source"/}"
    target_file="$target/$relative"
    if [ ! -f "$target_file" ]; then
      missing=$((missing + 1))
    elif ! cmp -s "$file" "$target_file"; then
      differs=$((differs + 1))
    fi
  done < <(find "$source" -type f -print0)
  if [ "$missing" -gt 0 ]; then
    broken_count=$((broken_count + 1))
    printf 'check-install: %s %s: broken (%s files missing)\n' "$kind" "$name" "$missing"
  elif [ "$differs" -gt 0 ]; then
    drift_count=$((drift_count + 1))
    printf 'check-install: %s %s: drift (%s files differ from source)\n' "$kind" "$name" "$differs"
  else
    ok_count=$((ok_count + 1))
    printf 'check-install: %s %s: ok\n' "$kind" "$name"
  fi
}

if [ -d "$skill_target_root" ]; then
  for dir in "$skill_target_root"/*/; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    if [ -d "$skill_source_root/$name" ]; then
      compare_installed_dir "skill" "$name" "$skill_source_root/$name" "${dir%/}"
    fi
  done
else
  printf 'check-install: no skills installed at %s\n' "$skill_target_root"
fi

if [ -d "$workflow_target_root" ]; then
  for dir in "$workflow_target_root"/*/; do
    [ -d "$dir" ] || continue
    name="$(basename "$dir")"
    if [ -d "$workflow_source_root/$name" ]; then
      compare_installed_dir "workflow" "$name" "$workflow_source_root/$name" "${dir%/}"
    fi
  done
else
  printf 'check-install: no workflows installed at %s\n' "$workflow_target_root"
fi

printf 'check-install summary: %s checked, %s ok, %s drifted, %s broken\n' "$checked" "$ok_count" "$drift_count" "$broken_count"
if [ "$broken_count" -gt 0 ]; then
  exit 1
fi
