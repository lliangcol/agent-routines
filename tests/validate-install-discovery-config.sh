#!/usr/bin/env bash
set -euo pipefail

config_path=""

usage() {
  printf 'Usage: ./tests/validate-install-discovery-config.sh --config-path PATH\n'
  printf 'Validates install discovery config shape without scanning or installing.\n'
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
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

if [ -z "$config_path" ]; then
  printf 'Missing required --config-path.\n' >&2
  exit 2
fi
if [ ! -f "$config_path" ]; then
  printf 'Config not found: %s\n' "$config_path" >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  py="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  py="$(command -v python)"
else
  printf 'validate-install-discovery-config.sh requires python3 or python.\n' >&2
  exit 1
fi

"$py" - "$config_path" <<'PY'
import json
import re
import sys

config_path = sys.argv[1]
with open(config_path, "r", encoding="utf-8") as f:
    config_text = f.read()

try:
    config = json.loads(config_text)
except json.JSONDecodeError as exc:
    sys.stderr.write(f"Invalid JSON in install discovery config: {exc}\n")
    if re.search(r'"[A-Za-z]:\\', config_text):
        sys.stderr.write(
            'Hint: JSON Windows paths must escape backslashes, for example "D:\\\\Repositories\\\\agent-config".\n'
        )
    raise SystemExit(1)

errors = []
name_re = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def string_array(value, context, require_kebab=False, allow_missing=False, require_non_empty=False):
    if value is None:
        if not allow_missing:
            errors.append(f"{context} is required.")
        return
    if isinstance(value, str) or not isinstance(value, list):
        errors.append(f"{context} must be an array.")
        return
    if require_non_empty and not value:
        errors.append(f"{context} must include at least one value.")
        return
    seen = set()
    for item in value:
        if not isinstance(item, str) or not item.strip():
            errors.append(f"{context} contains an invalid string.")
            continue
        if item in seen:
            errors.append(f"{context} contains duplicate value: {item}")
            continue
        seen.add(item)
        if require_kebab and not name_re.match(item):
            errors.append(f"{context} contains invalid kebab-case name: {item}")


def tools(value, context):
    string_array(value.get("tools") if isinstance(value, dict) else None, f"{context}.tools", require_non_empty=True)
    for tool in (value.get("tools") if isinstance(value, dict) and isinstance(value.get("tools"), list) else []):
        if tool not in ("codex", "claudeCode"):
            errors.append(f"{context}.tools contains unsupported tool: {tool}")


def skill_selection(value, context):
    if not isinstance(value, dict):
        errors.append(f"{context} is required.")
        return
    string_array(value.get("codex"), f"{context}.codex", True)
    string_array(value.get("claudeCode"), f"{context}.claudeCode", True)


def project_target(value, context, require_path=False):
    if not isinstance(value, dict):
        errors.append(f"{context} is required.")
        return
    if require_path and (not isinstance(value.get("path"), str) or not value["path"].strip()):
        errors.append(f"{context}.path is required.")
    for name in ("enabled", "createTargets"):
        if not isinstance(value.get(name), bool):
            errors.append(f"{context}.{name} must be boolean.")
    if value.get("mode") not in ("merge", "replace-listed"):
        errors.append(f"{context}.mode must be merge or replace-listed.")
    tools(value, context)
    skill_selection(value.get("skills"), f"{context}.skills")
    string_array(value.get("workflows"), f"{context}.workflows", True)


if config.get("version") not in (1, 2):
    errors.append("Install discovery config version must be 1 or 2.")

if config.get("version") == 2:
    for forbidden in ("force", "pruneUnlisted", "defaultMode"):
        if forbidden in config:
            errors.append(f"Config v2 cannot contain destructive apply switch: {forbidden}")
    user_targets = config.get("userTargets")
    if not isinstance(user_targets, dict):
        errors.append("userTargets is required.")
    else:
        if not isinstance(user_targets.get("enabled"), bool):
            errors.append("userTargets.enabled must be boolean.")
        tools(user_targets, "userTargets")
        skill_selection(user_targets.get("skills"), "userTargets.skills")
        string_array(user_targets.get("workflows"), "userTargets.workflows", True)
    project_target(config.get("projectDefaults"), "projectDefaults")
    project_targets = config.get("projectTargets")
    if not isinstance(project_targets, list):
        errors.append("projectTargets must be an array.")
    else:
        for index, target in enumerate(project_targets):
            project_target(target, f"projectTargets[{index}]", True)
    discovery = config.get("discovery")
    if not isinstance(discovery, dict):
        errors.append("discovery is required.")
    else:
        string_array(discovery.get("roots"), "discovery.roots")
        string_array(discovery.get("excludeDirs"), "discovery.excludeDirs")
        max_depth = discovery.get("maxDepth")
        if isinstance(max_depth, bool) or not isinstance(max_depth, int) or max_depth < 0:
            errors.append("discovery.maxDepth must be an integer >= 0.")
        if not isinstance(discovery.get("skipNestedRepos"), bool):
            errors.append("discovery.skipNestedRepos must be boolean.")
    promotion_rules = config.get("promotionRules") or {}
    string_array(promotion_rules.get("doNotPromoteToUserSkills"), "promotionRules.doNotPromoteToUserSkills", True)
    apply_safety = config.get("applySafety") or {}
    if apply_safety.get("unknownInstalledItems") != "report-only":
        errors.append("applySafety.unknownInstalledItems must be report-only.")
    for forbidden in ("force", "pruneUnlisted", "defaultMode"):
        if forbidden in apply_safety:
            errors.append(f"applySafety cannot contain destructive apply switch: {forbidden}")
    output = config.get("output")
    if output is None:
        errors.append("output is required.")
    else:
        for name in ("manifestPath", "reportPath"):
            value = output.get(name)
            if not isinstance(value, str) or not value.strip():
                errors.append(f"output.{name} is required and must be a string.")
    if errors:
        sys.stderr.write("\n".join(errors) + "\n")
        raise SystemExit(1)
    raise SystemExit(0)

tools = config.get("tools")
string_array(tools, "tools", require_non_empty=True)
if isinstance(tools, list):
    for tool in tools:
        if tool not in ("codex", "claudeCode"):
            errors.append(f"Unsupported tool: {tool}")

project_roots = config.get("projectRoots")
string_array(project_roots, "projectRoots")
known_project_roots = set(project_roots or []) if isinstance(project_roots, list) else set()

discovery = config.get("projectDiscovery") or {}
if discovery:
    mode = discovery.get("mode")
    if mode is not None and mode != "git-repos":
        errors.append("projectDiscovery.mode must be git-repos when set.")
    max_depth = discovery.get("maxDepth")
    if max_depth is not None and (isinstance(max_depth, bool) or not isinstance(max_depth, int) or max_depth < 0):
        errors.append("projectDiscovery.maxDepth must be an integer >= 0.")
    string_array(discovery.get("excludeDirs"), "projectDiscovery.excludeDirs", allow_missing=True)
    skip_nested = discovery.get("skipNestedRepos")
    if skip_nested is not None and not isinstance(skip_nested, bool):
        errors.append("projectDiscovery.skipNestedRepos must be boolean when set.")
    root_options = discovery.get("rootOptions")
    if root_options is not None:
        if not isinstance(root_options, list):
            errors.append("projectDiscovery.rootOptions must be an array.")
        else:
            seen_root_options = set()
            for index, option in enumerate(root_options):
                context = f"projectDiscovery.rootOptions[{index}]"
                if not isinstance(option, dict):
                    errors.append(f"{context} must be an object.")
                    continue
                root = option.get("root")
                if not isinstance(root, str) or not root.strip():
                    errors.append(f"{context}.root contains an invalid string.")
                else:
                    if root in seen_root_options:
                        errors.append(f"projectDiscovery.rootOptions contains duplicate root: {root}")
                    seen_root_options.add(root)
                    if root not in known_project_roots:
                        errors.append(f"projectDiscovery.rootOptions references unknown project root: {root}")
                option_skip_nested = option.get("skipNestedRepos")
                if not isinstance(option_skip_nested, bool):
                    errors.append(f"{context}.skipNestedRepos must be boolean when set.")

policy = config.get("scopePolicy")
if policy is None:
    errors.append("scopePolicy is required.")
else:
    source = policy.get("desiredStateSource")
    if source is not None and source != "policy-with-installed-evidence":
        errors.append("scopePolicy.desiredStateSource must be policy-with-installed-evidence when set.")
    string_array(policy.get("userLevelSkills"), "scopePolicy.userLevelSkills", True, True)
    string_array(policy.get("projectLevelOnlySkills"), "scopePolicy.projectLevelOnlySkills", True, True)
    string_array(policy.get("userLevelWorkflows"), "scopePolicy.userLevelWorkflows", True, True)
    string_array(policy.get("projectDefaultWorkflows"), "scopePolicy.projectDefaultWorkflows", True, True)
    unknown = policy.get("unknownInstalledItems")
    if unknown is not None and unknown != "report-only":
        errors.append("scopePolicy.unknownInstalledItems must be report-only when set.")

output = config.get("output")
if output is None:
    errors.append("output is required.")
else:
    for name in ("manifestPath", "reportPath"):
        value = output.get(name)
        if not isinstance(value, str) or not value.strip():
            errors.append(f"output.{name} is required and must be a string.")

install = config.get("install") or {}
if "apply" in install:
    errors.append("install.apply is not allowed in config; use the CLI --apply flag.")
for name in ("validateBeforeInstall", "verifyAfterInstall", "force"):
    value = install.get(name)
    if value is not None and not isinstance(value, bool):
        errors.append(f"install.{name} must be boolean when set.")
if install.get("force") is True:
    errors.append("install.force cannot enable replacement from config; use the CLI --force flag.")

if errors:
    sys.stderr.write("\n".join(errors) + "\n")
    raise SystemExit(1)
PY

printf 'validate-install-discovery-config: ok\n'
