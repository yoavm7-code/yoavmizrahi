# Toto Mundial replica

Status: approved 2026-11-23. Same pattern as the Mega Uploader replica (`2026-11-23-real-work-demos.md`).

## Goal

A clickable copy of Toto Mundial, a World Cup 2026 betting pool for friends, on its work page, plus a recorded video. Made-up people and numbers only.

## Decisions (Yoav, 2026-11-23)

| Question | Chosen | Rejected and why |
|---|---|---|
| Frame | The replica runs at phone size (390 x 844) inside an ink phone on the work page, the same object as on the desk. Phones can use it too (it is a phone app). | A desktop browser window like Mega Uploader (hides the app's real canvas); both with a toggle (a third more work). |
| Language | Opens in English. A working toggle flips everything to Hebrew, right to left. | English only (loses the RTL craft); Hebrew first (most visitors can't read it). |
| Scope | Core: Home, Bets (match picks with steppers and autosave, past results, tournament bets), Leaderboard (pot split, the Monkey, expandable rows), Live scores (a goal flips your projected points). Other pages answer "not in this demo". | Core + Transparency and Duels (40% more); everything (slowest). |
| Scoring | Exact score +10, right direction (1/X/2) +5, who advances +10, wrong 0. | The old "15 pts" string. |

## Assumptions (no answer needed unless wrong)

- Frozen mid-tournament on the first day of the round of 32, so upcoming picks, live scores and countdowns have content. Results are invented; the demo says "made-up data".
- Real countries and well-known players appear (public sports data). Every person in the pool, every point and every shekel is invented, and none is copied from the screenshots or near their values.
- The hero is an original poster-style SVG (sun, cup, stadium, hills). No real players, no copy of the real art.
- Phone layout only. On a wide screen (full screen link) the app is a centered phone-width column, as the real app's mobile layout.
- The work card for a phone replica shows the poster standing in a phone shape, not the desktop crop.
- The desk's Toto toy stays as it is for now. Matching it to the replica is a follow-up.

## Architecture

- `demos/toto-mundial/`: self-contained page. `js/data.js` (all invented data), `js/logic.js` (pure rules: scoring, pot split, standings, projected live points, random picks, chart), `js/i18n.js` (English and Hebrew strings, number and date formats), `js/dom.js`, screens (`shell.js`, `home.js`, `bets.js`, `leaderboard.js`, `live.js`), `js/flags.js` (simple round SVG flags), `app.css` (the app's own tokens).
- Screens switch in memory, never the URL, so the portfolio's Back button still works. `?lang=he` opens in Hebrew; `?record` adds the visible pointer for the video.
- Site: `DEMOS.toto.replica` with `frame: 'phone'`, 390 x 844. `replicaStage` renders a phone-shaped device for it; the viewport and video take their aspect ratio from the replica size. Narrow screens keep TRY IT for phone replicas.
- `tests/record-demos.mjs` records each demo at its own viewport.

## Privacy and security

- `tests/unit/replica-privacy.test.mjs` now splits on any Unicode letter or digit, so Hebrew names are checked too. Real names and distinctive figures from the screenshots are added as hashes.
- The spec and screenshots stay out of git (`.gitignore`).
- No network calls except Google Fonts. All text goes in through textContent. Nothing is stored; refresh resets.

## Lazy-user walkthrough

- Work page, laptop: the phone already shows Home. "Up next" says a match locks soon and you haven't picked: tapping it opens the pick. + and - set the score; it saves by itself ("Saving…", then "Saved 2-1", with undo). The dice fills a random score.
- The bottom tab bar is always there: Home, Bets, Leaders, Live, More. The globe button in the top bar switches to Hebrew and back.
- Live: the match is running; the minute ticks, a goal goes in, "Right now +5" becomes "+10 Exact".
- Leaders: pot split, the Monkey, tap your row to see what changed.
- Phone visitors: same replica, sized to the screen, with WATCH IT for the video.

## Testing

- Unit: logic (scoring, pot split, standings, projected points, random pick bounds, chart), i18n (every key in both languages), data consistency, privacy (Hebrew included), render (phone frame, card).
- Browser: golden path (pick with autosave and undo, dice, past results, tournament pick with scenarios, leaderboard expand, live goal flip), Hebrew toggle sets `dir="rtl"`, no outside requests, no console errors, at 390 / 820 / 1180.
- Video and poster recorded with `npm run record:demos`.
