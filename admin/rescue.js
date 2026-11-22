/* Rescue: undoes the last publish without needing the admin. Self-contained on purpose:
   no imports, so a broken admin file cannot break this page. */
(function () {
  'use strict';

  if (window.top !== window.self) { document.documentElement.textContent = ''; return; }

  var OWNER = 'yoavm7-code';
  var REPO = 'yoavmizrahi';
  var BRANCH = 'main';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO;

  var keyInput = document.getElementById('key');
  var status = document.getElementById('status');
  var list = document.getElementById('list');
  var actions = document.getElementById('actions');
  var undoBtn = document.getElementById('undo');
  var head = null;

  try { keyInput.value = sessionStorage.getItem('ym-admin-key') || localStorage.getItem('ym-admin-key') || ''; } catch (e) { /* ignore */ }

  function say(text, bad) { status.textContent = text; status.className = 'status' + (bad ? ' is-bad' : ''); }

  async function api(method, path, body) {
    var res;
    try {
      res = await fetch(API + path, {
        method: method,
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + keyInput.value.trim(),
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) { throw new Error("Can't reach GitHub. Check your internet connection."); }
    if (res.status === 401) throw new Error('This key is not valid or has expired.');
    if (res.status === 403 || res.status === 404) throw new Error('This key cannot change the ' + REPO + ' repository.');
    if (!res.ok) throw new Error('GitHub said no (error ' + res.status + '). Try again in a minute.');
    return res.json();
  }

  function when(d) {
    return new Date(d).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function load() {
    if (!keyInput.value.trim()) { say('Paste your key first.', true); keyInput.focus(); return; }
    say('Loading…');
    try {
      var commits = await api('GET', '/commits?sha=' + BRANCH + '&per_page=6');
      list.textContent = '';
      commits.forEach(function (c, i) {
        var li = document.createElement('li');
        var strong = document.createElement('strong');
        strong.textContent = when(c.commit.committer.date) + (i === 0 ? '  (live now)' : '');
        var span = document.createElement('span');
        span.textContent = c.commit.message.split('\n')[0];
        li.appendChild(strong);
        li.appendChild(span);
        list.appendChild(li);
      });
      head = commits[0];
      list.hidden = false;
      actions.hidden = commits.length < 2;
      say(commits.length < 2 ? 'There is nothing earlier to go back to.' : 'The top one is live now. Undo puts the site back to the one below it.');
    } catch (e) { say(e.message, true); }
  }

  async function undo() {
    if (!head) return;
    if (!window.confirm('Put the site back to how it was before "' + head.commit.message.split('\n')[0] + '"?')) return;
    undoBtn.disabled = true;
    say('Undoing…');
    try {
      var ref = await api('GET', '/git/ref/heads/' + BRANCH);
      if (ref.object.sha !== head.sha) { say('Something new was published a moment ago. Load the list again first.', true); undoBtn.disabled = false; return; }
      var commit = await api('GET', '/git/commits/' + head.sha);
      var parent = await api('GET', '/git/commits/' + commit.parents[0].sha);
      var created = await api('POST', '/git/commits', {
        message: 'Undo: ' + head.commit.message.split('\n')[0],
        tree: parent.tree.sha,
        parents: [head.sha]
      });
      await api('PATCH', '/git/refs/heads/' + BRANCH, { sha: created.sha, force: false });
      say('Done. The site goes back in about a minute. Nothing was deleted: the undone version is still in the history.');
      actions.hidden = true;
      head = null;
      setTimeout(load, 1500);
    } catch (e) {
      undoBtn.disabled = false;
      say(e.message, true);
    }
  }

  document.getElementById('load').addEventListener('click', load);
  keyInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') load(); });
  undoBtn.addEventListener('click', undo);
})();
