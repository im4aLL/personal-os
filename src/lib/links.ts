import { getDb } from "#lib/db"
import { syncTodos } from "#lib/sync"
import { tursoExecute } from "#lib/turso"
import { getAppMode } from "#lib/config"
import { randomUUID } from "#lib/uuid"
import type { Link, LinkTag, LinkWithTags, CreateLinkInput, UpdateLinkInput } from "#lib/types/link"

function backgroundSync() {
  if (getAppMode() !== "cloud") return
  syncTodos({ silent: true }).catch(err => console.warn("Links background sync failed:", err))
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function getLinks(): Promise<LinkWithTags[]> {
  const db    = await getDb()
  const links = await db.select<Link[]>("SELECT * FROM links ORDER BY created_at DESC")
  const tags  = await db.select<LinkTag[]>("SELECT * FROM link_tags ORDER BY created_at ASC")

  const tagMap = new Map<string, string[]>()
  for (const tag of tags) {
    const list = tagMap.get(tag.link_id) ?? []
    list.push(tag.name)
    tagMap.set(tag.link_id, list)
  }

  return links.map(l => ({ ...l, tags: tagMap.get(l.id) ?? [] }))
}

export async function searchLinks(query: string): Promise<LinkWithTags[]> {
  const db   = await getDb()
  const like = `%${query}%`
  const links = await db.select<Link[]>(
    "SELECT * FROM links WHERE title LIKE $1 OR url LIKE $2 ORDER BY created_at DESC",
    [like, like]
  )
  const ids  = links.map(l => l.id)
  if (!ids.length) return []

  const tags = await db.select<LinkTag[]>("SELECT * FROM link_tags ORDER BY created_at ASC")
  const tagMap = new Map<string, string[]>()
  for (const tag of tags) {
    const list = tagMap.get(tag.link_id) ?? []
    list.push(tag.name)
    tagMap.set(tag.link_id, list)
  }

  return links.map(l => ({ ...l, tags: tagMap.get(l.id) ?? [] }))
}

export async function getLinksByTag(tag: string): Promise<LinkWithTags[]> {
  const db = await getDb()
  const links = await db.select<Link[]>(
    `SELECT DISTINCT l.* FROM links l
     JOIN link_tags t ON t.link_id = l.id
     WHERE t.name = $1
     ORDER BY l.created_at DESC`,
    [tag]
  )

  const tags = await db.select<LinkTag[]>("SELECT * FROM link_tags ORDER BY created_at ASC")
  const tagMap = new Map<string, string[]>()
  for (const t of tags) {
    const list = tagMap.get(t.link_id) ?? []
    list.push(t.name)
    tagMap.set(t.link_id, list)
  }

  return links.map(l => ({ ...l, tags: tagMap.get(l.id) ?? [] }))
}

export async function checkDuplicateUrl(url: string): Promise<boolean> {
  const db   = await getDb()
  const rows = await db.select<Link[]>("SELECT id FROM links WHERE url = $1", [url])
  return rows.length > 0
}

export async function getAllUsedTags(): Promise<string[]> {
  const db   = await getDb()
  const rows = await db.select<{ name: string }[]>(
    "SELECT DISTINCT name FROM link_tags ORDER BY name ASC"
  )
  return rows.map(r => r.name)
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createLink(input: CreateLinkInput): Promise<LinkWithTags> {
  const db  = await getDb()
  const id  = randomUUID()
  const now = new Date().toISOString()

  const link: Link = {
    id,
    url:         input.url,
    title:       input.title,
    favicon_url: input.favicon_url,
    created_at:  now,
    updated_at:  now,
  }

  await db.execute(
    "INSERT INTO links (id, url, title, favicon_url, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)",
    [link.id, link.url, link.title, link.favicon_url, link.created_at, link.updated_at]
  )

  const rows = input.tags.map(name => ({ id: randomUUID(), name }))
  for (const { id: tagId, name } of rows) {
    await db.execute(
      "INSERT INTO link_tags (id, link_id, name, created_at) VALUES ($1,$2,$3,$4)",
      [tagId, link.id, name, now]
    )
  }

  if (getAppMode() === "cloud") {
    await tursoExecute(
      "INSERT OR IGNORE INTO links (id,url,title,favicon_url,created_at,updated_at) VALUES (?,?,?,?,?,?)",
      [link.id, link.url, link.title, link.favicon_url, link.created_at, link.updated_at]
    )
    for (const { id: tagId, name } of rows) {
      await tursoExecute(
        "INSERT OR IGNORE INTO link_tags (id,link_id,name,created_at) VALUES (?,?,?,?)",
        [tagId, link.id, name, now]
      )
    }
  }

  backgroundSync()
  return { ...link, tags: input.tags }
}

export async function updateLink(id: string, input: UpdateLinkInput): Promise<void> {
  const db         = await getDb()
  const updated_at = new Date().toISOString()

  await db.execute(
    "UPDATE links SET title=$1, updated_at=$2 WHERE id=$3",
    [input.title ?? null, updated_at, id]
  )

  if (getAppMode() === "cloud") {
    await tursoExecute(
      "UPDATE links SET title=?, updated_at=? WHERE id=?",
      [input.title ?? null, updated_at, id]
    )
  }

  backgroundSync()
}

export async function deleteLink(id: string): Promise<void> {
  const db = await getDb()
  await db.execute("DELETE FROM links WHERE id = $1", [id])

  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM links WHERE id = ?", [id])
    await tursoExecute("DELETE FROM link_tags WHERE link_id = ?", [id])
  }

  backgroundSync()
}

export async function setTagsForLink(linkId: string, tags: string[]): Promise<void> {
  const db  = await getDb()
  const now = new Date().toISOString()
  const rows = tags.map(name => ({ id: randomUUID(), name }))

  await db.execute("DELETE FROM link_tags WHERE link_id = $1", [linkId])
  for (const { id, name } of rows) {
    await db.execute(
      "INSERT INTO link_tags (id, link_id, name, created_at) VALUES ($1,$2,$3,$4)",
      [id, linkId, name, now]
    )
  }

  if (getAppMode() === "cloud") {
    await tursoExecute("DELETE FROM link_tags WHERE link_id = ?", [linkId])
    for (const { id, name } of rows) {
      await tursoExecute(
        "INSERT OR IGNORE INTO link_tags (id,link_id,name,created_at) VALUES (?,?,?,?)",
        [id, linkId, name, now]
      )
    }
  }
}
