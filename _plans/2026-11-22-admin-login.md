# Admin login (username + password) via a Cloudflare Worker

Date: 2026-11-22. Status: built, tested locally (26 end-to-end checks + 10 unit tests), login server deployed. Waiting on Yoav's first setup.

## Goals

- Yoav signs in to the admin with a username and password on any device. No GitHub key to paste per device.
- The GitHub key never reaches the browser.
- Same lazy-user bar as the admin: iPhone autofill, plain messages, nothing lost on expiry.

## Constraints

- The site stays static on GitHub Pages. The login runs on a Cloudflare Worker, free plan ($0 at this usage: 100k requests/day, 10 ms CPU per request, waiting on GitHub does not count).
- DNS stays at GoDaddy, so the Worker lives on `*.workers.dev`, cross-site from yoavmizrahi.com. That rules out cookies (Safari blocks third-party cookies) and passkeys (no shared site). Sessions are bearer tokens.
- Yoav cannot run CLI tools. Claude runs wrangler on his machine; he clicks "Allow" once for `wrangler login`.

## Decisions (council verdict, "how" only)

- **Worker endpoints:** `/setup`, `/login`, `/logout`, `/logout-all`, `/password`, `/pat`, `/signins`, `/health`, `/gh/*` (GitHub proxy).
- **State:** one SQLite Durable Object (free plan, strongly consistent): password hash, encrypted GitHub key (AES-GCM, key-version field), session version, setup lock, backoff counters, sign-in log. No KV.
- **Secrets:** `SETUP_CODE` (32+ random chars, doubles as the reset code), `ENC_KEY`, `SESSION_HMAC`, `PEPPER`.
- **Passwords:** PBKDF2-SHA256, per-user salt, HMAC pepper. Iteration count = the highest that keeps login CPU under ~7 ms, measured on the deployed Worker. Constant-time comparisons. Minimum 12 characters.
- **Sessions:** HMAC-signed token {sub, aud, ver, iat, exp}. 12 h sliding, or 30 days with "keep me signed in". Version checked on every request, so "sign out everywhere" is instant. Password or key changes ask for the password again.
- **Brute force:** per IP + username exponential backoff, never a global lockout. Trusted-device token skips the backoff. Lockout messages give the wait time.
- **Proxy rules:** owner/repo hard-coded; path canonicalized, encoded or `..` paths rejected; method + path allowlist; client headers stripped; Origin must be https://yoavmizrahi.com (localhost only in dev).
- **Write allowlist:** ref writes only to heads/main and heads/drafts, never force. Tree entries only under `content/site.json`, `content/draft.json`, `index.html`, `w/`, `f/`, `media/`; `base_tree` required; no tree/symlink/submodule modes. Before moving main, compare old head to new commit and refuse if any file outside the allowlist changed. A stolen session can change content, never the admin's code.
- **Rescue:** keeps a direct "paste GitHub key" mode that talks to api.github.com, so an outage cannot block an undo.
- **Logging:** time, outcome, device label, city. Never tokens, passwords, the key or bodies.

## UX

- Real form with `autocomplete` username / current-password / new-password, so iPhone Passwords + Face ID fill it.
- First run: setup code + username + password + GitHub key, all in the admin.
- 401 mid-edit opens a sign-in sheet over the editor and retries; the draft is never lost.
- `/health` failure shows "Login server unreachable. Use the rescue page."
- GitHub key expiry warning 14 days ahead.
- Note on the iPhone home-screen app: it signs in separately from Safari.
- The workers.dev address is never shown.

## Rollout

1. Measure: deploy a throwaway Worker with the Durable Object, time PBKDF2 at several iteration counts.
2. Build the Worker and an admin "login mode" next to the current key mode. Nothing changes for Yoav yet.
3. Test: unit tests (allowlist, path and ref smuggling, setup once, version bump, backoff) + the Playwright harness against `wrangler dev` with the fake GitHub, including Worker down, 401 mid-publish, two devices.
4. Go live with login mode, run one real publish and restore, then switch over, clear the old key from browsers and replace the GitHub key.
5. Rollback any time: switch the admin back to key mode, or `wrangler rollback`.
6. `worker/RUNBOOK.md` for future sessions; wrangler pinned in `worker/package.json`.

## Rejected

- Password-locked key in the public repo: offline guessing with no lockout.
- Credentials set only at deploy time: Yoav could not change his password without a Claude session.
- Passkeys now: need the Worker on the same site as yoavmizrahi.com (would need DNS on Cloudflare).
- KV for security state: eventually consistent, 1k writes/day can be burned by failed logins.

## Open questions

- Yoav's Cloudflare account (free) and the one-time `wrangler login` approval.
