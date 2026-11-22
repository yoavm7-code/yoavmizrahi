// Regenerates index.html and the share pages (w/, f/) from content/site.json.
// The admin does the same thing in the browser when you publish. Run this only after changing
// js/render.js or editing content/site.json by hand:  node tools/generate.mjs
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, validate } from '../js/schema.js';
import { renderSite, renderSharePages } from '../js/render.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const raw = JSON.parse(await readFile(join(root, 'content/site.json'), 'utf8'));
const content = normalize(raw);
const { errors, warnings } = validate(content);

warnings.forEach((w) => console.log('  note   ' + w.msg));
if (errors.length) {
  errors.forEach((e) => console.error('  error  ' + e.msg));
  console.error('\nNothing written: fix the errors above first.');
  process.exit(1);
}

const build = 'local-' + Date.now().toString(36);
await writeFile(join(root, 'index.html'), renderSite(content, { build }));

await rm(join(root, 'w'), { recursive: true, force: true });
await rm(join(root, 'f'), { recursive: true, force: true });
for (const page of renderSharePages(content)) {
  const file = join(root, page.path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page.html);
}

console.log('\nWrote index.html and ' + renderSharePages(content).length + ' share pages (build ' + build + ').');
