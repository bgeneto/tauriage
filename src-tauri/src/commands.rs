use crate::age::{AgeKeyPair, EncryptionResult, DecryptionResult, generate_keypair, encrypt_file, decrypt_file, derive_public_from_ssh};
use crate::key_storage::{StoredKey, create_stored_key, save_key_storage, load_key_storage, key_storage_exists, get_default_key_storage_path, get_or_create_passphrase, export_keys_to_file, import_keys_from_file};
use std::sync::Mutex;

// For simplicity, we'll store keys in memory for now
// Later we'll implement encrypted persistent storage
#[allow(dead_code)]
pub struct KeyStore {
    pub keys: Mutex<Vec<crate::age::AgeKeyPair>>,
}

#[tauri::command]
pub async fn generate_age_keys(comment: Option<String>) -> Result<AgeKeyPair, String> {
    generate_keypair(comment.as_deref()).await
}

#[tauri::command]
pub async fn encrypt_file_cmd(
    input_file: String,
    output_file: String,
    recipients: Vec<String>,
    use_armor: bool
) -> Result<EncryptionResult, String> {
    encrypt_file(&input_file, &output_file, &recipients, use_armor).await?;

    Ok(EncryptionResult {
        success: true,
        input_file,
        output_file,
        public_keys: recipients,
    })
}

#[tauri::command]
pub async fn decrypt_file_cmd(
    input_file: String,
    output_file: String,
    identity: String
) -> Result<DecryptionResult, String> {
    decrypt_file(&input_file, &output_file, &identity).await?;

    Ok(DecryptionResult {
        success: true,
        input_file,
        output_file,
        identity,
    })
}

#[tauri::command]
pub async fn derive_public_key_from_ssh(ssh_pubkey: String) -> Result<String, String> {
    derive_public_from_ssh(&ssh_pubkey).await
}

#[tauri::command]
pub async fn paste_ssh_key_from_clipboard(
    _app_handle: tauri::AppHandle,
) -> Result<String, String> {
    // TODO: implement clipboard reading with correct API
    // For now, return error to indicate it's not implemented
    Err("Clipboard integration not yet implemented".to_string())
}

#[tauri::command]
pub fn get_default_key_storage_path_cmd() -> Result<String, String> {
    get_default_key_storage_path()
}

#[tauri::command]
pub fn key_storage_exists_cmd(file_path: Option<String>) -> Result<bool, String> {
    let path = file_path.unwrap_or_else(|| get_default_key_storage_path().unwrap_or_default());
    Ok(key_storage_exists(&path))
}

#[tauri::command]
pub fn load_key_storage_cmd(passphrase: String, file_path: Option<String>) -> Result<Vec<StoredKey>, String> {
    let path = file_path.unwrap_or_else(|| get_default_key_storage_path().unwrap_or_default());
    load_key_storage(&passphrase, &path)
}

#[tauri::command]
pub fn get_or_create_passphrase_cmd() -> Result<String, String> {
    get_or_create_passphrase()
}

#[tauri::command]
pub fn save_key_storage_cmd(passphrase: String, keys: Vec<StoredKey>, file_path: Option<String>) -> Result<(), String> {
    let path = file_path.unwrap_or_else(|| get_default_key_storage_path().unwrap_or_default());
    save_key_storage(&passphrase, &keys, &path)
}

#[tauri::command]
pub fn create_stored_key_cmd(
    name: String,
    public_key: String,
    private_key: Option<String>,
    comment: Option<String>
) -> Result<StoredKey, String> {
    Ok(create_stored_key(name, public_key, private_key, comment))
}

#[tauri::command]
pub fn export_keys_cmd(passphrase: String, keys: Vec<StoredKey>, file_path: String) -> Result<(), String> {
    export_keys_to_file(&passphrase, &keys, &file_path)
}

#[tauri::command]
pub fn import_keys_cmd(passphrase: String, file_path: String) -> Result<Vec<StoredKey>, String> {
    import_keys_from_file(&passphrase, &file_path)
}

#[tauri::command]
pub fn get_user_home_directory() -> Result<String, String> {
    dirs::home_dir()
        .ok_or("Could not determine home directory".to_string())
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[derive(serde::Serialize)]
pub struct DirectoryItem {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[tauri::command]
pub fn list_directory_contents(path: String) -> Result<Vec<DirectoryItem>, String> {
    use std::fs;

    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory {}: {}", path, e))?;

    let mut items = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path_buf = entry.path();
        let metadata = entry.metadata()
            .map_err(|e| format!("Failed to get metadata for {}: {}", path_buf.display(), e))?;

        let name = path_buf.file_name()
            .ok_or("Invalid file name")?
            .to_string_lossy()
            .to_string();

        let full_path = path_buf.to_string_lossy().to_string();
        let is_directory = metadata.is_dir();

        let size = if is_directory {
            None
        } else {
            Some(metadata.len())
        };

        let modified = metadata.modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| {
                use chrono::{DateTime, Utc};
                let datetime = DateTime::<Utc>::from_timestamp(d.as_secs() as i64, 0)
                    .unwrap_or_default();
                datetime.format("%Y-%m-%d %H:%M").to_string()
            });

        items.push(DirectoryItem {
            name,
            path: full_path,
            is_directory,
            size,
            modified,
        });
    }

    // Sort directories first, then files alphabetically
    items.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });

    Ok(items)
}
