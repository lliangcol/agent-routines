#!/usr/bin/env python3
"""Generate Agent Routines install-discovery plans.

This helper is intentionally called by both PowerShell and Bash wrappers so
config v2 and manifest v2 JSON shapes cannot drift between shells.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any


NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
TOOLS = ("codex", "claudeCode")
DEFAULT_EXCLUDES = [
    ".git",
    "node_modules",
    "vendor",
    "dist",
    "build",
    "target",
    ".tmp",
    ".cache",
    "tmp",
    "temp",
    ".agent-routines",
    ".codex",
    ".claude",
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--config-path", required=True)
    parser.add_argument("--write-manifest", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--expected-manifest-digest", default="")
    parser.add_argument(
        "--mode",
        choices=("dry-run", "merge", "replace-listed", "sync-prune"),
        default="merge",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    config_path = Path(args.config_path).resolve()
    with config_path.open("r", encoding="utf-8") as handle:
        raw_config = json.load(handle)

    config = migrate_to_v2(raw_config)
    apply_mode = "replace-listed" if args.force else args.mode
    if not args.apply and not args.write_manifest:
        apply_mode = "dry-run"

    plan = generate_plan(repo_root, config_path, config, args, apply_mode)
    expected_digest = args.expected_manifest_digest.strip().lower()
    if expected_digest and not re.fullmatch(r"[a-f0-9]{64}", expected_digest):
        raise SystemExit("Expected manifest digest must be a 64-character SHA-256 hex value.")
    if expected_digest and plan["manifestDigest"].lower() != expected_digest:
        raise SystemExit("Generated manifest digest does not match expected reviewed manifest digest.")
    plan_text = json.dumps(plan, indent=2, ensure_ascii=False)
    print(plan_text)

    if args.write_manifest:
        manifest_path = Path(plan["installPlan"]["manifestPath"])
        report_path = Path(plan["installPlan"]["reportPath"])
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(plan["generatedManifest"], indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        report_path.write_text(plan_text + "\n", encoding="utf-8")
    return 0


def migrate_to_v2(config: dict[str, Any]) -> dict[str, Any]:
    version = config.get("version")
    if version == 2:
        reject_destructive_config(config)
        return config
    if version != 1:
        raise SystemExit("Install discovery config version must be 1 or 2.")

    tools = unique(require_array(config.get("tools"), "tools", ["codex", "claudeCode"]))
    policy = config.get("scopePolicy") or {}
    project_only = require_array(
        policy.get("projectLevelOnlySkills"),
        "scopePolicy.projectLevelOnlySkills",
        [],
    )
    user_skills = [
        name
        for name in require_array(policy.get("userLevelSkills"), "scopePolicy.userLevelSkills", [])
        if name not in set(project_only)
    ]
    discovery = config.get("projectDiscovery") or {}
    install = config.get("install") or {}
    if require_bool(install.get("force"), "install.force", False):
        raise SystemExit("install.force cannot enable replacement from config; use the CLI force flag.")

    return {
        "version": 2,
        "userTargets": {
            "enabled": bool(user_skills or policy.get("userLevelWorkflows")),
            "tools": tools,
            "skills": selection_for_tools(tools, user_skills),
            "workflows": require_array(
                policy.get("userLevelWorkflows"),
                "scopePolicy.userLevelWorkflows",
                [],
            ),
        },
        "projectDefaults": {
            "enabled": bool(policy.get("projectDefaultWorkflows")),
            "tools": tools,
            "skills": {"codex": [], "claudeCode": []},
            "workflows": require_array(
                policy.get("projectDefaultWorkflows"),
                "scopePolicy.projectDefaultWorkflows",
                [],
            ),
            "createTargets": False,
            "mode": "merge",
        },
        "projectTargets": [],
        "discovery": {
            "roots": require_array(config.get("projectRoots"), "projectRoots", []),
            "maxDepth": require_int(discovery.get("maxDepth"), "projectDiscovery.maxDepth", 4),
            "excludeDirs": require_array(
                discovery.get("excludeDirs"),
                "projectDiscovery.excludeDirs",
                DEFAULT_EXCLUDES,
            ),
            "skipNestedRepos": require_bool(
                discovery.get("skipNestedRepos"),
                "projectDiscovery.skipNestedRepos",
                True,
            ),
            "rootOptions": require_root_options(
                discovery.get("rootOptions"),
                "projectDiscovery.rootOptions",
            ),
        },
        "promotionRules": {"doNotPromoteToUserSkills": project_only},
        "output": config.get("output")
        or {
            "manifestPath": ".agent-routines/generated/install.manifest.json",
            "reportPath": ".agent-routines/generated/install.plan.json",
        },
        "applySafety": {
            "unknownInstalledItems": policy.get("unknownInstalledItems") or "report-only"
        },
    }


def reject_destructive_config(config: dict[str, Any]) -> None:
    apply_safety = config.get("applySafety") or {}
    for forbidden in ("force", "pruneUnlisted", "defaultMode"):
        if forbidden in apply_safety or forbidden in config:
            raise SystemExit(f"Config v2 cannot contain destructive apply switch: {forbidden}")


def generate_plan(
    repo_root: Path,
    config_path: Path,
    config: dict[str, Any],
    args: argparse.Namespace,
    apply_mode: str,
) -> dict[str, Any]:
    available_skills = available_names(repo_root / "skills")
    available_workflows = available_names(repo_root / "workflows")
    output = config.get("output") or {}
    manifest_path = resolve_repo_relative(
        repo_root, output.get("manifestPath", ".agent-routines/generated/install.manifest.json")
    )
    report_path = resolve_repo_relative(
        repo_root, output.get("reportPath", ".agent-routines/generated/install.plan.json")
    )

    unknown_installed: list[dict[str, Any]] = []
    unclassified_installed: list[dict[str, Any]] = []
    missing_policy: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    skipped_projects: list[dict[str, Any]] = []
    scanned_user_targets: list[dict[str, Any]] = []
    scanned_project_targets: list[dict[str, Any]] = []

    desired_targets = build_desired_targets(
        repo_root,
        config,
        available_skills,
        available_workflows,
        missing_policy,
        skipped_projects,
        scanned_project_targets,
    )

    scan_unmanaged(
        config,
        desired_targets,
        available_skills,
        available_workflows,
        unknown_installed,
        unclassified_installed,
        scanned_user_targets,
        scanned_project_targets,
    )

    actions = [
        action_for_target(target, apply_mode)
        for target in desired_targets
    ]
    prune_actions = prune_actions_for_unclassified(unclassified_installed, repo_root, apply_mode)
    if prune_actions:
        prune_paths = {item["targetPath"] for item in prune_actions}
        unclassified_installed = [
            item
            for item in unclassified_installed
            if item["path"] not in prune_paths
        ]
        actions.extend(prune_actions)
    backup_items = [
        item
        for item in actions
        if item["operation"] in ("replace", "prune-candidate")
    ]
    manifest = {
        "version": 2,
        "desiredTargets": desired_targets,
        "actions": actions,
        "backupPlan": {
            "requiredFor": ["replace-listed", "sync-prune"],
            "items": backup_items,
        },
        "restorePlan": {
            "items": [
                {
                    "targetPath": item["targetPath"],
                    "backupPath": backup_path_for(item["targetPath"]),
                    "operation": "restore",
                }
                for item in backup_items
            ]
        },
        "unknownInstalledItems": unknown_installed,
        "unclassifiedInstalledItems": unclassified_installed,
        "summary": summarize_actions(actions, unknown_installed, unclassified_installed),
    }
    manifest_text = json.dumps(manifest, indent=2, ensure_ascii=False)

    commands = replay_commands(config_path, manifest_path, config, args, apply_mode)
    return {
        "schemaVersion": 2,
        "discoveredProjects": discovered_project_records(config),
        "scannedUserTargets": scanned_user_targets,
        "scannedProjectTargets": scanned_project_targets,
        "resolvedDesiredState": {"targets": desired_targets},
        "generatedManifest": manifest,
        "manifestDigest": hashlib.sha256(manifest_text.encode("utf-8")).hexdigest(),
        "unknownInstalledItems": unknown_installed,
        "unclassifiedInstalledItems": unclassified_installed,
        "missingPolicyItems": missing_policy,
        "conflicts": conflicts,
        "skippedProjects": skipped_projects,
        "installPlan": {
            "dryRun": apply_mode == "dry-run" or not args.write_manifest,
            "writeManifest": bool(args.write_manifest),
            "apply": bool(args.apply),
            "applyMode": apply_mode,
            "manifestPath": str(manifest_path),
            "reportPath": str(report_path),
            "tools": active_tools(config),
            "validateBeforeInstall": True,
            "verifyAfterInstall": True,
        },
        "commandsToRun": commands,
    }


def build_desired_targets(
    repo_root: Path,
    config: dict[str, Any],
    available_skills: set[str],
    available_workflows: set[str],
    missing_policy: list[dict[str, Any]],
    skipped_projects: list[dict[str, Any]],
    scanned_project_targets: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    targets: list[dict[str, Any]] = []
    user = config.get("userTargets") or {}
    if user.get("enabled"):
        for tool in user.get("tools") or []:
            for skill in (user.get("skills") or {}).get(tool) or []:
                add_target(
                    targets,
                    repo_root,
                    "user",
                    tool,
                    "skill",
                    skill,
                    "",
                    True,
                    available_skills,
                    missing_policy,
                    "userTargets.skills",
                )
        for workflow in user.get("workflows") or []:
            add_target(
                targets,
                repo_root,
                "user",
                "shared",
                "workflow",
                workflow,
                "",
                True,
                available_workflows,
                missing_policy,
                "userTargets.workflows",
            )

    project_configs = resolved_project_configs(config, skipped_projects)
    for project in project_configs:
        if not project.get("enabled"):
            continue
        project_path = str(resolve_project_path(project["path"]))
        for root in project_target_roots(project_path, project.get("tools") or []):
            scanned_project_targets.append(
                {
                    "projectPath": project_path,
                    "tool": root["tool"],
                    "kind": root["kind"],
                    "path": root["root"],
                    "exists": os.path.isdir(root["root"]),
                }
            )
        for tool in project.get("tools") or []:
            for skill in (project.get("skills") or {}).get(tool) or []:
                add_target(
                    targets,
                    repo_root,
                    "project",
                    tool,
                    "skill",
                    skill,
                    project_path,
                    bool(project.get("createTargets")),
                    available_skills,
                    missing_policy,
                    "projectTargets.skills",
                )
        for workflow in project.get("workflows") or []:
            add_target(
                targets,
                repo_root,
                "project",
                "shared",
                "workflow",
                workflow,
                project_path,
                bool(project.get("createTargets")),
                available_workflows,
                missing_policy,
                "projectTargets.workflows",
            )
    return targets


def add_target(
    targets: list[dict[str, Any]],
    repo_root: Path,
    scope: str,
    tool: str,
    kind: str,
    name: str,
    project_path: str,
    create_targets: bool,
    available: set[str],
    missing_policy: list[dict[str, Any]],
    context: str,
) -> None:
    if not valid_name(name):
        missing_policy.append({"context": context, "kind": kind, "name": name, "reason": "invalid kebab-case name"})
        return
    if name not in available:
        missing_policy.append({"context": context, "kind": kind, "name": name, "reason": "source directory not found in this repository"})
        return
    source_path = repo_root / ("skills" if kind == "skill" else "workflows") / name
    root = target_root(scope, tool, kind, project_path)
    target_path = Path(root) / name
    target_root_exists = os.path.isdir(root)
    targets.append(
        {
            "id": f"{scope}:{project_path}:{tool}:{kind}:{name}",
            "scope": scope,
            "tool": tool,
            "kind": kind,
            "name": name,
            "projectPath": project_path,
            "sourcePath": str(source_path),
            "targetRoot": str(root),
            "targetPath": str(target_path),
            "createTargets": create_targets,
            "targetRootExists": target_root_exists,
        }
    )


def action_for_target(target: dict[str, Any], apply_mode: str) -> dict[str, Any]:
    exists = os.path.exists(target["targetPath"])
    root_exists = os.path.isdir(target["targetRoot"])
    operation = "skip"
    reason = "target already exists"
    if target["scope"] == "project" and not root_exists and not target["createTargets"]:
        operation = "skip"
        reason = "target root is missing and createTargets is false"
    elif exists and apply_mode == "replace-listed":
        operation = "replace"
        reason = "replace-listed mode replaces reviewed target"
    elif not exists:
        operation = "install"
        reason = "target is missing"
    return {
        **target,
        "operation": operation,
        "reason": reason,
        "requiresBackup": operation == "replace",
    }


def scan_unmanaged(
    config: dict[str, Any],
    desired_targets: list[dict[str, Any]],
    available_skills: set[str],
    available_workflows: set[str],
    unknown_installed: list[dict[str, Any]],
    unclassified_installed: list[dict[str, Any]],
    scanned_user_targets: list[dict[str, Any]],
    scanned_project_targets: list[dict[str, Any]],
) -> None:
    desired_paths = {target["targetPath"] for target in desired_targets}
    roots = user_target_roots(active_tools(config))
    for item in roots:
        scanned_user_targets.append({**item, "exists": os.path.isdir(item["path"])})
        scan_root(
            item["path"],
            item["scope"],
            item["tool"],
            item["kind"],
            "",
            available_skills if item["kind"] == "skill" else available_workflows,
            desired_paths,
            unknown_installed,
            unclassified_installed,
        )
    for project in resolved_project_configs(config, []):
        project_path = str(resolve_project_path(project["path"]))
        for item in project_target_roots(project_path, project.get("tools") or []):
            if not any(existing.get("path") == item["root"] for existing in scanned_project_targets):
                scanned_project_targets.append(
                    {
                        "projectPath": project_path,
                        "tool": item["tool"],
                        "kind": item["kind"],
                        "path": item["root"],
                        "exists": os.path.isdir(item["root"]),
                    }
                )
            scan_root(
                item["root"],
                "project",
                item["tool"],
                item["kind"],
                project_path,
                available_skills if item["kind"] == "skill" else available_workflows,
                desired_paths,
                unknown_installed,
                unclassified_installed,
            )


def scan_root(
    root: str,
    scope: str,
    tool: str,
    kind: str,
    project_path: str,
    known_names: set[str],
    desired_paths: set[str],
    unknown_installed: list[dict[str, Any]],
    unclassified_installed: list[dict[str, Any]],
) -> None:
    if not os.path.isdir(root):
        return
    for child in sorted(Path(root).iterdir(), key=lambda item: item.name):
        if not child.is_dir():
            continue
        record = {
            "scope": scope,
            "tool": tool,
            "kind": kind,
            "name": child.name,
            "path": str(child),
            "projectPath": project_path,
        }
        if child.name not in known_names:
            unknown_installed.append({**record, "reason": "installed item is not in this source repository"})
        elif str(child) not in desired_paths:
            unclassified_installed.append({**record, "reason": "installed known item is not in desired state"})


def prune_actions_for_unclassified(
    unclassified_installed: list[dict[str, Any]],
    repo_root: Path,
    apply_mode: str,
) -> list[dict[str, Any]]:
    if apply_mode != "sync-prune":
        return []
    actions: list[dict[str, Any]] = []
    for item in unclassified_installed:
        source_path = repo_root / ("skills" if item["kind"] == "skill" else "workflows") / item["name"]
        target_path = Path(item["path"])
        actions.append(
            {
                "id": f"prune:{item['scope']}:{item.get('projectPath') or ''}:{item['tool']}:{item['kind']}:{item['name']}",
                "scope": item["scope"],
                "tool": item["tool"],
                "kind": item["kind"],
                "name": item["name"],
                "projectPath": item.get("projectPath") or "",
                "sourcePath": str(source_path),
                "targetRoot": str(target_path.parent),
                "targetPath": str(target_path),
                "createTargets": False,
                "targetRootExists": True,
                "operation": "prune-candidate",
                "reason": "sync-prune removes managed known item outside desired state",
                "requiresBackup": True,
            }
        )
    return actions


def resolved_project_configs(config: dict[str, Any], skipped_projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    defaults = config.get("projectDefaults") or {}
    projects: dict[str, dict[str, Any]] = {}
    if defaults.get("enabled"):
        discovery = config.get("discovery") or {}
        for project_path in find_git_projects(
            discovery.get("roots") or [],
            int(discovery.get("maxDepth") or 4),
            set(discovery.get("excludeDirs") or DEFAULT_EXCLUDES),
            bool(discovery.get("skipNestedRepos", True)),
        ):
            projects[str(project_path)] = {"path": str(project_path), **defaults}
    for override in config.get("projectTargets") or []:
        projects[str(resolve_project_path(override["path"]))] = dict(override)
    return sorted(projects.values(), key=lambda item: item["path"])


def discovered_project_records(config: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {
            "path": project["path"],
            "enabled": bool(project.get("enabled")),
            "tools": project.get("tools") or [],
            "createTargets": bool(project.get("createTargets")),
            "mode": project.get("mode") or "merge",
        }
        for project in resolved_project_configs(config, [])
    ]


def find_git_projects(roots: list[str], max_depth: int, exclude_dirs: set[str], skip_nested: bool) -> list[str]:
    projects: list[str] = []
    for root in roots:
        visit(resolve_project_path(root), 0, max_depth, exclude_dirs, skip_nested, projects)
    return sorted(projects)


def visit(path_value: Path, depth: int, max_depth: int, exclude_dirs: set[str], skip_nested: bool, projects: list[str]) -> None:
    if depth > max_depth or not path_value.is_dir():
        return
    if (path_value / ".git").exists():
        projects.append(str(path_value))
        if skip_nested:
            return
    try:
        children = sorted(path_value.iterdir(), key=lambda item: item.name)
    except OSError:
        return
    for child in children:
        if child.is_dir() and child.name not in exclude_dirs:
            visit(child, depth + 1, max_depth, exclude_dirs, skip_nested, projects)


def target_root(scope: str, tool: str, kind: str, project_path: str) -> str:
    if kind == "workflow":
        return str(Path.home() / ".agent-routines" / "workflows") if scope == "user" else str(Path(project_path) / ".agent-routines" / "workflows")
    if tool == "codex":
        return str(Path.home() / ".codex" / "skills") if scope == "user" else str(Path(project_path) / ".codex" / "skills")
    return str(Path.home() / ".claude" / "skills") if scope == "user" else str(Path(project_path) / ".claude" / "skills")


def user_target_roots(tools: list[str]) -> list[dict[str, Any]]:
    result = []
    for tool in tools:
        result.append({"scope": "user", "tool": tool, "kind": "skill", "path": target_root("user", tool, "skill", "")})
    result.append({"scope": "user", "tool": "shared", "kind": "workflow", "path": target_root("user", "shared", "workflow", "")})
    return result


def project_target_roots(project_path: str, tools: list[str]) -> list[dict[str, Any]]:
    result = [
        {"tool": "shared", "kind": "workflow", "root": target_root("project", "shared", "workflow", project_path)}
    ]
    for tool in tools:
        result.append({"tool": tool, "kind": "skill", "root": target_root("project", tool, "skill", project_path)})
    return result


def active_tools(config: dict[str, Any]) -> list[str]:
    tools: list[str] = []
    for block in [config.get("userTargets") or {}, config.get("projectDefaults") or {}, *(config.get("projectTargets") or [])]:
        tools.extend(block.get("tools") or [])
    return unique([tool for tool in tools if tool in TOOLS]) or ["codex"]


def replay_commands(config_path: Path, manifest_path: Path, config: dict[str, Any], args: argparse.Namespace, apply_mode: str) -> list[str]:
    ps = f'.\\tools\\generate-install-manifest.ps1 -ConfigPath "{config_path}"'
    bash = f'./tools/generate-install-manifest.sh --config-path "{config_path}"'
    if args.write_manifest:
        ps += " -WriteManifest"
        bash += " --write-manifest"
    if args.apply:
        ps += " -Apply"
        bash += " --apply"
    if apply_mode != "merge":
        ps += f" -ApplyMode {apply_mode}"
        bash += f" --mode {apply_mode}"
    commands = [ps if os.name == "nt" else bash]
    if args.write_manifest:
        commands.append(str(manifest_path))
    return commands


def summarize_actions(actions: list[dict[str, Any]], unknown: list[dict[str, Any]], unclassified: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"install": 0, "skip": 0, "replace": 0, "prune": 0, "unknown": len(unknown), "unclassified": len(unclassified)}
    for action in actions:
        operation = action["operation"]
        if operation == "prune-candidate":
            counts["prune"] += 1
        else:
            counts[operation] = counts.get(operation, 0) + 1
    return counts


def backup_path_for(target_path: str) -> str:
    digest = hashlib.sha256(target_path.encode("utf-8")).hexdigest()[:16]
    return str(Path(".agent-routines") / "generated" / "backups" / digest)


def available_names(root: Path) -> set[str]:
    if not root.is_dir():
        return set()
    return {child.name for child in root.iterdir() if child.is_dir()}


def resolve_repo_relative(repo_root: Path, value: str) -> Path:
    value_path = Path(value)
    if is_rooted(value):
        return value_path
    return repo_root / value_path


def resolve_project_path(value: str) -> Path:
    return Path(value).resolve() if not is_windows_rooted(value) else Path(value)


def is_rooted(value: str) -> bool:
    return os.path.isabs(value) or is_windows_rooted(value)


def is_windows_rooted(value: str) -> bool:
    return bool(re.match(r"^[A-Za-z]:[\\/]", value))


def require_array(value: Any, context: str, default: list[str] | None = None) -> list[str]:
    if value is None:
        return list(default or [])
    if isinstance(value, str) or not isinstance(value, list):
        raise SystemExit(f"{context} must be an array.")
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise SystemExit(f"{context} contains an invalid string.")
    return list(value)


def require_root_options(value: Any, context: str) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, str) or not isinstance(value, list):
        raise SystemExit(f"{context} must be an array.")
    return list(value)


def require_bool(value: Any, context: str, default: bool) -> bool:
    if value is None:
        return default
    if not isinstance(value, bool):
        raise SystemExit(f"{context} must be boolean when set.")
    return value


def require_int(value: Any, context: str, default: int) -> int:
    if value is None:
        return default
    if not isinstance(value, int) or value < 0:
        raise SystemExit(f"{context} must be an integer >= 0.")
    return value


def valid_name(value: str) -> bool:
    return bool(NAME_RE.match(value))


def unique(values: list[str]) -> list[str]:
    result: list[str] = []
    for value in values:
        if value not in result:
            result.append(value)
    return result


def selection_for_tools(tools: list[str], names: list[str]) -> dict[str, list[str]]:
    return {tool: list(names) if tool in tools else [] for tool in TOOLS}


if __name__ == "__main__":
    raise SystemExit(main())
