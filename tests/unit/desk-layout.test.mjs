// Where everything sits on the desk (js/desk-layout.js). The guard: at any width and with any
// number of works, nothing overlaps and nothing leaves the desk.
import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../../js/desk-layout.js');
const L = globalThis.DeskLayout;

/* Object sizes as the site draws them. */
const SIZE = {
  note: [300, 250], device: [330, 400], phone: [260, 590], polaroid: [220, 280], screen: [420, 330],
  monitor: [560, 400], tape: [210, 124]
};
const STYLES = ['device', 'phone', 'polaroid', 'screen'];
const GAP = 40;

/* The desk as main.js builds it: the note, the film corner, then n works of mixed styles. */
function desk(n, tapes = 4, shape = 'beside') {
  const corner = L.filmCorner({ w: SIZE.monitor[0], h: SIZE.monitor[1] }, { w: SIZE.tape[0], h: SIZE.tape[1] }, tapes, 28, shape);
  const blocks = [{ key: 'note', w: SIZE.note[0], h: SIZE.note[1], r: L.tilt('note') }, { key: 'monitor', w: corner.w, h: corner.h, r: 0 }];
  for (let i = 0; i < n; i++) {
    const style = STYLES[i % STYLES.length];
    const key = 'work:w' + i;
    blocks.push({ key, w: SIZE[style][0], h: SIZE[style][1], r: L.tilt(key) });
  }
  return blocks;
}

/* The tilted outline of each placed block. */
function outlines(blocks, pos) {
  return blocks.map((b) => {
    const box = L.turned(b.w, b.h, b.r);
    const p = pos[b.key];
    return { key: b.key, x: p.x - (box.w - b.w) / 2, y: p.y - (box.h - b.h) / 2, w: box.w, h: box.h };
  });
}
function overlap(a, b, space) {
  return a.x < b.x + b.w + space && b.x < a.x + a.w + space && a.y < b.y + b.h + space && b.y < a.y + a.h + space;
}
function assertClean(blocks, result, width, label) {
  const boxes = outlines(blocks, result.pos);
  assert.equal(boxes.length, blocks.length, label + ': every block placed');
  boxes.forEach((a, i) => {
    assert.ok(a.x >= -0.5 && a.y >= -0.5, `${label}: ${a.key} starts on the desk`);
    assert.ok(a.x + a.w <= width + 0.5, `${label}: ${a.key} ends inside the width (${Math.round(a.x + a.w)} > ${width})`);
    assert.ok(a.y + a.h <= result.height + 0.5, `${label}: ${a.key} ends inside the height`);
    boxes.slice(i + 1).forEach((b) => assert.ok(!overlap(a, b, GAP - 2), `${label}: ${a.key} and ${b.key} keep the gap`));
  });
}

/* ---------- The guard ---------- */

test('nothing overlaps or leaves the desk, from 901 to 2560px wide and 0 to 20 works', () => {
  for (const width of [901, 1024, 1180, 1280, 1440, 1680, 1920, 2560]) {
    for (let n = 0; n <= 20; n++) {
      for (const shape of ['beside', 'below']) {
        const blocks = desk(n, 4, shape);
        assertClean(blocks, L.pack(blocks, width, { gap: GAP }), width, `pack ${width}px ${n} works ${shape}`);
        assertClean(blocks, L.arrange(blocks, width, 800, { gap: GAP }), width, `arrange ${width}px ${n} works ${shape}`);
      }
    }
  }
});

test('the same desk comes out the same every time', () => {
  const blocks = desk(6);
  assert.deepEqual(L.arrange(blocks, 1440, 820, { gap: GAP }), L.arrange(blocks, 1440, 820, { gap: GAP }));
});

test('the first objects in the desk order sit in the first row', () => {
  const r = L.pack(desk(6), 1440, { gap: GAP });
  assert.ok(r.pos.note.y < 100 && r.pos.monitor.y < 100);
  assert.ok(r.pos.note.x < r.pos.monitor.x, 'the note comes before the monitor');
});

/* ---------- Fitting the screen ---------- */

test('a desk that fits the screen is centered on it, both ways', () => {
  const blocks = desk(2);
  const r = L.arrange(blocks, 2560, 1200, { gap: GAP });
  assert.ok(r.fits);
  const boxes = outlines(blocks, r.pos);
  const left = Math.min(...boxes.map((b) => b.x)), right = Math.max(...boxes.map((b) => b.x + b.w));
  const top = Math.min(...boxes.map((b) => b.y)), bottom = Math.max(...boxes.map((b) => b.y + b.h));
  assert.ok(Math.abs(left - (2560 - right)) < 80, 'centered across');
  assert.ok(Math.abs(top - (1200 - bottom)) < 80, 'centered down');
  assert.equal(r.height, 1200);
});

test('a desk taller than the screen grows instead of squeezing', () => {
  const r = L.arrange(desk(12), 1180, 700, { gap: GAP });
  assert.equal(r.fits, false);
  assert.ok(r.height > 700);
});

test('better() prefers a desk that fits, then the tighter one', () => {
  assert.equal(L.better({ fits: true, score: 9 }, { fits: false, score: 1 }), true);
  assert.equal(L.better({ fits: true, score: 1.2 }, { fits: true, score: 1.5 }), true);
  assert.equal(L.better({ fits: false, score: 1500 }, { fits: false, score: 1400 }), false);
});

/* ---------- The film corner ---------- */

test('tapes beside the monitor: each one lower than the last, so every label shows', () => {
  const c = L.filmCorner({ w: 560, h: 400 }, { w: 210, h: 124 }, 4, 28, 'beside');
  assert.deepEqual(c.tapes.map((t) => t.y), [0, L.TAPE_STEP, L.TAPE_STEP * 2, L.TAPE_STEP * 3]);
  assert.ok(c.tapes.every((t) => t.x === 588));
  assert.equal(c.w, 560 + 28 + 210);
  assert.equal(c.h, 400);
});

test('more tapes than fit beside the monitor start a second pile', () => {
  const c = L.filmCorner({ w: 560, h: 400 }, { w: 210, h: 124 }, 7, 28, 'beside');
  const piles = new Set(c.tapes.map((t) => t.x));
  assert.equal(piles.size, 2);
  assert.ok(c.tapes.every((t) => t.y + 124 <= c.h));
  assert.equal(c.w, 560 + 28 + 210 + 28 + 210);
});

test('tapes below the monitor: a centered rack, as many across as fit', () => {
  const c = L.filmCorner({ w: 560, h: 400 }, { w: 210, h: 124 }, 4, 28, 'below');
  assert.deepEqual(c.tapes.map((t) => [t.x, t.y]), [[56, 428], [294, 428], [56, 580], [294, 580]]);
  assert.equal(c.w, 560);
  assert.equal(c.h, 400 + 28 + 124 * 2 + 28);
});

test('no tapes: the corner is just the monitor', () => {
  for (const shape of ['beside', 'below']) {
    const c = L.filmCorner({ w: 560, h: 400 }, { w: 0, h: 0 }, 0, 28, shape);
    assert.deepEqual([c.w, c.h, c.tapes.length], [560, 400, 0]);
  }
});

/* ---------- Tilt ---------- */

test('each object leans the same way every time, never more than the limit', () => {
  const keys = ['note', 'monitor', 'work:uploader', 'work:toto', 'tape:film-2', 'work:a-very-long-id-with-unicode-ü'];
  keys.forEach((k) => {
    assert.equal(L.tilt(k), L.tilt(k));
    assert.ok(Math.abs(L.tilt(k)) <= L.TILT);
    assert.equal(L.tilt(k) * 4, Math.round(L.tilt(k) * 4), 'quarter degrees');
  });
  assert.ok(new Set(keys.map(L.tilt)).size > 2, 'objects lean differently');
});
