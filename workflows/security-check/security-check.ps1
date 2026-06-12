param(
    [string]$Path = '.',
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\security-check.ps1 [-Path <path>]"
    Write-Host "Produces stable JSON and performs only readonly checks."
    exit 0
}

$ErrorActionPreference = 'Stop'
$WorkflowName = 'security-check'
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

function Get-RelativeDisplayPath {
    param([string]$Root, [string]$File)
    $trimmed = $Root.TrimEnd([char[]]@('\','/'))
    $prefix = $trimmed + [System.IO.Path]::DirectorySeparatorChar
    if ($File.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $File.Substring($prefix.Length)
    }
    return $File
}

$ResolvedPath = if (Test-Path -LiteralPath $Path) { (Resolve-Path -LiteralPath $Path).Path } else { $Path }
$script:Result = [ordered]@{ ok = $true; workflow = $WorkflowName; cwd = $ResolvedPath; os = Get-AgentRoutineOs; checks = @(); warnings = @(); errors = @() }

try {
    if (Test-Path -LiteralPath $Path) {
        Set-Location -LiteralPath $ResolvedPath
    } else {
        Add-Error "Path does not exist: $Path"
    }

    $secretPattern = "(?i)(api[_-]?key|access[_-]?token|secret|password|passwd|private[_-]?key)\s*[:=]\s*['""]?[A-Za-z0-9_./+=-]{12,}"
    $awsPattern = 'AKIA[0-9A-Z]{16}'
    $privateKeyPattern = '-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----'
    $privatePathPattern = '(?i)([A-Z]:\\Users\\[^\\]+\\Documents\\|[A-Z]:\\Work\\Projects\\|/home/[^/]+/private/)'

    $high = @()
    $manual = @()
    $files = Get-ChildItem -LiteralPath (Get-Location) -File -Recurse -ErrorAction SilentlyContinue | Where-Object {
        $_.FullName -notmatch '[\\/](\.git|node_modules|target|dist|build|__pycache__)([\\/]|$)' -and $_.Length -lt 1048576
    }
    foreach ($file in $files) {
        $relative = Get-RelativeDisplayPath -Root (Get-Location).Path -File $file.FullName
        try {
            $lineNo = 0
            foreach ($line in (Get-Content -LiteralPath $file.FullName -ErrorAction Stop)) {
                $lineNo += 1
                if ($line -match $secretPattern -or $line -match $awsPattern -or $line -match $privateKeyPattern) {
                    $high += "secret-like:$($relative):$lineNo"
                } elseif ($line -match $privatePathPattern) {
                    $manual += "private-path:$($relative):$lineNo"
                }
            }
        } catch {
            Add-Warning "Skipped unreadable file: $relative"
        }
    }

    Add-Check 'files-scanned' $true ("{0} files scanned, files over 1 MiB skipped." -f @($files).Count)
    Add-Check 'high-confidence-findings' (@($high).Count -eq 0) $(if (@($high).Count -gt 0) { (($high | Select-Object -First 20) -join '; ') } else { 'No high-confidence secret-like findings.' })
    Add-Check 'manual-review-findings' (@($manual).Count -eq 0) $(if (@($manual).Count -gt 0) { (($manual | Select-Object -First 20) -join '; ') } else { 'No private path findings.' })
    if (@($high).Count -gt 0) {
        Add-Error 'High-confidence sensitive patterns were found. Values are redacted; inspect the listed paths manually.'
    }
    if (@($manual).Count -gt 0) {
        Add-Warning 'Manual-review findings were found. Values are redacted; inspect the listed paths manually.'
    }
    Add-Warning 'This workflow does not delete files, rotate credentials, rewrite history, or publish results.'
} catch {
    Add-Error $_.Exception.Message
} finally {
    Set-Location $OriginalLocation
}

if ($Result.errors.Count -gt 0) { $Result.ok = $false }
$Result | ConvertTo-Json -Depth 8
if ($Result.ok) { exit 0 } else { exit 1 }
