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
index.html      every page and all text content
css/style.css   design tokens, components, motion, responsive, reduced-motion
js/main.js      router, wipe, menu, cursor, desk dragging, monitor/tapes, demos, film reel
README.md       short public readme
```

## How it works

- **Routing:** hash routes (`#/`, `#/work`, `#/work/uploader`, `#/work/toto`, `#/work/memesh`, `#/films`, `#/about`). Each page is a `<section class="page" data-page="...">`, and `.is-active` shows it. The `routes` object in `main.js` maps hash → page, wipe label and header name. Adding a page means adding a section and a route.
- **Page wipe:** `.wipe` gets `.is-cover`, then the page swaps, then `.is-reveal`, then it resets. It's skipped on first load and with `prefers-reduced-motion`.
- **Animations replay** because pages go from `display:none` to visible. `.up` / `.d1–.d4` stagger content. `[data-split]` headings are split into words and letters by JS.
- **Cursor:** only on fine pointers. Elements with `data-cursor="view|drag"` grow it into the orange circle.
- **The desk:** `.obj` elements have `data-x`, `data-y` and `data-r` (home position and rotation). Pointer events drag them, and buttons and links inside an object don't start a drag.
- **Tapes:** dropping a tape (`[data-tape]`) on the monitor, or pressing its ▶ button, inserts it. The monitor `data-state` is `empty`, `idle` or `playing`.
- **Demos** share state across all their instances (desk and project page):
  - `[data-widget="uploader"]`: simulated upload of 3 sample files.
  - `[data-widget="toto"]`: score picker plus lock. They're rendered by `renderUploader()` and `renderToto()`.
- **Film reel:** each `[data-clip]` has `data-start`/`data-end` (0–1 along the track) plus title, part, presents, meta, file and youtube. The reel plays across 150 "seconds" of timecode; clicking a clip, scrubbing the ruler, or prev/next jumps.
- **YouTube:** put the video id in `data-youtube="..."` on a clip or a tape. The player is embedded with `youtube-nocookie.com`. If the id is empty, a placeholder shows instead.

## Content still missing (all in `index.html`, in `[SQUARE BRACKETS]`)

- One-line descriptions: Mega Uploader (`[One line...]`) and Memesh (`[One line...]`).
- Mega Uploader year: `[Year]`.
- Film 2 (title, subtitle, genre), runtimes and YouTube ids. Leviathan Part 1 is on The Wide Silence.
- Real visuals: screenshots or screen recordings for the polaroid / Memesh stage, and optionally film stills.
- Email, LinkedIn and YouTube links (About page and menu footer).

Other works Yoav has built that could join later: **Ad Intel** and **LoreWire**. Each would be a new desk object, a Work card, a project page and a route. Keep the "same object on desk and page" rule.

## Ideas on the list (not done yet)

- The desk is 1420px wide and scrolls sideways on phones. A dedicated phone layout for the desk (stacked objects, no dragging) would be nicer.
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
  - Check at 390px width.
  - Check the console for errors.
- **Commit messages** should be short and in plain English. Push to `main` only when Yoav asks.
