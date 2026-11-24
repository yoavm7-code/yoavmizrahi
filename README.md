# yoavmizrahi.com

Portfolio of Yoav Mizrahi: the products I build with AI coding agents, and the AI films I make for my YouTube channel, The Wide Silence.

**Live:** [yoavmizrahi.com](https://yoavmizrahi.com)

The home page is a desk. Every work on it is an object you can pick up and use: a device that runs a campaign launch, a phone with a match pick, a monitor that plays a film when you drop a tape into it. Each project page has a clickable copy of the real product, running on made-up data, next to a recorded video of it.

## How it's built

I work as the product owner and reviewer, and AI agents (Claude Code) write the code. Every change goes through a pull request with a written plan, tests and a green CI run before it reaches `main`. The plans are in [`_plans/`](_plans/), the agent's project notes are in [`CLAUDE.md`](CLAUDE.md), and the merged pull requests show the full trail.

- **No framework, no build step.** Plain HTML, CSS and JavaScript. The only outside requests are Google Fonts, and YouTube (privacy-enhanced mode) once a film is played.
- **Content is data.** All text, works, films and the desk order live in [`content/site.json`](content/site.json). [`js/render.js`](js/render.js) turns it into a complete `index.html` plus a share page per work and film (`w/`, `f/`), so visitors and link previews get finished HTML with no runtime fetching.
- **The desk lays itself out.** [`js/desk-layout.js`](js/desk-layout.js) packs the objects at the highest free spot with an even gap, tries several content widths and keeps the most compact result for the screen. It's pure and unit tested: a test fails if anything overlaps or leaves the desk. Positions are never stored.
- **Replicas** live in [`demos/`](demos/). Each one is a self-contained static app with its own look, a `data.js` holding every name and number, and a pure `logic.js` with its own unit tests. They never change the URL, so the browser's Back button keeps working.

```
content/site.json      all content, the single source of truth
js/schema.js           content rules: normalize() and validate(), shared by the site and the admin
js/render.js           builds index.html and the share pages from site.json
js/desk-layout.js      desk packing (pure)
js/main.js             routing, page transitions, menu, cursor, desk, demos, film reel
css/style.css          design tokens, components, motion, responsive, reduced motion
demos/<name>/          the clickable replicas, with their demo.mp4 and poster.jpg
admin/                 the content admin
worker/                the admin's login server (Cloudflare Worker)
tools/                 generate.mjs (regenerate pages), build-site.mjs (collect what deploys)
tests/                 unit tests (node:test) and browser tests (Playwright), never deployed
```

## The admin

`/admin/` edits the content from any device, with a live preview that is the real site rendered from the draft. Drafts autosave and sync between devices. Publishing validates the content, renders the pages and writes everything as one atomic commit to `main` through the Git Trees API, then waits until the live page reports the new build. Every publish can be restored from History, and `admin/rescue.html` (self-contained) can undo the last one even if the admin itself is broken.

### Security model

The site is static, so the only thing worth attacking is the admin's write access to this repository.

- **No GitHub key in the browser.** The admin signs in to a small Cloudflare Worker ([`worker/`](worker/)), which holds a fine-grained GitHub token scoped to this one repository, encrypted with AES-GCM.
- **Allow-list proxy.** [`worker/src/rules.js`](worker/src/rules.js) refuses any GitHub call it doesn't explicitly allow. A session can only write content files (`content/`, `index.html`, `w/`, `f/`, `media/`) on `main` and `drafts`. It can never change code, so a stolen session can change text but not the admin, and History can undo that.
- **Passwords** are peppered with HMAC and hashed with PBKDF2-SHA256. Sessions are HMAC-signed tokens with a server-side version, so "sign out everywhere" takes effect immediately. Failed attempts back off per address and account, and sign-ins are logged.
- **Admin page:** a strict Content Security Policy, no third-party scripts, and all content inserted as text. Uploaded images are re-encoded through a canvas, which strips EXIF and GPS data.
- **The site** has its own policy too: its files, Google Fonts and YouTube's privacy-enhanced player, no inline script. The replicas run in iframes sandboxed without `allow-same-origin`, so a replica can't reach the site, its storage or the admin.
- **Deploys are gated.** A push to `main` deploys only after the test suite passes. If it fails, the last good version stays live.

Found a security issue? Please email yoavm7@gmail.com instead of opening a public issue.

## Run locally

```
python -m http.server
```

Then open `http://localhost:8000`. After editing `content/site.json` or `js/render.js` by hand, regenerate the pages:

```
node tools/generate.mjs
```

## Tests

```
cd tests
npm test              # unit: content rules, renderer, generated files in sync, desk layout,
                      # replica logic, privacy guard, admin publish, login server rules
npm install           # once, for the browser tests
npx playwright install chromium
npm run test:browser  # the built site in Chromium at 390, 820 and 1180 px
```

The browser tests click through every route, the desk, the demos and the film reel, and fail on console errors, which includes anything the content policy blocks. Every page is also checked with [axe](https://github.com/dequelabs/axe-core) against WCAG 2.2 AA, and the keyboard paths (skip link, menu, page focus, the reel slider) have their own tests. The replica tests also fail on any outside network request. Admin tests run against a fake GitHub API, never the real repository.

## Deploys

GitHub Pages, deployed by GitHub Actions.

- [`deploy.yml`](.github/workflows/deploy.yml): every push to `main`, including each publish from the admin, runs `npm test` and then deploys `_site/`.
- [`checks.yml`](.github/workflows/checks.yml): every pull request runs the unit and browser suites.
- [`tools/build-site.mjs`](tools/build-site.mjs) collects only what goes live, leaving out `worker/`, `tests/`, `tools/`, `_plans/` and the repo docs.

## License

The code is published so it can be read. The content, films, product replicas and media are not licensed for reuse. See [LICENSE](LICENSE).
