param([switch]$Help)

if ($Help) {
    Write-Host 'Usage: .\tests\validate-install-discovery-powershell-regression.ps1'
    Write-Host 'Checks PowerShell install-discovery single rootOptions array handling.'
    exit 0
}

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('agent-routines-install-discovery-' + [IO.Path]::GetRandomFileName())
$psExe = (Get-Process -Id $PID).Path
if ([string]::IsNullOrWhiteSpace($psExe)) { $psExe = 'powershell.exe' }

function Write-Utf8NoBomFile {
    param([string]$Path, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, ($Text + [Environment]::NewLine), $encoding)
}

function Invoke-CheckedPowerShell {
    param([string]$ScriptPath, [string[]]$Arguments)
    $output = & $script:psExe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw (($output | Out-String).Trim())
    }
    return ($output | Out-String)
}

try {
    New-Item -ItemType Directory -Path $tmp | Out-Null
    $configPath = Join-Path $tmp 'single-root-options.config.json'
    $config = [ordered]@{
        version = 1
        projectRoots = @($repoRoot)
        tools = @('codex')
        projectDiscovery = [ordered]@{
            mode = 'git-repos'
            maxDepth = 0
            excludeDirs = @('.git','node_modules','.agent-routines','.codex','.claude')
            skipNestedRepos = $true
            rootOptions = @(
                [ordered]@{
                    root = $repoRoot
                    skipNestedRepos = $true
                }
            )
        }
        scopePolicy = [ordered]@{
            desiredStateSource = 'policy-with-installed-evidence'
            userLevelSkills = @('guarded-change')
            projectLevelOnlySkills = @()
            userLevelWorkflows = @('gate-check')
            projectDefaultWorkflows = @('preflight')
            unknownInstalledItems = 'report-only'
        }
        output = [ordered]@{
            manifestPath = (Join-Path $tmp 'install.manifest.json')
            reportPath = (Join-Path $tmp 'install.plan.json')
        }
        install = [ordered]@{
            validateBeforeInstall = $true
            verifyAfterInstall = $true
            force = $false
        }
    }
    Write-Utf8NoBomFile -Path $configPath -Text ($config | ConvertTo-Json -Depth 20)

    Invoke-CheckedPowerShell -ScriptPath (Join-Path $repoRoot 'tests\validate-install-discovery-config.ps1') -Arguments @('-ConfigPath', $configPath) | Out-Null
    $planText = Invoke-CheckedPowerShell -ScriptPath (Join-Path $repoRoot 'tools\generate-install-manifest.ps1') -Arguments @('-ConfigPath', $configPath)
    $plan = $planText | ConvertFrom-Json
    if ($null -eq $plan.generatedManifest) {
        throw 'generatedManifest was not present in the single-root dry-run plan.'
    }
    if ($plan.installPlan.dryRun -ne $true) {
        throw 'single-root regression must run generator in dry-run mode.'
    }
    Invoke-CheckedPowerShell -ScriptPath (Join-Path $repoRoot 'tools\generate-install-manifest.ps1') -Arguments @('-ConfigPath', $configPath, '-ExpectedManifestDigest', [string]$plan.manifestDigest) | Out-Null
    $badDigest = 'f' * 64
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $badDigestOutput = & $script:psExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'tools\generate-install-manifest.ps1') -ConfigPath $configPath -ExpectedManifestDigest $badDigest 2>&1
        $badDigestExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($badDigestExitCode -eq 0) {
        throw 'generator accepted a stale expected manifest digest.'
    }
    if (($badDigestOutput | Out-String) -notmatch 'Generated manifest digest does not match expected reviewed manifest digest') {
        throw "generator rejected the bad digest for the wrong reason: $badDigestOutput"
    }
    $generatorPs = Get-Content -LiteralPath (Join-Path $repoRoot 'tools\generate-install-manifest.ps1') -Raw
    if ($generatorPs -notmatch 'foreach \(\$tool in \$tools\)') {
        throw 'PowerShell generator apply path must install every configured tool adapter.'
    }
    $generatorSh = Get-Content -LiteralPath (Join-Path $repoRoot 'tools\generate-install-manifest.sh') -Raw
    if ($generatorSh -notmatch 'for tool in "\$\{tools\[@\]\}"; do') {
        throw 'Bash generator apply path must install every configured tool adapter.'
    }
    if ($generatorSh -match '\$\{tools\[0\]') {
        throw 'Bash generator apply path must not choose only the first configured tool.'
    }
    if ($generatorSh -match '\bmapfile\b') {
        throw 'Bash generator apply path must remain compatible with Bash 3.2 and avoid mapfile.'
    }

    $projectPath = Join-Path $tmp 'project'
    $targetSkillRoot = Join-Path $projectPath '.codex\skills'
    New-Item -ItemType Directory -Path $targetSkillRoot -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $repoRoot 'skills\guarded-change') -Destination $targetSkillRoot -Recurse
    $checkOutput = Invoke-CheckedPowerShell -ScriptPath (Join-Path $repoRoot 'adapters\codex\check-project.ps1') -Arguments @('-ProjectPath', $projectPath)
    if ($checkOutput -notmatch 'check-install summary: 1 checked, 1 ok, 0 drifted, 0 broken') {
        throw "check-install regression did not report the expected clean project target: $checkOutput"
    }

    $badManifestPath = Join-Path $tmp 'bad-target.manifest.json'
    $badTarget = Join-Path $tmp 'outside-target\guarded-change'
    $badManifest = [ordered]@{
        version = 2
        desiredTargets = @()
        actions = @(
            [ordered]@{
                id = 'bad:user::codex:skill:guarded-change'
                scope = 'user'
                tool = 'codex'
                kind = 'skill'
                name = 'guarded-change'
                projectPath = ''
                sourcePath = (Join-Path $repoRoot 'skills\guarded-change')
                targetRoot = (Split-Path -Parent $badTarget)
                targetPath = $badTarget
                createTargets = $true
                targetRootExists = $true
                operation = 'replace'
                reason = 'regression fixture'
                requiresBackup = $true
            }
        )
        backupPlan = [ordered]@{ requiredFor = @('replace-listed','sync-prune'); items = @() }
        restorePlan = [ordered]@{ items = @() }
        summary = [ordered]@{ install = 0; skip = 0; replace = 1; prune = 0; unknown = 0; unclassified = 0 }
    }
    Write-Utf8NoBomFile -Path $badManifestPath -Text ($badManifest | ConvertTo-Json -Depth 20)
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $badOutput = & $script:psExe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repoRoot 'tests\validate-manifest.ps1') -ManifestPath $badManifestPath 2>&1
        $badManifestExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($badManifestExitCode -eq 0) {
        throw 'validate-manifest accepted a v2 action with an arbitrary targetPath.'
    }
    if (($badOutput | Out-String) -notmatch 'action\.targetPath does not match expected') {
        throw "validate-manifest rejected the bad target for the wrong reason: $badOutput"
    }
    Write-Host 'validate-install-discovery-powershell-regression: ok'
} finally {
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
