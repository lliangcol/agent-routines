param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\validate-docs.ps1'
    Write-Host 'Checks bilingual doc pairing in docs/, catalog consistency, and examples coverage.'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$errors = @()

foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $root 'docs') -Filter '*.md' -File)) {
    if ($file.Name -like '*.zh-CN.md') {
        $en = $file.Name -replace '\.zh-CN\.md$', '.md'
        if (-not (Test-Path -LiteralPath (Join-Path $root "docs/$en"))) { $errors += "Missing English counterpart for docs/$($file.Name)" }
    } else {
        $zh = $file.Name -replace '\.md$', '.zh-CN.md'
        if (-not (Test-Path -LiteralPath (Join-Path $root "docs/$zh"))) { $errors += "Missing zh-CN counterpart for docs/$($file.Name)" }
    }
}

$staleDocPhrases = @(
    'Force Apply',
    'FORCE APPLY',
    'Plan JSON remains editable',
    'Inventory > 2 Targets',
    'Inventory, Targets, Policy',
    'Current Electron App discovery behavior',
    'generated project blocks',
    'current source repo'
)
foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $root 'docs') -Filter '*.md' -File)) {
    $text = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($phrase in $staleDocPhrases) {
        if ($text.Contains($phrase)) {
            $errors += "Stale doc phrase in docs/$($file.Name): $phrase"
        }
    }
}

# Recommended workflows per skill, parsed from SKILL.md (source of truth)
$rec = @{}
foreach ($skillDir in (Get-ChildItem -LiteralPath (Join-Path $root 'skills') -Directory)) {
    $skillMd = Join-Path $skillDir.FullName 'SKILL.md'
    if (-not (Test-Path -LiteralPath $skillMd)) { continue }
    $text = Get-Content -LiteralPath $skillMd -Raw
    $value = ''
    if ($text -match '(?m)^Recommended workflows:\s*(.+?)\s*$') { $value = $Matches[1] }
    if ([string]::IsNullOrWhiteSpace($value) -or $value.ToLowerInvariant().StartsWith('none')) {
        $rec[$skillDir.Name] = @()
    } else {
        $rec[$skillDir.Name] = @($value -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    }
}

$workflows = @(Get-ChildItem -LiteralPath (Join-Path $root 'workflows') -Directory | ForEach-Object { $_.Name } | Sort-Object)
$reverse = @{}
foreach ($workflow in $workflows) {
    $reverse[$workflow] = @($rec.Keys | Where-Object { $rec[$_] -contains $workflow } | Sort-Object)
}
foreach ($skill in ($rec.Keys | Sort-Object)) {
    foreach ($workflow in $rec[$skill]) {
        if ($workflows -notcontains $workflow) { $errors += "skills/$skill/SKILL.md recommends unknown workflow: $workflow" }
    }
}

function Format-NameList { param([string[]]$Names) return (($Names | ForEach-Object { '`' + $_ + '`' }) -join ', ') }

# zh-CN catalog placeholder cells, built from code points to keep this file ASCII-only
$zhNoneSkill = [string][char]0x65E0 + [string][char]0x9700 + ' workflow'
$zhNoneWf = [string][char]0x65E0

$catalogs = @(
    @{ Path = 'docs/catalog.md'; NoneSkill = 'None required'; NoneWf = 'None' },
    @{ Path = 'docs/catalog.zh-CN.md'; NoneSkill = $zhNoneSkill; NoneWf = $zhNoneWf }
)
foreach ($catalog in $catalogs) {
    $path = Join-Path $root $catalog.Path
    if (-not (Test-Path -LiteralPath $path)) {
        $errors += "Missing catalog file: $($catalog.Path)"
        continue
    }
    $section = $null
    $seenSkills = @()
    $seenWorkflows = @()
    foreach ($line in [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)) {
        if ($line.StartsWith('## ')) {
            if ($line -match 'Workflows') { $section = 'workflows' }
            elseif ($line -match 'Skills') { $section = 'skills' }
            else { $section = $null }
            continue
        }
        if (-not $line.StartsWith('| `')) { continue }
        $cells = $line -split '\|'
        $name = $cells[1].Trim().Trim('`')
        if ($section -eq 'skills') {
            if (-not $rec.ContainsKey($name)) { $errors += "$($catalog.Path): skills table row for unknown skill: $name"; continue }
            $seenSkills += $name
            $expected = if ($rec[$name].Count -gt 0) { Format-NameList $rec[$name] } else { $catalog.NoneSkill }
            $actual = $cells[3].Trim()
            if ($actual -cne $expected) { $errors += "$($catalog.Path): skill $name recommended-workflows column is '$actual', expected '$expected'" }
        } elseif ($section -eq 'workflows') {
            if (-not $reverse.ContainsKey($name)) { $errors += "$($catalog.Path): workflows table row for unknown workflow: $name"; continue }
            $seenWorkflows += $name
            $expected = if ($reverse[$name].Count -gt 0) { Format-NameList $reverse[$name] } else { $catalog.NoneWf }
            $actual = $cells[5].Trim()
            if ($actual -cne $expected) { $errors += "$($catalog.Path): workflow $name matching-skills column is '$actual', expected '$expected'" }
        }
    }
    foreach ($skill in ($rec.Keys | Where-Object { $seenSkills -notcontains $_ } | Sort-Object)) {
        $errors += "$($catalog.Path): missing skills table row: $skill"
    }
    foreach ($workflow in ($workflows | Where-Object { $seenWorkflows -notcontains $_ })) {
        $errors += "$($catalog.Path): missing workflows table row: $workflow"
    }
}

$examplesFiles = @('docs/examples.md', 'docs/examples.zh-CN.md')
foreach ($exampleFile in $examplesFiles) {
    $path = Join-Path $root $exampleFile
    if (-not (Test-Path -LiteralPath $path)) {
        $errors += "Missing examples file: $exampleFile"
        continue
    }
    $section = $null
    $seenSkills = @()
    $seenWorkflows = @()
    foreach ($line in [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)) {
        if ($line.StartsWith('## ')) {
            if ($line -match 'Workflow') { $section = 'workflows' }
            elseif ($line -match 'Skill') { $section = 'skills' }
            else { $section = $null }
            continue
        }
        if (-not $line.StartsWith('| `')) { continue }
        $cells = $line -split '\|'
        $name = $cells[1].Trim().Trim('`')
        if ($section -eq 'skills') {
            if (-not $rec.ContainsKey($name)) {
                $errors += "${exampleFile}: skill example row for unknown skill: $name"
                continue
            }
            $seenSkills += $name
        } elseif ($section -eq 'workflows') {
            if (-not ($workflows -contains $name)) {
                $errors += "${exampleFile}: workflow example row for unknown workflow: $name"
                continue
            }
            $seenWorkflows += $name
            $expectedPs = ".\workflows\$name\$name.ps1 -Path ."
            $expectedSh = "./workflows/$name/$name.sh --path ."
            $actualPs = $cells[2].Trim().Trim('`')
            $actualSh = $cells[3].Trim().Trim('`')
            if ($actualPs -cne $expectedPs) {
                $errors += "${exampleFile}: workflow $name PowerShell example is '$actualPs', expected '$expectedPs'"
            }
            if ($actualSh -cne $expectedSh) {
                $errors += "${exampleFile}: workflow $name Bash example is '$actualSh', expected '$expectedSh'"
            }
        }
    }
    foreach ($skill in ($rec.Keys | Where-Object { $seenSkills -notcontains $_ } | Sort-Object)) {
        $errors += "${exampleFile}: missing skill example row: $skill"
    }
    foreach ($workflow in ($workflows | Where-Object { $seenWorkflows -notcontains $_ })) {
        $errors += "${exampleFile}: missing workflow example row: $workflow"
    }
}

if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}
Write-Host 'validate-docs: ok (bilingual pairing, catalog consistency, and examples coverage)'
