use std::fs;
use std::path::Path;

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let project_root = Path::new(&manifest_dir).parent().unwrap();
    let manifest_dir_path = Path::new(&manifest_dir);

    // Determine the target platform and copy appropriate binaries
    #[cfg(target_os = "windows")]
    copy_windows_binaries(&project_root, manifest_dir_path);

    #[cfg(target_os = "linux")]
    copy_linux_binaries(&project_root, manifest_dir_path);

    tauri_build::build()
}

#[cfg(target_os = "windows")]
fn copy_windows_binaries(project_root: &Path, manifest_dir: &Path) {
    let bin_src = project_root.join("bin").join("windows").join("amd64");

    // Create resources/binaries directory in the source directory
    let resources_dir = manifest_dir.join("resources").join("binaries");
    
    if !resources_dir.exists() {
        fs::create_dir_all(&resources_dir)
            .expect("Failed to create resources/binaries directory");
    }
    
    // Copy age.exe
    let age_exe_src = bin_src.join("age.exe");
    if age_exe_src.exists() {
        let age_exe_dst = resources_dir.join("age.exe");
        fs::copy(&age_exe_src, &age_exe_dst)
            .expect("Failed to copy age.exe");
        println!("cargo:warning=Copied {} to {}", age_exe_src.display(), age_exe_dst.display());
    } else {
        println!("cargo:warning=age.exe not found at {}", age_exe_src.display());
    }
    
    // Copy age-keygen.exe
    let age_keygen_src = bin_src.join("age-keygen.exe");
    if age_keygen_src.exists() {
        let age_keygen_dst = resources_dir.join("age-keygen.exe");
        fs::copy(&age_keygen_src, &age_keygen_dst)
            .expect("Failed to copy age-keygen.exe");
        println!("cargo:warning=Copied {} to {}", age_keygen_src.display(), age_keygen_dst.display());
    } else {
        println!("cargo:warning=age-keygen.exe not found at {}", age_keygen_src.display());
    }
}

#[cfg(target_os = "linux")]
fn copy_linux_binaries(project_root: &Path, manifest_dir: &Path) {
    let bin_src = project_root.join("bin").join("linux").join("amd64");

    // Create resources/binaries directory in the source directory
    let resources_dir = manifest_dir.join("resources").join("binaries");
    
    if !resources_dir.exists() {
        fs::create_dir_all(&resources_dir)
            .expect("Failed to create resources/binaries directory");
    }
    
    // Copy age binary
    let age_src = bin_src.join("age");
    if age_src.exists() {
        let age_dst = resources_dir.join("age");
        fs::copy(&age_src, &age_dst)
            .expect("Failed to copy age");
        // Make it executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = fs::Permissions::from_mode(0o755);
            fs::set_permissions(&age_dst, perms)
                .expect("Failed to set executable permission on age");
        }
        println!("cargo:warning=Copied {} to {}", age_src.display(), age_dst.display());
    } else {
        println!("cargo:warning=age not found at {}", age_src.display());
    }
    
    // Copy age-keygen binary
    let age_keygen_src = bin_src.join("age-keygen");
    if age_keygen_src.exists() {
        let age_keygen_dst = resources_dir.join("age-keygen");
        fs::copy(&age_keygen_src, &age_keygen_dst)
            .expect("Failed to copy age-keygen");
        // Make it executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = fs::Permissions::from_mode(0o755);
            fs::set_permissions(&age_keygen_dst, perms)
                .expect("Failed to set executable permission on age-keygen");
        }
        println!("cargo:warning=Copied {} to {}", age_keygen_src.display(), age_keygen_dst.display());
    } else {
        println!("cargo:warning=age-keygen not found at {}", age_keygen_src.display());
    }
}
