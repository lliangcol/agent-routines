param(
    [string]$ManifestPath = '',
    [switch]$Force,
    [ValidateSet('dry-run','merge','replace-listed','sync-prune')]
    [string]$Mode = 'merge',
    [switch]$WhatIf,
    [switch]$Help
)

$common = Join-Path $PSScriptRoot '..\common\install-manifest.ps1'
& $common -Tool claude-code -ManifestPath $ManifestPath -Force:$Force -Mode $Mode -WhatIf:$WhatIf -Help:$Help
