import Database from "@tauri-apps/plugin-sql"
import { invoke } from "@tauri-apps/api/core"

const DB_PATH = "sqlite:personal-os.db"
let _db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load(DB_PATH)
  return _db
}

export function resetDb(): void {
  _db = null
}

export async function exportDb(destPath: string): Promise<void> {
  await invoke("export_db", { dest: destPath })
}

export async function importDb(srcPath: string): Promise<void> {
  await invoke("import_db", { src: srcPath })
  resetDb()
}
