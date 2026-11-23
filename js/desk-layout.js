/* Where everything sits on the desk. Pure: sizes in, positions out, no page access.
   Loaded before js/main.js, which measures the objects and applies the result; also unit tested.

   The desk is packed like a skyline: each object, in the desk order, goes to the highest free
   spot that fits it, leftmost first, with an even gap around it. The result is centered on the
   desk. Each object's tilt comes from its name, so the desk feels hand-placed but looks the same
   on every visit, and the packer works with the tilted outline so nothing overlaps. */
(function (root) {
  'use strict';

  var TILT = 3;          // most an object leans, in degrees
  var TAPE_STEP = 58;    // how far each tape in the pile sits below the one above, in px

  /* A stable lean from -TILT to TILT for a key, rounded to a quarter degree. */
  function tilt(key) {
    var h = 2166136261;
    for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    var unit = ((h >>> 0) % 1000) / 999;
    return Math.round((unit * 2 - 1) * TILT * 4) / 4;
  }

  /* The outline of a w x h box turned by r degrees. */
  function turned(w, h, r) {
    var a = Math.abs(r) * Math.PI / 180;
    return { w: w * Math.cos(a) + h * Math.sin(a), h: w * Math.sin(a) + h * Math.cos(a) };
  }

  /* The film corner: the monitor and its tapes. Returns its size and where the monitor and each
     tape sit inside it.
     'beside': the tapes piled next to the monitor, each lower than the one before, so every label
     and ▶ stays in view. More tapes than fit beside the monitor start a new pile.
     'below': the tapes in a rack under the monitor, as many across as fit its width (narrower desks). */
  function filmCorner(monitor, tape, count, gap, shape) {
    var tapes = [];
    var i;
    if (shape === 'below') {
      var across = Math.max(1, Math.min(count, Math.floor((monitor.w + gap) / (tape.w + gap))));
      var rows = Math.ceil(count / across);
      var rackW = across * tape.w + (across - 1) * gap;
      var left = Math.max(0, (monitor.w - rackW) / 2);
      for (i = 0; i < count; i++) {
        tapes.push({ x: Math.round(left + (i % across) * (tape.w + gap)), y: monitor.h + gap + Math.floor(i / across) * (tape.h + gap) });
      }
      return {
        w: Math.max(monitor.w, rackW),
        h: monitor.h + (rows ? gap + rows * tape.h + (rows - 1) * gap : 0),
        monitor: { x: Math.round(Math.max(0, (rackW - monitor.w) / 2)), y: 0 },
        tapes: tapes
      };
    }
    var perPile = Math.max(1, Math.floor((monitor.h - tape.h) / TAPE_STEP) + 1);
    var piles = Math.ceil(count / perPile);
    for (i = 0; i < count; i++) {
      var pile = Math.floor(i / perPile), row = i % perPile;
      tapes.push({ x: monitor.w + gap + pile * (tape.w + gap), y: row * TAPE_STEP });
    }
    var tallest = count ? tape.h + (Math.min(count, perPile) - 1) * TAPE_STEP : 0;
    return {
      w: monitor.w + (piles ? gap + piles * tape.w + (piles - 1) * gap : 0),
      h: Math.max(monitor.h, tallest),
      monitor: { x: 0, y: 0 },
      tapes: tapes
    };
  }

  /* blocks: [{ key, w, h, r }] in desk order (r: tilt in degrees, 0 for none).
     width: the desk's width. Returns { pos: { key: { x, y } }, height }, where x and y are the
     block's top-left corner before it is tilted. */
  function pack(blocks, width, opts) {
    opts = opts || {};
    var pad = opts.pad != null ? opts.pad : Math.round(Math.min(64, Math.max(24, width * 0.035)));
    var gap = opts.gap != null ? opts.gap : 40;
    var room = Math.max(1, width - pad * 2);
    var sky = [{ x: 0, w: room, y: 0 }];
    var placed = [];

    blocks.forEach(function (b) {
      var box = turned(b.w, b.h, b.r || 0);
      var bw = Math.min(box.w, room);
      var best = null;
      sky.forEach(function (seg) {
        if (seg.x + bw > room + 0.5) return;
        var y = topAt(sky, seg.x, Math.min(bw + gap, room - seg.x));
        if (!best || y < best.y - 0.5 || (Math.abs(y - best.y) <= 0.5 && seg.x < best.x)) best = { x: seg.x, y: y };
      });
      if (!best) best = { x: 0, y: topAt(sky, 0, Math.min(bw + gap, room)) };
      raise(sky, best.x, bw + gap, best.y + box.h + gap, room);
      placed.push({ b: b, box: box, x: best.x, y: best.y });
    });

    var used = placed.reduce(function (m, p) { return Math.max(m, p.x + p.box.w); }, 0);
    var shift = pad + Math.max(0, (room - used) / 2);
    var pos = {};
    var bottom = 0;
    placed.forEach(function (p) {
      pos[p.b.key] = {
        x: Math.round(shift + p.x + (p.box.w - p.b.w) / 2),
        y: Math.round(pad + p.y + (p.box.h - p.b.h) / 2)
      };
      bottom = Math.max(bottom, pad + p.y + p.box.h);
    });
    return { pos: pos, height: Math.ceil(bottom + pad) };
  }

  /* The best-looking packing for a desk of width x height: tries narrower and narrower content
     widths and keeps the most compact one that still fits the height (or, if none fits, the
     shortest), then centers it on the desk both ways. Same inputs, same result. */
  function arrange(blocks, width, height, opts) {
    opts = opts || {};
    var widest = blocks.reduce(function (m, b) { return Math.max(m, turned(b.w, b.h, b.r || 0).w); }, 0);
    var pad = opts.pad != null ? opts.pad : Math.round(Math.min(64, Math.max(24, width * 0.035)));
    var step = 40;
    var best = null;
    for (var w = width; w >= Math.max(widest + pad * 2, width * 0.5); w -= step) {
      var r = pack(blocks, w, { pad: pad, gap: opts.gap });
      var fits = r.height <= height;
      var score = fits ? area(r, blocks) : r.height;
      var next = { r: r, w: w, fits: fits, score: score };
      if (!best || better(next, best)) best = next;
      if (!fits && best.fits) break;
    }
    var dx = Math.round((width - best.w) / 2);
    var dy = Math.max(0, Math.round((height - best.r.height) / 2));
    var pos = {};
    Object.keys(best.r.pos).forEach(function (k) { pos[k] = { x: best.r.pos[k].x + dx, y: best.r.pos[k].y + dy }; });
    return { pos: pos, height: Math.max(height, best.r.height), fits: best.fits, score: best.score };
  }

  /* Whether layout a beats layout b: fitting the desk's height first, then the more compact
     (when both fit) or the shorter (when neither does). */
  function better(a, b) {
    if (a.fits !== b.fits) return a.fits;
    return a.score < b.score - 0.001;
  }

  /* How much empty desk a packing leaves inside its outline, as outline area / object area. */
  function area(r, blocks) {
    var x0 = Infinity, y0 = Infinity, x1 = 0, y1 = 0, filled = 0;
    blocks.forEach(function (b) {
      var p = r.pos[b.key], box = turned(b.w, b.h, b.r || 0);
      var bx = p.x - (box.w - b.w) / 2, by = p.y - (box.h - b.h) / 2;
      x0 = Math.min(x0, bx); y0 = Math.min(y0, by); x1 = Math.max(x1, bx + box.w); y1 = Math.max(y1, by + box.h);
      filled += box.w * box.h;
    });
    return filled ? ((x1 - x0) * (y1 - y0)) / filled : 0;
  }

  /* ---------- The skyline ---------- */

  /* The lowest y a box of width w can sit at, starting at x. Callers pass the box's width plus the
     gap, so it also keeps clear of a taller neighbour on its right. */
  function topAt(sky, x, w) {
    var y = 0;
    sky.forEach(function (s) { if (s.x < x + w - 0.5 && s.x + s.w > x + 0.5) y = Math.max(y, s.y); });
    return y;
  }

  /* Raises the skyline to y between x and x + w (clipped to the room). */
  function raise(sky, x, w, y, room) {
    var end = Math.min(room, x + w);
    var next = [];
    sky.forEach(function (s) {
      var sEnd = s.x + s.w;
      if (sEnd <= x || s.x >= end) { next.push(s); return; }
      if (s.x < x) next.push({ x: s.x, w: x - s.x, y: s.y });
      if (sEnd > end) next.push({ x: end, w: sEnd - end, y: s.y });
    });
    next.push({ x: x, w: end - x, y: y });
    next.sort(function (a, b) { return a.x - b.x; });
    sky.length = 0;
    next.forEach(function (s) {
      var last = sky[sky.length - 1];
      if (last && Math.abs(last.y - s.y) < 0.5 && Math.abs(last.x + last.w - s.x) < 0.5) last.w += s.w;
      else sky.push(s);
    });
  }

  root.DeskLayout = { arrange: arrange, better: better, pack: pack, filmCorner: filmCorner, tilt: tilt, turned: turned, TILT: TILT, TAPE_STEP: TAPE_STEP };
})(typeof window !== 'undefined' ? window : globalThis);
