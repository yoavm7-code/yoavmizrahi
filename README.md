# yoavmizrahi

Portfolio site of Yoav Mizrahi: products and films, built with AI.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Structure

```
content/site.json   all content (texts, works, films, desk layout, links)
js/render.js        builds index.html and the share pages from site.json
js/schema.js        content rules shared by the site and the admin
js/main.js          routing, page wipe, menu, cursor, desk, demos, film reel
css/style.css       design (palette, type, motion, phone layout)
admin/              the admin: edit, preview and publish from any device
index.html, w/, f/  generated pages (do not edit by hand)
```

Pages use hash routes, so they work on any static host (including GitHub Pages):

| Route | Page |
|---|---|
| `#/` | The desk (home) |
| `#/work` | Work |
| `#/work/<id>` | Project pages |
| `#/films` · `#/films/<id>` | Films (timeline reel) |
| `#/about` | About |

## Editing content

Open `/admin/` on the live site and connect it with a GitHub key (the admin walks you through it).
Edit, check the live preview, and press Publish. Every publish is one commit, listed under History,
and can be undone there or on `/admin/rescue.html`.

To regenerate the pages after editing `content/site.json` or `js/render.js` by hand:

```
node tools/generate.mjs
```

## Run locally

```
python -m http.server
```

## Tests

The test tools live in `tests/` and are never deployed.

```
cd tests
npm test              # content rules, page generator, generated files in sync, admin, login server
npm install           # once, for the browser tests
npx playwright install chromium
npm run test:browser  # the built site in Chromium at 390, 820 and 1180 px
```

## Deploys

Repository → Settings → Pages → Source: *GitHub Actions*.

- `.github/workflows/deploy.yml`: every push to `main` (including each publish from the admin) runs
  `npm test`, then deploys. If a test fails, nothing is deployed and the live site keeps the last good
  version. The admin shows this as "The site check stopped this publish".
- `.github/workflows/checks.yml`: every pull request and every push to `main` runs the fast tests and
  the browser tests. Code changes go through a pull request so this runs before they reach `main`.
- `tools/build-site.mjs` collects what goes live into `_site/`, leaving out dev files (`worker/`,
  `tests/`, `tools/`, `_plans/`, `CLAUDE.md`).
- Rollback: Settings → Pages → Source: *Deploy from a branch* → `main` / root.
