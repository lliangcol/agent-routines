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
$configText = Get-Content -LiteralPath $configFile -Raw -Encoding UTF8
try {
    $config = $configText | ConvertFrom-Json
} catch {
    $message = "Invalid JSON in install discovery config: $($_.Exception.Message)"
    if ($configText -match '"[A-Za-z]:\\') {
        $message += "`nHint: JSON Windows paths must escape backslashes, for example `"D:\\Repositories\\agent-config`"."
    }
    [Console]::Error.WriteLine($message)
    exit 1
}
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

if (@(1,2) -notcontains $config.version) {
    $errors += 'Install discovery config version must be 1 or 2.'
}

function Test-Tools {
    param([object]$Object, [string]$Context)
    Test-StringArrayProperty -Object $Object -Name 'tools' -Context "$Context.tools" -RequireNonEmpty
    $toolsValue = Get-PropertyValue -Object $Object -Name 'tools'
    if ($toolsValue -is [System.Collections.IEnumerable] -and $toolsValue -isnot [string]) {
        foreach ($tool in $toolsValue) {
            if (@('codex','claudeCode') -notcontains $tool) { $script:errors += "$Context.tools contains unsupported tool: $tool" }
        }
    }
}

function Test-SkillSelection {
    param([object]$Object, [string]$Context)
    if ($null -eq $Object) {
        $script:errors += "$Context is required."
        return
    }
    Test-StringArrayProperty -Object $Object -Name 'codex' -Context "$Context.codex" -RequireKebabCase
    Test-StringArrayProperty -Object $Object -Name 'claudeCode' -Context "$Context.claudeCode" -RequireKebabCase
}

function Test-ProjectTargetBlock {
    param([object]$Object, [string]$Context, [switch]$RequirePath)
    if ($null -eq $Object) {
        $script:errors += "$Context is required."
        return
    }
    if ($RequirePath) {
        $pathValue = Get-PropertyValue -Object $Object -Name 'path'
        if ($pathValue -isnot [string] -or [string]::IsNullOrWhiteSpace($pathValue)) { $script:errors += "$Context.path is required." }
    }
    foreach ($name in @('enabled','createTargets')) {
        $value = Get-PropertyValue -Object $Object -Name $name
        if ($value -isnot [bool]) { $script:errors += "$Context.$name must be boolean." }
    }
    $mode = Get-PropertyValue -Object $Object -Name 'mode'
    if (@('merge','replace-listed') -notcontains $mode) { $script:errors += "$Context.mode must be merge or replace-listed." }
    Test-Tools -Object $Object -Context $Context
    Test-SkillSelection -Object (Get-PropertyValue -Object $Object -Name 'skills') -Context "$Context.skills"
    Test-StringArrayProperty -Object $Object -Name 'workflows' -Context "$Context.workflows" -RequireKebabCase
}

if ($config.version -eq 2) {
    foreach ($forbidden in @('force','pruneUnlisted','defaultMode')) {
        if ($null -ne (Get-PropertyValue -Object $config -Name $forbidden)) { $errors += "Config v2 cannot contain destructive apply switch: $forbidden" }
    }
    $userTargets = Get-PropertyValue -Object $config -Name 'userTargets'
    if ($null -eq $userTargets) {
        $errors += 'userTargets is required.'
    } else {
        $enabled = Get-PropertyValue -Object $userTargets -Name 'enabled'
        if ($enabled -isnot [bool]) { $errors += 'userTargets.enabled must be boolean.' }
        Test-Tools -Object $userTargets -Context 'userTargets'
        Test-SkillSelection -Object (Get-PropertyValue -Object $userTargets -Name 'skills') -Context 'userTargets.skills'
        Test-StringArrayProperty -Object $userTargets -Name 'workflows' -Context 'userTargets.workflows' -RequireKebabCase
    }
    Test-ProjectTargetBlock -Object (Get-PropertyValue -Object $config -Name 'projectDefaults') -Context 'projectDefaults'
    $projectTargets = Get-PropertyValue -Object $config -Name 'projectTargets'
    if ($null -eq $projectTargets -or $projectTargets -is [string]) {
        $errors += 'projectTargets must be an array.'
    } else {
        $index = 0
        foreach ($target in @($projectTargets)) {
            Test-ProjectTargetBlock -Object $target -Context "projectTargets[$index]" -RequirePath
            $index += 1
        }
    }
    $discovery = Get-PropertyValue -Object $config -Name 'discovery'
    if ($null -eq $discovery) {
        $errors += 'discovery is required.'
    } else {
        Test-StringArrayProperty -Object $discovery -Name 'roots' -Context 'discovery.roots'
        Test-StringArrayProperty -Object $discovery -Name 'excludeDirs' -Context 'discovery.excludeDirs'
        $maxDepth = Get-PropertyValue -Object $discovery -Name 'maxDepth'
        if ($maxDepth -isnot [int] -and $maxDepth -isnot [long]) { $errors += 'discovery.maxDepth must be an integer >= 0.' }
        elseif ([int]$maxDepth -lt 0) { $errors += 'discovery.maxDepth must be an integer >= 0.' }
        $skipNestedRepos = Get-PropertyValue -Object $discovery -Name 'skipNestedRepos'
        if ($skipNestedRepos -isnot [bool]) { $errors += 'discovery.skipNestedRepos must be boolean.' }
    }
    $promotionRules = Get-PropertyValue -Object $config -Name 'promotionRules'
    Test-StringArrayProperty -Object $promotionRules -Name 'doNotPromoteToUserSkills' -Context 'promotionRules.doNotPromoteToUserSkills' -RequireKebabCase
    $applySafety = Get-PropertyValue -Object $config -Name 'applySafety'
    $unknown = Get-PropertyValue -Object $applySafety -Name 'unknownInstalledItems'
    if ($unknown -ne 'report-only') { $errors += 'applySafety.unknownInstalledItems must be report-only.' }
    foreach ($forbidden in @('force','pruneUnlisted','defaultMode')) {
        if ($null -ne (Get-PropertyValue -Object $applySafety -Name $forbidden)) { $errors += "applySafety cannot contain destructive apply switch: $forbidden" }
    }
    $output = Get-PropertyValue -Object $config -Name 'output'
    if ($null -eq $output) {
        $errors += 'output is required.'
    } else {
        foreach ($name in @('manifestPath','reportPath')) {
            $value = Get-PropertyValue -Object $output -Name $name
            if ($value -isnot [string] -or [string]::IsNullOrWhiteSpace($value)) { $errors += "output.$name is required and must be a string." }
        }
    }
    if ($errors.Count -gt 0) {
        Write-Error ($errors -join "`n")
        exit 1
    }
    Write-Host 'validate-install-discovery-config: ok'
    exit 0
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

$projectRootsProperty = $config.PSObject.Properties['projectRoots']
$projectRoots = $null
if ($null -ne $projectRootsProperty) { $projectRoots = $projectRootsProperty.Value }
Test-StringArrayProperty -Object $config -Name 'projectRoots' -Context 'projectRoots'
$knownProjectRoots = @{}
if ($projectRoots -is [System.Collections.IEnumerable] -and $projectRoots -isnot [string]) {
    foreach ($root in $projectRoots) {
        if ($root -is [string]) { $knownProjectRoots[$root] = $true }
    }
}

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
    $rootOptionsProperty = $projectDiscovery.PSObject.Properties['rootOptions']
    if ($null -ne $rootOptionsProperty -and $null -ne $rootOptionsProperty.Value) {
        $rootOptions = $rootOptionsProperty.Value
        if ($rootOptions -is [string] -or $rootOptions -isnot [System.Collections.IEnumerable]) {
            $errors += 'projectDiscovery.rootOptions must be an array.'
        } else {
            $seenRootOptions = @{}
            $index = 0
            foreach ($option in @($rootOptions)) {
                $context = "projectDiscovery.rootOptions[$index]"
                if ($null -eq $option) {
                    $errors += "$context must be an object."
                    $index += 1
                    continue
                }
                $root = Get-PropertyValue -Object $option -Name 'root'
                if ($root -isnot [string] -or [string]::IsNullOrWhiteSpace($root)) {
                    $errors += "$context.root contains an invalid string."
                } else {
                    if ($seenRootOptions.ContainsKey($root)) {
                        $errors += "projectDiscovery.rootOptions contains duplicate root: $root"
                    }
                    $seenRootOptions[$root] = $true
                    if (-not $knownProjectRoots.ContainsKey($root)) {
                        $errors += "projectDiscovery.rootOptions references unknown project root: $root"
                    }
                }
                $optionSkipNestedRepos = Get-PropertyValue -Object $option -Name 'skipNestedRepos'
                if ($optionSkipNestedRepos -isnot [bool]) {
                    $errors += "$context.skipNestedRepos must be boolean when set."
                }
                $index += 1
            }
        }
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
