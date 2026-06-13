param(
    [string]$ConfigPath = '',
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: .\tests\validate-install-discovery-config.ps1 -ConfigPath <path>'
    Write-Host 'Validates install discovery config shape without scanning or installing.'
    exit 0
}

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    throw 'ConfigPath is required. Use -ConfigPath <path>.'
}

$configFile = (Resolve-Path -LiteralPath $ConfigPath).Path
$config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
$errors = @()
$namePattern = '^[a-z0-9]+(-[a-z0-9]+)*$'

function Get-PropertyValue {
    param([object]$Object, [string]$Name)
    if ($null -ne $Object -and $null -ne $Object.PSObject.Properties[$Name]) {
        return $Object.PSObject.Properties[$Name].Value
    }
    return $null
}

function Test-StringArrayProperty {
    param([object]$Object, [string]$Name, [string]$Context, [switch]$RequireKebabCase, [switch]$RequireNonEmpty, [switch]$AllowMissing)
    if ($null -eq $Object -or $null -eq $Object.PSObject.Properties[$Name] -or $null -eq $Object.PSObject.Properties[$Name].Value) {
        if (-not $AllowMissing) { $script:errors += "$Context is required." }
        return
    }
    $value = $Object.PSObject.Properties[$Name].Value
    if ($value -is [string] -or $value -isnot [System.Collections.IEnumerable]) {
        $script:errors += "$Context must be an array."
        return
    }
    $items = @($value)
    if ($RequireNonEmpty -and $items.Count -eq 0) {
        $script:errors += "$Context must include at least one value."
        return
    }
    $seen = @{}
    foreach ($item in $items) {
        if ($item -isnot [string] -or [string]::IsNullOrWhiteSpace($item)) {
            $script:errors += "$Context contains an invalid string."
            continue
        }
        if ($seen.ContainsKey($item)) {
            $script:errors += "$Context contains duplicate value: $item"
            continue
        }
        $seen[$item] = $true
        if ($RequireKebabCase -and $item -notmatch $script:namePattern) {
            $script:errors += "$Context contains invalid kebab-case name: $item"
        }
    }
}

if ($config.version -ne 1) {
    $errors += 'Install discovery config version must be 1.'
}

$tools = Get-PropertyValue -Object $config -Name 'tools'
Test-StringArrayProperty -Object $config -Name 'tools' -Context 'tools' -RequireNonEmpty
if ($null -ne $tools) {
    foreach ($tool in $tools) {
        if (@('codex','claudeCode') -notcontains $tool) {
            $errors += "Unsupported tool: $tool"
        }
    }
}

Test-StringArrayProperty -Object $config -Name 'projectRoots' -Context 'projectRoots'

$projectDiscovery = Get-PropertyValue -Object $config -Name 'projectDiscovery'
if ($null -ne $projectDiscovery) {
    $mode = Get-PropertyValue -Object $projectDiscovery -Name 'mode'
    if ($null -ne $mode -and $mode -ne 'git-repos') { $errors += 'projectDiscovery.mode must be git-repos when set.' }
    $maxDepth = Get-PropertyValue -Object $projectDiscovery -Name 'maxDepth'
    if ($null -ne $maxDepth) {
        if ($maxDepth -isnot [int] -and $maxDepth -isnot [long]) {
            $errors += 'projectDiscovery.maxDepth must be an integer >= 0.'
        } elseif ([int]$maxDepth -lt 0) {
            $errors += 'projectDiscovery.maxDepth must be an integer >= 0.'
        }
    }
    Test-StringArrayProperty -Object $projectDiscovery -Name 'excludeDirs' -Context 'projectDiscovery.excludeDirs' -AllowMissing
    $skipNestedRepos = Get-PropertyValue -Object $projectDiscovery -Name 'skipNestedRepos'
    if ($null -ne $skipNestedRepos -and $skipNestedRepos -isnot [bool]) {
        $errors += 'projectDiscovery.skipNestedRepos must be boolean when set.'
    }
}

$policy = Get-PropertyValue -Object $config -Name 'scopePolicy'
if ($null -eq $policy) {
    $errors += 'scopePolicy is required.'
} else {
    $source = Get-PropertyValue -Object $policy -Name 'desiredStateSource'
    if ($null -ne $source -and $source -ne 'policy-with-installed-evidence') {
        $errors += 'scopePolicy.desiredStateSource must be policy-with-installed-evidence when set.'
    }
    Test-StringArrayProperty -Object $policy -Name 'userLevelSkills' -Context 'scopePolicy.userLevelSkills' -RequireKebabCase -AllowMissing
    Test-StringArrayProperty -Object $policy -Name 'projectLevelOnlySkills' -Context 'scopePolicy.projectLevelOnlySkills' -RequireKebabCase -AllowMissing
    Test-StringArrayProperty -Object $policy -Name 'userLevelWorkflows' -Context 'scopePolicy.userLevelWorkflows' -RequireKebabCase -AllowMissing
    Test-StringArrayProperty -Object $policy -Name 'projectDefaultWorkflows' -Context 'scopePolicy.projectDefaultWorkflows' -RequireKebabCase -AllowMissing
    $unknown = Get-PropertyValue -Object $policy -Name 'unknownInstalledItems'
    if ($null -ne $unknown -and $unknown -ne 'report-only') { $errors += 'scopePolicy.unknownInstalledItems must be report-only when set.' }
}

$output = Get-PropertyValue -Object $config -Name 'output'
if ($null -eq $output) {
    $errors += 'output is required.'
} else {
    foreach ($name in @('manifestPath','reportPath')) {
        $value = Get-PropertyValue -Object $output -Name $name
        if ($null -eq $value -or $value -isnot [string] -or [string]::IsNullOrWhiteSpace($value)) {
            $errors += "output.$name is required and must be a string."
        }
    }
}

$install = Get-PropertyValue -Object $config -Name 'install'
if ($null -ne $install) {
    if ($null -ne (Get-PropertyValue -Object $install -Name 'apply')) {
        $errors += 'install.apply is not allowed in config; use the CLI -Apply flag.'
    }
    foreach ($name in @('validateBeforeInstall','verifyAfterInstall','force')) {
        $value = Get-PropertyValue -Object $install -Name $name
        if ($null -ne $value -and $value -isnot [bool]) {
            $errors += "install.$name must be boolean when set."
        }
    }
    $forceValue = Get-PropertyValue -Object $install -Name 'force'
    if ($forceValue -eq $true) {
        $errors += 'install.force cannot enable replacement from config; use the CLI -Force flag.'
    }
}

if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}

Write-Host 'validate-install-discovery-config: ok'
