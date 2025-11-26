use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

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

/// Get the path to a bundled executable based on the runtime OS and filename
fn get_bundled_exe_path(exe_name: &str) -> Result<PathBuf, String> {
    let exe_path =
        std::env::current_exe().map_err(|e| format!("Could not determine app path: {}", e))?;
    let parent = exe_path
        .parent()
        .ok_or("Could not determine app directory")?;

    match std::env::consts::OS {
        "windows" => {
            // Check flat directory first as per user report
            let flat_path = parent
                .join("resources")
                .join("binaries")
                .join(format!("{}.exe", exe_name));
            if flat_path.exists() {
                return Ok(flat_path);
            }

            // Fallback to windows subdirectory
            let windows_path = parent
                .join("resources")
                .join("binaries")
                .join("windows")
                .join(format!("{}.exe", exe_name));
            if windows_path.exists() {
                return Ok(windows_path);
            }

            Err(format!(
                "Age executable not found at {} or {}. This should not happen - bundled binaries may be missing.",
                flat_path.display(),
                windows_path.display()
            ))
        }
        "linux" => {
            // Check flat directory first
            let flat_path = parent.join("resources").join("binaries").join(exe_name);
            if flat_path.exists() {
                return Ok(flat_path);
            }

            // Fallback to linux subdirectory
            let linux_path = parent
                .join("resources")
                .join("binaries")
                .join("linux")
                .join(exe_name);
            if linux_path.exists() {
                return Ok(linux_path);
            }

            Err(format!(
                "Age executable not found at {} or {}. This should not happen - bundled binaries may be missing.",
                flat_path.display(),
                linux_path.display()
            ))
        }
        "macos" => {
            // On macOS, use the system path (age should be installed via brew)
            Ok(PathBuf::from(exe_name))
        }
        _ => {
            return Err(format!("Unsupported OS: {}", std::env::consts::OS));
        }
    }
}

pub async fn generate_keypair(comment: Option<&str>) -> Result<AgeKeyPair, String> {
    let exe_path = get_bundled_exe_path("age-keygen")?;
    let mut cmd = Command::new(&exe_path);

    if let Some(comment) = comment {
        cmd.arg("-c").arg(comment);
    }

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    let output = cmd
        .output()
        .await
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

    let public_key = lines
        .iter()
        .find(|line| line.starts_with("# public key: "))
        .and_then(|line| line.strip_prefix("# public key: "))
        .ok_or("Could not find public key in age-keygen output")?
        .to_string();

    let private_key = lines
        .iter()
        .find(|line| line.starts_with("AGE-SECRET-KEY-"))
        .ok_or("Could not find private key in age-keygen output")?
        .to_string();

    let comment = lines
        .iter()
        .find(|line| line.contains("# created:"))
        .map(|line| line.trim_start_matches('#').trim().to_string());

    Ok(AgeKeyPair {
        public_key,
        private_key,
        comment,
    })
}

pub async fn encrypt_file(input: &str, output: &str, recipients: &[String], use_armor: bool) -> Result<(), String> {
    let exe_path = get_bundled_exe_path("age")?;
    let mut cmd = Command::new(&exe_path);
    
    // Add armor flag if requested
    if use_armor {
        cmd.arg("--armor");
    }
    
    cmd.arg("-o").arg(output);

    for recipient in recipients {
        cmd.arg("-r").arg(recipient);
    }

    cmd.arg(input).stdout(Stdio::piped()).stderr(Stdio::piped());

    let output = cmd
        .output()
        .await
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
    use std::fs::File;
    use std::io::Write;

    // Validate identity format: should be either:
    // - Age key: starts with "AGE-SECRET-KEY-"
    // - SSH key: starts with "-----BEGIN" or "ssh-" (for OpenSSH format)
    let trimmed_identity = identity.trim();
    if !trimmed_identity.starts_with("AGE-SECRET-KEY-")
        && !trimmed_identity.starts_with("-----BEGIN")
        && !trimmed_identity.starts_with("ssh-")
    {
        return Err(
            "Identity must be either an age key (AGE-SECRET-KEY-...) or an SSH key (-----BEGIN... or ssh-...)".to_string()
        );
    }

    let temp_file = format!("{}.identity", input);
    let mut file = File::create(&temp_file)
        .map_err(|e| format!("Failed to create temp identity file: {}", e))?;

    // Write identity with proper newline at end to ensure valid format
    file.write_all(trimmed_identity.as_bytes())
        .map_err(|e| format!("Failed to write identity to temp file: {}", e))?;

    // Ensure file ends with newline (required by age for proper parsing)
    if !trimmed_identity.ends_with('\n') {
        file.write_all(b"\n")
            .map_err(|e| format!("Failed to write newline to temp file: {}", e))?;
    }

    let exe_path = get_bundled_exe_path("age")?;
    let mut cmd = Command::new(&exe_path);
    cmd.arg("-d")
        .arg("-i")
        .arg(&temp_file)
        .arg("-o")
        .arg(output)
        .arg(input)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to execute age decrypt: {}", e))?;

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_file);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "Failed to decrypt file: age decryption failed: {}",
            stderr
        ));
    }

    Ok(())
}

pub async fn derive_public_from_ssh(ssh_pubkey: &str) -> Result<String, String> {
    // Age can automatically derive X25519 public keys from SSH public keys
    // We can use age-keygen to convert SSH pubkey to age recipient
    // Write SSH key to temp file
    use std::fs::File;
    use std::io::Write;

    let temp_file = "ssh_pubkey_temp";
    let mut file = File::create(temp_file)
        .map_err(|e| format!("Failed to create temp SSH key file: {}", e))?;

    file.write_all(ssh_pubkey.as_bytes())
        .map_err(|e| format!("Failed to write SSH key to temp file: {}", e))?;

    let exe_path = get_bundled_exe_path("age-keygen")?;
    let mut cmd = Command::new(&exe_path);
    cmd.arg("-y")
        .arg(temp_file)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = cmd
        .output()
        .await
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
