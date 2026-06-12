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

manifest_path, root = sys.argv[1], sys.argv[2]
with open(manifest_path, "r", encoding="utf-8") as f:
    doc = json.load(f)
errors = []
if doc.get("version") != 1:
    errors.append("Manifest version must be 1.")
name_re = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

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
    for item in value:
        if not isinstance(item, str) or not item.strip() or not name_re.match(item):
            errors.append(f"{context}.{key} contains invalid name: {item!r}")
            continue
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
