// The replicas in demos/ are public, so they must never carry real names, partners, domains or figures
// from the products they copy. This test lists those terms only as hashes (first 16 hex characters of
// SHA-256), so the real values never enter the repo either. It reads every text file in demos/, splits
// it into lowercase words, and fails if any word or pair of words matches a hash.
// To add a term: normalize it (lowercase, anything but a-z and 0-9 becomes one space, trimmed), hash
// it, and add the first 16 hex characters below. Never write the term itself into the repo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMOS = fileURLToPath(new URL('../../demos/', import.meta.url));
const TEXT = ['.html', '.css', '.js', '.json', '.txt', '.md', '.svg'];

const BANNED = new Set([
  'f6bb95882f20b1b4', '8207918b59ab02ed', 'bd5a21bfec51e478', '62efa85190f4b27a', 'f1935ae1bb847446', 'd4666ec98b85e01d',
  '0354a4724cf818c4', '4a9eb1b90c28e4ac', '3d06df9ebf81fb29', '727b2e71f0005236', 'fa9317b3c1b6c10e', 'e46cfd30809b53ae',
  '5c5e5659bc73422c', '3115bdcee0208b9c', '23d9270bc19ce13c', '67e871a75299154c', 'a95db5b0ac159e43', 'bee474256534a6ca',
  '2fb2b716aa124c42', '658e92f4f47fa18c', '248c3d7c2547581b', '4cd4b42ffc989751', '514ae13cd8cfb5bf', 'c8800e9f89cafbb5',
  'a0a0744da9bc6edb', '8b8a46881470c41d', 'b49dcfcefda6ef18', 'accdac1d24bf71be', '6942363884789100', 'd4530d4b0c79498c',
  'f3b76812f443539e', 'c0b48ffb5613f5ce', '716d53a45744608e', '2e13608f1d3676f7', '5145213af65934c9', '4c7a44beb8f38580',
  '00cfad8f69d0e970', '10973be83a0f680f', '18c6b6f840407250', 'd70731bc81fa0b06', '47c027fea18f72ba', '885f8c2b4df7f9f7',
  '8a2ce3d29ea75e65', '213f6505c6c2a611', '299ae77a4ef350ae', '162e3973ecf8a776', '43a70ba6b21894cd'
]);

function digest(text) { return createHash('sha256').update(text).digest('hex').slice(0, 16); }

async function textFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await textFiles(path));
    else if (TEXT.includes(extname(entry.name))) out.push(path);
  }
  return out;
}

function hits(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
  const found = [];
  words.forEach((w, i) => {
    if (BANNED.has(digest(w))) found.push(w);
    if (i && BANNED.has(digest(words[i - 1] + ' ' + w))) found.push(words[i - 1] + ' ' + w);
  });
  return found;
}

test('the checker catches a banned term (self-check with a hash made here)', () => {
  BANNED.add(digest('zz canary'));
  assert.deepEqual(hits('Hello ZZ-Canary world'), ['zz canary']);
  BANNED.delete(digest('zz canary'));
});

test('no replica file carries a real name, partner, domain or figure', async () => {
  const files = await textFiles(DEMOS);
  assert.ok(files.length >= 5, 'expected the replica files in demos/');
  for (const file of files) {
    const found = hits(await readFile(file, 'utf8'));
    assert.deepEqual(found, [], relative(DEMOS, file) + ' contains a banned term');
  }
});
