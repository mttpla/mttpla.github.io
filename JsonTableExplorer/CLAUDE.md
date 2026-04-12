# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JSON Table Explorer is a **browser-only**, single-page application that turns arbitrary JSON into interactive tables. No build step, no bundler, no server — just static HTML + vanilla JS served via GitHub Pages. All processing happens client-side.

## Development

Open `index.html` directly in a browser or serve with any static file server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

There is **no build, lint, or test pipeline**. Changes are verified manually in the browser.

## Architecture

The app is split into 7 JS files loaded in strict dependency order via `<script>` tags in `index.html`:

1. **`app-state.js`** — Global singleton `state` object and `ui` DOM reference cache. All modules read/write `state` directly. Constants like `JTE_KEY`, `DEFAULT_FLATTEN_DEPTH`, `DEFAULT_PAGE_SIZE`, `DEFAULT_VISIBLE_COLUMN_LIMIT` live here.
2. **`app-utils.js`** — Pure helper functions (`isPlainObject`, `escapeHtml`, `clamp`, Tabulator calc formatters). No side effects.
3. **`app-render.js`** — All DOM rendering: sections (summary, metadata, JSON tree), settings drawer, loading overlay, paste panel, control state. `runBlockingTask()` wraps expensive work in a rAF+setTimeout to allow the loading spinner to paint.
4. **`app-json-tree.js`** — Recursive renderer for the "Original JSON" collapsible tree view.
5. **`app-data.js`** — Data pipeline: file reading, JSON parsing, dataset detection (`detectTopLevelDatasets`), nested-object flattening, schema discovery, column registry, JTE settings extraction/application. This is the largest and most complex module.
6. **`app-tables.js`** — Tabulator integration: table creation/refresh, column building, aggregations, global search filtering, column reorder sync.
7. **`app-main.js`** — Bootstrap: `initializeApp()`, all event bindings, handler functions for user actions (file upload, paste, search, settings changes, export, download JSON+settings).

### Key Data Flow

```
File/Paste input
  → processJsonDocument()          (app-data)
    → extractJteSettings()         strips $JsonTableExplorer key if present
    → detectTopLevelDatasets()     finds arrays, separates metadata
    → rebuildDatasetsFromRaw()     flattens rows, discovers schema, builds column registry
      → initializeAllTables()      creates Tabulator instances (app-tables)
```

### Multi-Dataset Model

A single JSON document can produce multiple independent tables. Each dataset has its own `id`, `name`, `schema`, `columnRegistry`, `columnOrder`, and Tabulator instance, all stored in `state.datasets[]`. The first dataset with columns is synced to `state.dataset`/`state.schema`/`state.table` for backward compatibility (via `syncPrimaryState()`).

### Settings Sharing (`$JsonTableExplorer` key)

"Download JSON + Settings" embeds a `$JsonTableExplorer` key into the exported JSON containing global settings + per-dataset column config (visibility, aggregation, order). On load, `extractJteSettings()` strips this key and `applyJteRegistryOnly()` restores the view. Root arrays are wrapped as `{ "$JsonTableExplorer": {...}, "$data": [...] }`.

## External Dependencies (CDN)

- **jQuery 3.7.1** — used only for footer commit info fetch (`$.getJSON`)
- **Tabulator 6.3.0** — table rendering, pagination, sorting, filtering, CSV export

## Conventions

- Vanilla ES5-style JS (`var`, `function`, no arrow functions, no modules). Keep this style.
- No frameworks, no transpilation, no npm.
- HTML is generated via string concatenation with `escapeHtml()` for user data — always escape.
- The `ui` object in `app-state.js` caches all DOM lookups at load time; add new elements there.
- Rendering follows a "re-render from state" pattern — mutate `state`, then call the appropriate `render*()` function.
