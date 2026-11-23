/* Catching a draft up with the live site.
   A draft starts from one version of the live content (its base). If something is published after
   that (from another device, a pull request, a restore or the rescue page), publishing the draft
   as it is would quietly undo that newer work. mergeDraft() keeps only what the draft itself changed
   and lays it on top of the newest live content, so both survive.

   The rules, field by field:
   - Changed only in the draft: the draft's value.
   - Changed only on the live site: the live value.
   - Changed on both sides: the draft wins, since it's what the person is looking at.
   - Lists of things with an id (works, films, links): matched by id. Something added on either side
     is kept, something the draft removed is removed, and something removed on the live site stays
     removed unless the draft edited it.
   - Lists of plain values (like the desk order): the draft's list, plus anything new on the live side. */

export function mergeDraft(base, draft, live) {
  return merge3(base, draft, live);
}

function merge3(base, mine, theirs) {
  if (same(mine, base)) return clone(theirs);
  if (same(theirs, base) || same(mine, theirs)) return clone(mine);
  if (isIdList(mine) && isIdList(theirs)) return mergeIdList(Array.isArray(base) ? base : [], mine, theirs);
  if (isValueList(mine) && isValueList(theirs)) return mergeValueList(Array.isArray(base) ? base : [], mine, theirs);
  if (isObject(mine) && isObject(theirs)) return mergeObject(isObject(base) ? base : {}, mine, theirs);
  return clone(mine);
}

function mergeObject(base, mine, theirs) {
  var out = {};
  Object.keys(mine).forEach(function (k) {
    if (k in theirs) out[k] = merge3(base[k], mine[k], theirs[k]);
    else if (!(k in base) || !same(mine[k], base[k])) out[k] = clone(mine[k]);
  });
  Object.keys(theirs).forEach(function (k) {
    if (k in mine) return;
    if (!(k in base) || !same(theirs[k], base[k])) out[k] = clone(theirs[k]);
  });
  return out;
}

function mergeIdList(base, mine, theirs) {
  var out = [];
  mine.forEach(function (item) {
    var b = byId(base, item.id), t = byId(theirs, item.id);
    if (t) out.push(merge3(b, item, t));
    else if (!b || !same(item, b)) out.push(clone(item));
  });
  /* New on the live side: placed after the item it follows there, or first. */
  theirs.forEach(function (item, i) {
    if (byId(base, item.id) || byId(mine, item.id)) return;
    var at = 0;
    for (var j = i - 1; j >= 0; j--) {
      var k = indexOfId(out, theirs[j].id);
      if (k !== -1) { at = k + 1; break; }
    }
    out.splice(at, 0, clone(item));
  });
  return out;
}

function mergeValueList(base, mine, theirs) {
  var out = mine.slice();
  theirs.forEach(function (v, i) {
    if (base.indexOf(v) !== -1 || out.indexOf(v) !== -1) return;
    var at = 0;
    for (var j = i - 1; j >= 0; j--) {
      var k = out.indexOf(theirs[j]);
      if (k !== -1) { at = k + 1; break; }
    }
    out.splice(at, 0, v);
  });
  return out;
}

/* ---------- Helpers ---------- */

function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
function isObject(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
function isIdList(a) { return Array.isArray(a) && a.every(function (x) { return isObject(x) && typeof x.id === 'string'; }); }
function isValueList(a) { return Array.isArray(a) && a.every(function (x) { return typeof x === 'string' || typeof x === 'number'; }); }
function byId(list, id) { return list.filter(function (x) { return isObject(x) && x.id === id; })[0]; }
function indexOfId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return i; return -1; }
