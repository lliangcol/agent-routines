param(
    [string]$ManifestPath = '',
    [switch]$Force,
    [switch]$WhatIf,
    [switch]$Help
)

$common = Join-Path $PSScriptRoot '..\common\install-manifest.ps1'
& $common -Tool claude-code -ManifestPath $ManifestPath -Force:$Force -WhatIf:$WhatIf -Help:$Help
