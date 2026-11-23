/* Publishing: checks the draft, builds the finished pages and saves everything to main in one
   commit, so the site is never half-updated. Then watches the live site until the change shows. */

import { normalize, validate } from '../js/schema.js';
import { renderSite, renderSharePages } from '../js/render.js';
import { REPO, PATHS, SITE_ROOT } from './config.js';

/* ---------- What changed, in plain words ---------- */

export function describeChanges(liveRaw, draftRaw) {
  var live = normalize(liveRaw);
  var draft = normalize(draftRaw);
  var out = [];
  function differs(a, b) { return JSON.stringify(a) !== JSON.stringify(b); }

  if (differs(live.site, draft.site)) out.push('Edited the site settings');

  if (differs(live.desk.note, draft.desk.note)) out.push('Edited the sticky note');
  if (live.desk.hint !== draft.desk.hint || live.desk.hintMobile !== draft.desk.hintMobile) out.push('Edited the desk hint');

  if (differs(live.desk.order, draft.desk.order)) out.push('Changed the order of the desk');

  listChanges(live.works, draft.works, 'work', function (w) { return w.title; }, ['desk'], out);
  listChanges(live.films, draft.films, 'film', function (f) { return f.label || f.title; }, ['tape'], out);
  draft.works.forEach(function (w) {
    var old = find(live.works, w.id);
    if (old && old.desk.show !== w.desk.show) out.push((w.desk.show ? 'Put ' : 'Took ') + '"' + w.title + '"' + (w.desk.show ? ' on the desk' : ' off the desk'));
  });
  draft.films.forEach(function (f) {
    var old = find(live.films, f.id);
    if (old && (old.tape.show !== f.tape.show || old.tape.label !== f.tape.label)) out.push('Changed the tape for "' + (f.label || f.title) + '"');
  });

  if (differs(live.about, draft.about)) out.push('Edited the About page');
  /* Removals come first, so they are never the ones hidden behind "and N more". */
  return out.filter(isRemoval).concat(out.filter(function (c) { return !isRemoval(c); }));
}

export function isRemoval(change) { return change.indexOf('Removed ') === 0; }

function find(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }

function listChanges(oldList, newList, noun, name, ignore, out) {
  newList.forEach(function (item) {
    var old = find(oldList, item.id);
    if (!old) { out.push('Added ' + noun + ' "' + name(item) + '"'); return; }
    var a = JSON.parse(JSON.stringify(old)), b = JSON.parse(JSON.stringify(item));
    ignore.forEach(function (k) { delete a[k]; delete b[k]; });
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push('Edited ' + noun + ' "' + name(item) + '"');
  });
  oldList.forEach(function (item) {
    if (!find(newList, item.id)) out.push('Removed ' + noun + ' "' + name(item) + '"');
  });
  var oldOrder = oldList.map(function (x) { return x.id; }).filter(function (id) { return find(newList, id); });
  var newOrder = newList.map(function (x) { return x.id; }).filter(function (id) { return find(oldList, id); });
  if (JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) out.push('Changed the order of the ' + noun + 's');
}

/* ---------- Publish ---------- */

/* Checks the draft. Returns { errors, warnings } from js/schema.js. */
export function check(draft) { return validate(normalize(draft)); }

/* Saves the draft to main as one commit. progress(step) is called with
   'checking' | 'building' | 'saving' | 'saved'. Returns { commit, build, content }.
   expectedBase: the main commit the draft started from. If main moved since then, throws
   { moved: true, head } before saving anything, so the draft can catch up first (store.catchUp). */
export async function publish(gh, draftRaw, media, expectedBase, message, progress) {
  var content = normalize(draftRaw);
  var result = validate(content);
  if (result.errors.length) throw Object.assign(new Error('invalid'), { invalid: result.errors });

  for (var attempt = 0; attempt < 2; attempt++) {
    progress('checking');
    var ref = await gh.getRef(REPO.main);
    var head = ref.object.sha;
    if (expectedBase && head !== expectedBase && attempt === 0) throw Object.assign(new Error('moved'), { moved: true, head: head });
    var headCommit = await gh.getCommit(head);
    var tree = await gh.getTree(headCommit.tree.sha, true);
    var existing = {};
    tree.tree.forEach(function (e) { if (e.type === 'blob') existing[e.path] = true; });

    progress('building');
    var build = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    var entries = [
      { path: PATHS.content, mode: '100644', type: 'blob', content: JSON.stringify(content, null, 2) + '\n' },
      { path: PATHS.index, mode: '100644', type: 'blob', content: renderSite(content, { build: build }) }
    ];
    var share = renderSharePages(content);
    var keep = {};
    share.forEach(function (p) {
      keep[p.path] = true;
      entries.push({ path: p.path, mode: '100644', type: 'blob', content: p.html });
    });
    Object.keys(existing).forEach(function (path) {
      if (/^[wf]\/[^/]+\/index\.html$/.test(path) && !keep[path]) entries.push({ path: path, mode: '100644', type: 'blob', sha: null });
    });
    if (existing[PATHS.draft]) entries.push({ path: PATHS.draft, mode: '100644', type: 'blob', sha: null });
    usedMedia(content).forEach(function (path) {
      if (!existing[path] && media[path]) entries.push({ path: path, mode: '100644', type: 'blob', sha: media[path] });
    });

    progress('saving');
    var newTree = await gh.createTree(headCommit.tree.sha, entries);
    var commit = await gh.createCommit(message, newTree.sha, [head]);
    try {
      await gh.updateRef(REPO.main, commit.sha, false);
    } catch (e) {
      if ((e.status === 409 || e.status === 422) && attempt === 0) continue;
      throw e;
    }
    progress('saved');
    return { commit: commit.sha, build: build, content: content };
  }
  throw Object.assign(new Error('conflict'), { status: 409 });
}

/* Every uploaded file the content points at: a work's picture and a demo's logo. A file left out
   here is not committed, and the page would point at nothing. */
export function usedMedia(content) {
  var list = [];
  content.works.forEach(function (w) {
    if (w.media && w.media.src) list.push(w.media.src);
    if (w.replica && w.replica.logo && w.replica.logo.src) list.push(w.replica.logo.src);
  });
  return list;
}

export function commitMessage(changes) {
  if (!changes.length) return 'Published from the admin';
  return changes.slice(0, 6).join('; ') + (changes.length > 6 ? '; and ' + (changes.length - 6) + ' more' : '');
}

/* ---------- Watching the live site ---------- */

/* Every push to main runs the Deploy check (.github/workflows/deploy.yml): tests first, then
   GitHub Pages. Its result is public, so it is read without a key (60 requests per hour per IP). */
var RUNS_API = 'https://api.github.com/repos/' + REPO.owner + '/' + REPO.name + '/actions/runs';
var DEPLOY_WORKFLOW = '.github/workflows/deploy.yml';

/* Poll timings in ms. Exported so the tests can shorten them. */
export var WATCH = { first: 4000, fast: 5000, slow: 10000, fastFor: 60000, statusEvery: 15000, limit: 10 * 60 * 1000 };

/* The Deploy check for one commit: { state, url }. state is 'pending' (not started or still
   running), 'passed', 'failed', 'cancelled' (a newer publish took its place) or 'unknown'. */
export async function deployStatus(commit) {
  try {
    var res = await fetch(RUNS_API + '?head_sha=' + encodeURIComponent(commit) + '&event=push&per_page=20', {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store'
    });
    if (!res.ok) {
      console.info('[admin publish] check status unavailable', { commit: commit, status: res.status });
      return { state: 'unknown', url: '' };
    }
    var data = await res.json();
    var run = (data.workflow_runs || []).filter(function (r) { return String(r.path || '').split('@')[0] === DEPLOY_WORKFLOW; })[0];
    if (!run) return { state: 'pending', url: '' };
    var url = String(run.html_url || '');
    if (run.status !== 'completed') return { state: 'pending', url: url };
    if (run.conclusion === 'success') return { state: 'passed', url: url };
    if (run.conclusion === 'cancelled' || run.conclusion === 'skipped') return { state: 'cancelled', url: url };
    return { state: 'failed', url: url };
  } catch (e) {
    console.info('[admin publish] check status unreachable', { commit: commit, error: String(e && e.message) });
    return { state: 'unknown', url: '' };
  }
}

/* Watches until the live index.html carries this build id, and the Deploy check for the commit
   alongside it. Resolves { result, url }: 'live', 'blocked' (the check failed, the live site is
   unchanged), 'replaced' (a newer publish went out instead) or 'slow' (the time limit passed). */
export function waitForLive(build, commit, onTick, limitMs) {
  var started = Date.now();
  var lastStatus = started;
  limitMs = limitMs || WATCH.limit;
  return new Promise(function (resolve) {
    function done(result, url) {
      console.info('[admin publish] watch finished', { build: build, commit: commit, result: result, ms: Date.now() - started });
      resolve({ result: result, url: url || '' });
    }
    async function poll() {
      try {
        var res = await fetch(SITE_ROOT + 'index.html?live=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          var text = await res.text();
          var m = text.match(/<meta name="build" content="([^"]+)">/);
          if (m && m[1] === build) { done('live'); return; }
        }
      } catch (e) { /* offline for a moment: keep trying */ }
      var elapsed = Date.now() - started;
      if (commit && Date.now() - lastStatus >= WATCH.statusEvery) {
        lastStatus = Date.now();
        var status = await deployStatus(commit);
        console.info('[admin publish] check status', { commit: commit, state: status.state, ms: elapsed });
        if (status.state === 'failed') { done('blocked', status.url); return; }
        if (status.state === 'cancelled') { done('replaced', status.url); return; }
      }
      if (onTick) onTick(elapsed);
      if (elapsed > limitMs) { done('slow'); return; }
      setTimeout(poll, elapsed < WATCH.fastFor ? WATCH.fast : WATCH.slow);
    }
    console.info('[admin publish] watching', { build: build, commit: commit });
    setTimeout(poll, WATCH.first);
  });
}

/* ---------- History ---------- */

/* Past publishes, newest first: [{ sha, message, date }]. */
export async function history(gh) {
  var commits = await gh.listCommits(PATHS.content, REPO.main, 40);
  return commits.map(function (c) {
    return { sha: c.sha, message: c.commit.message.split('\n')[0], date: c.commit.committer.date };
  });
}

export async function contentAt(gh, sha) {
  var text = await gh.getText(PATHS.content, sha);
  return text ? normalize(JSON.parse(text)) : null;
}
