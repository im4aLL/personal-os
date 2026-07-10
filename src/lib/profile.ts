import { getDb } from "#lib/db"
import { getAppMode } from "#lib/config"

export interface UserProfile {
  name:  string
  email: string
}

type SettingRow = { value: string }

// ── Low-level setting helpers ─────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db   = await getDb()
  const rows = await db.select<SettingRow[]>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key]
  )
  return rows[0]?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db  = await getDb()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  )
}

// ── Profile ───────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile | null> {
  const [name, email] = await Promise.all([
    getSetting("profile_name"),
    getSetting("profile_email"),
  ])
  if (!name || !email) return null
  return { name, email }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await Promise.all([
    setSetting("profile_name",  profile.name),
    setSetting("profile_email", profile.email),
  ])
  if (getAppMode() === "cloud") {
    // Lazy import to avoid circular dependency (sync → profile → sync)
    const { syncTodos } = await import("#lib/sync")
    syncTodos().catch(err => console.warn("Profile sync failed:", err))
  }
}

// ── Gravatar (SHA-256, supported by Gravatar since 2024) ──────────

export async function gravatarUrl(email: string, size = 80): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const buffer     = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized))
  const hash       = Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
  return `https://gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}
