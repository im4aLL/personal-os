import { getTursoConfig } from "#lib/config"

type TursoArg      = { type: "text" | "integer" | "real" | "null"; value?: string }
type TursoColValue = null | { type: "text" | "integer" | "real" | "null"; value?: string }

interface TursoResult {
  cols: { name: string }[]
  rows: TursoColValue[][]
}

function getConfig() {
  const config = getTursoConfig()
  if (!config) throw new Error("Turso not configured")
  // HTTP API needs https://, not libsql://
  return {
    url:   config.url.replace("libsql://", "https://"),
    token: config.token,
  }
}

function toArg(val: unknown): TursoArg {
  if (val === null || val === undefined) return { type: "null" }
  if (typeof val === "number")
    return { type: Number.isInteger(val) ? "integer" : "real", value: String(val) }
  return { type: "text", value: String(val) }
}

function parseValue(val: TursoColValue): string | number | null {
  if (val === null || val.type === "null") return null
  if (val.type === "integer") return parseInt(val.value ?? "0", 10)
  if (val.type === "real")    return parseFloat(val.value ?? "0")
  return val.value ?? null
}

async function pipeline(sql: string, args: unknown[] = []): Promise<TursoResult> {
  const { url, token } = getConfig()
  const res = await fetch(`${url}/v2/pipeline`, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toArg) } },
        { type: "close" },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`)
  const data  = await res.json()
  const first = data.results[0]
  if (first.type === "error") throw new Error(`Turso: ${first.error.message}`)
  return first.response.result
}

export async function tursoExecute(sql: string, args: unknown[] = []): Promise<void> {
  await pipeline(sql, args)
}

export async function tursoSelect<T>(sql: string, args: unknown[] = []): Promise<T[]> {
  const result = await pipeline(sql, args)
  return result.rows.map(row => {
    const obj: Record<string, unknown> = {}
    result.cols.forEach((col, i) => { obj[col.name] = parseValue(row[i]) })
    return obj as T
  })
}
