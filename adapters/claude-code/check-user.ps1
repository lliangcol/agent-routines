param([switch]$Help)

$common = Join-Path $PSScriptRoot '..\common\check-install.ps1'
& $common -Tool claude-code -Scope user -Help:$Help
exit $LASTEXITCODE
