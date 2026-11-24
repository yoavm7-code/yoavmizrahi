# CLAUDE.md: yoavmizrahi portfolio

Project context for AI coding agents (Claude Code). Read this before changing anything.

## What this is

The personal portfolio site of **Yoav Mizrahi**: a showcase of the products he builds with AI coding agents and the AI films he makes for his YouTube channel, **The Wide Silence**.

- **It is a showcase, not a marketing site.** No sales sections, no "services", no pricing, no hard calls to action. The work speaks for itself.
- **The work must be interactive, not screenshots.** Visitors should be able to *use* the products in the page.
- **The "wow" should be crafted, not overwhelming.** Polish lives in small details: motion, consistency, feel.

Repo: `github.com/yoavm7-code/yoavmizrahi` · Hosting: GitHub Pages, deployed by GitHub Actions from `main` only after the tests pass (see "Tests and deploys").

## Working with the owner

- Yoav is a **product engineer who builds through AI agents**: he owns the product, the design and the review, and the agents write the code. Describe changes by what they do for the visitor, make the implementation calls yourself and say what you decided.
- The bar is **visual and behavioral consistency** across every page and screen size. Before calling something done, check it in a real browser: desktop **and** phone width.
- Show real options instead of long discussion. For a visual change, show it.

## How the design was chosen

Eleven concepts were explored. The site is the 11th, "Harmonized", which combines three of them in one design language:

1. **The Desk (home):** a top-down desk where every work is a physical object you can drag and use: a sticky note, the Launch Desk device, a phone running Toto Mundial, a monitor, cassette tapes and a polaroid.
2. **Studio (structure):** real pages, a full-screen menu, a page-wipe transition, letter-by-letter headings and a custom cursor.
3. **Timeline (Films page):** a film editor: a viewer with a timecode, a scrubbable track of film clips, and a play/prev/next transport.

**Harmony rules (keep them):**
- **One palette everywhere** (tokens in `:root` in `css/style.css`):
  - Paper: `--paper #EDE9E1`, `--paper-2 #F7F4EF`.
  - Ink: `--ink #171614`, `--ink-2/3`.
  - Lines: `--line #D9D3C7`.
  - Muted text: `--muted #6B665C`.
  - **One accent only: `--accent #FF5A36`.** Use it for live and important things only: play buttons, progress, numbers, the playhead, the cursor, the wipe edge. Don't add new colors.
  - Two darker shades of it exist only for legibility: `--accent-text #B3381A` for small accent text on paper (the bright one is 2.6:1 there; on ink it's fine, so the dark theme maps it back), and `--accent-ring #D9471F` for the focus ring, which reads on paper and on ink.
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

Plain **HTML + CSS + vanilla JS**. No framework, no build step, no dependencies. The site's fonts are served from `fonts/` (the replicas still load theirs from Google Fonts). Keep it that way unless Yoav agrees otherwise.

```
content/site.json   ALL content: texts, works, films, the desk order, links. The source of truth.
js/schema.js        content rules: normalize() + validate(), object styles, sizes, limits
js/render.js        generates index.html and the share pages (w/<id>/, f/<id>/) from site.json
js/desk-layout.js   where everything sits on the desk (pure, unit tested), loaded before main.js
index.html          GENERATED. Never edit by hand; it is overwritten on every publish.
w/, f/              GENERATED share pages (link previews for each work and film)
css/style.css       fonts (@font-face), design tokens, components, motion, responsive, reduced-motion
fonts/              the four typefaces as woff2, Latin and Latin Extended, with their licenses (OFL.txt)
js/main.js          behavior only: router, wipe, menu, cursor, desk, monitor/tapes, demos, reel
admin/              the admin (see below)
demos/<name>/       replicas: a clickable copy of a work with made-up data, plus its demo.mp4 and poster.jpg (see "Replicas")
demos/shared/dom.js h(), clear(), makeLog(), makeToast(): one copy for every replica; each js/dom.js re-exports them
                    (and retryFailedImages(): a picture GitHub Pages fails with a 503 is asked for once more; js/main.js does the same for the site)
tools/generate.mjs  regenerates index.html + share pages locally: node tools/generate.mjs
tools/build-site.mjs collects the files that go live into _site/ (used by the deploy and the browser tests)
404.html            the not-found page GitHub Pages serves (hand-written; root-relative paths)
robots.txt, sitemap.xml  for search engines (hand-written)
share.jpg           the home page's link preview, 1200 x 630 (made by tests/share-images.mjs)
tests/              unit tests (node:test), browser tests (Playwright) and ESLint (eslint.config.mjs). Own package.json, never deployed
.editorconfig, .nvmrc  editor settings and the Node version (24) CI uses
.github/workflows/  deploy.yml (tests, then Pages) and checks.yml (tests + browser, on PRs and main)
_plans/             approved plans
README.md           short public readme
.nojekyll           tells GitHub Pages to serve files as they are
```

**Content flow:** content lives in `content/site.json`. `js/render.js` turns it into the finished `index.html` (no runtime fetching: visitors get complete HTML). Yoav edits through the admin, which runs `render.js` in the browser and commits JSON + HTML together. If you change `js/render.js` or `content/site.json` by hand, run `node tools/generate.mjs` and commit the regenerated files. Markup changes go in `render.js`, never in `index.html`.

## The admin (`/admin/`)

- **Sign-in:** username + password through the login server in `worker/` (Cloudflare Worker, free plan). The server holds the GitHub key encrypted and proxies only content changes to GitHub; see `worker/RUNBOOK.md` before touching it. Fallback "key mode" (a GitHub key pasted per device) returns if `LIVE_LOGIN_API` in `admin/config.js` is emptied.
- Drafts autosave to localStorage and sync to the `drafts` branch (`content/draft.json` + uploaded media), so laptop and phone share one draft. Publishing resets `drafts` to `main`.
- Publish = validate → render → one atomic commit to `main` (Git Trees API) → poll the live `index.html` until `<meta name="build">` matches.
- History restores past versions as new commits. `admin/rescue.html` (self-contained) undoes the last publish even if the admin is broken.
- Publishing commits every uploaded file the content points at (`usedMedia()` in `publish.js`: work pictures, demo logos and film stills). A new kind of upload must be added there, or the page will point at a missing file.
- Uploaded images are re-encoded through a canvas (strips GPS/EXIF), max 2400px, WebP, named by content hash in `media/`. Media is never deleted, so restores always work.
- Strict CSP in `admin/index.html`, no third-party scripts, all content inserted as text. The preview is the real site rendered into a blob iframe. The desk has no hand placement: the admin sets what sits on it and in what order, on computers (`desk.order`) and on phones and tablets (`desk.phoneOrder`; `null` while phones follow the computer order). The Desk screen's "On computers / On phones and tablets" switch and the preview's Desktop / Phone switch move together.
- Files: `app.js` (shell, sign-in screens, routing, publish UI), `panels.js` (editor screens), `store.js` (draft, undo, sync), `auth.js` (login server calls), `publish.js`, `preview.js`, `github.js`, `media.js`, `ui.js`, `config.js`.

## Tests and deploys

- **Every push to `main` deploys only if `npm test` passes** (`.github/workflows/deploy.yml`). That includes admin publishes. A failure leaves the last good version live, and the admin says "The site check stopped this publish" with a link to the failed run (it reads the public Actions API, no key).
- **Broken code on `main` blocks every admin publish until it is fixed.** So code changes go through a pull request, where `checks.yml` runs the browser suite too. Wait for it to be green before merging.
- `tests/unit/generated.test.mjs` fails if `index.html`, `w/` or `f/` don't match `render.js` + `site.json`. Fix: `node tools/generate.mjs`.
- The admin finds the deploy run by the workflow path `.github/workflows/deploy.yml`. Don't rename it.
- Rollback of the pipeline itself: Settings → Pages → Source: *Deploy from a branch* (`main`, root).

## How it works

- **Routing:** hash routes (`#/`, `#/work`, `#/work/<id>`, `#/films`, `#/films/<id>`, `#/about`). Each page is a `<section class="page" data-page="..." data-route data-label data-name>`, and `.is-active` shows it. `main.js` builds its routes from those attributes, so new works get routes automatically. `#/films/<id>` opens the reel on that film.
- **Phone and tablet:** up to 900px the desk becomes a pile in the phone order (flex, slight tilt). The page is written in the phone order (so phones show it before any script runs); `main.js` moves the objects into the computer order (`data-order`) above 900px, before the desk is laid out and shown, and back when the screen crosses 900px, so Tab and screen readers follow what is on screen. The tapes sit in a 2 by 2 rack on tablets and pile up like on the big desk on phones, and play with ▶. Objects drag after a press and hold, so a swipe still scrolls. Film titles shrink to fit (`fitText`).
- **Page wipe:** `.wipe` gets `.is-cover`, then the page swaps, then `.is-reveal`, then it resets. It's skipped on first load and with `prefers-reduced-motion`.
- **Keyboard and screen readers:** a skip link is the first Tab stop. Opening a page moves focus to its `h1` (the sticky note's first line on the desk), except on first load and inside a frame (the admin preview). The open menu makes the header and `main` inert and hands focus back to the Menu button when it closes. The reel ruler is a `role="slider"` (arrows 5 s, Page Up and Down 30 s, Home and End).
- **Content Security Policy:** `SITE_CSP` in `js/render.js`, written as a meta tag (Pages can't send headers). `404.html` repeats it, and a unit test keeps the two equal. The replicas' own pages carry `REPLICA_CSP` (also in `js/render.js`: their files, the content they read, Google Fonts, data: images from their CSS), checked the same way. A new outside host (a font, an embed) has to be added there, or the browser blocks it and the browser tests fail on the console error.
- **Animations replay** because pages go from `display:none` to visible. `.up` / `.d1–.d4` stagger content. `[data-split]` headings are split into words and letters by JS.
- **Cursor:** only on fine pointers. Elements with `data-cursor="view|drag"` grow it into the orange circle.
- **The desk arranges itself.** Wider than 900px, `js/desk-layout.js` packs the objects in the desk order (`desk.order` in site.json; older content called it `mobileOrder`) at the highest free spot with an even gap, tries narrower content widths and keeps the most compact composition that fits the screen, and centers it. The film corner is the monitor with its tapes piled beside it, or racked under it on narrower desks, whichever composes better. Each object's tilt comes from a hash of its key, so it's the same on every visit. Positions are never stored. `tests/unit/desk-layout.test.mjs` fails if anything overlaps or leaves the desk. `.obj` elements carry `data-obj` keys (`note`, `monitor`, `work:<id>`, `tape:<id>`); the tapes sit in one `data-obj-group="tapes"`.
- **Dragging:** anything drags anywhere on the desk (never off it): with a mouse straight away, on touch after a 350 ms press and hold. A drag is an offset on top of the object's home spot; **Tidy up** (bottom right, shown only after something moved) animates every offset back to zero. Nothing is remembered between visits. Buttons and links inside an object don't start a drag. A tape counts as dropped on the monitor when the pointer or the tape's middle is over it. Works use one of four object styles: `device`, `phone`, `polaroid`, `screen` (a small monitor). The uploader and Toto demos are hand-built and tied to their works.
- **Tapes:** dropping a tape (`[data-tape]`) on the monitor, or pressing its ▶ button, inserts it: a copy of the tape (`.tape-ghost`) flies into the screen while the real one waits hidden, then the screen powers on with a short warm glow (straight in with reduced motion). A tape pressed while another is in the air goes next. The monitor `data-state` is `empty`, `idle` or `playing`.
- **Standby:** with no tape in, the monitor crossfades through each film's first still (`data-stills`, written by `render.js`; `main.js` loads them one at a time after the page has loaded, and only on the desk). It runs only while the screen is in view, the tab is visible and the desk is open; reduced motion holds one still. Without stills it stays NO SIGNAL.
- **The first visit's hint:** wider than 900px, about 1.6 s in, the first tape leans toward the monitor and its ▶ rings once. Only if the tape is in view and nothing has been scrolled, pressed or dragged; never on phones or with reduced motion.
- **Hover:** with a mouse, an object lifts 3px under the pointer (the CSS `translate` property, so it adds to the tilt and drag offset).
- **Sound:** one switch for all the site's sound (the desk's clicks and the film playing), on the monitor and on the Films transport, every copy in step. It reads SOUND OFF (a crossed-out speaker) or SOUND ON (waves in the accent); on phones just the speaker and OFF / ON, with "SOUND" kept for screen readers. Off by default; pressing play on a film turns it on. The choice is kept on the device (`localStorage` key `ym-sound`). The film follows it through a `mute` / `unMute` message to the player (`enablejsapi=1`, no YouTube script on the page; that message format is what YouTube's own API sends, not documented on its own). The clicks (tape in, eject, the switch's tick) are made with Web Audio, no files.
- **Demos** share state across all their instances (desk and project page):
  - `[data-widget="uploader"]`: a pocket Launch with five campaigns from the replica's video (one fails on policy).
  - `[data-widget="toto"]`: a pocket match pick from the replica (Brazil vs Japan): steppers that save by themselves, with undo, and the dice. They're rendered by `renderUploader()` and `renderToto()`.
- **Replicas** (`demos/<name>/`): a clickable copy of the real product, with its own look and made-up data. A `DEMOS` entry in `js/schema.js` with a `replica` block puts it on the work's project page in place of the desk object: an ink device with TRY IT (the copy, loaded by `main.js` only when the page opens and scaled from its real size to fit) and WATCH IT (the recorded video). Up to 900px wide a desktop replica plays its video and the copy is one link away. A phone app sets `frame: 'phone'`: it sits in a phone-shaped device, stays clickable on every screen, and its work card shows it standing as a phone. `card: 'start'` crops the work card's poster from its left edge (for a poster whose title sits on the left). A responsive website sets `phone: { width, height }`: the device bar gets a DESKTOP / PHONE switch that resizes the copy so it reflows, WATCH IT always uses the wide device (the video is the desktop recording), and up to 900px wide it opens straight in the phone view. `label` says where the content comes from in the device bar (default MADE-UP DATA; LoreWire and I.M use their real content).
  - **Logo and wording from the admin:** a replica with `editable` in its `DEMOS` entry gets a section on its work's admin page: a logo slot (`logo: true`) and every line of its `i18n.js`, per language. They're saved in `works[].replica` (`{ logo, strings: { he, en } }`, cleaned by `replicaSettings()`), and the replica reads them from `content/site.json` when it starts (`js/settings.js`, then `applyWording()`). Placeholders like `{n}` must stay in a line; the admin warns when one is missing.
  - Launch Desk: `demos/launch-desk/`, the batch campaign launcher in a desktop window (1440 x 900), with its own name and look (a dark top bar, sage canvas, one deep green, IBM Plex) so it reads as a generic product, not a copy of the real tool. The top bar has the logo, three tabs (Overview, Batches, Launches), the platform switcher, notifications, the theme toggle and the user menu; there is no sidebar or assistant. Batches is the grid: brand chips, batch tabs, the Data tools, Create tracking links, Launch with its streaming log, and the "Try the demo" guide; Launches lists every launch down to each campaign's trace. `js/data.js` holds every name and number (all invented), `js/logic.js` the rules (pure, unit tested), the rest is UI. Screens switch in memory, never through the URL, so the portfolio's Back button still works. The old product name is banned in `replica-privacy.test.mjs`.
  - Toto Mundial: `demos/toto-mundial/`, a phone app (390 x 844). Same split (`data.js`, `logic.js`), plus `i18n.js` with every string in English and Hebrew: it opens in English and the globe button flips it to Hebrew, right to left (`?lang=he` opens in Hebrew). Spacing uses logical CSS properties so RTL mirrors by itself. Frozen on the first day of the round of 32; the live match runs on a fast clock from the first visit to Live.
  - Memesh: `demos/memesh/`, all three of the client's apps in one desktop window (1440 x 900): the parents' area, the front-desk till and the manager's back office. A demo bar on top switches role and language (Hebrew first, like the real product; `?role=desk|manager`, `?lang=en`). `js/store.js` is the one shared state, so a booking made as the parent can be scanned at the desk and shows up on the manager's dashboard. QR codes are drawn pictures, not readable codes. The real logo is set in the admin (Works → Memesh → Demo logo and wording) and lives in `media/`; without one, a text wordmark stands in. On the desk, Memesh's polaroid shows the replica's poster.
  - LoreWire: `demos/lorewire/`, the website in a desktop window (1440 x 900): Home (rotating hero, rows, Top 10), a story popup (Watch, Read, Read-along, Comments, with its poll), Wires (the vertical video feed with a mini poll), Browse, Today's Verdicts, Saved and search. Unlike the other replicas it uses LoreWire's own published stories, art and three videos, with Yoav's OK (`js/data.js`, media in `demos/lorewire/media/<story id>/`). Every story is labelled "Fictionalized story, inspired by real-life situations", never as true. The read-along has no narration here, so it highlights at a silent reading pace. Sign-in and settings are not in the demo; they show a short note instead. On the desk it's a small monitor showing the replica's poster.
  - Ad Radar: `demos/ad-radar/`, the competitor ad dashboard in a desktop window (1440 x 900), with its own name and look (a light theme: white cards on warm grey, 8px corners, Plus Jakarta Sans with DM Mono for numbers and domains, one magenta accent) so it reads as a generic product, not a copy of the real tool. The top bar has the logo, four tabs (Ads, Trends, Board, Scans), search and the last-scan status; every tab works and nothing else is in the nav. Ads: KPIs, filters (the gap finder: pick one of our sites, then Have / Missing; landing page, domain, vertical, language), sorting, CSV export. One ad in full: the creative, the competitor's landing article, our versions of it, and the Workflow (star, Draft article, status, brand, owner, linked article, notes; J and K move between ads). Trends opens Ads on a vertical; Board is drag and drop; Scans has Scan now and Stop with a live log, tracked domains and intervals. There are no feeds, revenue or RPC anywhere: those gave away the real business model. Every domain, ad, person and number is made up (`js/data.js`); the ad creatives are drawn in code (`js/creative.js`), never real ads. The old product name is banned in `replica-privacy.test.mjs`. On the desk it's a small monitor under the films monitor.
  - I.M Engineering: `demos/im-eng/`, the website Yoav built for I.M הנדסה ובניה (im-eng.co.il), in Hebrew, right to left, at desktop and phone size: the home page (hero video, about, projects, a client logo marquee, the contact form, footer), all projects, and a project page (details, works, the challenge, a gallery with a lightbox that swipes on phones). The accessibility panel's text size and twelve options all work (classes on `<html>`; colour filters go on the page and bars, never on `<body>`). It uses the real company, owner, contact details, clients, texts and photos with Yoav's OK (`js/data.js`, photos in `demos/im-eng/media/`), with the live site's mistakes fixed: real cities for "[עיר]", the "ללל" typo, the duplicate law-office project, projects without photos left out, and Raguan (whose live page is a 404) shown from its card text only. The form sends nothing: 800 ms, then the thank-you card (`?form=fail` shows the error state for tests). WhatsApp, phone, email and Instagram links show a note instead of opening. No "Powered by Kritix.io" line. On the desk it's a polaroid under the tapes.
  - **Privacy:** never copy real names, partners, IDs, numbers or times from the product. `tests/unit/replica-privacy.test.mjs` fails on known real terms in any script (Hebrew too), stored only as hashes (it explains how to add one). Tour specs and screenshots of the real product stay out of the repo (`.gitignore` covers `*-replica-spec.md` and `*-screenshots/`).
  - **Video:** after changing a replica, run `cd tests && npm run record:demos` (needs ffmpeg) and commit the new `demo.mp4` and `poster.jpg`. The script in `tests/record-demos.mjs` drives each replica at its own screen size with a visible pointer; `npm run record:demos -- toto-mundial` records just one.
  - **Poster sizes:** a desktop replica's poster also comes as `poster-480.webp`, `-960` and `-1440` (`POSTER_WIDTHS` in `js/schema.js`). The desk and the work cards pick one with `srcset`; the project page's video gets its poster only when the page opens, so a first visit doesn't fetch every poster. `record:demos` remakes them with each new poster; `npm run posters` remakes them all.
  - **Sandbox:** the replica iframe has `sandbox="allow-scripts allow-downloads"`, no `allow-same-origin`, so it runs as an outside page. A replica can't use `localStorage`, cookies or `window.parent`; it reads `content/site.json` and its own files through CORS (GitHub Pages sends `Access-Control-Allow-Origin: *`, and `tests/serve.mjs` does the same).
  - **Link previews:** a work's share page uses the replica's poster, or its `share` picture when the poster is too tall (Toto Mundial). `cd tests && npm run share:images` remakes `share.jpg` and the Toto one.
- **Design notes:** a work can have `design` notes (paragraphs split on blank lines), shown as a DESIGN block under its demo on the project page. The About page has a WEB DESIGN section from `about.design` (`lead` plus `points`); it only shows when it has text. Both are edited in the admin.
- **Films card (Work page):** each film can have up to four `stills` (uploaded pictures, set in the admin under the film's Stills). Every film's stills, in film order, run along a strip of film with sprocket holes on the Films card: it runs while the pointer is on the card, by itself on touch screens, and holds still with reduced motion. The frames are listed twice so the loop has no seam. Without any stills the card stays plain ink. The current stills are frames taken from the films on YouTube.
- **Film reel:** the player sits on the viewer's screen itself, so a playing film fills it. Each `[data-clip]` has `data-start`/`data-end` (0–1 along the track) plus title, part, presents, meta, file and youtube. The reel plays across 150 "seconds" of timecode; clicking a clip, scrubbing the ruler, or prev/next jumps.
- **YouTube:** put the video id in `data-youtube="..."` on a clip or a tape. The player is embedded with `youtube-nocookie.com`. If the id is empty, a placeholder shows instead.

## Placeholders

None right now. Missing content goes in `content/site.json` in `[SQUARE BRACKETS]`; the generator prints a note for each one, and the admin's Overview lists them with a "Fix" button.

## Ideas on the list (not done yet)

- Real assets instead of placeholders; the Toto demo could use real World Cup 2026 fixtures.
- Hebrew version? Not decided, ask Yoav.

## Working rules

- **Look at the whole picture before changing one part.** A change to one object or page must stay consistent with the rest: same palette, type roles, easing and object family.
- **Always edit the live files.** Never paste an older version over the current one.
- **No invented facts.** Don't make up stats, clients, testimonials or project details. Use `[PLACEHOLDER]` and ask.
- **Accessibility basics:** real `<button>` and `<a>` elements, `aria-label` on icon-only buttons, touch targets of 44px or more (a small control keeps its look and gets an invisible `::after` tap area), and text contrast of 4.5:1 or better. `tests/browser/a11y.spec.mjs` runs axe on every page at every width and fails on any WCAG 2.2 AA issue.
- **Logs:** the site and the replicas log only with `?debug` in the address (`info()` in `js/main.js`, `makeLog()` in `demos/shared/dom.js`); the site adds `?debug` to a replica's frame when it has it. The admin always logs. Keep the bracketed namespaces.
- **Colours:** every colour in `css/style.css` is a token in `:root` (translucent shadows and grid lines stay as rgba of the ink). A new colour gets a named token with a comment, not a raw hex.
- **Timing:** JavaScript that waits for a CSS transition uses `afterTransform()` in `js/main.js`, never a copied duration.
- **Test before saying done:**
  - Run the suites: `cd tests && npm run lint && npm test && npm run test:browser`. Add or update tests for every change.
  - Serve the folder (`npx serve .` or `python -m http.server`).
  - Click through every route.
  - Drag a tape into the monitor.
  - Run both demos and the reel.
  - Check at 390px, 820px (tablet) and 1180px (laptop) width.
  - Check the console for errors.
  - For admin changes: test against a fake GitHub API (Playwright route interception), never the real repo.
- **Commit messages** should be short and in plain English. Push to `main` only when Yoav asks.
