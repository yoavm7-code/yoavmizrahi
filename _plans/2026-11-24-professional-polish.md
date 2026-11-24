# Professional polish: repo, accessibility, speed, login server, tooling

Status: approved 2026-11-24. Six pull requests, in order. Each one ships on its own and can be reverted on its own.

## Goal

The site will be reviewed by strong engineers who open DevTools, run Lighthouse, read the repo and poke at the admin's login server. Everything they can reach should hold up: the repo reads as a deliberate project, the front end passes keyboard, screen reader and contrast checks, mobile loads fast, and the login server has no open medium findings.

## Constraints

- Static hosting on GitHub Pages stays. Pages can't set response headers (HSTS, cache lifetimes), so those are out of scope. Putting Cloudflare in front would fix it, but it means moving DNS, and it's left for later.
- No framework, no build step, no new runtime dependencies. Dev tooling (lint, format) lives in `tests/` and is never deployed.
- Admin publishes must keep working through every PR. Anything that changes the Worker gets its deploy steps and rollback written out first.
- Every PR: unit and browser suites green locally and in `checks.yml`.

## The PRs

1. **Repo presentation.** README rewritten (what it is, how it's built, the security model, how to run and test), a LICENSE, project notes reworded, old plan notes trimmed to the decisions, README and LICENSE left out of the deploy, merged branches removed.
2. **Replica look.** The Mega Uploader replica gets its own visual shell (layout, type, colours), so it reads as a generic campaign launcher and not as any particular company's tool. Re-record its video and poster.
3. **Accessibility, SEO, sharing.** Menu traps focus and makes the page behind it inert; focus moves to the new page on route change and the change is announced; a real `h1` on the home page; a skip link; accent text that meets 4.5:1; a visible focus ring; 44px touch targets; a keyboard-operable reel scrubber; a share image for the home page; `robots.txt`, `sitemap.xml` and a 404 page; a Content Security Policy for the site; an effective iframe sandbox for replicas; share page slugs that match their films; a landscape share image for Toto Mundial.
4. **Speed.** Self-hosted fonts with only the weights in use; poster thumbnails sized for their slots (`srcset`); the cursor's animation loop stops when the pointer is idle.
5. **Login server.** A global limit on failed sign-ins on top of the per-address one; a sign-in log that junk attempts can't flush; an absolute cap on how long a session can be renewed; the same compare-and-swap check on `drafts` as on `main`; only fine-grained GitHub tokens accepted; a symlink guard on tree writes; tests for the request handlers.
6. **Code tooling.** ESLint (Prettier dropped while building: it would have reformatted nearly every line and buried the real changes) with an `.editorconfig` and a pinned Node version, run in CI; one shared helper module for the replicas instead of six copies; console logs only with `?debug`; remaining raw colours moved to tokens; timers tied to `transitionend` instead of copied durations; the admin's interval and listeners cleaned up on sign-out; test steadiness (a worker cap, polling instead of fixed sleeps).

## Rejected

- **Cloudflare in front of Pages now:** fixes headers, but moves DNS and adds a moving part right before the site is shown. Later.
- **One big PR:** impossible to review or roll back in parts.
- **Removing logs entirely:** they are how problems get diagnosed. They stay, behind `?debug`.

## Security

- No secrets in the repo (checked across all branches). Worker secrets live only on Cloudflare.
- PR 3's CSP must allow exactly what the site loads: self, Google Fonts, YouTube's privacy-enhanced embed. A browser test fails on any CSP violation.
- PR 5 is the only change to an attack surface. It is tested with the existing fake GitHub, deployed with `wrangler` after review, and rolled back with `wrangler rollback`.

## Observability

- Logs keep their bracketed namespaces (`[site …]`, `[admin …]`, `[ld-demo …]`). After PR 6 the site's and the replicas' print only with `?debug` in the address, so visitors see a clean console and debugging is one parameter away.
- The Worker keeps its structured `console.log` lines (visible in `wrangler tail`), never with passwords, tokens or full IPs.

## Settings

- Nothing new for visitors. The site already follows the system's reduced-motion setting.
- `?debug` is a developer switch, not a visitor setting, so it doesn't go in the admin.

## Testing

- PR 1: the build leaves the repo docs out (unit test).
- PR 2: replica unit and browser tests updated, video re-recorded.
- PR 3: browser tests for focus trap, route focus, skip link, tap target sizes, contrast of accent text, the keyboard scrubber, CSP violations, robots/sitemap/404.
- PR 4: fonts load from the site's own origin; posters request the small size at phone width.
- PR 5: unit tests for each new limit and check; handler tests against a fake store.
- PR 6: the lint step itself; the existing suites must pass unchanged.

## Deploy

- Each PR from its own worktree and branch off `main`, merged after `checks.yml` is green. A merge deploys through `deploy.yml` after `npm test` passes.
- The Worker (PR 5) deploys separately with `wrangler`, with a rollback version noted beforehand.
- Rollback for the site: revert the merge through a PR.

## For the owner (repo settings, not code)

- About: description, website `https://yoavmizrahi.com`, topics.
- General: "Automatically delete head branches" on; Wiki and Projects off.
