# Age File Encryption Tool - Tauri Implementation Plan

## Overview

This document outlines the implementation plan for building a cross-platform desktop application for file encryption using the age tool. The application will provide a GUI for:

1. Key management (generate, import, export SSH keys)
2. File encryption with public keys
3. File decryption with private keys
4. Password-protected key storage
5. Clipboard integration for SSH keys

Built with Tauri 2.0 (Rust backend, TypeScript/Vite frontend).

## Types

### Rust Backend Types

```rust
#[derive(Serialize, Deserialize)]
pub struct AgeKeyPair {
    pub public_key: String,
    pub private_key: String,
    pub comment: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct EncryptionResult {
    pub success: bool,
    pub input_file: String,
    pub output_file: String,
    pub public_keys: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DecryptionResult {
    pub success: bool,
    pub input_file: String,
    pub output_file: String,
    pub identity: String,
}

#[derive(Serialize, Deserialize)]
pub struct StoredKey {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub private_key: Option<String>, // None for public-only keys
    pub comment: Option<String>,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize)]
pub struct KeyStorage {
    pub keys: Vec<StoredKey>,
    pub version: u32,
}
```

### Frontend Types

```typescript
export interface AgeKeyPair {
  publicKey: string;
  privateKey: string;
  comment?: string;
}

export interface EncryptionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  publicKeys: string[];
}

export interface DecryptionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  identity: string;
}

export interface StoredKey {
  id: string;
  name: string;
  publicKey: string;
  privateKey?: string;
  comment?: string;
  createdAt: number;
}

export interface EncryptedKeyEntry {
  id: string;
  name: string;
  publicKey: string;
  comment?: string;
  createdAt: number;
  encryptedPrivateKey?: string; // encrypted with passphrase
}
```

## Files

### New Rust Files
- `src-tauri/src/age.rs` - Age CLI operations
- `src-tauri/src/key_storage.rs` - Encrypted key storage
- `src-tauri/src/commands.rs` - Tauri commands for UI

### Modified Rust Files
- `src-tauri/src/lib.rs` - Updated with new commands and plugins

### New TypeScript Files
- `src/types/index.ts` - Shared types
- `src/components/KeyManagement.tsx` - Key management tab
- `src/components/Encryption.tsx` - File encryption tab
- `src/components/Decryption.tsx` - File decryption tab
- `src/components/ClipboardImport.tsx` - SSH key clipboard import
- `src/components/KeyStore.tsx` - Password-protected key storage
- `src/components/FilePicker.tsx` - File selection component
- `src/hooks/useAge.ts` - Age operations hook
- `src/hooks/useKeyStore.ts` - Key storage hook
- `src/utils/clipboard.ts` - Clipboard utilities
- `src/utils/file.ts` - File utilities

### Modified TypeScript Files
- `src/main.ts` - Updated with new UI
- `src/styles.css` - Updated styles for the new UI

## Functions

### Rust Backend Functions

```rust
// age.rs
pub fn generate_keypair(comment: Option<&str>) -> Result<AgeKeyPair, String>;
pub fn encrypt_file(input: &str, output: &str, recipients: &[String]) -> Result<(), String>;
pub fn decrypt_file(input: &str, output: &str, identity: &str) -> Result<(), String>;
pub fn derive_public_from_ssh(ssh_pubkey: &str) -> Result<String, String>;

// key_storage.rs
pub fn create_passphrase_encrypted_container(passphrase: &str, keys: &[StoredKey]) -> Result<Vec<u8>, String>;
pub fn decrypt_passphrase_container(passphrase: &str, encrypted_data: &[u8]) -> Result<Vec<StoredKey>, String>;

// commands.rs
#[tauri::command]
pub fn generate_age_keys(comment: Option<String>) -> Result<AgeKeyPair, String>;

#[tauri::command]
pub fn encrypt_file_cmd(input_file: String, output_file: String, recipients: Vec<String>) -> Result<EncryptionResult, String>;

#[tauri::command]
pub fn decrypt_file_cmd(input_file: String, output_file: String, identity: String) -> Result<DecryptionResult, String>;

#[tauri::command]
pub fn paste_ssh_key_from_clipboard() -> Result<String, String>;

#[tauri::command]
pub fn derive_public_key_from_ssh(ssh_pubkey: String) -> Result<String, String>;
```

### Frontend Functions

```typescript
// useAge.ts
export const useGenerateKeys = () => { /* ... */ };
export const useEncryptFile = () => { /* ... */ };
export const useDecryptFile = () => { /* ... */ };
export const usePasteSshKey = () => { /* ... */ };
export const useDerivePublicKey = () => { /* ... */ };

// useKeyStore.ts
export const useLoadKeys = (passphrase: string) => { /* ... */ };
export const useSaveKeys = (passphrase: string, keys: StoredKey[]) => { /* ... */ };
export const useAddKey = () => { /* ... */ };
export const useRemoveKey = () => { /* ... */ };
```

## Classes

### React Components

1. **App** - Main application component with tabs
   - State: active tab, stored keys
   - Methods: handleTabChange, handleKeyOperations

2. **TabContainer** - Tabs wrapper component
   - Props: children, activeTab, onTabChange

3. **KeyManagementTab**
   - State: generated keys, imported keys, clipboard content
   - Methods: handleGenerate, handleImport, handleStore

4. **EncryptionTab**
   - State: input file, output file, selected recipients
   - Methods: handleFilePick, handleEncrypt

5. **DecryptionTab**
   - State: input file, output file, selected identity
   - Methods: handleFilePick, handleDecrypt

6. **KeyStoreModal**
   - Props: isOpen, onClose, passphrase, keys
   - Methods: handleLoad, handleSave

## Dependencies

### Additional Cargo dependencies

```toml
[dependencies]
age = "0.10"
base64 = "0.22"
rand = "0.8"
tokio = { version = "1.0", features = ["process", "fs"] }
tauri-plugin-dialog = "2"
tauri-plugin-clipboard = "2"
tauri-plugin-fs = "2"
```

### Additional package.json dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tauri-apps/plugin-dialog": "^2",
    "@tauri-apps/plugin-clipboard-manager": "^2",
    "@tauri-apps/plugin-fs": "^2"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.1"
  }
}
```

## Testing

### Unit Tests (Rust)
- Age key generation and validation
- File encryption/decryption roundtrip
- SSH key derivation
- Key storage encryption/decryption

### Integration Tests (TypeScript)
- UI component interactions
- File picker integration
- Clipboard operations
- API endpoint calls

### Manual Testing
- End-to-end file encryption workflow
- Key import/export functionality
- Clipboard integration
- Error handling scenarios

## Progress Status

### ✅ Phase 1: Backend Foundation (COMPLETED)
✅ 1. Add Cargo dependencies for age, plugins
✅ 2. Implement age.rs with core CLI operations
✅ 3. Update lib.rs with Tauri commands
✅ 4. Test backend functionality

### ✅ Phase 2: Basic UI Structure (COMPLETED)
✅ 1. Add package.json dependencies for React, Tauri plugins
✅ 2. Create types/index.ts
✅ 3. Implement basic tab layout in main.ts
✅ 4. Create placeholder components

### ✅ Phase 3: Key Management (COMPLETED)
✅ 1. Implement KeyManagementTab with key generation
✅ 2. Add SSH key clipboard import functionality
✅ 3. Implement basic key storage (no encryption yet)

### ✅ Phase 4: Encryption/Decryption (COMPLETED)
✅ 1. Implement EncryptionTab with file picking
✅ 2. Implement DecryptionTab with key selection
✅ 3. Integrate age operations in frontend

### ⏭️ Phase 5: Key Storage & Security (NEXT)
✅ 1. Implement encrypted key storage with passphrases (COMPLETED)
⏳ 2. Add KeyStoreModal for secure key management
⏳ 3. Implement key import/export functionality

### 📋 Phase 6: Polish & Testing (FUTURE)
⏳ 1. Add proper error handling and user feedback
⏳ 2. Implement loading states and progress indicators
⏳ 3. Add tests for critical functionality
⏳ 4. UI/UX improvements and bug fixes

## Current Status

**🎉 MAJOR UI ENHANCEMENT COMPLETED:** File Explorer with drag-and-drop support implemented for encryption/decryption tabs!

**📋 Key Achievements:**
✅ **File Explorer Component:** Full filesystem navigation with folder browsing
✅ **Drag & Drop Framework:** Ready for file dropping (external drop handling prepared)
✅ **Batch Support Ready:** Multi-file selection support built into explorer
✅ **Smart Filtering:** Only shows .age files for decryption tab
✅ **Stored Key Integration:** Easy selection of saved keys as recipients/identities
✅ **Modern UX:** Step-by-step wizard interface with visual feedback

**📋 Next Steps:**
1. ✅ Implement encrypted key storage with passphrases (Phase 5.1)
2. Add KeyStoreModal for secure key management (Phase 5.2)
3. Implement key import/export functionality (Phase 5.3)
4. Final UI polish and testing (Phase 6)

## Completed Work Summary

- ✅ Full Rust backend with age CLI integration
- ✅ Key generation and clipboard import UI
- ✅ File encryption workflow with recipient management
- ✅ Modern React/TypeScript frontend
- ✅ Responsive UI with dark mode support
- ✅ Cross-platform file dialogs
- ✅ Type-safe API integration

## Files Created/Modified

### Rust Backend
✅ src-tauri/Cargo.toml - Dependencies added
✅ src-tauri/src/age.rs - Age CLI operations
✅ src-tauri/src/commands.rs - Tauri commands
✅ src-tauri/src/lib.rs - Updated configuration

### Frontend
✅ package.json - React and Tauri plugin dependencies
✅ tsconfig.json - JSX configuration
✅ vite.config.ts - React plugin added
✅ src/main.tsx - React app entry point
✅ src/types/index.ts - Type definitions
✅ src/styles.css - Modern UI styles
✅ src/hooks/useAge.ts - API integration hooks
✅ src/utils/file.ts - File utility functions
✅ src/components/App.tsx - Main app component
✅ src/components/KeyManagementTab.tsx - Key management UI
✅ src/components/EncryptionTab.tsx - File encryption UI
✅ src/components/DecryptionTab.tsx - File decryption UI
