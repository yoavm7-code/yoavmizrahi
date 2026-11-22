/* Where the admin saves. The site is published from MAIN; unpublished drafts live on DRAFTS. */

export var REPO = {
  owner: 'yoavm7-code',
  name: 'yoavmizrahi',
  main: 'main',
  drafts: 'drafts'
};

export var PATHS = {
  content: 'content/site.json',
  draft: 'content/draft.json',
  index: 'index.html'
};

/* Link that opens GitHub's "new key" form already filled in. The one thing GitHub cannot pre-fill
   is the repository choice, which the setup screen walks through. */
export var NEW_KEY_URL = 'https://github.com/settings/personal-access-tokens/new' +
  '?name=' + encodeURIComponent('Portfolio admin') +
  '&description=' + encodeURIComponent('Lets the admin page of my portfolio save and publish changes.') +
  '&target_name=' + encodeURIComponent(REPO.owner) +
  '&expires_in=366' +
  '&contents=write';

export var LIMITS = {
  imageEdge: 2400,
  imageQuality: 0.86,
  videoBytes: 25 * 1024 * 1024,
  fileBytes: 40 * 1024 * 1024
};

/* The live site, relative to this admin page. */
export var SITE_ROOT = new URL('../', location.href).href;

/* The login server (worker/). When set, the admin signs in with a username and password and the
   GitHub key stays on the server. Empty = the older mode where each device pastes a GitHub key.
   On this computer (localhost) a test server can be set in localStorage "ym-admin-login-api". */
var LIVE_LOGIN_API = 'https://ym-admin-login.yoavm7.workers.dev';
var localTest = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? localStorage.getItem('ym-admin-login-api') : null;
export var LOGIN_API = localTest !== null ? localTest : LIVE_LOGIN_API;
