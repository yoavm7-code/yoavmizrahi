// The login server's request handlers end to end: src/index.js with the real AuthStore, in Node,
// against a fake GitHub (see harness.js). Nothing here reaches Cloudflare or GitHub.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, PAT, SETUP_CODE, BASE } from './harness.js';

const USER = 'yoav';
const PASSWORD = 'a long test password';
const DAY = 86400000;

function decode(token) { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString()); }

async function setUp(opts = {}) {
  const s = makeServer();
  const res = await s.call('POST', '/setup', { body: { code: SETUP_CODE, username: USER, password: PASSWORD, pat: PAT, remember: opts.remember !== false } });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return Object.assign(s, { token: res.data.token, trusted: res.data.trusted });
}

/* ---------- Origin and setup ---------- */

test('only the site may call the server, and every reply says how to cache it', async () => {
  const s = makeServer();
  assert.equal((await s.call('GET', '/health', { origin: 'https://evil.example' })).status, 403);
  assert.equal((await s.call('GET', '/health', { origin: '' })).status, 403);
  const ok = await s.call('GET', '/health');
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://yoavmizrahi.com');
  assert.equal(ok.headers.get('Cache-Control'), 'no-store');
  assert.equal(ok.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.deepEqual(ok.data, { ok: true, ready: false });
});

test('setup needs the setup code, and slows down wrong codes', async () => {
  const s = makeServer();
  for (let i = 0; i < 2; i++) assert.equal((await s.call('POST', '/setup', { body: { code: 'wrong', username: USER, password: PASSWORD, pat: PAT } })).status, 401);
  const third = await s.call('POST', '/setup', { body: { code: 'wrong', username: USER, password: PASSWORD, pat: PAT } });
  assert.equal(third.status, 401);
  assert.ok(third.data.retryAfter > 0);
  assert.equal((await s.call('POST', '/setup', { body: { code: SETUP_CODE, username: USER, password: PASSWORD, pat: PAT } })).status, 429);
});

test('only fine-grained GitHub keys are accepted', async () => {
  const s = makeServer();
  const classic = await s.call('POST', '/setup', { body: { code: SETUP_CODE, username: USER, password: PASSWORD, pat: 'ghp_' + 'A'.repeat(36) } });
  assert.deepEqual([classic.status, classic.data.error], [400, 'pat_format']);
  const ok = await s.call('POST', '/setup', { body: { code: SETUP_CODE, username: USER, password: PASSWORD, pat: PAT } });
  assert.equal(ok.status, 200);
});

/* ---------- Sign in ---------- */

test('signs in with the right password, refuses the wrong one, and slows down guessing', async () => {
  const s = await setUp();
  assert.equal((await s.call('POST', '/login', { body: { username: USER, password: PASSWORD } })).status, 200);
  for (let i = 0; i < 2; i++) assert.equal((await s.call('POST', '/login', { body: { username: USER, password: 'nope nope nope' } })).status, 401);
  const third = await s.call('POST', '/login', { body: { username: USER, password: 'nope nope nope' } });
  assert.ok(third.data.retryAfter >= 30000);
  assert.equal((await s.call('POST', '/login', { body: { username: USER, password: PASSWORD } })).status, 429, 'even the right password waits');
});

test('guessing from many addresses hits the shared limit, and a known device never waits on it', async () => {
  const s = await setUp();
  for (let i = 0; i < 20; i++) {
    const r = await s.call('POST', '/login', { ip: '198.51.100.' + i, body: { username: USER, password: 'guess ' + i } });
    assert.equal(r.status, 401, 'guess ' + i);
  }
  const fresh = await s.call('POST', '/login', { ip: '192.0.2.77', body: { username: USER, password: PASSWORD } });
  assert.equal(fresh.status, 429, 'an unknown device waits once the shared count is full');
  assert.ok(s.logs.some((l) => l[0] === 'global wait'));
  const known = await s.call('POST', '/login', { ip: '192.0.2.77', body: { username: USER, password: PASSWORD, trusted: s.trusted } });
  assert.equal(known.status, 200, 'a device that signed in before goes straight in');
});

test('a known device\'s wrong guesses don\'t count toward the shared limit', async () => {
  const s = await setUp();
  for (let i = 0; i < 25; i++) await s.call('POST', '/login', { ip: '198.51.100.' + i, body: { username: USER, password: 'typo ' + i, trusted: s.trusted } });
  assert.equal(s.store.waitFor('login:all', Date.now()), 0);
});

test('junk sign-ins can\'t push the real ones out of the log', async () => {
  const s = await setUp();
  await s.call('POST', '/login', { body: { username: USER, password: PASSWORD } });
  for (let i = 0; i < 60; i++) s.store.logSignin({ at: Date.now(), ok: false, kind: 'sign-in', device: 'junk' });
  const rows = s.store.sql.exec('SELECT ok, kind FROM signins').toArray();
  assert.equal(rows.filter((r) => !r.ok).length, 30, 'failed ones are capped');
  assert.equal(rows.filter((r) => r.ok).length, 2, 'the setup and the sign-in are still there');
  const me = await s.call('GET', '/me', { token: s.token });
  assert.ok(me.data.signins.length <= 12);
});

/* ---------- Sessions ---------- */

test('a session is refused without a valid token, and after "sign out everywhere"', async () => {
  const s = await setUp();
  assert.equal((await s.call('GET', '/me')).status, 401);
  assert.equal((await s.call('GET', '/me', { token: s.token.slice(0, -2) + 'xx' })).status, 401);
  assert.equal((await s.call('GET', '/me', { token: s.token })).status, 200);
  assert.equal((await s.call('POST', '/signout-all', { token: s.token })).status, 200);
  assert.equal((await s.call('GET', '/me', { token: s.token })).status, 401);
});

test('renewing slides a session forward, but never past 90 days after signing in', async (t) => {
  t.after(() => mock.timers.reset());
  const start = Date.UTC(2026, 10, 24);
  mock.timers.enable({ apis: ['Date'], now: start });
  const s = await setUp();
  const born = decode(s.token).born;
  assert.equal(born, start);
  let token = s.token;
  for (let day = 20; day <= 100; day += 20) {
    mock.timers.setTime(start + day * DAY);
    const r = await s.call('GET', '/me', { token });
    if (day < 90) {
      assert.equal(r.status, 200, 'day ' + day);
      token = r.data.token;
      assert.equal(decode(token).born, start, 'renewal keeps the sign-in time');
      assert.ok(decode(token).exp <= start + 90 * DAY);
    } else {
      assert.equal(r.status, 401, 'day ' + day + ': past the cap, sign in again');
    }
  }
  assert.ok(s.logs.some((l) => l[0] === 'renewal capped'));
});

test('a session without "keep me signed in" ends 7 days after signing in at the latest', async (t) => {
  t.after(() => mock.timers.reset());
  const start = Date.UTC(2026, 10, 24);
  mock.timers.enable({ apis: ['Date'], now: start });
  const s = await setUp();
  let token = (await s.call('POST', '/login', { body: { username: USER, password: PASSWORD } })).data.token;
  for (let h = 10; h < 7 * 24; h += 10) {
    mock.timers.setTime(start + h * 3600000);
    const r = await s.call('GET', '/me', { token });
    assert.equal(r.status, 200, 'hour ' + h);
    token = r.data.token;
  }
  assert.equal(decode(token).exp, start + 7 * DAY);
  mock.timers.setTime(start + 7 * DAY + 1);
  assert.equal((await s.call('GET', '/me', { token })).status, 401);
});

test('a token from before this change keeps working, counted from its own issue time', async () => {
  const s = await setUp();
  const { signToken } = await import('../src/crypto.js');
  const now = Date.now();
  const old = await signToken(s.env.SESSION_HMAC, { typ: 'session', aud: 'ym-admin', sub: USER, ver: decode(s.token).ver, rem: true, iat: now - DAY, exp: now + 29 * DAY });
  const r = await s.call('GET', '/me', { token: old });
  assert.equal(r.status, 200);
  assert.equal(decode(r.data.token).born, now - DAY);
});

test('changing the password needs a fresh password check, and keeps the sign-in time', async () => {
  const s = await setUp();
  assert.equal((await s.call('POST', '/password', { token: s.token, body: { password: 'a brand new password' } })).status, 403);
  const re = await s.call('POST', '/reauth', { token: s.token, body: { password: PASSWORD } });
  assert.equal(re.status, 200);
  const changed = await s.call('POST', '/password', { token: s.token, body: { password: 'a brand new password', reauth: re.data.reauth } });
  assert.equal(changed.status, 200);
  assert.equal(decode(changed.data.token).born, decode(s.token).born);
  assert.equal((await s.call('GET', '/me', { token: s.token })).status, 401, 'other sessions are signed out');
});

test('a replacement GitHub key must be fine-grained too', async () => {
  const s = await setUp();
  const reauth = (await s.call('POST', '/reauth', { token: s.token, body: { password: PASSWORD } })).data.reauth;
  const classic = await s.call('POST', '/pat', { token: s.token, body: { pat: 'ghp_' + 'B'.repeat(36), reauth } });
  assert.deepEqual([classic.status, classic.data.error], [400, 'pat_format']);
  assert.equal((await s.call('POST', '/pat', { token: s.token, body: { pat: 'github_pat_' + 'B'.repeat(60), reauth } })).status, 200);
});

/* ---------- GitHub proxy ---------- */

test('the proxy refuses what the rules don\'t allow, and anything without a session', async () => {
  const s = await setUp();
  assert.equal((await s.call('GET', '/gh' + BASE)).status, 401);
  assert.equal((await s.call('GET', '/gh' + BASE, { token: s.token })).status, 200);
  assert.equal((await s.call('GET', '/gh/repos/someone/else', { token: s.token })).status, 403);
  assert.equal((await s.call('DELETE', '/gh' + BASE + '/git/refs/heads/main', { token: s.token })).status, 403);
  const link = await s.call('POST', '/gh' + BASE + '/git/trees', { token: s.token, body: { base_tree: 'a'.repeat(40), tree: [{ path: 'index.html', mode: '120000', type: 'blob', content: '/etc/passwd' }] } });
  assert.equal(link.status, 403, 'a symlink is refused');
  const sub = await s.call('POST', '/gh' + BASE + '/git/trees', { token: s.token, body: { base_tree: 'a'.repeat(40), tree: [{ path: 'media/x.webp', mode: '160000', type: 'commit', sha: 'b'.repeat(40) }] } });
  assert.equal(sub.status, 403, 'a submodule is refused');
});

test('publishing moves main only by one content-only commit', async () => {
  const s = await setUp();
  const next = 'b1'.padEnd(40, '0');
  s.gh.commits[next] = { parents: [s.gh.refs.main] };
  const ok = await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/main', { token: s.token, body: { sha: next, force: false } });
  assert.equal(ok.status, 200);
  assert.equal(s.gh.refs.main, next);
  const sneaky = 'b2'.padEnd(40, '0');
  s.gh.commits[sneaky] = { parents: [next] };
  s.gh.compareFiles = [{ filename: 'js/main.js' }];
  const refused = await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/main', { token: s.token, body: { sha: sneaky } });
  assert.equal(refused.status, 422);
  assert.equal(s.gh.refs.main, next);
});

/* ---------- drafts ---------- */

function draftOn(s, parent) {
  const sha = ('d' + Object.keys(s.gh.commits).length).padEnd(40, 'f');
  s.gh.commits[sha] = { parents: [parent] };
  return sha;
}

test('drafts starts from the live site, then moves one save at a time', async () => {
  const s = await setUp();
  const first = draftOn(s, s.gh.refs.main);
  assert.equal((await s.call('POST', '/gh' + BASE + '/git/refs', { token: s.token, body: { ref: 'refs/heads/drafts', sha: first } })).status, 201);
  const second = draftOn(s, first);
  assert.equal((await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: second, force: true } })).status, 200);
  assert.equal(s.gh.refs.drafts, second);
});

test('a save built on an older draft is turned away so the admin rebuilds it', async () => {
  const s = await setUp();
  const first = draftOn(s, s.gh.refs.main);
  s.gh.refs.drafts = first;
  const second = draftOn(s, first);
  s.gh.refs.drafts = second; // another device saved in between
  const stale = draftOn(s, first);
  const r = await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: stale, force: true } });
  assert.deepEqual([r.status, r.data.error], [409, 'draft_conflict']);
  assert.equal(s.gh.refs.drafts, second);
});

test('drafts can be reset to the live site or its history, but not pointed anywhere else', async () => {
  const s = await setUp();
  s.gh.refs.drafts = draftOn(s, s.gh.refs.main);
  assert.equal((await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: s.gh.live[0], force: true } })).status, 200, 'an older live commit');
  assert.equal((await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: s.gh.refs.main, force: true } })).status, 200, 'the live site');
  const stranger = 'e0'.padEnd(40, '0');
  s.gh.commits[stranger] = { parents: ['c0'.padEnd(40, '0')] };
  const before = s.gh.refs.drafts;
  const r = await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: stranger, force: true } });
  assert.equal(r.status, 409, 'a commit not built on the current draft');
  assert.equal(s.gh.refs.drafts, before);
  const merge = 'e1'.padEnd(40, '0');
  s.gh.commits[merge] = { parents: [before, s.gh.refs.main] };
  const two = await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: merge, force: true } });
  assert.deepEqual([two.status, two.data.error], [409, 'refused'], 'a commit with two parents');
  const unknown = await s.call('PATCH', '/gh' + BASE + '/git/refs/heads/drafts', { token: s.token, body: { sha: 'f'.repeat(40), force: true } });
  assert.equal(unknown.status, 409);
  assert.equal(s.gh.refs.main, s.gh.live[1], 'main never moved');
});

test('a new drafts branch can\'t start from a commit outside the live history', async () => {
  const s = await setUp();
  const orphan = draftOn(s, 'c0'.padEnd(40, '0'));
  const r = await s.call('POST', '/gh' + BASE + '/git/refs', { token: s.token, body: { ref: 'refs/heads/drafts', sha: orphan } });
  assert.equal(r.status, 409);
  assert.equal(s.gh.refs.drafts, undefined);
  assert.ok(s.logs.some((l) => l[0] === 'drafts move refused'));
});
