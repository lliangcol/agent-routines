param(
    [string]$ManifestPath = '',
    [switch]$Force,
    [switch]$Help
)

$common = Join-Path $PSScriptRoot '..\common\install-manifest.ps1'
& $common -Tool codex -ManifestPath $ManifestPath -Force:$Force -Help:$Help
