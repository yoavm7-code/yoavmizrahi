# Login server hardening

Date: 2026-11-24. Status: approved 2026-11-24 (90 days / 7 days). Built; the Worker deploy waits for Yoav's OK. PR 5 of `2026-11-24-professional-polish.md`.

## Goal

Close the medium findings a security reviewer would raise against `worker/`, without ever locking Yoav out of his own admin and without leaving the free plan.

## Constraints

- Cloudflare Workers free plan, checked 2026-11-24: 100,000 requests a day, 10 ms CPU per request (waiting on GitHub doesn't count), 50 subrequests per request. Durable Objects on the free plan: 100,000 requests and 100,000 SQLite rows written a day, reset at 00:00 UTC. Free-plan accounts are never charged. Nothing here moves the Worker to a paid plan.
- 2026-11-22 decision, kept: "never a global lockout". A device that has signed in before (it has a trusted-device token) must always be able to sign in.
- The admin keeps working through the deploy. Sessions and trusted devices that exist today stay valid.

## What changes

1. **A global limit on failed sign-ins, for unknown devices only.**
   - **Today:** wrong guesses slow down per network address and name, so a botnet guessing from thousands of addresses never slows down.
   - **New:** every failed sign-in from a device without a trusted token also counts toward one shared counter. After 20 misses, each further miss doubles a shared wait (30 s, up to 1 hour), forgotten after a day without misses.
   - **Trusted devices skip it entirely**, as they skip the per-address one today. Worst case under attack: Yoav on a brand-new device waits before signing in. His laptop and phone are never affected.
2. **The sign-in log can't be flushed by junk.**
   - **Today:** the log keeps the last 50 entries of any kind, so 50 failed guesses push every real sign-in out of Settings.
   - **New:** the last 30 successful sign-ins and the last 30 failed ones are kept separately. Settings still shows the newest entries first.
3. **Sessions can't be renewed forever.**
   - **Today:** every visit to the admin hands out a fresh token, so a stolen remembered token lives as long as someone keeps using it.
   - **New:** tokens carry the time of the original sign-in. Renewal never goes past 90 days after it for "keep me signed in", or 7 days otherwise. After that, Yoav types his password again (his trusted device still skips the slowdown).
   - Tokens issued before this change count from their own issue time, so nobody is signed out on deploy day.
4. **Moves of the `drafts` branch are checked.**
   - **Today:** `drafts` can be force-moved to any commit.
   - **New:** a move is allowed only if it does one of these:
     - Resets `drafts` to the live site or a commit in its history (what publishing and "no draft" do).
     - Adds a commit whose single parent is the commit `drafts` points to right now. This is a compare-and-swap: a save built on an older draft is turned away (409 `draft_conflict`), and the admin rebuilds it on the newer one at its next sync, so every save stays in the branch's history. It doesn't merge two devices' edits; the newer save still wins, as before.
   - `createRef` follows the same rule.
   - This is not the full content-only check that `main` gets. That would need the whole file list of both trees, more than 10 ms of CPU, and `drafts` is never deployed. The tree rules already stop anything but content files from being written.
5. **Only fine-grained GitHub keys.**
   - **Today:** classic keys (`ghp_`) are also accepted, and they can reach every repository on the account.
   - **New:** only `github_pat_` keys, which the admin already asks for. A key stored today keeps working; the rule applies when a key is saved.
6. **Symlinks and submodules: already blocked, now proven.**
   - Every tree entry must be mode `100644` and type `blob`, so links, submodules and folders can't be written.
   - No code change, but new tests show it.
7. **Tests for the request handlers.**
   - **Today:** only `rules.js` has tests.
   - **New:** `index.js` and the real `AuthStore` run in Node against a fake GitHub. Node's built-in `node:sqlite` stands in for the Durable Object's SQLite, and a two-line stub replaces `cloudflare:workers`.
   - **Covered:**
     - Setup, sign-in, wrong passwords and backoff.
     - The global limit, and trusted devices skipping it.
     - The log keeping real sign-ins.
     - The renewal cap.
     - Re-confirming the password, and the key format.
     - The proxy refusing what it should.
     - The `drafts` rules.
     - CORS.

## Rejected

- **A global lockout for everyone:** a stranger could keep Yoav out of his own admin. Rejected on 2026-11-22 and still rejected.
- **Cloudflare rate-limiting rules:** they need a zone, and the Worker lives on `workers.dev`. Moving DNS is out of scope.
- **Full content-only check on `drafts`:** see item 4.
- **Vitest with the Workers pool:** a large new dev dependency. `node:test` with a stub covers the same code.

## Security

- **Attack surface:** this is the only PR in the series that changes it, by narrowing it. No route is added, no response carries more data, and no secret changes.
- **What is logged:** nothing new. `console.log` still never writes passwords, tokens, keys or full addresses. The sign-in log stores time, outcome, kind, a device label and a city.
- **Cost under attack:** a flood of wrong guesses writes about 5 rows each, so the daily 100,000-row allowance runs out after about 20,000 guesses. The Worker then fails closed for the rest of the UTC day. The free plan's 100,000 requests a day was already the ceiling for any flood. The rescue page's "Use a GitHub key" tab talks to GitHub directly and keeps working.

## Observability

Each new refusal gets one `console.log` line, visible in `wrangler tail`, without the address:
- `global wait`
- `drafts move refused` with the reason
- `renewal capped`

## Settings

Nothing new for Yoav. The limits are security rules, not preferences.

## Testing

- `worker/test/handlers.test.js` (new) and `worker/test/rules.test.js` (extended) run in `npm test` at the repo root (`tests/`), so CI runs them on every PR and before every deploy.
- The admin's browser tests still run against the fake login server, unchanged.

## Deploy and rollback

Merging the PR does not change the live login server. GitHub Pages deploys the site only. The Worker goes live separately, after the merge and after Yoav's OK.

1. `cd worker && npm test`.
2. `npx wrangler deployments list`, to note the current version id for rollback.
3. `npx wrangler deploy`.
4. Check `/health`, then a real sign-in by Yoav. His trusted device must go straight in, and Settings must show the sign-in.
5. **Rollback:** `npx wrangler rollback <noted version id>`. The new code only adds columns of meaning, not tables: the log keeps the same table, and the token gets one extra field the old code ignores. So rolling back needs no data change.

## Open questions

- Are 90 days for a remembered session, and 7 otherwise, right for Yoav? Shorter is safer; longer means typing the password less often.
