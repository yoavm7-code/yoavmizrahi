# Films card: a strip of stills

Date: 2026-11-24. Branch `film-strip`, one PR into `main`.

## Goal

The Films card on the Work page was a plain dark card while every other card previews its work. Give it a picture of the films that also feels like the Films page (a film editor).

## Options considered

1. **A film strip of stills (chosen).** Real frames from the films on a strip with sprocket holes, running like film through a projector on hover. Shows several films at once, echoes the editor track on the Films page, works at any card width.
2. One strong still. Quick, but only shows one film.
3. The cassette tapes from the desk. Consistent, but shows the container, not the work.
4. A silent looping clip. Lively, but heavy, and too loud next to six other cards.

## What was built

- Content: `films[].stills`, up to 4 media paths per film (`LIMITS.stills`). `normalize()` keeps pictures only, each once, in order.
- Page: `filmStrip()` in `js/render.js` lists every film's stills, twice for a seamless loop, decorative (`aria-hidden`). No stills: the card stays plain ink.
- Motion: CSS only. Paused at rest, runs on hover, runs by itself on touch screens (`hover: none`), none with reduced motion (the global .01ms rule would otherwise make the loop flicker).
- Admin: a Stills section on each film's page, two per row: replace, remove, add up to four. `usedMedia()` commits uploaded stills.
- First stills: 4 frames from each of the two released films, taken from their YouTube videos, 960x540 WebP (about 280 KB in total), named by content hash like admin uploads.

## Security

Stills are uploaded media only (`media/<hash>.<ext>`, validated by `isMediaPath`); no outside image URLs, so visitors are not sent to YouTube's image servers. Uploads go through the existing canvas re-encode (strips location data).

## Observability

No new runtime logic in `main.js` (the motion is pure CSS), so no new logs. The admin upload reuses the media picker's existing status messages.

## Settings

The stills themselves are the setting: Yoav chooses, orders and replaces them in the admin. Speed and look are intentionally not exposed.

## Testing

- Unit: normalize rules for stills, the card markup (order, doubling, fallback, admin media address), `usedMedia` and the change summary.
- Browser: the strip runs on hover (laptop) or by itself (phone, tablet), holds still with reduced motion; the admin shows, removes and adds stills against the fake GitHub.

## Deploy

PR into `main`; checks must pass; Yoav merges. Rollback: revert the PR.
