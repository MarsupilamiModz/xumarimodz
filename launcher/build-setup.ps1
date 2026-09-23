#Requires -Version 5.1
<#
.SYNOPSIS
  Build XUMARI_MODZ_Setup.exe via Inno Setup 6.
.PARAMETER Configuration
  Debug or Release (default: Release)
.PARAMETER InnoSetupPath
  Path to ISCC.exe (auto-detected if omitted)
#>
param(
    [ValidateSet("Debug", "Release")]
    [string]$Configuration = "Release",
    [string]$InnoSetupPath = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Project = Join-Path $Root "src\XumariModz.Launcher\XumariModz.Launcher.csproj"
$PublishDir = Join-Path $Root "artifacts\publish"
$SetupScript = Join-Path $Root "installer\XUMARI_MODZ_Setup.iss"
$SetupOut = Join-Path $Root "artifacts\setup"

Write-Host "==> Restoring packages..." -ForegroundColor Cyan
dotnet restore $Project

Write-Host "==> Publishing launcher ($Configuration)..." -ForegroundColor Cyan
dotnet publish $Project -c $Configuration -r win-x64 `
    -p:SelfContained=true `
    -p:PublishSingleFile=false `
    -p:WindowsPackageType=None `
    -o $PublishDir

Write-Host "==> Building MSIX (optional bundle)..." -ForegroundColor Cyan
try {
    & (Join-Path $Root "build-msix.ps1") -Configuration $Configuration
} catch {
    Write-Host "    MSIX build skipped (non-fatal): $_" -ForegroundColor Yellow
}

if (-not $InnoSetupPath) {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "$env:ProgramFiles\Inno Setup 6\ISCC.exe"
    )
    $InnoSetupPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $InnoSetupPath -or -not (Test-Path $InnoSetupPath)) {
    Write-Host ""
    Write-Host "Inno Setup 6 not found. Install from https://jrsoftware.org/isinfo.php" -ForegroundColor Yellow
    Write-Host "Published files are ready at: $PublishDir" -ForegroundColor Green
    Write-Host "Run manually: ISCC.exe `"$SetupScript`"" -ForegroundColor Yellow
    exit 0
}

Write-Host "==> Compiling Setup.exe..." -ForegroundColor Cyan
& $InnoSetupPath $SetupScript

$setupExe = Get-ChildItem $SetupOut -Filter "XUMARI_MODZ_Setup*.exe" | Select-Object -First 1
if ($setupExe) {
    Write-Host ""
    Write-Host "Setup ready: $($setupExe.FullName)" -ForegroundColor Green
    Write-Host "Size: $([math]::Round($setupExe.Length / 1MB, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "Setup compilation finished — check $SetupOut" -ForegroundColor Yellow
}
