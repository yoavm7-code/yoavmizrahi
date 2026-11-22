/* Talks to the login server (worker/). Keeps the session token on this device:
   - "Keep me signed in": localStorage, 30 days, renewed while you use the admin.
   - Otherwise: sessionStorage, gone when the tab closes.
   A separate "trusted device" token stays in localStorage so this device is never slowed down
   by someone else guessing passwords. */

import { LOGIN_API } from './config.js';

var SESSION = 'ym-admin-session';
var TRUSTED = 'ym-admin-trusted';
var LAST_USER = 'ym-admin-user';

export var enabled = !!LOGIN_API;

/* ---------- Stored tokens ---------- */

export function token() {
  try { return sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION); } catch (e) { return null; }
}
function remembered() { try { return !!localStorage.getItem(SESSION); } catch (e) { return false; } }

export function saveToken(t, remember) {
  try {
    if (remember) { localStorage.setItem(SESSION, t); sessionStorage.removeItem(SESSION); }
    else { sessionStorage.setItem(SESSION, t); localStorage.removeItem(SESSION); }
  } catch (e) { /* private mode: the token lives in memory only for this page */ }
}
function renewToken(t) { if (t) saveToken(t, remembered()); }

export function clearToken() {
  try { sessionStorage.removeItem(SESSION); localStorage.removeItem(SESSION); } catch (e) { /* ignore */ }
}
export function lastUser() { try { return localStorage.getItem(LAST_USER) || ''; } catch (e) { return ''; } }

/* ---------- Calls ---------- */

async function call(method, path, body, withSession) {
  var headers = { 'Content-Type': 'application/json' };
  if (withSession) headers.Authorization = 'Bearer ' + token();
  var res;
  try {
    res = await fetch(LOGIN_API + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  } catch (e) {
    throw Object.assign(new Error('offline'), { status: 0, loginServer: true });
  }
  var data = await res.json().catch(function () { return {}; });
  if (!res.ok) throw Object.assign(new Error(data.error || 'error'), { status: res.status, code: data.error, retryAfter: data.retryAfter, loginServer: true });
  return data;
}

function signedIn(data, remember) {
  saveToken(data.token, remember);
  try {
    if (data.trusted) localStorage.setItem(TRUSTED, data.trusted);
    localStorage.setItem(LAST_USER, data.username);
  } catch (e) { /* ignore */ }
  return data;
}

function trusted() { try { return localStorage.getItem(TRUSTED) || ''; } catch (e) { return ''; } }

export function health() { return call('GET', '/health'); }

export async function login(username, password, remember) {
  return signedIn(await call('POST', '/login', { username: username, password: password, remember: remember, trusted: trusted() }), remember);
}

/* First setup, and resetting a forgotten password (pat may be empty then). */
export async function setup(code, username, password, pat, remember) {
  return signedIn(await call('POST', '/setup', { code: code, username: username, password: password, pat: pat, remember: remember }), remember);
}

/* Account details; also renews the session so active use never signs you out. */
export async function me() {
  var data = await call('GET', '/me', null, true);
  renewToken(data.token);
  return data;
}

async function reauth(password) { return (await call('POST', '/reauth', { password: password }, true)).reauth; }

export async function changePassword(current, next) {
  var r = await reauth(current);
  var data = await call('POST', '/password', { reauth: r, password: next }, true);
  renewToken(data.token);
  return data;
}

export async function replaceKey(password, pat) {
  var r = await reauth(password);
  return call('POST', '/pat', { reauth: r, pat: pat }, true);
}

export async function signOutEverywhere() {
  await call('POST', '/signout-all', null, true);
  clearToken();
}

/* ---------- Messages ---------- */

export function explainAuth(err) {
  if (!err) return 'Something went wrong. Try again.';
  if (err.status === 0) return "Can't reach the sign-in service. Check your internet connection. Your drafts are safe.";
  var wait = err.retryAfter ? ' Try again ' + waitText(err.retryAfter) + '.' : '';
  switch (err.code) {
    case 'wrong': return 'That username or password is not right.' + wait;
    case 'wait': return 'Too many tries.' + (wait || ' Try again in a little while.');
    case 'code': return 'That setup code is not right.' + wait;
    case 'username': return 'Usernames are 3 to 60 characters: letters, numbers, dots, dashes or @.';
    case 'password': return "Passwords need at least 12 characters, and can't be your username.";
    case 'pat_format': return "That doesn't look like a GitHub key. It starts with github_pat_.";
    case 'pat_invalid': return 'GitHub says this key is not valid or has expired.';
    case 'pat_repo': return "This key can't see the yoavmizrahi repository. Choose \"Only select repositories\" and pick yoavmizrahi.";
    case 'pat_readonly': return 'This key can only read. Set Contents to "Read and write".';
    case 'pat_required': return 'Paste your GitHub key to finish the setup.';
    case 'not_set_up': return 'No login has been set up yet. Use "First time here?" below.';
    case 'reauth': return 'Please enter your password again.';
    case 'github_down': return 'GitHub is not answering right now. Try again in a minute.';
    case 'not_configured': return 'The sign-in service is not finished setting up.';
    case 'session': return 'You were signed out. Please sign in again.';
    default: return 'Something went wrong (' + (err.code || err.status) + '). Try again.';
  }
}

function waitText(ms) {
  var at = new Date(Date.now() + ms);
  if (ms < 90000) return 'in ' + Math.ceil(ms / 1000) + ' seconds';
  return 'at ' + at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
