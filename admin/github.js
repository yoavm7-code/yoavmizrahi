/* Talks to the GitHub API. Two ways in:
   - Login mode: through the login server (worker/), which holds the GitHub key. The admin only
     sends its session token.
   - Key mode: straight to api.github.com with a GitHub key pasted on this device.
   Either way, nothing else in the admin sends a token anywhere. */

import { REPO } from './config.js';

var BASE = '/repos/' + REPO.owner + '/' + REPO.name;

/* api: 'https://api.github.com' (key mode) or '<login server>/gh' (login mode). getToken returns
   the current key or session token, read fresh on every call so a new sign-in takes effect. */
export function createClient(getToken, api) {
  var viaLogin = !!api && api.indexOf('https://api.github.com') !== 0;
  api = api || 'https://api.github.com';
  async function request(method, path, body, opts) {
    opts = opts || {};
    var headers = {
      Authorization: 'Bearer ' + getToken(),
      Accept: opts.accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (body) headers['Content-Type'] = 'application/json';
    var res;
    try {
      res = await fetch(api + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    } catch (e) {
      var offline = new Error('network');
      offline.status = 0;
      offline.loginServer = viaLogin;
      throw offline;
    }
    if (!res.ok) {
      var err = new Error('github ' + res.status);
      err.status = res.status;
      err.data = await res.json().catch(function () { return null; });
      err.rateLimited = res.headers.get('x-ratelimit-remaining') === '0';
      if (viaLogin) {
        err.session = res.status === 401;
        err.githubKey = err.data && err.data.error === 'github_key';
        err.refused = err.data && err.data.error === 'refused' ? err.data.message : null;
      }
      throw err;
    }
    if (opts.text) return res.text();
    return res.status === 204 ? null : res.json();
  }

  function nullIf404(p) {
    return p.catch(function (e) { if (e.status === 404) return null; throw e; });
  }

  return {
    repoInfo: function () { return request('GET', BASE); },
    user: function () { return request('GET', '/user'); },

    getRef: function (branch) { return nullIf404(request('GET', BASE + '/git/ref/heads/' + branch)); },
    createRef: function (branch, sha) { return request('POST', BASE + '/git/refs', { ref: 'refs/heads/' + branch, sha: sha }); },
    updateRef: function (branch, sha, force) { return request('PATCH', BASE + '/git/refs/heads/' + branch, { sha: sha, force: !!force }); },

    getCommit: function (sha) { return request('GET', BASE + '/git/commits/' + sha); },
    getTree: function (sha, recursive) { return request('GET', BASE + '/git/trees/' + sha + (recursive ? '?recursive=1' : '')); },
    createTree: function (baseTree, entries) { return request('POST', BASE + '/git/trees', { base_tree: baseTree, tree: entries }); },
    createCommit: function (message, tree, parents) { return request('POST', BASE + '/git/commits', { message: message, tree: tree, parents: parents }); },
    createBlob: function (base64) { return request('POST', BASE + '/git/blobs', { content: base64, encoding: 'base64' }); },
    getBlob: function (sha) { return request('GET', BASE + '/git/blobs/' + sha); },

    /* A text file at a branch or commit, or null when it does not exist there. */
    getText: function (path, ref) {
      return nullIf404(request('GET', BASE + '/contents/' + path + '?ref=' + encodeURIComponent(ref), null, { accept: 'application/vnd.github.raw+json', text: true }));
    },
    listCommits: function (path, branch, count) {
      return request('GET', BASE + '/commits?sha=' + encodeURIComponent(branch) + '&path=' + encodeURIComponent(path) + '&per_page=' + (count || 30));
    }
  };
}

/* Turns any failure into one sentence a person can act on. */
export function explain(err) {
  if (!err || err.status === undefined) return 'Something unexpected went wrong. Your draft is safe. Try again.';
  if (err.status === 0 && err.loginServer) return "Can't reach the sign-in service. Check your internet connection. Your draft is safe.";
  if (err.status === 0) return "Can't reach GitHub. Check your internet connection and try again. Your draft is safe.";
  if (err.session) return 'You were signed out. Sign in again to continue. Your draft is safe.';
  if (err.githubKey) return 'The GitHub key stopped working (it may have expired). Replace it in Settings. Your draft is safe.';
  if (err.refused) return 'This change was blocked for safety: ' + err.refused + ' Your draft is safe.';
  if (err.status === 401) return 'Your GitHub key stopped working. It may have expired or been deleted. Connect a new key to continue.';
  if (err.status === 403 && err.rateLimited) return 'GitHub asked us to slow down. Wait a minute and try again.';
  if (err.status === 403) return "Your GitHub key isn't allowed to do this. It needs \"Contents: Read and write\" on the " + REPO.name + ' repository.';
  if (err.status === 404) return "GitHub couldn't find the " + REPO.name + ' repository with this key. When creating the key, choose "Only select repositories" and pick ' + REPO.name + '.';
  if (err.status === 409 || err.status === 422) return 'The site changed while saving. Nothing was lost. Try again.';
  if (err.status >= 500) return 'GitHub is having trouble right now. Wait a moment and try again. Your draft is safe.';
  return 'GitHub said no (error ' + err.status + '). Your draft is safe. Try again.';
}
