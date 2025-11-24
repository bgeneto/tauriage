use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StoredKey {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub private_key: Option<String>, // None for public-only keys
    pub comment: Option<String>,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct KeyStorage {
    pub keys: Vec<StoredKey>,
    pub version: u32,
}

/// Create a new StoredKey with current timestamp
pub fn create_stored_key(
    name: String,
    public_key: String,
    private_key: Option<String>,
    comment: Option<String>,
) -> StoredKey {
    StoredKey {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        public_key,
        private_key,
        comment,
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    }
}

/// Simple passphrase-based encryption for key storage
/// Uses a simple PBKDF2 + AES256-GCM construction for demonstration
/// In production, consider using more robust solutions like age itself for key storage
pub fn create_passphrase_encrypted_container(
    passphrase: &str,
    keys: &[StoredKey]
) -> Result<Vec<u8>, String> {
    use aes_gcm::{
        aead::{Aead, AeadCore, KeyInit, OsRng},
        Aes256Gcm, Key
    };
    use pbkdf2::pbkdf2_hmac;
    use sha2::Sha256;

    // Create storage container
    let storage = KeyStorage {
        keys: keys.to_vec(),
        version: 1,
    };

    // Serialize to JSON first
    let json_data = serde_json::to_vec(&storage)
        .map_err(|e| format!("Failed to serialize keys: {}", e))?;

    // Derive key from passphrase using PBKDF2
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(passphrase.as_bytes(), b"age-tool-salt", 100_000, &mut key);
    let aes_key = Key::<Aes256Gcm>::from_slice(&key);

    // Generate nonce
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);

    // Encrypt the data
    let cipher = Aes256Gcm::new(&aes_key);
    let ciphertext = cipher.encrypt(&nonce, json_data.as_ref())
        .map_err(|e| format!("Encryption failed: {:?}", e))?;

    // Combine nonce + ciphertext
    let mut result = nonce.to_vec();
    result.extend(ciphertext);

    Ok(result)
}

/// Decrypt passphrase-encrypted key storage container
pub fn decrypt_passphrase_container(
    passphrase: &str,
    encrypted_data: &[u8]
) -> Result<Vec<StoredKey>, String> {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Key
    };
    use pbkdf2::pbkdf2_hmac;
    use sha2::Sha256;

    if encrypted_data.len() < 12 {
        return Err("Encrypted data too short".to_string());
    }

    // Extract nonce (first 12 bytes) and ciphertext
    let nonce_slice = &encrypted_data[0..12];
    let ciphertext = &encrypted_data[12..];

    // Derive key from passphrase
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(passphrase.as_bytes(), b"age-tool-salt", 100_000, &mut key);
    let aes_key = Key::<Aes256Gcm>::from_slice(&key);

    // Decrypt
    let cipher = Aes256Gcm::new(&aes_key);
    let decrypted_bytes = cipher.decrypt(nonce_slice.into(), ciphertext)
        .map_err(|e| format!("Decryption failed - incorrect passphrase or corrupted data: {:?}", e))?;

    // Parse JSON
    let storage: KeyStorage = serde_json::from_slice(&decrypted_bytes)
        .map_err(|e| format!("Failed to parse decrypted data: {}", e))?;

    Ok(storage.keys)
}

/// Save encrypted key storage to a file
pub fn save_key_storage(passphrase: &str, keys: &[StoredKey], file_path: &str) -> Result<(), String> {
    let encrypted_data = create_passphrase_encrypted_container(passphrase, keys)?;

    fs::write(file_path, encrypted_data)
        .map_err(|e| format!("Failed to write key storage file: {}", e))?;

    Ok(())
}

/// Load encrypted key storage from a file
pub fn load_key_storage(passphrase: &str, file_path: &str) -> Result<Vec<StoredKey>, String> {
    let encrypted_data = fs::read(file_path)
        .map_err(|e| format!("Failed to read key storage file: {}", e))?;

    decrypt_passphrase_container(passphrase, &encrypted_data)
}

/// Check if a key storage file exists
pub fn key_storage_exists(file_path: &str) -> bool {
    Path::new(file_path).exists()
}

/// Get default key storage path (in user config directory)
pub fn get_default_key_storage_path() -> Result<String, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Could not determine config directory")?;

    let age_dir = config_dir.join("tauriage");
    std::fs::create_dir_all(&age_dir)
        .map_err(|e| format!("Could not create config directory: {}", e))?;

    Ok(age_dir.join("keys.enc").to_string_lossy().to_string())
}
