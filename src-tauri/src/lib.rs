use tauri::{AppHandle, Manager};

#[derive(serde::Serialize)]
struct LinkMetadata {
    title:       String,
    favicon_url: String,
}

#[tauri::command]
async fn fetch_link_metadata(url: String) -> Result<LinkMetadata, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (compatible; personal-os/1.0)")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Fetch failed: {e}"))?;

    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let slice = &bytes[..bytes.len().min(50_000)];
    let html  = String::from_utf8_lossy(slice);

    let title = extract_title(&html)
        .unwrap_or_else(|| extract_domain(&url));

    let domain      = extract_domain(&url);
    let favicon_url = format!("https://www.google.com/s2/favicons?domain={domain}&sz=32");

    Ok(LinkMetadata { title, favicon_url })
}

fn extract_title(html: &str) -> Option<String> {
    let lower = html.to_lowercase();
    let start = lower.find("<title>")? + 7;
    let end   = lower[start..].find("</title>")? + start;
    let raw   = html[start..end].trim().to_string();
    if raw.is_empty() { return None; }
    Some(decode_html_entities(&raw))
}

fn decode_html_entities(s: &str) -> String {
    s.replace("&amp;",  "&")
     .replace("&lt;",   "<")
     .replace("&gt;",   ">")
     .replace("&quot;", "\"")
     .replace("&#39;",  "'")
     .replace("&apos;", "'")
}

fn extract_domain(url: &str) -> String {
    url.split("//")
       .nth(1)
       .and_then(|s| s.split('/').next())
       .unwrap_or(url)
       .to_string()
}

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
        migration(4, "create_links_tables",        include_str!("../migrations/004_links.sql")),
        migration(5, "create_work_logs_tables",     include_str!("../migrations/005_work_logs.sql")),
        migration(6, "create_projects_tables",       include_str!("../migrations/006_projects.sql")),
        migration(7, "add_jira_ticket",               include_str!("../migrations/007_add_jira_ticket.sql")),
        migration(8, "add_todo_archived",              include_str!("../migrations/008_add_todo_archived.sql")),
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
        .invoke_handler(tauri::generate_handler![export_db, import_db, fetch_link_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
