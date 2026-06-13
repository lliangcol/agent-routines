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
  schema="$workflow_dir/schema.json"
  sample="$workflow_dir/examples/sample-output.json"
  if [ -f "$schema" ] && [ -f "$sample" ]; then
    if command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
      py="$(command -v python3 2>/dev/null || command -v python)"
      "$py" - "$schema" "$sample" "$name" <<'PY' || errors+=("Invalid schema/sample JSON or contract mismatch: $name")
import json
import sys

schema_path, sample_path, workflow_name = sys.argv[1], sys.argv[2], sys.argv[3]
with open(schema_path, encoding="utf-8") as f:
    schema = json.load(f)
with open(sample_path, encoding="utf-8") as f:
    doc = json.load(f)
expected = {"ok", "workflow", "cwd", "os", "checks", "warnings", "errors"}
missing = [key for key in expected if key not in doc]
if missing:
    sys.stderr.write(f"{workflow_name}: missing properties: {', '.join(missing)}\n")
    raise SystemExit(1)
extra = sorted(set(doc) - expected)
if extra:
    sys.stderr.write(f"{workflow_name}: unexpected properties: {', '.join(extra)}\n")
    raise SystemExit(1)
if doc.get("workflow") != workflow_name:
    sys.stderr.write(f"{workflow_name}: sample workflow mismatch: {doc.get('workflow')!r}\n")
    raise SystemExit(1)
if schema.get("properties", {}).get("workflow", {}).get("const") != workflow_name:
    sys.stderr.write(f"{workflow_name}: schema workflow const mismatch\n")
    raise SystemExit(1)
if schema.get("additionalProperties") is not False:
    sys.stderr.write(f"{workflow_name}: schema top-level additionalProperties must be false\n")
    raise SystemExit(1)
PY
    elif command -v node >/dev/null 2>&1; then
      node -e "const fs=require('fs'); const schema=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); const doc=JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); const name=process.argv[3]; const keys=['ok','workflow','cwd','os','checks','warnings','errors']; if (Object.keys(doc).some(k=>!keys.includes(k))) process.exit(1); for (const key of keys) if (!(key in doc)) process.exit(1); if (doc.workflow!==name) process.exit(1); if (schema?.properties?.workflow?.const!==name) process.exit(1); if (schema.additionalProperties!==false) process.exit(1);" "$schema" "$sample" "$name" || errors+=("Invalid schema/sample JSON or contract mismatch: $name")
    elif command -v jq >/dev/null 2>&1; then
      jq -e --arg name "$name" '(.properties.workflow.const == $name) and (.additionalProperties == false)' "$schema" >/dev/null || errors+=("Invalid schema contract: $name")
      jq -e --arg name "$name" '((keys_unsorted | sort) == ["checks","cwd","errors","ok","os","warnings","workflow"]) and (.workflow == $name)' "$sample" >/dev/null || errors+=("Invalid sample JSON or contract mismatch: $name")
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
