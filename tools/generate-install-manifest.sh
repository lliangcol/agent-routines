#!/usr/bin/env bash
set -euo pipefail

config_path=""
write_manifest=false
apply=false
force=false
mode="merge"
expected_manifest_digest=""

usage() {
  printf 'Usage: ./tools/generate-install-manifest.sh --config-path PATH [--write-manifest] [--apply] [--force] [--mode dry-run|merge|replace-listed|sync-prune] [--expected-manifest-digest SHA256]\n'
  printf 'Discovers installed Agent Routines targets, generates a manifest plan, and optionally installs it.\n'
  printf 'Default mode is dry-run: no files are written and no install is executed.\n'
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
    --config-path) require_value "$@"; config_path="$2"; shift 2 ;;
    --write-manifest) write_manifest=true; shift ;;
    --apply) apply=true; shift ;;
    --force) force=true; shift ;;
    --mode) require_value "$@"; mode="$2"; shift 2 ;;
    --expected-manifest-digest) require_value "$@"; expected_manifest_digest="$2"; shift 2 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ -z "$config_path" ]; then
  printf 'Missing required --config-path.\n' >&2
  exit 2
fi
if [ "$apply" = true ] && [ "$write_manifest" != true ]; then
  printf 'Apply requires --write-manifest so the reviewed manifest path exists before installation.\n' >&2
  exit 2
fi
if [ ! -f "$config_path" ]; then
  printf 'Config not found: %s\n' "$config_path" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"

if command -v python3 >/dev/null 2>&1; then
  py="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  py="$(command -v python)"
else
  printf 'generate-install-manifest.sh requires python3 or python.\n' >&2
  exit 1
fi

case "$mode" in
  dry-run|merge|replace-listed|sync-prune) ;;
  *) printf 'Unsupported mode: %s\n' "$mode" >&2; exit 2 ;;
esac

helper_args=(
  "$script_dir/install-discovery-plan.py"
  --repo-root "$repo_root"
  --config-path "$config_path"
  --mode "$mode"
)
if [ "$write_manifest" = true ]; then helper_args+=(--write-manifest); fi
if [ "$apply" = true ]; then helper_args+=(--apply); fi
if [ "$force" = true ]; then helper_args+=(--force); fi
if [ -n "$expected_manifest_digest" ]; then helper_args+=(--expected-manifest-digest "$expected_manifest_digest"); fi
plan_json="$("$py" "${helper_args[@]}")"
printf '%s\n' "$plan_json"

manifest_path="$(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; print(json.load(sys.stdin)["installPlan"]["manifestPath"])')"
apply_mode="$(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; print(json.load(sys.stdin)["installPlan"]["applyMode"])')"
verify_after="$(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; print(str(json.load(sys.stdin)["installPlan"]["verifyAfterInstall"]).lower())')"

if [ "$write_manifest" = true ]; then
  "$repo_root/tests/validate-manifest.sh" --manifest-path "$manifest_path"
fi

if [ "$apply" = true ]; then
  tools=()
  while IFS= read -r tool_name; do
    tools+=("$tool_name")
  done < <(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; [print(t) for t in json.load(sys.stdin)["installPlan"]["tools"]]')
  for tool in "${tools[@]}"; do
    adapter="codex"
    if [ "$tool" = "claudeCode" ]; then
      adapter="claude-code"
    fi
    install_args=(--manifest-path "$manifest_path" --mode "$apply_mode")
    if [ "$force" = true ]; then
      install_args+=(--force)
    fi
    "$repo_root/adapters/$adapter/install-manifest.sh" "${install_args[@]}"
  done
  if [ "$verify_after" = true ]; then
    for tool in "${tools[@]}"; do
      check_adapter="codex"
      if [ "$tool" = "claudeCode" ]; then
        check_adapter="claude-code"
      fi
      "$repo_root/adapters/$check_adapter/check-user.sh"
    done
    projects=()
    while IFS= read -r project_path; do
      projects+=("$project_path")
    done < <(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; [print(p["path"]) for p in json.load(sys.stdin).get("discoveredProjects", [])]')
    for project in "${projects[@]}"; do
      for tool in "${tools[@]}"; do
        check_adapter="codex"
        if [ "$tool" = "claudeCode" ]; then
          check_adapter="claude-code"
        fi
        "$repo_root/adapters/$check_adapter/check-project.sh" --project-path "$project"
      done
    done
  fi
fi
exit 0
