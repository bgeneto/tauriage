use std::process::Stdio;
use tokio::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AgeKeyPair {
    pub public_key: String,
    pub private_key: String,
    pub comment: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EncryptionResult {
    pub success: bool,
    pub input_file: String,
    pub output_file: String,
    pub public_keys: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DecryptionResult {
    pub success: bool,
    pub input_file: String,
    pub output_file: String,
    pub identity: String,
}

pub async fn generate_keypair(comment: Option<&str>) -> Result<AgeKeyPair, String> {
    let mut cmd = Command::new("age-keygen");

    if let Some(comment) = comment {
        cmd.arg("-c").arg(comment);
    }

    cmd.stdout(Stdio::piped())
       .stderr(Stdio::piped());

    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute age-keygen: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("age-keygen failed: {}", stderr));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    parse_age_keygen_output(&output_str)
}

fn parse_age_keygen_output(output: &str) -> Result<AgeKeyPair, String> {
    let lines: Vec<&str> = output.lines().collect();

    let public_key = lines.iter()
        .find(|line| line.starts_with("# public key: "))
        .and_then(|line| line.strip_prefix("# public key: "))
        .ok_or("Could not find public key in age-keygen output")?
        .to_string();

    let private_key = lines.iter()
        .find(|line| line.starts_with("AGE-SECRET-KEY-"))
        .ok_or("Could not find private key in age-keygen output")?
        .to_string();

    let comment = lines.iter()
        .find(|line| line.contains("# created:"))
        .map(|line| line.trim_start_matches('#').trim().to_string());

    Ok(AgeKeyPair {
        public_key,
        private_key,
        comment,
    })
}

pub async fn encrypt_file(input: &str, output: &str, recipients: &[String]) -> Result<(), String> {
    let mut cmd = Command::new("age");
    cmd.arg("-o").arg(output);

    for recipient in recipients {
        cmd.arg("-r").arg(recipient);
    }

    cmd.arg(input)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute age encrypt: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("age encryption failed: {}", stderr));
    }

    Ok(())
}

pub async fn decrypt_file(input: &str, output: &str, identity: &str) -> Result<(), String> {
    // Write identity to temporary file or pass via stdin
    // For simplicity, write to a temp file first
    use std::io::Write;
    use std::fs::File;

    let temp_file = format!("{}.identity", input);
    let mut file = File::create(&temp_file)
        .map_err(|e| format!("Failed to create temp identity file: {}", e))?;

    file.write_all(identity.as_bytes())
        .map_err(|e| format!("Failed to write identity to temp file: {}", e))?;

    let mut cmd = Command::new("age");
    cmd.arg("-d")
       .arg("-i").arg(&temp_file)
       .arg("-o").arg(output)
       .arg(input)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute age decrypt: {}", e))?;

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("age decryption failed: {}", stderr));
    }

    Ok(())
}

pub async fn derive_public_from_ssh(ssh_pubkey: &str) -> Result<String, String> {
    // Age can automatically derive X25519 public keys from SSH public keys
    // We can use age-keygen to convert SSH pubkey to age recipient
    // Write SSH key to temp file
    use std::io::Write;
    use std::fs::File;

    let temp_file = "ssh_pubkey_temp";
    let mut file = File::create(temp_file)
        .map_err(|e| format!("Failed to create temp SSH key file: {}", e))?;

    file.write_all(ssh_pubkey.as_bytes())
        .map_err(|e| format!("Failed to write SSH key to temp file: {}", e))?;

    let mut cmd = Command::new("age-keygen");
    cmd.arg("-y").arg(temp_file)
       .stdout(Stdio::piped())
       .stderr(Stdio::piped());

    let output = cmd.output().await
        .map_err(|e| format!("Failed to execute age-keygen -y: {}", e))?;

    // Clean up temp file
    let _ = std::fs::remove_file(temp_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("SSH key derivation failed: {}", stderr));
    }

    let public_key = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(public_key)
}
