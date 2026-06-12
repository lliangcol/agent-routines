#!/usr/bin/env bash
set -euo pipefail

skill_name=""
skip_workflows=false
workflows_only=false
force=false

usage() {
  printf 'Usage: %s [--skill-name NAME] [--skip-workflows] [--workflows-only] [--force]\n' "$0"
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
    --skill-name) require_value "$@"; skill_name="$2"; shift 2 ;;
    --skip-workflows) skip_workflows=true; shift ;;
    --workflows-only) workflows_only=true; shift ;;
    --force) force=true; shift ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ "$workflows_only" = true ] && [ "$skip_workflows" = true ]; then
  printf 'Use either --workflows-only or --skip-workflows, not both.\n' >&2
  exit 2
fi
if [ -n "$skill_name" ] && [[ ! "$skill_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  printf 'Skill name must be a kebab-case folder name.\n' >&2
  exit 2
fi

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
repo_root="$(cd "$script_dir/../.." && pwd -P)"
skill_source_root="$repo_root/skills"
workflow_source_root="$repo_root/workflows"

skill_target_root="$HOME/.claude/skills"
workflow_target_root="$HOME/.agent-routines/workflows"

installed=()
skipped=()

copy_dir_safe() {
  local source="$1"
  local target="$2"
  if [ ! -d "$source" ]; then
    printf 'Source not found: %s\n' "$source" >&2
    exit 1
  fi
  if [ -e "$target" ]; then
    if [ "$force" != true ]; then
      skipped+=("exists:$target")
      return
    fi
    rm -rf -- "$target"
  fi
  mkdir -p -- "$(dirname "$target")"
  cp -R -- "$source" "$target"
  installed+=("$target")
}

if [ "$workflows_only" != true ]; then
  if [ -n "$skill_name" ]; then
    copy_dir_safe "$skill_source_root/$skill_name" "$skill_target_root/$skill_name"
  else
    while IFS= read -r skill_dir; do
      copy_dir_safe "$skill_dir" "$skill_target_root/$(basename "$skill_dir")"
    done < <(find "$skill_source_root" -mindepth 1 -maxdepth 1 -type d)
  fi
fi

if [ "$skip_workflows" != true ]; then
  copy_dir_safe "$workflow_source_root" "$workflow_target_root"
fi

printf 'Install summary\n'
printf 'Installed: %s\n' "${installed[*]:-}"
printf 'Skipped: %s\n' "${skipped[*]:-}"
