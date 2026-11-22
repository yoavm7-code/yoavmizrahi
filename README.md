# yoavmizrahi

Portfolio site of Yoav Mizrahi: products and films, built with AI.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Structure

```
index.html      all pages and content
css/style.css   design (palette, type, motion)
js/main.js      routing, page wipe, menu, cursor, desk, demos, film reel
```

Pages use hash routes, so they work on any static host (including GitHub Pages):

| Route | Page |
|---|---|
| `#/` | The desk (home) |
| `#/work` | Work |
| `#/work/uploader` · `#/work/toto` · `#/work/memesh` | Project pages |
| `#/films` | Films (timeline reel) |
| `#/about` | About |

## Filling in content

Everything to replace is in `index.html`, written in `[SQUARE BRACKETS]`:

- **Project texts:** search for `[One line`.
- **Year of Mega Uploader:** `[Year]`.
- **Email and links:** `[YOUR EMAIL]`, and the `href="#"` on LinkedIn / YouTube.
- **Films:** each film is a `data-clip` button in the Films section, and a tape (`data-tape`) on the desk.
  Put the YouTube video id (the part after `watch?v=`) in `data-youtube="..."` and the film plays inside the monitor and the viewer.
- **Screenshots:** the `[ SCREENSHOT ]` boxes (`.polaroid__img`) are ready for an `<img>` or `<video>`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

## Publish on GitHub Pages

Repository → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
