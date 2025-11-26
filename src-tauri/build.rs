use std::fs;
use std::path::Path;

fn main() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    let project_root = Path::new(&manifest_dir).parent().unwrap();
    let manifest_dir_path = Path::new(&manifest_dir);

    // Copy binaries for all platforms to subdirectories
    copy_all_binaries(&project_root, manifest_dir_path);

    tauri_build::build()
}

fn copy_all_binaries(project_root: &Path, manifest_dir: &Path) {
    let resources_dir = manifest_dir.join("resources").join("binaries");

    // Create Windows subdir and copy Windows binaries
    let windows_dir = resources_dir.join("windows");
    if !windows_dir.exists() {
        fs::create_dir_all(&windows_dir)
            .expect("Failed to create resources/binaries/windows directory");
    }

    let windows_src = project_root.join("bin").join("windows").join("amd64");
    let age_exe_src = windows_src.join("age.exe");
    if age_exe_src.exists() {
        let age_exe_dst = windows_dir.join("age.exe");
        fs::copy(&age_exe_src, &age_exe_dst)
            .expect("Failed to copy age.exe");
        println!("cargo:warning=Copied {} to {}", age_exe_src.display(), age_exe_dst.display());
    } else {
        println!("cargo:warning=Windows age.exe not found at {}", age_exe_src.display());
    }

    let age_keygen_exe_src = windows_src.join("age-keygen.exe");
    if age_keygen_exe_src.exists() {
        let age_keygen_exe_dst = windows_dir.join("age-keygen.exe");
        fs::copy(&age_keygen_exe_src, &age_keygen_exe_dst)
            .expect("Failed to copy age-keygen.exe");
        println!("cargo:warning=Copied {} to {}", age_keygen_exe_src.display(), age_keygen_exe_dst.display());
    } else {
        println!("cargo:warning=Windows age-keygen.exe not found at {}", age_keygen_exe_src.display());
    }

    // Create Linux subdir and copy Linux binaries
    let linux_dir = resources_dir.join("linux");
    if !linux_dir.exists() {
        fs::create_dir_all(&linux_dir)
            .expect("Failed to create resources/binaries/linux directory");
    }

    let linux_src = project_root.join("bin").join("linux").join("amd64");
    let age_src = linux_src.join("age");
    if age_src.exists() {
        let age_dst = linux_dir.join("age");
        fs::copy(&age_src, &age_dst)
            .expect("Failed to copy age");
        // Make it executable on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = PermissionsExt::from_mode(0o755);
            fs::set_permissions(&age_dst, perms)
                .expect("Failed to set executable permission on Linux age");
        }
        println!("cargo:warning=Copied {} to {}", age_src.display(), age_dst.display());
    } else {
        println!("cargo:warning=Linux age not found at {}", age_src.display());
    }

    let age_keygen_src = linux_src.join("age-keygen");
    if age_keygen_src.exists() {
        let age_keygen_dst = linux_dir.join("age-keygen");
        fs::copy(&age_keygen_src, &age_keygen_dst)
            .expect("Failed to copy age-keygen");
        // Make it executable on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = PermissionsExt::from_mode(0o755);
            fs::set_permissions(&age_keygen_dst, perms)
                .expect("Failed to set executable permission on Linux age-keygen");
        }
        println!("cargo:warning=Copied {} to {}", age_keygen_src.display(), age_keygen_dst.display());
    } else {
        println!("cargo:warning=Linux age-keygen not found at {}", age_keygen_src.display());
    }
}
