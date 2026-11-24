// Copies the files the live site serves into _site/, leaving out everything that is only for
// development. The deploy workflow uploads _site/ to GitHub Pages; the browser tests serve it.
//   node tools/build-site.mjs [outDir]
import { cp, readdir, rm, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Top-level names that never go live. Anything else in the repo root is served. */
export const LEFT_OUT = [
  '.git', '.github', '.claude', '.gitignore', '.editorconfig', '.nvmrc', 'node_modules',
  '_plans', '_site', 'tests', 'tools', 'worker', 'CLAUDE.md', 'README.md', 'LICENSE'
];

/* Tours of the real products (specs and screenshots) hold real names and data. They are git-ignored,
   and left out here too, so a local build can never serve them either. */
const TOURS = /(-replica-spec\.md|-screenshots|-screenshots\.zip)$/;

export function leftOut(name) { return LEFT_OUT.includes(name) || TOURS.test(name); }

export async function buildSite(outDir) {
  const out = resolve(outDir || join(root, '_site'));
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const names = (await readdir(root)).filter((name) => !leftOut(name));
  for (const name of names) await cp(join(root, name), join(out, name), { recursive: true });
  return { out, names };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { out, names } = await buildSite(process.argv[2]);
  console.log('[build-site] wrote ' + out);
  console.log('[build-site] included: ' + names.sort().join(', '));
}
