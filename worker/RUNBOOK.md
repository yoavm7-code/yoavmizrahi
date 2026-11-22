# Login server runbook

For future Claude Code sessions. Yoav does not run commands himself: run them for him and explain in plain words.

The login server is a Cloudflare Worker (`ym-admin-login`) on Yoav's Cloudflare account (free plan), at
`https://ym-admin-login.yoavm7.workers.dev`. It signs Yoav in to `yoavmizrahi.com/admin/` and calls GitHub for the admin
with a GitHub key it keeps encrypted. Design and decisions: `_plans/2026-11-22-admin-login.md`.

## Files

```
src/index.js    routes: /health /setup /login /me /reauth /password /pat /signout-all /gh/* (GitHub proxy)
src/rules.js    what the proxy allows (read this before changing anything); pure, unit-tested
src/crypto.js   password hashing (PBKDF2 40k + pepper), signed tokens, AES-GCM for the GitHub key
src/store.js    the SQLite Durable Object: account, encrypted key, session version, backoff, sign-in log
test/           node --test test/rules.test.js   (npm test)
wrangler.jsonc  config; wrangler is pinned in package.json
.dev.vars       local-only test secrets (git-ignored, never deploy these)
```

## Secrets (set on Cloudflare, never in the repo)

| Name | What |
|---|---|
| `SETUP_CODE` | One-time setup code, also the password-reset code. Yoav keeps it in his Passwords app. |
| `ENC_KEY` | 32 random bytes, base64url. Encrypts the GitHub key. Changing it makes the stored key unreadable (Yoav then pastes a new key via "Forgot your password?" or Settings). |
| `SESSION_HMAC` | Signs session and trusted-device tokens. Changing it signs every device out. |
| `PEPPER` | Mixed into password hashes. Changing it makes the current password stop working (Yoav resets with the setup code). |

Set or rotate a secret without printing it (PowerShell or bash), from `worker/`:

```
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | npx wrangler secret put SESSION_HMAC
```

## Common jobs

- **Deploy after a code change:** `npm test`, then `npx wrangler deploy`. Then check `curl -H "Origin: https://yoavmizrahi.com" https://ym-admin-login.yoavm7.workers.dev/health`.
- **Roll back a bad deploy:** `npx wrangler versions list`, then `npx wrangler rollback <version-id>`.
- **Yoav forgot his password:** he uses "Forgot your password?" on the sign-in screen with his setup code. Nothing to do here.
- **Yoav lost the setup code:** set a new one (`... | npx wrangler secret put SETUP_CODE`, 24+ characters), give it to him privately (a file he saves into Passwords, then deletes), never in chat or the repo.
- **GitHub key expired:** the admin warns 14 days ahead. He replaces it in Settings (needs his password).
- **Suspected break-in:** "Sign out everywhere" in Settings, change the password, replace the GitHub key, delete the old key on GitHub. Then rotate `SESSION_HMAC`.
- **Watch live logs:** `npx wrangler tail ym-admin-login` (no tokens, passwords or keys are ever logged).
- **Login server down / Cloudflare outage:** the rescue page (`/admin/rescue.html`) has a "Use a GitHub key" tab that talks to GitHub directly.
- **Switch the admin back to per-device GitHub keys:** set `LIVE_LOGIN_API = ''` in `admin/config.js`, push. Key mode is fully tested and still works.

## Testing locally

1. Serve the site: `python -m http.server 8765` in the repo root.
2. Fake GitHub on `127.0.0.1:8790`: a small in-memory git (refs, commits, trees, blobs, contents, commits list, compare)
   served over HTTP, seeded from the repo files. It is not kept in the repo; rebuild it for testing. Never test against
   the real repository.
3. `npx wrangler dev --ip 127.0.0.1 --port 8787 --persist-to <empty folder>` (uses `.dev.vars`).
4. In Playwright, route `https://ym-admin-login.yoavm7.workers.dev/**` to `http://127.0.0.1:8787`, so the admin's CSP stays unchanged.

`wrangler dev` sometimes leaves `workerd.exe` running on Windows after the terminal is stopped. Stop only the ones whose
command line contains `yoavmizrahi-site\worker\node_modules`.

## Limits that shaped the design (verified 2026-11-22)

- Free plan: 100k requests/day, 10 ms CPU per request (waiting on GitHub does not count), 50 subrequests per request.
- PBKDF2 above 100,000 rounds is refused by Workers; 50k measured at 7-9 ms CPU. 40k is used.
- SQLite Durable Objects are on the free plan; strongly consistent.
