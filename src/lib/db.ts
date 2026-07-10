import Database from "@tauri-apps/plugin-sql"
import { invoke } from "@tauri-apps/api/core"
import { getAppMode } from "#lib/config"

const LOCAL_DB = "sqlite:personal-os-local.db"
const CLOUD_DB = "sqlite:personal-os-cloud.db"

let _localDb: Database | null = null
let _cloudDb: Database | null = null

export async function getDb(): Promise<Database> {
  if (getAppMode() === "cloud") {
    if (!_cloudDb) _cloudDb = await Database.load(CLOUD_DB)
    return _cloudDb
  }
  if (!_localDb) _localDb = await Database.load(LOCAL_DB)
  return _localDb
}

export function resetDb(): void {
  _localDb = null
  _cloudDb = null
}

export async function exportDb(destPath: string): Promise<void> {
  await invoke("export_db", { dest: destPath })
}

export async function importDb(srcPath: string): Promise<void> {
  await invoke("import_db", { src: srcPath })
  resetDb()
}
