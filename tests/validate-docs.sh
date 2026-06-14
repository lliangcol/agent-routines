#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf 'Usage: ./tests/validate-docs.sh\n'
  printf 'Checks bilingual doc pairing in docs/, catalog consistency, and examples coverage.\n'
  exit 0
fi
root="$(cd "$(dirname "$0")/.." && pwd -P)"
errors=()

for f in "$root"/docs/*.md; do
  base="$(basename "$f")"
  case "$base" in
    *.zh-CN.md)
      en="${base%.zh-CN.md}.md"
      [ -f "$root/docs/$en" ] || errors+=("Missing English counterpart for docs/$base")
      ;;
    *.md)
      zh="${base%.md}.zh-CN.md"
      [ -f "$root/docs/$zh" ] || errors+=("Missing zh-CN counterpart for docs/$base")
      ;;
  esac
done

stale_phrases=(
  "Force Apply"
  "FORCE APPLY"
  "Plan JSON remains editable"
  "Inventory > 2 Targets"
  "Inventory, Targets, Policy"
  "Current Electron App discovery behavior"
  "generated project blocks"
  "current source repo"
)
for f in "$root"/docs/*.md; do
  base="$(basename "$f")"
  for phrase in "${stale_phrases[@]}"; do
    if grep -Fq "$phrase" "$f"; then
      errors+=("Stale doc phrase in docs/$base: $phrase")
    fi
  done
done

if command -v python3 >/dev/null 2>&1; then
  py="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  py="$(command -v python)"
else
  printf 'validate-docs.sh requires python3 or python.\n' >&2
  exit 1
fi

catalog_ok=true
"$py" - "$root" <<'PY' || catalog_ok=false
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
errors = []

rec = {}
for skill_md in sorted((root / "skills").glob("*/SKILL.md")):
    skill = skill_md.parent.name
    text = skill_md.read_text(encoding="utf-8")
    m = re.search(r"^Recommended workflows:\s*(.+)$", text, re.M)
    value = m.group(1).strip() if m else ""
    if not value or value.lower().startswith("none"):
        rec[skill] = []
    else:
        rec[skill] = [w.strip() for w in value.split(",") if w.strip()]

workflows = sorted(p.name for p in (root / "workflows").iterdir() if p.is_dir())
reverse = {w: sorted(s for s, ws in rec.items() if w in ws) for w in workflows}

for skill, ws in sorted(rec.items()):
    for w in ws:
        if w not in workflows:
            errors.append(f"skills/{skill}/SKILL.md recommends unknown workflow: {w}")


def fmt(names):
    return ", ".join(f"`{n}`" for n in names)


for catalog, none_skill_cell, none_wf_cell in [
    ("docs/catalog.md", "None required", "None"),
    ("docs/catalog.zh-CN.md", "无需 workflow", "无"),
]:
    path = root / catalog
    if not path.is_file():
        errors.append(f"Missing catalog file: {catalog}")
        continue
    section = None
    seen_skills = set()
    seen_workflows = set()
    for line in path.read_text(encoding="utf-8").split("\n"):
        if line.startswith("## "):
            if "Workflows" in line:
                section = "workflows"
            elif "Skills" in line:
                section = "skills"
            else:
                section = None
            continue
        if not line.startswith("| `"):
            continue
        cells = line.split("|")
        name = cells[1].strip().strip("`")
        if section == "skills":
            if name not in rec:
                errors.append(f"{catalog}: skills table row for unknown skill: {name}")
                continue
            seen_skills.add(name)
            expected = fmt(rec[name]) if rec[name] else none_skill_cell
            actual = cells[3].strip()
            if actual != expected:
                errors.append(
                    f"{catalog}: skill {name} recommended-workflows column is {actual!r}, expected {expected!r}"
                )
        elif section == "workflows":
            if name not in reverse:
                errors.append(f"{catalog}: workflows table row for unknown workflow: {name}")
                continue
            seen_workflows.add(name)
            expected = fmt(reverse[name]) if reverse[name] else none_wf_cell
            actual = cells[5].strip()
            if actual != expected:
                errors.append(
                    f"{catalog}: workflow {name} matching-skills column is {actual!r}, expected {expected!r}"
                )
    for skill in sorted(set(rec) - seen_skills):
        errors.append(f"{catalog}: missing skills table row: {skill}")
    for workflow in sorted(set(workflows) - seen_workflows):
        errors.append(f"{catalog}: missing workflows table row: {workflow}")

for example_file in ["docs/examples.md", "docs/examples.zh-CN.md"]:
    path = root / example_file
    if not path.is_file():
        errors.append(f"Missing examples file: {example_file}")
        continue
    section = None
    seen_skills = set()
    seen_workflows = set()
    for line in path.read_text(encoding="utf-8").split("\n"):
        if line.startswith("## "):
            if "Workflow" in line:
                section = "workflows"
            elif "Skill" in line:
                section = "skills"
            else:
                section = None
            continue
        if not line.startswith("| `"):
            continue
        cells = line.split("|")
        name = cells[1].strip().strip("`")
        if section == "skills":
            if name not in rec:
                errors.append(f"{example_file}: skill example row for unknown skill: {name}")
                continue
            seen_skills.add(name)
        elif section == "workflows":
            if name not in workflows:
                errors.append(f"{example_file}: workflow example row for unknown workflow: {name}")
                continue
            seen_workflows.add(name)
            expected_ps = f".\\workflows\\{name}\\{name}.ps1 -Path ."
            expected_sh = f"./workflows/{name}/{name}.sh --path ."
            actual_ps = cells[2].strip().strip("`")
            actual_sh = cells[3].strip().strip("`")
            if actual_ps != expected_ps:
                errors.append(
                    f"{example_file}: workflow {name} PowerShell example is {actual_ps!r}, expected {expected_ps!r}"
                )
            if actual_sh != expected_sh:
                errors.append(
                    f"{example_file}: workflow {name} Bash example is {actual_sh!r}, expected {expected_sh!r}"
                )
    for skill in sorted(set(rec) - seen_skills):
        errors.append(f"{example_file}: missing skill example row: {skill}")
    for workflow in sorted(set(workflows) - seen_workflows):
        errors.append(f"{example_file}: missing workflow example row: {workflow}")

if errors:
    sys.stderr.write("\n".join(errors) + "\n")
    raise SystemExit(1)
PY

if [ "${#errors[@]}" -gt 0 ]; then
  printf '%s\n' "${errors[@]}" >&2
fi
if [ "${#errors[@]}" -gt 0 ] || [ "$catalog_ok" != true ]; then
  exit 1
fi
printf 'validate-docs: ok (bilingual pairing, catalog consistency, and examples coverage)\n'
