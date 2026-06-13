#!/usr/bin/env bash
set -euo pipefail

skill_name=""
workflows_only=false
remove_workflows=false

usage() {
  printf 'Usage: %s --skill-name NAME [--remove-workflows] or --workflows-only\n' "$0"
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
    --workflows-only) workflows_only=true; shift ;;
    --remove-workflows) remove_workflows=true; shift ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ "$workflows_only" != true ] && [ -z "$skill_name" ]; then
  printf 'Skill name is required unless --workflows-only is used.\n' >&2
  exit 2
fi
if [ "$workflows_only" != true ] && [[ ! "$skill_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  printf 'Skill name must be a kebab-case folder name.\n' >&2
  exit 2
fi

skill_target_root="$HOME/.codex/skills"
workflow_target_root="$HOME/.agent-routines/workflows"

removed=()
skipped=()

remove_explicit() {
  local target="$1"
  if [ -e "$target" ]; then
    rm -rf -- "$target"
    removed+=("$target")
  else
    skipped+=("missing:$target")
  fi
}

if [ "$workflows_only" != true ]; then
  remove_explicit "$skill_target_root/$skill_name"
fi

if [ "$workflows_only" = true ] || [ "$remove_workflows" = true ]; then
  remove_explicit "$workflow_target_root"
fi

printf 'Uninstall summary\n'
printf 'Removed: %s\n' "${removed[*]:-}"
printf 'Skipped: %s\n' "${skipped[*]:-}"
