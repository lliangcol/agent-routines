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
    config = json.load(f)

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


if config.get("version") != 1:
    errors.append("Install discovery config version must be 1.")

tools = config.get("tools")
string_array(tools, "tools", require_non_empty=True)
if isinstance(tools, list):
    for tool in tools:
        if tool not in ("codex", "claudeCode"):
            errors.append(f"Unsupported tool: {tool}")

string_array(config.get("projectRoots"), "projectRoots")

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
