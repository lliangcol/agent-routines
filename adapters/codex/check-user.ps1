param([switch]$Help)

$common = Join-Path $PSScriptRoot '..\common\check-install.ps1'
& $common -Tool codex -Scope user -Help:$Help
exit $LASTEXITCODE
