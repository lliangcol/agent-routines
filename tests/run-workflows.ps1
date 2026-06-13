param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\run-workflows.ps1'
    Write-Host 'Executes every workflow PowerShell entrypoint against a disposable temp repository'
    Write-Host 'and validates the emitted JSON against the published output contract.'
    Write-Host 'When bash is available, also runs the Bash twin of every workflow and asserts'
    Write-Host 'parity: same exit code, same ok flag, same check names, and same warning/error counts.'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error 'run-workflows.ps1 requires git.'
    exit 1
}

$tmp = Join-Path ([IO.Path]::GetTempPath()) ('agent-routines-smoke-' + [IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $tmp | Out-Null

$failures = @()
try {
    git -C $tmp init -q
    git -C $tmp config user.name 'Smoke Test'
    git -C $tmp config user.email 'smoke@example.invalid'
    Set-Content -LiteralPath (Join-Path $tmp 'README.md') -Value '# Smoke fixture'
    New-Item -ItemType Directory -Path (Join-Path $tmp 'docs') | Out-Null
    Set-Content -LiteralPath (Join-Path $tmp 'docs/index.md') -Value '# Doc'
    git -C $tmp add -A
    git -C $tmp commit -qm 'fixture' | Out-Null

    function Test-WorkflowOutput {
        param([string]$Name, [string]$Payload)
        $doc = $Payload | ConvertFrom-Json
        $expected = @('ok', 'workflow', 'cwd', 'os', 'checks', 'warnings', 'errors')
        $actual = @($doc.PSObject.Properties.Name)
        $missing = @($expected | Where-Object { $actual -notcontains $_ })
        $extra = @($actual | Where-Object { $expected -notcontains $_ })
        if ($missing.Count -gt 0 -or $extra.Count -gt 0) { throw "unexpected keys (missing: $($missing -join ','); extra: $($extra -join ','))" }
        if ($doc.ok -isnot [bool]) { throw 'ok must be boolean' }
        if ($doc.workflow -ne $Name) { throw "workflow field '$($doc.workflow)' != '$Name'" }
        if ($doc.cwd -isnot [string]) { throw 'cwd must be string' }
        if (@('windows', 'macos', 'linux', 'unknown') -notcontains $doc.os) { throw "bad os '$($doc.os)'" }
        foreach ($check in @($doc.checks)) {
            $props = @($check.PSObject.Properties.Name) | Sort-Object
            if (($props -join ',') -ne 'details,name,ok') { throw "bad check shape: $($props -join ',')" }
            if ($check.name -isnot [string] -or $check.ok -isnot [bool] -or $check.details -isnot [string]) { throw 'bad check member types' }
        }
        foreach ($item in @($doc.warnings)) { if ($item -isnot [string]) { throw 'warnings items must be strings' } }
        foreach ($item in @($doc.errors)) { if ($item -isnot [string]) { throw 'errors items must be strings' } }
    }

    function Invoke-Case {
        param([string]$Name, [string]$Label, [object]$Expect, [hashtable]$Arguments)
        $script = Join-Path $root "workflows/$Name/$Name.ps1"
        $output = (& $script @Arguments 2>$null | Out-String)
        $code = $LASTEXITCODE
        if ($Expect -eq 'any') {
            if ($code -ne 0 -and $code -ne 1) {
                $script:failures += "${Label}: unexpected exit code $code"
                return
            }
        } elseif ($code -ne [int]$Expect) {
            $script:failures += "${Label}: exit code $code, expected $Expect"
            return
        }
        try {
            Test-WorkflowOutput -Name $Name -Payload $output
        } catch {
            $script:failures += "${Label}: output violated the JSON contract ($($_.Exception.Message))"
        }
    }

    $parityShell = $null
    $bashCommand = Get-Command bash -ErrorAction SilentlyContinue
    if ($null -ne $bashCommand) {
        if ($bashCommand.Source -notmatch '(?i)\\System32\\bash\.exe$') {
            $parityShell = $bashCommand.Source
        }
    }

    function Invoke-ParityCase {
        param([string]$Name)
        $psScript = Join-Path $root "workflows/$Name/$Name.ps1"
        $shScript = (Join-Path $root "workflows/$Name/$Name.sh") -replace '\\', '/'
        $tmpForBash = $tmp -replace '\\', '/'
        $psOutput = (& $psScript -Path $tmp 2>$null | Out-String)
        $psCode = $LASTEXITCODE
        $shOutput = (& $parityShell $shScript --path $tmpForBash 2>$null | Out-String)
        $shCode = $LASTEXITCODE
        if ($psCode -ne $shCode) {
            $script:failures += "$Name parity: exit code ps=$psCode sh=$shCode"
            return
        }
        try {
            $psDoc = $psOutput | ConvertFrom-Json
            $shDoc = $shOutput | ConvertFrom-Json
        } catch {
            $script:failures += "$Name parity: JSON parse failed ($($_.Exception.Message))"
            return
        }
        if ($psDoc.ok -ne $shDoc.ok) {
            $script:failures += "$Name parity: ok differs (ps=$($psDoc.ok) sh=$($shDoc.ok))"
            return
        }
        $psNames = (@(@($psDoc.checks) | ForEach-Object { $_.name }) | Sort-Object) -join ','
        $shNames = (@(@($shDoc.checks) | ForEach-Object { $_.name }) | Sort-Object) -join ','
        if ($psNames -ne $shNames) {
            $script:failures += "$Name parity: check names differ (ps=$psNames sh=$shNames)"
            return
        }
        if (@($psDoc.warnings).Count -ne @($shDoc.warnings).Count) {
            $script:failures += "$Name parity: warning count differs (ps=$(@($psDoc.warnings).Count) sh=$(@($shDoc.warnings).Count))"
            return
        }
        if (@($psDoc.errors).Count -ne @($shDoc.errors).Count) {
            $script:failures += "$Name parity: error count differs (ps=$(@($psDoc.errors).Count) sh=$(@($shDoc.errors).Count))"
        }
    }

    $count = 0
    $parityCount = 0
    foreach ($workflowDir in (Get-ChildItem -LiteralPath (Join-Path $root 'workflows') -Directory)) {
        Invoke-Case -Name $workflowDir.Name -Label $workflowDir.Name -Expect 'any' -Arguments @{ Path = $tmp }
        $count++
        if ($null -ne $parityShell) {
            Invoke-ParityCase -Name $workflowDir.Name
            $parityCount++
        }
    }

    if ($null -eq $parityShell) {
        Write-Host 'run-workflows: warning: bash not found; ps1-vs-sh parity checks skipped.'
    }

    Invoke-Case -Name 'db-read' -Label 'db-read readonly SQL accepted' -Expect 0 -Arguments @{ Path = $tmp; Sql = 'SELECT 1' }
    Invoke-Case -Name 'db-read' -Label 'db-read write SQL rejected' -Expect 1 -Arguments @{ Path = $tmp; Sql = 'DROP TABLE users' }
    Invoke-Case -Name 'gate-check' -Label 'gate-check destructive custom command rejected' -Expect 1 -Arguments @{ Path = $tmp; CustomCommand = 'rm -rf /' }
    Invoke-Case -Name 'gate-check' -Label 'gate-check readonly custom command accepted' -Expect 0 -Arguments @{ Path = $tmp; CustomCommand = 'git status --short' }
    Invoke-Case -Name 'gate-check' -Label 'gate-check control characters rejected' -Expect 1 -Arguments @{ Path = $tmp; CustomCommand = 'echo hi > out.txt' }
    Invoke-Case -Name 'gate-check' -Label 'gate-check non-allowlisted command rejected' -Expect 1 -Arguments @{ Path = $tmp; CustomCommand = 'curl https://example.com' }
} finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}

if ($failures.Count -gt 0) {
    Write-Error ($failures -join "`n")
    exit 1
}
Write-Host "run-workflows: ok ($count workflows executed, $parityCount parity comparisons, 6 targeted cases)"
exit 0
