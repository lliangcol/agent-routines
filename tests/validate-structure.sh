#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf 'Usage: ./tests/validate-structure.sh\n'
  printf 'Checks that every path listed in tests/required-paths.txt exists.\n'
  exit 0
fi
root="$(cd "$(dirname "$0")/.." && pwd -P)"
list="$root/tests/required-paths.txt"
if [ ! -f "$list" ]; then
  printf 'Required path list not found: %s\n' "$list" >&2
  exit 1
fi
missing=()
count=0
while IFS= read -r item || [ -n "$item" ]; do
  item="${item%$'\r'}"
  case "$item" in ''|'#'*) continue ;; esac
  count=$((count + 1))
  [ -e "$root/$item" ] || missing+=("$item")
done < "$list"
if [ "${#missing[@]}" -gt 0 ]; then
  printf 'Missing required paths:\n' >&2
  printf '%s\n' "${missing[@]}" >&2
  exit 1
fi
printf 'validate-structure: ok (%s paths checked)\n' "$count"
