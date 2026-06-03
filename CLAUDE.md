# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **mttpla.github.io** personal website repo, deployed via GitHub Pages. It has two independent parts:

1. **Root site** (`index.html`, `js/`, `css/`) — static personal portfolio page with no build step.
2. **JsonTableExplorer** (`JsonTableExplorer/`) — a standalone browser-only SPA. See `JsonTableExplorer/CLAUDE.md` for its full architecture and conventions.

## Development

No build pipeline. Serve statically:

```bash
python3 -m http.server 8000
```

## Architecture

### Static site (root)

- `index.html` — single-page portfolio. Loads jQuery 3.1.1 and Tailwind Play CDN (preflight **disabled** — `matteopaoli-it.css` owns base styles; enabling preflight would break them). Tailwind utility classes and custom CSS coexist.
- `js/matteopaoli-it.js` — four behaviors: (1) hero photo cycles randomly every 3 s, (2) scroll/resize handler toggles `non-focus` class on `.each-event`/`.title` elements for fade-in, (3) assigns `event-left`/`event-right` zigzag alternation globally across all `.each-event` elements, (4) fetches latest commit info from GitHub API and fills `.lastcommit`/`.lastdate`/`#lasthtmlurl`.
- `css/matteopaoli-it.css` — base styles, timeline layout (`.wrapper`, `.block`, `.each-event`), hero, responsive breakpoints.
- `css/fontawesome-free-6.5.1-web/` — bundled FontAwesome (brands + fontawesome subsets only).
- `imgs/` — static assets (photos, logos).
- `favicon.svg` — inline SVG favicon with MP initials.
- `CNAME` — GitHub Pages custom domain config.

### JsonTableExplorer

Fully documented in `JsonTableExplorer/CLAUDE.md`.

## GEO / LLM Discoverability

Three files keep the site machine-readable for AI crawlers and LLM agents. **Before any commit that changes career, role, project, or publication data in `index.html`, review these files for consistency:**

- `llms.txt` — full CV narrative for LLM agents (IDE tools, MCP servers read this directly). Update roles, projects, publications here whenever `index.html` timeline changes.
- `index.html` `<head>` — JSON-LD `Person` schema (`jobTitle`, `worksFor`, `knowsAbout`, `sameAs`) and `<meta name="description">`. Keep in sync with current roles.
- `robots.txt` — AI crawler allowlist. Only needs updating if new major crawlers emerge (e.g., a new `*Bot` user-agent).

Reminder triggers: new job, new project added to timeline, new patent/publication, social profile URL change.
