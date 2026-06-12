# maven verification checklist

- Confirm current shell and quote `-D` arguments in PowerShell.
- Confirm module path and use `-pl <module> -am` only when appropriate.
- Read relevant `pom.xml` files before changing dependencies.
- Inspect `~/.m2/settings.xml` for `mirrorOf=*` when resolution fails.
- Keep temporary settings overrides under ignored build output when possible.
- Never use production profiles without explicit confirmation.
