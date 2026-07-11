# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

**personal-os** is a desktop application built with **Tauri v2** (Rust backend) and a
**React 19 + TypeScript + Vite** frontend. UI is styled with **Tailwind CSS v4** and
**shadcn** components (style: `new-york`) built on top of **Radix** primitives.

## Tech Stack

| Layer      | Tech                                                        |
| ---------- | ---------------------------------------------------------- |
| Desktop    | Tauri v2 (Rust, edition 2021)                              |
| Frontend   | React 19, TypeScript ~5.8, Vite 7                          |
| Styling    | Tailwind CSS v4 (`@tailwindcss/vite`), tw-animate-css      |
| Components | shadcn (`new-york`), Radix (`radix-ui`), lucide-react |
| Utils      | clsx, tailwind-merge, class-variance-authority             |

## Commands

Run all frontend commands with `npm`. Prefer the Tauri commands for real work since
they launch the desktop shell.

```bash
npm run dev          # Vite dev server only (port 1420, strict)
npm run build        # tsc typecheck + vite build -> dist/
npm run preview      # preview built frontend
npm run tauri dev    # full desktop app in dev (runs npm run dev first)
npm run tauri build  # build production desktop bundle
```

There is no separate lint/test script configured. Type checking happens via `tsc`
during `npm run build`. Use it to validate TypeScript changes.

For Snapcraft packaging, use `sg lxd -c 'snapcraft pack'` if the current shell's
`id` output does not include the `lxd` group. The `hadi` user is configured as a
member of `lxd`, but existing shells may have stale group membership until logout.

## Project Structure

```
src/                  # React frontend
  main.tsx            # React entry (StrictMode -> ErrorBoundary -> TooltipProvider -> App)
  App.tsx             # Router definition only (createHashRouter + RouterProvider)
  App.css             # Tailwind + theme tokens (@theme inline)
  components/
    layout.tsx        # Root layout: SidebarProvider + AppSidebar + AppHeader + Outlet
    app-header.tsx    # Header bar: SidebarTrigger + breadcrumb (driven by useMatches)
    app-sidebar.tsx   # Sidebar nav items
    error-boundary.tsx # Catches runtime errors and displays them visually
    ui/               # shadcn UI components (e.g. button.tsx)
  lib/utils.ts        # cn() helper (clsx + tailwind-merge)
  hooks/              # React hooks (e.g. use-mobile.ts)
  pages/              # One file per route (links, todo, projects, work-log, notes)
src-tauri/            # Rust backend
  src/lib.rs          # Tauri commands (e.g. greet) + app builder
  src/main.rs         # Binary entry -> personal_os_lib::run()
  tauri.conf.json     # Tauri config (window, bundle, build hooks)
  Cargo.toml          # Rust deps
  capabilities/        # Tauri permission/capability definitions
components.json       # shadcn config
```

## Import Conventions

This project uses **subpath imports** (Node `imports` field in package.json), NOT the
typical `@/` alias. Always use these:

```ts
import { Button } from "#components/ui/button"  // -> src/components/*.tsx
import { cn } from "#lib/utils"                  // -> src/lib/*.ts
import { useThing } from "#hooks/useThing"       // -> src/hooks/*.ts
import LinksPage from "#pages/links"             // -> src/pages/*.tsx
```

shadcn aliases (in components.json) map: `ui` -> `#components/ui`,
`utils` -> `#lib/utils`, `components` -> `#components`, `lib` -> `#lib`,
`hooks` -> `#hooks`.

## Conventions & Notes

- **UI primitives come from `radix-ui`** (the unified Radix package). shadcn components
  in `src/components/ui/` are the default (`new-york`) style, so standard shadcn docs and
  copy-paste examples work as-is — including `asChild` and `data-[state=...]` /
  `data-[orientation=...]` selectors.
- Add new shadcn components with `npx shadcn@latest add <component>`; they land in
  `src/components/ui/`.
- Use the `cn()` helper from `#lib/utils` for conditional/merged class names.
- Use `class-variance-authority` (`cva`) for component variants, following the pattern
  in `src/components/ui/button.tsx`.
- Icons: use `lucide-react`.
- **Routing:** uses `createHashRouter` + `RouterProvider` (data router — required for
  `useMatches`, loaders, etc.). Hash-based URLs (`/#/links`) are needed for Tauri since
  it serves static files with no server-side fallback. Define routes in `App.tsx` only.
  One component per file — layouts in `src/components/`, pages in `src/pages/`.
- **Frontend <-> backend:** call Rust commands with `invoke("command_name", args)`
  from `@tauri-apps/api/core`. Register new commands in
  `src-tauri/src/lib.rs` via `tauri::generate_handler![...]`.
- TypeScript is **strict** with `noUnusedLocals`/`noUnusedParameters` — keep code clean
  of unused bindings or the build will fail.
- Dev server port **1420 is fixed and strict**; don't change it without updating
  `tauri.conf.json` (`devUrl`).
- Do not edit generated files under `src-tauri/gen/` or `src-tauri/target/`.

## Sync Rules

This app has two sync modes driven by `getAppMode()` from `#lib/config`:
- **`local`** — SQLite only (`personal-os-local.db`), no cloud, no sync calls
- **`cloud`** — SQLite (`personal-os-cloud.db`) + Turso HTTP sync

### syncTodos(options?)
`syncTodos()` in `#lib/sync` is the single sync entry point. It syncs both `todos`
and `app_settings` tables bidirectionally (last-write-wins via `updated_at`).

| Caller | How to call | Why |
|--------|-------------|-----|
| After a write (create/update/delete) | `syncTodos({ silent: true })` | UI state already correct — push only, no UI refresh |
| App startup (`Layout.tsx`) | `syncTodos()` | Pull remote changes into UI on open |
| Manual sync button / cloud sync icon | `syncTodos()` | User-initiated, refresh UI with remote changes |

**Never** call `syncTodos()` (without `silent: true`) after local writes — it dispatches
`personal-os:sync-complete` which triggers `refreshTodos()` in `KanbanBoard`, causing
visible flicker. Background syncs must always use `{ silent: true }`.

### Adding a new synced table
1. Add migration SQL to `src-tauri/migrations/00N_table.sql`
2. Register in `lib.rs` for both `personal-os-local.db` and `personal-os-cloud.db`
3. Add `CREATE TABLE IF NOT EXISTS ...` to `REMOTE_SCHEMAS` in `#lib/schema`
4. Add a `syncTableName()` function in `#lib/sync` following the todos/app_settings pattern
5. Call it inside `syncTodos()`

## When Adding Features

1. Frontend UI -> `src/components/`, using `#`-prefixed imports and `cn()`.
2. New Rust command -> add `#[tauri::command]` fn in `lib.rs`, register in the handler,
   call from React with `invoke()`.
3. New permissions -> update `src-tauri/capabilities/default.json`.
4. Validate with `npm run build` (typecheck) and `npm run tauri dev` (runtime).
</content>
</invoke>
