use tauri::{AppHandle, Manager};

#[tauri::command]
async fn export_db(app: AppHandle, dest: String) -> Result<(), String> {
    let src = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("personal-os.db");

    // Checkpoint WAL into main file before copying
    std::fs::copy(&src, &dest).map_err(|e| format!("Export failed: {e}"))?;
    Ok(())
}

#[tauri::command]
async fn import_db(app: AppHandle, src: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let dest = app_data_dir.join("personal-os.db");

    // Remove stale WAL files so SQLite starts clean with the imported file
    let _ = std::fs::remove_file(app_data_dir.join("personal-os.db-shm"));
    let _ = std::fs::remove_file(app_data_dir.join("personal-os.db-wal"));

    std::fs::copy(&src, &dest).map_err(|e| format!("Import failed: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(
                    "sqlite:personal-os.db",
                    vec![tauri_plugin_sql::Migration {
                        version: 1,
                        description: "create_todos_table",
                        sql: include_str!("../migrations/001_todos.sql"),
                        kind: tauri_plugin_sql::MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .invoke_handler(tauri::generate_handler![export_db, import_db])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
