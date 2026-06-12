# release-guard Checklist

Prove release readiness with local evidence and dry-runs, keep local proof strictly separate from registry/GitHub proof, and let only blockers block.

## 1. Identify the Ecosystem and Source of Truth

Detect the release surface from the repo: `package.json` (npm), `pyproject.toml` (PyPI), `Cargo.toml` (crates.io), `*.csproj` (NuGet), a `Formula/` (Homebrew), container images, or plain GitHub Releases. Then find where the version lives authoritatively — manifest field, git tag, changelog heading, or a version file — and verify all of them agree:

```bash
grep '"version"' package.json
git tag --list 'v*' | tail -3
head -20 CHANGELOG.md
```

Version skew between these is a blocker: consumers see the tag, tooling sees the manifest.

## 2. Documentation Surface

Check existence AND currency — a stale README ships misinformation with authority:

- README: install command matches the actual package name/manager; quick-start commands actually exist in this version.
- LICENSE: present, and consistent with the manifest's `license` field.
- CHANGELOG: has an entry for the version being released, dated, covering the actual diff since the last tag (`git log <last-tag>..HEAD --oneline` as the cross-check).
- Security/support notes if the project claims a policy.

## 3. Package Contents

Dry-run the packing and read the file list line by line:

```bash
npm pack --dry-run                  # npm
python -m build && tar tzf dist/*.tar.gz   # PyPI sdist
cargo package --list                # crates.io
```

Two failure directions, both blockers: missing files (no built artifacts, missing LICENSE in the tarball) and leaked files (`.env`, internal docs, test credentials, `.git` directories). The security-check workflow covers secret patterns; the file list review covers everything else.

## 4. Local Validation vs External Proof

Keep the two ledgers separate in the report:

- **Local**: tests/lint pass, dry-run pack clean, metadata complete, docs current. Provable this session.
- **External**: version available on the registry (`npm view <pkg> versions`), auth/permissions valid, tag pushed, GitHub Release created, CI release pipeline green. Requires network/credentials — when unavailable, list as *unproven*, never as passed.

"Release ready" claimed from local checks alone while external proof is missing is the report defect this skill exists to prevent.

## 5. Blockers vs Warnings

- **Blockers** (do not publish): secret/credential in package contents, version already on registry, license missing or contradictory, packed artifacts missing, failing tests.
- **Warnings** (publish is possible, note them): stale changelog wording, missing optional metadata (`repository`, `keywords`), docs gaps, large tarball.

Report them in separate sections — a wall of mixed findings gets the real blocker skimmed past.

## 6. Publication Gates

Everything above is readonly/dry-run and needs no authorization. Gated, each occurrence: real publish, `git tag` + push, version field mutation, registry config changes, GitHub Release creation, dependency installation. Missing release tooling is a readiness gap to report — not permission to install it.

## Failure Cases

- Symptom: dry-run pack succeeds but the published package would be broken (entry point references a file not in the list). Correct response: cross-check `main`/`exports`/`bin` targets against the dry-run file list explicitly; packing tools do not validate entry points.
- Symptom: everything local passes; registry check impossible (offline). Wrong response: "ready to publish". Correct response: "locally ready; external proof pending: version availability, auth" — with the exact commands the human runs.
- Symptom: the previous tag was never published (failed release). Correct response: report the gap between tag history and registry history before choosing the next version; do not assume the changelog's last entry shipped.
