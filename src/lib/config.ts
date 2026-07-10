const URL_KEY   = "personal-os:turso-url"
const TOKEN_KEY  = "personal-os:turso-token"
const MODE_KEY   = "personal-os:mode"

export type AppMode = "local" | "cloud"

export interface TursoConfig {
  url:   string
  token: string
}

// ── Mode ─────────────────────────────────────────────────────────
export function getAppMode(): AppMode | null {
  return localStorage.getItem(MODE_KEY) as AppMode | null
}

export function setAppMode(mode: AppMode): void {
  localStorage.setItem(MODE_KEY, mode)
}

// ── Turso credentials ─────────────────────────────────────────────
export function getTursoConfig(): TursoConfig | null {
  const url   = localStorage.getItem(URL_KEY)
  const token = localStorage.getItem(TOKEN_KEY)
  return url && token ? { url, token } : null
}

export function saveTursoConfig(config: TursoConfig): void {
  localStorage.setItem(URL_KEY,   config.url)
  localStorage.setItem(TOKEN_KEY, config.token)
}

export function clearTursoConfig(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

// ── Full reset ────────────────────────────────────────────────────
export function clearAll(): void {
  clearTursoConfig()
  localStorage.removeItem(MODE_KEY)
}
