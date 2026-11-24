// node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, checkBody, checkCompare, isCanonical, CONTENT_PATH } from '../src/rules.js';
import { hashPassword, checkPassword, signToken, verifyToken, encryptText, decryptText, b64url, randomBytes } from '../src/crypto.js';

const BASE = '/repos/yoavm7-code/yoavmizrahi';
const SHA = 'a'.repeat(40);
const SHA2 = 'b'.repeat(40);

test('allows every request the admin and rescue page make', () => {
  const ok = [
    ['GET', BASE, ''],
    ['GET', BASE + '/git/ref/heads/main', ''],
    ['GET', BASE + '/git/ref/heads/drafts', ''],
    ['POST', BASE + '/git/refs', ''],
    ['PATCH', BASE + '/git/refs/heads/main', ''],
    ['PATCH', BASE + '/git/refs/heads/drafts', ''],
    ['GET', BASE + '/git/commits/' + SHA, ''],
    ['POST', BASE + '/git/commits', ''],
    ['GET', BASE + '/git/trees/' + SHA, '?recursive=1'],
    ['GET', BASE + '/git/trees/' + SHA, ''],
    ['POST', BASE + '/git/trees', ''],
    ['POST', BASE + '/git/blobs', ''],
    ['GET', BASE + '/git/blobs/' + SHA, ''],
    ['GET', BASE + '/contents/content/site.json', '?ref=main'],
    ['GET', BASE + '/contents/content/draft.json', '?ref=' + SHA],
    ['GET', BASE + '/commits', '?sha=main&path=content%2Fsite.json&per_page=40'],
    ['GET', BASE + '/commits', '?sha=main&path=content/site.json&per_page=6']
  ];
  for (const [m, p, q] of ok) assert.ok(matchRoute(m, p, q, BASE), m + ' ' + p + q);
});

test('refuses everything else', () => {
  const bad = [
    ['DELETE', BASE, ''],
    ['PATCH', BASE, ''],
    ['GET', '/user', ''],
    ['GET', '/repos/yoavm7-code/other', ''],
    ['GET', '/repos/yoavm7-code/yoavmizrahi-evil', ''],
    ['PATCH', BASE + '/git/refs/heads/gh-pages', ''],
    ['PATCH', BASE + '/git/refs/tags/v1', ''],
    ['GET', BASE + '/git/ref/heads/main/../../x', ''],
    ['GET', BASE + '/contents/admin/app.js', '?ref=main'],
    ['GET', BASE + '/contents/content/site.json', '?ref=main&x=1'],
    ['GET', BASE + '/contents/content/site.json', '?ref=main&ref=drafts'],
    ['GET', BASE + '/contents/content%2Fsite.json', '?ref=main'],
    ['GET', BASE + '//git/blobs/' + SHA, ''],
    ['GET', BASE + '/git/blobs/' + SHA, '?x=1'],
    ['GET', BASE + '/commits', '?sha=other&path=content/site.json'],
    ['GET', BASE + '/commits', '?sha=main&path=admin/app.js'],
    ['PUT', BASE + '/contents/index.html', ''],
    ['POST', BASE + '/hooks', ''],
    ['POST', BASE + '/actions/workflows', ''],
    ['PATCH', BASE + '/git/refs/heads/main%2F..', '']
  ];
  for (const [m, p, q] of bad) assert.equal(matchRoute(m, p, q, BASE), null, m + ' ' + p + q);
});

test('canonical path check', () => {
  assert.ok(isCanonical('/repos/a/b/git/trees'));
  for (const p of ['/a/../b', '/a/./b', '/a//b', '/a%2Fb', '/a\\b', 'a/b', '/a/b/..', '/a b']) assert.equal(isCanonical(p), false, p);
});

test('content paths', () => {
  for (const p of ['content/site.json', 'content/draft.json', 'index.html', 'w/ad-radar/index.html', 'f/leviathan-1/index.html', 'media/5009f60d450de350.webp', 'media/abc.mp4']) assert.ok(CONTENT_PATH.test(p), p);
  for (const p of ['admin/app.js', 'js/main.js', 'css/style.css', '.github/workflows/x.yml', 'CNAME', 'content/../admin/app.js', 'w/../admin/index.html', 'media/x.html', 'media/x.svg', 'w/a/b/index.html', 'index.html/x', 'Index.html', '.nojekyll', 'tools/generate.mjs', 'worker/src/index.js']) assert.equal(CONTENT_PATH.test(p), false, p);
});

test('tree bodies: content only, plain files, built on the live tree', () => {
  const entry = (path, extra) => Object.assign({ path, mode: '100644', type: 'blob', content: 'x' }, extra);
  assert.equal(checkBody('createTree', { base_tree: SHA, tree: [entry('index.html'), entry('content/site.json'), { path: 'w/old/index.html', mode: '100644', type: 'blob', sha: null }, { path: 'media/a.webp', mode: '100644', type: 'blob', sha: SHA2 }] }), '');
  assert.notEqual(checkBody('createTree', { tree: [entry('index.html')] }), '', 'needs base_tree');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [entry('admin/app.js')] }), '');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [entry('index.html', { mode: '100755' })] }), '');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [entry('index.html', { mode: '120000' })] }), '');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [entry('w', { type: 'tree', mode: '040000' })] }), '');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [entry('index.html', { sha: SHA2 })] }), '', 'content and sha together');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [] }), '');
  assert.notEqual(checkBody('createTree', { base_tree: SHA, tree: [entry('index.html')], extra: 1 }), '');
});

test('refs and commits', () => {
  assert.equal(checkBody('createRef', { ref: 'refs/heads/drafts', sha: SHA }), '');
  assert.notEqual(checkBody('createRef', { ref: 'refs/heads/main', sha: SHA }), '');
  assert.notEqual(checkBody('createRef', { ref: 'refs/tags/x', sha: SHA }), '');
  assert.equal(checkBody('updateRef', { sha: SHA, force: false }), '');
  assert.notEqual(checkBody('updateRef', { sha: 'nope' }), '');
  assert.equal(checkBody('createCommit', { message: 'm', tree: SHA, parents: [SHA2] }), '');
  assert.notEqual(checkBody('createCommit', { message: 'm', tree: SHA, parents: [] }), '');
  assert.notEqual(checkBody('createCommit', { message: 'm', tree: SHA, parents: [SHA, SHA2] }), '');
  assert.notEqual(checkBody('createCommit', { message: 'm', tree: SHA, parents: [SHA2], author: { name: 'x' } }), '');
});

test('publishing must be one forward commit touching only content', () => {
  const ok = { status: 'ahead', ahead_by: 1, behind_by: 0, files: [{ filename: 'index.html' }, { filename: 'content/site.json' }, { filename: 'w/x/index.html', status: 'removed' }] };
  assert.equal(checkCompare(ok), '');
  assert.notEqual(checkCompare(Object.assign({}, ok, { files: [{ filename: 'admin/app.js' }] })), '');
  assert.notEqual(checkCompare(Object.assign({}, ok, { files: [{ filename: 'index.html', previous_filename: 'admin/x.js' }] })), '');
  assert.notEqual(checkCompare(Object.assign({}, ok, { status: 'diverged' })), '');
  assert.notEqual(checkCompare(Object.assign({}, ok, { ahead_by: 2 })), '');
  assert.notEqual(checkCompare(Object.assign({}, ok, { behind_by: 1 })), '');
  assert.notEqual(checkCompare(Object.assign({}, ok, { files: new Array(300).fill({ filename: 'index.html' }) })), '');
});

test('passwords: right one passes, wrong one and wrong pepper fail', async () => {
  const stored = await hashPassword('correct horse battery', 'pepper-1', 1000);
  assert.ok(await checkPassword('correct horse battery', 'pepper-1', stored));
  assert.equal(await checkPassword('correct horse batterY', 'pepper-1', stored), false);
  assert.equal(await checkPassword('correct horse battery', 'pepper-2', stored), false);
  assert.equal(await checkPassword('x', 'pepper-1', 'garbage'), false);
  assert.notEqual(stored, await hashPassword('correct horse battery', 'pepper-1', 1000), 'salted');
});

test('tokens: tamper, wrong type, wrong secret and expiry are rejected', async () => {
  const now = Date.now();
  const t = await signToken('s1', { typ: 'session', aud: 'ym-admin', sub: 'yoav', ver: 1, exp: now + 1000 });
  assert.equal((await verifyToken('s1', t, 'session')).sub, 'yoav');
  assert.equal(await verifyToken('s2', t, 'session'), null);
  assert.equal(await verifyToken('s1', t, 'trusted'), null);
  assert.equal(await verifyToken('s1', t, 'session', now + 2000), null);
  const [body, sig] = t.split('.');
  const forged = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'session', aud: 'ym-admin', sub: 'yoav', ver: 99, exp: now + 1e9 })));
  assert.equal(await verifyToken('s1', forged + '.' + sig, 'session'), null);
  assert.equal(await verifyToken('s1', body + '.' + sig.slice(0, -2) + 'AA', 'session'), null);
  assert.equal(await verifyToken('s1', 'x', 'session'), null);
  const noAud = await signToken('s1', { typ: 'session', sub: 'yoav', ver: 1, exp: now + 1000 });
  assert.equal(await verifyToken('s1', noAud, 'session'), null);
});

test('GitHub key encryption round trip, and a wrong key cannot read it', async () => {
  const k1 = b64url(randomBytes(32));
  const k2 = b64url(randomBytes(32));
  const sealed = await encryptText(k1, 'github_pat_secret');
  assert.equal(await decryptText(k1, sealed), 'github_pat_secret');
  assert.ok(!sealed.includes('secret'));
  await assert.rejects(decryptText(k2, sealed));
});
