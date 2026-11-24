/* Rescue: undoes the last publish without needing the admin. Self-contained on purpose:
   no imports, so a broken admin file cannot break this page.
   Two ways in: sign in through the login server, or (if that is down) paste a GitHub key and
   talk to GitHub directly. */
(function () {
  'use strict';

  if (window.top !== window.self) { document.documentElement.textContent = ''; return; }

  var OWNER = 'yoavm7-code';
  var REPO = 'yoavmizrahi';
  var BRANCH = 'main';
  var LOGIN_API = 'https://ym-admin-login.yoavm7.workers.dev';
  var PATH = '/repos/' + OWNER + '/' + REPO;

  var $ = function (id) { return document.getElementById(id); };
  var status = $('status');
  var list = $('list');
  var actions = $('actions');
  var undoBtn = $('undo');
  var mode = 'login';
  var session = null;
  var head = null;

  try { session = sessionStorage.getItem('ym-admin-session') || localStorage.getItem('ym-admin-session'); } catch (e) { /* ignore */ }
  try { $('username').value = localStorage.getItem('ym-admin-user') || ''; } catch (e) { /* ignore */ }

  function say(text, bad) { status.textContent = text; status.className = 'status' + (bad ? ' is-bad' : ''); }

  function setMode(m) {
    mode = m;
    $('tab-login').setAttribute('aria-selected', String(m === 'login'));
    $('tab-key').setAttribute('aria-selected', String(m === 'key'));
    $('login-box').hidden = m !== 'login';
    $('key-box').hidden = m !== 'key';
    list.hidden = true;
    actions.hidden = true;
    say('');
  }
  $('tab-login').addEventListener('click', function () { setMode('login'); });
  $('tab-key').addEventListener('click', function () { setMode('key'); });

  async function api(method, path, body) {
    var url = mode === 'login' ? LOGIN_API + '/gh' + PATH + path : 'https://api.github.com' + PATH + path;
    var token = mode === 'login' ? session : $('key').value.trim();
    var res;
    try {
      res = await fetch(url, {
        method: method,
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new Error(mode === 'login' ? "Can't reach the sign-in service. Try \"Use a GitHub key\" above." : "Can't reach GitHub. Check your internet connection.", { cause: e });
    }
    var data = await res.json().catch(function () { return {}; });
    if (mode === 'login' && res.status === 401) { session = null; throw new Error('Please sign in again.'); }
    if (mode === 'login' && data.error === 'refused') throw new Error('Blocked for safety: ' + data.message + ' If the last change was to the site\'s code, use "Use a GitHub key" instead.');
    if (mode === 'login' && data.error === 'github_key') throw new Error('The GitHub key on the sign-in service stopped working. Use "Use a GitHub key" above.');
    if (res.status === 401) throw new Error('This key is not valid or has expired.');
    if (res.status === 403 || res.status === 404) throw new Error('This key cannot change the ' + REPO + ' repository.');
    if (!res.ok) throw new Error('GitHub said no (error ' + res.status + '). Try again in a minute.');
    return data;
  }

  async function signIn() {
    var res;
    try {
      res = await fetch(LOGIN_API + '/login', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: $('username').value.trim(), password: $('password').value, remember: false, trusted: localStorage.getItem('ym-admin-trusted') || '' })
      });
    } catch (e) { throw new Error("Can't reach the sign-in service. Try \"Use a GitHub key\" above.", { cause: e }); }
    var data = await res.json().catch(function () { return {}; });
    if (data.error === 'wrong') throw new Error('That username or password is not right.');
    if (data.error === 'wait') throw new Error('Too many tries. Wait a few minutes and try again.');
    if (!res.ok || !data.token) throw new Error('Signing in did not work (' + (data.error || res.status) + ').');
    session = data.token;
  }

  function when(d) {
    return new Date(d).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  async function load(e) {
    if (e) e.preventDefault();
    try {
      if (mode === 'login') {
        if (!session || e) {
          if (!$('password').value) { say('Enter your username and password.', true); return; }
          say('Signing in…');
          await signIn();
        }
      } else if (!$('key').value.trim()) { say('Paste your key first.', true); $('key').focus(); return; }
      say('Loading…');
      var commits = await api('GET', '/commits?sha=' + BRANCH + '&path=content%2Fsite.json&per_page=6');
      var ref = await api('GET', '/git/ref/heads/' + BRANCH);
      list.textContent = '';
      commits.forEach(function (c, i) {
        var li = document.createElement('li');
        var strong = document.createElement('strong');
        strong.textContent = when(c.commit.committer.date) + (i === 0 && c.sha === ref.object.sha ? '  (live now)' : '');
        var span = document.createElement('span');
        span.textContent = c.commit.message.split('\n')[0];
        li.appendChild(strong);
        li.appendChild(span);
        list.appendChild(li);
      });
      head = await api('GET', '/git/commits/' + ref.object.sha);
      head.sha = ref.object.sha;
      list.hidden = false;
      actions.hidden = !head.parents.length;
      var latest = commits[0] && commits[0].sha === head.sha;
      say(!head.parents.length ? 'There is nothing earlier to go back to.'
        : latest ? 'The top one is live now. Undo puts the site back to the one below it.'
        : 'The most recent change to the site was not a publish ("' + head.message.split('\n')[0] + '"). Undo reverses that change.');
    } catch (err) { say(err.message, true); }
  }

  async function undo() {
    if (!head) return;
    if (!window.confirm('Put the site back to how it was before "' + head.message.split('\n')[0] + '"?')) return;
    undoBtn.disabled = true;
    say('Undoing…');
    try {
      var ref = await api('GET', '/git/ref/heads/' + BRANCH);
      if (ref.object.sha !== head.sha) { say('Something new was published a moment ago. Load the list again first.', true); undoBtn.disabled = false; return; }
      var parent = await api('GET', '/git/commits/' + head.parents[0].sha);
      var created = await api('POST', '/git/commits', {
        message: 'Undo: ' + head.message.split('\n')[0],
        tree: parent.tree.sha,
        parents: [head.sha]
      });
      await api('PATCH', '/git/refs/heads/' + BRANCH, { sha: created.sha, force: false });
      say('Done. The site goes back in about a minute. Nothing was deleted: the undone version is still in the history.');
      actions.hidden = true;
      head = null;
      setTimeout(load, 1500);
    } catch (err) {
      undoBtn.disabled = false;
      say(err.message, true);
    }
  }

  $('login-box').addEventListener('submit', load);
  $('key-box').addEventListener('submit', load);
  undoBtn.addEventListener('click', undo);
  if (session) load();
})();
