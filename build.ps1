# Build script for TauriAge Windows installers (MSI + Setup EXE)
# Run as: .\build.ps1 from project root

param(
    [switch]$SkipClean = $false,
    [switch]$VerboseOutput = $false
)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = $scriptPath

function Write-Step {
    param([string]$Message)
    Write-Host "`n" -ForegroundColor Black
    Write-Host "=== $Message ===" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

# Check prerequisites
Write-Step "Checking Prerequisites"

# Check Node.js
try {
    $nodeVersion = (node --version)
    Write-Success "Node.js found: $nodeVersion"
} catch {
    Write-Error-Custom "Node.js not found. Install from https://nodejs.org/"
}

# Check npm
try {
    $npmVersion = (npm --version)
    Write-Success "npm found: $npmVersion"
} catch {
    Write-Error-Custom "npm not found"
}

# Check Rust
try {
    $rustVersion = (rustc --version)
    Write-Success "Rust found: $rustVersion"
} catch {
    Write-Error-Custom "Rust not found. Install from https://rustup.rs/"
}

# Check Cargo
try {
    $cargoVersion = (cargo --version)
    Write-Success "Cargo found: $cargoVersion"
} catch {
    Write-Error-Custom "Cargo not found"
}

# Check WiX Toolset
Write-Host "`nChecking for WiX Toolset..."
$wixPath = @(
    "C:\Program Files (x86)\WiX Toolset v3.11\bin",
    "C:\Program Files (x86)\WiX Toolset v3.14\bin",
    "C:\Program Files\WiX Toolset v3.11\bin",
    "C:\Program Files\WiX Toolset v3.14\bin"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($wixPath) {
    Write-Success "WiX Toolset found: $wixPath"
    if ($env:Path -notlike "*$wixPath*") {
        $env:Path += ";$wixPath"
        Write-Host "  Added WiX to PATH"
    }
} else {
    Write-Host "⚠ WiX Toolset not found in standard locations" -ForegroundColor Yellow
    Write-Host "  Install with: winget install WiX.Toolset" -ForegroundColor Yellow
    Write-Host "  Or download: https://github.com/wixtoolset/wix3/releases" -ForegroundColor Yellow
}

# Check Visual Studio Build Tools
Write-Host "`nChecking for Visual Studio Build Tools..."
$vsPath = Get-Command cl.exe -ErrorAction SilentlyContinue
if ($vsPath) {
    Write-Success "MSVC compiler found"
} else {
    Write-Host "⚠ MSVC compiler not found" -ForegroundColor Yellow
    Write-Host "  Install with: winget install Microsoft.VisualStudio.Community" -ForegroundColor Yellow
    Write-Host "  Select 'Desktop development with C++' workload" -ForegroundColor Yellow
}

# Clean previous builds (optional)
if (-not $SkipClean) {
    Write-Step "Cleaning Previous Builds"
    if (Test-Path "src-tauri\target\release") {
        Remove-Item -Path "src-tauri\target\release" -Recurse -Force
        Write-Success "Cleaned Rust release artifacts"
    }
    if (Test-Path "dist") {
        Remove-Item -Path "dist" -Recurse -Force
        Write-Success "Cleaned frontend dist"
    }
}

# Install dependencies
Write-Step "Installing Dependencies"
try {
    npm install
    Write-Success "Frontend dependencies installed"
} catch {
    Write-Error-Custom "Failed to install frontend dependencies"
}

# Build frontend
Write-Step "Building Frontend"
try {
    npm run build
    Write-Success "Frontend built successfully"
} catch {
    Write-Error-Custom "Failed to build frontend"
}

# Build Tauri app (this will also bundle MSI + EXE)
Write-Step "Building Tauri Application and Installers"
Write-Host "This may take 5-30 minutes depending on your system..." -ForegroundColor Yellow
Write-Host ""

try {
    npm run tauri build
    Write-Success "Tauri build completed"
} catch {
    Write-Error-Custom "Tauri build failed"
}

# Verify output files
Write-Step "Verifying Installer Files"

$msiPath = Get-ChildItem -Path "src-tauri\target\release\bundle\msi\*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
$exePath = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($msiPath) {
    $msiSize = [math]::Round($msiPath.Length / 1MB, 2)
    Write-Success "MSI installer created: $($msiPath.Name) ($msiSize MB)"
} else {
    Write-Host "⚠ MSI installer not found" -ForegroundColor Yellow
}

if ($exePath) {
    $exeSize = [math]::Round($exePath.Length / 1MB, 2)
    Write-Success "Setup EXE created: $($exePath.Name) ($exeSize MB)"
} else {
    Write-Host "⚠ Setup EXE not found" -ForegroundColor Yellow
}

# Summary
Write-Step "Build Summary"
Write-Host "Location: $projectRoot\src-tauri\target\release\bundle\" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Write-Host "  • MSI (Windows Installer):  src-tauri\target\release\bundle\msi\"
Write-Host "  • Setup EXE (NSIS):         src-tauri\target\release\bundle\nsis\"
Write-Host ""
Write-Host "To test the installers:" -ForegroundColor Cyan
Write-Host "  • MSI:  msiexec /i <msi_file>"
Write-Host "  • EXE:  <exe_file>"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test the installers on a clean Windows system"
Write-Host "  2. Verify application functions correctly after installation"
Write-Host "  3. Test uninstall process"
Write-Host "  4. Sign installers with code certificate (optional)"
Write-Host "  5. Upload to distribution platform"
Write-Host ""

Write-Success "Build completed successfully!"
