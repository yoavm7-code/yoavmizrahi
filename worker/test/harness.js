// Runs the real login server (src/index.js and the AuthStore Durable Object) in Node for tests.
// - `cloudflare:workers` resolves to a stub, so store.js loads outside Cloudflare.
// - The Durable Object's SQLite is Node's own node:sqlite, in memory, one database per test.
// - GitHub is a small fake that answers the requests the Worker makes, and records them.
import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

const STUB = new URL('./stub-workers.js', import.meta.url).href;
register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, next) { return s === "cloudflare:workers" ? { url: ' + JSON.stringify(STUB) + ', shortCircuit: true } : next(s, c); }'
));

const { default: worker, AuthStore } = await import('../src/index.js');

export const ORIGIN = 'https://yoavmizrahi.com';
export const BASE = '/repos/yoavm7-code/yoavmizrahi';
export const PAT = 'github_pat_' + 'A'.repeat(60);
export const SETUP_CODE = 'test-setup-code-' + 'x'.repeat(20);

/* The Durable Object's storage, backed by an in-memory SQLite database. */
function storage() {
  const db = new DatabaseSync(':memory:');
  return {
    sql: {
      exec(query, ...params) {
        const stmt = db.prepare(query);
        const rows = /^\s*SELECT/i.test(query) ? stmt.all(...params).map((r) => ({ ...r })) : (stmt.run(...params), []);
        return { toArray: () => rows };
      }
    },
    transactionSync(fn) {
      db.exec('BEGIN');
      try { const out = fn(); db.exec('COMMIT'); return out; } catch (e) { db.exec('ROLLBACK'); throw e; }
    }
  };
}

/* A fake GitHub holding refs and commits. `live` lists main and its ancestors, oldest first. */
export function fakeGitHub() {
  const gh = {
    refs: { main: 'a2'.padEnd(40, '0') },
    commits: {},
    live: ['a1'.padEnd(40, '0'), 'a2'.padEnd(40, '0')],
    compareFiles: [{ filename: 'content/site.json' }],
    calls: []
  };
  gh.commits[gh.live[0]] = { parents: [] };
  gh.commits[gh.live[1]] = { parents: [gh.live[0]] };
  gh.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = init.method || 'GET';
    const path = url.pathname;
    gh.calls.push(method + ' ' + path);
    const json = (status, data, headers) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } });
    if (method === 'GET' && path === BASE) return json(200, { permissions: { push: true } }, { 'github-authentication-token-expiration': '2027-01-01 00:00:00 UTC' });
    let m = path.match(/\/git\/refs?\/heads\/(main|drafts)$/);
    if (m && method === 'GET') return gh.refs[m[1]] ? json(200, { object: { sha: gh.refs[m[1]] } }) : json(404, { message: 'Not Found' });
    if (m && method === 'PATCH') { gh.refs[m[1]] = JSON.parse(init.body).sha; return json(200, { object: { sha: gh.refs[m[1]] } }); }
    if (method === 'POST' && path === BASE + '/git/refs') { const b = JSON.parse(init.body); gh.refs[b.ref.split('/').pop()] = b.sha; return json(201, { object: { sha: b.sha } }); }
    m = path.match(/\/git\/commits\/([0-9a-f]{40})$/);
    if (m) return gh.commits[m[1]] ? json(200, { sha: m[1], parents: gh.commits[m[1]].parents.map((sha) => ({ sha })) }) : json(404, { message: 'Not Found' });
    m = path.match(/\/compare\/([0-9a-z]+)\.\.\.([0-9a-z]+)$/);
    if (m) {
      const head = m[2] === 'main' ? gh.refs.main : m[2];
      const from = m[1] === 'main' ? gh.refs.main : m[1];
      if (!gh.commits[from] && !gh.live.includes(from)) return json(404, { message: 'Not Found' });
      if (from === head) return json(200, { status: 'identical', ahead_by: 0, behind_by: 0, files: [] });
      if (head === gh.refs.main && gh.live.includes(from)) return json(200, { status: 'ahead', ahead_by: gh.live.length - 1 - gh.live.indexOf(from), behind_by: 0, files: [] });
      if (from === gh.refs.main && gh.commits[head] && gh.commits[head].parents[0] === from) return json(200, { status: 'ahead', ahead_by: 1, behind_by: 0, files: gh.compareFiles });
      return json(200, { status: 'diverged', ahead_by: 1, behind_by: 1, files: [] });
    }
    return json(200, { ok: true });
  };
  return gh;
}

/* A fresh login server: its own database, secrets and fake GitHub. */
export function makeServer() {
  const enc = Buffer.alloc(32, 7).toString('base64url');
  const store = new AuthStore({ storage: storage() }, {});
  const env = {
    AUTH: { getByName: () => store },
    ALLOWED_ORIGINS: ORIGIN,
    GITHUB_API_BASE: 'https://api.github.test',
    GITHUB_OWNER: 'yoavm7-code',
    GITHUB_REPO: 'yoavmizrahi',
    SETUP_CODE,
    ENC_KEY: enc,
    SESSION_HMAC: 'test-session-hmac-secret-0123456789',
    PEPPER: 'test-pepper-0123456789'
  };
  const gh = fakeGitHub();
  const logs = [];
  async function call(method, path, opts = {}) {
    const headers = { Origin: opts.origin === undefined ? ORIGIN : opts.origin, 'CF-Connecting-IP': opts.ip || '203.0.113.1', 'User-Agent': 'Mozilla/5.0 (Macintosh; Mac OS X) Safari/605' };
    if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const realFetch = globalThis.fetch;
    const realLog = console.log;
    globalThis.fetch = gh.fetch;
    console.log = (...args) => logs.push(args);
    try {
      const res = await worker.fetch(new Request('https://login.test' + path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }), env);
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* not JSON: data stays null */ }
      return { status: res.status, data, headers: res.headers };
    } finally {
      globalThis.fetch = realFetch;
      console.log = realLog;
    }
  }
  return { store, env, gh, logs, call };
}
