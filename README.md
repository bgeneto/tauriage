# TauriAge

**TauriAge** is a modern, cross-platform desktop application for secure file encryption using the [age](https://age-encryption.org/) encryption tool. Built with **Tauri 2.0**, it combines the performance and security of a **Rust** backend with a responsive **React/TypeScript** frontend.

![TauriAge App](app-icon.png)

## 🚀 Features

*   **Key Management**: Generate, import, and export age/SSH keys with ease.
*   **Secure Encryption**: Encrypt files for multiple recipients using public keys.
*   **Reliable Decryption**: Decrypt files using your private identity keys.
*   **Encrypted Key Storage**: Securely store your keys locally, protected by a passphrase (using PBKDF2 + AES-256-GCM).
*   **Modern UI**: A clean, dark-mode interface built with Tailwind CSS v4.
*   **Cross-Platform**: Runs on Windows, macOS, and Linux.

## 🛠️ Technology Stack

*   **Core**: [Tauri 2.0](https://tauri.app/)
*   **Backend**: Rust
*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS v4
*   **Encryption**: `age` (via Rust binary wrapper)

## 🏁 Getting Started

### Prerequisites

*   **Node.js** (v18+)
*   **Rust** (latest stable)
*   **Tauri CLI**: `npm install -g @tauri-apps/cli` (optional, included in devDependencies)
*   **Build Tools**: VS C++ Build Tools (Windows) or Xcode Command Line Tools (macOS)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/bgeneto/TauriAge.git
    cd TauriAge
    ```

2.  **Install frontend dependencies:**
    ```bash
    npm install
    ```

3.  **Verify Rust backend:**
    ```bash
    cd src-tauri
    cargo check
    ```

### Running Locally

Start the development server (runs Vite frontend and compiles Rust backend):

```bash
npm run tauri dev
```

### Building for Production

Create an optimized executable for your OS:

```bash
npm run tauri build
```

The output will be in `src-tauri/target/release/bundle/`.

## 🏗️ Architecture

*   **Frontend (`src/`)**: React application handling the UI, state management, and user interactions. It communicates with the backend via Tauri's IPC.
*   **Backend (`src-tauri/src/`)**: Rust code that handles the heavy lifting:
    *   `age.rs`: Wraps age CLI operations for encryption/decryption.
    *   `key_storage.rs`: Manages the secure, encrypted storage of user keys.
    *   `commands.rs`: Exposes Rust functions to the frontend.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[MIT License](LICENSE)
