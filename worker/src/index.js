/* Login server for the portfolio admin (yoavmizrahi.com/admin/).
   - Checks the username and password, hands out signed session tokens.
   - Holds the GitHub key (encrypted) and calls GitHub for the admin, but only for the narrow
     set of requests in rules.js. The key never reaches a browser.
   See RUNBOOK.md for setup, resets and deploys. */

import { AuthStore } from './store.js';
import { matchRoute, checkBody, checkCompare, checkDraftsMove, DRAFT_CONFLICT } from './rules.js';
import { hashPassword, checkPassword, signToken, verifyToken, encryptText, decryptText, safeEqual, randomBytes, b64url } from './crypto.js';

export { AuthStore };

var HOUR = 3600000;
var DAY = 24 * HOUR;
var SESSION_MS = 12 * HOUR;
var REMEMBER_MS = 30 * DAY;
var SESSION_CAP_MS = 7 * DAY;     // renewals never go past this after the sign-in itself
var REMEMBER_CAP_MS = 90 * DAY;   // the same, for "keep me signed in"
var GLOBAL_SCOPE = 'login:all';   // failed sign-ins from every unknown device, counted together
var GLOBAL_FREE = 20;             // misses before that shared count starts slowing down
var TRUSTED_MS = 365 * DAY;
var REAUTH_MS = 5 * 60000;
var MAX_BLOB_BYTES = 60 * 1024 * 1024;
var MAX_JSON_BYTES = 2 * 1024 * 1024;

export default {
  async fetch(request, env) {
    var origin = request.headers.get('Origin') || '';
    var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(function (s) { return s.trim(); }).indexOf(origin) !== -1 ? origin : '';
    if (request.method === 'OPTIONS') return cors(new Response(null, { status: allowed ? 204 : 403 }), allowed);
    if (!allowed) return reply(403, { error: 'origin' });
    var res;
    try {
      res = await handle(request, env, new URL(request.url));
    } catch (e) {
      console.log('error', e && e.message ? String(e.message).slice(0, 200) : 'unknown');
      res = reply(500, { error: 'server' });
    }
    return cors(res, allowed);
  }
};

/* ---------- Routing ---------- */

async function handle(request, env, url) {
  var store = env.AUTH.getByName('auth');
  var path = url.pathname;
  var m = request.method;

  if (m === 'GET' && path === '/health') {
    var acc = await store.account();
    return reply(200, { ok: true, ready: acc.ready });
  }
  if (m === 'POST' && path === '/setup') return setup(request, env, store);
  if (m === 'POST' && path === '/login') return login(request, env, store);

  var sess = await session(request, env, store);
  if (!sess) return reply(401, { error: 'session' });

  if (m === 'GET' && path === '/me') return me(env, store, sess);
  if (m === 'POST' && path === '/reauth') return reauth(request, env, store, sess);
  if (m === 'POST' && path === '/password') return changePassword(request, env, store, sess);
  if (m === 'POST' && path === '/pat') return replacePat(request, env, store, sess);
  if (m === 'POST' && path === '/signout-all') { await store.signOutEverywhere(); return reply(200, { ok: true }); }
  if (path.indexOf('/gh/') === 0) return proxy(request, env, url, sess);
  return reply(404, { error: 'not_found' });
}

/* ---------- Sessions ---------- */

async function session(request, env, store) {
  var header = request.headers.get('Authorization') || '';
  var token = header.indexOf('Bearer ') === 0 ? header.slice(7) : '';
  var payload = await verifyToken(env.SESSION_HMAC, token, 'session');
  if (!payload) return null;
  var state = await store.session();
  if (payload.ver !== state.ver || payload.sub !== state.username) return null;
  return { payload: payload, pat: state.pat, username: state.username, ver: state.ver };
}

/* born is when the person actually signed in. Renewing slides the expiry forward, but never past
   born plus the cap, so a stolen token can't be kept alive forever. */
async function issue(env, username, ver, remember, now, born) {
  born = born || now;
  var exp = Math.min(now + (remember ? REMEMBER_MS : SESSION_MS), born + (remember ? REMEMBER_CAP_MS : SESSION_CAP_MS));
  if (exp < now + (remember ? REMEMBER_MS : SESSION_MS)) console.log('renewal capped', { remember: !!remember, hoursLeft: Math.round((exp - now) / HOUR) });
  return signToken(env.SESSION_HMAC, { typ: 'session', aud: 'ym-admin', sub: username, ver: ver, rem: !!remember, born: born, iat: now, exp: exp });
}

/* Tokens from before born existed count from their own issue time. */
function bornOf(payload) { return typeof payload.born === 'number' ? payload.born : payload.iat; }

async function trustedToken(env, username, existing, now) {
  var old = existing ? await verifyToken(env.SESSION_HMAC, existing, 'trusted', now) : null;
  var dev = old && old.sub === username ? old.dev : b64url(randomBytes(9));
  return signToken(env.SESSION_HMAC, { typ: 'trusted', aud: 'ym-admin', sub: username, dev: dev, iat: now, exp: now + TRUSTED_MS });
}

/* ---------- Setup and password reset ---------- */

/* The setup code (a Worker secret) creates the login the first time, and resets the password
   later if it is forgotten. Wrong codes slow down exactly like wrong passwords. */
async function setup(request, env, store) {
  var now = Date.now();
  var body = await readJson(request);
  if (!env.SETUP_CODE || env.SETUP_CODE.length < 24) return reply(503, { error: 'not_configured' });
  var scope = 'setup:' + clientIp(request);
  var wait = await store.waitFor(scope, now);
  if (wait) return reply(429, { error: 'wait', retryAfter: wait });
  if (!safeEqual(str(body.code).trim(), env.SETUP_CODE)) {
    var next = await store.recordFail(scope, now);
    await store.logSignin({ at: now, ok: false, kind: 'setup', device: device(request), place: place(request) });
    return reply(401, { error: 'code', retryAfter: next });
  }
  var username = str(body.username).trim().toLowerCase();
  var password = str(body.password);
  if (!/^[a-z0-9._@-]{3,60}$/.test(username)) return reply(400, { error: 'username' });
  if (password.length < 12 || password.length > 200 || password.toLowerCase() === username) return reply(400, { error: 'password' });

  var sealed = null;
  var expires = '';
  var pat = str(body.pat).trim();
  if (pat) {
    var check = await checkPat(env, pat);
    if (check.error) return reply(400, { error: check.error });
    sealed = await encryptText(env.ENC_KEY, pat);
    expires = check.expires;
  }
  var hashed = await hashPassword(password, env.PEPPER);
  var saved = await store.saveAccount(username, hashed, sealed, expires);
  if (!saved.ok) return reply(400, { error: saved.error });
  await store.clearFails(scope);
  await store.logSignin({ at: now, ok: true, kind: 'setup', device: device(request), place: place(request) });
  return reply(200, {
    token: await issue(env, username, saved.ver, body.remember !== false, now),
    trusted: body.remember !== false ? await trustedToken(env, username, null, now) : null,
    username: username
  });
}

/* ---------- Sign in ---------- */

async function login(request, env, store) {
  var now = Date.now();
  var body = await readJson(request);
  var username = str(body.username).trim().toLowerCase();
  var password = str(body.password);
  if (!username || !password || password.length > 200 || username.length > 60) return reply(400, { error: 'missing' });

  /* Guesses slow down per network address and name. A device that signed in before carries a
     trusted token, so a stranger's guessing elsewhere can never lock it out. */
  var scope = 'login:' + clientIp(request) + ':' + username;
  var trusted = body.trusted ? await verifyToken(env.SESSION_HMAC, str(body.trusted), 'trusted', now) : null;
  var known = !!(trusted && trusted.sub === username);
  if (known) scope = 'device:' + trusted.dev;
  var wait = await store.waitFor(scope, now);
  /* Unknown devices also share one count, so guessing from many addresses slows down too.
     A device that signed in before never waits on it. */
  if (!wait && !known) {
    wait = await store.waitFor(GLOBAL_SCOPE, now);
    if (wait) console.log('global wait', { seconds: Math.ceil(wait / 1000) });
  }
  if (wait) return reply(429, { error: 'wait', retryAfter: wait });

  var acc = await store.account();
  if (!acc.ready) return reply(409, { error: 'not_set_up' });
  var passOk = await checkPassword(password, env.PEPPER, acc.password);
  var ok = passOk && safeEqual(username, acc.username);
  await store.logSignin({ at: now, ok: ok, kind: 'sign-in', device: device(request), place: place(request) });
  if (!ok) {
    var next = await store.recordFail(scope, now);
    if (!known) next = Math.max(next, await store.recordFail(GLOBAL_SCOPE, now, GLOBAL_FREE));
    return reply(401, { error: 'wrong', retryAfter: next });
  }
  await store.clearFails(scope);
  return reply(200, {
    token: await issue(env, acc.username, acc.ver, !!body.remember, now),
    trusted: body.remember ? await trustedToken(env, acc.username, str(body.trusted), now) : null,
    username: acc.username
  });
}

/* ---------- Signed-in account actions ---------- */

/* Account details plus a fresh token, so active sessions keep sliding forward. */
async function me(env, store, sess) {
  var now = Date.now();
  var acc = await store.account();
  var signins = await store.recentSignins(12);
  return reply(200, {
    username: acc.username,
    patExpires: acc.patExpires,
    signins: signins,
    token: await issue(env, sess.username, sess.ver, sess.payload.rem, now, bornOf(sess.payload))
  });
}

/* Confirms the password again before sensitive changes. Kept separate from the change itself so
   no single request needs two password hashes (the free plan allows 10 ms of CPU). */
async function reauth(request, env, store, sess) {
  var now = Date.now();
  var body = await readJson(request);
  var scope = 'reauth:' + sess.username;
  var wait = await store.waitFor(scope, now);
  if (wait) return reply(429, { error: 'wait', retryAfter: wait });
  var acc = await store.account();
  if (!(await checkPassword(str(body.password), env.PEPPER, acc.password))) {
    var next = await store.recordFail(scope, now);
    return reply(401, { error: 'wrong', retryAfter: next });
  }
  await store.clearFails(scope);
  return reply(200, { reauth: await signToken(env.SESSION_HMAC, { typ: 'reauth', aud: 'ym-admin', sub: sess.username, ver: sess.ver, iat: now, exp: now + REAUTH_MS }) });
}

async function fresh(env, body, sess) {
  var r = await verifyToken(env.SESSION_HMAC, str(body.reauth), 'reauth');
  return !!(r && r.sub === sess.username && r.ver === sess.ver);
}

async function changePassword(request, env, store, sess) {
  var now = Date.now();
  var body = await readJson(request);
  if (!(await fresh(env, body, sess))) return reply(403, { error: 'reauth' });
  var password = str(body.password);
  if (password.length < 12 || password.length > 200 || password.toLowerCase() === sess.username) return reply(400, { error: 'password' });
  var ver = await store.setPassword(await hashPassword(password, env.PEPPER), !!body.keepOthers);
  return reply(200, { token: await issue(env, sess.username, ver, sess.payload.rem, now, bornOf(sess.payload)) });
}

async function replacePat(request, env, store, sess) {
  var body = await readJson(request);
  if (!(await fresh(env, body, sess))) return reply(403, { error: 'reauth' });
  var pat = str(body.pat).trim();
  var check = await checkPat(env, pat);
  if (check.error) return reply(400, { error: check.error });
  await store.setPat(await encryptText(env.ENC_KEY, pat), check.expires);
  return reply(200, { ok: true, patExpires: check.expires || null });
}

/* Makes sure a GitHub key can write to this one repository. Only fine-grained keys, which can be
   limited to this repository; a classic key reaches every repository on the account. GitHub reports
   the key's expiry in a response header that browsers cannot read but the Worker can. */
async function checkPat(env, pat) {
  if (!/^github_pat_[A-Za-z0-9_]{20,255}$/.test(pat)) return { error: 'pat_format' };
  var res = await fetch(env.GITHUB_API_BASE + '/repos/' + env.GITHUB_OWNER + '/' + env.GITHUB_REPO, { headers: ghHeaders(pat) });
  if (res.status === 401) return { error: 'pat_invalid' };
  if (res.status === 404 || res.status === 403) return { error: 'pat_repo' };
  if (!res.ok) return { error: 'github_down' };
  var info = await res.json();
  if (!info.permissions || !info.permissions.push) return { error: 'pat_readonly' };
  var exp = res.headers.get('github-authentication-token-expiration');
  var date = exp ? new Date(exp.replace(' UTC', 'Z').replace(' ', 'T')) : null;
  return { expires: date && !isNaN(date) ? date.toISOString() : '' };
}

/* ---------- GitHub proxy ---------- */

async function proxy(request, env, url, sess) {
  var base = '/repos/' + env.GITHUB_OWNER + '/' + env.GITHUB_REPO;
  var path = url.pathname.slice(3);
  var method = request.method;
  var route = matchRoute(method, path, url.search, base);
  if (!route) return reply(403, { error: 'refused', message: 'The admin is not allowed to do that.' });
  if (!sess.pat) return reply(502, { error: 'github_key' });
  var pat = await decryptText(env.ENC_KEY, sess.pat);

  var body = null;
  var parsed = null;
  if (method !== 'GET') {
    var length = +(request.headers.get('Content-Length') || 0);
    if (route === 'createBlob') {
      if (!length || length > MAX_BLOB_BYTES) return reply(413, { error: 'too_big' });
      body = request.body;
    } else {
      body = await request.text();
      if (body.length > MAX_JSON_BYTES) return reply(413, { error: 'too_big' });
      try { parsed = JSON.parse(body); } catch (e) { return reply(400, { error: 'bad_json' }); }
      var problem = checkBody(route, parsed);
      if (problem) return reply(403, { error: 'refused', message: problem });
    }
  }

  /* Moving main (publishing) must be one new commit on top of the live site that only changes
     content files. Checked against GitHub's own comparison, so nothing can be smuggled in. */
  if (route === 'updateRef' && /\/heads\/main$/.test(path)) {
    if (parsed.force) return reply(403, { error: 'refused', message: 'The live site can only move forward.' });
    var head = await gh(env, pat, 'GET', base + '/git/ref/heads/main');
    if (!head.ok) return passError(head);
    var current = (await head.json()).object.sha;
    var cmp = await gh(env, pat, 'GET', base + '/compare/' + current + '...' + parsed.sha);
    if (cmp.status === 404) return reply(422, { error: 'refused', message: 'Unknown commit.' });
    if (!cmp.ok) return passError(cmp);
    var problem2 = checkCompare(await cmp.json());
    if (problem2) return reply(422, { error: 'refused', message: problem2 });
  }

  /* Moving or creating drafts: a reset to the live site, or one save on top of the current draft. */
  var draftsMove = (route === 'updateRef' && /\/heads\/drafts$/.test(path)) || route === 'createRef';
  if (draftsMove) {
    var problem3 = await checkDrafts(env, pat, base, parsed.sha);
    if (problem3) {
      console.log('drafts move refused', { reason: problem3 });
      /* A save that lost the race to another device is not a safety refusal: the admin retries it. */
      return reply(409, problem3 === DRAFT_CONFLICT ? { error: 'draft_conflict' } : { error: 'refused', message: problem3 });
    }
  }

  var res = await gh(env, pat, method, path + url.search, body, request.headers.get('Accept'));
  if (res.status === 401) return reply(502, { error: 'github_key' });
  var headers = new Headers({ 'Content-Type': res.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'no-store' });
  return new Response(res.body, { status: res.status, headers: headers });
}

/* Gathers what checkDraftsMove needs, cheapest first. An ordinary save (one commit on top of the
   current draft) needs no comparison; resets and a first save compare against main, which for the
   live commit itself is a tiny "identical" answer. */
async function checkDrafts(env, pat, base, sha) {
  var ref = await gh(env, pat, 'GET', base + '/git/ref/heads/drafts');
  if (!ref.ok && ref.status !== 404) return 'GitHub did not answer. Try again.';
  var current = ref.ok ? (await ref.json()).object.sha : null;
  var commit = await gh(env, pat, 'GET', base + '/git/commits/' + sha);
  if (!commit.ok) return 'Unknown commit.';
  var parents = ((await commit.json()).parents || []).map(function (p) { return p.sha; });
  var move = { current: current, parents: parents, isLive: false, parentIsLive: false };
  if (current && parents.length === 1 && parents[0] === current) return checkDraftsMove(move);
  move.isLive = await isLive(env, pat, base, sha);
  if (!move.isLive && !current && parents.length === 1) move.parentIsLive = await isLive(env, pat, base, parents[0]);
  return checkDraftsMove(move);
}

/* True when sha is the live site (main) or one of its ancestors. */
async function isLive(env, pat, base, sha) {
  var cmp = await gh(env, pat, 'GET', base + '/compare/' + sha + '...main');
  if (!cmp.ok) return false;
  var status = (await cmp.json()).status;
  return status === 'identical' || status === 'ahead';
}

function gh(env, pat, method, pathAndQuery, body, accept) {
  var headers = ghHeaders(pat, accept);
  if (body) headers['Content-Type'] = 'application/json';
  return fetch(env.GITHUB_API_BASE + pathAndQuery, { method: method, headers: headers, body: body || undefined });
}

function ghHeaders(pat, accept) {
  return {
    Authorization: 'Bearer ' + pat,
    Accept: accept === 'application/vnd.github.raw+json' ? accept : 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'yoavmizrahi-admin'
  };
}

async function passError(res) {
  if (res.status === 401) return reply(502, { error: 'github_key' });
  return reply(res.status >= 500 ? 502 : res.status, { error: 'github', status: res.status });
}

/* ---------- Helpers ---------- */

function reply(status, data) {
  return new Response(JSON.stringify(data), { status: status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

function cors(res, origin) {
  var out = new Response(res.body, res);
  if (origin) {
    out.headers.set('Access-Control-Allow-Origin', origin);
    out.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH');
    out.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-GitHub-Api-Version');
    out.headers.set('Access-Control-Max-Age', '600');
  }
  out.headers.set('Vary', 'Origin');
  out.headers.set('X-Content-Type-Options', 'nosniff');
  return out;
}

async function readJson(request) {
  var text = await request.text();
  if (text.length > 20000) return {};
  try { var o = JSON.parse(text); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}

function str(v) { return typeof v === 'string' ? v : ''; }

function clientIp(request) { return request.headers.get('CF-Connecting-IP') || 'local'; }

function device(request) {
  var ua = request.headers.get('User-Agent') || '';
  var os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Unknown device';
  var browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return os + (browser ? ' · ' + browser : '');
}

function place(request) {
  var cf = request.cf || {};
  return [cf.city, cf.country].filter(Boolean).join(', ');
}
