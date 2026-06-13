param([switch]$Help)
if ($Help) {
    Write-Host 'Usage: .\tests\validate-changelog.ps1'
    Write-Host 'Checks that CHANGELOG.md version headings and vX.Y.Z git tags stay consistent.'
    Write-Host 'The newest CHANGELOG entry may be untagged (release pending); every older entry'
    Write-Host 'must have a matching tag, and every vX.Y.Z tag must have a CHANGELOG entry.'
    exit 0
}
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$changelog = Join-Path $root 'CHANGELOG.md'
$errors = @()

if (-not (Test-Path -LiteralPath $changelog)) {
    Write-Error "CHANGELOG.md not found at $changelog"
    exit 1
}

$versions = @()
foreach ($line in (Get-Content -LiteralPath $changelog)) {
    if ($line -notmatch '^## ') { continue }
    if ($line -match '^## ([0-9]+\.[0-9]+\.[0-9]+) - [0-9]{4}-[0-9]{2}-[0-9]{2}$') {
        $version = $Matches[1]
        if ($versions -contains $version) {
            $errors += "Duplicate CHANGELOG version heading: $version"
        }
        $versions += $version
    } else {
        $errors += "Malformed CHANGELOG heading (expected '## X.Y.Z - YYYY-MM-DD'): $line"
    }
}

if ($versions.Count -eq 0) {
    $errors += 'CHANGELOG.md contains no version headings.'
}

$tagCount = 0
$gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
$insideWorkTree = $false
if ($gitAvailable) {
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        git -C $root rev-parse --is-inside-work-tree 2>$null | Out-Null
        $insideWorkTree = ($LASTEXITCODE -eq 0)
    } finally {
        $ErrorActionPreference = $oldPreference
    }
}
if (-not $gitAvailable) {
    Write-Host 'validate-changelog: warning: git not available; skipped tag consistency check.'
} elseif (-not $insideWorkTree) {
    Write-Host 'validate-changelog: warning: not a git work tree; skipped tag consistency check.'
} else {
    $tags = @(git -C $root tag -l 'v[0-9]*' | Where-Object { $_ -ne '' })
    $tagCount = $tags.Count

    for ($index = 0; $index -lt $versions.Count; $index++) {
        $version = $versions[$index]
        if ($index -ne 0 -and ($tags -notcontains "v$version")) {
            $errors += "CHANGELOG version $version has no matching git tag v$version"
        }
    }

    foreach ($tag in $tags) {
        if ($tag -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
            $errors += "Tag $tag does not follow the vX.Y.Z format"
            continue
        }
        $version = $tag.Substring(1)
        if ($versions -notcontains $version) {
            $errors += "Git tag $tag has no matching CHANGELOG version heading $version"
        }
    }
}

if ($errors.Count -gt 0) {
    Write-Error ($errors -join "`n")
    exit 1
}
Write-Host "validate-changelog: ok ($($versions.Count) versions, $tagCount tags checked)"
