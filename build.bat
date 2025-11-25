@echo off
REM Build script for TauriAge Windows installers (MSI + Setup EXE)
REM Run as: build.bat from project root

setlocal enabledelayedexpansion

echo.
echo ===============================================
echo TauriAge Windows Installer Builder
echo ===============================================
echo.

REM Check prerequisites
echo Checking Prerequisites...
echo.

REM Check Node.js
where /q node
if %errorlevel% neq 0 (
    echo X Node.js not found. Install from https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check npm
where /q npm
if %errorlevel% neq 0 (
    echo X npm not found
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%

REM Check Rust
where /q rustc
if %errorlevel% neq 0 (
    echo X Rust not found. Install from https://rustup.rs/
    exit /b 1
)
for /f "tokens=*" %%i in ('rustc --version') do set RUST_VERSION=%%i
echo [OK] Rust found: %RUST_VERSION%

REM Check Cargo
where /q cargo
if %errorlevel% neq 0 (
    echo X Cargo not found
    exit /b 1
)
for /f "tokens=*" %%i in ('cargo --version') do set CARGO_VERSION=%%i
echo [OK] Cargo found: %CARGO_VERSION%

echo.
echo ===============================================
echo Installing Dependencies
echo ===============================================
echo.
call npm install
if %errorlevel% neq 0 (
    echo X Failed to install dependencies
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo ===============================================
echo Building Frontend
echo ===============================================
echo.
call npm run build
if %errorlevel% neq 0 (
    echo X Failed to build frontend
    exit /b 1
)
echo [OK] Frontend built successfully

echo.
echo ===============================================
echo Building Tauri Application and Installers
echo ===============================================
echo.
echo This may take 5-30 minutes depending on your system...
echo.
call npm run tauri build
if %errorlevel% neq 0 (
    echo X Tauri build failed
    exit /b 1
)
echo [OK] Tauri build completed

echo.
echo ===============================================
echo Build Summary
echo ===============================================
echo.
echo Installer files location:
echo   %cd%\src-tauri\target\release\bundle\
echo.
echo Files created:
if exist "src-tauri\target\release\bundle\msi\*.msi" (
    echo   [OK] MSI installer (Windows Installer)
    echo        src-tauri\target\release\bundle\msi\
) else (
    echo   [!] MSI installer not found
)
if exist "src-tauri\target\release\bundle\nsis\*.exe" (
    echo   [OK] Setup EXE (NSIS)
    echo        src-tauri\target\release\bundle\nsis\
) else (
    echo   [!] Setup EXE not found
)
echo.
echo To test the installers:
echo   - MSI:  msiexec /i ^<msi_file^>
echo   - EXE:  ^<exe_file^>
echo.
echo Next steps:
echo   1. Test the installers on a clean Windows system
echo   2. Verify application functions correctly after installation
echo   3. Test uninstall process
echo   4. Sign installers with code certificate (optional)
echo   5. Upload to distribution platform
echo.
echo [OK] Build completed successfully!
echo.
pause
