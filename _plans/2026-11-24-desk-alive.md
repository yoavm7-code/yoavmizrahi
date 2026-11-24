# The desk comes alive

Approved by Yoav on 2026-11-24 ("lets do your recommendations. sound is ok, off by default, behind a switch").

## Goal

A visitor should see in the first seconds that the desk is alive and what to try, on a laptop and on a phone, without adding clutter. Today:

- The biggest object on a laptop is a black "NO SIGNAL" monitor, a dead spot in the middle of the first screen.
- The only sign that things can be dragged is small grey text at the bottom of the desk.
- A tape that goes into the monitor just vanishes (`display: none`), on every screen size.
- Nothing makes a sound, and that is fine; sound is wanted only as an opt-in.

Success: a lazy visitor sees moving pictures on the monitor, notices a tape nudge toward it, presses ▶ or drags it, and sees the tape go in. Nothing new to read, nothing in the way.

## Constraints

- Plain HTML, CSS and vanilla JS, no new dependencies, no build step (CLAUDE.md).
- One palette, one accent, one easing. No new colours without a token.
- "Crafted, not overwhelming": every addition is small, quiet, and has a reason.
- The speed suite's rules: the desk fetches only what it shows, and nothing keeps running while the visitor does nothing.
- `prefers-reduced-motion`: no nudge, no slideshow motion, no flight animation.
- Content comes from `content/site.json`; markup changes go in `js/render.js`.

## What changes

1. **The monitor on standby.** With no tape in, the screen shows the films' first stills (one per film, so four pictures, about 150 KB), crossfading slowly every five seconds, dimmed under the scanlines. Over them: "STANDBY", then "DRAG A TAPE IN HERE" (laptop) or "TAP ▶ ON A TAPE TO PLAY IT" (phone), replacing "NO SIGNAL".
   - The pictures load only after the page has loaded and only while the home page is open, so they never compete with the first paint.
   - The slideshow runs only while the monitor is on screen, the tab is visible and the home page is open. With reduced motion it shows one still and stays.
   - No stills in the content: it falls back to today's plain screen.
2. **A one-time nudge (laptop, wider than 900px).** About 1.5 s after the desk appears, the first tape slides about 24 px toward the monitor and settles back. Once per page load, only if the visitor has not touched anything yet, never with reduced motion, never on phones (they have the ▶ buttons and the hint at the top).
3. **Objects feel physical (fine pointers only).** On hover an object lifts 3 px and its shadow grows. It uses the CSS `translate` property, so it adds to the object's own tilt and drag offset without touching them.
4. **The tape goes in, visibly.** Pressing ▶ on a tape, or dropping one on the monitor, animates the tape into the screen: it moves to the screen's centre, shrinks and fades (about 450 ms), then the monitor powers on as it does today. On phones the page scrolls the monitor into view first, then the tape flies in. Eject brings the tape back with its usual settle. Reduced motion: no flight, the tape just goes in.
5. **Sound, off by default.** A small "SOUND OFF / SOUND ON" switch in the monitor's foot, next to EJECT, where the sounds come from. Sounds are made in the browser with the Web Audio API, so there are no audio files: a short mechanical clunk when a tape goes in, a softer one on eject, and a faint power-on hum blip. The choice is remembered on that device (`localStorage`, key `ym-sound`), and it falls back to off if storage is blocked.

## How (from the council, which advised on execution only)

- **Tape flight as a ghost.** The real tape's `transform` belongs to the layout and to dragging, so the flight animates a `position: fixed` copy with `element.animate()` (transform and opacity only). The copy is removed when the animation finishes or is cancelled, with a timer as a backstop, so a tape can never get stuck. The real tape is set to `visibility: hidden` during the flight, then inserted.
- **Phones:** scroll the monitor into view, then measure the screen after the scroll settles (a short timer; iOS Safari has no reliable `scrollend`), then fly.
- **Standby:** two stacked pictures that swap opacity, with fixed sizes so nothing shifts. One timer runs only while the monitor is on screen (`IntersectionObserver`), the tab is visible and the home page is open. Pictures load after `load`, in idle time (with a `setTimeout` fallback for Safari). A still appears only after it has loaded; if none load, the screen stays as it is today.
- **Hover lift:** only under `(hover: hover) and (pointer: fine)` (iOS keeps `:hover` after a tap), and never while dragging or tidying.
- **Nudge:** runs on the `translate` property with `element.animate()`. It runs only if the tape is on screen and the visitor has not scrolled, pressed or dragged anything. The tape's ▶ glows once in the accent at the same moment, so the motion points at something.
- **Monitor power-on:** a short warm glow added to the existing flicker.
- **Sound:** `AudioContext.resume()` is called inside the click that turns sound on (iOS). Tests check the switch state and that the console stays clean; audio output itself can't be asserted.
- **Order of work:** flight (with the existing tape tests), then standby with the speed tests, then nudge and hover, then sound. Phones get a manual check on a real device for scroll-then-fly.

## Rejected

- **A separate phone layout with sideways swiping** (direction 2): more app-like, but two PRs and a real risk of clumsy scrolling, on a phone layout we just polished. The tapes already sit right under the monitor on phones.
- **Physics and effects everywhere** (direction 3): most "wow" in a demo, most likely to feel gimmicky and to slow phones down.
- **Audio files:** licensing, weight and a CSP change for nothing; synthesized sounds are a few lines and weigh nothing.
- **Sound on by default:** browsers block it anyway until a click, and surprise sound on a portfolio is hostile.

## Architecture

- `js/render.js`: the standby markup (stills from `films[].stills[0]`, as `data-src`, not `src`, so nothing loads early) and the sound switch. The hint texts stay in the template, as they are today.
- `js/main.js`, in the desk section: `standby` (load, cycle, pause), `nudge`, the tape flight inside `insertTape()`, and a small `sound` module (one `AudioContext`, created on the first click that turns sound on).
- `css/style.css`: standby layers, hover lift, nudge keyframes, flight, and the switch. New colours, if any, become tokens.
- One source of truth: which stills the monitor shows is decided in `render.js` only; `main.js` just plays what the markup lists.

## Security

- No new hosts, no audio files, nothing new in `SITE_CSP`. Web Audio needs no network.
- `localStorage` holds only `"on"` or `"off"`, read inside try/catch and compared to a fixed value.
- Stills paths go through the existing `paths.media()` and attribute escaping.

## Observability

Behind `?debug`, as everywhere on the site:

- `[desk standby]`: stills found, loaded, started, paused and why.
- `[desk nudge]`: shown or skipped, with the reason.
- `[desk tape]`: the flight starting and ending.
- `[desk sound]`: on or off, context state, which sound played.

## Settings

- **Sound:** the only new control, off by default, remembered per device.
- **Not exposed:** the nudge, hover lift and standby. They are quiet and respect reduced motion; a switch for each would be clutter.

## Testing

Unit tests in `tests/unit/render.test.mjs`:

- The standby lists each film's first still as `data-src`, and nothing at all without stills.
- The sound switch is a real `<button>` with `aria-pressed`.

Browser tests in `tests/browser/site.spec.mjs` and `speed.spec.mjs`:

- The standby pictures load only after the page loads, and not on other routes.
- The slideshow advances, and holds still with reduced motion.
- The nudge runs once on a laptop, not on phones, and not with reduced motion.
- ▶ flies the tape in and the monitor turns on; dropping a tape does the same; the existing tape tests keep passing.
- Sound is off at first. The switch turns it on, it is remembered after a reload, and turning it on creates no console errors.
- The a11y suite (axe) stays clean at every width.

Checked by eye at 390, 820 and 1180 px, and with a screen recording for Yoav.

## Deploy

- Branch `desk-alive`, PR into `main`, `checks.yml` green, Yoav merges, and `deploy.yml` deploys.
- Rollback: revert the PR.
