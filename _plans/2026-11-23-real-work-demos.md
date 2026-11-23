# Real work demos: Mega Uploader first

Status: approved 2026-11-23. Mega Uploader is built first. Toto Mundial and Memesh follow the same pattern later.

## Goal

Each work on the site gets:

1. An interactive replica that looks and behaves like the real product. Visitors click through it. Nothing real happens: no uploads, no network calls, no real data.
2. A short example video of the product in use, shown on the work's page.

Real names, partners, accounts and numbers never appear.

## Decisions (Yoav, 2026-11-23)

| Question | Chosen | Rejected and why |
|---|---|---|
| Scope | Core: Dashboard, Workspace (grid, auto-fill, resolve, Run live with streaming log), Run history with drill-down. Other sidebar pages say "not in this demo". | Core + Campaigns/Reports (double the work for breadth); everything (slowest, most to keep consistent). |
| Partner feed names | Clearly invented names. | Real names (shows who Yoav works with); the tour's one-letter disguises (see through, read as typos). |
| Placement | Work page shows the replica in a browser-window frame, scaled to fit, plus "Open full screen". Phones and tablets get the video and a "best on a computer" note, with full screen still available. | Full screen only (one more click before the wow); inside the desk monitor (too small to use). |
| Video | Recorded from the replica by a script. | Screen recording of the real app (every frame needs a privacy check). |

## Source material

- `mega-uploader-replica-spec.md` and `mega-uploader-screenshots.zip`: the Chrome extension's tour of the real app. They hold real data, so they stay out of git and out of this repo. The screenshots were viewed from a scratch folder only.
- The spec's "fake" values were too close to the real ones (partner names one letter off, money within 25%, the same ROAS). The replica uses its own invented values instead, not the spec's.

## Architecture

- `demos/mega-uploader/` is a self-contained static page (HTML, CSS, JS). It has its own look (the real product's tokens), separate from the portfolio palette, because it is the "screen content" of the work, not part of the site's design language.
  - `data.js`: all fake data. The single source of truth for every name and number in the replica.
  - `logic.js`: pure functions (row readiness, campaign naming, resolving, run simulation steps, CSV). No DOM. Unit tested in Node.
  - `app.js`: the UI: shell, screens, menus, grid, run panel. Reads `data.js`, calls `logic.js`.
  - `app.css`: the product's tokens, light and dark.
- The replica makes no network requests except Google Fonts (Geist, Geist Mono). A browser test fails the build if it requests anything else.
- In the iframe, screen changes use in-memory state, never the history, so the portfolio's Back button still leaves the page.
- The site knows about replicas through `DEMOS` in `js/schema.js` (`replica` path, `video`, `poster`). `js/render.js` adds the window and video to the project page for a work whose demo has a replica. The desk object stays as it is.
- Guards:
  - `tests/unit/replica-privacy.test.mjs` hashes every word and word pair in `demos/` and fails if any match a list of SHA-256 hashes of real names and figures. The test stores only the hashes, so the real names never enter the repo.
  - `tests/unit/replica-logic.test.mjs` covers `logic.js` and checks that the dashboard figures in `data.js` add up (profit = revenue - spend, ROAS = revenue / spend).
  - The browser tests check that the replica makes no outside requests and logs no console errors.

## Lazy-user walkthrough

- Laptop, work page: the window is already showing the Workspace with red empty cells and a pulsing hint on "Data". Clicking anything works. Anything outside the demo shows a short toast that names what the visitor can try instead.
- The main path: Data, then Fill example data (or auto-fill), then Resolve links, then Run live, confirm, watch the log, then "Open in Run history".
- Phone and tablet: the video plays (muted, loops, with controls), with a line under it: "The interactive demo is built for a computer screen. Open it anyway". Full screen uses a 1280px viewport, so phones show the whole app zoomed out and pinch-zoom works.
- Refresh resets the demo to its starting state. That's intended: it is a demo.
- Back button: the replica never adds history entries, so Back leaves the work page as expected.

## Security

- No real data in the repo. Enforced by the privacy hash test.
- No network calls, no storage of visitor input, no third-party scripts. Fonts come from Google Fonts, the same as the site.
- All text in the replica is inserted with `textContent` or escaped templates. Visitor typing in cells and in the Ask box is never inserted as HTML.
- The iframe is same-origin and is given `sandbox="allow-scripts allow-same-origin allow-downloads"` so it can't navigate the parent page.

## Observability

- The replica logs namespaced lines with values: `[mu-demo nav]`, `[mu-demo grid]`, `[mu-demo data]`, `[mu-demo resolve]`, `[mu-demo run]`, `[mu-demo history]`, `[mu-demo ui]`.
- The site logs `[site replica]` when the frame loads, scales, or falls back to video.

## Settings audit

- The replica has its own theme toggle (light/dark), as the real product does.
- Nothing new in the admin: the replica is code, tied to the work through `DEMOS`, not content Yoav edits. Intentionally not exposed: frame scale and start screen. They have one right value.

## Testing

- Unit: `logic.js` (readiness, naming, resolve, run plan with one policy failure, CSV escaping), data consistency, privacy hashes, schema/render for the replica block, `generated.test.mjs` stays green.
- Browser at 390 / 820 / 1180: the work page shows the frame on laptop and the video on phone/tablet; the replica's golden path (fill, resolve, run live, history shows the new run); no console errors; no outside requests.
- Out of scope: pixel comparison with the real app (it is not reachable from tests).

## Deploy

- Branch `real-work-demos` (worktree `../yoavmizrahi-site-real-work-demos`), PR #2 into `main`. `checks.yml` must be green before merge. A merge to `main` deploys through `deploy.yml` after `npm test` passes.
- Rollback: revert the merge commit on `main` through a PR.

## Built (2026-11-23)

- The replica covers Dashboard, Workspace and Run history. The rest of the sidebar answers "not in this demo".
- Only the Northwind feed has workspaces; the other feed chips say so. The partner columns are Northwind columns, so switching feeds would always look half wrong.
- A small "Try the demo" guide (not part of the real product) names the four steps and can do each one. It is hidden in the recorded video.
- One example row (Credit Cards, "Guaranteed approval") always fails on a financial-claims policy, so a run looks real. Fixing the headline and running again makes it go live.
- Run numbers, workspace numbers, times and counts were rewritten after a first pass copied a few from the screenshots. The privacy test now guards these too.
- Video: 51 s, 1440x900, H.264, about 3.2 MB. Recorded with `cd tests && npm run record:demos`.

## Later

- Toto Mundial and Memesh: same brief for the Chrome extension, same folder pattern (`demos/<work>/`).
