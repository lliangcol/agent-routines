#!/usr/bin/env bash
set -euo pipefail

config_path=""
write_manifest=false
apply=false
force=false

usage() {
  printf 'Usage: ./tools/generate-install-manifest.sh --config-path PATH [--write-manifest] [--apply] [--force]\n'
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

plan_json="$("$py" - "$repo_root" "$config_path" "$write_manifest" "$apply" "$force" <<'PY'
import json
import os
import re
import sys
from pathlib import Path

repo_root = Path(sys.argv[1]).resolve()
config_path = Path(sys.argv[2]).resolve()
write_manifest = sys.argv[3] == "true"
apply = sys.argv[4] == "true"
force = sys.argv[5] == "true"

name_re = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def require_array(value, context, default=None):
    if value is None:
        return list(default or [])
    if isinstance(value, str) or not isinstance(value, list):
        raise SystemExit(f"{context} must be an array.")
    result = []
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise SystemExit(f"{context} contains an invalid string.")
        result.append(item)
    return result


def require_bool(value, context, default):
    if value is None:
        return default
    if not isinstance(value, bool):
        raise SystemExit(f"{context} must be boolean when set.")
    return value


def require_nonnegative_int(value, context, default):
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise SystemExit(f"{context} must be an integer >= 0.")
    return value


def unique_ordered(values):
    result = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


def resolve_repo_relative(value):
    drive_match = re.match(r"^([A-Za-z]):[\\/](.*)$", value)
    if drive_match and os.name != "nt":
        drive = drive_match.group(1).lower()
        tail = drive_match.group(2).replace("\\", "/")
        candidates = [Path(f"/mnt/{drive}/{tail}"), Path(f"/{drive}/{tail}")]
        for candidate in candidates:
            if candidate.exists():
                return candidate
        return candidates[0]
    p = Path(value)
    if p.is_absolute() or drive_match:
        return p
    return repo_root / value


def existing_dirs(root):
    p = Path(root)
    if not p.is_dir():
        return []
    return sorted(child for child in p.iterdir() if child.is_dir())


def add_unique(seq, value):
    if value not in seq:
        seq.append(value)


def adapter_name(tool):
    return "codex" if tool == "codex" else "claude-code"


def skill_target_root(tool, project_path=None):
    folder = ".codex/skills" if tool == "codex" else ".claude/skills"
    if project_path:
        return Path(project_path) / folder
    return Path.home() / folder


def workflow_target_root(project_path=None):
    if project_path:
        return Path(project_path) / ".agent-routines/workflows"
    return Path.home() / ".agent-routines/workflows"


def scan_installed(root, known, scope, tool, kind, project_path):
    result = []
    for child in existing_dirs(root):
        if child.name in known:
            add_unique(result, child.name)
        else:
            unknown_installed.append({
                "scope": scope,
                "tool": tool,
                "kind": kind,
                "name": child.name,
                "projectPath": project_path or "",
                "path": str(child),
                "reason": "source directory not found in this repository",
            })
    return sorted(result)


def select_available(names, known, kind, context):
    result = []
    for name in names:
        if not name_re.match(name):
            conflicts.append({"context": context, "name": name, "reason": "invalid kebab-case name"})
            continue
        if name in known:
            add_unique(result, name)
        else:
            missing_policy.append({
                "context": context,
                "kind": kind,
                "name": name,
                "reason": "source directory not found in this repository",
            })
    return sorted(result)


def resolve_project_roots(values):
    roots = []
    for value in values:
        candidate = resolve_repo_relative(value)
        if candidate.is_dir():
            add_unique(roots, str(candidate.resolve()))
        else:
            skipped_projects.append({"path": str(candidate), "reason": "project root does not exist"})
    return sorted(roots)


def find_git_projects(roots, max_depth, exclude_dirs, skip_nested):
    projects = []
    exclude = set(exclude_dirs)
    queue = [(Path(root), 0) for root in roots]
    while queue:
        path, depth = queue.pop(0)
        if path.name in exclude:
            continue
        try:
            is_repo = (path / ".git").exists()
        except OSError:
            is_repo = False
        if is_repo:
            add_unique(projects, str(path.resolve()))
            if skip_nested:
                continue
        if depth >= max_depth:
            continue
        for child in existing_dirs(path):
            if child.name not in exclude:
                queue.append((child, depth + 1))
    return sorted(projects)


with config_path.open("r", encoding="utf-8") as f:
    config = json.load(f)
if config.get("version") != 1:
    raise SystemExit("Install discovery config version must be 1.")

tools = unique_ordered(require_array(config.get("tools"), "tools", ["codex", "claudeCode"]))
if not tools:
    raise SystemExit("tools must include at least one tool.")
for tool in tools:
    if tool not in ("codex", "claudeCode"):
        raise SystemExit(f"Unsupported tool: {tool}")
primary_tool = tools[0]

project_roots = require_array(config.get("projectRoots"), "projectRoots", [])
discovery = config.get("projectDiscovery") or {}
max_depth = require_nonnegative_int(discovery.get("maxDepth"), "projectDiscovery.maxDepth", 4)
exclude_dirs = require_array(
    discovery.get("excludeDirs"),
    "projectDiscovery.excludeDirs",
    [".git", "node_modules", "vendor", "dist", "build", "target", ".tmp", ".cache", "tmp", "temp", ".agent-routines", ".codex", ".claude"],
)
skip_nested = require_bool(discovery.get("skipNestedRepos"), "projectDiscovery.skipNestedRepos", True)

policy = config.get("scopePolicy") or {}
user_skill_policy = require_array(policy.get("userLevelSkills"), "scopePolicy.userLevelSkills", [])
project_only_policy = require_array(policy.get("projectLevelOnlySkills"), "scopePolicy.projectLevelOnlySkills", [])
user_workflow_policy = require_array(policy.get("userLevelWorkflows"), "scopePolicy.userLevelWorkflows", [])
project_default_workflow_policy = require_array(policy.get("projectDefaultWorkflows"), "scopePolicy.projectDefaultWorkflows", [])

output = config.get("output") or {}
manifest_path = resolve_repo_relative(output.get("manifestPath", ".agent-routines/generated/install.manifest.json"))
report_path = resolve_repo_relative(output.get("reportPath", ".agent-routines/generated/install.plan.json"))
install = config.get("install") or {}
validate_before = require_bool(install.get("validateBeforeInstall"), "install.validateBeforeInstall", True)
verify_after = require_bool(install.get("verifyAfterInstall"), "install.verifyAfterInstall", True)
if require_bool(install.get("force"), "install.force", False):
    raise SystemExit("install.force cannot enable replacement from config; use the CLI --force flag.")

available_skills = {p.name for p in existing_dirs(repo_root / "skills")}
available_workflows = {p.name for p in existing_dirs(repo_root / "workflows")}

unknown_installed = []
missing_policy = []
conflicts = []
skipped_projects = []
unclassified_installed = []
scanned_user_targets = []
scanned_project_targets = []

project_only = set(project_only_policy)
user_policy = set(user_skill_policy)
user_workflow_policy_set = set(user_workflow_policy)
for skill in user_skill_policy:
    if skill in project_only:
        conflicts.append({
            "context": "scopePolicy",
            "name": skill,
            "reason": "skill appears in both userLevelSkills and projectLevelOnlySkills; project-only wins",
        })

for tool in tools:
    target = skill_target_root(tool)
    scanned_user_targets.append({"tool": tool, "kind": "skill", "path": str(target), "exists": target.is_dir()})
    names = scan_installed(target, available_skills, "user", tool, "skill", "")
    for name in names:
        if name in project_only:
            conflicts.append({"context": f"user.{tool}.skills", "name": name, "reason": "project-level-only skill is installed at user level"})
        elif name not in user_policy:
            unclassified_installed.append({
                "scope": "user",
                "tool": tool,
                "kind": "skill",
                "name": name,
                "path": str(target / name),
                "reason": "installed skill is not in userLevelSkills policy",
            })

user_workflow_target = workflow_target_root()
scanned_user_targets.append({"tool": "shared", "kind": "workflow", "path": str(user_workflow_target), "exists": user_workflow_target.is_dir()})
installed_user_workflows = scan_installed(user_workflow_target, available_workflows, "user", "shared", "workflow", "")
for name in installed_user_workflows:
    if name not in user_workflow_policy_set:
        unclassified_installed.append({
            "scope": "user",
            "tool": "shared",
            "kind": "workflow",
            "name": name,
            "path": str(user_workflow_target / name),
            "reason": "installed workflow is not in userLevelWorkflows policy",
        })

user_level_skills = select_available([s for s in user_skill_policy if s not in project_only], available_skills, "skill", "scopePolicy.userLevelSkills")
user_level_workflows = select_available(user_workflow_policy, available_workflows, "workflow", "scopePolicy.userLevelWorkflows")
project_default_workflows = select_available(project_default_workflow_policy, available_workflows, "workflow", "scopePolicy.projectDefaultWorkflows")

resolved_roots = resolve_project_roots(project_roots)
projects = find_git_projects(resolved_roots, max_depth, exclude_dirs, skip_nested)

manifest = {"version": 1, "user": {}, "projects": []}
for tool in tools:
    block = {}
    if user_level_skills:
        block["skills"] = user_level_skills
    if tool == primary_tool and user_level_workflows:
        block["workflows"] = user_level_workflows
    manifest["user"][tool] = block

discovered_projects = []
for project in projects:
    project_path = Path(project)
    project_record = {"path": project, "tools": {}, "workflows": [], "hasProjectConfig": False}
    project_block = {"path": project}
    shared_workflow_target = workflow_target_root(project)
    scanned_project_targets.append({
        "projectPath": project,
        "tool": "shared",
        "kind": "workflow",
        "path": str(shared_workflow_target),
        "exists": shared_workflow_target.is_dir(),
    })
    project_workflows = scan_installed(shared_workflow_target, available_workflows, "project", "shared", "workflow", project)
    if shared_workflow_target.exists() or project_workflows:
        project_record["hasProjectConfig"] = True

    project_skills_by_tool = {}
    for tool in tools:
        target = skill_target_root(tool, project)
        scanned_project_targets.append({
            "projectPath": project,
            "tool": tool,
            "kind": "skill",
            "path": str(target),
            "exists": target.is_dir(),
        })
        skills = scan_installed(target, available_skills, "project", tool, "skill", project)
        if target.exists() or skills:
            project_record["hasProjectConfig"] = True
        project_skills_by_tool[tool] = skills
        project_record["tools"][tool] = {"skills": skills}

    workflow_list = []
    for wf in project_workflows:
        add_unique(workflow_list, wf)
    if project_record["hasProjectConfig"]:
        for wf in project_default_workflows:
            add_unique(workflow_list, wf)

    for tool in tools:
        skills = project_skills_by_tool[tool]
        block = {}
        if skills:
            block["skills"] = skills
        if tool == primary_tool and workflow_list:
            block["workflows"] = sorted(workflow_list)
        if block:
            project_block[tool] = block
    project_record["workflows"] = sorted(workflow_list)
    discovered_projects.append(project_record)
    if len(project_block) > 1:
        manifest["projects"].append(project_block)

generator_command = f'./tools/generate-install-manifest.sh --config-path "{config_path}"'
if write_manifest:
    generator_command += " --write-manifest"
if apply:
    generator_command += " --apply"
if force:
    generator_command += " --force"
commands = [generator_command]
if write_manifest:
    commands.append(f'./tests/validate-manifest.sh --manifest-path "{manifest_path}"')
if apply:
    for tool in tools:
        adapter_command = f'./adapters/{adapter_name(tool)}/install-manifest.sh --manifest-path "{manifest_path}"'
        if force:
            adapter_command += " --force"
        commands.append(adapter_command)

plan = {
    "discoveredProjects": discovered_projects,
    "scannedUserTargets": scanned_user_targets,
    "scannedProjectTargets": scanned_project_targets,
    "generatedManifest": manifest,
    "unknownInstalledItems": unknown_installed,
    "unclassifiedInstalledItems": unclassified_installed,
    "missingPolicyItems": missing_policy,
    "conflicts": conflicts,
    "skippedProjects": skipped_projects,
    "installPlan": {
        "dryRun": not write_manifest,
        "writeManifest": write_manifest,
        "apply": apply,
        "force": force,
        "primaryWorkflowTool": primary_tool,
        "manifestPath": str(manifest_path),
        "reportPath": str(report_path),
        "tools": tools,
        "validateBeforeInstall": validate_before,
        "verifyAfterInstall": verify_after,
    },
    "commandsToRun": commands,
}

if write_manifest:
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print(json.dumps(plan, indent=2, ensure_ascii=False))
PY
)"

printf '%s\n' "$plan_json"

manifest_path="$(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; print(json.load(sys.stdin)["installPlan"]["manifestPath"])')"
validate_before="$(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; print(str(json.load(sys.stdin)["installPlan"]["validateBeforeInstall"]).lower())')"
verify_after="$(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; print(str(json.load(sys.stdin)["installPlan"]["verifyAfterInstall"]).lower())')"

if [ "$write_manifest" = true ] && [ "$validate_before" = true ]; then
  "$repo_root/tests/validate-manifest.sh" --manifest-path "$manifest_path"
fi

if [ "$apply" = true ]; then
  mapfile -t tools < <(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; [print(t) for t in json.load(sys.stdin)["installPlan"]["tools"]]')
  for tool in "${tools[@]}"; do
    adapter="codex"
    if [ "$tool" = "claudeCode" ]; then
      adapter="claude-code"
    fi
    args=(--manifest-path "$manifest_path")
    if [ "$force" = true ]; then
      args+=(--force)
    fi
    "$repo_root/adapters/$adapter/install-manifest.sh" "${args[@]}"
  done
  if [ "$verify_after" = true ]; then
    for tool in "${tools[@]}"; do
      adapter="codex"
      if [ "$tool" = "claudeCode" ]; then
        adapter="claude-code"
      fi
      "$repo_root/adapters/$adapter/check-user.sh"
    done
    mapfile -t projects < <(printf '%s\n' "$plan_json" | "$py" -c 'import json, sys; [print(p["path"]) for p in json.load(sys.stdin)["generatedManifest"].get("projects", [])]')
    for project in "${projects[@]}"; do
      for tool in "${tools[@]}"; do
        adapter="codex"
        if [ "$tool" = "claudeCode" ]; then
          adapter="claude-code"
        fi
        "$repo_root/adapters/$adapter/check-project.sh" --project-path "$project"
      done
    done
  fi
fi
