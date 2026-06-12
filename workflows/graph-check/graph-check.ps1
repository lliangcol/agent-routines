param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\graph-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'graph-check'
$OriginalLocation = Get-Location

function Get-AgentRoutineOs {
    if ($env:OS -eq 'Windows_NT') { return 'windows' }
    if ($IsMacOS) { return 'macos' }
    if ($IsLinux) { return 'linux' }
    return 'unknown'
}

function Add-Check { param([string]$Name, [bool]$Ok, [string]$Details) $script:Result.checks += [ordered]@{ name = $Name; ok = $Ok; details = $Details } }
function Add-Warning { param([string]$Message) $script:Result.warnings += $Message }
function Add-Error { param([string]$Message) $script:Result.errors += $Message }
function Add-CommandProbe { param([string]$Name) $cmd = Get-Command $Name -ErrorAction SilentlyContinue; Add-Check "command:$Name" ([bool]$cmd) $(if ($cmd) { $cmd.Source } else { 'Command not found.' }) }

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    Add-CommandProbe 'codebase-memory-mcp'
    foreach ($item in @('AGENTS.md','.mcp.json','.codex','.claude','graphify-out')) {
        Add-Check "graph-path:$item" (Test-Path -LiteralPath (Join-Path (Get-Location) $item)) 'Graph or MCP instruction path probe.'
    }
    $instructionHits = @()
    foreach ($file in @('AGENTS.md','CLAUDE.md','.CLAUDE.md')) {
        $pathToFile = Join-Path (Get-Location) $file
        if (Test-Path -LiteralPath $pathToFile) {
            $text = Get-Content -LiteralPath $pathToFile -Raw
            if ($text -match 'codebase-memory-mcp|search_graph|trace_path|get_code_snippet') { $instructionHits += $file }
        }
    }
    Add-Check 'graph-first-instructions' (@($instructionHits).Count -gt 0) $(if (@($instructionHits).Count -gt 0) { ($instructionHits -join ', ') } else { 'No graph-first repo instruction file found.' })
    Add-Warning 'This workflow does not register MCP servers, index repositories, install graph tools, or upload code.'
    Add-Warning 'Project indexing status must be confirmed through the active MCP graph tool when available; otherwise use targeted file inspection.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
