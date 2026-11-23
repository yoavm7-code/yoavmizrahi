// The replicas in demos/ are public, so they must never carry real names, partners, domains or figures
// from the products they copy. This test lists those terms only as hashes (first 16 hex characters of
// SHA-256), so the real values never enter the repo either. It reads every text file in demos/, splits
// it into lowercase words (any script, so Hebrew names count too), and fails if any word or pair of
// words matches a hash.
// To add a term: normalize it (NFC, lowercase, anything but letters and digits becomes one space,
// trimmed), hash it, and add the first 16 hex characters below. Never write the term itself into the repo.
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
  '8a2ce3d29ea75e65', '213f6505c6c2a611', '299ae77a4ef350ae', '162e3973ecf8a776', '43a70ba6b21894cd',
  // Terms that give away how the real tool works (its business model, internal pages, partner fields
  // and ad network mix), even though they are not names. Removed 2026-11-23, see _plans/.
  '401f8cb366ef4de6', 'f020ead6e950fdb6', 'c1bf0c9314b15d33', '9fb23fa85d269a8e', '04af46a1e0b08994', '3860edac0ccb7475',
  'ae91ac8d24ba0c9f', '71dd76e4bc275d3e', '033a1236a77e9cef', '784c9715cab9dad0', '25b220238ec7eed9', '6ee77a60b623a6cc',
  '5fc745a4c505583f', '08d0398647a13b8f',
  // Toto Mundial: real players' names and distinctive point and pot figures from the tour.
  '00260e9b05ddcbe7', '1de1f84a98acf0fd', '40587f346de6362f', '36505755eb34f660', 'faf4e1efa54ef4a5', 'd576b445708ef98e',
  'd4ef93ae2b538012', '346cd2b49312f2f7', '02742e4df5e75dd5', 'b2068ae753f72424', '3bcd8ed3670d2539', '4d5d0ac3dbeb8ae0',
  'd8d0dedb4bda4204', '3b731d7620bf723f', 'a823bd31ca4166b2', '42d9972e972e4095', '3ea77fc339263dd3', 'ee14860f6bd0506d',
  'b24dd49aca341e93', '3644cb1007be9e1b', 'c9666ca719574009', '57c03210be824f7a',
  // Memesh: real customers' and staff names, phones, email names and ticket numbers from the tour.
  'ae3eabbe0cd500ff', 'c0588ea74fbbe043', '560bd0366ea9f30d', 'a20e3dc4b09146f8', 'c63ae47c59484eaa', 'da60d78ee3eb530e',
  'c3d1d49c5b326f01', 'cb08ccc084dc70c9', '7f636d143d2c409d', '58784e4ca300b052', '6a3b6e433a7ea523', 'c635386162cfa210',
  'd975f3bec644e39d', '4f4666f40ffae0d5', 'e894ea465c5a5af1', '8df935aa5ef73e38', '130f10251eb60780', 'fbb962490f4f2486',
  '8cb7f4cf4c886465', 'a7b4c1c3be1c6839', '6190f9e5dbb661b1', 'd09d88db9bb2d153', '6de2b98ab8d774a9', 'fd1564744f162e9d',
  '96e7df83445279bf', '0503fe01bea645ab', '4cf30b6b63ed4d77', '3ae59459d65d9041', '403ee14e6183a23a', 'f7ef685a8400c9bd',
  '01994822efdc77f1', '9ca289c839df6a22', 'c6b4663930d7bac5', '45b7db0463b03067', '44b1fbd6ac3aacde', '32012b6cb3f894b0',
  '48640d0e33197fb8', 'da3be600ed1e2cf2', 'd248189597520193', '3e8923f0ddba6d91', 'd2daff53c4b86a16', '339f7ebc54a213a6',
  '4c783e83f1f569a2', '126b6d7404f541d5', '43469f52359412cb', '61d1f185e3dc6d40', '22054ead3f1d5d2a', '909c5ac142c2dbd1',
  '738e37b42cf1416c', '4fd6206bf27186a4', 'df8d8ef96bb60d92', '42fb95f7d87e8d7a', '467ddf673df6ad99', '181a68011b543c28',
  '3cfc7352d36e2dee', '0eb4d3f2e82ffa0d', '5d037d214008d1d7', 'eb342817dca5fbb0', '9e53aed9fab7a012', '92d7243b217bb578',
  '201917f0174bb711', '1bfe65d00f469f59', '75b96d6761d45a9c', 'b62f519507624b6c', '7cad3dbe9b18ebc6', '479cdb5974e303e7',
  '2da55b46972224ee', '676754736988d613', 'd8e04b3dc957bb89', '00e6c637eaf06318', 'b581e323b55c7511', 'dccce57ffe89f9df',
  'ad3e3ad89cb9fb68',
  // Ad Intel: competitor domains, feeds and people seen in the tour screenshots.
  'cd0a2d0410684fff', '6911dd30c7f024f6', 'af660499ce1ff96b', '1c765f3e38532924', '2ee08536b85a6c6a', '9e715fd19df28502',
  '9265963c31d63f95', '06b5cd9f5e996447', 'ce82f0acff704e9e', '7a1683026baa3cfe', 'c852e3afac84e238', '2a9fe94ab5a02d88',
  '1c0a0c0e121f6878', '361a7074f81f6a27', '772782bd1f0b8065', '865f7480e0a85b87', 'f8c1370c1d3f4472', '8137bd57187df05f',
  'ba915572dace6f7b', '3934dee39123556c', 'b54d1205566f5401', '6f8323bca42cd36d', 'b9c6593724f729bd', '97738840a6457a19',
  'b20b99bf7f9a0ec6', '948a6b3ebc5ff617', '021d58517a9e0dbd', 'bc9aa9086a42da7e', '8d67707a27e0e5fa', '70bf840f41eda439',
  '6d53d9859ae895b9', 'af4a4c227d23af66', '0354a4724cf818c4', '62efa85190f4b27a', '1fbafc924f128811', '157ccb821aacbb85',
  '555861a0ef772f98', 'a4d07a7d157329fe', '81a94120743fe0cd', 'e79b7e757db2b1d5'
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
  const words = text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ');
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

test('the checker reads Hebrew too', () => {
  BANNED.add(digest('קנרית בדיקה'));
  assert.deepEqual(hits('שלום, קנרית-בדיקה!'), ['קנרית בדיקה']);
  BANNED.delete(digest('קנרית בדיקה'));
});

test('no replica file carries a real name, partner, domain or figure', async () => {
  const files = await textFiles(DEMOS);
  assert.ok(files.length >= 5, 'expected the replica files in demos/');
  for (const file of files) {
    const found = hits(await readFile(file, 'utf8'));
    assert.deepEqual(found, [], relative(DEMOS, file) + ' contains a banned term');
  }
});
