// Makes the smaller WebP copies of each desktop replica's poster (sizes in POSTER_WIDTHS, js/schema.js),
// so the desk and the work cards don't download a 1440 px screenshot for a 400 px slot.
//   cd tests && npm run posters          (needs ffmpeg on the PATH)
// record-demos.mjs runs this too, right after it writes a new poster. Commit the .webp files.
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMOS, posterSizes } from '../js/schema.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function log(msg, values) { console.log('[posters] ' + msg, values ? JSON.stringify(values) : ''); }

/* Writes every smaller copy for the replica in demos/<name>/. */
export function makePosterSizes(name) {
  const replica = Object.values(DEMOS).map((d) => d.replica).find((r) => r && r.src === 'demos/' + name + '/');
  for (const size of posterSizes(replica)) {
    const out = join(ROOT, size.src);
    const ff = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, replica.poster), '-vf', 'scale=' + size.width + ':-2',
      '-c:v', 'libwebp', '-quality', '80', '-compression_level', '6', out], { stdio: 'inherit' });
    if (ff.status !== 0) throw new Error('ffmpeg failed for ' + out);
    log('written', { path: size.src, bytes: statSync(out).size });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const d of Object.values(DEMOS)) if (d.replica) makePosterSizes(d.replica.src.split('/')[1]);
}
