# security-review Checklist

Find sensitive material before it crosses a public boundary — without printing the sensitive values into the very transcript/report the review produces.

## 1. Define the Boundary First

Name exactly what is about to become visible, because it determines the scan surface:

| Boundary | Surface to scan |
|---|---|
| Commit | `git diff --staged` plus untracked files about to be added |
| Push / PR | `merge-base..HEAD` — every commit, not just the final tree (a secret added then removed in a later commit still ships in history) |
| Package release | The dry-run packed file list (`npm pack --dry-run` etc.) — not the repo tree; include/exclude rules decide what actually leaks |
| Repo going public | Entire history: all refs, tags, and reachable blobs |

Scanning the wrong surface is the classic miss: the working tree is clean but commit 3 of 7 contains the key.

## 2. Run the Mechanical Scan First

Run security-check (and any repo-configured scanner) before manual review; manual reading covers what patterns cannot — context-dependent leaks like internal hostnames, customer names, private architecture details, brand/codename leakage.

## 3. Never Print the Value

The review output (and your own terminal commands) must not echo candidate secrets:

```bash
git grep -lE 'BEGIN (RSA|EC|OPENSSH) PRIVATE KEY'      # -l: file names only
git grep -cE 'AKIA[0-9A-Z]{16}' -- .                   # counts, not matches
```

Report **type, path, line number, confidence** — never the matched string. If a value was already printed by accident (yours or in scrollback), treat the value as exposed and say so; remind the user that rotation is the remedy for any real secret that reached a transcript.

## 4. Classify Findings

- **Secret-like values**: keys, tokens, passwords, connection strings, private keys. High-confidence formats (AWS `AKIA…`, PEM blocks, GitHub `ghp_…`) are blockers; generic entropy hits are manual-review items.
- **Private paths/infrastructure**: internal hostnames, IPs, VPN endpoints, employee usernames in paths (`C:\Users\<name>\...` in committed configs or docs).
- **Brand/identity leakage**: internal project codenames, unannounced product names, client names — relevant when the boundary is public release.
- **Package leakage**: files in the release artifact that should not be (`.env`, dumps, test fixtures with real data) — verify against the include/exclude rules (`files` field, `.npmignore`, MANIFEST) rather than assuming.

## 5. Confidence Discipline

Two sections, never merged: **high-confidence blockers** (format-matched secrets, PEM blocks, env files with real-looking values) stop the boundary crossing until resolved; **low-confidence manual-review items** (entropy strings, the word "password" in a test, sample/dummy keys) are listed for a human pass. Marking everything high drowns the real key; marking everything low ships it. For sample/test values, the deciding evidence is provenance: a value documented as a published test fixture (e.g., a vendor's documented test key) is low; an undocumented realistic value is high until proven otherwise.

## 6. Remediation Is Gated

Recommend the minimum fix; execute none of it without confirmation: removing files, rewriting history (`filter-repo` — coordinate with every fork/clone), rotating credentials, changing package contents. For an already-pushed secret, rotation is mandatory regardless of history rewriting — the value must be treated as compromised from the moment it left the machine. Approving a release *with* unresolved sensitive findings is itself a gated human decision to record, not a default.

## Failure Cases

- Symptom: clean staged diff, but the PR still leaks a key. Cause: boundary error — the key lives in an earlier commit of the branch. Correct response: scan `merge-base..HEAD` history (`git log -p` piped to the pattern scan with `-l`-style reporting).
- Symptom: scanner flags 200 findings in vendored/lockfile content. Correct response: classify by path before triaging individually — vendored hashes are noise; but do not blanket-exclude directories without sampling them once.
- Symptom: a real secret is found in a file the user says is "only local". Correct response: verify with `git ls-files` / `git log --all -- <path>` whether it was ever tracked; "untracked today" does not mean "never committed".
