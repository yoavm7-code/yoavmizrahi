/* Password hashing, signed session tokens and encryption of the GitHub key.
   Only Web Crypto, which Workers and Node both provide. */

var enc = new TextEncoder();
var dec = new TextDecoder();

/* Measured on the free plan (2026-11-22): 50k rounds = 7-9 ms CPU, over 100k is refused.
   40k keeps sign-in under the 10 ms limit. The pepper (a Worker secret) is what stops offline
   guessing if the stored hash ever leaked. Each hash records its own round count. */
export var PBKDF2_ROUNDS = 40000;

/* ---------- Encoding ---------- */

export function b64url(bytes) {
  var s = '';
  var arr = new Uint8Array(bytes);
  for (var i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64url(str) {
  var s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  var bin = atob(s);
  var out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export function randomBytes(n) { return crypto.getRandomValues(new Uint8Array(n)); }

/* Compares two strings without leaking where they differ. */
export function safeEqual(a, b) {
  a = String(a);
  b = String(b);
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', typeof secret === 'string' ? enc.encode(secret) : secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
export async function hmac(secret, data) {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data)));
}

/* ---------- Passwords ---------- */

/* Returns "pbkdf2$<rounds>$<salt>$<hash>". The password is peppered with HMAC before PBKDF2. */
export async function hashPassword(password, pepper, rounds) {
  rounds = rounds || PBKDF2_ROUNDS;
  var salt = randomBytes(16);
  return 'pbkdf2$' + rounds + '$' + b64url(salt) + '$' + (await derive(password, pepper, salt, rounds));
}

export async function checkPassword(password, pepper, stored) {
  var parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  var hash = await derive(password, pepper, unb64url(parts[2]), +parts[1]);
  return safeEqual(hash, parts[3]);
}

async function derive(password, pepper, salt, rounds) {
  var peppered = await hmac(pepper, String(password));
  var key = await crypto.subtle.importKey('raw', peppered, 'PBKDF2', false, ['deriveBits']);
  var bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: rounds }, key, 256);
  return b64url(bits);
}

/* ---------- Signed tokens ---------- */

/* token = base64url(json payload) "." base64url(HMAC-SHA256(secret, payload part)).
   The payload always carries typ and aud, and verify() checks both, so a token made for one
   purpose can never be used for another. */
export async function signToken(secret, payload) {
  var body = b64url(enc.encode(JSON.stringify(payload)));
  return body + '.' + b64url(await hmac(secret, body));
}

export async function verifyToken(secret, token, typ, now) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  if (!safeEqual(b64url(await hmac(secret, parts[0])), parts[1])) return null;
  var payload;
  try { payload = JSON.parse(dec.decode(unb64url(parts[0]))); } catch (e) { return null; }
  if (!payload || payload.aud !== 'ym-admin' || payload.typ !== typ) return null;
  if (typeof payload.exp !== 'number' || payload.exp <= (now || Date.now())) return null;
  return payload;
}

/* ---------- Encrypting the GitHub key ---------- */

async function aesKey(secretB64) {
  return crypto.subtle.importKey('raw', unb64url(secretB64), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptText(secretB64, text) {
  var iv = randomBytes(12);
  var data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, await aesKey(secretB64), enc.encode(text));
  return b64url(iv) + '.' + b64url(data);
}
export async function decryptText(secretB64, sealed) {
  var parts = String(sealed).split('.');
  var data = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(parts[0]) }, await aesKey(secretB64), unb64url(parts[1]));
  return dec.decode(data);
}
