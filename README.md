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

## Publish on GitHub Pages

Repository → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
