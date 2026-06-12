# Workflow Authoring Guide

Every workflow needs a README, PowerShell script, Bash script, schema, and sample output. Scripts emit stable JSON with `ok`, `workflow`, `cwd`, `os`, `checks`, `warnings`, and `errors`.

Workflows should be deterministic and safe. They should report missing runtimes clearly and reserve nonzero exits for invalid arguments or failed validation.