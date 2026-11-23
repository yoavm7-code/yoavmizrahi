# Tests and a deploy pipeline

Date: 2026-11-23. Status: approved by Yoav (option B), in progress on branch `deploy-pipeline`.

## Goals

- Nothing reaches the live site unless the tests pass. A failed check leaves the last good version live.
- Code changes get a deep check (real browser, three screen widths) before they reach `main`.
- Publishing from the admin stays fast, and the admin says plainly when a check stopped a publish.

## Constraints

- The site stays plain HTML, CSS and JS with no dependencies. Test tools live in `tests/` with their
  own `package.json`, like `worker/`, and are never deployed.
- Cost: $0. The repo is public, and standard GitHub-hosted runners are free for public repos and for
  Pages (docs.github.com, Actions billing, checked 2026-11-23).
- The admin's GitHub key only has Contents permission. Check results are read from GitHub's public
  API with no key (public repo, 60 requests per hour per IP), so neither the key nor the login
  server changes.

## What we found before starting

- Pages was "Deploy from a branch" (`main`, root, `build_type: legacy`), about 25 s per deploy, no gate.
- The admin and the rescue page commit straight to `main`. Every publish is a deploy.
- Tests existed only for the login server (`worker/test/rules.test.js`).

## Chosen approach (B)

Two workflows:

- `.github/workflows/deploy.yml` (push to `main`, manual run): fast tests (unit + files-in-sync +
  login server), then build `_site/` and deploy it to Pages. Deploy only runs if the tests pass.
- `.github/workflows/checks.yml` (every pull request, push to `main`, manual run): fast tests plus
  the Playwright browser suite. Does not gate deploys on `main`, so content publishes stay about a
  minute. On pull requests it is the gate for code.

Pages source switches to "GitHub Actions" after the PR merges.

### Tests

- `tests/unit/` (Node's built-in runner, no dependencies):
  - `schema`: helpers, normalize (never throws, clamps, defaults, order repair), validate.
  - `render`: escaping, unsafe links dropped, routes, reel spans, share pages.
  - `generated`: committed `index.html`, `w/` and `f/` match what `render.js` makes from `site.json`.
  - `build-site`: the deploy folder has every site file and none of the dev files.
  - `publish`: change summary, commit message, and the new deploy-status watching.
- `worker/test/`: the existing login server tests, now run in CI.
- `tests/browser/` (Playwright, Chromium, 390 / 820 / 1180 px): every route, the menu, tape into the
  monitor (drag on wide screens, ▶ on narrow), both demos, the reel, the admin sign-in screen, and no
  console errors anywhere. Served from the built `_site/` so the test covers what actually deploys.
  Outside requests (fonts, YouTube, login server) are stubbed so the run never depends on the network.

### Admin

- `waitForLive` also watches the Deploy run for the publish commit and resolves to
  `live | blocked | replaced | slow`.
- Blocked: "The safety check stopped this publish. The live site still shows the previous version."
  plus a link to the failed check.
- Replaced (a newer publish took its place in the queue): says so, nothing to do.
- Timeout text updated: Pages source is now GitHub Actions.

## Alternatives rejected

- A (checks only): reports after the damage is done.
- C (browser suite on every deploy): 2 to 3 minutes per publish to re-check code that did not change.
- Reading check status through the login server: would need a wider GitHub key (Actions: read) and a
  new proxy route. The public API gives the same answer with no key.
- Requiring pull requests on `main` with a ruleset: would block the admin's direct publishes unless
  set up with a bypass. Possible later, not part of this change.

## Security

- Workflows run with `contents: read` by default. Only the deploy job gets `pages: write` and
  `id-token: write`.
- Every action is pinned to a full commit SHA (version noted beside it).
- Pull request runs never deploy and get no secrets (there are none).
- The status check is a read of public data with no credentials. Its result is display only; a
  wrong answer can mislead a message, never change the site.
- The deploy folder leaves out dev files (`worker/`, `tests/`, `_plans/`, `.github/`, `tools/`,
  `CLAUDE.md`), so they are no longer served publicly.

## Observability

- Admin: `[admin publish]` console lines for each status poll (build id, commit, run status and
  conclusion, rate-limit fallbacks) and the final outcome.
- CI: each step is named in plain words; the browser job uploads the Playwright report on failure.

## Settings

- No new admin settings. The poll timing and the time limit are internal and not worth a knob.

## Testing

- Everything above, run locally on Windows (Node 24) before the PR, and in CI on the PR.
- Out of scope: the admin's editor screens (already covered by the Playwright harness used when the
  admin was built, which runs against a fake GitHub API and is not part of CI yet).

## Deploy and rollback

- Merge the PR into `main`. The legacy Pages build still runs for that merge, the new Deploy job's
  deploy step fails until the source is switched (harmless).
- Switch Pages source to GitHub Actions (`build_type: workflow`), then re-run Deploy. Custom domain
  and HTTPS stay as they are.
- Rollback: switch the source back to "Deploy from a branch" (`main`, root). Nothing else to undo.

## Open questions

- Later: protect `main` with a ruleset that requires checks for code changes while letting the admin
  publish content.
