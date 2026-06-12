param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\validate-structure.ps1'
    Write-Host 'Checks that every path listed in tests/required-paths.txt exists.'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$list = Join-Path $root 'tests/required-paths.txt'
if (-not (Test-Path -LiteralPath $list)) {
    Write-Error "Required path list not found: $list"
    exit 1
}
$missing = @()
$count = 0
foreach ($line in (Get-Content -LiteralPath $list)) {
    $item = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($item) -or $item.StartsWith('#')) { continue }
    $count++
    if (-not (Test-Path -LiteralPath (Join-Path $root $item))) { $missing += $item }
}
if ($missing.Count -gt 0) {
    Write-Error ("Missing required paths:`n" + ($missing -join "`n"))
    exit 1
}
Write-Host "validate-structure: ok ($count paths checked)"
