#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf 'Usage: ./tests/validate-skills.sh\n'
  exit 0
fi
root="$(cd "$(dirname "$0")/.." && pwd -P)"
skill_root="$root/skills"
errors=()
for skill_dir in "$skill_root"/*; do
  [ -d "$skill_dir" ] || continue
  skill="$(basename "$skill_dir")"
  skill_md="$skill_dir/SKILL.md"
  readme="$skill_dir/README.md"
  readme_zh="$skill_dir/README.zh-CN.md"
  [ -f "$skill_md" ] || { errors+=("Missing SKILL.md: $skill"); continue; }
  [ -f "$readme" ] || errors+=("Missing README.md: $skill")
  [ -f "$readme_zh" ] || errors+=("Missing README.zh-CN.md: $skill")
  head -n 1 "$skill_md" | grep -qx -- '---' || errors+=("Missing YAML frontmatter: $skill")
  name="$(grep -E '^name:[[:space:]]*[a-z0-9-]+[[:space:]]*$' "$skill_md" | head -n 1 | sed -E 's/^name:[[:space:]]*//; s/[[:space:]]*$//')"
  description="$(grep -E '^description:[[:space:]]*.+' "$skill_md" | head -n 1 | sed -E 's/^description:[[:space:]]*//')"
  [ -n "$name" ] || errors+=("Missing name: $skill")
  printf '%s' "$name" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$' || errors+=("Invalid kebab-case name: $name")
  printf '%s' "$name" | grep -Eq '(claude|anthropic|<|>|[[:space:]]|[A-Z])' && errors+=("Forbidden token in name: $name")
  [ -n "$description" ] || errors+=("Missing description: $skill")
  [ "${#description}" -le 1024 ] || errors+=("Description too long: $skill")
  grep -Eq '^os:[[:space:]]*cross-platform[[:space:]]*$' "$skill_md" || errors+=("Missing os: cross-platform: $skill")
done
if [ "${#errors[@]}" -gt 0 ]; then
  printf '%s\n' "${errors[@]}" >&2
  exit 1
fi
count="$(find "$skill_root" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
printf 'validate-skills: ok (%s skills checked)\n' "$count"
