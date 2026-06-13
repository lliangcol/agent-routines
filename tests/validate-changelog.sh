#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  printf 'Usage: ./tests/validate-changelog.sh\n'
  printf 'Checks that CHANGELOG.md version headings and vX.Y.Z git tags stay consistent.\n'
  printf 'The newest CHANGELOG entry may be untagged (release pending); every older entry\n'
  printf 'must have a matching tag, and every vX.Y.Z tag must have a CHANGELOG entry.\n'
  exit 0
fi
root="$(cd "$(dirname "$0")/.." && pwd -P)"
changelog="$root/CHANGELOG.md"
errors=()

if [ ! -f "$changelog" ]; then
  printf 'CHANGELOG.md not found at %s\n' "$changelog" >&2
  exit 1
fi

versions=()
while IFS= read -r line; do
  case "$line" in
    '## '*)
      if printf '%s' "$line" | grep -Eq '^## [0-9]+\.[0-9]+\.[0-9]+ - [0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
        version="$(printf '%s' "$line" | sed -E 's/^## ([0-9]+\.[0-9]+\.[0-9]+) - .*$/\1/')"
        for seen in ${versions[@]+"${versions[@]}"}; do
          if [ "$seen" = "$version" ]; then
            errors+=("Duplicate CHANGELOG version heading: $version")
          fi
        done
        versions+=("$version")
      else
        errors+=("Malformed CHANGELOG heading (expected '## X.Y.Z - YYYY-MM-DD'): $line")
      fi
      ;;
  esac
done < "$changelog"

if [ "${#versions[@]}" -eq 0 ]; then
  errors+=("CHANGELOG.md contains no version headings.")
fi

tag_count=0
if ! command -v git >/dev/null 2>&1; then
  printf 'validate-changelog: warning: git not available; skipped tag consistency check.\n'
elif ! git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  printf 'validate-changelog: warning: not a git work tree; skipped tag consistency check.\n'
else
  tags=()
  while IFS= read -r tag; do
    [ -n "$tag" ] || continue
    tags+=("$tag")
  done < <(git -C "$root" tag -l 'v[0-9]*')
  tag_count="${#tags[@]}"

  index=0
  for version in ${versions[@]+"${versions[@]}"}; do
    found=false
    for tag in ${tags[@]+"${tags[@]}"}; do
      if [ "$tag" = "v$version" ]; then found=true; fi
    done
    if [ "$found" != true ] && [ "$index" -ne 0 ]; then
      errors+=("CHANGELOG version $version has no matching git tag v$version")
    fi
    index=$((index + 1))
  done

  for tag in ${tags[@]+"${tags[@]}"}; do
    if ! printf '%s' "$tag" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
      errors+=("Tag $tag does not follow the vX.Y.Z format")
      continue
    fi
    version="${tag#v}"
    found=false
    for seen in ${versions[@]+"${versions[@]}"}; do
      if [ "$seen" = "$version" ]; then found=true; fi
    done
    if [ "$found" != true ]; then
      errors+=("Git tag $tag has no matching CHANGELOG version heading $version")
    fi
  done
fi

if [ "${#errors[@]}" -gt 0 ]; then
  printf '%s\n' "${errors[@]}" >&2
  exit 1
fi
printf 'validate-changelog: ok (%s versions, %s tags checked)\n' "${#versions[@]}" "$tag_count"
