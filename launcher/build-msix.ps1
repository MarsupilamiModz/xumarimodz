#Requires -Version 5.1
<#
.SYNOPSIS
  Build and sign XUMARI MODZ Launcher MSIX package.
.PARAMETER Configuration
  Debug or Release (default: Release)
.PARAMETER CertificatePath
  Path to .pfx for code signing (optional for local dev)
#>
param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    [string]$CertificatePath = "",
    [string]$CertificatePassword = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Project = Join-Path $Root "src\XumariModz.Launcher\XumariModz.Launcher.csproj"
$Output = Join-Path $Root "artifacts\msix"

Write-Host "==> Restoring packages..." -ForegroundColor Cyan
dotnet restore $Project

Write-Host "==> Building $Configuration..." -ForegroundColor Cyan
dotnet publish $Project -c $Configuration -r win-x64 `
    -p:PublishProfile=win-x64 `
    -p:GenerateAppxPackageOnBuild=true `
    -p:AppxPackageSigningEnabled=$(if ($CertificatePath) { "true" } else { "false" }) `
    $(if ($CertificatePath) { "-p:PackageCertificateKeyFile=$CertificatePath" }) `
    -o $Output

if ($CertificatePath -and (Test-Path $CertificatePath)) {
    Write-Host "==> Package signed with certificate" -ForegroundColor Green
} else {
    Write-Host "==> Unsigned package (dev). Use -CertificatePath for production signing." -ForegroundColor Yellow
}

Write-Host "==> Output: $Output" -ForegroundColor Green
Write-Host ""
Write-Host "Install: Add-AppxPackage -Path (Get-ChildItem $Output -Filter *.msix | Select-Object -First 1).FullName"
