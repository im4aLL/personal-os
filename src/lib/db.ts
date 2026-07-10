import Database from "@tauri-apps/plugin-sql"

const DB_PATH = "sqlite:personal-os.db"
let _db: Database | null = null

export async function getDb(): Promise<Database> {
  if (!_db) _db = await Database.load(DB_PATH)
  return _db
}
