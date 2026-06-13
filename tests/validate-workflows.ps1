param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\validate-workflows.ps1'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$workflowRoot = Join-Path $root 'workflows'
$errors = @()
$workflows = Get-ChildItem -LiteralPath $workflowRoot -Directory
foreach ($workflow in $workflows) {
    $name = $workflow.Name
    $required = @('README.md', "$name.ps1", "$name.sh", 'schema.json', 'examples/sample-output.json')
    foreach ($item in $required) {
        $path = Join-Path $workflow.FullName $item
        if (-not (Test-Path -LiteralPath $path)) { $errors += "Missing workflow file: $name/$item" }
    }
    $schemaPath = Join-Path $workflow.FullName 'schema.json'
    if (Test-Path -LiteralPath $schemaPath) {
        try {
            $schema = Get-Content -LiteralPath $schemaPath -Raw | ConvertFrom-Json
            if ($schema.properties.workflow.const -ne $name) {
                $errors += "Schema workflow const mismatch in ${name}: $($schema.properties.workflow.const)"
            }
            if ($schema.additionalProperties -ne $false) {
                $errors += "Schema top-level additionalProperties must be false in $name"
            }
        } catch {
            $errors += "Invalid schema JSON in ${name}: $($_.Exception.Message)"
        }
    }
    $sample = Join-Path $workflow.FullName 'examples/sample-output.json'
    if (Test-Path -LiteralPath $sample) {
        try {
            $json = Get-Content -LiteralPath $sample -Raw | ConvertFrom-Json
            $expected = @('ok','workflow','cwd','os','checks','warnings','errors')
            foreach ($prop in @('ok','workflow','cwd','os','checks','warnings','errors')) {
                if (-not ($json.PSObject.Properties.Name -contains $prop)) { $errors += "Sample missing property $prop in $name" }
            }
            $extra = @($json.PSObject.Properties.Name | Where-Object { $expected -notcontains $_ })
            if ($extra.Count -gt 0) { $errors += "Sample contains unexpected top-level properties in ${name}: $($extra -join ',')" }
            if ($json.workflow -ne $name) { $errors += "Sample workflow mismatch in ${name}: $($json.workflow)" }
        } catch {
            $errors += "Invalid sample JSON in ${name}: $($_.Exception.Message)"
        }
    }
}
if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}
Write-Host "validate-workflows: ok ($($workflows.Count) workflows checked)"
