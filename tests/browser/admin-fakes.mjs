// A fake login server and a fake GitHub for the admin's browser tests, so nothing reaches the real
// repo. Shared by every admin spec.
import { readFileSync } from 'node:fs';

export const REPO = '/repos/yoavm7-code/yoavmizrahi';
export const MAIN = '1'.repeat(40);
export const NEW_COMMIT = '2'.repeat(40);
export const RUN_URL = 'https://github.com/yoavm7-code/yoavmizrahi/actions/runs/42';
export const SITE_JSON = readFileSync(new URL('../../content/site.json', import.meta.url), 'utf8');

/* Fakes the login server and GitHub. deploy: what the Deploy run reports, or null for no run yet.
   goLive: serve the published index.html once it has been saved. */
export async function fakeBackend(page, { deploy, goLive }) {
  const saved = { index: null };
  await page.route(/workers\.dev\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (body, status) => route.fulfill({ status: status || 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/health') return json({ ok: true, ready: true });
    if (url.pathname === '/login') return json({ token: 'session', username: 'yoav', trusted: 'device' });
    if (url.pathname === '/me') return json({ username: 'yoav', token: 'session' });
    if (!url.pathname.startsWith('/gh' + REPO)) return json({ error: 'refused' }, 403);
    const path = url.pathname.slice(('/gh' + REPO).length);
    const method = req.method();
    if (method === 'GET' && path === '') return json({ permissions: { push: true } });
    if (method === 'GET' && path === '/git/ref/heads/main') return json({ object: { sha: MAIN } });
    if (method === 'GET' && path === '/git/ref/heads/drafts') return json({ message: 'Not Found' }, 404);
    if (method === 'GET' && path === '/contents/content/site.json') return route.fulfill({ status: 200, contentType: 'text/plain', body: SITE_JSON });
    if (method === 'GET' && path.startsWith('/git/commits/')) return json({ sha: path.slice(13), tree: { sha: 'a'.repeat(40) } });
    if (method === 'GET' && path.startsWith('/git/trees/')) return json({ tree: [{ path: 'index.html', type: 'blob' }, { path: 'content/site.json', type: 'blob' }] });
    if (method === 'POST' && path === '/git/trees') {
      const entry = req.postDataJSON().tree.find((e) => e.path === 'index.html');
      if (entry) saved.index = entry.content;
      return json({ sha: 'b'.repeat(40) });
    }
    if (method === 'POST' && path === '/git/commits') return json({ sha: NEW_COMMIT });
    if (method === 'PATCH' || (method === 'POST' && path === '/git/refs')) return json({ object: { sha: NEW_COMMIT } });
    return json({ message: 'unexpected ' + method + ' ' + path }, 500);
  });
  await page.route(/api\.github\.com\/repos\/yoavm7-code\/yoavmizrahi\/actions\/runs/, (route) => {
    const runs = deploy ? [{ path: '.github/workflows/deploy.yml', html_url: RUN_URL, ...deploy }] : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflow_runs: runs }) });
  });
  await page.route(/\/index\.html\?live=/, (route) => {
    if (goLive && saved.index) return route.fulfill({ status: 200, contentType: 'text/html', body: saved.index });
    return route.continue();
  });
}
