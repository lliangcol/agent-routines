#!/usr/bin/env bash
set -euo pipefail

manifest_path=""

usage() {
  printf 'Usage: ./tests/validate-manifest.sh --manifest-path PATH\n'
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
    --manifest-path) require_value "$@"; manifest_path="$2"; shift 2 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ -z "$manifest_path" ]; then
  printf 'Missing required --manifest-path.\n' >&2
  exit 2
fi
if [ ! -f "$manifest_path" ]; then
  printf 'Manifest not found: %s\n' "$manifest_path" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd -P)"

validate_with_python() {
  "$1" - "$manifest_path" "$root" <<'PY'
import json, os, re, sys
from pathlib import Path

manifest_path, root = sys.argv[1], sys.argv[2]
with open(manifest_path, "r", encoding="utf-8") as f:
    doc = json.load(f)
errors = []
name_re = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

def is_windows_rooted(value):
    return bool(re.match(r"^[A-Za-z]:[\\/]", value))

def normalize(value):
    text = str(value).replace("\\", "/").rstrip("/")
    if is_windows_rooted(text):
        return text.lower()
    return os.path.normcase(os.path.abspath(str(value))).rstrip(os.sep)

def resolve_project_path_loose(project_path):
    if os.path.isabs(project_path) or is_windows_rooted(project_path):
        return Path(project_path)
    return Path(root) / project_path

def expected_v2_source(action):
    kind = action.get("kind")
    name = action.get("name")
    if kind == "skill":
        return Path(root) / "skills" / name
    if kind == "workflow":
        return Path(root) / "workflows" / name
    return None

def expected_v2_target(action):
    scope = action.get("scope")
    kind = action.get("kind")
    name = action.get("name")
    tool = action.get("tool")
    if kind == "workflow":
        if tool != "shared":
            errors.append("Workflow actions must use tool shared.")
            return None
        if scope == "user":
            return Path.home() / ".agent-routines" / "workflows" / name
        if scope == "project":
            project_path = action.get("projectPath")
            if not isinstance(project_path, str) or not project_path.strip():
                errors.append("Project-scoped actions must include projectPath.")
                return None
            project_root = resolve_project_path_loose(project_path)
            if not project_root.is_dir():
                errors.append(f"Missing project path: {project_path}")
            return project_root / ".agent-routines" / "workflows" / name
    if kind == "skill":
        if tool not in ("codex", "claudeCode"):
            errors.append(f"Skill action tool must be codex or claudeCode: {tool}")
            return None
        skill_folder = ".codex/skills" if tool == "codex" else ".claude/skills"
        if scope == "user":
            return Path.home() / skill_folder / name
        if scope == "project":
            project_path = action.get("projectPath")
            if not isinstance(project_path, str) or not project_path.strip():
                errors.append("Project-scoped actions must include projectPath.")
                return None
            project_root = resolve_project_path_loose(project_path)
            if not project_root.is_dir():
                errors.append(f"Missing project path: {project_path}")
            return project_root / skill_folder / name
    errors.append(f"Unsupported action scope or kind: {scope}/{kind}")
    return None

def validate_v2_action_paths(action):
    source_expected = expected_v2_source(action)
    target_expected = expected_v2_target(action)
    if source_expected is None or target_expected is None:
        return
    kind = action.get("kind")
    name = action.get("name")
    if normalize(action.get("sourcePath", "")) != normalize(source_expected):
        errors.append(f"action.sourcePath does not match expected source for {kind} {name}: {action.get('sourcePath')}")
    if normalize(action.get("targetPath", "")) != normalize(target_expected):
        errors.append(f"action.targetPath does not match expected target for {kind} {name}: {action.get('targetPath')}")
    if action.get("operation") != "prune-candidate" and not source_expected.is_dir():
        errors.append(f"Missing source path: {source_expected}")

if doc.get("version") == 2:
    if not isinstance(doc.get("desiredTargets"), list):
        errors.append("desiredTargets must be an array.")
    if not isinstance(doc.get("actions"), list):
        errors.append("actions must be an array.")
    for action in doc.get("actions") or []:
        if not isinstance(action, dict):
            errors.append("actions entries must be objects.")
            continue
        has_required_fields = True
        for key in ("operation", "kind", "name", "sourcePath", "targetPath", "tool", "scope"):
            if not isinstance(action.get(key), str) or not action[key].strip():
                errors.append(f"action.{key} is required.")
                has_required_fields = False
        if isinstance(action.get("name"), str) and not name_re.match(action["name"]):
            errors.append(f"action.name contains invalid name: {action['name']}")
        if action.get("operation") not in ("install", "skip", "replace", "prune-candidate"):
            errors.append(f"Unsupported action operation: {action.get('operation')}")
        if action.get("kind") not in ("skill", "workflow"):
            errors.append(f"Unsupported action kind: {action.get('kind')}")
        if action.get("scope") not in ("user", "project"):
            errors.append(f"Unsupported action scope: {action.get('scope')}")
        if action.get("tool") not in ("codex", "claudeCode", "shared"):
            errors.append(f"Unsupported action tool: {action.get('tool')}")
        if has_required_fields:
            validate_v2_action_paths(action)
    for key in ("backupPlan", "restorePlan", "summary"):
        if key not in doc:
            errors.append(f"{key} is required.")
    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        raise SystemExit(1)
    raise SystemExit(0)
if doc.get("version") != 1:
    errors.append("Manifest version must be 1 or 2.")

def resolve_project_path(project_path):
    if os.path.isabs(project_path) or re.match(r"^[A-Za-z]:[\\/]", project_path):
        return project_path
    return os.path.join(root, project_path)

def names(block, key, context):
    if not block or key not in block or block[key] is None:
        return []
    value = block[key]
    if not isinstance(value, list):
        errors.append(f"{context}.{key} must be an array.")
        return []
    result = []
    seen = set()
    for item in value:
        if not isinstance(item, str) or not item.strip() or not name_re.match(item):
            errors.append(f"{context}.{key} contains invalid name: {item!r}")
            continue
        if item in seen:
            errors.append(f"{context}.{key} contains duplicate name: {item}")
            continue
        seen.add(item)
        result.append(item)
    return result

def test_block(block, context):
    for skill in names(block, "skills", context):
        if not os.path.isdir(os.path.join(root, "skills", skill)):
            errors.append(f"Missing skill: {skill}")
    for workflow in names(block, "workflows", context):
        if not os.path.isdir(os.path.join(root, "workflows", workflow)):
            errors.append(f"Missing workflow: {workflow}")

user = doc.get("user") or {}
for tool_key in ("codex", "claudeCode"):
    test_block(user.get(tool_key) or {}, f"user.{tool_key}")

projects = doc.get("projects") or []
if not isinstance(projects, list):
    errors.append("projects must be an array.")
else:
    for project in projects:
        if not isinstance(project, dict) or not isinstance(project.get("path"), str) or not project["path"].strip():
            errors.append("Every project entry must include path.")
            continue
        project_path = resolve_project_path(project["path"])
        if not os.path.isdir(project_path):
            errors.append(f"Missing project path: {project['path']}")
        for tool_key in ("codex", "claudeCode"):
            test_block(project.get(tool_key) or {}, f"projects[{project['path']}].{tool_key}")

if errors:
    sys.stderr.write("\n".join(errors) + "\n")
    raise SystemExit(1)
PY
}

if command -v python3 >/dev/null 2>&1; then
  validate_with_python python3
elif command -v python >/dev/null 2>&1; then
  validate_with_python python
else
  printf 'validate-manifest.sh requires python3 or python.\n' >&2
  exit 1
fi

printf 'validate-manifest: ok\n'
