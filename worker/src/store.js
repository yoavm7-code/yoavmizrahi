/* The one place login state lives: a SQLite Durable Object. It is strongly consistent and handles
   one call at a time, so setup, lockouts and "sign out everywhere" take effect immediately.
   It only stores and counts; hashing and encryption happen in the Worker. */

import { DurableObject } from 'cloudflare:workers';

var MAX_SIGNINS = 50;

export class AuthStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS attempts (scope TEXT PRIMARY KEY, fails INTEGER NOT NULL, until INTEGER NOT NULL, updated INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS signins (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, ok INTEGER NOT NULL, kind TEXT NOT NULL, device TEXT, place TEXT)');
  }

  /* ---------- Settings ---------- */

  get(key) {
    var rows = this.sql.exec('SELECT value FROM settings WHERE key = ?', key).toArray();
    return rows.length ? rows[0].value : null;
  }
  set(key, value) {
    this.sql.exec('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
  }

  /* Everything the Worker needs to check a session and call GitHub, in one round trip. */
  session() {
    return { ver: +(this.get('session_ver') || 1), pat: this.get('pat_sealed'), username: this.get('username') };
  }

  account() {
    return {
      ready: !!this.get('password'),
      username: this.get('username'),
      password: this.get('password'),
      ver: +(this.get('session_ver') || 1),
      patExpires: this.get('pat_expires') || null
    };
  }

  /* First setup and password resets. Atomic, so two setups can never both win. Saving a new
     password signs every device out. pat is optional on reset (the stored key is kept). */
  saveAccount(username, password, patSealed, patExpires) {
    return this.ctx.storage.transactionSync(() => {
      if (!patSealed && !this.get('pat_sealed')) return { ok: false, error: 'pat_required' };
      this.set('username', username);
      this.set('password', password);
      if (patSealed) { this.set('pat_sealed', patSealed); this.set('pat_expires', patExpires || ''); }
      var ver = +(this.get('session_ver') || 0) + 1;
      this.set('session_ver', ver);
      return { ok: true, ver: ver };
    });
  }

  setPassword(password, keepVer) {
    return this.ctx.storage.transactionSync(() => {
      this.set('password', password);
      var ver = +(this.get('session_ver') || 1);
      if (!keepVer) { ver += 1; this.set('session_ver', ver); }
      return ver;
    });
  }

  setPat(patSealed, patExpires) {
    this.set('pat_sealed', patSealed);
    this.set('pat_expires', patExpires || '');
  }

  signOutEverywhere() {
    var ver = +(this.get('session_ver') || 1) + 1;
    this.set('session_ver', ver);
    return ver;
  }

  /* ---------- Slowing down guessing ---------- */

  /* Returns the time (ms) until another try is allowed for this scope, or 0. */
  waitFor(scope, now) {
    var rows = this.sql.exec('SELECT until FROM attempts WHERE scope = ?', scope).toArray();
    return rows.length && rows[0].until > now ? rows[0].until - now : 0;
  }

  /* After 3 misses each further miss doubles the wait: 30 s, 1 min, 2 min ... up to 1 hour.
   Misses are forgotten after a day without any. */
  recordFail(scope, now) {
    return this.ctx.storage.transactionSync(() => {
      var rows = this.sql.exec('SELECT fails, updated FROM attempts WHERE scope = ?', scope).toArray();
      var fails = rows.length && now - rows[0].updated < 86400000 ? rows[0].fails + 1 : 1;
      var wait = fails >= 3 ? Math.min(3600000, 30000 * Math.pow(2, fails - 3)) : 0;
      this.sql.exec('INSERT INTO attempts (scope, fails, until, updated) VALUES (?, ?, ?, ?) ON CONFLICT(scope) DO UPDATE SET fails = excluded.fails, until = excluded.until, updated = excluded.updated', scope, fails, now + wait, now);
      this.sql.exec('DELETE FROM attempts WHERE updated < ?', now - 7 * 86400000);
      return wait;
    });
  }

  clearFails(scope) { this.sql.exec('DELETE FROM attempts WHERE scope = ?', scope); }

  /* ---------- Sign-in log (no tokens, passwords or IP addresses) ---------- */

  logSignin(entry) {
    this.sql.exec('INSERT INTO signins (at, ok, kind, device, place) VALUES (?, ?, ?, ?, ?)', entry.at, entry.ok ? 1 : 0, entry.kind, entry.device || '', entry.place || '');
    this.sql.exec('DELETE FROM signins WHERE id NOT IN (SELECT id FROM signins ORDER BY id DESC LIMIT ?)', MAX_SIGNINS);
  }

  recentSignins(limit) {
    return this.sql.exec('SELECT at, ok, kind, device, place FROM signins ORDER BY id DESC LIMIT ?', limit || 12).toArray();
  }
}
