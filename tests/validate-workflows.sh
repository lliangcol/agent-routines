#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf 'Usage: ./tests/validate-workflows.sh\n'
  exit 0
fi
root="$(cd "$(dirname "$0")/.." && pwd -P)"
workflow_root="$root/workflows"
errors=()
for workflow_dir in "$workflow_root"/*; do
  [ -d "$workflow_dir" ] || continue
  name="$(basename "$workflow_dir")"
  for item in "README.md" "$name.ps1" "$name.sh" "schema.json" "examples/sample-output.json"; do
    [ -e "$workflow_dir/$item" ] || errors+=("Missing workflow file: $name/$item")
  done
  sample="$workflow_dir/examples/sample-output.json"
  if [ -f "$sample" ]; then
    if command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
      py="$(command -v python3 2>/dev/null || command -v python)"
      "$py" - "$sample" "$name" <<'PY' || errors+=("Invalid sample JSON or missing required property: $name")
import json
import sys

sample_path, workflow_name = sys.argv[1], sys.argv[2]
with open(sample_path, encoding="utf-8") as f:
    doc = json.load(f)
missing = [key for key in ("ok", "workflow", "cwd", "os", "checks", "warnings", "errors") if key not in doc]
if missing:
    sys.stderr.write(f"{workflow_name}: missing properties: {', '.join(missing)}\n")
    raise SystemExit(1)
PY
    elif command -v node >/dev/null 2>&1; then
      node -e "const doc = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); for (const key of ['ok','workflow','cwd','os','checks','warnings','errors']) if (!(key in doc)) process.exit(1);" "$sample" || errors+=("Invalid sample JSON or missing required property: $name")
    elif command -v jq >/dev/null 2>&1; then
      jq -e 'has("ok") and has("workflow") and has("cwd") and has("os") and has("checks") and has("warnings") and has("errors")' "$sample" >/dev/null || errors+=("Invalid sample JSON or missing required property: $name")
    else
      printf 'validate-workflows: warning: no JSON parser found; skipped sample parse for %s\n' "$name" >&2
    fi
  fi
done
if [ "${#errors[@]}" -gt 0 ]; then
  printf '%s\n' "${errors[@]}" >&2
  exit 1
fi
count="$(find "$workflow_root" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
printf 'validate-workflows: ok (%s workflows checked)\n' "$count"
