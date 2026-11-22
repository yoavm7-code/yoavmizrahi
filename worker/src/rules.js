/* What a signed-in admin session may ask GitHub to do. Pure functions, no I/O, unit-tested in
   test/rules.test.js. Anything not explicitly allowed here is refused.

   The admin only ever writes content: content/site.json, content/draft.json, index.html, the share
   pages (w/, f/) and media/. A stolen session can therefore change the site's content (which the
   admin's History and the rescue page can undo) but never the admin's own code. */

var HEX40 = '[0-9a-f]{40}';

/* Files the admin is allowed to create, change or delete. */
export var CONTENT_PATH = /^(?:content\/(?:site|draft)\.json|index\.html|[wf]\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html|media\/[a-z0-9-]+\.(?:webp|jpg|jpeg|png|gif|mp4|webm))$/;

export var BRANCHES = ['main', 'drafts'];

/* Checks a request path + query against the allowlist. Returns a route name, or null if refused.
   base is "/repos/<owner>/<repo>". The path must already be the raw, undecoded pathname. */
export function matchRoute(method, path, query, base) {
  if (!isCanonical(path)) return null;
  if (path !== base && path.indexOf(base + '/') !== 0) return null;
  var rest = path.slice(base.length);
  var q = parseQuery(query);
  if (q === null) return null;
  var routes = [
    ['GET', '', 'repo', []],
    ['GET', '/git/ref/heads/(?:main|drafts)', 'getRef', []],
    ['POST', '/git/refs', 'createRef', []],
    ['PATCH', '/git/refs/heads/(?:main|drafts)', 'updateRef', []],
    ['GET', '/git/commits/' + HEX40, 'getCommit', []],
    ['POST', '/git/commits', 'createCommit', []],
    ['GET', '/git/trees/' + HEX40, 'getTree', ['recursive']],
    ['POST', '/git/trees', 'createTree', []],
    ['POST', '/git/blobs', 'createBlob', []],
    ['GET', '/git/blobs/' + HEX40, 'getBlob', []],
    ['GET', '/contents/content/(?:site|draft)\\.json', 'getContent', ['ref']],
    ['GET', '/commits', 'listCommits', ['sha', 'path', 'per_page']]
  ];
  for (var i = 0; i < routes.length; i++) {
    var r = routes[i];
    if (r[0] !== method || !new RegExp('^' + r[1] + '$').test(rest)) continue;
    var keys = Object.keys(q);
    if (keys.some(function (k) { return r[3].indexOf(k) === -1; })) return null;
    if (r[2] === 'getContent' && !/^(?:main|drafts|[0-9a-f]{40})$/.test(q.ref || '')) return null;
    if (r[2] === 'listCommits' && !(BRANCHES.indexOf(q.sha) !== -1 && q.path === 'content/site.json' && /^[0-9]{1,3}$/.test(q.per_page || '30'))) return null;
    if (r[2] === 'getTree' && q.recursive !== undefined && q.recursive !== '1') return null;
    return r[2];
  }
  return null;
}

/* Rejects anything that could be decoded or normalized into a different path. */
export function isCanonical(path) {
  return typeof path === 'string' &&
    path.charAt(0) === '/' &&
    !/[%\\]|\/\/|\/\.\.?(?:\/|$)/.test(path) &&
    /^[A-Za-z0-9/._-]+$/.test(path);
}

function parseQuery(query) {
  var out = {};
  if (!query) return out;
  var parts = query.replace(/^\?/, '').split('&');
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    var kv = parts[i].split('=');
    if (kv.length !== 2 || !/^[a-z_]+$/.test(kv[0]) || !/^[A-Za-z0-9._%/-]*$/.test(kv[1])) return null;
    var value;
    try { value = decodeURIComponent(kv[1]); } catch (e) { return null; }
    if (Object.prototype.hasOwnProperty.call(out, kv[0])) return null;
    out[kv[0]] = value;
  }
  return out;
}

/* ---------- Body checks for write routes ---------- */

/* Returns an error string, or '' when the body is allowed. */
export function checkBody(route, body) {
  if (route === 'createRef') {
    if (!body || body.ref !== 'refs/heads/drafts' || !isSha(body.sha)) return 'Only the drafts branch can be created.';
    return '';
  }
  if (route === 'updateRef') {
    if (!body || !isSha(body.sha) || (body.force !== undefined && typeof body.force !== 'boolean')) return 'Bad branch update.';
    return '';
  }
  if (route === 'createCommit') {
    if (!body || typeof body.message !== 'string' || body.message.length > 2000 || !isSha(body.tree)) return 'Bad commit.';
    if (!Array.isArray(body.parents) || body.parents.length !== 1 || !isSha(body.parents[0])) return 'A commit needs exactly one parent.';
    if (Object.keys(body).some(function (k) { return ['message', 'tree', 'parents'].indexOf(k) === -1; })) return 'Bad commit.';
    return '';
  }
  if (route === 'createTree') {
    if (!body || !isSha(body.base_tree)) return 'A tree must build on an existing one.';
    if (!Array.isArray(body.tree) || !body.tree.length || body.tree.length > 500) return 'Bad tree.';
    for (var i = 0; i < body.tree.length; i++) {
      var e = body.tree[i];
      if (!e || typeof e.path !== 'string' || !CONTENT_PATH.test(e.path)) return 'Only content files can be changed: ' + String(e && e.path).slice(0, 80);
      if (e.mode !== '100644' || e.type !== 'blob') return 'Only plain files can be changed.';
      var hasContent = typeof e.content === 'string';
      var hasSha = e.sha === null || isSha(e.sha);
      if (hasContent === hasSha) return 'Bad tree entry.';
      if (Object.keys(e).some(function (k) { return ['path', 'mode', 'type', 'content', 'sha'].indexOf(k) === -1; })) return 'Bad tree entry.';
    }
    if (Object.keys(body).some(function (k) { return ['base_tree', 'tree'].indexOf(k) === -1; })) return 'Bad tree.';
    return '';
  }
  return '';
}

/* For a move of main: given GitHub's compare result between the current main and the new commit,
   decides if it is a single fast-forward commit that only touches content files. */
export function checkCompare(compare) {
  if (!compare || compare.status !== 'ahead' || compare.ahead_by !== 1 || compare.behind_by !== 0) return 'The site can only move forward by one publish at a time.';
  var files = compare.files || [];
  if (files.length >= 300) return 'Too many files changed at once.';
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!CONTENT_PATH.test(f.filename || '') || (f.previous_filename && !CONTENT_PATH.test(f.previous_filename))) return 'Only content files can be published: ' + String(f.filename).slice(0, 80);
  }
  return '';
}

export function isSha(s) { return typeof s === 'string' && /^[0-9a-f]{40}$/.test(s); }
