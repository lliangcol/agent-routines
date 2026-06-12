# Maven Verification Checklist

Build the narrowest Maven command that proves the change, and separate repo failures from local-environment failures before touching source.

## Shell First: PowerShell Mangles `-D`

PowerShell parses `-Dprop=value` as its own parameter syntax. Always quote the whole property:

```powershell
mvn test '-Dtest=OrderServiceTest' '-Dsurefire.failIfNoSpecifiedTests=false'
mvn verify "-Dmaven.test.skip=true"     # double quotes also fine
```

POSIX shells pass `-D` through unchanged, but still quote selectors containing `#`, `*`, or `$`:

```bash
mvn test -Dtest='OrderServiceTest#closesPendingOrders'
```

Confirm which shell you are in before diagnosing "Unknown lifecycle phase" errors — that message in PowerShell almost always means an unquoted `-D` was split, not a real Maven problem.

## Module Scoping

```bash
mvn -q help:evaluate -Dexpression=project.modules        # list modules from the root pom
mvn test -pl service-order -am                           # module + its upstream deps
```

- `-pl <module>` alone fails when the module's SNAPSHOT dependencies aren't in the local repo; `-am` (also-make) builds them. Use `-am` when upstream modules changed or `~/.m2` is cold; skip it for a fast re-run when upstream is already installed.
- The `-pl` value is the artifactId or relative path of the module, not the directory name when they differ — check the module's `pom.xml` `<artifactId>`.

## Test Selection

```bash
mvn test -pl service-order -Dtest='OrderServiceTest'                       # class
mvn test -pl service-order -Dtest='OrderServiceTest#closesPendingOrders'   # single method
mvn verify -pl service-order -Dit.test='OrderIT'                           # failsafe integration test
```

`-Dtest` selects surefire (unit) tests only; integration tests under failsafe need `-Dit.test` and the `verify` phase. If "No tests were executed" with a correct name, the class may not match the configured naming patterns (`*Test`, `*IT`) — read the surefire/failsafe config in the pom before renaming anything.

## Dependency Resolution Failures

Before blaming the pom, inspect the local mirror configuration:

```bash
cat ~/.m2/settings.xml      # look for <mirrorOf>*</mirrorOf>
```

- A corporate mirror with `mirrorOf=*` swallows every repository declared in the pom — artifacts published only to repo-declared registries will 404 through the mirror. This is a local-environment failure, not a project defect.
- For a temporary bypass, write an alternative settings file under ignored build output (e.g., `target/audit-settings.xml`) and run `mvn -s target/audit-settings.xml ...` — never edit `~/.m2/settings.xml` itself without confirmation.
- `-U` forces snapshot re-resolution when a stale cached SNAPSHOT is the suspect; `-o` (offline) confirms whether the build needs the network at all.

## Profiles

`mvn help:active-profiles` shows what is active. Never activate profiles whose names suggest deployment targets (`prod`, `release`, `deploy`) for verification purposes without explicit confirmation — they can change endpoints, skip checks, or sign/publish artifacts.

## Failure Cases

- Symptom: build fails with "Could not resolve dependencies" only on this machine. Wrong response: change versions in the pom. Correct response: check `settings.xml` mirrors and `~/.m2/repository` cache state first; reproduce with `-s` pointing at a minimal settings file.
- Symptom: tests pass locally, fail in CI with encoding/locale assertions. Cause: JVM default locale/charset differs. Verify with `mvn -v` (shows platform encoding) on both; fix is pinning `project.build.sourceEncoding`/`-Duser.language` in the pom, reported as a project gap.
- Symptom: `mvn test` reruns the whole multi-module reactor taking 20 minutes. Correct response: scope with `-pl -am` per above; full-reactor verification is the final pre-handoff gate, not the inner loop.
