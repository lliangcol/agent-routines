param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\validate-skills.ps1'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$skillRoot = Join-Path $root 'skills'
$errors = @()
$skills = Get-ChildItem -LiteralPath $skillRoot -Directory
foreach ($skill in $skills) {
    $skillMd = Join-Path $skill.FullName 'SKILL.md'
    $readme = Join-Path $skill.FullName 'README.md'
    if (-not (Test-Path -LiteralPath $skillMd)) { $errors += "Missing SKILL.md: $($skill.Name)"; continue }
    if (-not (Test-Path -LiteralPath $readme)) { $errors += "Missing README.md: $($skill.Name)" }
    $text = Get-Content -LiteralPath $skillMd -Raw
    if ($text -notmatch '(?s)^---\s*\r?\n(.*?)\r?\n---') { $errors += "Missing YAML frontmatter: $($skill.Name)"; continue }
    $front = $Matches[1]
    $name = if ($front -match '(?m)^name:\s*([a-z0-9-]+)\s*$') { $Matches[1] } else { '' }
    $description = if ($front -match '(?m)^description:\s*(.+?)\s*$') { $Matches[1] } else { '' }
    if ([string]::IsNullOrWhiteSpace($name)) { $errors += "Missing name: $($skill.Name)" }
    if ($name -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') { $errors += "Invalid kebab-case name: $name" }
    if (($name -match '(claude|anthropic|<|>|\s)') -or ($name -cmatch '[A-Z]')) { $errors += "Forbidden token in name: $name" }
    if ([string]::IsNullOrWhiteSpace($description)) { $errors += "Missing description: $($skill.Name)" }
    if ($description.Length -gt 1024) { $errors += "Description too long: $($skill.Name)" }
    if ($front -notmatch '(?m)^os:\s*cross-platform\s*$') { $errors += "Missing os: cross-platform: $($skill.Name)" }
}
if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}
Write-Host "validate-skills: ok ($($skills.Count) skills checked)"
