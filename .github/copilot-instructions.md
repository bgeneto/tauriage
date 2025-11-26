# TauriAge Copilot Instructions

## Architecture Overview

**TauriAge** is a cross-platform age file encryption desktop application built with **Tauri 2.0** (Rust backend + TypeScript/React + Tailwind CSS v4 frontend with Vite).

### Core Components
- **Frontend** (`src/`): React+TS UI with 3 main tabs (Key Management, Encryption, Decryption)
- **Backend** (`src-tauri/src/`): Tauri commands bridging frontend to Rust encryption logic
- **Build**: Tauri manages frontend+backend bundling; `npm run tauri dev` runs both concurrently

### Key Modules

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **age.rs** | Age encryption/decryption & key derivation | `src-tauri/src/age.rs` |
| **key_storage.rs** | PBKDF2+AES256-GCM encrypted key vault | `src-tauri/src/key_storage.rs` |
| **commands.rs** | Tauri command handlers (IPC boundary) | `src-tauri/src/commands.rs` |
| **useKeyStore** | Frontend hook for key storage operations | `src/hooks/useKeyStore.ts` |
| **App/Tab Components** | UI for key mgmt, encryption, decryption | `src/components/{App,KeyManagement,Encryption,Decryption}Tab.tsx` |

## Data Flow

1. **Key Generation**: `generateAgeKeys()` → Rust binary → returns `AgeKeyPair`
2. **File Encryption**: Frontend selects files → `encryptFileCmd()` → Rust calls age binary → returns success/output path
3. **Key Storage**: Keys encrypted with passphrase (PBKDF2 derived key + AES-256-GCM) → saved to user home dir
4. **Decryption**: Similar to encryption but uses private key identity

## Critical Developer Workflows

### Setup & First Run
```bash
cd src-tauri && cargo check          # Verify Rust builds
npm install                          # Install frontend deps
npm run tauri dev                    # Start dev server (Vite + Tauri)
```

### Building
- **Dev**: `npm run tauri dev` (hot reload for frontend, rebuild Rust on change)
- **Production**: `npm run build && npm run tauri build` (creates bundled executable)

### Testing Rust Backend
```bash
cd src-tauri
cargo check                          # Quick compile check
cargo build                          # Build debug binary
```

### Common Issues
- **"cargo check" fails**: Check `src-tauri/Cargo.toml` dependencies (age, aes-gcm, pbkdf2 versions)
- **"tauri dev" fails**: Ensure Vite port 1420 is free; Rust backend must build successfully first
- **Type mismatches**: Frontend types in `src/types/index.ts` must mirror Rust structs (use camelCase in TS, snake_case in Rust with `#[serde(rename_all)]`)

## Key Patterns & Conventions

### Tauri Commands (IPC)
- All backend operations exposed via `#[tauri::command]` functions in `commands.rs`
- Frontend calls via `invoke('command_name', {args})`  — see `useKeyStore.ts` for pattern
- Return `Result<T, String>` from Rust; errors become rejection in TS
- Example: `encrypt_file_cmd()` takes file paths + recipients, returns `EncryptionResult`

### Type Alignment
- Rust uses `snake_case` fields with `#[serde(rename_all = "camelCase")]` for JSON serialization
- TypeScript uses `camelCase` interfaces (e.g., `publicKey`, `privateKey`)
- Mismatch causes silent deserialization failures

### Key Storage Security
- Keys stored encrypted at `~/.config/TauriAge/` (configurable path)
- Passphrase → PBKDF2 (100k iterations, SHA-256) → AES-256-GCM encryption
- **Note**: Not production-ready; consider age itself for key storage in future

### File Operations
- Use Tauri plugin APIs: `tauri_plugin_fs` for file access, `tauri_plugin_dialog` for file dialogs
- Paths must be absolute; relative paths fail due to sandboxing
- Clipboard integration: requires `tauri_plugin_clipboard_manager`

## When Adding Features

1. **Define Rust types** in `age.rs` or `key_storage.rs` with proper serde attributes
2. **Add Tauri command** in `commands.rs`
3. **Create TS interfaces** in `src/types/index.ts`
4. **Add hook** in `src/hooks/` if it's stateful (pattern: `useKeyStore.ts`)
5. **Build component** in `src/components/` using hook or direct `invoke()` calls
6. **Update App.tsx tabs** if it's a major feature

## Dependency Notes
- **age 0.10**: Binary wrapper for age encryption; requires age CLI installed on system
- **aes-gcm + pbkdf2**: For key storage passphrase encryption (not production-grade)
- **Tauri 2.x**: Uses new plugin system; older Tauri docs may not apply
- **React 18.3**: Minimal setup; no routing/state management (keep simple for now)
