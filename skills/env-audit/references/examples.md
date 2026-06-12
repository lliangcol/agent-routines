# Examples

Worked classifications. The recurring discipline: name the root-cause class (missing prerequisite / wrong resolution / bad config / shell mangling) before recommending anything.

## Missing cargo is a prerequisite, not a project defect

Situation: a repository's build step fails with `cargo: command not found`. The reporter files it as "the project's build script is broken".

Probe sequence:

```bash
command -v cargo rustc            # absent
cat rust-toolchain.toml 2>/dev/null   # project pins a toolchain — it expects rustup to exist
grep -ri "rustup\|cargo" README.md docs/ | head   # does the project promise to install it?
```

Classification: the project pins a toolchain version but nowhere claims to vendor or install the toolchain itself. Therefore: **environment prerequisite missing**, not a provider defect. Only if the project documents "this repo bootstraps its own toolchain" (a devcontainer, a checked-in installer the build invokes) and that bootstrap failed would this become a project bug — that is the "direct contract evidence" bar.

Report: "cargo/rustup not installed; `rust-toolchain.toml` pins 1.78. Install rustup (user action), then `cargo build` will pick up the pin automatically."

## Wrong version resolved first

Situation: `npm install` fails with engine errors although "node 20 is installed".

```bash
node -v                  # v16.20.2
command -v -a node       # ~/.nvm/versions/v16.20.2/bin/node, /usr/local/bin/node
cat .nvmrc               # 20
```

Classification: wrong resolution order, not a missing tool. Recommendation: `nvm use` per `.nvmrc` (user action). Never recommend editing `.nvmrc` to match the machine — the pin wins.

## Works in terminal, fails in IDE

Situation: tests pass in the terminal, fail inside the IDE with a missing env var.

Probe: run `printenv | sort` (or `Get-ChildItem env: | Sort-Object Name`) in both contexts and diff. IDEs launch from the desktop session and do not source shell rc files; exports living in `.zshrc` are invisible to them.

Classification: configuration present in one context only. Recommendation: move the variable to a context the IDE reads (IDE run configuration, `.env` file the project loads) — do not duplicate secrets into global profiles.

## Decision Criteria

- Claimed project defect + missing tool → demand the contract evidence (docs, devcontainer, bootstrap script) before accepting the classification; default to prerequisite.
- Tool present but version drifts from a pin file → the pin is authoritative; the machine adapts.
- Same command, different result by context → diff the environments before touching either; the fix belongs in the narrower context.
