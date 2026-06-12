#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf 'Usage: ./tests/run-workflows.sh\n'
  printf 'Executes every workflow Bash entrypoint against a disposable temp repository\n'
  printf 'and validates the emitted JSON against the published output contract.\n'
  exit 0
fi

root="$(cd "$(dirname "$0")/.." && pwd -P)"

if command -v python3 >/dev/null 2>&1; then
  py="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  py="$(command -v python)"
else
  printf 'run-workflows.sh requires python3 or python.\n' >&2
  exit 1
fi

tmp="$(mktemp -d)"
scratch="$(mktemp -d)"
cleanup() { rm -rf -- "$tmp" "$scratch"; }
trap cleanup EXIT

git -C "$tmp" init -q
git -C "$tmp" config user.name "Smoke Test"
git -C "$tmp" config user.email "smoke@example.invalid"
printf '# Smoke fixture\n' > "$tmp/README.md"
mkdir -p "$tmp/docs"
printf '# Doc\n' > "$tmp/docs/index.md"
git -C "$tmp" add -A
git -C "$tmp" commit -qm "fixture"

failures=()

validate_output() {
  local name="$1"
  local payload="$2"
  local payload_file="$scratch/payload.json"
  printf '%s' "$payload" > "$payload_file"
  "$py" - "$name" "$payload_file" <<'PY'
import json
import sys

name = sys.argv[1]
with open(sys.argv[2], encoding="utf-8") as f:
    doc = json.load(f)
keys = ["ok", "workflow", "cwd", "os", "checks", "warnings", "errors"]
assert sorted(doc) == sorted(keys), f"unexpected keys: {sorted(doc)}"
assert isinstance(doc["ok"], bool), "ok must be boolean"
assert doc["workflow"] == name, f"workflow field {doc['workflow']!r} != {name!r}"
assert isinstance(doc["cwd"], str), "cwd must be string"
assert doc["os"] in ("windows", "macos", "linux", "unknown"), f"bad os {doc['os']!r}"
assert isinstance(doc["checks"], list), "checks must be array"
for check in doc["checks"]:
    assert set(check) == {"name", "ok", "details"}, f"bad check shape: {sorted(check)}"
    assert isinstance(check["name"], str) and isinstance(check["ok"], bool) and isinstance(check["details"], str)
for item in doc["warnings"]:
    assert isinstance(item, str), "warnings items must be strings"
for item in doc["errors"]:
    assert isinstance(item, str), "errors items must be strings"
PY
}

run_case() {
  local name="$1"
  local label="$2"
  local expect="$3"
  shift 3
  local script="$root/workflows/$name/$name.sh"
  local output=""
  local code=0
  output="$("$script" "$@" 2>/dev/null)" || code=$?
  if [ "$expect" = "any" ]; then
    if [ "$code" -ne 0 ] && [ "$code" -ne 1 ]; then
      failures+=("$label: unexpected exit code $code")
      return
    fi
  elif [ "$code" -ne "$expect" ]; then
    failures+=("$label: exit code $code, expected $expect")
    return
  fi
  if ! validate_output "$name" "$output" 2>/dev/null; then
    failures+=("$label: output violated the JSON contract")
  fi
}

count=0
for workflow_dir in "$root"/workflows/*/; do
  name="$(basename "$workflow_dir")"
  run_case "$name" "$name" any --path "$tmp"
  count=$((count + 1))
done

run_case "db-read" "db-read readonly SQL accepted" 0 --path "$tmp" --sql "SELECT 1"
run_case "db-read" "db-read write SQL rejected" 1 --path "$tmp" --sql "DROP TABLE users"
run_case "gate-check" "gate-check destructive custom command rejected" 1 --path "$tmp" --custom-command "rm -rf /"
run_case "gate-check" "gate-check readonly custom command accepted" 0 --path "$tmp" --custom-command "git status --short"

if [ "${#failures[@]}" -gt 0 ]; then
  printf '%s\n' "${failures[@]}" >&2
  exit 1
fi
printf 'run-workflows: ok (%s workflows executed, 4 targeted cases)\n' "$count"
