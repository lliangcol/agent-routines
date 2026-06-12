# Node Workspace Release Checklist

Validate a workspace release with the repo's own tooling and dry-runs; the only commands that need authorization are the ones that mutate a registry or the dependency tree.

## 1. Identify the Package Manager — Then Obey It

```bash
cat package.json | grep -E '"packageManager"|"workspaces"'
ls pnpm-workspace.yaml pnpm-lock.yaml package-lock.json yarn.lock 2>/dev/null
```

- `packageManager` field (e.g., `"pnpm@9.1.0"`) is authoritative; run it via `corepack` rather than whatever is globally installed. Mixing managers corrupts lockfiles silently — an `npm install` in a pnpm workspace produces a `package-lock.json` that must not be committed.
- Lockfile present without `packageManager` → the lockfile type decides. Two lockfile types present → report as a repo defect before doing anything.

## 2. Map the Workspace and Release Surface

```bash
pnpm ls -r --depth -1            # or: npm query .workspace
grep -l '"private": true' packages/*/package.json   # excluded from publish
```

For each publishable package record: name, current version, `publishConfig` (registry/access), and whether `files`/`.npmignore` bound the tarball. Scoped packages default to restricted access — a missing `"access": "public"` is a common first-publish failure.

## 3. Run the Repo's Own Gates First

Inspect `scripts` for `doctor`, `validate`, `test`, `lint`, `check`, `prepublishOnly` and run what exists. Repo-defined gates outrank generic ones — they encode requirements you cannot infer. Only fall back to generic checks (typecheck, test) when the repo defines none.

## 4. Dry-Run the Publish

```bash
npm pack --dry-run                      # exact tarball file list
npm publish --dry-run                   # full publish rehearsal, no upload
pnpm publish -r --dry-run --no-git-checks=false
npm view <pkg> versions --json          # is the target version already taken?
```

Read the `npm pack` file list line by line: missing `dist/` means the build didn't run or `files` is wrong; presence of `.env`, test fixtures, or source maps with secrets is a release blocker. A version already on the registry cannot be republished — ever (even after unpublish); the version bump must precede the real publish.

## 5. Generated Marketplace/Catalog Files Are Outputs

Files like marketplace manifests or generated catalogs derive from source metadata. Before trusting them: identify the generator, regenerate, and `git diff --exit-code` the result. A stale generated file ships stale metadata even when every test passes. Hand-editing the output instead of the source is the same drift trap as any generated artifact.

## 6. Authorization Boundaries

- Readonly + dry-run: everything above — no authorization needed.
- Gated, each occurrence: `npm/pnpm publish` (real), `npm version`/version field mutation, dependency installation that changes lockfiles, registry/auth config changes, marketplace publication, git tags.
- Report every skipped gated action explicitly: "publish not run; after approval the exact command is `pnpm publish -r --access public`."

## Failure Cases

- Symptom: `npm publish --dry-run` shows a tarball missing the built output. Wrong response: add files manually to the tarball. Correct response: the `prepublishOnly`/build chain or the `files` field is broken — fix the source of the file list.
- Symptom: publish fails with 402/403 on a scoped package. Cause: restricted default access or missing org permission — config/auth issue, not code; report which.
- Symptom: workspace package depends on a sibling via `workspace:*` and the dry-run tarball keeps that literal range. Cause: publishing with the wrong tool — `pnpm publish` rewrites `workspace:` protocols, raw `npm publish` does not. Use the manager the repo declares.
- Symptom: CI publish works, local dry-run fails on auth. Correct response: that is expected when tokens live only in CI; validate everything except auth locally and say so — do not copy registry tokens to the local machine.
