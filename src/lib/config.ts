const URL_KEY   = "personal-os:turso-url"
const TOKEN_KEY  = "personal-os:turso-token"

export interface TursoConfig {
  url:   string
  token: string
}

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
