# Save Links Feature Plan

## Overview

Save any URL with an auto-fetched title and optional tags. Browse links as a simple
list (newest first), filter by tag, search by title. Clicking a link opens it in the
system browser. Duplicate URLs are blocked.

---

## Decisions Log

| Question | Decision |
|----------|----------|
| Display | Simple list — favicon + title + domain + tags + date |
| Favicon | Yes — fetched via Google Favicon API (no extra dep) |
| Extra metadata | None — title + URL + tags only |
| Open link | System default browser (`tauri-plugin-opener`, already installed) |
| Edit after save | Yes — title and tags editable |
| Duplicates | Block — show error if URL already exists |
| Filter | Click a tag pill → filter list to that tag |
| Sort | Always newest first (`created_at DESC`), no sort toggle |
| Tag autocomplete | Yes — suggest from previously used tags |

---

## Database Schema

### Migration: `004_links.sql`

```sql
CREATE TABLE IF NOT EXISTS links (
  id          TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  title       TEXT NOT NULL,
  favicon_url TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  CONSTRAINT uq_links_url UNIQUE (url)     -- prevents duplicates at DB level
);

CREATE TABLE IF NOT EXISTS link_tags (
  id         TEXT PRIMARY KEY,
  link_id    TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_links_created_at     ON links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_tags_link_id    ON link_tags (link_id);
CREATE INDEX IF NOT EXISTS idx_link_tags_name       ON link_tags (name);
```

`ON DELETE CASCADE` on `link_tags` — deleting a link removes its tags automatically.  
`UNIQUE (url)` — duplicate check enforced at DB level as a safety net; UI checks first
and shows a friendly error before hitting this.

---

## Remote Schema (Turso sync)

Add both tables + indexes to `REMOTE_SCHEMAS` in `src/lib/schema.ts`.  
Add `syncLinks()` in `src/lib/sync.ts` following the same last-write-wins pattern as
todos and notes. Call it inside the main sync function.

---

## Rust: `fetch_link_metadata` command

Fetching the page title requires an HTTP request from Rust (avoids browser CORS issues).

### New dependency in `Cargo.toml`

```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls"] }
tokio   = { version = "1", features = ["sync"] }   # already present
```

### Command

```rust
#[derive(serde::Serialize)]
struct LinkMetadata {
    title:       String,
    favicon_url: String,
}

#[tauri::command]
async fn fetch_link_metadata(url: String) -> Result<LinkMetadata, String> {
    // 1. GET the URL (follow redirects, 5s timeout)
    // 2. Read response body (first 50KB is enough for <title>)
    // 3. Extract <title>...</title> with simple string search
    // 4. Compute favicon URL from domain using Google Favicon API
    //    → https://www.google.com/s2/favicons?domain={domain}&sz=32
}
```

No HTML parser library needed — a simple case-insensitive string search for
`<title>` covers 99% of pages. Falls back to the bare domain name if no title found.

Register in `invoke_handler` and add to `src-tauri/capabilities/default.json`
(no extra permission needed — Rust can make outbound HTTP freely).

---

## Data Access Layer

**File:** `src/lib/links.ts`

```ts
getLinks()                           // all links, newest first, with tags
searchLinks(query: string)           // LIKE on title + url
getLinksByTag(tag: string)           // filter by single tag
checkDuplicateUrl(url: string)       // returns true if URL already saved
createLink(input)                    // inserts link + tags
updateLink(id, input)                // title only (URL never changes after save)
deleteLink(id)                       // permanent, cascade removes tags
getTagsForLink(id)                   // string[]
setTagsForLink(id, tags)             // replace all tags
getAllUsedTags()                      // DISTINCT tag names for autocomplete
```

**Types** (`src/lib/types/link.ts`):
```ts
interface Link {
  id:          string
  url:         string
  title:       string
  favicon_url: string | null
  created_at:  string
  updated_at:  string
  tags?:       string[]
}

interface CreateLinkInput {
  url:         string
  title:       string
  favicon_url: string | null
  tags:        string[]
}

type UpdateLinkInput = Partial<Pick<Link, 'title'>>
```

---

## UI Layout

```
LinksPage
├── Toolbar row
│   ├── Search input (searches title + url)
│   ├── Tag filter pills (all used tags shown; click to activate filter)
│   └── "+ Save link" button → opens AddLinkDialog
└── Link list (flex-col, gap)
    └── LinkListItem × n           newest first
        ├── Favicon (32×32, rounded, fallback to globe icon)
        ├── [Title]  ← editable inline (click to edit)
        │   [domain.com]  ← muted, click opens in browser
        ├── Tag badges (click a tag → activates that filter)
        └── Date + delete button (hover to reveal)
```

---

## Component Details

### `add-link-dialog.tsx`
Steps inside a single dialog:

1. **URL input** — paste URL, press Enter or click "Fetch"
2. **Fetching state** — spinner while `fetch_link_metadata` runs
3. **Confirm step** — shows fetched title (editable), tag input
4. **Save** — calls `createLink`, closes dialog, list refreshes

Error states:
- Invalid URL format → inline validation message
- Duplicate URL → "Already saved — [view it](#)"
- Fetch failed → show URL as title, user can edit manually

### `link-list.tsx`
- Fetches all links on mount (with tags)
- Listens for `personal-os:sync-complete` → silent refresh
- Manages `searchQuery` + `activeTag` state
- Passes filtered list to list items
- Shows empty state when no links or no results

### `link-list-item.tsx`
- Favicon via `<img src={favicon_url} />` with fallback globe icon on error
- Title: click to enter inline edit mode → `blur` / `Enter` saves via `updateLink`
- URL domain: click → `invoke("open_url", { url })` via `tauri-plugin-opener`
- Tags: `<Badge>` per tag, clicking one sets it as active filter
- Delete button: appears on row hover, single click (permanent — no confirm dialog
  since there is no trash)

### `link-tag-input.tsx`
- Same UX as `note-tag-input.tsx` — type + `Enter` or `,` to add
- Autocomplete: `getAllUsedTags()` on focus, filter as user types
- Show suggestions as a small dropdown below input

---

## Tag Filter Pills

Above the list, show all distinct tags used across all links as clickable pills.
- No active filter → all links shown
- One tag active → only links with that tag shown
- Click active tag again → deactivate (show all)

Keep it single-select for simplicity (no multi-tag AND filter for now).

---

## Duplicate Handling Flow

```
User pastes URL → dialog validates format
       ↓
checkDuplicateUrl(url)
       ↓
exists? → show inline message: "Already saved" + link to scroll to it
       ↓
not exists? → proceed to fetch metadata
```

---

## Auto-open in Browser

Use `tauri-plugin-opener` (already installed and permissioned):
```ts
import { openUrl } from "@tauri-apps/plugin-opener"
await openUrl(link.url)
```

---

## Sync Considerations

- `syncLinks()` syncs `links` table (last-write-wins on `updated_at`)
- `link_tags` sync: same pattern as `note_tags` — pull/push by `(link_id, name)` pair
- Background sync after `createLink`, `updateLink`, `deleteLink` — always `{ silent: true }`

---

## Implementation Order

1. `004_links.sql` migration
2. Cargo.toml: add `reqwest`
3. `lib.rs`: register migration + `fetch_link_metadata` command
4. `schema.ts`: add links tables to `REMOTE_SCHEMAS`
5. `src/lib/types/link.ts`
6. `src/lib/links.ts` (DAL)
7. `sync.ts`: add `syncLinks()`
8. Install no new frontend libraries (already have everything)
9. Components (in order):
   - `link-tag-input.tsx`
   - `add-link-dialog.tsx`
   - `link-list-item.tsx`
   - `link-list.tsx`
10. Update `src/pages/links.tsx`
11. Wire `fetch_link_metadata` invoke call in dialog

---

## Out of Scope (for now)

- Multi-tag AND filter (e.g. `work` + `design`)
- Bulk import (e.g. from browser bookmarks)
- Screenshot / page preview
- Archive / read-later status
- Link health check (detect broken URLs)
- Browser extension for one-click saving
