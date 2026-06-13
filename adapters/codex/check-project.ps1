param(
    [string]$ProjectPath = '.',
    [switch]$Help
)

$common = Join-Path $PSScriptRoot '..\common\check-install.ps1'
& $common -Tool codex -Scope project -ProjectPath $ProjectPath -Help:$Help
exit $LASTEXITCODE
