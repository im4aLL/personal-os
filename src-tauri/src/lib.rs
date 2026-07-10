use tauri::{AppHandle, Manager};

#[tauri::command]
async fn export_db(app: AppHandle, dest: String) -> Result<(), String> {
    let src = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("personal-os-local.db");

    std::fs::copy(&src, &dest).map_err(|e| format!("Export failed: {e}"))?;
    Ok(())
}

#[tauri::command]
async fn import_db(app: AppHandle, src: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let dest = app_data_dir.join("personal-os-local.db");

    // Remove stale WAL files so SQLite starts clean with the imported file
    let _ = std::fs::remove_file(app_data_dir.join("personal-os-local.db-shm"));
    let _ = std::fs::remove_file(app_data_dir.join("personal-os-local.db-wal"));

    std::fs::copy(&src, &dest).map_err(|e| format!("Import failed: {e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migration = |version: i64, description: &'static str, sql: &'static str| tauri_plugin_sql::Migration {
        version,
        description,
        sql,
        kind: tauri_plugin_sql::MigrationKind::Up,
    };

    let migrations = || vec![
        migration(1, "create_todos_table",        include_str!("../migrations/001_todos.sql")),
        migration(2, "create_app_settings_table", include_str!("../migrations/002_app_settings.sql")),
        migration(3, "create_notes_tables",        include_str!("../migrations/003_notes.sql")),
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:personal-os-local.db", migrations())
                .add_migrations("sqlite:personal-os-cloud.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![export_db, import_db])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
