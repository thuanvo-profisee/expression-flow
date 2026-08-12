<#
.SYNOPSIS
    Builds expression-flow and deploys it to the IIS site folder.

.DESCRIPTION
    Runs `npm run build`, prunes the destination folder (except for any files
    named in -Keep), then copies the fresh dist output into it.

.PARAMETER Destination
    Target folder. Defaults to C:\inetpub\wwwroot\expression-flow.

.PARAMETER SkipBuild
    Deploy the existing dist/ folder without rebuilding.

.PARAMETER Keep
    File/folder names in the destination that must survive the prune.
    Defaults to web.config (IIS SPA rewrite rules).

.PARAMETER WhatIf
    Show what would be removed/copied without touching anything.

.EXAMPLE
    npm run deploy
.EXAMPLE
    pwsh -File scripts/deploy.ps1 -Destination D:\sites\ef -SkipBuild
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]   $Destination = 'C:\inetpub\wwwroot\expression-flow',
    [switch]   $SkipBuild,
    [string[]] $Keep = @('web.config')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$dist     = Join-Path $repoRoot 'dist'

# --- Guard rails: never prune something that isn't our deploy folder ---------
$Destination = [System.IO.Path]::GetFullPath($Destination)
if ($Destination -eq [System.IO.Path]::GetPathRoot($Destination)) {
    throw "Refusing to deploy to a drive root: $Destination"
}
if ($Destination.TrimEnd('\') -ieq 'C:\inetpub\wwwroot') {
    throw "Refusing to prune the IIS wwwroot itself: $Destination"
}

# --- Build ------------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Host "==> Building (npm run build)" -ForegroundColor Cyan
    Push-Location $repoRoot
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

if (-not (Test-Path -LiteralPath $dist)) {
    throw "Build output not found: $dist (run without -SkipBuild)"
}
if (-not (Get-ChildItem -LiteralPath $dist -Force)) {
    throw "Build output is empty: $dist"
}

# --- Prune ------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $Destination)) {
    Write-Host "==> Creating $Destination" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
} else {
    $stale = @(Get-ChildItem -LiteralPath $Destination -Force |
               Where-Object { $Keep -notcontains $_.Name })
    if ($stale) {
        Write-Host "==> Pruning $($stale.Count) item(s) from $Destination" -ForegroundColor Cyan
        foreach ($item in $stale) {
            Write-Verbose "    - $($item.Name)"
            Remove-Item -LiteralPath $item.FullName -Recurse -Force
        }
    } else {
        Write-Host "==> Destination already empty" -ForegroundColor Cyan
    }
    $kept = @(Get-ChildItem -LiteralPath $Destination -Force)
    if ($kept) { Write-Host "    kept: $($kept.Name -join ', ')" -ForegroundColor DarkGray }
}

# --- Copy -------------------------------------------------------------------
Write-Host "==> Copying dist -> $Destination" -ForegroundColor Cyan
Copy-Item -Path (Join-Path $dist '*') -Destination $Destination -Recurse -Force

$count = (Get-ChildItem -LiteralPath $Destination -Recurse -File -Force | Measure-Object).Count
Write-Host "==> Deployed $count file(s) to $Destination" -ForegroundColor Green
