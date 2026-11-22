# CLAUDE.md — yoavmizrahi portfolio

Context for Claude Code. Read this before changing anything.

## What this is

The personal portfolio site of **Yoav Mizrahi**: a showcase of the products he builds with AI coding agents and the AI films he makes for his YouTube channel, **The Wide Silence**.

- **It is a showcase, not a marketing site.** No sales sections, no "services", no pricing, no hard calls to action. The work speaks for itself.
- **The work must be interactive, not screenshots.** Visitors should be able to *use* the products in the page.
- **The "wow" should be crafted, not overwhelming.** Polish lives in small details: motion, consistency, feel.

Repo: `github.com/yoavm7-code/yoavmizrahi` · Hosting: GitHub Pages (deploy from `main`, root).

## About the owner (how to work with him)

- Yoav is a **product engineer who builds through AI agents**. He is not a classic developer: explain changes in plain language, and don't ask him low-level coding questions. Decide sensibly and tell him what you decided.
- He is **creative and a perfectionist**. He notices visual inconsistencies and cares about every detail. Before calling something done, check it in a real browser: desktop **and** phone width.
- He prefers seeing real options over long discussion. For a visual change, show it.

## How the design was chosen

Eleven concepts were explored. The site is the 11th, "Harmonized", which combines three of them in one design language:

1. **The Desk (home):** a top-down desk where every work is a physical object you can drag and use: a sticky note, the Mega Uploader device, a phone running Toto Mundial, a monitor, cassette tapes and a polaroid.
2. **Studio (structure):** real pages, a full-screen menu, a page-wipe transition, letter-by-letter headings and a custom cursor.
3. **Timeline (Films page):** a film editor: a viewer with a timecode, a scrubbable track of film clips, and a play/prev/next transport.

**Harmony rules — keep them:**
- **One palette everywhere** (tokens in `:root` in `css/style.css`):
  - Paper: `--paper #EDE9E1`, `--paper-2 #F7F4EF`.
  - Ink: `--ink #171614`, `--ink-2/3`.
  - Lines: `--line #D9D3C7`.
  - Muted text: `--muted #6B665C`.
  - **One accent only: `--accent #FF5A36`.** Use it for live and important things only: play buttons, progress, numbers, the playhead, the cursor, the wipe edge. Don't add new colors.
- **The desk is the page itself.** The paper background with a faint grid (`.grid-surface`) is the desk. There is no separate "desk color".
- **One family of objects.** Every device (uploader, phone, monitor, tapes) shares the same ink body (`--ink`, `--ink-line` border, rounded).
- **The same object on the desk and on its project page.** A project page shows the same device, bigger, on a desk-surface "stage". Clicking feels like zooming in, not jumping elsewhere.
- **Films is the same room with the lights off.** `body[data-theme="dark"]` swaps paper and ink. The viewer is the desk's monitor, enlarged.
- **Three typefaces, each with one job:**
  - **Syne 800** for display headings.
  - **JetBrains Mono** for small labels, numbers, navigation, timecode and tape labels.
  - **Inter** for body text.
  - **Caveat** (handwriting) appears **only** on the sticky note.
- **One easing:** `--ease cubic-bezier(.2,.8,.2,1)`. Use `--ease-io` for the wipe and menu.

## Tech

Plain **HTML + CSS + vanilla JS**. No framework, no build step, no dependencies (Google Fonts only). Keep it that way unless Yoav agrees otherwise.

```
content/site.json   ALL content: texts, works, films, desk positions, links. The source of truth.
js/schema.js        content rules: normalize() + validate(), object styles, sizes, limits
js/render.js        generates index.html and the share pages (w/<id>/, f/<id>/) from site.json
index.html          GENERATED. Never edit by hand; it is overwritten on every publish.
w/, f/              GENERATED share pages (link previews for each work and film)
css/style.css       design tokens, components, motion, responsive, reduced-motion
js/main.js          behavior only: router, wipe, menu, cursor, desk, monitor/tapes, demos, reel
admin/              the admin (see below)
tools/generate.mjs  regenerates index.html + share pages locally: node tools/generate.mjs
_plans/             approved plans
README.md           short public readme
.nojekyll           tells GitHub Pages to serve files as they are
```

**Content flow:** content lives in `content/site.json`. `js/render.js` turns it into the finished `index.html` (no runtime fetching: visitors get complete HTML). Yoav edits through the admin, which runs `render.js` in the browser and commits JSON + HTML together. If you change `js/render.js` or `content/site.json` by hand, run `node tools/generate.mjs` and commit the regenerated files. Markup changes go in `render.js`, never in `index.html`.

## The admin (`/admin/`)

- Unlocked with a fine-grained GitHub key (this repo only, Contents read/write). On `*.github.io` the key lives only in the open tab (other Pages sites share that origin); on Yoav's own domain he can stay signed in.
- Drafts autosave to localStorage and sync to the `drafts` branch (`content/draft.json` + uploaded media), so laptop and phone share one draft. Publishing resets `drafts` to `main`.
- Publish = validate → render → one atomic commit to `main` (Git Trees API) → poll the live `index.html` until `<meta name="build">` matches.
- History restores past versions as new commits. `admin/rescue.html` (self-contained) undoes the last publish even if the admin is broken.
- Uploaded images are re-encoded through a canvas (strips GPS/EXIF), max 2400px, WebP, named by content hash in `media/`. Media is never deleted, so restores always work.
- Strict CSP in `admin/index.html`, no third-party scripts, all content inserted as text. The preview is the real site rendered into a blob iframe; `data-mode="arrange"` turns on desk arranging (positions sent back with postMessage).
- Files: `app.js` (shell, routing, publish UI), `panels.js` (editor screens), `store.js` (draft, undo, sync), `publish.js`, `preview.js`, `github.js`, `media.js`, `ui.js`, `config.js`.

## How it works

- **Routing:** hash routes (`#/`, `#/work`, `#/work/<id>`, `#/films`, `#/films/<id>`, `#/about`). Each page is a `<section class="page" data-page="..." data-route data-label data-name>`, and `.is-active` shows it. `main.js` builds its routes from those attributes, so new works get routes automatically. `#/films/<id>` opens the reel on that film.
- **Phone and tablet:** up to 900px the desk becomes a pile (flex, order from `data-m`, slight tilt, no dragging, tapes play with ▶). Between 900px and the desk width the whole desk is scaled with `zoom` so nothing hides off to the side. Film titles shrink to fit (`fitText`).
- **Page wipe:** `.wipe` gets `.is-cover`, then the page swaps, then `.is-reveal`, then it resets. It's skipped on first load and with `prefers-reduced-motion`.
- **Animations replay** because pages go from `display:none` to visible. `.up` / `.d1–.d4` stagger content. `[data-split]` headings are split into words and letters by JS.
- **Cursor:** only on fine pointers. Elements with `data-cursor="view|drag"` grow it into the orange circle.
- **The desk:** `.obj` elements have `data-x`, `data-y` and `data-r` (home position and rotation) and `data-obj` keys (`note`, `monitor`, `work:<id>`, `tape:<id>`). Pointer events drag them, and buttons and links inside an object don't start a drag. Works use one of four object styles: `device`, `phone`, `polaroid`, `screen` (a small monitor). The uploader and Toto demos are hand-built and tied to their works.
- **Tapes:** dropping a tape (`[data-tape]`) on the monitor, or pressing its ▶ button, inserts it. The monitor `data-state` is `empty`, `idle` or `playing`.
- **Demos** share state across all their instances (desk and project page):
  - `[data-widget="uploader"]`: simulated upload of 3 sample files.
  - `[data-widget="toto"]`: score picker plus lock. They're rendered by `renderUploader()` and `renderToto()`.
- **Film reel:** each `[data-clip]` has `data-start`/`data-end` (0–1 along the track) plus title, part, presents, meta, file and youtube. The reel plays across 150 "seconds" of timecode; clicking a clip, scrubbing the ruler, or prev/next jumps.
- **YouTube:** put the video id in `data-youtube="..."` on a clip or a tape. The player is embedded with `youtube-nocookie.com`. If the id is empty, a placeholder shows instead.

## Content still missing (in `content/site.json`, in `[SQUARE BRACKETS]`)

Yoav fills these in through the admin; its Overview lists every one with a "Fix" button.

- One-line descriptions: Mega Uploader (`[One line...]`) and Memesh (`[One line...]`).
- Mega Uploader year: `[Year]`.
- Film 2 (title, subtitle, genre), runtimes and YouTube ids. Leviathan Part 1 is on The Wide Silence.
- Real visuals: screenshots or screen recordings for Memesh.
- Email, LinkedIn and YouTube links, and the site address (domain).

Other works Yoav has built that could join later: **Ad Intel** and **LoreWire**. He can add them in the admin (Works → Add a work).

## Ideas on the list (not done yet)

- Real assets instead of placeholders; the Toto demo could use real World Cup 2026 fixtures.
- Hebrew version? Not decided — ask Yoav.

## Working rules

- **Look at the whole picture before changing one part.** A change to one object or page must stay consistent with the rest: same palette, type roles, easing and object family.
- **Always edit the live files.** Never paste an older version over the current one.
- **No invented facts.** Don't make up stats, clients, testimonials or project details. Use `[PLACEHOLDER]` and ask.
- **Accessibility basics:** real `<button>` and `<a>` elements, `aria-label` on icon-only buttons, touch targets of 44px or more, and text contrast of 4.5:1 or better.
- **Test before saying done:**
  - Serve the folder (`npx serve .` or `python -m http.server`).
  - Click through every route.
  - Drag a tape into the monitor.
  - Run both demos and the reel.
  - Check at 390px, 820px (tablet) and 1180px (laptop) width.
  - Check the console for errors.
  - For admin changes: test against a fake GitHub API (Playwright route interception), never the real repo.
- **Commit messages** should be short and in plain English. Push to `main` only when Yoav asks.
