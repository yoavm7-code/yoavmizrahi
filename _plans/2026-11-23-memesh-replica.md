# Memesh replica

Status: approved 2026-11-23. Same pattern as Mega Uploader and Toto Mundial.

## Goal

A clickable copy of Memesh, the operations system for an indoor children's playground, on its work page, plus a recorded video. All three apps, connected through one made-up dataset, so a visitor sees a whole system: book a round as a parent, scan that QR at the front desk, watch the manager's dashboard move.

## Decisions (Yoav, 2026-11-23)

| Question | Chosen | Rejected and why |
|---|---|---|
| Scope | All three apps (parent area, front-desk till, manager back office), connected, with a role switcher | Parent + desk (misses the back office); parent only (misses most of the work) |
| Brand | Real Memesh name and logo (Yoav confirms the client agrees). Logo file from Yoav; a text wordmark stands in until it arrives | Own wordmark; made-up brand |
| Language | Hebrew first (RTL), English toggle | English first; Hebrew only |
| Frame | Desktop window, 1440 x 900, like Mega Uploader. Phones get the video and a link | Tablet; per-role frames |

## Assumptions

- Frozen on Monday 23 November 2026, 13:10: the morning round is over, noon is on, evening is open for booking.
- Every person, phone, email, serial, count and amount is invented. None is copied from the screenshots or near their values; the privacy test bans the real ones as hashes.
- QR codes are drawn patterns from the serial, not scannable codes.
- The demo bar above the app (role switcher, language, "made-up data") is portfolio chrome, styled apart from the product.
- In scope per app:
  - Parent: Bookings (tabs, ranges, QR, cancel with refund), Cards (punch grid, QR, the full booking flow: day strip, month view, rounds with capacity, count, extra companion, summary, rules popup), Profile (edit, locked phone, validation).
  - Front desk: Till home, QR scan (a fake camera with codes on the counter to "hold up", flash, punch dialog or entry check), Find customer and profile with punching, Rounds with arrivals.
  - Manager (shift manager role): Dashboard (round cards, participants with add and remove, KPIs, 7-day grid, activity feed fed by all three apps), Customers with details, Punch cards, Staff with the permissions matrix (view only, as for a manager).
  - Everything else answers "not in this demo".

## Architecture

- `demos/memesh/`: `js/data.js` (all invented data), `js/logic.js` (pure rules: availability, capacity, booking, cancelling, punching, KPIs, the 7-day grid), `js/store.js` (the one shared state and its event log), `js/i18n.js` (Hebrew and English), `js/dom.js`, `js/qr.js`, one module per app (`parent.js`, `desk.js`, `manager.js`) plus `shell.js` and `app.js`.
- Screens switch in memory; `?role=desk|manager` and `?lang=en` open elsewhere; `?record` for the video.
- Site: `DEMOS` gets a `memesh` demo with a desktop replica. Memesh's desk object (a polaroid) stays and shows the poster.

## Security and privacy

- No network calls except Google Fonts. All text via textContent. Nothing stored; refresh resets.
- The tour spec, the three screenshot zips and anything extracted from them stay out of git (`.gitignore`).

## Testing

- Unit: logic (booking rules, capacity, cancel window, punching limits, KPIs, grid), data consistency, both languages complete, privacy.
- Browser: the connected golden path (book as parent, scan at the desk, see it on the dashboard), cancel and refund, punch from a customer profile, add a participant, language toggle, no outside requests, no console errors, at laptop width; the work page at all three widths.
