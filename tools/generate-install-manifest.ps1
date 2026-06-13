param(
    [string]$ConfigPath = '',
    [switch]$WriteManifest,
    [switch]$Apply,
    [switch]$Force,
    [switch]$Help
)

if ($Help) {
    Write-Host 'Usage: .\tools\generate-install-manifest.ps1 -ConfigPath <path> [-WriteManifest] [-Apply] [-Force]'
    Write-Host 'Discovers installed Agent Routines targets, generates a manifest plan, and optionally installs it.'
    Write-Host 'Default mode is dry-run: no files are written and no install is executed.'
    exit 0
}

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
    throw 'ConfigPath is required. Use -ConfigPath <path>.'
}
if ($Apply -and -not $WriteManifest) {
    throw 'Apply requires WriteManifest so the reviewed manifest path exists before installation.'
}

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$ConfigFile = (Resolve-Path -LiteralPath $ConfigPath).Path
$SkillSourceRoot = Join-Path $RepoRoot 'skills'
$WorkflowSourceRoot = Join-Path $RepoRoot 'workflows'

function Get-PropertyValue {
    param([object]$Object, [string]$Name, [object]$DefaultValue)
    if ($null -ne $Object -and $null -ne $Object.PSObject.Properties[$Name]) {
        return $Object.PSObject.Properties[$Name].Value
    }
    return $DefaultValue
}

function Get-StringArrayProperty {
    param([object]$Object, [string]$Name, [string]$Context, [string[]]$DefaultValue)
    if ($null -eq $Object -or $null -eq $Object.PSObject.Properties[$Name] -or $null -eq $Object.PSObject.Properties[$Name].Value) {
        return @($DefaultValue)
    }
    $value = $Object.PSObject.Properties[$Name].Value
    if ($value -is [string] -or $value -isnot [System.Collections.IEnumerable]) { throw "$Context must be an array." }
    $result = @()
    foreach ($item in $value) {
        if ($item -isnot [string] -or [string]::IsNullOrWhiteSpace($item)) {
            throw "$Context contains an invalid string."
        }
        $result += $item
    }
    return @($result)
}

function Get-BoolValue {
    param([object]$Value, [string]$Context, [bool]$DefaultValue)
    if ($null -eq $Value) { return $DefaultValue }
    if ($Value -isnot [bool]) { throw "$Context must be boolean when set." }
    return [bool]$Value
}

function Get-NonNegativeIntValue {
    param([object]$Value, [string]$Context, [int]$DefaultValue)
    if ($null -eq $Value) { return $DefaultValue }
    if ($Value -isnot [int] -and $Value -isnot [long]) { throw "$Context must be an integer >= 0." }
    $intValue = [int]$Value
    if ($intValue -lt 0) { throw "$Context must be an integer >= 0." }
    return $intValue
}

function Get-UniqueOrderedNames {
    param([string[]]$Names)
    $result = New-Object System.Collections.ArrayList
    $seen = @{}
    foreach ($name in $Names) {
        if (-not $seen.ContainsKey($name)) {
            $seen[$name] = $true
            [void]$result.Add($name)
        }
    }
    return @($result)
}

function Add-UniqueName {
    param([System.Collections.ArrayList]$List, [string]$Name)
    if (-not $List.Contains($Name)) { [void]$List.Add($Name) }
}

function Write-Utf8NoBomFile {
    param([string]$Path, [string]$Text)
    $encoding = New-Object System.Text.UTF8Encoding -ArgumentList $false
    [System.IO.File]::WriteAllText($Path, ($Text + [Environment]::NewLine), $encoding)
}

function New-NameSet {
    param([string[]]$Names)
    $set = @{}
    foreach ($name in $Names) { $set[$name] = $true }
    return $set
}

function Resolve-RepoRelativePath {
    param([string]$PathValue)
    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return (Resolve-Path -LiteralPath $PathValue).Path
    }
    return (Resolve-Path -LiteralPath (Join-Path $RepoRoot $PathValue)).Path
}

function Resolve-OutputPath {
    param([string]$PathValue)
    if ([System.IO.Path]::IsPathRooted($PathValue)) { return $PathValue }
    return (Join-Path $RepoRoot $PathValue)
}

function Get-AdapterName {
    param([string]$ToolKey)
    if ($ToolKey -eq 'codex') { return 'codex' }
    return 'claude-code'
}

function Get-SkillTargetRoot {
    param([string]$ToolKey, [string]$ProjectPath)
    $folder = if ($ToolKey -eq 'codex') { '.codex\skills' } else { '.claude\skills' }
    if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
        return (Join-Path $HOME $folder)
    }
    return (Join-Path $ProjectPath $folder)
}

function Get-WorkflowTargetRoot {
    param([string]$ProjectPath)
    if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
        return (Join-Path $HOME '.agent-routines\workflows')
    }
    return (Join-Path $ProjectPath '.agent-routines\workflows')
}

function Get-InstalledKnownNames {
    param(
        [string]$Root,
        [hashtable]$KnownNames,
        [string]$Scope,
        [string]$Tool,
        [string]$Kind,
        [string]$ProjectPath
    )
    $names = New-Object System.Collections.ArrayList
    if (-not (Test-Path -LiteralPath $Root)) { return @() }
    foreach ($dir in (Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue)) {
        if ($KnownNames.ContainsKey($dir.Name)) {
            Add-UniqueName -List $names -Name $dir.Name
        } else {
            $script:unknownInstalledItems += [ordered]@{
                scope = $Scope
                tool = $Tool
                kind = $Kind
                name = $dir.Name
                projectPath = $ProjectPath
                path = $dir.FullName
                reason = 'source directory not found in this repository'
            }
        }
    }
    return @($names | Sort-Object)
}

function Get-ProjectRoots {
    param([string[]]$RootValues)
    $resolved = @()
    foreach ($rootValue in $RootValues) {
        if ([string]::IsNullOrWhiteSpace($rootValue)) { continue }
        if ([System.IO.Path]::IsPathRooted($rootValue)) {
            $candidate = $rootValue
        } else {
            $candidate = Join-Path $RepoRoot $rootValue
        }
        if (Test-Path -LiteralPath $candidate) {
            $resolved += (Resolve-Path -LiteralPath $candidate).Path
        } else {
            $script:skippedProjects += [ordered]@{
                path = $candidate
                reason = 'project root does not exist'
            }
        }
    }
    return @($resolved | Sort-Object -Unique)
}

function Find-GitProjects {
    param(
        [string[]]$ProjectRoots,
        [int]$MaxDepth,
        [string[]]$ExcludeDirs,
        [bool]$SkipNestedRepos
    )
    $projects = New-Object System.Collections.ArrayList
    $excludeSet = New-NameSet -Names $ExcludeDirs
    foreach ($root in $ProjectRoots) {
        $queue = New-Object System.Collections.ArrayList
        [void]$queue.Add([ordered]@{ Path = $root; Depth = 0 })
        while ($queue.Count -gt 0) {
            $item = $queue[0]
            $queue.RemoveAt(0)
            $path = [string]$item.Path
            $depth = [int]$item.Depth
            $leaf = Split-Path -Leaf $path
            if ($excludeSet.ContainsKey($leaf)) { continue }
            $gitPath = Join-Path $path '.git'
            if (Test-Path -LiteralPath $gitPath) {
                Add-UniqueName -List $projects -Name ((Resolve-Path -LiteralPath $path).Path)
                if ($SkipNestedRepos) { continue }
            }
            if ($depth -ge $MaxDepth) { continue }
            foreach ($child in (Get-ChildItem -LiteralPath $path -Directory -ErrorAction SilentlyContinue)) {
                if (-not $excludeSet.ContainsKey($child.Name)) {
                    [void]$queue.Add([ordered]@{ Path = $child.FullName; Depth = ($depth + 1) })
                }
            }
        }
    }
    return @($projects | Sort-Object -Unique)
}

function Select-AvailablePolicyNames {
    param([string[]]$Names, [hashtable]$KnownNames, [string]$Kind, [string]$Context)
    $result = New-Object System.Collections.ArrayList
    foreach ($name in $Names) {
        if ($name -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
            $script:conflicts += [ordered]@{ context = $Context; name = $name; reason = 'invalid kebab-case name' }
            continue
        }
        if ($KnownNames.ContainsKey($name)) {
            Add-UniqueName -List $result -Name $name
        } else {
            $script:missingPolicyItems += [ordered]@{ context = $Context; kind = $Kind; name = $name; reason = 'source directory not found in this repository' }
        }
    }
    return @($result | Sort-Object)
}

$config = Get-Content -LiteralPath $ConfigFile -Raw | ConvertFrom-Json
if ($config.version -ne 1) { throw 'Install discovery config version must be 1.' }

$tools = Get-StringArrayProperty -Object $config -Name 'tools' -Context 'tools' -DefaultValue @('codex','claudeCode')
foreach ($tool in $tools) {
    if (@('codex','claudeCode') -notcontains $tool) { throw "Unsupported tool: $tool" }
}
$tools = Get-UniqueOrderedNames -Names $tools
if ($tools.Count -eq 0) { throw 'tools must include at least one tool.' }
$primaryWorkflowTool = $tools[0]

$projectRoots = Get-StringArrayProperty -Object $config -Name 'projectRoots' -Context 'projectRoots' -DefaultValue @()

$discovery = Get-PropertyValue -Object $config -Name 'projectDiscovery' -DefaultValue ([pscustomobject]@{})
$maxDepth = Get-NonNegativeIntValue -Value (Get-PropertyValue -Object $discovery -Name 'maxDepth' -DefaultValue $null) -Context 'projectDiscovery.maxDepth' -DefaultValue 4
$excludeDirs = Get-StringArrayProperty -Object $discovery -Name 'excludeDirs' -Context 'projectDiscovery.excludeDirs' -DefaultValue @('.git','node_modules','vendor','dist','build','target','.tmp','.cache','tmp','temp','.agent-routines','.codex','.claude')
$skipNestedRepos = Get-BoolValue -Value (Get-PropertyValue -Object $discovery -Name 'skipNestedRepos' -DefaultValue $null) -Context 'projectDiscovery.skipNestedRepos' -DefaultValue $true

$policy = Get-PropertyValue -Object $config -Name 'scopePolicy' -DefaultValue ([pscustomobject]@{})
$userLevelSkillsPolicy = Get-StringArrayProperty -Object $policy -Name 'userLevelSkills' -Context 'scopePolicy.userLevelSkills' -DefaultValue @()
$projectOnlySkillsPolicy = Get-StringArrayProperty -Object $policy -Name 'projectLevelOnlySkills' -Context 'scopePolicy.projectLevelOnlySkills' -DefaultValue @()
$userLevelWorkflowsPolicy = Get-StringArrayProperty -Object $policy -Name 'userLevelWorkflows' -Context 'scopePolicy.userLevelWorkflows' -DefaultValue @()
$projectDefaultWorkflowsPolicy = Get-StringArrayProperty -Object $policy -Name 'projectDefaultWorkflows' -Context 'scopePolicy.projectDefaultWorkflows' -DefaultValue @()

$output = Get-PropertyValue -Object $config -Name 'output' -DefaultValue ([pscustomobject]@{})
$manifestPath = Resolve-OutputPath (Get-PropertyValue -Object $output -Name 'manifestPath' -DefaultValue '.agent-routines/generated/install.manifest.json')
$reportPath = Resolve-OutputPath (Get-PropertyValue -Object $output -Name 'reportPath' -DefaultValue '.agent-routines/generated/install.plan.json')

$install = Get-PropertyValue -Object $config -Name 'install' -DefaultValue ([pscustomobject]@{})
$validateBeforeInstall = Get-BoolValue -Value (Get-PropertyValue -Object $install -Name 'validateBeforeInstall' -DefaultValue $null) -Context 'install.validateBeforeInstall' -DefaultValue $true
$verifyAfterInstall = Get-BoolValue -Value (Get-PropertyValue -Object $install -Name 'verifyAfterInstall' -DefaultValue $null) -Context 'install.verifyAfterInstall' -DefaultValue $true
$configForce = Get-BoolValue -Value (Get-PropertyValue -Object $install -Name 'force' -DefaultValue $null) -Context 'install.force' -DefaultValue $false
if ($configForce) { throw 'install.force cannot enable replacement from config; use the CLI -Force flag.' }

$availableSkills = New-NameSet -Names @((Get-ChildItem -LiteralPath $SkillSourceRoot -Directory | ForEach-Object { $_.Name }))
$availableWorkflows = New-NameSet -Names @((Get-ChildItem -LiteralPath $WorkflowSourceRoot -Directory | ForEach-Object { $_.Name }))

$script:unknownInstalledItems = @()
$script:missingPolicyItems = @()
$script:conflicts = @()
$script:skippedProjects = @()
$unclassifiedInstalledItems = @()
$scannedUserTargets = @()
$scannedProjectTargets = @()

$projectOnlySet = New-NameSet -Names $projectOnlySkillsPolicy
$userPolicySet = New-NameSet -Names $userLevelSkillsPolicy
$userWorkflowPolicySet = New-NameSet -Names $userLevelWorkflowsPolicy
foreach ($skill in $userLevelSkillsPolicy) {
    if ($projectOnlySet.ContainsKey($skill)) {
        $script:conflicts += [ordered]@{ context = 'scopePolicy'; name = $skill; reason = 'skill appears in both userLevelSkills and projectLevelOnlySkills; project-only wins' }
    }
}

$installedUserSkills = @{}
foreach ($tool in $tools) {
    $target = Get-SkillTargetRoot -ToolKey $tool -ProjectPath ''
    $scannedUserTargets += [ordered]@{ tool = $tool; kind = 'skill'; path = $target; exists = (Test-Path -LiteralPath $target) }
    $names = Get-InstalledKnownNames -Root $target -KnownNames $availableSkills -Scope 'user' -Tool $tool -Kind 'skill' -ProjectPath ''
    $installedUserSkills[$tool] = $names
    foreach ($name in $names) {
        if ($projectOnlySet.ContainsKey($name)) {
            $script:conflicts += [ordered]@{ context = "user.$tool.skills"; name = $name; reason = 'project-level-only skill is installed at user level' }
        } elseif (-not $userPolicySet.ContainsKey($name)) {
            $unclassifiedInstalledItems += [ordered]@{ scope = 'user'; tool = $tool; kind = 'skill'; name = $name; path = (Join-Path $target $name); reason = 'installed skill is not in userLevelSkills policy' }
        }
    }
}
$userWorkflowTarget = Get-WorkflowTargetRoot -ProjectPath ''
$scannedUserTargets += [ordered]@{ tool = 'shared'; kind = 'workflow'; path = $userWorkflowTarget; exists = (Test-Path -LiteralPath $userWorkflowTarget) }
$installedUserWorkflows = Get-InstalledKnownNames -Root $userWorkflowTarget -KnownNames $availableWorkflows -Scope 'user' -Tool 'shared' -Kind 'workflow' -ProjectPath ''
foreach ($name in $installedUserWorkflows) {
    if (-not $userWorkflowPolicySet.ContainsKey($name)) {
        $unclassifiedInstalledItems += [ordered]@{ scope = 'user'; tool = 'shared'; kind = 'workflow'; name = $name; path = (Join-Path $userWorkflowTarget $name); reason = 'installed workflow is not in userLevelWorkflows policy' }
    }
}

$userLevelSkills = Select-AvailablePolicyNames -Names @($userLevelSkillsPolicy | Where-Object { -not $projectOnlySet.ContainsKey($_) }) -KnownNames $availableSkills -Kind 'skill' -Context 'scopePolicy.userLevelSkills'
$userLevelWorkflows = Select-AvailablePolicyNames -Names $userLevelWorkflowsPolicy -KnownNames $availableWorkflows -Kind 'workflow' -Context 'scopePolicy.userLevelWorkflows'
$projectDefaultWorkflows = Select-AvailablePolicyNames -Names $projectDefaultWorkflowsPolicy -KnownNames $availableWorkflows -Kind 'workflow' -Context 'scopePolicy.projectDefaultWorkflows'

$resolvedProjectRoots = Get-ProjectRoots -RootValues $projectRoots
$projects = Find-GitProjects -ProjectRoots $resolvedProjectRoots -MaxDepth $maxDepth -ExcludeDirs $excludeDirs -SkipNestedRepos $skipNestedRepos

$manifest = [ordered]@{
    version = 1
    user = [ordered]@{}
    projects = @()
}
foreach ($tool in $tools) {
    $block = [ordered]@{}
    if ($userLevelSkills.Count -gt 0) { $block.skills = @($userLevelSkills) }
    if ($tool -eq $primaryWorkflowTool -and $userLevelWorkflows.Count -gt 0) { $block.workflows = @($userLevelWorkflows) }
    $manifest.user[$tool] = $block
}

$discoveredProjects = @()
foreach ($project in $projects) {
    $projectRecord = [ordered]@{ path = $project; tools = @{}; workflows = @(); hasProjectConfig = $false }
    $projectBlock = [ordered]@{ path = $project }
    $sharedWorkflowTarget = Get-WorkflowTargetRoot -ProjectPath $project
    $scannedProjectTargets += [ordered]@{ projectPath = $project; tool = 'shared'; kind = 'workflow'; path = $sharedWorkflowTarget; exists = (Test-Path -LiteralPath $sharedWorkflowTarget) }
    $projectWorkflows = Get-InstalledKnownNames -Root $sharedWorkflowTarget -KnownNames $availableWorkflows -Scope 'project' -Tool 'shared' -Kind 'workflow' -ProjectPath $project
    if ((Test-Path -LiteralPath $sharedWorkflowTarget) -or $projectWorkflows.Count -gt 0) { $projectRecord.hasProjectConfig = $true }

    $projectSkillsByTool = @{}
    foreach ($tool in $tools) {
        $skillTarget = Get-SkillTargetRoot -ToolKey $tool -ProjectPath $project
        $scannedProjectTargets += [ordered]@{ projectPath = $project; tool = $tool; kind = 'skill'; path = $skillTarget; exists = (Test-Path -LiteralPath $skillTarget) }
        $skills = Get-InstalledKnownNames -Root $skillTarget -KnownNames $availableSkills -Scope 'project' -Tool $tool -Kind 'skill' -ProjectPath $project
        if ((Test-Path -LiteralPath $skillTarget) -or $skills.Count -gt 0) { $projectRecord.hasProjectConfig = $true }
        $projectSkillsByTool[$tool] = @($skills)
        $projectRecord.tools[$tool] = @{ skills = @($skills) }
    }

    $workflowList = New-Object System.Collections.ArrayList
    foreach ($wf in $projectWorkflows) { Add-UniqueName -List $workflowList -Name $wf }
    if ($projectRecord.hasProjectConfig) {
        foreach ($wf in $projectDefaultWorkflows) { Add-UniqueName -List $workflowList -Name $wf }
    }

    foreach ($tool in $tools) {
        $skills = @($projectSkillsByTool[$tool])
        $toolBlock = [ordered]@{}
        if ($skills.Count -gt 0) { $toolBlock.skills = @($skills) }
        if ($tool -eq $primaryWorkflowTool -and $workflowList.Count -gt 0) {
            $toolBlock.workflows = @($workflowList | Sort-Object)
        }
        if ($toolBlock.Count -gt 0) { $projectBlock[$tool] = $toolBlock }
    }

    $projectRecord.workflows = @($workflowList | Sort-Object)
    $discoveredProjects += $projectRecord
    if ($projectBlock.Count -gt 1) {
        $manifest.projects += $projectBlock
    }
}

$commands = @()
$generatorCommand = ".\tools\generate-install-manifest.ps1 -ConfigPath `"$ConfigFile`""
if ($WriteManifest) { $generatorCommand += ' -WriteManifest' }
if ($Apply) { $generatorCommand += ' -Apply' }
if ($Force) { $generatorCommand += ' -Force' }
$commands += $generatorCommand
if ($WriteManifest) { $commands += ".\tests\validate-manifest.ps1 -ManifestPath `"$manifestPath`"" }
if ($Apply) {
    foreach ($tool in $tools) {
        $adapterCommand = ".\adapters\$(Get-AdapterName $tool)\install-manifest.ps1 -ManifestPath `"$manifestPath`""
        if ($Force) { $adapterCommand += ' -Force' }
        $commands += $adapterCommand
    }
}

$plan = [ordered]@{
    discoveredProjects = $discoveredProjects
    scannedUserTargets = $scannedUserTargets
    scannedProjectTargets = $scannedProjectTargets
    generatedManifest = $manifest
    unknownInstalledItems = $script:unknownInstalledItems
    unclassifiedInstalledItems = $unclassifiedInstalledItems
    missingPolicyItems = $script:missingPolicyItems
    conflicts = $script:conflicts
    skippedProjects = $script:skippedProjects
    installPlan = [ordered]@{
        dryRun = (-not $WriteManifest)
        writeManifest = $WriteManifest.IsPresent
        apply = $Apply.IsPresent
        force = $Force.IsPresent
        primaryWorkflowTool = $primaryWorkflowTool
        manifestPath = $manifestPath
        reportPath = $reportPath
        tools = $tools
        validateBeforeInstall = $validateBeforeInstall
        verifyAfterInstall = $verifyAfterInstall
    }
    commandsToRun = $commands
}

$planJson = $plan | ConvertTo-Json -Depth 30
Write-Output $planJson

if ($WriteManifest) {
    $manifestParent = Split-Path -Parent $manifestPath
    if (-not (Test-Path -LiteralPath $manifestParent)) { New-Item -ItemType Directory -Path $manifestParent -Force | Out-Null }
    Write-Utf8NoBomFile -Path $manifestPath -Text ($manifest | ConvertTo-Json -Depth 30)

    $reportParent = Split-Path -Parent $reportPath
    if (-not (Test-Path -LiteralPath $reportParent)) { New-Item -ItemType Directory -Path $reportParent -Force | Out-Null }
    Write-Utf8NoBomFile -Path $reportPath -Text $planJson
}

if ($WriteManifest -and $validateBeforeInstall) {
    & (Join-Path $RepoRoot 'tests\validate-manifest.ps1') -ManifestPath $manifestPath
}

if ($Apply) {
    foreach ($tool in $tools) {
        $adapter = Join-Path $RepoRoot ("adapters\$(Get-AdapterName $tool)\install-manifest.ps1")
        & $adapter -ManifestPath $manifestPath -Force:$Force
    }
    if ($verifyAfterInstall) {
        foreach ($tool in $tools) {
            & (Join-Path $RepoRoot ("adapters\$(Get-AdapterName $tool)\check-user.ps1"))
        }
        foreach ($project in $manifest.projects) {
            foreach ($tool in $tools) {
                & (Join-Path $RepoRoot ("adapters\$(Get-AdapterName $tool)\check-project.ps1")) -ProjectPath $project.path
            }
        }
    }
}
