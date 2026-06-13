#!/usr/bin/env bash
set -euo pipefail

workflow="release-check"
path="."
public=false

usage() {
  printf 'Usage: %s [--path PATH] [--public]\n' "$0"
  printf 'Produces stable JSON and performs only readonly checks.\n'
  printf 'Use --public to require public release support and security disclosure files.\n'
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
    --path) require_value "$@"; path="$2"; shift 2 ;;
    --public) public=true; shift ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 2 ;;
  esac
done

json_escape() { local value="$1"; value="${value//\\/\\\\}"; value="${value//\"/\\\"}"; value="${value//$'\n'/\\n}"; value="${value//$'\r'/\\r}"; value="${value//$'\t'/\\t}"; value="${value//$'\b'/\\b}"; value="${value//$'\f'/\\f}"; printf '%s' "$value" | tr -d '\000-\010\013\014\016-\037\177'; }
checks=""
warnings=""
errors=""
append_obj() { local var_name="$1"; local obj="$2"; local current="${!var_name:-}"; if [ -z "$current" ]; then printf -v "$var_name" '%s' "$obj"; else printf -v "$var_name" '%s,%s' "$current" "$obj"; fi; }
add_check() { append_obj checks "{\"name\":\"$(json_escape "$1")\",\"ok\":$2,\"details\":\"$(json_escape "$3")\"}"; }
add_warning() { append_obj warnings "\"$(json_escape "$1")\""; }
add_error() { append_obj errors "\"$(json_escape "$1")\""; }
detect_os() { case "$(uname -s 2>/dev/null || printf unknown)" in MINGW*|MSYS*|CYGWIN*) printf 'windows' ;; Darwin*) printf 'macos' ;; Linux*) printf 'linux' ;; *) printf 'unknown' ;; esac; }

if [ -d "$path" ]; then cwd="$(cd "$path" && pwd -P)"; cd "$path"; else cwd="$path"; add_error "Path does not exist: $path"; fi
for item in README.md README.zh-CN.md LICENSE CHANGELOG.md SECURITY.md SUPPORT.md package.json pyproject.toml .github/workflows; do
  if [ -e "$item" ]; then
    add_check "release-path:$item" true "Release surface path probe."
  else
    add_check "release-path:$item" false "Release surface path probe."
    if [ "$public" = true ]; then
      case "$item" in
        SECURITY.md|SUPPORT.md) add_error "Public release requires $item." ;;
      esac
    fi
  fi
done
for command_name in node npm pnpm python python3 git; do
  if command -v "$command_name" >/dev/null 2>&1; then add_check "command:$command_name" true "$(command -v "$command_name")"; else add_check "command:$command_name" false "Command not found."; fi
done
if [ -f package.json ]; then
  if command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
    py="$(command -v python3 2>/dev/null || command -v python)"
    pkg_info="$("$py" - "$PWD/package.json" <<'PY' 2>/dev/null || true
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)
print("name=" + str(bool(data.get("name"))))
print("version=" + str(bool(data.get("version"))))
print("files=" + str("files" in data))
PY
)"
    if [ -n "$pkg_info" ]; then
      printf '%s\n' "$pkg_info" | grep -qx 'name=True' && add_check "package-name" true "package.json name is declared." || add_check "package-name" false "package.json name is missing."
      printf '%s\n' "$pkg_info" | grep -qx 'version=True' && add_check "package-version" true "package.json version is declared." || add_check "package-version" false "package.json version is missing."
      printf '%s\n' "$pkg_info" | grep -qx 'files=True' && add_check "package-files-field" true "package.json files field is declared." || add_check "package-files-field" false "package.json files field is not declared."
    fi
  else
    add_warning "No Python runtime found to inspect package.json fields."
  fi
fi
if [ -f pyproject.toml ]; then
  grep -Eq '^\[project\]' pyproject.toml && add_check "pyproject-project-table" true "pyproject.toml [project] table probe." || add_check "pyproject-project-table" false "pyproject.toml [project] table probe."
  grep -Eq '^\[build-system\]' pyproject.toml && add_check "pyproject-build-system" true "pyproject.toml [build-system] table probe." || add_check "pyproject-build-system" false "pyproject.toml [build-system] table probe."
fi
if [ ! -f package.json ] && [ ! -f pyproject.toml ]; then add_warning "No package.json or pyproject.toml was found; release ecosystem could not be inferred."; fi
add_warning "This workflow does not publish, tag, push, mutate versions, install dependencies, or create release artifacts."

ok=true
[ -n "$errors" ] && ok=false
printf '{\n  "ok": %s,\n  "workflow": "%s",\n  "cwd": "%s",\n  "os": "%s",\n  "checks": [%s],\n  "warnings": [%s],\n  "errors": [%s]\n}\n' "$ok" "$(json_escape "$workflow")" "$(json_escape "$cwd")" "$(detect_os)" "$checks" "$warnings" "$errors"
[ "$ok" = true ] || exit 1
