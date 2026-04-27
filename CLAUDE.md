# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **mttpla.github.io** personal website repo, deployed via GitHub Pages. It has two independent parts:

1. **Root site** (`index.html`, `js/`, `css/`) — static personal portfolio page with no build step.
2. **JsonTableExplorer** (`JsonTableExplorer/`) — a standalone browser-only SPA. See `JsonTableExplorer/CLAUDE.md` for its full architecture and conventions.

There is also a legacy **Go backend** (`matteopaoli.it.go`, `utils.go`, `app.yaml`) targeting Google App Engine (go1.9). It is not actively used — the site is served as static files on GitHub Pages.

## Development

No build pipeline. Serve statically:

```bash
python3 -m http.server 8000
```

Go files (legacy, not normally needed):

```bash
go test ./...
go build .
```

## Architecture

### Static site (root)

- `index.html` — single-page portfolio; loads jQuery 3.1.1 from CDN and `js/matteopaoli-it.js`.
- `js/matteopaoli-it.js` — vanilla JS for the portfolio page.
- `css/matteopaoli-it.css` — site styles.
- `css/fontawesome-free-6.5.1-web/` — bundled FontAwesome (brands + fontawesome subsets only).
- `imgs/` — static assets (photos, logos).
- `CNAME` — GitHub Pages custom domain config.

### Go backend (legacy)

- `matteopaoli.it.go` — HTTP handlers (`HomeHandler`, `notFound`) + `main()` wiring gorilla/mux and App Engine.
- `utils.go` — leveled logger (`Trace`, `Info`, `Warning`, `Error`) initialized via `LogInit`.
- `app.yaml` — App Engine routing: static dirs for `css/`, `imgs/`, `js/`; `/engine/*` routed to Go app; everything else falls back to `index.html`.

### JsonTableExplorer

Fully documented in `JsonTableExplorer/CLAUDE.md`.
