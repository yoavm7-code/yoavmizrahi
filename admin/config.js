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
