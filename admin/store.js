/* The draft: everything edited but not yet published.
   - Saved on this device instantly (localStorage) and to the drafts branch a few seconds later,
     so the laptop and the phone see the same draft.
   - Undo and redo keep up to 100 steps. Typing in one field counts as one step. */

import { normalize } from '../js/schema.js';
import { REPO, PATHS } from './config.js';

var LOCAL_KEY = 'ym-admin-draft-v1';
var SYNC_DELAY = 4000;

export function createStore(gh) {
  var state = {
    live: null,          // content currently published on main
    liveCommit: null,    // main commit the live content came from
    draft: null,         // content being edited
    media: {},           // media path -> blob sha for uploads not yet published
    updatedAt: 0,
    syncedAt: 0,
    syncing: false,
    syncError: null
  };
  var undoStack = [];
  var redoStack = [];
  var lastStepKey = null;
  var lastStepAt = 0;
  var listeners = [];
  var syncTimer = null;

  function emit(info) { listeners.forEach(function (fn) { fn(info || {}); }); }
  function snapshot() { return JSON.stringify({ draft: state.draft, media: state.media }); }
  function restoreSnapshot(s) { var o = JSON.parse(s); state.draft = o.draft; state.media = o.media; }

  function same(a, b) { return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b)); }

  function saveLocal() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({
        draft: state.draft, media: state.media, baseCommit: state.liveCommit, updatedAt: state.updatedAt
      }));
    } catch (e) { /* storage full or blocked: the drafts branch still has it */ }
  }
  function readLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null'); } catch (e) { return null; }
  }

  /* ---------- Loading ---------- */

  /* Reads the live content, then picks the newest draft from this device or the drafts branch. */
  async function load() {
    var ref = await gh.getRef(REPO.main);
    state.liveCommit = ref.object.sha;
    var text = await gh.getText(PATHS.content, state.liveCommit);
    if (!text) throw Object.assign(new Error('missing content'), { status: 404 });
    state.live = normalize(JSON.parse(text));

    var local = readLocal();
    var remote = null;
    var draftRef = await gh.getRef(REPO.drafts);
    if (draftRef) {
      var remoteText = await gh.getText(PATHS.draft, draftRef.object.sha);
      if (remoteText) { try { remote = JSON.parse(remoteText); } catch (e) { remote = null; } }
    }
    var pick = [local, remote].filter(function (d) { return d && d.draft; })
      .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); })[0];

    var source = null;
    if (pick && !same(pick.draft, state.live)) {
      state.draft = pick.draft;
      state.media = pick.media || {};
      state.updatedAt = pick.updatedAt || Date.now();
      source = { fromOtherDevice: pick === remote && (!local || (local.updatedAt || 0) < (remote.updatedAt || 0)), stale: pick.baseCommit && pick.baseCommit !== state.liveCommit, updatedAt: state.updatedAt };
    } else {
      state.draft = clone(state.live);
      state.media = {};
      state.updatedAt = 0;
    }
    state.syncedAt = remote ? remote.updatedAt || 0 : 0;
    saveLocal();
    emit({ loaded: true });
    return source;
  }

  /* ---------- Editing ---------- */

  /* Changes the draft. stepKey groups quick edits (like typing in one field) into one undo step.
     opts.quiet skips refreshing the preview (used when the preview itself made the change). */
  function update(mutator, stepKey, opts) {
    var now = Date.now();
    var before = snapshot();
    if (!(stepKey && stepKey === lastStepKey && now - lastStepAt < 1500)) {
      undoStack.push(before);
      if (undoStack.length > 100) undoStack.shift();
      redoStack = [];
    }
    lastStepKey = stepKey || null;
    lastStepAt = now;
    mutator(state.draft, state);
    changed(opts);
  }

  function changed(opts) {
    state.updatedAt = Date.now();
    saveLocal();
    scheduleSync();
    emit(opts || {});
  }

  function undo() {
    if (!undoStack.length) return false;
    redoStack.push(snapshot());
    restoreSnapshot(undoStack.pop());
    lastStepKey = null;
    changed({ structural: true });
    return true;
  }
  function redo() {
    if (!redoStack.length) return false;
    undoStack.push(snapshot());
    restoreSnapshot(redoStack.pop());
    lastStepKey = null;
    changed({ structural: true });
    return true;
  }

  /* Replaces the whole draft (restore from history, discard). Undoable. */
  function replace(content, media) {
    undoStack.push(snapshot());
    redoStack = [];
    state.draft = clone(content);
    state.media = media || {};
    lastStepKey = null;
    changed({ structural: true });
  }

  /* ---------- Syncing to the drafts branch ---------- */

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, SYNC_DELAY);
  }

  async function sync() {
    clearTimeout(syncTimer);
    if (state.syncing) { scheduleSync(); return; }
    if (state.syncedAt === state.updatedAt) return;
    state.syncing = true;
    emit({ sync: true });
    var stamp = state.updatedAt;
    try {
      if (isDirty()) {
        var base = await gh.getCommit(state.liveCommit);
        var entries = [{
          path: PATHS.draft, mode: '100644', type: 'blob',
          content: JSON.stringify({ draft: state.draft, media: state.media, baseCommit: state.liveCommit, updatedAt: stamp }, null, 2) + '\n'
        }];
        Object.keys(state.media).forEach(function (path) {
          entries.push({ path: path, mode: '100644', type: 'blob', sha: state.media[path] });
        });
        var tree = await gh.createTree(base.tree.sha, entries);
        var draftRef = await gh.getRef(REPO.drafts);
        var parent = draftRef ? draftRef.object.sha : state.liveCommit;
        var commit = await gh.createCommit('Draft saved from the admin', tree.sha, [parent]);
        if (draftRef) await gh.updateRef(REPO.drafts, commit.sha, true);
        else await gh.createRef(REPO.drafts, commit.sha);
      } else {
        await resetDraftBranch();
      }
      state.syncedAt = stamp;
      state.syncError = null;
    } catch (e) {
      state.syncError = e;
      if (e.status !== 401) scheduleSync();
    }
    state.syncing = false;
    emit({ sync: true });
  }

  /* Points the drafts branch back at the live site, which means "no draft". */
  async function resetDraftBranch() {
    var draftRef = await gh.getRef(REPO.drafts);
    if (draftRef && draftRef.object.sha !== state.liveCommit) await gh.updateRef(REPO.drafts, state.liveCommit, true);
  }

  /* After a publish: the published content becomes the new live state and the draft is clean. */
  async function published(content, commitSha) {
    state.live = normalize(content);
    state.liveCommit = commitSha;
    state.draft = clone(state.live);
    state.media = {};
    state.updatedAt = Date.now();
    state.syncedAt = state.updatedAt;
    saveLocal();
    emit({ structural: true, published: true });
    try { await resetDraftBranch(); } catch (e) { /* harmless: the next sync fixes it */ }
  }

  function isDirty() { return !!state.draft && !same(state.draft, state.live); }

  function forgetLocal() { try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* ignore */ } }

  return {
    state: state,
    load: load,
    update: update,
    replace: replace,
    undo: undo,
    redo: redo,
    canUndo: function () { return undoStack.length > 0; },
    canRedo: function () { return redoStack.length > 0; },
    isDirty: isDirty,
    sync: sync,
    published: published,
    forgetLocal: forgetLocal,
    onChange: function (fn) { listeners.push(fn); }
  };
}

export function clone(o) { return JSON.parse(JSON.stringify(o)); }
