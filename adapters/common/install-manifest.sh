#!/usr/bin/env bash
set -euo pipefail

tool=""
manifest_path=""
force=false
dry_run=false

usage() {
  printf 'Usage: %s --tool codex|claude-code --manifest-path PATH [--force] [--dry-run]\n' "$0"
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
    --manifest-path) require_value "$@"; manifest_path="$2"; shift 2 ;;
    --force) force=true; shift ;;
    --dry-run) dry_run=true; shift ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ "$tool" != "codex" ] && [ "$tool" != "claude-code" ]; then
  printf 'Tool must be codex or claude-code.\n' >&2
  exit 2
fi
if [ -z "$manifest_path" ]; then
  printf 'Missing required --manifest-path.\n' >&2
  exit 2
fi
if [ ! -f "$manifest_path" ]; then
  printf 'Manifest not found: %s\n' "$manifest_path" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "$0")" && pwd -P)"
repo_root="$(cd "$script_dir/../.." && pwd -P)"
skill_source_root="$repo_root/skills"
workflow_source_root="$repo_root/workflows"
tool_key="codex"
skill_folder=".codex/skills"
user_skill_target_root="$HOME/.codex/skills"
if [ "$tool" = "claude-code" ]; then
  tool_key="claudeCode"
  skill_folder=".claude/skills"
  user_skill_target_root="$HOME/.claude/skills"
fi
user_workflow_target_root="$HOME/.agent-routines/workflows"

resolve_project_path() {
  local project_path="$1"
  case "$project_path" in
    /*|[A-Za-z]:/*|[A-Za-z]:\\*) printf '%s\n' "$project_path" ;;
    *) printf '%s\n' "$repo_root/$project_path" ;;
  esac
}

parse_with_python() {
  "$1" - "$manifest_path" "$tool_key" <<'PY'
import json, os, re, sys

manifest_path, tool_key = sys.argv[1], sys.argv[2]
with open(manifest_path, "r", encoding="utf-8") as f:
    doc = json.load(f)
if doc.get("version") != 1:
    raise SystemExit("Manifest version must be 1.")
name_re = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

def names(block, key, context):
    if not block or key not in block or block[key] is None:
        return []
    value = block[key]
    if not isinstance(value, list):
        raise SystemExit(f"{context}.{key} must be an array.")
    result = []
    for item in value:
        if not isinstance(item, str) or not item.strip() or not name_re.match(item):
            raise SystemExit(f"{context}.{key} contains invalid name: {item!r}")
        result.append(item)
    return result

def emit(scope, project_path, kind, name):
    fields = [scope, project_path, kind, name]
    if any("\t" in field or "\n" in field or "\r" in field for field in fields):
        raise SystemExit("Manifest values cannot contain tabs or newlines.")
    print("\t".join(fields))

user = doc.get("user") or {}
block = user.get(tool_key) or {}
for skill in names(block, "skills", f"user.{tool_key}"):
    emit("user", ".", "skill", skill)
for workflow in names(block, "workflows", f"user.{tool_key}"):
    emit("user", ".", "workflow", workflow)

projects = doc.get("projects") or []
if not isinstance(projects, list):
    raise SystemExit("projects must be an array.")
for project in projects:
    if not isinstance(project, dict) or not isinstance(project.get("path"), str) or not project["path"].strip():
        raise SystemExit("Every project entry must include path.")
    project_path = project["path"]
    block = project.get(tool_key) or {}
    for skill in names(block, "skills", f"projects[{project_path}].{tool_key}"):
        emit("project", project_path, "skill", skill)
    for workflow in names(block, "workflows", f"projects[{project_path}].{tool_key}"):
        emit("project", project_path, "workflow", workflow)
PY
}

parse_with_node() {
  node - "$manifest_path" "$tool_key" <<'NODE'
const fs = require("fs");
const path = require("path");
const manifestPath = process.argv[2];
const toolKey = process.argv[3];
const doc = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (doc.version !== 1) throw new Error("Manifest version must be 1.");
const nameRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
function names(block, key, context) {
  if (!block || block[key] == null) return [];
  if (!Array.isArray(block[key])) throw new Error(`${context}.${key} must be an array.`);
  return block[key].map((item) => {
    if (typeof item !== "string" || !item.trim() || !nameRe.test(item)) {
      throw new Error(`${context}.${key} contains invalid name: ${item}`);
    }
    return item;
  });
}
function emit(scope, projectPath, kind, name) {
  const fields = [scope, projectPath, kind, name];
  if (fields.some((field) => /[\t\r\n]/.test(field))) throw new Error("Manifest values cannot contain tabs or newlines.");
  console.log(fields.join("\t"));
}
const userBlock = ((doc.user || {})[toolKey]) || {};
for (const skill of names(userBlock, "skills", `user.${toolKey}`)) emit("user", ".", "skill", skill);
for (const workflow of names(userBlock, "workflows", `user.${toolKey}`)) emit("user", ".", "workflow", workflow);
const projects = doc.projects || [];
if (!Array.isArray(projects)) throw new Error("projects must be an array.");
for (const project of projects) {
  if (!project || typeof project.path !== "string" || !project.path.trim()) throw new Error("Every project entry must include path.");
  const projectPath = project.path;
  const block = project[toolKey] || {};
  for (const skill of names(block, "skills", `projects[${projectPath}].${toolKey}`)) emit("project", projectPath, "skill", skill);
  for (const workflow of names(block, "workflows", `projects[${projectPath}].${toolKey}`)) emit("project", projectPath, "workflow", workflow);
}
NODE
}

parse_with_jq() {
  jq -r --arg tool "$tool_key" '
    if .version != 1 then error("Manifest version must be 1.")
    elif ((.projects // []) | type) != "array" then error("projects must be an array.")
    else
      ((.user[$tool].skills // [])[] | ["user", ".", "skill", .] | @tsv),
      ((.user[$tool].workflows // [])[] | ["user", ".", "workflow", .] | @tsv),
      ((.projects // [])[] as $project |
        if (($project.path // "") == "") then error("Every project entry must include path.")
        else
          (($project[$tool].skills // [])[] | ["project", ($project.path | tostring), "skill", .] | @tsv),
          (($project[$tool].workflows // [])[] | ["project", ($project.path | tostring), "workflow", .] | @tsv)
        end)
    end
  ' "$manifest_path"
}

parse_manifest() {
  if command -v python3 >/dev/null 2>&1; then
    parse_with_python python3
  elif command -v python >/dev/null 2>&1; then
    parse_with_python python
  elif command -v node >/dev/null 2>&1; then
    parse_with_node
  elif command -v jq >/dev/null 2>&1; then
    parse_with_jq
  else
    printf 'Manifest mode requires python3, python, node, or jq; none were found.\n' >&2
    exit 1
  fi
}

installed=()
skipped=()
planned=()
sources=()
targets=()
kinds=()
names=()
errors=()

entries="$(parse_manifest)"
if [ -n "$entries" ]; then
  while IFS=$'\t' read -r scope project_path kind name; do
    [ -n "$scope" ] || continue
    scope="${scope%$'\r'}"
    project_path="${project_path%$'\r'}"
    kind="${kind%$'\r'}"
    name="${name%$'\r'}"
    if [ "$scope" = "user" ]; then
      skill_target_root="$user_skill_target_root"
      workflow_target_root="$user_workflow_target_root"
    elif [ "$scope" = "project" ]; then
      project_path="$(resolve_project_path "$project_path")"
      if [ ! -d "$project_path" ]; then
        errors+=("Missing project path: $project_path")
        continue
      fi
      project_abs="$(cd "$project_path" && pwd -P)"
      skill_target_root="$project_abs/$skill_folder"
      workflow_target_root="$project_abs/.agent-routines/workflows"
    else
      errors+=("Invalid scope: $scope")
      continue
    fi

    if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
      errors+=("Invalid name: $name")
      continue
    fi
    if [ "$kind" = "skill" ]; then
      source="$skill_source_root/$name"
      target="$skill_target_root/$name"
    elif [ "$kind" = "workflow" ]; then
      source="$workflow_source_root/$name"
      target="$workflow_target_root/$name"
    else
      errors+=("Invalid kind: $kind")
      continue
    fi
    if [ ! -d "$source" ]; then
      errors+=("Missing $kind: $name")
      continue
    fi
    sources+=("$source")
    targets+=("$target")
    kinds+=("$kind")
    names+=("$name")
  done <<< "$entries"
fi

if [ "${#errors[@]}" -gt 0 ]; then
  printf '%s\n' "${errors[@]}" >&2
  exit 1
fi

copy_dir_safe() {
  local source="$1"
  local target="$2"
  local action="install"
  if [ -e "$target" ]; then
    if [ "$force" != true ]; then
      skipped+=("exists:$target")
      return
    fi
    action="replace"
  fi
  if [ "$dry_run" = true ]; then
    planned+=("$action:$target")
    return
  fi
  if [ -e "$target" ]; then
    rm -rf -- "$target"
  fi
  mkdir -p -- "$(dirname "$target")"
  cp -R -- "$source" "$target"
  installed+=("$target")
}

for i in "${!sources[@]}"; do
  copy_dir_safe "${sources[$i]}" "${targets[$i]}"
done

printf 'Manifest install summary\n'
printf 'Tool: %s\n' "$tool"
printf 'Dry run: %s\n' "$dry_run"
printf 'Planned: %s\n' "${planned[*]:-}"
printf 'Installed: %s\n' "${installed[*]:-}"
printf 'Skipped: %s\n' "${skipped[*]:-}"
