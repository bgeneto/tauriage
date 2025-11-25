# Building MSI and Setup EXE for TauriAge (Tauri 2.0)

## Prerequisites

### 1. Install Required Windows Build Tools

#### Option A: Automatic (Recommended)
```powershell
# Run as Administrator
winget install Microsoft.VisualStudio.Community
```
During installation, select "Desktop development with C++" workload.

#### Option B: Manual
- Download Visual Studio Community from: https://visualstudio.microsoft.com/
- Install with "Desktop development with C++" workload
- This installs MSVC compiler and Windows SDK needed for Tauri builds

### 2. Install WiX Toolset (Required for MSI generation)
```powershell
# Run as Administrator
winget install WiX.Toolset
```

Or download from: https://github.com/wixtoolset/wix3/releases

### 3. Verify Rust is up to date
```powershell
rustup update
rustc --version
cargo --version
```

### 4. Verify Node.js
```powershell
node --version
npm --version
```

## Building the Installer

### Step 1: Install Dependencies
```powershell
cd c:\Users\bernh\Documents\GitHub\TauriAge
npm install
cd src-tauri
cargo build --release
cd ..
```

### Step 2: Build Frontend
```powershell
npm run build
```

This creates the `dist/` folder with optimized frontend assets.

### Step 3: Bundle MSI and Setup EXE

Run the full build and bundle command:
```powershell
npm run tauri build
```

This will:
- Compile Rust backend in release mode
- Bundle frontend assets
- Generate MSI installer (`TauriAge_0.1.0_x64_en-US.msi`)
- Generate NSIS setup EXE (`TauriAge_0.1.0_x64-setup.exe`)

### Step 4: Locate the Installers

After successful build, find the installers in:
```
src-tauri/target/release/bundle/
├── msi/
│   └── TauriAge_0.1.0_x64_en-US.msi
└── nsis/
    └── TauriAge_0.1.0_x64-setup.exe
```

## Build Output Explained

| File | Description |
|------|-------------|
| `TauriAge_0.1.0_x64_en-US.msi` | Windows Installer (MSI format) - recommended for enterprise/automatic deployment |
| `TauriAge_0.1.0_x64-setup.exe` | NSIS Setup Executable - traditional Windows installer with wizard |

## Customizing the Installer

### MSI Configuration (WiX)
Edit `src-tauri/tauri.conf.json`:
```json
"bundle": {
  "windows": {
    "wix": {
      "productName": "TauriAge",
      "description": "Age file encryption desktop application",
      "dialogImagePath": "path/to/dialog.bmp",  // 493x312 pixels
      "bannerPath": "path/to/banner.bmp"        // 493x58 pixels
    }
  }
}
```

### NSIS Configuration
Edit `src-tauri/tauri.conf.json`:
```json
"bundle": {
  "windows": {
    "nsis": {
      "installerIcon": "icons/icon.ico",
      "uninstallerIcon": "icons/icon.ico",
      "headerImage": "path/to/header.bmp",      // 150x57 pixels
      "sidebarImage": "path/to/sidebar.bmp"     // 164x314 pixels
    }
  }
}
```

## Troubleshooting

### "WiX not found" Error
```powershell
# Reinstall WiX
winget uninstall WiX.Toolset
winget install WiX.Toolset

# Or manually add WiX to PATH:
$env:Path += ";C:\Program Files (x86)\WiX Toolset v3.11\bin"
```

### "MSVC compiler not found" Error
```powershell
# Install the required build tools
rustup target add x86_64-pc-windows-msvc
cargo build --release --target x86_64-pc-windows-msvc
```

### "Cannot find cargo" or "cannot find npm"
Ensure paths are in system PATH:
- Node.js: `C:\Program Files\nodejs\`
- Rust: `C:\Users\<username>\.cargo\bin\`

Restart terminal after installing tools.

### Build is very slow
- First build creates debug/release artifacts (~30-60 minutes)
- Subsequent builds are faster (~5-10 minutes)
- Ensure you have at least 5GB free disk space
- Close other applications to free RAM

## Release Build Checklist

Before building for distribution:

- [ ] Update version in `package.json`
- [ ] Update version in `src-tauri/Cargo.toml`
- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] Update `CHANGELOG.md` with new features/fixes
- [ ] Test app thoroughly in dev mode (`npm run tauri dev`)
- [ ] Verify all features work (key generation, encryption, decryption, clipboard)
- [ ] Run frontend build: `npm run build`
- [ ] Run full build: `npm run tauri build`
- [ ] Test both installers:
  - Install MSI: `msiexec /i TauriAge_0.1.0_x64_en-US.msi`
  - Install EXE: `TauriAge_0.1.0_x64-setup.exe`
  - Test installed application functionality
  - Verify uninstall works cleanly
  
## Code Signing (Optional but Recommended)

For production releases, code sign your executables:

```powershell
# Sign MSI
signtool sign /f certificate.pfx /p password /t http://timestamp.server.com TauriAge_0.1.0_x64_en-US.msi

# Sign Setup EXE
signtool sign /f certificate.pfx /p password /t http://timestamp.server.com TauriAge_0.1.0_x64-setup.exe
```

Requires:
- Code signing certificate (from DigiCert, Sectigo, etc.)
- Windows SDK tools (includes `signtool.exe`)

## References

- [Tauri Bundling Documentation](https://v2.tauri.app/features/bundling/)
- [WiX Toolset Documentation](https://wixtoolset.org/docs/)
- [NSIS Documentation](https://nsis.sourceforge.io/)
- [Tauri Windows Bundle Configuration](https://v2.tauri.app/reference/config/#windows)
