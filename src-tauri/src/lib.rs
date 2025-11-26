mod age;
mod commands;
mod key_storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(commands::KeyStore {
            keys: std::sync::Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::generate_age_keys,
            commands::encrypt_file_cmd,
            commands::decrypt_file_cmd,
            commands::derive_public_key_from_ssh,
            commands::paste_ssh_key_from_clipboard,
            commands::get_default_key_storage_path_cmd,
            commands::key_storage_exists_cmd,
            commands::load_key_storage_cmd,
            commands::save_key_storage_cmd,
            commands::create_stored_key_cmd,
            commands::get_or_create_passphrase_cmd,
            commands::export_keys_cmd,
            commands::import_keys_cmd,
            commands::get_user_home_directory,
            commands::get_platform,
            commands::list_directory_contents
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
